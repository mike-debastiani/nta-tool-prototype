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
  Check,
  CheckCheck,
  Loader2,
  MessageSquarePlus,
  MessageSquareText,
  RotateCcw,
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
import {
  APPLICATION_MEASURE_OPTIONS,
  DurationChoiceCompare,
  MeasureChecklist,
  ReviewBlockCard,
  ReviewBlockFooterStatus,
  ReviewField,
  ReviewFileRow,
  ScopeChecklist,
  fileNameFromUrl,
  formatReviewFileSize,
  shortApplicationRef,
} from "@/components/domain/application-review-blocks";
import {
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
import { cn } from "@/lib/utils";
import {
  type ApplicationStatus,
  getApplicationStatusMeta,
} from "@/lib/application-status";

type ReviewBlockPhase =
  | { phase: "pending" }
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

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
      if (!entry) continue;
      if (entry.phase === "confirmed") {
        next[id] = { phase: "confirmed" };
      } else {
        next[id] = { phase: "adjustment", remark: entry.remark };
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
      if (!entry) continue;
      if (entry.phase === "pending") next[id] = { phase: "pending" };
      else if (entry.phase === "confirmed") next[id] = { phase: "confirmed" };
      else next[id] = { phase: "adjustment", remark: entry.remark };
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
      createdAt: new Date(c.createdAt).getTime(),
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
    createdAt: new Date(c.createdAt).getTime(),
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
    } else {
      blocks[id] = { phase: "adjustment", remark: p.remark };
    }
  }
  return blocks;
}

function reviewBlocksComplete(
  phases: Record<ReviewWorkspaceBlockId, ReviewBlockPhase>,
): boolean {
  return REVIEW_WORKSPACE_BLOCK_IDS.every((id) => {
    const p = phases[id];
    return p.phase === "confirmed" || p.phase === "adjustment";
  });
}

function snapshotBlocksFromPhases(
  phases: Record<ReviewWorkspaceBlockId, ReviewBlockPhase>,
): Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot> {
  const blocks = {} as Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot>;
  for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
    const p = phases[id];
    if (p.phase === "confirmed") {
      blocks[id] = { phase: "confirmed" };
    } else if (p.phase === "adjustment") {
      blocks[id] = { phase: "adjustment", remark: p.remark };
    }
  }
  return blocks;
}

export type WorkspaceReviewViewMode =
  | "interactive"
  | "readonly_decision"
  | "readonly_adjustment_pending";

type WorkspaceApplicationReviewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
  /** Nur-Lese-Modi für andere Kanon-States (z. B. Entscheid, ausstehende Anpassung). */
  viewMode?: WorkspaceReviewViewMode;
  /** Optional: nach persistierender Aktion (z. B. Refresh der Antragsliste). */
  onPersisted?: () => void;
};

