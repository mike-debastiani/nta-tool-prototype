import { StudentDashboard } from "@/components/domain/student-dashboard";
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

  return <StudentDashboard applications={(data as ApplicationRow[]) ?? []} />;
}
