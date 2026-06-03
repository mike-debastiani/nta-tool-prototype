"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Check, CircleCheckBig, CircleX, FileText, Info, Loader2, PenLine } from "lucide-react";
import { ApplicationIssuedVerfuegungView } from "@/components/domain/application-issued-verfuegung-view";
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
  R4DecisionConcretizeFooter,
  R4DecisionConcretizeList,
  R4DecisionConfirmedFooter,
  R4DecisionDefinedFooter,
  R4DecisionDefinedList,
  R4DecisionDefinedReadonlyFooter,
  R4DecisionEditingFooter,
  R4DecisionOptionRow,
  R4DecisionProposalInput,
  R4DecisionReadonlyConfirmedFooter,
  R4DecisionRejectedReasonFooter,
  R4DecisionRejectedReasonReadonlyFooter,
  R4DecisionRejectReasonFooter,
  R4FacultyConfirmedBlock,
  ReviewField,
  type R4ConcretizeItem,
} from "@/components/domain/r4-decision-review-blocks";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import {
  R4VerfuegungDocument,
  type R4VerfuegungVariant,
} from "@/components/domain/r4-verfuegung-document";
import { R4VerfuegungRejectedBlocks } from "@/components/domain/r4-verfuegung-rejected-blocks";
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
  isR4ApplicationRejected,
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
  type R4DecisionRow,
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
  R4_DECISION_BLOCK_DEFINED_CLASS,
  R4_DECISION_BLOCK_EDITING_CLASS,
  R4_DECISION_BLOCK_REJECTED_CLASS,
  R4_DECISION_REJECTED_BODY_TEXT_CLASS,
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

/** Hinweistext im abgelehnten Massnahmen-Block (`6344:25597` / Lehrveranstaltungen). */
function rejectedMeasuresText(id: R4DecisionReviewBlockId): string {
  return id === "lectureMeasures"
    ? "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Lehrveranstaltungen gewährt."
    : "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Leistungsnachweise gewährt.";
}

/** Neutraler Hinweistext im abgelehnten Auswahl-Block (die Begründung folgt im Footer). */
function emptyChoiceText(id: R4DecisionReviewBlockId): string {
  return id === "duration"
    ? "Der antragstellenden Person wurde keine Gültigkeitsdauer des Nachteilsausgleiches zugesprochen."
    : "Der antragstellenden Person wurde kein Geltungsbereich des Nachteilsausgleiches zugesprochen.";
}

/** Status-Label unten rechts im bestätigten Auswahl-Block ohne zugesprochene Auswahl. */
function emptyChoiceStatusLabel(id: R4DecisionReviewBlockId): string {
  return id === "duration"
    ? "Keine Gültigkeit zugesprochen"
    : "Kein Geltungsbereich zugesprochen";
}

/**
 * Bewilligte (angeschaltete) Massnahmen-Zeilen für die Konkretisieren-/Definiert-Liste.
 * Freitextmassnahmen erhalten den Titel «Sonstige Massnahme»; die Beschreibung ist die
 * R4-Konkretisierung oder per Default die ursprüngliche Massnahmenbeschreibung/-eingabe.
 */
function approvedMeasureRows(block: R4DecisionBlockSnapshot): R4DecisionRow[] {
  return block.rows.filter((r) => r.r4Approved && r.key !== "__keine__");
}

