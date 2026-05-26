"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HfGridCell, HfPageGrid } from "@/components/layout/hf-grid";
import { useWorkspaceR2Toolbar } from "@/components/domain/workspace-r2-toolbar-context";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  deriveCanonicalApplicationState,
  getApplicationStatusMeta,
} from "@/lib/application-status";
import { workspaceReviewPostSubmitHydrationKey } from "@/lib/workspace-review-hydration-key";
import {
  WorkspaceApplicationReview,
  type WorkspaceReviewViewMode,
} from "@/components/domain/workspace-application-review";
import { WorkspaceConsultationPlannerView } from "@/components/domain/workspace-consultation-planner-view";
import { WorkspaceHomeDashboard } from "@/components/domain/workspace-home-dashboard";
import { WorkspaceMyTasksView } from "@/components/domain/workspace-my-tasks-view";
import { workspaceShowsConsultationPlannerView } from "@/lib/workspace-nav-access";
import { WorkspaceR4DecisionView } from "@/components/domain/workspace-r4-decision-view";
import { RichTextEditor } from "@/components/domain/rich-text-editor";
import { type UserRole } from "@/lib/auth";
import {
  hasR4WorkspaceCapabilities,
  statusAudienceForWorkspaceApplication,
  usesR4OnlyHomeLayout,
} from "@/lib/workspace-role";

/** Removed product copy — never show between draft / release actions. */
const SUPPRESS_EDITOR_NOTICE = "Empfehlungsschreiben an R1 freigegeben.";

type WorkspaceTestFlowProps = {
  userId: string;
  /** Logged-in reviewer name for „Zugewiesen an“ in the review sidebar. */
  reviewerDisplayName: string;
  initialApplications: WorkspaceApplication[];
  /** Aktuelle Workspace-Rolle (R4 erhält Bewilligungs-Ansicht). */
  workspaceRole: UserRole;
};

