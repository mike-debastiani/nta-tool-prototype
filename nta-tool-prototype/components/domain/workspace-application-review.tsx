"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CircleAlert,
  Info,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApplicationReviewDetailSidebar,
  type SavedReviewComment,
} from "@/components/domain/application-review-detail-sidebar";
import { ApplicationReviewPageHeader } from "@/components/domain/application-review-page-header";
import { ApplicationStatusCallout } from "@/components/domain/application-status-callout";
import { WorkspaceConsultationAppointmentCard } from "@/components/domain/workspace-consultation-appointment-card";
import { useRegisterDashboardDetailPanel } from "@/components/domain/dashboard-detail-panel-context";
import { useDashboardScrollRoot } from "@/components/domain/dashboard-main-panel-scroll-context";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssigneeForWorkspace,
} from "@/lib/application-assignee";
import {
  ASSESSMENT_MEASURE_OPTIONS,
  DurationChoiceCompare,
  LECTURE_MEASURE_OPTIONS,
  MeasureChecklist,
  ReviewBlockAdjustmentActiveFooter,
  ReviewBlockAdjustmentHistoryToggle,
  ReviewBlockAdjustmentSentFooter,
  type ReviewBlockAdjustmentHistoryView,
  ReviewBlockCard,
  ReviewBlockComposerFooter,
  ReviewBlockConfirmedFooter,
  ReviewBlockFieldGrid,
  ReviewBlockPendingFooter,
  ReviewBlockRequestedAdjustmentBand,
  ReviewField,
  ReviewFileRow,
  ScopeChecklist,
  formatReviewFileSize,
  sanitizeAttestFilesForDatabase,
} from "@/components/domain/application-review-blocks";
import {
  applyBaselineToData,
  readR1AdjustmentBlockBaselines,
  type R1AdjustmentBlockBaseline,
} from "@/lib/r1-adjustment-baseline";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import {
  REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE,
  REVIEW_WORKSPACE_BLOCK_IDS,
  reviewWorkspaceAnchorId,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import { dataWithoutLegacyReviewRoots } from "@/lib/r2-review-persist";
import {
  type R2PostSubmitReview,
  type R2ReviewBlockSnapshot,
  type R2ReviewDraft,
  type R2ReviewDraftBlock,
  type RecommendationWorkspaceReview,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import {
  applicationReviewScrollAreaClass,
  applicationReviewSectionGapClass,
} from "@/lib/design-tokens/application-scroll";
import { REVIEW_BLOCK_READONLY_STATUS_FOOTER_CLASS } from "@/lib/design-tokens/review-block";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { cn } from "@/lib/utils";
import {
  type ApplicationStatus,
  type StatusAudience,
  getApplicationStatusMeta,
} from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import { statusAudienceForWorkspaceApplication } from "@/lib/workspace-role";
import {
  ASSESSMENT_MEASURES_KEINE_DESCRIPTION,
  LECTURE_MEASURES_KEINE_DESCRIPTION,
} from "@/lib/application-review-labels";
import {
  definitionShowsAssessmentCustomMeasures,
  definitionShowsLectureCustomMeasures,
} from "@/lib/measure-custom-lines";
import { broadcastApplicationRowUpdated } from "@/lib/application-realtime-sync";
import { resolveWorkspaceConsultationAppointment } from "@/lib/workspace-consultation-appointment";
import { workspaceReviewPostSubmitHydrationKey } from "@/lib/workspace-review-hydration-key";

type ReviewBlockPhase =
  | { phase: "pending" }
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string }
  | { phase: "pending_after_adjustment"; displayRemark: string };

const INITIAL_REVIEW_BLOCK_PHASES: Record<
  ReviewWorkspaceBlockId,
  ReviewBlockPhase
> = {
  applicant: { phase: "pending" },
  attest: { phase: "pending" },
  definition: { phase: "pending" },
  duration: { phase: "pending" },
  scope: { phase: "pending" },
  lectureMeasures: { phase: "pending" },
  assessmentMeasures: { phase: "pending" },
};

function safeIsoMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function hydrateBlockPhasesFromApplication(
  application: WorkspaceApplication,
): Record<ReviewWorkspaceBlockId, ReviewBlockPhase> {
  const wr = application.data.recommendation?.workspaceReview;
  const forwarded = wr?.postSubmit?.blocks ?? application.data.r2PostSubmitReview?.blocks;
  if (forwarded) {
    const next: Record<ReviewWorkspaceBlockId, ReviewBlockPhase> = {
      ...INITIAL_REVIEW_BLOCK_PHASES,
    };
    for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
      const entry = forwarded[id];
      if (!entry || typeof entry !== "object" || !("phase" in entry)) continue;
      const phase = entry.phase;
      if (phase === "confirmed") {
        next[id] = { phase: "confirmed" };
      } else if (phase === "pending_after_adjustment") {
        const lr =
          "lockedRemark" in entry && typeof entry.lockedRemark === "string"
            ? entry.lockedRemark
            : "";
        next[id] = {
          phase: "pending_after_adjustment",
          displayRemark: lr,
        };
      } else if (phase === "adjustment") {
        const remark =
          "remark" in entry && typeof entry.remark === "string" ? entry.remark : "";
        next[id] = { phase: "adjustment", remark };
      } else if (phase === "pending") {
        next[id] = { phase: "pending" };
      } else {
        next[id] = { phase: "pending" };
      }
    }
    return next;
  }

  const draft = wr?.draft?.blocks ?? application.data.r2ReviewDraft?.blocks;
  if (draft) {
    const next: Record<ReviewWorkspaceBlockId, ReviewBlockPhase> = {
      ...INITIAL_REVIEW_BLOCK_PHASES,
    };
    for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
      const entry = draft[id];
      if (!entry || typeof entry !== "object" || !("phase" in entry)) continue;
      const phase = entry.phase;
      if (phase === "pending") next[id] = { phase: "pending" };
      else if (phase === "confirmed") next[id] = { phase: "confirmed" };
      else if (phase === "pending_after_adjustment") {
        const lr =
          "lockedRemark" in entry && typeof entry.lockedRemark === "string"
            ? entry.lockedRemark
            : "";
        next[id] = {
          phase: "pending_after_adjustment",
          displayRemark: lr,
        };
      } else if (phase === "adjustment") {
        const remark =
          "remark" in entry && typeof entry.remark === "string" ? entry.remark : "";
        next[id] = { phase: "adjustment", remark };
      } else {
        next[id] = { phase: "pending" };
      }
    }
    return next;
  }

  return INITIAL_REVIEW_BLOCK_PHASES;
}

function hydrateSavedCommentsFromApplication(
  application: WorkspaceApplication,
): SavedReviewComment[] {
  const wr = application.data.recommendation?.workspaceReview;
  if (wr?.postSubmit || application.data.r2PostSubmitReview) {
    const list =
      wr?.forwardedComments ?? application.data.reviewComments ?? [];
    return list.map((c) => ({
      id: c.id,
      blockId: c.blockId,
      blockTitle: c.blockTitle,
      body: c.body,
      createdAt: safeIsoMs(c.createdAt),
      authorDisplayName: c.authorDisplayName,
    }));
  }

  const draftList = wr?.draft?.reviewComments ?? application.data.r2ReviewDraft?.reviewComments;
  const list =
    draftList && draftList.length > 0
      ? draftList
      : (application.data.reviewComments ?? []);

  return list.map((c) => ({
    id: c.id,
    blockId: c.blockId,
    blockTitle: c.blockTitle,
    body: c.body,
    createdAt: safeIsoMs(c.createdAt),
    authorDisplayName: c.authorDisplayName,
  }));
}