export function WorkspaceApplicationReview({
  application,
  reviewerDisplayName,
  viewMode = "interactive",
  onPersisted,
}: WorkspaceApplicationReviewProps) {
  const readOnly = viewMode !== "interactive";
  const data = application.data;
  const statusMeta = getApplicationStatusMeta(application, "R2");
  const def = data.applicationDefinition;
  const supabase = useMemo(() => createClient(), []);

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

  const allReviewBlocksDone = reviewBlocksComplete(blockPhases);

  useEffect(() => {
    if (application.status !== "in_review") {
      suppressDraftSaveRef.current = false;
    }
  }, [application.status]);

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
    onPersisted?.();
  }, [supabase, onPersisted]);

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

  const openAdjustmentComposer = (blockId: ReviewWorkspaceBlockId, blockTitle: string) => {
    setAdjustmentRemarkSaveError(false);
    setPendingComposer({ blockId, blockTitle, draft: "" });
  };

  const handleSaveAdjustmentFromSidebar = () => {
    if (!pendingComposer) return;
    const trimmed = pendingComposer.draft.trim();
    if (!trimmed) {
      setAdjustmentRemarkSaveError(true);
      return;
    }
    adjustBlock(pendingComposer.blockId, trimmed);
    setSavedReviewComments((prev) => [
      {
        id: crypto.randomUUID(),
        blockId: pendingComposer.blockId,
        blockTitle: pendingComposer.blockTitle,
        body: trimmed,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setPendingComposer(null);
    setAdjustmentRemarkSaveError(false);
  };

  const confirmBlock = (id: ReviewWorkspaceBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "confirmed" } }));
  };

  const adjustBlock = (id: ReviewWorkspaceBlockId, remark: string) => {
    setBlockPhases((prev) => ({
      ...prev,
      [id]: { phase: "adjustment", remark },
    }));
  };

  const resetBlock = (id: ReviewWorkspaceBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "pending" } }));
  };

  const handleResetRequest = (id: ReviewWorkspaceBlockId) => {
    const phase = blockPhases[id];
    if (phase.phase === "adjustment") {
      setAdjustmentResetDialogBlockId(id);
      return;
    }
    resetBlock(id);
  };

  const confirmWithdrawAdjustment = () => {
    const id = adjustmentResetDialogBlockId;
    if (!id) return;
    resetBlock(id);
    setSavedReviewComments((prev) => prev.filter((c) => c.blockId !== id));
    setPendingComposer((prev) => (prev?.blockId === id ? null : prev));
    setAdjustmentRemarkSaveError(false);
    setAdjustmentResetDialogBlockId(null);
  };

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
    if (!allReviewBlocksDone || readOnly) return;
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
      blocks: snapshotBlocksFromPhases(blockPhases),
    };
    const persistedReviewComments = savedReviewComments.map((c) => ({
      id: c.id,
      blockId: c.blockId,
      blockTitle: c.blockTitle,
      body: c.body,
      createdAt: new Date(c.createdAt).toISOString(),
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
    onPersisted?.();
  };

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-row overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Antrag auf Nachteilsausgleich (NTA) – {shortApplicationRef(application.id)}
          </h1>
        </div>

        {/* Step „Persönliche Angaben“ ohne Antragsart (Figma: Antragsteller) */}
        <InteractiveReviewBlock
          blockId="applicant"
          readOnly={readOnly}
          title="Antragsteller"
          phase={blockPhases.applicant}
          onConfirm={() => confirmBlock("applicant")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("applicant", "Antragsteller")}
          onReset={() => handleResetRequest("applicant")}
        >
          {data.personalData ? (
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
          )}
        </InteractiveReviewBlock>

        {/* Fachärztliches Attest */}
        <InteractiveReviewBlock
          blockId="attest"
          readOnly={readOnly}
          title="Fachärztliches Attest"
          phase={blockPhases.attest}
          onConfirm={() => confirmBlock("attest")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("attest", "Fachärztliches Attest")}
          onReset={() => handleResetRequest("attest")}
        >
          {data.attestFiles?.length ? (
            <ul className="space-y-3">
              {data.attestFiles.map((file) => (
                <li key={file.id ?? file.name}>
                  <ReviewFileRow
                    title={file.name ?? "Datei"}
                    subtitle={formatReviewFileSize(file.size ?? 0)}
                    href="#"
                    onNavigate={(e) => e.preventDefault()}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Dateien hochgeladen.</p>
          )}
        </InteractiveReviewBlock>

        {/* Empfehlungsschreiben — gleiche Dateikachel wie Attest, ohne Aktionen */}
        <ReviewBlockCard title="Empfehlungsschreiben der Fachstelle" footer={null}>
          {data.recommendation?.url ? (
            <ul className="space-y-3">
              <li>
                <ReviewFileRow
                  title={fileNameFromUrl(data.recommendation.url)}
                  subtitle="Empfehlung der Fachstelle"
                  href={data.recommendation.url}
                />
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Empfehlungsschreiben hinterlegt.</p>
          )}
        </ReviewBlockCard>

        {/* Antragsdefinition (Freitext) */}
        <InteractiveReviewBlock
          blockId="definition"
          readOnly={readOnly}
          title="Antragsdefinition"
          phase={blockPhases.definition}
          onConfirm={() => confirmBlock("definition")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("definition", "Antragsdefinition")}
          onReset={() => handleResetRequest("definition")}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {def?.situationDescription?.trim()
              ? def.situationDescription
              : "Keine Beschreibung hinterlegt."}
          </p>
        </InteractiveReviewBlock>

        {/* Gültigkeitsdauer */}
        <InteractiveReviewBlock
          blockId="duration"
          readOnly={readOnly}
          title="Gültigkeitsdauer des Nachteilsausgleiches"
          phase={blockPhases.duration}
          onConfirm={() => confirmBlock("duration")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "duration",
              "Gültigkeitsdauer des Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("duration")}
        >
          <DurationChoiceCompare selected={def?.duration} />
        </InteractiveReviewBlock>

        {/* Geltungsbereich */}
        <InteractiveReviewBlock
          blockId="scope"
          readOnly={readOnly}
          title="Geltungsbereich des beantragten Nachteilsausgleiches"
          phase={blockPhases.scope}
          onConfirm={() => confirmBlock("scope")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "scope",
              "Geltungsbereich des beantragten Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("scope")}
        >
          <ScopeChecklist selected={def?.scopeSelections ?? []} />
        </InteractiveReviewBlock>

        {/* Lehrveranstaltungen */}
        <InteractiveReviewBlock
          blockId="lectureMeasures"
          readOnly={readOnly}
          title="Ausgleichsmassnahmen für Lehrveranstaltungen"
          phase={blockPhases.lectureMeasures}
          onConfirm={() => confirmBlock("lectureMeasures")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "lectureMeasures",
              "Ausgleichsmassnahmen für Lehrveranstaltungen",
            )}
          onReset={() => handleResetRequest("lectureMeasures")}
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.lectureMeasures ?? []}
            otherEnabled={def?.lectureOtherEnabled}
            otherText={def?.lectureOtherText}
          />
        </InteractiveReviewBlock>

        {/* Leistungsnachweise */}
        <InteractiveReviewBlock
          blockId="assessmentMeasures"
          readOnly={readOnly}
          title="Ausgleichsmassnahmen für Leistungsnachweise"
          phase={blockPhases.assessmentMeasures}
          onConfirm={() => confirmBlock("assessmentMeasures")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "assessmentMeasures",
              "Ausgleichsmassnahmen für Leistungsnachweise",
            )}
          onReset={() => handleResetRequest("assessmentMeasures")}
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.assessmentMeasures ?? []}
            otherEnabled={def?.assessmentOtherEnabled}
            otherText={def?.assessmentOtherText}
          />
        </InteractiveReviewBlock>

        <div className="pt-2">
          <Button
            type="button"
            className="h-11 w-full gap-2 bg-zinc-900 text-white hover:bg-zinc-800 sm:w-auto sm:min-w-[280px]"
            disabled={!allReviewBlocksDone || readOnly || isForwarding}
            onClick={() => void handleForwardReview()}
          >
            {isForwarding ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Wird weitergeleitet …
              </>
            ) : (
              "Antrag weiterreichen"
            )}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {readOnly
              ? viewMode === "readonly_decision"
                ? "Dieser Antrag liegt zur Entscheid vor; das Review ist abgeschlossen."
                : "Die Anpassungen wurden an die Studierendenperson weitergegeben. Sie können hier nichts mehr ändern."
              : "Sobald jeder Block bestätigt oder mit einem Anpassungskommentar versehen ist, können Sie den Antrag weiterreichen."}
          </p>
          {draftPersistError && !readOnly ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Entwurf konnte nicht gespeichert werden: {draftPersistError}
            </p>
          ) : null}
          {forwardError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {forwardError}
            </p>
          ) : null}
        </div>
        </div>
      </div>

      <aside className="flex h-full min-h-0 w-[366px] shrink-0 flex-col overflow-hidden border-l border-border bg-[#fafafa]">
        <ApplicationReviewDetailSidebar
          application={application}
          statusMeta={statusMeta}
          assignedReviewerLabel={reviewerDisplayName}
          adjustmentComposer={
            readOnly || !pendingComposer
              ? null
              : {
                  blockTitle: pendingComposer.blockTitle,
                  draft: pendingComposer.draft,
                  onDraftChange: (value) => {
                    setPendingComposer((prev) =>
                      prev ? { ...prev, draft: value } : null,
                    );
                    setAdjustmentRemarkSaveError((err) =>
                      err && value.trim() ? false : err,
                    );
                  },
                  onCancel: () => {
                    setPendingComposer(null);
                    setAdjustmentRemarkSaveError(false);
                  },
                  onSave: handleSaveAdjustmentFromSidebar,
                  saveError: adjustmentRemarkSaveError,
                }
          }
          savedReviewComments={savedReviewComments}
          onSavedCommentNavigate={navigateFromSavedComment}
        />
      </aside>

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