function buildConcretizeItems(rows: R4DecisionRow[]): R4ConcretizeItem[] {
  return rows.map((row) => {
    const isProposal = isR4ProposalRowKey(row.key);
    const defaultTitle = isProposal ? "Sonstige Massnahme" : row.title;
    const fallbackDescription = isProposal ? row.title : row.description ?? "";
    return {
      key: row.key,
      title: row.concretizedTitle ?? defaultTitle,
      value: row.concretizedDescription ?? fallbackDescription,
    };
  });
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
  /** Antrag bewilligt oder abgelehnt → ausgestellte Verfügung statt Entscheid-Blöcke. */
  const isApproved = statusMeta.canonicalState === "approved";
  const isRejected = statusMeta.canonicalState === "rejected";

  const [review, setReview] = useState<R4DecisionReview>(() =>
    mergeR4DecisionReview(data),
  );
  const reviewRef = useRef(review);
  reviewRef.current = review;

  const [editing, setEditing] = useState<Partial<Record<R4DecisionReviewBlockId, boolean>>>({});
  const editingRef = useRef(editing);
  editingRef.current = editing;

  /** Massnahmen-Blöcke: aktiver «Massnahmen konkretisieren»-Zustand (transient, nicht persistiert). */
  const [concretizing, setConcretizing] = useState<
    Partial<Record<R4DecisionReviewBlockId, boolean>>
  >({});

  /** Massnahmen-Blöcke: aktiver «Begründung erfassen»-Zustand (transient, nicht persistiert). */
  const [rejecting, setRejecting] = useState<
    Partial<Record<R4DecisionReviewBlockId, boolean>>
  >({});
  /** Entwurf der Ablehnungs-Begründung je Block (lokal, bis «Bestätigen»). */
  const [rejectionDraft, setRejectionDraft] = useState<
    Partial<Record<R4DecisionReviewBlockId, string>>
  >({});

  const [persisting, setPersisting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Vorschau der generierten Verfügung statt der Entscheid-Blöcke (transient, nicht persistiert). */
  const [verfuegungMode, setVerfuegungMode] = useState(false);

  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSeqRef = useRef(0);
  const lastBackgroundParentRefreshAtRef = useRef(0);

  const serverR4ReviewUpdatedAt = application.data?.r4DecisionReview?.updatedAt;

  const visibility = useMemo(() => getR4BlockVisibility(data), [data]);
  const previewRejected = isR4ApplicationRejected(review, visibility);
  const verfuegungVariant: R4VerfuegungVariant =
    isRejected || (verfuegungMode && previewRejected) ? "rejected" : "approved";
  const showIssuedVerfuegung = isApproved || isRejected;

  const baselines = useMemo<Record<R4DecisionReviewBlockId, R4DecisionBlockSnapshot>>(
    () => ({
      duration: { confirmed: false, rows: buildDurationRows(def) },
      scope: { confirmed: false, rows: buildScopeRows(def) },
      lectureMeasures: { confirmed: false, rows: buildLectureMeasureRows(def) },
      assessmentMeasures: { confirmed: false, rows: buildAssessmentMeasureRows(def) },
    }),
    [def],
  );

  const lastSyncedApplicationIdRef = useRef(application.id);

  useEffect(() => {
    setReview((prev) => mergeR4DecisionReviewRespectingLocalDirty(application.data, prev));
    // UI-Modi (Auswahl/Konkretisieren/Bearbeiten) nur bei echtem Antragswechsel zurücksetzen.
    // Bei einem durch eigenes Autosave ausgelösten Refetch (gleiche `application.id`,
    // neuer `updatedAt`) darf der aktuelle Bearbeitungs-/Konkretisieren-Zustand NICHT
    // verworfen werden — sonst springt der Block während der Eingabe zurück zur Auswahl.
    if (lastSyncedApplicationIdRef.current !== application.id) {
      lastSyncedApplicationIdRef.current = application.id;
      setEditing({});
      setConcretizing({});
      setRejecting({});
      setRejectionDraft({});
      setVerfuegungMode(false);
    }
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
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Stabiler Key (vom Eingabefeld vergeben). Idempotenter Upsert: vorhandene Zeile
    // aktualisieren, sonst genau einmal anlegen — KEIN flushSync (sonst triggert der
    // synchrone Re-Render den Reconcile mitten im Tastendruck und erzeugt Duplikate).
    const proposalKey = existingKey ?? `proposal:${Date.now()}`;

    setReview((prev) => {
      const block = prev.blocks[id];
      if (!block) return prev;
      if (block.confirmed && !editingRef.current[id]) return prev;

      const exists = block.rows.some((row) => row.key === proposalKey);
      const nextRows = exists
        ? block.rows.map((row) =>
            row.key === proposalKey ? { ...row, title: trimmed } : row,
          )
        : [...block.rows, createR4ProposalRow(trimmed, proposalKey)];

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
    setConcretizing((c) => ({ ...c, [id]: false }));
    const ok = await persist(next);
    if (!ok) {
      setReview(prior);
    }
  };

  const handleEditBlock = async (id: R4DecisionReviewBlockId) => {
    cancelR4AutosaveSchedule();
    setEditing((e) => ({ ...e, [id]: true }));
    setConcretizing((c) => ({ ...c, [id]: false }));
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

  /** «Massnahmen konkretisieren» — in den Konkretisieren-Zustand wechseln (kein Persist nötig). */
  const handleStartConcretize = (id: R4DecisionReviewBlockId) => {
    if (!canEdit) return;
    cancelR4AutosaveSchedule();
    setConcretizing((c) => ({ ...c, [id]: true }));
  };

  /**
   * «Bearbeiten» auf definierten (konkretisierten) Massnahmen → zurück in den
   * Konkretisieren-Zustand, damit die Konkretisierungen angepasst werden können.
   */
  const handleEditConcretization = async (id: R4DecisionReviewBlockId) => {
    if (!canEdit) return;
    cancelR4AutosaveSchedule();
    setEditing((e) => ({ ...e, [id]: true }));
    setConcretizing((c) => ({ ...c, [id]: true }));
    const prev = reviewRef.current;
    const cur = prev.blocks[id] ?? baselines[id]!;
    const next: R4DecisionReview = {
      ...prev,
      blocks: {
        ...prev.blocks,
        [id]: { ...cur, confirmed: false },
      },
    };
    setReview(next);
    await persist(next);
  };

  /**
   * «Zurück zur Auswahl» — zurück in den Auswahl-Zustand. Verworfene Konkretisierungen
   * (Titel/Beschreibung) werden zurückgesetzt, damit ein erneuter Konkretisieren-Schritt
   * wieder mit den Default-Werten startet.
   */
  const handleBackToSelection = (id: R4DecisionReviewBlockId) => {
    setConcretizing((c) => ({ ...c, [id]: false }));
    setReview((prev) => {
      const block = prev.blocks[id];
      if (!block) return prev;
      const rows = block.rows.map((r) =>
        r.concretizedTitle === undefined && r.concretizedDescription === undefined
          ? r
          : { ...r, concretizedTitle: undefined, concretizedDescription: undefined },
      );
      return {
        ...prev,
        blocks: { ...prev.blocks, [id]: { ...block, rows } },
      };
    });
    scheduleR4Autosave();
  };

  const handleConcretizeDescription = (
    id: R4DecisionReviewBlockId,
    key: string,
    text: string,
  ) => {
    if (!canEdit) return;
    setReview((prev) => {
      const block = prev.blocks[id];
      if (!block) return prev;
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [id]: {
            ...block,
            confirmed: block.confirmed ?? false,
            rows: block.rows.map((r) =>
              r.key === key ? { ...r, concretizedDescription: text } : r,
            ),
          },
        },
      };
    });
    scheduleR4Autosave();
  };

  const handleConcretizeTitle = (
    id: R4DecisionReviewBlockId,
    key: string,
    text: string,
  ) => {
    if (!canEdit) return;
    setReview((prev) => {
      const block = prev.blocks[id];
      if (!block) return prev;
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [id]: {
            ...block,
            confirmed: block.confirmed ?? false,
            rows: block.rows.map((r) =>
              r.key === key ? { ...r, concretizedTitle: text } : r,
            ),
          },
        },
      };
    });
    scheduleR4Autosave();
  };

  /**
   * «Auswahl bestätigen» ohne bewilligte Massnahme → Begründungs-Zwischenschritt öffnen
   * (Mechanik wie R2-Anpassungsanforderung). Bestehende Begründung wird als Entwurf geladen.
   */
  const handleStartReject = (id: R4DecisionReviewBlockId) => {
    if (!canEdit) return;
    cancelR4AutosaveSchedule();
    const block = reviewRef.current.blocks[id];
    setRejectionDraft((d) => ({ ...d, [id]: block?.decisionReason ?? "" }));
    setRejecting((r) => ({ ...r, [id]: true }));
  };

  const handleRejectDraftChange = (id: R4DecisionReviewBlockId, text: string) => {
    setRejectionDraft((d) => ({ ...d, [id]: text }));
  };

  /**
   * «Zurück zur Auswahl» aus dem Begründungs-Schritt: Block nicht bestätigt, zurück zur
   * Auswahl. Die (verworfene) Begründung wird zurückgesetzt, damit ein erneuter
   * Ablehnungs-Schritt wieder mit leerem Feld startet.
   */
  const handleBackFromReject = async (id: R4DecisionReviewBlockId) => {
    cancelR4AutosaveSchedule();
    setRejecting((r) => ({ ...r, [id]: false }));
    setRejectionDraft((d) => ({ ...d, [id]: "" }));
    const cur = reviewRef.current;
    const block = cur.blocks[id];
    if (!block) return;
    if (!block.confirmed && !block.decisionReason) return;
    const prior = cur;
    const next: R4DecisionReview = {
      ...cur,
      blocks: {
        ...cur.blocks,
        [id]: { ...block, confirmed: false, decisionReason: undefined },
      },
    };
    setReview(next);
    const ok = await persist(next);
    if (!ok) setReview(prior);
  };

  /** «Bestätigen» im Begründungs-Schritt: Begründung speichern und Block ablehnen. */
  const handleConfirmRejection = async (id: R4DecisionReviewBlockId) => {
    const reason = (rejectionDraft[id] ?? "").trim();
    if (!reason) return;
    cancelR4AutosaveSchedule();
    const cur = reviewRef.current;
    const block = cur.blocks[id];
    if (!block) return;
    const prior = cur;
    const next: R4DecisionReview = {
      ...cur,
      blocks: {
        ...cur.blocks,
        [id]: { ...block, confirmed: true, decisionReason: reason },
      },
    };
    setReview(next);
    setRejecting((r) => ({ ...r, [id]: false }));
    setEditing((e) => ({ ...e, [id]: false }));
    const ok = await persist(next);
    if (!ok) setReview(prior);
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
    if (supportsR4CustomProposalInput(id)) {
      return renderMeasureBlock(id, title);
    }
    return renderChoiceBlock(id, title);
  }

  /** Gültigkeitsdauer / Geltungsbereich — Auswahl + «Auswahl bestätigen». */
  function renderChoiceBlock(id: R4DecisionReviewBlockId, title: string) {
    const block = review.blocks[id] ?? baselines[id]!;
    const standardRows = block.rows.filter((row) => !isR4ProposalRowKey(row.key));
    const baseline = baselines[id]!;
    const dirty = isR4BlockDirty(block, baseline);
    const pristine = !dirty && !block.confirmed;
    const anchorId = reviewWorkspaceAnchorId(id as ReviewWorkspaceBlockId);
    const disableInteractions = !canEdit;
    const hasApproved = approvedMeasureRows(block).length > 0;
    const isRejecting = Boolean(rejecting[id]);
    const decisionReason = block.decisionReason ?? "";

    // Begründungs-Schritt (keine Auswahl zugesprochen): Grund erfassen (Mechanik wie R2).
    if (isRejecting) {
      return (
        <section
          key={id}
          id={anchorId}
          className={cn("scroll-mt-6", R4_DECISION_BLOCK_REJECTED_CLASS)}
        >
          <div className={R4_DECISION_BLOCK_BODY_CLASS}>
            <h2 className={hfBlockTitle}>{title}</h2>
            <p className={R4_DECISION_REJECTED_BODY_TEXT_CLASS}>{emptyChoiceText(id)}</p>
          </div>
          <R4DecisionRejectReasonFooter
            draft={rejectionDraft[id] ?? ""}
            disableInteractions={disableInteractions}
            persisting={persisting}
            onDraftChange={(text) => handleRejectDraftChange(id, text)}
            onBack={() => void handleBackFromReject(id)}
            onConfirm={() => void handleConfirmRejection(id)}
          />
        </section>
      );
    }

    // Bestätigt ohne zugesprochene Auswahl → «abgelehnt»-Optik mit eingebetteter Begründung.
    if (block.confirmed && !editing[id] && !hasApproved) {
      return (
        <section
          key={id}
          id={anchorId}
          className={cn("scroll-mt-6", R4_DECISION_BLOCK_REJECTED_CLASS)}
        >
          <div className={R4_DECISION_BLOCK_BODY_CLASS}>
            <h2 className={hfBlockTitle}>{title}</h2>
            <p className={R4_DECISION_REJECTED_BODY_TEXT_CLASS}>{emptyChoiceText(id)}</p>
          </div>
          {canEdit ? (
            <R4DecisionRejectedReasonFooter
              reason={decisionReason}
              disableInteractions={disableInteractions}
              onEdit={() => handleStartReject(id)}
              statusLabel={emptyChoiceStatusLabel(id)}
            />
          ) : (
            <R4DecisionRejectedReasonReadonlyFooter
              reason={decisionReason}
              statusLabel={emptyChoiceStatusLabel(id)}
            />
          )}
        </section>
      );
    }

    const confirmedClosed = block.confirmed && !editing[id];
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
        onConfirm={() =>
          hasApproved ? void handleConfirmBlock(id) : handleStartReject(id)
        }
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
          </ul>
        </div>
        {footer}
      </section>
    );
  }

  /**
   * Massnahmen-Blöcke (Lehrveranstaltungen / Leistungsnachweise): Auswahl → Konkretisieren →
   * Definiert bzw. Abgelehnt (Figma `6344:25136`, `6344:25081`, `6344:25421`).
   */
  function renderMeasureBlock(id: R4DecisionReviewBlockId, title: string) {
    const block = review.blocks[id] ?? baselines[id]!;
    const baseline = baselines[id]!;
    const dirty = isR4BlockDirty(block, baseline);
    const pristine = !dirty && !block.confirmed;
    const anchorId = reviewWorkspaceAnchorId(id as ReviewWorkspaceBlockId);
    const disableInteractions = !canEdit;

    const proposalRows = block.rows.filter((row) => isR4ProposalRowKey(row.key));
    const standardRows = block.rows.filter((row) => !isR4ProposalRowKey(row.key));
    const approvedRows = approvedMeasureRows(block);
    const hasApproved = approvedRows.length > 0;
    const concretizeItems = buildConcretizeItems(approvedRows);
    const isConcretizing = Boolean(concretizing[id]);
    const isRejecting = Boolean(rejecting[id]);
    const decisionReason = block.decisionReason ?? "";

    // Begründungs-Schritt (keine Massnahme bewilligt): Grund erfassen (Mechanik wie R2).
    if (isRejecting) {
      return (
        <section
          key={id}
          id={anchorId}
          className={cn("scroll-mt-6", R4_DECISION_BLOCK_REJECTED_CLASS)}
        >
          <div className={R4_DECISION_BLOCK_BODY_CLASS}>
            <h2 className={hfBlockTitle}>{title}</h2>
            <p className={R4_DECISION_REJECTED_BODY_TEXT_CLASS}>
              {rejectedMeasuresText(id)}
            </p>
          </div>
          <R4DecisionRejectReasonFooter
            draft={rejectionDraft[id] ?? ""}
            disableInteractions={disableInteractions}
            persisting={persisting}
            onDraftChange={(text) => handleRejectDraftChange(id, text)}
            onBack={() => void handleBackFromReject(id)}
            onConfirm={() => void handleConfirmRejection(id)}
          />
        </section>
      );
    }

    // Entschieden: «Massnahmen definiert» (grün) oder «Massnahmen abgelehnt» (rot).
    if (block.confirmed) {
      if (hasApproved) {
        return (
          <section
            key={id}
            id={anchorId}
            className={cn("scroll-mt-6", R4_DECISION_BLOCK_DEFINED_CLASS)}
          >
            <div className={R4_DECISION_BLOCK_BODY_CLASS}>
              <h2 className={hfBlockTitle}>{title}</h2>
              <R4DecisionDefinedList items={concretizeItems} />
            </div>
            {canEdit ? (
              <R4DecisionDefinedFooter
                disableInteractions={disableInteractions}
                onEdit={() => void handleEditConcretization(id)}
              />
            ) : (
              <R4DecisionDefinedReadonlyFooter />
            )}
          </section>
        );
      }

      return (
        <section
          key={id}
          id={anchorId}
          className={cn("scroll-mt-6", R4_DECISION_BLOCK_REJECTED_CLASS)}
        >
          <div className={R4_DECISION_BLOCK_BODY_CLASS}>
            <h2 className={hfBlockTitle}>{title}</h2>
            <p className={R4_DECISION_REJECTED_BODY_TEXT_CLASS}>
              {rejectedMeasuresText(id)}
            </p>
          </div>
          {canEdit ? (
            <R4DecisionRejectedReasonFooter
              reason={decisionReason}
              disableInteractions={disableInteractions}
              onEdit={() => handleStartReject(id)}
            />
          ) : (
            <R4DecisionRejectedReasonReadonlyFooter reason={decisionReason} />
          )}
        </section>
      );
    }

    // «Massnahmen konkretisieren»-Zustand: Karten mit editierbarem Titel + Beschreibung.
    if (isConcretizing) {
      return (
        <section
          key={id}
          id={anchorId}
          className={cn("scroll-mt-6", R4_DECISION_BLOCK_EDITING_CLASS)}
        >
          <div className={R4_DECISION_BLOCK_BODY_CLASS}>
            <h2 className={hfBlockTitle}>{title}</h2>
            <R4DecisionConcretizeList
              items={concretizeItems}
              disabled={disableInteractions}
              onChangeTitle={(key, text) => handleConcretizeTitle(id, key, text)}
              onChangeDescription={(key, text) =>
                handleConcretizeDescription(id, key, text)
              }
            />
          </div>
          <R4DecisionConcretizeFooter
            disableInteractions={disableInteractions}
            persisting={persisting}
            onBack={() => handleBackToSelection(id)}
            onComplete={() => void handleConfirmBlock(id)}
          />
        </section>
      );
    }

    // Auswahl-Zustand: Schalter pro Option + Freitext-Vorschlag.
    return (
      <section
        key={id}
        id={anchorId}
        className={cn("scroll-mt-6", R4_DECISION_BLOCK_EDITING_CLASS)}
      >
        <div className={R4_DECISION_BLOCK_BODY_CLASS}>
          <h2 className={hfBlockTitle}>{title}</h2>
          <ul className={R4_DECISION_ROW_LIST_CLASS}>
            {standardRows.map((row) => (
              <R4DecisionOptionRow
                key={row.key}
                row={row}
                pristine={pristine}
                blockConfirmed={block.confirmed}
                confirmedReadonly={false}
                disabled={disableInteractions}
                onToggle={() => handleToggleRow(id, row.key)}
              />
            ))}
            {canEdit ? (
              <R4DecisionProposalInput
                proposalRows={proposalRows}
                disabled={disableInteractions}
                onUpsertProposal={(text, existingKey) =>
                  handleUpsertProposal(id, text, existingKey)
                }
                onRemoveProposal={(key) => handleRemoveProposal(id, key)}
              />
            ) : (
              proposalRows.map((row) => (
                <R4DecisionOptionRow
                  key={row.key}
                  row={row}
                  pristine={pristine}
                  blockConfirmed={block.confirmed}
                  confirmedReadonly={false}
                  disabled
                  onToggle={() => handleToggleRow(id, row.key)}
                />
              ))
            )}
          </ul>
        </div>
        <R4DecisionEditingFooter
          dirty={dirty}
          disableInteractions={disableInteractions}
          persisting={persisting}
          onReset={() => handleResetBlock(id)}
          confirmLabel={hasApproved ? "Massnahmen konkretisieren" : "Auswahl bestätigen"}
          confirmIcon={hasApproved ? Check : CircleCheckBig}
          onConfirm={() =>
            hasApproved ? handleStartConcretize(id) : handleStartReject(id)
          }
        />
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

  /** Verfügung sichtbar (Vorschau oder ausgestellt) → «Zugehörige Dokumente»; sonst «Kontakte». */
  const showVerfuegungSidebar = showIssuedVerfuegung || verfuegungMode;

  const detailPanelSignature = useMemo(
    () =>
      [
        application.id,
        application.updated_at,
        statusMeta.canonicalState,
        statusMeta.label,
        showVerfuegungSidebar ? "verfuegung" : "entscheid",
        verfuegungVariant,
      ].join("\u001e"),
    [
      application.id,
      application.updated_at,
      statusMeta.canonicalState,
      statusMeta.label,
      showVerfuegungSidebar,
      verfuegungVariant,
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
        secondarySection={
          showVerfuegungSidebar ? "r4_related_documents" : "r4_contacts"
        }
      />
    ),
  );

  const applicantBlock = showApplicantBlock ? (
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
  ) : null;

  const renderAttestBlock = (showFacultyFooter: boolean) => (showAttestBlock ? (
    <R4FacultyConfirmedBlock
      anchorId={reviewWorkspaceAnchorId("attest")}
      title="Fachärztliches Attest"
      showFacultyFooter={showFacultyFooter}
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
  ) : null);

  const recommendationBlock = showReleasedRecommendationBlock ? (
    <RecommendationReleasedAccordion
      html={data.recommendation?.releasedHtml ?? ""}
      releasedAt={data.recommendation?.releasedAt}
      authorDisplayName={data.recommendation?.releasedBy?.trim() || "NTA Fachstelle"}
    />
  ) : null;

  const renderDefinitionBlock = (showFacultyFooter: boolean) => (showDefinitionBlock ? (
    <R4FacultyConfirmedBlock
      anchorId={reviewWorkspaceAnchorId("definition")}
      title="Persönliche Situationsbeschreibung"
      showFacultyFooter={showFacultyFooter}
    >
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {def?.situationDescription?.trim()
          ? def.situationDescription
          : "Keine Beschreibung hinterlegt."}
      </p>
    </R4FacultyConfirmedBlock>
  ) : null);

  if (showIssuedVerfuegung) {
    return (
      <ApplicationIssuedVerfuegungView
        application={application}
        calloutAudience="R4"
        workspaceRole={workspaceRole}
        reviewerDisplayName={reviewerDisplayName}
      />
    );
  }

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
        <div className="flex shrink-0 flex-col gap-6">
          <ApplicationReviewPageHeader
            submittedAtLabel={submittedAtLabel}
            title={
              showVerfuegungSidebar
                ? "Verfügung zum Nachteilsausgleich"
                : "Antrag auf Nachteilsausgleich"
            }
            trailingAction={showVerfuegungSidebar ? "share" : "more"}
          />
          {canEdit && !verfuegungMode ? (
            <ApplicationStatusCallout badgeClassName={statusMeta.className} icon={Info}>
              Entscheiden Sie über den von der Fachstelle bestätigten Antrag. Vom Studierenden gewählte Optionen sind mit «Bewilligt» vorgemerkt. Passen Sie die Schalter bei Bedarf an, und bestätigen Sie die Auswahl pro Block. Anschliessend können Sie die Verfügung generieren.
            </ApplicationStatusCallout>
          ) : null}
          {canEdit && verfuegungMode && previewRejected ? (
            <ApplicationStatusCallout badgeClassName={statusMeta.className} icon={CircleX}>
              Vorschau der generierten Verfügung. Der Antrag wird aufgrund Ihrer Entscheid abgelehnt. Prüfen Sie die Angaben und Begründungen. Über «Entscheidung bearbeiten» kehren Sie zum Entscheid zurück; mit «Entscheid fällen» wird die Verfügung übermittelt.
            </ApplicationStatusCallout>
          ) : null}
          {canEdit && verfuegungMode && !previewRejected ? (
            <ApplicationStatusCallout badgeClassName={statusMeta.className} icon={FileText}>
              Vorschau der generierten Verfügung. Prüfen Sie die Angaben. Über «Entscheidung bearbeiten» kehren Sie zum Entscheid zurück; mit «Entscheid fällen» wird die Verfügung an die antragstellende Person übermittelt und der Antrag bewilligt.
            </ApplicationStatusCallout>
          ) : null}
        </div>

        {verfuegungMode ? (
          <div className="flex shrink-0 flex-col gap-6">
            <R4VerfuegungDocument
              application={application}
              review={review}
              variant={verfuegungVariant}
            />
            {verfuegungVariant === "rejected" ? (
              <R4VerfuegungRejectedBlocks application={application} review={review} />
            ) : null}
            <div className="flex w-full items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-fit gap-2 rounded-full px-5"
                disabled={completing}
                onClick={() => setVerfuegungMode(false)}
              >
                <PenLine className="size-4 shrink-0" aria-hidden />
                Entscheidung bearbeiten
              </Button>
              <Button
                type="button"
                className="h-11 w-fit gap-2 rounded-full bg-zinc-900 px-5 text-white hover:bg-stone-600 disabled:opacity-40"
                disabled={!canEdit || !allConfirmed || completing}
                onClick={() => void handleComplete()}
              >
                {completing ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Wird übermittelt …
                  </>
                ) : (
                  <>
                    <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                    Entscheid fällen
                  </>
                )}
              </Button>
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
        <div className="flex shrink-0 flex-col gap-6">
          {applicantBlock}
          {renderAttestBlock(true)}
          {recommendationBlock}
          {renderDefinitionBlock(true)}

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
              className="h-11 w-fit gap-2 rounded-full bg-zinc-900 px-5 text-white hover:bg-stone-600 disabled:opacity-40"
              disabled={!canEdit || !allConfirmed}
              onClick={() => setVerfuegungMode(true)}
            >
              <FileText className="size-4 shrink-0" aria-hidden />
              Verfügung generieren
            </Button>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
