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
      userLabel=""
      workspaceAccountInitials={initialsFromProfile(
        profile.display_name,
        profile.email,
      )}
    >
      <div className="hf-grid w-full">
        <div className="hf-col-span-8 hf-col-start-3 hf-col-collapse-below-desktop min-w-0">
          <StudentDashboard
            applications={(data as ApplicationRow[]) ?? []}
            applicantId={profile.id}
          />
        </div>
      </div>
    </RoleDashboardLayout>
  );
}