function ReviewBlockActions({
  onAdjust,
  onConfirm,
}: {
  onAdjust: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-9 gap-2 rounded-lg border-0 bg-amber-400 px-4 text-white shadow-xs",
          "hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500",
          "focus-visible:text-white focus-visible:ring-amber-400/45",
          "dark:bg-amber-400 dark:text-white dark:hover:text-white",
        )}
        onClick={onAdjust}
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        Anpassung anfordern
      </Button>
      <Button
        type="button"
        className="h-9 gap-2 bg-teal-600 text-white hover:bg-teal-700"
        onClick={onConfirm}
      >
        <Check className="size-4" aria-hidden />
        Bestätigen
      </Button>
    </>
  );
}

/** Ghost-Button auf farbigem Footer; gleiche Höhe wie ReviewBlockActions (`h-9`). */
function ReviewBlockFooterResetButton({ onReset }: { onReset: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 shrink-0 gap-1.5 px-2.5 text-sm font-medium text-white",
        "hover:bg-destructive hover:text-destructive-foreground",
        "focus-visible:ring-white/80",
      )}
      onClick={onReset}
    >
      <RotateCcw className="size-4 shrink-0" aria-hidden />
      Zurücksetzen
    </Button>
  );
}

function InteractiveReviewBlock({
  blockId,
  title,
  phase,
  onConfirm,
  onRequestAdjustment,
  onReset,
  readOnly = false,
  children,
}: {
  blockId: ReviewWorkspaceBlockId;
  title: string;
  phase: ReviewBlockPhase;
  onConfirm: () => void;
  onRequestAdjustment: () => void;
  onReset: () => void;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const anchorId = reviewWorkspaceAnchorId(blockId);

  if (phase.phase === "confirmed") {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="confirmed"
        footer={
          readOnly ? (
            <div className="flex w-full justify-end">
              <ReviewBlockFooterStatus
                icon={CheckCheck}
                label="Reviewed & Bestätigt"
              />
            </div>
          ) : (
            <>
              <ReviewBlockFooterResetButton onReset={onReset} />
              <ReviewBlockFooterStatus
                icon={CheckCheck}
                label="Reviewed & Bestätigt"
              />
            </>
          )
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (phase.phase === "adjustment") {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="adjustment"
        footer={
          readOnly ? (
            <div className="flex w-full justify-end">
              <ReviewBlockFooterStatus
                icon={MessageSquareText}
                label="Anpassung angefordert"
              />
            </div>
          ) : (
            <>
              <ReviewBlockFooterResetButton onReset={onReset} />
              <ReviewBlockFooterStatus
                icon={MessageSquareText}
                label="Anpassung angefordert"
              />
            </>
          )
        }
      >
        <>
          {children}
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/35">
            <p className="text-xs font-medium text-muted-foreground">Bemerkung</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">{phase.remark}</p>
          </div>
        </>
      </ReviewBlockCard>
    );
  }

  return (
    <ReviewBlockCard
      anchorId={anchorId}
      title={title}
      footer={
        readOnly ? (
          <p className="text-xs text-muted-foreground">Nur Ansicht.</p>
        ) : (
          <ReviewBlockActions
            onAdjust={onRequestAdjustment}
            onConfirm={onConfirm}
          />
        )
      }
    >
      {children}
    </ReviewBlockCard>
  );
}