function draftBlocksFromPhases(
  phases: Record<ReviewWorkspaceBlockId, ReviewBlockPhase>,
): Record<ReviewWorkspaceBlockId, R2ReviewDraftBlock> {
  const blocks = {} as Record<ReviewWorkspaceBlockId, R2ReviewDraftBlock>;
  for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
    const p = phases[id];
    if (p.phase === "pending") {
      blocks[id] = { phase: "pending" };
    } else if (p.phase === "confirmed") {
      blocks[id] = { phase: "confirmed" };
    } else if (p.phase === "pending_after_adjustment") {
      blocks[id] = {
        phase: "pending_after_adjustment",
        lockedRemark: p.displayRemark,
      };
    } else {
      blocks[id] = { phase: "adjustment", remark: p.remark };
    }
  }
  return blocks;
}

/** Nur sichtbare Blöcke müssen bearbeitet sein (sonst bleibt der CTA fälschlich deaktiviert). */
function reviewBlocksCompleteVisible(
  phases: Record<ReviewWorkspaceBlockId, ReviewBlockPhase>,
  visibility: Record<ReviewWorkspaceBlockId, boolean>,
): boolean {
  return REVIEW_WORKSPACE_BLOCK_IDS.every((id) => {
    if (!visibility[id]) return true;
    const p = phases[id];
    return p.phase === "confirmed" || p.phase === "adjustment";
  });
}

/**
 * Vollständiges Snapshot für Weiterreichung: jeder Block ist `confirmed` oder
 * `adjustment`. Ausgeblendete Blöcke, die intern noch `pending` sind, werden
 * als bestätigt mitgegeben (siehe `reviewBlocksCompleteVisible`).
 */
function snapshotBlocksForForwardPostSubmit(
  phases: Record<ReviewWorkspaceBlockId, ReviewBlockPhase>,
): Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot> {
  const out = {} as Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot>;
  for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
    const p = phases[id];
    if (p.phase === "adjustment") {
      out[id] = { phase: "adjustment", remark: p.remark };
    } else if (p.phase === "pending_after_adjustment") {
      out[id] = {
        phase: "pending_after_adjustment",
        lockedRemark: p.displayRemark,
      };
    } else if (p.phase === "confirmed") {
      out[id] = { phase: "confirmed" };
    } else {
      out[id] = { phase: "confirmed" };
    }
  }
  return out;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAnyValue(values: unknown[]): boolean {
  return values.some((value) =>
    Array.isArray(value) ? value.length > 0 : hasText(value),
  );
}

function normalizeList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((v) => v.trim()).filter(Boolean))].sort();
}

function blockHasReReviewBaseline(
  blockId: ReviewWorkspaceBlockId,
  baselines: Partial<Record<ReviewWorkspaceBlockId, R1AdjustmentBlockBaseline>>,
): boolean {
  return Boolean(baselines[blockId]);
}

function computeReReviewAdjustedScopeOptions(
  baseline: string[] | undefined,
  current: string[] | undefined,
): Set<string> {
  const base = new Set(normalizeList(baseline));
  const adjusted = new Set<string>();
  for (const option of normalizeList(current)) {
    if (!base.has(option)) adjusted.add(option);
  }
  return adjusted;
}

function computeReReviewAdjustedMeasureKeys(
  baseline: string[] | undefined,
  current: string[] | undefined,
): Set<string> {
  const base = new Set(baseline ?? []);
  const adjusted = new Set<string>();
  for (const key of current ?? []) {
    if (!base.has(key)) adjusted.add(key);
  }
  return adjusted;
}

function computeReReviewAdjustedOtherIndices(
  baselineLines: string[] | undefined,
  currentLines: string[] | undefined,
): Set<number> {
  const base = normalizeList(baselineLines);
  const current = (currentLines ?? []).map((t) => t.trim());
  const adjusted = new Set<number>();
  current.forEach((line, idx) => {
    if (line && !base.includes(line)) adjusted.add(idx);
  });
  return adjusted;
}

type ReReviewBlockPresentation = {
  durationAdjusted: boolean;
  scopeAdjusted: Set<string>;
  lectureMeasureKeysAdjusted: Set<string>;
  lectureOtherIndicesAdjusted: Set<number>;
  assessmentMeasureKeysAdjusted: Set<string>;
  assessmentOtherIndicesAdjusted: Set<number>;
};

function computeReReviewPresentation(
  blockId: ReviewWorkspaceBlockId,
  application: WorkspaceApplication,
): ReReviewBlockPresentation | null {
  const baselines = readR1AdjustmentBlockBaselines(application.data);
  const baseline = baselines[blockId];
  if (!baseline) return null;

  const def = application.data.applicationDefinition;
  const baseDef = baseline.applicationDefinition;
  const empty: ReReviewBlockPresentation = {
    durationAdjusted: false,
    scopeAdjusted: new Set(),
    lectureMeasureKeysAdjusted: new Set(),
    lectureOtherIndicesAdjusted: new Set(),
    assessmentMeasureKeysAdjusted: new Set(),
    assessmentOtherIndicesAdjusted: new Set(),
  };

  if (blockId === "duration" && baseDef) {
    return {
      ...empty,
      durationAdjusted: baseDef.duration !== def?.duration,
    };
  }

  if (blockId === "scope" && baseDef) {
    return {
      ...empty,
      scopeAdjusted: computeReReviewAdjustedScopeOptions(
        baseDef.scopeSelections,
        def?.scopeSelections,
      ),
    };
  }

  if (blockId === "lectureMeasures" && baseDef) {
    return {
      ...empty,
      lectureMeasureKeysAdjusted: computeReReviewAdjustedMeasureKeys(
        baseDef.lectureMeasures,
        def?.lectureMeasures,
      ),
      lectureOtherIndicesAdjusted: computeReReviewAdjustedOtherIndices(
        baseDef.lectureOtherLines,
        def?.lectureOtherLines,
      ),
    };
  }

  if (blockId === "assessmentMeasures" && baseDef) {
    return {
      ...empty,
      assessmentMeasureKeysAdjusted: computeReReviewAdjustedMeasureKeys(
        baseDef.assessmentMeasures,
        def?.assessmentMeasures,
      ),
      assessmentOtherIndicesAdjusted: computeReReviewAdjustedOtherIndices(
        baseDef.assessmentOtherLines,
        def?.assessmentOtherLines,
      ),
    };
  }

  return empty;
}

export type WorkspaceReviewViewMode =
  | "interactive"
  | "readonly_consultation"
  | "readonly_decision"
  | "readonly_adjustment_pending";

type WorkspaceApplicationReviewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
  /** Nur-Lese-Modi für andere Kanon-States (z. B. Entscheid, ausstehende Anpassung). */
  viewMode?: WorkspaceReviewViewMode;
  /** Optional: nach persistierender Aktion (z. B. Refresh der Antragsliste). */
  onPersisted?: () => void;
  /** Optionaler CTA unterhalb der Blocks, z. B. Beratung durchgeführt. */
  bottomAction?: ReactNode;
  /** Eingeloggte Workspace-Rolle (R2, R4, R2R4, …) — für «Zugewiesen an». */
  workspaceRole: UserRole;
  /**
   * Status-Labels: R4-Audience nur wenn reine R4-Rolle oder R2R4 in Entscheid.
   * Optional überschreiben; sonst aus `workspaceRole` + Antrag abgeleitet.
   */
  workspaceViewerRole?: "R2" | "R4";
};

export function WorkspaceApplicationReview({
  application,
  reviewerDisplayName,
  viewMode = "interactive",
  onPersisted,
  bottomAction,
  workspaceRole,
  workspaceViewerRole: workspaceViewerRoleProp,
}: WorkspaceApplicationReviewProps) {
  const readOnly = viewMode !== "interactive";
  const compactReadOnlyBlocks = viewMode === "readonly_consultation";
  const data = application.data;
  const workspaceViewerRole =
    workspaceViewerRoleProp
    ?? statusAudienceForWorkspaceApplication(workspaceRole, application);
  const statusAudience: StatusAudience = workspaceViewerRole;
  const statusMeta = getApplicationStatusMeta(application, statusAudience);
  const r4ReadOnlyCopy = workspaceViewerRole === "R4";
  const showConsultationAppointment =
    statusMeta.canonicalState === "consultation_recommendation"
    && !hasText(data.recommendation?.releasedHtml);
  const consultationAppointment = useMemo(
    () =>
      showConsultationAppointment
        ? resolveWorkspaceConsultationAppointment(application)
        : null,
    [application, showConsultationAppointment],
  );
  const submittedAtLabel = formatReviewSubmittedAt(data);
  const def = data.applicationDefinition;
  const supabase = useMemo(() => createClient(), []);

  const showApplicantBlock =
    !compactReadOnlyBlocks
    || hasAnyValue([
      data.personalData?.vorname,
      data.personalData?.name,
      data.personalData?.email,
      data.personalData?.phone,
      data.personalData?.matrikel,
      data.personalData?.studiengang,
      data.personalData?.semester,
    ]);
  const showAttestBlock =
    !compactReadOnlyBlocks || Boolean(data.attestFiles?.length);
  const showReleasedRecommendationBlock = hasText(
    data.recommendation?.releasedHtml,
  );
  const showDefinitionBlock =
    !compactReadOnlyBlocks || hasText(def?.situationDescription);
  const showDurationBlock = !compactReadOnlyBlocks || Boolean(def?.duration);
  const showScopeBlock =
    !compactReadOnlyBlocks || Boolean(def?.scopeSelections?.length);
  const showLectureMeasuresBlock =
    !compactReadOnlyBlocks
    || Boolean(def?.lectureMeasures?.length)
    || Boolean(def?.lectureMeasuresKeine)
    || definitionShowsLectureCustomMeasures(def);
  const showAssessmentMeasuresBlock =
    !compactReadOnlyBlocks
    || Boolean(def?.assessmentMeasures?.length)
    || Boolean(def?.assessmentMeasuresKeine)
    || definitionShowsAssessmentCustomMeasures(def);
  const hasVisibleBlocks =
    showApplicantBlock
    || showAttestBlock
    || showReleasedRecommendationBlock
    || showDefinitionBlock
    || showDurationBlock
    || showScopeBlock
    || showLectureMeasuresBlock
    || showAssessmentMeasuresBlock;

  const [blockPhases, setBlockPhases] = useState<
    Record<ReviewWorkspaceBlockId, ReviewBlockPhase>
  >(() => hydrateBlockPhasesFromApplication(application));

  const [pendingComposer, setPendingComposer] = useState<{
    blockId: ReviewWorkspaceBlockId;
    blockTitle: string;
    draft: string;
  } | null>(null);
  const [adjustmentRemarkSaveError, setAdjustmentRemarkSaveError] = useState(false);
  const [savedReviewComments, setSavedReviewComments] = useState<
    SavedReviewComment[]
  >(() => hydrateSavedCommentsFromApplication(application));
  const [adjustmentResetDialogBlockId, setAdjustmentResetDialogBlockId] =
    useState<ReviewWorkspaceBlockId | null>(null);
  const [forwardError, setForwardError] = useState<string | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const [draftPersistError, setDraftPersistError] = useState<string | null>(null);
  const r1AdjustmentBaselines = useMemo(
    () => readR1AdjustmentBlockBaselines(application.data),
    [application.data],
  );
  const reReviewPresentationByBlock = useMemo(
    () =>
      Object.fromEntries(
        REVIEW_WORKSPACE_BLOCK_IDS.map((id) => [
          id,
          computeReReviewPresentation(id, application),
        ]),
      ) as Record<ReviewWorkspaceBlockId, ReReviewBlockPresentation | null>,
    [application],
  );

  const reReviewRemarksRef = useRef<Partial<Record<ReviewWorkspaceBlockId, string>>>(
    {},
  );
  const [adjustmentHistoryViewByBlock, setAdjustmentHistoryViewByBlock] = useState<
    Partial<Record<ReviewWorkspaceBlockId, ReviewBlockAdjustmentHistoryView>>
  >({});

  const applicationRef = useRef(application);
  const blockPhasesRef = useRef(blockPhases);
  const savedReviewCommentsRef = useRef(savedReviewComments);
  const readOnlyRef = useRef(readOnly);
  const isForwardingRef = useRef(isForwarding);
  /** Blockiert Draft-Speicher nach Start „Weiterreichen“, bis neue Props da sind (Race mit Debounce-Timer). */
  const suppressDraftSaveRef = useRef(false);

  useLayoutEffect(() => {
    applicationRef.current = application;
    blockPhasesRef.current = blockPhases;
    savedReviewCommentsRef.current = savedReviewComments;
    readOnlyRef.current = readOnly;
    isForwardingRef.current = isForwarding;
  }, [
    application,
    blockPhases,
    savedReviewComments,
    readOnly,
    isForwarding,
  ]);

  const blockVisibility = useMemo(
    () =>
      ({
        applicant: showApplicantBlock,
        attest: showAttestBlock,
        definition: showDefinitionBlock,
        duration: showDurationBlock,
        scope: showScopeBlock,
        lectureMeasures: showLectureMeasuresBlock,
        assessmentMeasures: showAssessmentMeasuresBlock,
      }) satisfies Record<ReviewWorkspaceBlockId, boolean>,
    [
      showApplicantBlock,
      showAttestBlock,
      showDefinitionBlock,
      showDurationBlock,
      showScopeBlock,
      showLectureMeasuresBlock,
      showAssessmentMeasuresBlock,
    ],
  );

  const allReviewBlocksDone = useMemo(
    () => reviewBlocksCompleteVisible(blockPhases, blockVisibility),
    [blockPhases, blockVisibility],
  );

  const forwardCtaHasAdjustment = useMemo(
    () =>
      REVIEW_WORKSPACE_BLOCK_IDS.some((id) => blockPhases[id].phase === "adjustment"),
    [blockPhases],
  );

  useEffect(() => {
    if (application.status !== "in_review") {
      suppressDraftSaveRef.current = false;
    }
  }, [application.status]);

  const postSubmitHydrationKey =
    workspaceReviewPostSubmitHydrationKey(application);
  const prevPostSubmitHydrationKeyRef = useRef(postSubmitHydrationKey);

  useEffect(() => {
    if (prevPostSubmitHydrationKeyRef.current === postSubmitHydrationKey) {
      return;
    }
    prevPostSubmitHydrationKeyRef.current = postSubmitHydrationKey;
    const hydratedPhases = hydrateBlockPhasesFromApplication(application);
    setBlockPhases(hydratedPhases);
    setSavedReviewComments(hydrateSavedCommentsFromApplication(application));
    setAdjustmentHistoryViewByBlock({});
    for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
      const p = hydratedPhases[id];
      if (p.phase === "pending_after_adjustment") {
        reReviewRemarksRef.current[id] = p.displayRemark;
      }
    }
    suppressDraftSaveRef.current = false;
  }, [application, postSubmitHydrationKey]);

  useEffect(() => {
    for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
      const p = blockPhases[id];
      if (p.phase === "pending_after_adjustment") {
        reReviewRemarksRef.current[id] = p.displayRemark;
      }
    }
  }, [blockPhases]);

  const persistReviewDraft = useCallback(async () => {
    const app = applicationRef.current;
    if (suppressDraftSaveRef.current) return;
    if (readOnlyRef.current) return;
    if (app.status !== "in_review") return;
    if (isForwardingRef.current) return;

    const draftPayload: R2ReviewDraft = {
      updatedAt: new Date().toISOString(),
      blocks: draftBlocksFromPhases(blockPhasesRef.current),
      reviewComments: savedReviewCommentsRef.current.map((c) => ({
        id: c.id,
        blockId: c.blockId,
        blockTitle: c.blockTitle,
        body: c.body,
        createdAt: new Date(c.createdAt).toISOString(),
        ...(c.authorDisplayName?.trim()
          ? { authorDisplayName: c.authorDisplayName.trim() }
          : {}),
      })),
    };

    const base = dataWithoutLegacyReviewRoots(app.data);
    const { error } = await supabase
      .from("applications")
      .update({
        data: {
          ...base,
          recommendation: {
            ...app.data.recommendation,
            workspaceReview: {
              ...app.data.recommendation?.workspaceReview,
              draft: draftPayload,
            },
          },
        },
      })
      .eq("id", app.id);

    if (error) {
      console.warn("[r2-review-draft]", error.message);
      setDraftPersistError(error.message);
      return;
    }
    setDraftPersistError(null);
    /* Listen-Refresh über Supabase Realtime im Parent — kein onPersisted hier (vermeidet Doppel-GET + Re-Render-Loop). */
  }, [supabase]);

  useEffect(() => {
    if (readOnly || application.status !== "in_review") return;

    const timer = window.setTimeout(() => {
      void persistReviewDraft();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    blockPhases,
    savedReviewComments,
    readOnly,
    application.status,
    application.id,
    persistReviewDraft,
  ]);

  const onPersistedRef = useRef(onPersisted);
  onPersistedRef.current = onPersisted;

  const openAdjustmentComposer = (
    blockId: ReviewWorkspaceBlockId,
    blockTitle: string,
    initialDraft = "",
  ) => {
    setAdjustmentRemarkSaveError(false);
    setPendingComposer({ blockId, blockTitle, draft: initialDraft });
  };

  const requestAdjustmentForBlock = useCallback(
    (blockId: ReviewWorkspaceBlockId, blockTitle: string) => {
      const ph = blockPhases[blockId];
      if (ph.phase === "adjustment") {
        openAdjustmentComposer(blockId, blockTitle, ph.remark);
      } else {
        openAdjustmentComposer(blockId, blockTitle);
      }
    },
    [blockPhases],
  );

  const handleSaveAdjustmentFromSidebar = useCallback((draftOverride?: string) => {
    setPendingComposer((composer) => {
      if (!composer) return null;
      const trimmed = (draftOverride ?? composer.draft).trim();
      if (!trimmed) {
        setAdjustmentRemarkSaveError(true);
        return composer;
      }
      setAdjustmentRemarkSaveError(false);
      setBlockPhases((prev) => ({
        ...prev,
        [composer.blockId]: { phase: "adjustment", remark: trimmed },
      }));
      setAdjustmentHistoryViewByBlock((prev) => {
        const next = { ...prev };
        delete next[composer.blockId];
        return next;
      });
      setSavedReviewComments((prev) => [
        {
          id: crypto.randomUUID(),
          blockId: composer.blockId,
          blockTitle: composer.blockTitle,
          body: trimmed,
          createdAt: Date.now(),
          authorDisplayName: reviewerDisplayName.trim() || undefined,
        },
        ...prev.filter((c) => c.blockId !== composer.blockId),
      ]);
      return null;
    });
  }, [reviewerDisplayName]);

  const blockComposerHandlers = useMemo(
    () => ({
      onDraftChange: (value: string) => {
        setPendingComposer((prev) => (prev ? { ...prev, draft: value } : null));
        setAdjustmentRemarkSaveError((err) => (err && value.trim() ? false : err));
      },
      onCancel: () => {
        setPendingComposer(null);
        setAdjustmentRemarkSaveError(false);
      },
      onSave: (draft: string) => handleSaveAdjustmentFromSidebar(draft),
      saveError: adjustmentRemarkSaveError,
    }),
    [adjustmentRemarkSaveError, handleSaveAdjustmentFromSidebar],
  );

  /** Nach Weiterleitung an R1 (`readonly_adjustment_pending` / andere read-only Modi). */
  const adjustmentSentReadOnly = readOnly;

  const canRestoreReReviewBlock = useCallback((id: ReviewWorkspaceBlockId) => {
    return Boolean(reReviewRemarksRef.current[id]?.trim());
  }, []);

  const restoreReReviewBlock = useCallback((id: ReviewWorkspaceBlockId) => {
    const remark = reReviewRemarksRef.current[id]?.trim() ?? "";
    setBlockPhases((prev) => ({
      ...prev,
      [id]: { phase: "pending_after_adjustment", displayRemark: remark },
    }));
    setAdjustmentHistoryViewByBlock((prev) => ({ ...prev, [id]: "current" }));
    setSavedReviewComments((prev) => prev.filter((c) => c.blockId !== id));
    setPendingComposer((prev) => (prev?.blockId === id ? null : prev));
    setAdjustmentRemarkSaveError(false);
  }, []);

  const resetBlock = (id: ReviewWorkspaceBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "pending" } }));
    setAdjustmentHistoryViewByBlock((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const confirmBlock = (id: ReviewWorkspaceBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "confirmed" } }));
    setAdjustmentHistoryViewByBlock((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetRequest = (id: ReviewWorkspaceBlockId) => {
    const phase = blockPhases[id];
    if (phase.phase === "adjustment") {
      setAdjustmentResetDialogBlockId(id);
      return;
    }
    if (phase.phase === "confirmed" && canRestoreReReviewBlock(id)) {
      restoreReReviewBlock(id);
      return;
    }
    resetBlock(id);
  };

  const confirmWithdrawAdjustment = () => {
    const id = adjustmentResetDialogBlockId;
    if (!id) return;
    if (canRestoreReReviewBlock(id)) {
      restoreReReviewBlock(id);
    } else {
      resetBlock(id);
      setSavedReviewComments((prev) => prev.filter((c) => c.blockId !== id));
    }
    setPendingComposer((prev) => (prev?.blockId === id ? null : prev));
    setAdjustmentRemarkSaveError(false);
    setAdjustmentResetDialogBlockId(null);
  };

  const reviewBlockBaselineContent = useMemo(() => {
    const out: Partial<Record<ReviewWorkspaceBlockId, ReactNode>> = {};
    for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
      const baseline = r1AdjustmentBaselines[id];
      if (!baseline) continue;
      const slice = applyBaselineToData(application.data, id, baseline);
      const sliceDef = slice.applicationDefinition;

      switch (id) {
        case "applicant": {
          const personal = slice.personalData;
          out[id] = personal ? (
            <ReviewBlockFieldGrid>
              <ReviewField
                label="Name"
                value={`${personal.vorname ?? ""} ${personal.name ?? ""}`.trim() || "—"}
              />
              <ReviewField
                label="Matrikelnummer"
                value={personal.matrikel ?? "—"}
              />
              <ReviewField
                label="Studiengang"
                value={personal.studiengang ?? "—"}
              />
              <ReviewField
                label="Semester"
                value={personal.semester ?? "—"}
              />
              <ReviewField label="E-Mail" value={personal.email ?? "—"} />
              <ReviewField
                label="Telefonnummer"
                value={personal.phone ?? "—"}
              />
            </ReviewBlockFieldGrid>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
          );
          break;
        }
        case "attest":
          out[id] = slice.attestFiles?.length ? (
            <ul className="space-y-3">
              {slice.attestFiles.map((file) => {
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
          );
          break;
        case "definition":
          out[id] = (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {sliceDef?.situationDescription?.trim()
                ? sliceDef.situationDescription
                : "Keine Beschreibung hinterlegt."}
            </p>
          );
          break;
        case "duration":
          out[id] = (
            <DurationChoiceCompare
              selected={sliceDef?.duration}
              readonlyMode="reReviewHistory"
            />
          );
          break;
        case "scope":
          out[id] = (
            <ScopeChecklist
              selected={sliceDef?.scopeSelections ?? []}
              readonlyMode="reReviewHistory"
            />
          );
          break;
        case "lectureMeasures":
          out[id] = (
            <MeasureChecklist
              options={LECTURE_MEASURE_OPTIONS}
              selectedKeys={sliceDef?.lectureMeasures ?? []}
              otherLines={sliceDef?.lectureOtherLines}
              otherEnabled={sliceDef?.lectureOtherEnabled}
              otherText={sliceDef?.lectureOtherText}
              measuresKeine={Boolean(sliceDef?.lectureMeasuresKeine)}
              keineDescription={LECTURE_MEASURES_KEINE_DESCRIPTION}
              readonlyMode="reReviewHistory"
            />
          );
          break;
        case "assessmentMeasures":
          out[id] = (
            <MeasureChecklist
              options={ASSESSMENT_MEASURE_OPTIONS}
              selectedKeys={sliceDef?.assessmentMeasures ?? []}
              otherLines={sliceDef?.assessmentOtherLines}
              otherEnabled={sliceDef?.assessmentOtherEnabled}
              otherText={sliceDef?.assessmentOtherText}
              measuresKeine={Boolean(sliceDef?.assessmentMeasuresKeine)}
              keineDescription={ASSESSMENT_MEASURES_KEINE_DESCRIPTION}
              readonlyMode="reReviewHistory"
            />
          );
          break;
        default:
          break;
      }
    }
    return out;
  }, [application.data, r1AdjustmentBaselines]);

  const reReviewHistoryForBlock = useCallback(
    (blockId: ReviewWorkspaceBlockId) => {
      const phase = blockPhases[blockId];
      if (phase.phase !== "pending_after_adjustment") return undefined;

      const baselineContent = reviewBlockBaselineContent[blockId];
      const hasBaseline = blockHasReReviewBaseline(blockId, r1AdjustmentBaselines);
      if (!hasBaseline && !phase.displayRemark.trim()) return undefined;

      return {
        lockedRemark: phase.displayRemark,
        baselineContent:
          baselineContent ?? (
            <p className="text-sm text-muted-foreground">
              Die ursprüngliche Einreichung ist für diesen Block nicht verfügbar.
            </p>
          ),
        view: adjustmentHistoryViewByBlock[blockId] ?? "current",
        onViewChange: (view: ReviewBlockAdjustmentHistoryView) => {
          setAdjustmentHistoryViewByBlock((prev) => ({ ...prev, [blockId]: view }));
        },
      };
    },
    [
      blockPhases,
      r1AdjustmentBaselines,
      reviewBlockBaselineContent,
      adjustmentHistoryViewByBlock,
    ],
  );

  /**
   * Klick auf einen gespeicherten Kommentar in der Sidebar springt zum
   * passenden Review-Block — gleiche Anker-IDs wie im R1-Antragsformular.
   */
  const navigateFromSavedComment = useCallback((blockId: string) => {
    const id = blockId as ReviewWorkspaceBlockId;
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(reviewWorkspaceAnchorId(id))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  const handleForwardReview = async () => {
    if (readOnly) return;
    if (!allReviewBlocksDone) {
      setForwardError(
        "Bitte bestätigen Sie jeden angezeigten Block oder fordern Sie eine Anpassung an.",
      );
      return;
    }
    setForwardError(null);
    suppressDraftSaveRef.current = true;
    setIsForwarding(true);

    const hasAdjustment = REVIEW_WORKSPACE_BLOCK_IDS.some(
      (id) => blockPhases[id].phase === "adjustment",
    );
    /** Postgres-Enum: typisch `needs_correction` statt `needs_adjustment`; „In Entscheidung“ = `in_implementation` (nicht `in_decision`). */
    const nextStatus: ApplicationStatus = hasAdjustment
      ? "needs_correction"
      : "in_implementation";
    const forwardedAt = new Date().toISOString();
    const r2PostSubmitReview: R2PostSubmitReview = {
      forwardedAt,
      blocks: snapshotBlocksForForwardPostSubmit(blockPhases),
    };
    const persistedReviewComments = savedReviewComments.map((c) => ({
      id: c.id,
      blockId: c.blockId,
      blockTitle: c.blockTitle,
      body: c.body,
      createdAt: new Date(c.createdAt).toISOString(),
      ...(c.authorDisplayName?.trim()
        ? { authorDisplayName: c.authorDisplayName.trim() }
        : {}),
    }));

    const workspaceReview: RecommendationWorkspaceReview = {
      postSubmit: r2PostSubmitReview,
      forwardedComments: persistedReviewComments,
    };

    const res = await fetch("/api/applications/review-forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        applicationId: application.id,
        nextStatus,
        workspaceReview,
      }),
    });

    let payload: { error?: string } = {};
    try {
      payload = (await res.json()) as { error?: string };
    } catch {
      /* ignore */
    }

    setIsForwarding(false);
    if (!res.ok) {
      suppressDraftSaveRef.current = false;
      setForwardError(
        typeof payload.error === "string"
          ? payload.error
          : `Anfrage fehlgeschlagen (${res.status})`,
      );
      return;
    }
    await broadcastApplicationRowUpdated(supabase, application.id);
    onPersistedRef.current?.();
  };

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
        viewMode,
        readOnly ? "1" : "0",
        pendingComposer?.blockId ?? "",
        pendingComposer?.draft ?? "",
        adjustmentRemarkSaveError ? "1" : "0",
        savedReviewComments.map((c) => `${c.id}:${c.createdAt}`).join(","),
      ].join("\u001e"),
    [
      application.id,
      application.updated_at,
      statusMeta.canonicalState,
      statusMeta.label,
      viewMode,
      readOnly,
      pendingComposer?.blockId,
      pendingComposer?.draft,
      adjustmentRemarkSaveError,
      savedReviewComments,
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
        savedReviewComments={savedReviewComments}
        onSavedCommentNavigate={navigateFromSavedComment}
        showCommentsSection={
          workspaceViewerRole !== "R4" && viewMode !== "readonly_consultation"
        }
        secondarySection={workspaceViewerRole === "R4" ? "r4_contacts" : "comments"}
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
          {showConsultationAppointment ? (
            <div className="flex flex-col gap-6">
              <ApplicationStatusCallout
                badgeClassName={statusMeta.className}
                muted={r4ReadOnlyCopy}
                icon={CircleAlert}
              >
                {r4ReadOnlyCopy ? (
                  <>
                    Sie sehen diese Angaben nur zur Information. Beratung und Empfehlungsschreiben
                    bearbeitet die Fachstelle.
                  </>
                ) : (
                  <>
                    Nach einem erfolgreich durchgeführten Beratungsgespräch ist ein Empfehlungsschreiben
                    zu verfassen. Sobald Sie dieses freigeben, wird der Antrag für die antragstellende
                    Person freigeschaltet.
                  </>
                )}
              </ApplicationStatusCallout>
              {consultationAppointment ? (
                <WorkspaceConsultationAppointmentCard appointment={consultationAppointment} />
              ) : null}
            </div>
          ) : null}
          {statusMeta.canonicalState === "consultation_recommendation"
          && hasText(data.recommendation?.releasedHtml) ? (
            <ApplicationStatusCallout
              badgeClassName={statusMeta.className}
              muted={r4ReadOnlyCopy}
              icon={Info}
            >
              {r4ReadOnlyCopy ? (
                <>
                  Sie sehen diese Angaben nur zur Information. Die weiteren Schritte bis zur
                  Einreichung führt die antragstellende Person aus.
                </>
              ) : (
                <>
                  Das Empfehlungsschreiben wurde verfasst und die Antragstellung für die antragstellende
                  Person freigeschaltet. Sie werden benachrichtigt, sobald der Antrag zur Prüfung
                  eingeht.
                </>
              )}
            </ApplicationStatusCallout>
          ) : null}
          {statusMeta.canonicalState === "in_review" ? (
            <ApplicationStatusCallout
              badgeClassName={statusMeta.className}
              muted={r4ReadOnlyCopy}
              icon={Info}
            >
              {r4ReadOnlyCopy ? (
                <>
                  Sie sehen diese Angaben nur zur Information. Prüfung, Review und Weiterleitung
                  obliegen der Fachstelle.
                </>
              ) : (
                <>
                  Überprüfen Sie die Angaben auf Inhalt & Vollständigkeit und leiten Sie den Antrag weiter oder
                  senden Sie ihn zur Nachbesserung zurück.
                </>
              )}
            </ApplicationStatusCallout>
          ) : null}
          {statusMeta.canonicalState === "needs_adjustment" ? (
            <ApplicationStatusCallout
              badgeClassName={statusMeta.className}
              muted={r4ReadOnlyCopy}
              icon={Info}
            >
              {r4ReadOnlyCopy ? (
                <>
                  Sie sehen diese Angaben nur zur Information. Nachbesserungen nimmt die
                  antragstellende Person vor.
                </>
              ) : (
                <>
                  Dieser Antrag wurde zur Anpassung an die antragstellende Person zurückgesendet.
                  Sie werden benachrichtigt, sobald die Anpassungen eingereicht wurden.
                </>
              )}
            </ApplicationStatusCallout>
          ) : null}
          {statusMeta.canonicalState === "in_decision" ? (
            <ApplicationStatusCallout
              badgeClassName={statusMeta.className}
              muted={r4ReadOnlyCopy}
              icon={Info}
            >
              {r4ReadOnlyCopy ? (
                <>
                  Sie sehen diese Angaben nur zur Information. Sobald die Fachstelle den Antrag in die
                  Entscheidung weitergeleitet hat und der Eintrag hier den Status «Entscheid
                  ausstehend» erreicht, stehen Ihnen die Bewilligungsfunktionen zur Verfügung.
                </>
              ) : (
                <>
                  Der Antrag wurde an die Entscheidungsinstanz weitergeleitet und kann nicht mehr
                  bearbeitet werden. Wird der Antrag bewilligt oder abgelehnt, werden Sie benachrichtigt.
                </>
              )}
            </ApplicationStatusCallout>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
        {!hasVisibleBlocks ? (
          <ReviewBlockCard title="Noch keine übermittelten Angaben" footer={null}>
            <p className="text-sm text-muted-foreground">
              Für diese Beratungsphase wurden noch keine Antragsblöcke
              übermittelt.
            </p>
          </ReviewBlockCard>
        ) : null}

        {/* Step „Persönliche Angaben“ ohne Antragsart (Figma: Antragsteller) */}
        {showApplicantBlock ? (
          <InteractiveReviewBlock
          blockId="applicant"
          composer={reviewBlockComposerProps(
            "applicant",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title={REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE}
          phase={blockPhases.applicant}
          onConfirm={() => confirmBlock("applicant")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock(
              "applicant",
              REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE,
            )}
          onReset={() => handleResetRequest("applicant")}
          reReviewHistory={
            pendingComposer?.blockId === "applicant"
              ? undefined
              : reReviewHistoryForBlock("applicant")
          }
        >
          {data.personalData ? (
            <ReviewBlockFieldGrid>
              <ReviewField
                label="Name"
                value={`${data.personalData.vorname ?? ""} ${data.personalData.name ?? ""}`.trim() || "—"}
              />
              <ReviewField
                label="Matrikelnummer"
                value={data.personalData.matrikel ?? "—"}
              />
              <ReviewField
                label="Studiengang"
                value={data.personalData.studiengang ?? "—"}
              />
              <ReviewField
                label="Semester"
                value={data.personalData.semester ?? "—"}
              />
              <ReviewField
                label="E-Mail"
                value={data.personalData.email ?? "—"}
              />
              <ReviewField
                label="Telefonnummer"
                value={data.personalData.phone ?? "—"}
              />
            </ReviewBlockFieldGrid>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
          )}
          </InteractiveReviewBlock>
        ) : null}

        {/* Fachärztliches Attest */}
        {showAttestBlock ? (
          <InteractiveReviewBlock
          blockId="attest"
          composer={reviewBlockComposerProps(
            "attest",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Fachärztliches Attest"
          phase={blockPhases.attest}
          onConfirm={() => confirmBlock("attest")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock("attest", "Fachärztliches Attest")}
          onReset={() => handleResetRequest("attest")}
          reReviewHistory={
            pendingComposer?.blockId === "attest"
              ? undefined
              : reReviewHistoryForBlock("attest")
          }
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
          </InteractiveReviewBlock>
        ) : null}

        {/* Empfehlungsschreiben — freigegebene Rich-Text-Variante als Accordion.
            Der frühere Legacy-Block (Datei-Kachel über `recommendation.url`) wurde
            entfernt; es existiert nur noch dieser eine Block-Pfad. */}
        {showReleasedRecommendationBlock ? (
          <RecommendationReleasedAccordion
            html={data.recommendation?.releasedHtml ?? ""}
            releasedAt={data.recommendation?.releasedAt}
            authorDisplayName={
              data.recommendation?.releasedBy?.trim()
              || "NTA Fachstelle"
            }
            applicationId={application.id}
          />
        ) : null}

        {/* Persönliche Situationsbeschreibung (Freitext) */}
        {showDefinitionBlock ? (
          <InteractiveReviewBlock
          blockId="definition"
          composer={reviewBlockComposerProps(
            "definition",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Persönliche Situationsbeschreibung"
          phase={blockPhases.definition}
          onConfirm={() => confirmBlock("definition")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock("definition", "Persönliche Situationsbeschreibung")}
          onReset={() => handleResetRequest("definition")}
          reReviewHistory={
            pendingComposer?.blockId === "definition"
              ? undefined
              : reReviewHistoryForBlock("definition")
          }
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {def?.situationDescription?.trim()
              ? def.situationDescription
              : "Keine Beschreibung hinterlegt."}
          </p>
          </InteractiveReviewBlock>
        ) : null}

        {/* Gültigkeitsdauer */}
        {showDurationBlock ? (
          <InteractiveReviewBlock
          blockId="duration"
          composer={reviewBlockComposerProps(
            "duration",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Gültigkeitsdauer des Nachteilsausgleiches"
          phase={blockPhases.duration}
          onConfirm={() => confirmBlock("duration")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock(
              "duration",
              "Gültigkeitsdauer des Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("duration")}
          reReviewHistory={
            pendingComposer?.blockId === "duration"
              ? undefined
              : reReviewHistoryForBlock("duration")
          }
        >
          <DurationChoiceCompare
            selected={def?.duration}
            reReviewAdjustedSelection={Boolean(
              reReviewPresentationByBlock.duration?.durationAdjusted,
            )}
          />
          </InteractiveReviewBlock>
        ) : null}

        {/* Geltungsbereich */}
        {showScopeBlock ? (
          <InteractiveReviewBlock
          blockId="scope"
          composer={reviewBlockComposerProps(
            "scope",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Geltungsbereich des beantragten Nachteilsausgleiches"
          phase={blockPhases.scope}
          onConfirm={() => confirmBlock("scope")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock(
              "scope",
              "Geltungsbereich des beantragten Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("scope")}
          reReviewHistory={
            pendingComposer?.blockId === "scope"
              ? undefined
              : reReviewHistoryForBlock("scope")
          }
        >
          <ScopeChecklist
            selected={def?.scopeSelections ?? []}
            reReviewAdjustedOptions={
              reReviewPresentationByBlock.scope?.scopeAdjusted
            }
          />
          </InteractiveReviewBlock>
        ) : null}

        {/* Lehrveranstaltungen */}
        {showLectureMeasuresBlock ? (
          <InteractiveReviewBlock
          blockId="lectureMeasures"
          composer={reviewBlockComposerProps(
            "lectureMeasures",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Ausgleichsmassnahmen für Lehrveranstaltungen"
          phase={blockPhases.lectureMeasures}
          onConfirm={() => confirmBlock("lectureMeasures")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock(
              "lectureMeasures",
              "Ausgleichsmassnahmen für Lehrveranstaltungen",
            )}
          onReset={() => handleResetRequest("lectureMeasures")}
          reReviewHistory={
            pendingComposer?.blockId === "lectureMeasures"
              ? undefined
              : reReviewHistoryForBlock("lectureMeasures")
          }
        >
          <MeasureChecklist
            options={LECTURE_MEASURE_OPTIONS}
            selectedKeys={def?.lectureMeasures ?? []}
            otherLines={def?.lectureOtherLines}
            otherEnabled={def?.lectureOtherEnabled}
            otherText={def?.lectureOtherText}
            measuresKeine={Boolean(def?.lectureMeasuresKeine)}
            keineDescription={LECTURE_MEASURES_KEINE_DESCRIPTION}
            reReviewAdjustedKeys={
              reReviewPresentationByBlock.lectureMeasures?.lectureMeasureKeysAdjusted
            }
            reReviewAdjustedOtherIndices={
              reReviewPresentationByBlock.lectureMeasures?.lectureOtherIndicesAdjusted
            }
          />
          </InteractiveReviewBlock>
        ) : null}

        {/* Leistungsnachweise */}
        {showAssessmentMeasuresBlock ? (
          <InteractiveReviewBlock
          blockId="assessmentMeasures"
          composer={reviewBlockComposerProps(
            "assessmentMeasures",
            pendingComposer,
            blockComposerHandlers,
          )}
          adjustmentSentReadOnly={adjustmentSentReadOnly}
          readOnly={readOnly}
          compactReadOnly={compactReadOnlyBlocks}
          title="Ausgleichsmassnahmen für Leistungsnachweise"
          phase={blockPhases.assessmentMeasures}
          onConfirm={() => confirmBlock("assessmentMeasures")}
          onRequestAdjustment={() =>
            requestAdjustmentForBlock(
              "assessmentMeasures",
              "Ausgleichsmassnahmen für Leistungsnachweise",
            )}
          onReset={() => handleResetRequest("assessmentMeasures")}
          reReviewHistory={
            pendingComposer?.blockId === "assessmentMeasures"
              ? undefined
              : reReviewHistoryForBlock("assessmentMeasures")
          }
        >
          <MeasureChecklist
            options={ASSESSMENT_MEASURE_OPTIONS}
            selectedKeys={def?.assessmentMeasures ?? []}
            otherLines={def?.assessmentOtherLines}
            otherEnabled={def?.assessmentOtherEnabled}
            otherText={def?.assessmentOtherText}
            measuresKeine={Boolean(def?.assessmentMeasuresKeine)}
            keineDescription={ASSESSMENT_MEASURES_KEINE_DESCRIPTION}
            reReviewAdjustedKeys={
              reReviewPresentationByBlock.assessmentMeasures
                ?.assessmentMeasureKeysAdjusted
            }
            reReviewAdjustedOtherIndices={
              reReviewPresentationByBlock.assessmentMeasures
                ?.assessmentOtherIndicesAdjusted
            }
          />
          </InteractiveReviewBlock>
        ) : null}

        {bottomAction ? (
          <div className="pt-2">{bottomAction}</div>
        ) : compactReadOnlyBlocks && showReleasedRecommendationBlock ? null : (
        <div className="flex w-full flex-col items-end gap-2 pt-2">
          {!readOnly ? (
            <Button
              type="button"
              className="h-11 w-fit gap-2 rounded-full bg-zinc-900 px-5 text-white hover:bg-zinc-800"
              disabled={!allReviewBlocksDone || isForwarding}
              onClick={() => void handleForwardReview()}
            >
              {isForwarding ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Wird weitergeleitet …
                </>
              ) : (
                <>
                  <Send className="size-4 shrink-0" aria-hidden />
                  {forwardCtaHasAdjustment
                    ? "Zur Anpassung zurücksenden"
                    : "An Entscheidungsinstanz weiterleiten"}
                </>
              )}
            </Button>
          ) : null}
          {draftPersistError && !readOnly ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Entwurf konnte nicht gespeichert werden: {draftPersistError}
            </p>
          ) : null}
          {!readOnly && forwardError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {forwardError}
            </p>
          ) : null}
        </div>
        )}
        </div>
      </div>

      <Dialog
        open={adjustmentResetDialogBlockId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setAdjustmentResetDialogBlockId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anpassung zurückziehen?</DialogTitle>
            <DialogDescription>
              Möchten Sie die angeforderte Anpassung für diesen Block wirklich
              zurückziehen? Der zugehörige Kommentar wird aus der Kommentarliste
              entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustmentResetDialogBlockId(null)}
            >
              Abbrechen
            </Button>
            <Button type="button" variant="destructive" onClick={confirmWithdrawAdjustment}>
              Zurückziehen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ReviewBlockComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSave: (draft: string) => void;
  saveError?: boolean;
};

type ReReviewHistoryConfig = {
  lockedRemark: string;
  baselineContent: ReactNode;
  view: ReviewBlockAdjustmentHistoryView;
  onViewChange: (view: ReviewBlockAdjustmentHistoryView) => void;
};

function InteractiveReviewBlock({
  blockId,
  title,
  phase,
  onConfirm,
  onRequestAdjustment,
  onReset,
  readOnly = false,
  compactReadOnly = false,
  adjustmentSentReadOnly = false,
  composer = null,
  children,
  reReviewHistory = undefined,
}: {
  blockId: ReviewWorkspaceBlockId;
  title: string;
  phase: ReviewBlockPhase;
  onConfirm: () => void;
  onRequestAdjustment: () => void;
  onReset: () => void;
  readOnly?: boolean;
  compactReadOnly?: boolean;
  /** Nach Weiterleitung an R1: Anpassungsblöcke nur noch «angefordert» (`5657:1673`). */
  adjustmentSentReadOnly?: boolean;
  /** Bemerkung im Block-Footer (`5641:22599`), nicht in der Sidebar. */
  composer?: ReviewBlockComposerProps | null;
  children: ReactNode;
  /** Re-Review nach R1-Freigabe: Toggle Aktuell/Verlauf (`6192:3831`, `6193:22249`). */
  reReviewHistory?: ReReviewHistoryConfig;
}) {
  const anchorId = reviewWorkspaceAnchorId(blockId);
  const historyToggle = reReviewHistory ? (
    <ReviewBlockAdjustmentHistoryToggle
      view={reReviewHistory.view}
      onViewChange={reReviewHistory.onViewChange}
    />
  ) : null;

  if (composer) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="composer"
        headerAction={historyToggle}
        footer={
          <ReviewBlockComposerFooter
            draft={composer.draft}
            onDraftChange={composer.onDraftChange}
            onCancel={composer.onCancel}
            onSave={composer.onSave}
            saveError={composer.saveError}
          />
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (phase.phase === "confirmed") {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="confirmed"
        headerAction={historyToggle}
        footer={
          <ReviewBlockConfirmedFooter onReset={onReset} readOnly={readOnly} />
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (phase.phase === "adjustment") {
    if (adjustmentSentReadOnly || readOnly) {
      return (
        <ReviewBlockCard
          anchorId={anchorId}
          title={title}
          variant="adjustment_sent"
          footer={<ReviewBlockAdjustmentSentFooter remark={phase.remark} />}
        >
          {children}
        </ReviewBlockCard>
      );
    }
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="adjustment_active"
        footer={
          <ReviewBlockAdjustmentActiveFooter
            remark={phase.remark}
            onReset={onReset}
            onEdit={onRequestAdjustment}
          />
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (phase.phase === "pending_after_adjustment") {
    const actionFooter =
      readOnly && compactReadOnly
        ? null
        : readOnly
          ? (
              <p className={REVIEW_BLOCK_READONLY_STATUS_FOOTER_CLASS}>Nur Ansicht.</p>
            )
          : (
              <ReviewBlockPendingFooter
                onRequestAdjustment={onRequestAdjustment}
                onConfirm={onConfirm}
              />
            );

    const showHistoryContent = reReviewHistory?.view === "history";
    const bodyContent =
      showHistoryContent && reReviewHistory
        ? reReviewHistory.baselineContent
        : children;

    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="pending"
        headerAction={historyToggle}
        footer={
          <>
            {showHistoryContent
            && reReviewHistory
            && reReviewHistory.lockedRemark.trim() ? (
              <ReviewBlockRequestedAdjustmentBand remark={reReviewHistory.lockedRemark} />
            ) : null}
            {actionFooter}
          </>
        }
      >
        {bodyContent}
      </ReviewBlockCard>
    );
  }

  return (
    <ReviewBlockCard
      anchorId={anchorId}
      title={title}
      variant="pending"
      headerAction={historyToggle}
      footer={
        readOnly && compactReadOnly ? null : readOnly ? (
          <p className={REVIEW_BLOCK_READONLY_STATUS_FOOTER_CLASS}>Nur Ansicht.</p>
        ) : (
          <ReviewBlockPendingFooter
            onRequestAdjustment={onRequestAdjustment}
            onConfirm={onConfirm}
          />
        )
      }
    >
      {children}
    </ReviewBlockCard>
  );
}

function reviewBlockComposerProps(
  blockId: ReviewWorkspaceBlockId,
  pendingComposer: {
    blockId: ReviewWorkspaceBlockId;
    draft: string;
  } | null,
  handlers: {
    onDraftChange: (value: string) => void;
    onCancel: () => void;
    onSave: (draft: string) => void;
    saveError: boolean;
  },
): ReviewBlockComposerProps | null {
  if (!pendingComposer || pendingComposer.blockId !== blockId) return null;
  return {
    draft: pendingComposer.draft,
    onDraftChange: handlers.onDraftChange,
    onCancel: handlers.onCancel,
    onSave: (draft: string) => handlers.onSave(draft),
    saveError: handlers.saveError,
  };
}