export function WorkspaceTestFlow({
  userId,
  reviewerDisplayName,
  initialApplications,
  workspaceRole,
}: WorkspaceTestFlowProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setLeadingToolbarSlot = useWorkspaceR2Toolbar()?.setLeadingSlot;

  const supabase = useMemo(() => createClient(), []);
  const [applications, setApplications] =
    useState<WorkspaceApplication[]>(initialApplications);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  /** Verhindert, dass eine ältere Listen-GET eine neuere überschreibt (z. B. Realtime + onPersisted parallel). */
  const refreshApplicationsSeq = useRef(0);

  useEffect(() => {
    setMessage((current) =>
      current === SUPPRESS_EDITOR_NOTICE ? null : current,
    );
  }, []);

  const dashboardView = searchParams.get("view");

  useEffect(() => {
    if (
      dashboardView === "terminplaner"
      && !workspaceShowsConsultationPlannerView(workspaceRole)
    ) {
      router.replace("/workspace");
    }
  }, [dashboardView, router, workspaceRole]);

  useEffect(() => {
    if (dashboardView === "aufgaben" || dashboardView === "terminplaner") {
      setSelectedApplicationId(null);
    }
  }, [dashboardView]);

  const refreshApplications = useCallback(async () => {
    const seq = ++refreshApplicationsSeq.current;
    try {
      const res = await fetch("/api/workspace/applications", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        applications?: WorkspaceApplication[];
      };
      if (payload.applications && seq === refreshApplicationsSeq.current) {
        setApplications(payload.applications);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /** Stabile Referenz — verhindert Autosave-Loop in WorkspaceApplicationReview (onPersisted in useCallback-Deps). */
  const handleApplicationPersisted = useCallback(() => {
    void refreshApplications();
  }, [refreshApplications]);

  useEffect(() => {
    const channel = supabase
      .channel(`workspace-app-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => {
          void refreshApplications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshApplications, supabase, userId]);

  async function saveRecommendationDraft(
    applicationId: string,
    draftHtml: string,
    draftText: string,
  ) {
    setPendingId(applicationId);
    setMessage(null);

    const target = applications.find((a) => a.id === applicationId);
    if (!target) {
      setPendingId(null);
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        data: {
          ...target.data,
          recommendation: {
            ...target.data.recommendation,
            draftHtml,
            draftText,
          },
        },
      })
      .eq("id", applicationId);

    if (error) {
      setMessage(error.message);
      setPendingId(null);
      return;
    }

    await refreshApplications();
    setMessage("Entwurf des Empfehlungsschreibens gespeichert.");
    setPendingId(null);
  }

  async function releaseRecommendation(
    applicationId: string,
    draftHtml: string,
    draftText: string,
  ) {
    setReleasingId(applicationId);
    setMessage(null);

    const target = applications.find((a) => a.id === applicationId);
    if (!target) {
      setReleasingId(null);
      return;
    }

    const trimmed = draftText.trim();
    if (!trimmed) {
      setMessage(
        "Bitte verfassen Sie zuerst ein Empfehlungsschreiben, bevor Sie es freigeben.",
      );
      setReleasingId(null);
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        data: {
          ...target.data,
          recommendation: {
            ...target.data.recommendation,
            draftHtml,
            draftText,
            releasedHtml: draftHtml,
            releasedText: draftText,
            releasedAt: new Date().toISOString(),
            releasedBy: reviewerDisplayName,
            ready: true,
          },
        },
      })
      .eq("id", applicationId);

    if (error) {
      setMessage(error.message);
      setReleasingId(null);
      return;
    }

    await refreshApplications();
    setMessage(null);
    setReleasingId(null);
  }

  const selectedApplication = applications.find(
    (application) => application.id === selectedApplicationId,
  );
  const selectedCanonicalState = selectedApplication
    ? deriveCanonicalApplicationState(selectedApplication)
    : null;

  useEffect(() => {
    if (!setLeadingToolbarSlot) return;

    const reviewWorkspaceDetail =
      selectedCanonicalState === "consultation_recommendation"
      || selectedCanonicalState === "in_review"
      || selectedCanonicalState === "in_decision"
      || selectedCanonicalState === "needs_adjustment"
      || selectedCanonicalState === "approved"
      || selectedCanonicalState === "rejected";

    if (!reviewWorkspaceDetail) {
      setLeadingToolbarSlot(null);
      return;
    }

    setLeadingToolbarSlot(
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-2 px-2 text-muted-foreground hover:text-foreground"
        type="button"
        onClick={() => setSelectedApplicationId(null)}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Zurück zur Liste
      </Button>,
    );

    return () => setLeadingToolbarSlot(null);
  }, [selectedCanonicalState, setLeadingToolbarSlot, selectedApplication]);

  const workspaceReviewMode: WorkspaceReviewViewMode =
    selectedCanonicalState === "consultation_recommendation"
      ? "readonly_consultation"
      : selectedCanonicalState === "in_decision"
      ? "readonly_decision"
      : selectedCanonicalState === "needs_adjustment"
        ? "readonly_adjustment_pending"
        : selectedCanonicalState === "approved"
          || selectedCanonicalState === "rejected"
          ? "readonly_decision"
          : "interactive";

  if (!selectedApplication) {
    const isWorkspaceHome = pathname === "/workspace" && !dashboardView;
    const showHomeDashboard =
      isWorkspaceHome
      && (workspaceRole === "R2"
        || workspaceRole === "R3"
        || workspaceRole === "R4"
        || workspaceRole === "R2R4");
    const showMyTasksView =
      dashboardView === "aufgaben"
      && (workspaceRole === "R2"
        || workspaceRole === "R3"
        || workspaceRole === "R4"
        || workspaceRole === "R2R4");

    const showConsultationPlannerView =
      dashboardView === "terminplaner"
      && workspaceShowsConsultationPlannerView(workspaceRole);

    if (showConsultationPlannerView) {
      return (
        <WorkspaceConsultationPlannerView workspaceRole={workspaceRole} />
      );
    }

    if (showMyTasksView) {
      return (
        <WorkspaceMyTasksView
          reviewerDisplayName={reviewerDisplayName}
          applications={applications}
          workspaceRole={workspaceRole}
          onSelectApplication={setSelectedApplicationId}
        />
      );
    }

    if (showHomeDashboard) {
      return (
        <WorkspaceHomeDashboard
          reviewerDisplayName={reviewerDisplayName}
          applications={applications}
          workspaceRole={workspaceRole}
          onSelectApplication={setSelectedApplicationId}
        />
      );
    }

    return (
      <HfPageGrid className="py-6">
        <HfGridCell span={12}>
      <Card>
        <CardHeader>
          <CardTitle>Eingegangene Antraege</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Keine sichtbaren Antraege in der Inbox.
            </p>
          )}
          {applications.map((application) => {
            const statusMeta = getApplicationStatusMeta(
              application,
              statusAudienceForWorkspaceApplication(workspaceRole, application),
            );
            return (
              <button
                key={application.id}
                type="button"
                onClick={() => setSelectedApplicationId(application.id)}
                className="w-full rounded-md border p-3 text-left transition hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium">
                    {application.data.title ?? "Ohne Titel"}
                  </p>
                  <span
                    className={cn(
                        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs leading-4 font-semibold",
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {application.users[0]?.display_name ??
                    application.users[0]?.email ??
                    application.applicant_id}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eingereicht am {new Date(application.created_at).toLocaleDateString("de-CH")}
                </p>
              </button>
            );
          })}
          {message && <p className="pt-2 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
        </HfGridCell>
      </HfPageGrid>
    );
  }

  if (
    selectedCanonicalState === "consultation_recommendation"
    || selectedCanonicalState === "in_review"
    || selectedCanonicalState === "in_decision"
    || selectedCanonicalState === "needs_adjustment"
    || selectedCanonicalState === "approved"
    || selectedCanonicalState === "rejected"
  ) {
    const r4EntscheidEditing =
      hasR4WorkspaceCapabilities(workspaceRole)
      && selectedApplication.status === "in_implementation";

    if (r4EntscheidEditing) {
      return (
        <WorkspaceR4DecisionView
          key={`${selectedApplication.id}-${selectedApplication.status}`}
          application={selectedApplication}
          reviewerDisplayName={reviewerDisplayName}
          onPersisted={handleApplicationPersisted}
        />
      );
    }

    const r4ViewMode: WorkspaceReviewViewMode =
      usesR4OnlyHomeLayout(workspaceRole) && workspaceReviewMode === "interactive"
        ? "readonly_decision"
        : workspaceReviewMode;

    const recommendationBottomAction =
      selectedCanonicalState === "consultation_recommendation"
      && !selectedApplication.data.recommendation?.releasedHtml
      && !usesR4OnlyHomeLayout(workspaceRole) ? (
        <RecommendationDraftEditor
          key={`${selectedApplication.id}-recommendation-editor`}
          initialHtml={
            selectedApplication.data.recommendation?.draftHtml ?? ""
          }
          saveMessage={
            message !== SUPPRESS_EDITOR_NOTICE ? message : null
          }
          saving={pendingId === selectedApplication.id}
          releasing={releasingId === selectedApplication.id}
          onSave={(draftHtml, draftText) =>
            saveRecommendationDraft(
              selectedApplication.id,
              draftHtml,
              draftText,
            )}
          onRelease={(draftHtml, draftText) =>
            releaseRecommendation(
              selectedApplication.id,
              draftHtml,
              draftText,
            )}
        />
      ) : undefined;

    return (
      <WorkspaceApplicationReview
        key={`${selectedApplication.id}-${selectedApplication.status}-${workspaceReviewPostSubmitHydrationKey(selectedApplication)}`}
        application={selectedApplication}
        reviewerDisplayName={reviewerDisplayName}
        viewMode={r4ViewMode}
        workspaceViewerRole={statusAudienceForWorkspaceApplication(
          workspaceRole,
          selectedApplication,
        )}
        onPersisted={handleApplicationPersisted}
        bottomAction={recommendationBottomAction}
      />
    );
  }

  return null;
}

const RECOMMENDATION_PLACEHOLDER =
  "Erstellen Sie hier das Empfehlungsschreiben für den Fall dieses Antrages.";

function RecommendationDraftEditor({
  initialHtml,
  saveMessage,
  saving,
  releasing,
  onSave,
  onRelease,
}: {
  initialHtml: string;
  saveMessage: string | null;
  saving: boolean;
  releasing: boolean;
  onSave: (draftHtml: string, draftText: string) => void;
  onRelease: (draftHtml: string, draftText: string) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [hasRecommendationBody, setHasRecommendationBody] = useState(false);

  useEffect(() => {
    if (!editor) {
      setHasRecommendationBody(false);
      return;
    }
    const sync = () => {
      setHasRecommendationBody(editor.getText().trim().length > 0);
    };
    sync();
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  const busy = saving || releasing;
  const canRelease = hasRecommendationBody && !busy && Boolean(editor);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="space-y-1 px-6 pt-5 pb-4">
        <h2 className="text-lg font-medium text-foreground">
          Empfehlungsschreiben erstellen
        </h2>
        <p className="text-sm text-muted-foreground">
          Verfassen Sie hier das Empfehlungsschreiben für diesen Antrag und
          geben Sie es nach Fertigstellung an die studierende Person frei.
        </p>
      </div>
      <div className="space-y-4 px-6 pb-5">
        <RichTextEditor
          initialHtml={initialHtml}
          placeholder={RECOMMENDATION_PLACEHOLDER}
          ariaLabel="Empfehlungsschreiben"
          onReady={setEditor}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={busy || !editor}
              onClick={() => {
                if (!editor) return;
                onSave(editor.getHTML(), editor.getText());
              }}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {saving ? "Speichert …" : "Entwurf speichern"}
            </Button>
            {saveMessage ? (
              <p className="text-sm text-muted-foreground">{saveMessage}</p>
            ) : null}
          </div>
          <Button
            type="button"
            className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
            disabled={!canRelease}
            onClick={() => {
              if (!editor || !hasRecommendationBody) return;
              onRelease(editor.getHTML(), editor.getText());
            }}
          >
            {releasing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {releasing
              ? "Wird freigegeben …"
              : "Empfehlungsschreiben freigeben"}
          </Button>
        </div>
      </div>
    </section>
  );
}
