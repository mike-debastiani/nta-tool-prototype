import { StudentDashboard } from "@/components/domain/student-dashboard";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { requireUserProfile } from "@/lib/auth";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { initialsFromProfile } from "@/lib/user-initials";
import { createClient } from "@/utils/supabase/server";

export default async function PortalHomePage() {
  const profile = await requireUserProfile(["R1"], "/student/login");
  const supabase = await createClient();

  const { data } = await supabase
    .from("applications")
    .select("id,applicant_id,status,data,created_at,updated_at")
    .eq("applicant_id", profile.id)
    .order("updated_at", { ascending: false });

  return (
    <RoleDashboardLayout
      role="R1"
      edgeToEdge
      userLabel=""
      workspaceAccountInitials={initialsFromProfile(
        profile.display_name,
        profile.email,
      )}
    >
      <StudentDashboard
        applications={(data as ApplicationRow[]) ?? []}
        applicantId={profile.id}
        studentDisplayName={profile.display_name ?? profile.email}
      />
    </RoleDashboardLayout>
  );
}
