import { requireUserProfile } from "@/lib/auth";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { WorkspaceR2ToolbarProvider } from "@/components/domain/workspace-r2-toolbar-context";
import { WorkspaceTestFlow } from "@/components/domain/workspace-test-flow";
import { initialsFromProfile } from "@/lib/user-initials";
import { fetchWorkspaceApplicationsList } from "@/lib/workspace-applications-list";
import { computeAssignedTasksStats } from "@/lib/workspace-assigned-tasks-stats";
import { createClient } from "@/utils/supabase/server";

export default async function WorkspacePage() {
  const profile = await requireUserProfile(
    ["R2", "R3", "R4", "R5", "R6", "R2R4"],
    "/staff/login",
  );

  const supabase = await createClient();
  const initialApplications = await fetchWorkspaceApplicationsList(
    supabase,
    profile.role,
  );
  const workspaceAccountInitials = initialsFromProfile(
    profile.display_name,
    profile.email,
  );
  const assignedTasksStats = computeAssignedTasksStats(initialApplications, {
    reviewerDisplayName: profile.display_name ?? profile.email,
    workspaceRole: profile.role,
  });
  const workspaceTasksBadgeCount = assignedTasksStats.buckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  return (
    <WorkspaceR2ToolbarProvider>
      <RoleDashboardLayout
        role={profile.role}
        userLabel=""
        workspaceAccountInitials={workspaceAccountInitials}
        workspaceTasksBadgeCount={workspaceTasksBadgeCount}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkspaceTestFlow
            userId={profile.id}
            reviewerDisplayName={profile.display_name ?? profile.email}
            workspaceRole={profile.role}
            initialApplications={initialApplications}
          />
        </div>
      </RoleDashboardLayout>
    </WorkspaceR2ToolbarProvider>
  );
}
