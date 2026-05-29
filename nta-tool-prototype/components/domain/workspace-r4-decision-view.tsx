"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Info, Loader2 } from "lucide-react";
import { ApplicationReviewDetailSidebar } from "@/components/domain/application-review-detail-sidebar";
import { ApplicationReviewPageHeader } from "@/components/domain/application-review-page-header";
import { ApplicationStatusCallout } from "@/components/domain/application-status-callout";
import { useRegisterDashboardDetailPanel } from "@/components/domain/dashboard-detail-panel-context";
import { useDashboardScrollRoot } from "@/components/domain/dashboard-main-panel-scroll-context";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssigneeForWorkspace,
} from "@/lib/application-assignee";
import {
  ReviewFileRow,
  formatReviewFileSize,
  sanitizeAttestFilesForDatabase,
} from "@/components/domain/application-review-blocks";
import {
  R4DecisionConfirmedFooter,
  R4DecisionEditingFooter,
  R4DecisionOptionRow,
  R4DecisionProposalInput,
  R4DecisionReadonlyConfirmedFooter,
  R4FacultyConfirmedBlock,
  ReviewField,
} from "@/components/domain/r4-decision-review-blocks";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import {
  REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE,
  reviewWorkspaceAnchorId,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import {
  allVisibleR4BlocksConfirmed,
  buildAssessmentMeasureRows,
  buildDurationRows,
  buildLectureMeasureRows,
  buildScopeRows,
  createR4ProposalRow,
  getR4BlockVisibility,
  isR4BlockDirty,
  isR4ProposalRowKey,
  mergeR4DecisionReview,
  mergeR4DecisionReviewRespectingLocalDirty,
  supportsR4CustomProposalInput,
} from "@/lib/r4-decision-state";
import {
  completeR4DecisionWithSupabaseClient,
  persistR4DecisionWithSupabaseClient,
} from "@/lib/r4-workspace-supabase-persist";
import {
  type R4DecisionBlockSnapshot,
  type R4DecisionReview,
  type R4DecisionReviewBlockId,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import {
  applicationReviewScrollAreaClass,
  applicationReviewSectionGapClass,
} from "@/lib/design-tokens/application-scroll";
import {
  R4_DECISION_BLOCK_BODY_CLASS,
  R4_DECISION_BLOCK_CONFIRMED_CLASS,
  R4_DECISION_BLOCK_EDITING_CLASS,
  R4_DECISION_ROW_LIST_CLASS,
} from "@/lib/design-tokens/r4-decision-block";
import { hfBlockTitle } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { getApplicationStatusMeta } from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import { canEditR4DecisionApplication } from "@/lib/workspace-application-visibility";
import { Button } from "@/components/ui/button";

type WorkspaceR4DecisionViewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
  workspaceRole: UserRole;
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

export function WorkspaceR4DecisionView({
  application,
  reviewerDisplayName,
  workspaceRole,
  onPersisted,
}: WorkspaceR4DecisionViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const data = application.data;
  const def = data.applicationDefinition;
  const canEdit = canEditR4DecisionApplication(application);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const statusMeta = getApplicationStatusMeta(application, "R4");
  const submittedAtLabel = formatReviewSubmittedAt(data);

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
  const persistSeqRef = useRef(0);
  const lastBackgroundParentRefreshAtRef = useRef(0);

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
    (id: R4DecisionReviewBlockId, rows: R4DecisionBlockSnapshot["rows"]) => {
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

        if (isR4ProposalRowKey(key) && !nextApproved) {
          return {
            ...prev,
            blocks: {
              ...prev.blocks,
              [id]: {
                ...block,
                confirmed: block.confirmed ?? false,
                rows: block.rows.filter((r) => r.key !== key),
              },
            },
          };
        }

        let nextRows = block.rows.map((r) =>
          r.key === key ? { ...r, r4Approved: nextApproved } : r,
        );

        if (id === "duration" && nextApproved) {
          nextRows = nextRows.map((r) => ({
            ...r,
            r4Approved: r.key === key,
          }));
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

  const handleUpsertProposal = (
    id: R4DecisionReviewBlockId,
    text: string,
    existingKey?: string,
  ): string | null => {
    if (!canEdit || !supportsR4CustomProposalInput(id)) return null;
    let proposalKey: string | null = null;

    flushSync(() => {
      setReview((prev) => {
        const block = prev.blocks[id];
        if (!block) return prev;
        if (block.confirmed && !editingRef.current[id]) return prev;

        const trimmed = text.trim();
        if (!trimmed) return prev;
        let nextRows = block.rows;

        if (existingKey) {
          const exists = block.rows.some((row) => row.key === existingKey);
          if (exists) {
            proposalKey = existingKey;
            nextRows = block.rows.map((row) =>
              row.key === existingKey ? { ...row, title: trimmed } : row,
            );
          }
        }

        if (proposalKey === null) {
          const newRow = createR4ProposalRow(trimmed);
          proposalKey = newRow.key;
          nextRows = [...block.rows, newRow];
        }

        if (id === "duration") {
          nextRows = nextRows.map((r) => ({
            ...r,
            r4Approved: r.key === proposalKey,
          }));
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
    return proposalKey;
  };

  const handleRemoveProposal = (id: R4DecisionReviewBlockId, key: string) => {
    if (!canEdit || !supportsR4CustomProposalInput(id)) return;

    flushSync(() => {
      setReview((prev) => {
        const block = prev.blocks[id];
        if (!block) return prev;
        if (block.confirmed && !editingRef.current[id]) return prev;
        if (!block.rows.some((row) => row.key === key)) return prev;

        return {
          ...prev,
          blocks: {
            ...prev.blocks,
            [id]: {
              ...block,
              confirmed: block.confirmed ?? false,
              rows: block.rows.filter((row) => row.key !== key),
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
    const proposalRows = block.rows.filter((row) => isR4ProposalRowKey(row.key));
    const standardRows = block.rows.filter((row) => !isR4ProposalRowKey(row.key));
    const baseline = baselines[id]!;
    const dirty = isR4BlockDirty(block, baseline);
    const pristine = !dirty && !block.confirmed;
    const anchorId = reviewWorkspaceAnchorId(id as ReviewWorkspaceBlockId);
    const confirmedClosed = block.confirmed && !editing[id];
    const disableInteractions = !canEdit;
    const switchesDisabled =
      disableInteractions || (block.confirmed && !editing[id]);

    const shellClass = confirmedClosed
      ? R4_DECISION_BLOCK_CONFIRMED_CLASS
      : R4_DECISION_BLOCK_EDITING_CLASS;

    const footer = confirmedClosed && canEdit ? (
      <R4DecisionConfirmedFooter
        disableInteractions={disableInteractions}
        onEdit={() => void handleEditBlock(id)}
      />
    ) : confirmedClosed && !canEdit ? (
      <R4DecisionReadonlyConfirmedFooter />
    ) : (
      <R4DecisionEditingFooter
        dirty={dirty}
        disableInteractions={disableInteractions}
        persisting={persisting}
        onReset={() => handleResetBlock(id)}
        onConfirm={() => void handleConfirmBlock(id)}
      />
    );

    return (
      <section key={id} id={anchorId} className={cn("scroll-mt-6", shellClass)}>
        <div className={R4_DECISION_BLOCK_BODY_CLASS}>
          <h2 className={hfBlockTitle}>{title}</h2>
          <ul className={R4_DECISION_ROW_LIST_CLASS}>
            {standardRows.map((row) => (
              <R4DecisionOptionRow
                key={row.key}
                row={row}
                pristine={pristine}
                blockConfirmed={block.confirmed}
                confirmedReadonly={confirmedClosed}
                disabled={switchesDisabled}
                onToggle={() => handleToggleRow(id, row.key)}
              />
            ))}
            {canEdit && !switchesDisabled && supportsR4CustomProposalInput(id) ? (
              <R4DecisionProposalInput
                proposalRows={proposalRows}
                disabled={disableInteractions}
                onUpsertProposal={(text, existingKey) =>
                  handleUpsertProposal(id, text, existingKey)
                }
                onRemoveProposal={(key) => handleRemoveProposal(id, key)}
              />
            ) : null}
          </ul>
        </div>
        {footer}
      </section>
    );
  }

  const applicantDisplayName = useMemo(
    () => resolveApplicantDisplayName(application),
    [application],
  );

  const assignee = useMemo(
    () =>
      resolveApplicationAssigneeForWorkspace(application, {
        workspaceRole,
        reviewerDisplayName,
      }),
    [application, reviewerDisplayName, workspaceRole],
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

  const scrollRootRef = useDashboardScrollRoot<HTMLDivElement>();

  useRegisterDashboardDetailPanel(
    detailPanelSignature,
    () => (
      <ApplicationReviewDetailSidebar
        application={application}
        statusMeta={statusMeta}
        assignee={assignee}
        adjustmentComposer={null}
        savedReviewComments={[]}
        showCommentsSection={false}
        secondarySection="r4_contacts"
      />
    ),
  );

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden">
      <div
        ref={scrollRootRef}
        className={cn(
          applicationReviewScrollAreaClass,
          "flex flex-col",
          applicationReviewSectionGapClass,
        )}
      >
        <div className="flex flex-col gap-6">
          <ApplicationReviewPageHeader submittedAtLabel={submittedAtLabel} />
          {canEdit ? (
            <ApplicationStatusCallout badgeClassName={statusMeta.className} icon={Info}>
              Entscheiden Sie über den von der Fachstelle bestätigten Antrag. Vom Studierenden gewählte Optionen sind mit «Bewilligt» vorgemerkt. Passen Sie die Schalter bei Bedarf an, und bestätigen Sie die Auswahl pro Block. Anschliessend können Sie den Entscheid abschliessen.
            </ApplicationStatusCallout>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {showApplicantBlock ? (
            <R4FacultyConfirmedBlock
              anchorId={reviewWorkspaceAnchorId("applicant")}
              title={REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE}
            >
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
            </R4FacultyConfirmedBlock>
          ) : null}

          {showAttestBlock ? (
            <R4FacultyConfirmedBlock
              anchorId={reviewWorkspaceAnchorId("attest")}
              title="Fachärztliches Attest"
            >
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
            </R4FacultyConfirmedBlock>
          ) : null}

          {showReleasedRecommendationBlock ? (
            <RecommendationReleasedAccordion
              html={data.recommendation?.releasedHtml ?? ""}
              releasedAt={data.recommendation?.releasedAt}
              authorDisplayName={data.recommendation?.releasedBy?.trim() || "NTA Fachstelle"}
            />
          ) : null}

          {showDefinitionBlock ? (
            <R4FacultyConfirmedBlock
              anchorId={reviewWorkspaceAnchorId("definition")}
              title="Persönliche Situationsbeschreibung"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {def?.situationDescription?.trim()
                  ? def.situationDescription
                  : "Keine Beschreibung hinterlegt."}
              </p>
            </R4FacultyConfirmedBlock>
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
              className="h-11 w-fit gap-2 rounded-full bg-zinc-900 px-5 text-white hover:bg-zinc-800 disabled:opacity-40"
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
