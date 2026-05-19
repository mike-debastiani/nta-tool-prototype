import { type ReactNode } from "react";

import { PortalApplicationAdjustment } from "@/components/domain/portal-application-adjustment";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { NtaAntragDesktop } from "@/components/nta-antrag-desktop";
import { requireUserProfile } from "@/lib/auth";
import { deriveCanonicalApplicationState } from "@/lib/application-status";
import {
  type ApplicationRow,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { initialsFromProfile } from "@/lib/user-initials";
import { createClient } from "@/utils/supabase/server";

type PortalAntragserstellungPageProps = {
  searchParams?: Promise<{ new?: string; applicationId?: string }>;
};

export default async function PortalAntragserstellungPage({
  searchParams,
}: PortalAntragserstellungPageProps) {
  const params = (await searchParams) ?? {};
  const forceNew = params.new !== undefined;
  const applicationId =
    typeof params.applicationId === "string" && params.applicationId.length > 0
      ? params.applicationId
      : undefined;
  const profile = await requireUserProfile(["R1"], "/student/login");
  const supabase = await createClient();
  const workspaceAccountInitials = initialsFromProfile(
    profile.display_name,
    profile.email,
  );

  let initial: ApplicationRow | undefined;

  if (!forceNew && applicationId) {
    const { data: byId } = await supabase
      .from("applications")
      .select("id,applicant_id,status,data,created_at,updated_at")
      .eq("id", applicationId)
      .eq("applicant_id", profile.id)
      .maybeSingle<ApplicationRow>();
    initial = byId ?? undefined;
  }

  if (!forceNew && !initial) {
    const { data } = await supabase
      .from("applications")
      .select("id,applicant_id,status,data,created_at,updated_at")
      .eq("applicant_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<ApplicationRow>();
    if (data) {
      const canonical = deriveCanonicalApplicationState(data);
      const isResumable =
        canonical === "draft"
        || canonical === "consultation_recommendation"
        || canonical === "needs_adjustment";
      if (isResumable) {
        initial = data;
      }
    }
  }

  const startFresh = forceNew || !initial;

  const initialCanonical =
    initial !== undefined ? deriveCanonicalApplicationState(initial) : null;
  const enableDraftExitToDashboard =
    initialCanonical === "draft"
    || initialCanonical === "consultation_recommendation"
    || startFresh;

  const wrapInPortalShell = (content: ReactNode) => (
    <RoleDashboardLayout
      role="R1"
      userLabel=""
      workspaceAccountInitials={workspaceAccountInitials}
      edgeToEdge
    >
      {content}
    </RoleDashboardLayout>
  );

  if (!startFresh && initial && applicationId) {
    const canonical = deriveCanonicalApplicationState(initial);
    if (canonical === "draft" || canonical === "consultation_recommendation") {
      return (
        <NtaAntragDesktop
          userId={profile.id}
          key={initial.id}
          initialApplication={initial}
          autosaveKey={`nta-antrag-step1-draft:${profile.id}:${initial.id}`}
          forceNew={false}
          enableDraftExitToDashboard={enableDraftExitToDashboard}
        />
      );
    }
    const workspaceApplication: WorkspaceApplication = {
      ...initial,
      users: [
        {
          display_name: profile.display_name,
          email: profile.email,
        },
      ],
    };
    const applicantDisplayName =
      profile.display_name?.trim() || profile.email || "Antragsteller";
    return wrapInPortalShell(
      <PortalApplicationAdjustment
        key={`${workspaceApplication.id}-${workspaceApplication.status}`}
        application={workspaceApplication}
        applicantDisplayName={applicantDisplayName}
        allowAdjustments={canonical === "needs_adjustment"}
      />,
    );
  }

  return (
    <NtaAntragDesktop
      userId={profile.id}
      initialApplication={startFresh ? undefined : initial}
      autosaveKey={`nta-antrag-step1-draft:${profile.id}`}
      forceNew={startFresh}
      enableDraftExitToDashboard={enableDraftExitToDashboard}
    />
  );
}
