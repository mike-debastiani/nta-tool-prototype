"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CheckCheck, Info, Loader2, Pencil, RotateCcw } from "lucide-react";
import { ApplicationReviewDetailSidebar } from "@/components/domain/application-review-detail-sidebar";
import { useRegisterDashboardDetailPanel } from "@/components/domain/dashboard-detail-panel-context";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssignee,
} from "@/lib/application-assignee";
import {
  ReviewBlockCard,
  ReviewField,
  ReviewFileRow,
  formatReviewFileSize,
  sanitizeAttestFilesForDatabase,
  shortApplicationRef,
} from "@/components/domain/application-review-blocks";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import { reviewWorkspaceAnchorId, type ReviewWorkspaceBlockId } from "@/lib/review-workspace-blocks";
import {
  allVisibleR4BlocksConfirmed,
  buildAssessmentMeasureRows,
  buildDurationRows,
  buildLectureMeasureRows,
  buildScopeRows,
  getR4BlockVisibility,
  isR4BlockDirty,
  mergeR4DecisionReview,
  mergeR4DecisionReviewRespectingLocalDirty,
  r4RowBadge,
  type R4RowBadge,
} from "@/lib/r4-decision-state";
import {
  completeR4DecisionWithSupabaseClient,
  persistR4DecisionWithSupabaseClient,
} from "@/lib/r4-workspace-supabase-persist";
import {
  type R4DecisionBlockSnapshot,
  type R4DecisionReview,
  type R4DecisionReviewBlockId,
  type R4DecisionRow,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import {
  applicationContentScrollClass,
  applicationContentScrollPaddingClass,
} from "@/lib/design-tokens/application-scroll";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";
import { Button } from "@/components/ui/button";

type WorkspaceR4DecisionViewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
  onPersisted?: () => void;
};

/** Debounce für R4-Zwischenstand (Schalter / Zurücksetzen). Unmount / Tab-Wechsel flusht sofort (siehe Effekt unten). */
const R4_AUTOSAVE_DEBOUNCE_MS = 500;

