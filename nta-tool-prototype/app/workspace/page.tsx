import { requireUserProfile } from "@/lib/auth";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { WorkspaceR2ToolbarProvider } from "@/components/domain/workspace-r2-toolbar-context";
import { WorkspaceTestFlow } from "@/components/domain/workspace-test-flow";
import { createClient } from "@/utils/supabase/server";
import { type WorkspaceApplication } from "@/lib/test-flow-types";

export default async function WorkspacePage() {
  const profile = await requireUserProfile(
    ["R2", "R3", "R5", "R6"],
    "/staff/login",
  );

  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)",
    )
    .order("updated_at", { ascending: false });

  const initialApplications = (data ?? []) as WorkspaceApplication[];

  return (
    <WorkspaceR2ToolbarProvider>
      <RoleDashboardLayout role="R2" userLabel="">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkspaceTestFlow
            userId={profile.id}
            reviewerDisplayName={profile.display_name ?? profile.email}
            initialApplications={initialApplications}
          />
        </div>
      </RoleDashboardLayout>
    </WorkspaceR2ToolbarProvider>
  );
}
