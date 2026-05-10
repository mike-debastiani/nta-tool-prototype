import { requireUserProfile } from "@/lib/auth";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { WorkspaceTestFlow } from "@/components/domain/workspace-test-flow";
import { createClient } from "@/utils/supabase/server";
import { type WorkspaceApplication } from "@/lib/test-flow-types";

export default async function WorkspaceTestPage() {
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
    <RoleDashboardLayout
      role="R2"
      userLabel={`Eingeloggt als ${profile.display_name ?? profile.email}`}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Workspace - R2 Testbereich</h1>
        </div>
        <WorkspaceTestFlow userId={profile.id} initialApplications={initialApplications} />
      </div>
    </RoleDashboardLayout>
  );
}
