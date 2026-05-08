import { StudentDashboard } from "@/components/domain/student-dashboard";
import { RoleDashboardLayout } from "@/components/domain/role-dashboard-layout";
import { requireUserProfile } from "@/lib/auth";
import { type ApplicationRow } from "@/lib/test-flow-types";
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
      userLabel={`Eingeloggt als ${profile.display_name ?? profile.email}`}
    >
      <div className="mx-auto w-full max-w-5xl">
        <StudentDashboard applications={(data as ApplicationRow[]) ?? []} />
      </div>
    </RoleDashboardLayout>
  );
}