type R4PersistOptions = {
  /** Kein `persisting`-Spinner; Schalter bleiben ohne Wartezustand bedienbar. */
  background?: boolean;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type R4SwitchTone = "teal" | "red" | "yellow" | "muted";

function R4Switch({
  checked,
  disabled,
  tone,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  /** Figma Mid-Fi: Track-Farbe je Entscheidungszustand (3800-7590 / 7722). */
  tone: R4SwitchTone;
  /** Kein `!checked` aus Props: Toggle liest immer den aktuellen Zustand im `setReview`-Updater. */
  onToggle: () => void;
}) {
  const track = checked
    ? tone === "red"
      ? "bg-destructive"
      : tone === "yellow"
        ? "bg-yellow-300"
        : "bg-[#009689]"
    : tone === "red"
      ? "bg-destructive"
      : "bg-neutral-200";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={cn(
        "relative inline-flex h-[18px] w-[33px] shrink-0 items-center rounded-full shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        track,
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[17px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

function r4SwitchTone(row: R4DecisionRow): R4SwitchTone {
  const b = r4RowBadge(row);
  if (b === "abgelehnt") return "red";
  if (b === "vorschlag") return "yellow";
  if (b === "bewilligt") return "teal";
  return "muted";
}

function badgeLabel(badge: R4RowBadge): string {
  switch (badge) {
    case "bewilligt":
      return "Bewilligt";
    case "abgelehnt":
      return "Abgelehnt";
    case "vorschlag":
      return "Vorschlag";
    default:
      return "Vorschlagen";
  }
}

/** Figma 3800-7590 / 7722 / 3829 — Rich Radio Group Hintergründe. */
function badgeRowClass(badge: R4RowBadge): string {
  switch (badge) {
    case "bewilligt":
      return "border border-border bg-green-50 dark:bg-green-950/20";
    case "abgelehnt":
      return "border border-border bg-red-50 dark:bg-red-950/25";
    case "vorschlag":
      return "border border-border bg-yellow-50 dark:bg-yellow-950/20";
    default:
      return "border border-border bg-card";
  }
}

/** Figma 3800-7590: unbearbeitet — nicht gewählte Zeilen weiss wie Card; Studierenden-Wahl = Bewilligt-Zeile. */
function rowSurfaceClass(
  row: R4DecisionRow,
  pristine: boolean,
  blockConfirmed: boolean,
): string {
  if (pristine && !blockConfirmed) {
    if (!row.studentSelected && !row.r4Approved) {
      return badgeRowClass("vorschlagen");
    }
    if (row.studentSelected && row.r4Approved) {
      return badgeRowClass("bewilligt");
    }
  }
  return badgeRowClass(r4RowBadge(row));
}

function rowStatusLabel(
  row: R4DecisionRow,
  pristine: boolean,
  blockConfirmed: boolean,
): string {
  if (pristine && !blockConfirmed && !row.studentSelected && !row.r4Approved) {
    return "Vorschlagen";
  }
  return badgeLabel(r4RowBadge(row));
}

function rowStatusTextClass(
  row: R4DecisionRow,
  _badge: R4RowBadge,
  pristine: boolean,
  blockConfirmed: boolean,
): string {
  /** Immer gleiche Schriftgrösse (`text-xs`); früher war «Vorschlagen» in pristine `text-sm` — wirkte neben Bewilligt/Vorschlag grösser. */
  if (pristine && !blockConfirmed && !row.studentSelected && !row.r4Approved) {
    return "text-xs font-medium text-neutral-600 dark:text-neutral-400";
  }
  return "text-xs font-medium text-neutral-700 dark:text-neutral-300";
}

function rowTextStrike(
  badge: R4RowBadge,
  opts: { confirmedReadonly: boolean },
): boolean {
  if (badge === "abgelehnt") return true;
  if (opts.confirmedReadonly && badge === "vorschlagen") return true;
  return false;
}

function R4FacultyConfirmedFooter() {
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <CheckCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      Von der Fachstelle bestätigt
    </span>
  );
}

function R4StaffContentBlock({
  anchorId,
  title,
  children,
}: {
  anchorId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ReviewBlockCard anchorId={anchorId} title={title} footer={<R4FacultyConfirmedFooter />} footerTone="default">
      {children}
    </ReviewBlockCard>
  );
}

export function WorkspaceR4DecisionView({
  application,
  reviewerDisplayName,
  onPersisted,
}: WorkspaceR4DecisionViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const data = application.data;
  const def = data.applicationDefinition;
  const canEdit = application.status === "in_implementation";
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const statusMeta = getApplicationStatusMeta(application, "R4");

  const [review, setReview] = useState<R4DecisionReview>(() =>
    mergeR4DecisionReview(data),
  );
  const reviewRef = useRef(review);
  reviewRef.current = review;

  const [editing, setEditing] = useState<Partial<Record<R4DecisionReviewBlockId, boolean>>>({});
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const [persisting, setPersisting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Verhindert, dass ein veralteter Save nach schnellen Klicks noch Fehler meldet / Listen refresht. */
  const persistSeqRef = useRef(0);
  /** Hintergrund-Speichern: `onPersisted` gedrosselt, damit die Liste nicht bei jedem Toggle flattert. */
  const lastBackgroundParentRefreshAtRef = useRef(0);

  /** Nur wechseln, wenn Server einen neuen R4-Snapshot liefert (oder anderer Antrag). Nicht `application.updated_at`: jede Zeilen-Aktualisierung würde remergen und lokale, noch nicht persistierte Schalter überschreiben. */
  const serverR4ReviewUpdatedAt = application.data?.r4DecisionReview?.updatedAt;

  const visibility = useMemo(() => getR4BlockVisibility(data), [data]);

  const baselines = useMemo(
    () => ({
      duration: { confirmed: false, rows: buildDurationRows(def) },
      scope: { confirmed: false, rows: buildScopeRows(def) },
      lectureMeasures: { confirmed: false, rows: buildLectureMeasureRows(def) },
      assessmentMeasures: { confirmed: false, rows: buildAssessmentMeasureRows(def) },
    }),
    [def],
  );

  useEffect(() => {
    setReview((prev) => mergeR4DecisionReviewRespectingLocalDirty(application.data, prev));
    setEditing({});
    setError(null);
    // `application.data` absichtlich nicht in deps: sonst remerged jede Parent-Re-Render-Referenz und setzt u.a. `editing` zurück.
  }, [application.id, serverR4ReviewUpdatedAt]);

  const showApplicantBlock = true;
  const showAttestBlock = true;
  const showReleasedRecommendationBlock = hasText(data.recommendation?.releasedHtml);
  const showDefinitionBlock = true;
  const showDurationBlock = visibility.duration;
  const showScopeBlock = visibility.scope;
  const showLectureMeasuresBlock = visibility.lectureMeasures;
  const showAssessmentMeasuresBlock = visibility.assessmentMeasures;

  const persist = useCallback(
    async (next: R4DecisionReview, opts?: R4PersistOptions): Promise<boolean> => {
      const background = Boolean(opts?.background);
      const seq = ++persistSeqRef.current;

      if (!background) {
        setPersisting(true);
        setError(null);
      }

      const result = await persistR4DecisionWithSupabaseClient(supabase, application.id, next);

      if (seq !== persistSeqRef.current) {
        if (!background) setPersisting(false);
        return false;
      }

      if (!background) {
        setPersisting(false);
      }

      if (!result.ok) {
        setError(result.error.message);
        return false;
      }

      const { broadcastApplicationRowUpdated } = await import("@/lib/application-realtime-sync");
      await broadcastApplicationRowUpdated(supabase, application.id);

      if (background) {
        const now = Date.now();
        if (now - lastBackgroundParentRefreshAtRef.current >= 900) {
          lastBackgroundParentRefreshAtRef.current = now;
          onPersisted?.();
        }
      } else {
        onPersisted?.();
      }
      return true;
    },
    [application.id, onPersisted, supabase],
  );

  const persistRef = useRef(persist);
  persistRef.current = persist;

  /** Timer killen und letzten Stand sofort speichern (Unmount, Tab-Wechsel, «Zurück zur Liste»). */
  const flushPendingR4Autosave = useCallback(() => {
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    if (!canEditRef.current) return;
    void persistRef.current(reviewRef.current, { background: true });
  }, []);

  useEffect(() => {
    const onHide = () => flushPendingR4Autosave();
    window.addEventListener("pagehide", onHide);
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
      onHide();
    };
  }, [flushPendingR4Autosave]);

  const scheduleR4Autosave = useCallback(() => {
    if (!canEdit) return;
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
    }
    autosaveDebounceRef.current = setTimeout(() => {
      autosaveDebounceRef.current = null;
      void persistRef.current(reviewRef.current, { background: true });
    }, R4_AUTOSAVE_DEBOUNCE_MS);
  }, [canEdit]);

  const cancelR4AutosaveSchedule = useCallback(() => {
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
  }, []);

  const updateRows = useCallback(
    (id: R4DecisionReviewBlockId, rows: R4DecisionRow[]) => {
      setReview((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [id]: {
            ...prev.blocks[id],
            confirmed: prev.blocks[id]?.confirmed ?? false,
            rows,
          },
        },
      }));
    },
    [],
  );

  const handleToggleRow = (id: R4DecisionReviewBlockId, key: string) => {
    if (!canEdit) return;

    flushSync(() => {
      setReview((prev) => {
        const block = prev.blocks[id];
        if (!block) return prev;
        if (block.confirmed && !editingRef.current[id]) return prev;

        const row = block.rows.find((r) => r.key === key);
        if (!row) return prev;
        const nextApproved = !row.r4Approved;

        let nextRows = block.rows.map((r) =>
          r.key === key ? { ...r, r4Approved: nextApproved } : r,
        );

        if (id === "duration") {
          if (nextApproved) {
            nextRows = nextRows.map((r) => ({
              ...r,
              r4Approved: r.key === key,
            }));
          }
        }

        return {
          ...prev,
          blocks: {
            ...prev.blocks,
            [id]: {
              ...block,
              confirmed: block.confirmed ?? false,
              rows: nextRows,
            },
          },
        };
      });
    });
    scheduleR4Autosave();
  };

  const handleResetBlock = (id: R4DecisionReviewBlockId) => {
    const base = baselines[id];
    if (!base) return;
    flushSync(() => {
      updateRows(id, base.rows.map((r) => ({ ...r })));
    });
    scheduleR4Autosave();
  };

  const handleConfirmBlock = async (id: R4DecisionReviewBlockId) => {
    cancelR4AutosaveSchedule();
    const cur = reviewRef.current;
    const block = cur.blocks[id];
    if (!block) return;
    const prior = cur;
    const next: R4DecisionReview = {
      ...cur,
      blocks: {
        ...cur.blocks,
        [id]: { ...block, confirmed: true },
      },
    };
    setReview(next);
    setEditing((e) => ({ ...e, [id]: false }));
    const ok = await persist(next);
    if (!ok) {
      setReview(prior);
    }
  };

  const handleEditBlock = async (id: R4DecisionReviewBlockId) => {
    cancelR4AutosaveSchedule();
    setEditing((e) => ({ ...e, [id]: true }));
    const prev = reviewRef.current;
    const cur = prev.blocks[id] ?? baselines[id]!;
    const next: R4DecisionReview = {
      ...prev,
      blocks: {
        ...prev.blocks,
        [id]: {
          ...cur,
          confirmed: false,
        },
      },
    };
    setReview(next);
    await persist(next);
  };

  const handleComplete = async () => {
    if (!allVisibleR4BlocksConfirmed(reviewRef.current, visibility)) return;
    cancelR4AutosaveSchedule();
    setCompleting(true);
    setError(null);

    const result = await completeR4DecisionWithSupabaseClient(
      supabase,
      application.id,
      reviewRef.current,
    );

    setCompleting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const { broadcastApplicationRowUpdated } = await import("@/lib/application-realtime-sync");
    await broadcastApplicationRowUpdated(supabase, application.id);
    onPersisted?.();
  };

  const allConfirmed = allVisibleR4BlocksConfirmed(review, visibility);

  function renderDecisionBlock(id: R4DecisionReviewBlockId, title: string) {
    const block = review.blocks[id] ?? baselines[id]!;
    const baseline = baselines[id]!;
    const isUnlocked = Boolean(editing[id] || !block.confirmed);
    const dirty = isR4BlockDirty(block, baseline);
    const pristine = !dirty && !block.confirmed;
    const anchorId = reviewWorkspaceAnchorId(id as ReviewWorkspaceBlockId);

    const confirmedClosed = block.confirmed && !editing[id];
    const showSwitchList = !confirmedClosed;
    const disableInteractions = !canEdit;

    const footerInner = confirmedClosed && canEdit ? (
      <div className="flex h-[63px] w-full shrink-0 items-center justify-between bg-[#009689] px-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-white hover:bg-white/10 hover:text-white"
          disabled={disableInteractions}
          onClick={() => handleEditBlock(id)}
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
          Bearbeiten
        </Button>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
          <CheckCheck className="size-4 shrink-0" aria-hidden />
          Reviewed & Bestätigt
        </span>
      </div>
    ) : confirmedClosed && !canEdit ? (
      <div className="flex w-full flex-wrap items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-3">
        <span className="text-xs font-medium text-muted-foreground">Auswahl bestätigt (Nur Ansicht)</span>
      </div>
    ) : (
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3">
        {dirty ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            disabled={disableInteractions || persisting}
            onClick={() => handleResetBlock(id)}
          >
            <RotateCcw className="size-4 shrink-0" aria-hidden />
            Zurücksetzen
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          size="sm"
          className="h-9 gap-2 bg-[#009689] px-4 text-white hover:bg-[#008578]"
          disabled={disableInteractions || persisting}
          onClick={() => void handleConfirmBlock(id)}
        >
          <CheckCheck className="size-4 shrink-0" aria-hidden />
          Auswahl bestätigen
        </Button>
      </div>
    );

    return (
      <section
        key={id}
        id={anchorId}
        className={cn(
          "scroll-mt-6 overflow-hidden rounded-xl bg-card shadow-xs",
          confirmedClosed
            ? "border-[1.5px] border-[#009689]"
            : "border border-border",
        )}
      >
        <div className="space-y-6 px-6 pt-5 pb-5">
          <h2 className="text-lg font-medium text-foreground">{title}</h2>
          {confirmedClosed ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-400">
                Bestätigter Entscheid
              </p>
              <ul className="space-y-3">
                {block.rows.map((row) => {
                  const b = r4RowBadge(row);
                  const strike = rowTextStrike(b, { confirmedReadonly: true });
                  return (
                    <li
                      key={`${id}-summary-${row.key}`}
                      className={cn(
                        "flex items-start gap-4 rounded-[10px] px-3 py-3",
                        rowSurfaceClass(row, false, true),
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={cn(
                              "text-sm font-normal leading-5 text-foreground",
                              strike && "line-through decoration-solid",
                            )}
                          >
                            {row.title}
                          </p>
                          <span className={cn("shrink-0 text-xs font-medium text-neutral-700 dark:text-neutral-300")}>
                            {badgeLabel(b)}
                          </span>
                        </div>
                        {row.description ? (
                          <p
                            className={cn(
                              "text-xs leading-relaxed text-muted-foreground",
                              strike && "line-through decoration-solid",
                            )}
                          >
                            {row.description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {showSwitchList ? (
            <ul className="space-y-3">
              {block.rows.map((row) => {
                const badge = r4RowBadge(row);
                const statusLabel = rowStatusLabel(row, pristine, block.confirmed);
                const strike = rowTextStrike(badge, { confirmedReadonly: false });
                return (
                  <li
                    key={row.key}
                    className={cn(
                      "flex items-start gap-4 rounded-[10px] px-3 py-3",
                      rowSurfaceClass(row, pristine, block.confirmed),
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p
                        className={cn(
                          "text-sm font-normal leading-5 text-foreground",
                          strike && "line-through decoration-solid",
                        )}
                      >
                        {row.title}
                      </p>
                      {row.description ? (
                        <p
                          className={cn(
                            "text-xs leading-relaxed text-muted-foreground",
                            strike && "line-through decoration-solid",
                          )}
                        >
                          {row.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-[115px] shrink-0 items-start justify-end gap-2 pt-0.5">
                      <R4Switch
                        checked={row.r4Approved}
                        tone={r4SwitchTone(row)}
                        disabled={disableInteractions || (!isUnlocked && block.confirmed)}
                        onToggle={() => handleToggleRow(id, row.key)}
                      />
                      <span
                        className={cn(
                          "text-right",
                          rowStatusTextClass(row, badge, pristine, block.confirmed),
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        {footerInner}
      </section>
    );
  }

  const applicantDisplayName = useMemo(
    () => resolveApplicantDisplayName(application),
    [application],
  );

  const assignee = useMemo(
    () =>
      resolveApplicationAssignee({
        canonicalState: statusMeta.canonicalState,
        applicantDisplayName,
        r2ReviewerDisplayName:
          application.data.consultation?.advisor?.trim()
          || application.data.recommendation?.releasedBy?.trim()
          || "NTA Fachstelle",
        r4ReviewerDisplayName: reviewerDisplayName,
      }),
    [statusMeta.canonicalState, applicantDisplayName, application.data, reviewerDisplayName],
  );

  const detailPanelSignature = useMemo(
    () =>
      [
        application.id,
        application.updated_at,
        statusMeta.canonicalState,
        statusMeta.label,
      ].join("\u001e"),
    [
      application.id,
      application.updated_at,
      statusMeta.canonicalState,
      statusMeta.label,
    ],
  );

  useRegisterDashboardDetailPanel(
    detailPanelSignature,
    () => (
      <ApplicationReviewDetailSidebar
        application={application}
        statusMeta={statusMeta}
        assignee={assignee}
        adjustmentComposer={null}
        savedReviewComments={[]}
        showCommentsSection
        secondarySection="r4_contacts"
      />
    ),
  );

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden">
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
          applicationContentScrollClass,
          applicationContentScrollPaddingClass,
        )}
      >
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Antrag auf Nachteilsausgleich (NTA) – {shortApplicationRef(application.id)}
            </h1>
            <div className="mt-4 rounded-lg bg-purple-100 px-4 py-3 dark:bg-purple-950/40">
              <div className="flex gap-3 text-left">
                <Info className="size-4 shrink-0 text-purple-600 dark:text-purple-300" aria-hidden />
                <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-purple-800 dark:text-purple-100">
                  Vom Studierenden gewählte Optionen sind mit «Bewilligt» vorgemerkt. Passen Sie die Schalter
                  bei Bedarf an, und bestätigen Sie die Auswahl pro Block. Anschliessend können Sie den
                  Entscheid abschliessen.
                </p>
              </div>
            </div>
          </div>

          {showApplicantBlock ? (
            <R4StaffContentBlock anchorId={reviewWorkspaceAnchorId("applicant")} title="Antragsteller">
              {data.personalData ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReviewField
                    label="Name"
                    value={`${data.personalData.vorname ?? ""} ${data.personalData.name ?? ""}`.trim() || "—"}
                  />
                  <ReviewField label="Matrikelnummer" value={data.personalData.matrikel ?? "—"} />
                  <ReviewField label="Studiengang" value={data.personalData.studiengang ?? "—"} />
                  <ReviewField label="Semester" value={data.personalData.semester ?? "—"} />
                  <ReviewField label="E-Mail" value={data.personalData.email ?? "—"} />
                  <ReviewField label="Telefonnummer" value={data.personalData.phone ?? "—"} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
              )}
            </R4StaffContentBlock>
          ) : null}

          {showAttestBlock ? (
            <R4StaffContentBlock anchorId={reviewWorkspaceAnchorId("attest")} title="Fachärztliches Attest">
              {data.attestFiles?.length ? (
                <ul className="space-y-3">
                  {data.attestFiles.map((file) => {
                    const [f] = sanitizeAttestFilesForDatabase([file]);
                    return (
                      <li key={file.id ?? file.name}>
                        <ReviewFileRow
                          title={f.name ?? "Datei"}
                          subtitle={formatReviewFileSize(f.size ?? 0)}
                          file={f}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Dateien hochgeladen.</p>
              )}
            </R4StaffContentBlock>
          ) : null}

          {showReleasedRecommendationBlock ? (
            <RecommendationReleasedAccordion
              html={data.recommendation?.releasedHtml ?? ""}
              releasedAt={data.recommendation?.releasedAt}
              authorDisplayName={data.recommendation?.releasedBy?.trim() || "NTA Fachstelle"}
            />
          ) : null}

          {showDefinitionBlock ? (
            <R4StaffContentBlock anchorId={reviewWorkspaceAnchorId("definition")} title="Antragsdefinition">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {def?.situationDescription?.trim()
                  ? def.situationDescription
                  : "Keine Beschreibung hinterlegt."}
              </p>
            </R4StaffContentBlock>
          ) : null}

          {showDurationBlock
            ? renderDecisionBlock("duration", "Gültigkeitsdauer des Nachteilsausgleiches")
            : null}
          {showScopeBlock
            ? renderDecisionBlock(
                "scope",
                "Geltungsbereich des beantragten Nachteilsausgleiches",
              )
            : null}
          {showLectureMeasuresBlock
            ? renderDecisionBlock(
                "lectureMeasures",
                "Ausgleichsmassnahmen für Lehrveranstaltungen",
              )
            : null}
          {showAssessmentMeasuresBlock
            ? renderDecisionBlock(
                "assessmentMeasures",
                "Ausgleichsmassnahmen für Leistungsnachweise",
              )
            : null}

          <div className="flex w-full flex-col items-end gap-2 pt-2">
            <Button
              type="button"
              className="h-11 w-fit gap-2 bg-zinc-900 px-5 text-white hover:bg-zinc-800 disabled:opacity-40"
              disabled={!canEdit || !allConfirmed || completing}
              onClick={() => void handleComplete()}
            >
              {completing ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Wird abgeschlossen …
                </>
              ) : (
                "Entscheid abschliessen"
              )}
            </Button>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}
