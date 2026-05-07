import { NtaAntragDesktop } from "@/components/nta-antrag-desktop";
import { requireUserProfile } from "@/lib/auth";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/server";

type PortalAntragserstellungPageProps = {
  searchParams?: Promise<{ new?: string }>;
};

export default async function PortalAntragserstellungPage({
  searchParams,
}: PortalAntragserstellungPageProps) {
  const params = (await searchParams) ?? {};
  const forceNew = params.new === "1";
  const profile = await requireUserProfile(["R1"], "/student/login");
  const supabase = await createClient();

  const { data } = await supabase
    .from("applications")
    .select("id,applicant_id,status,data,created_at,updated_at")
    .eq("applicant_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<ApplicationRow>();

  return (
    <NtaAntragDesktop
      userId={profile.id}
      initialApplication={forceNew ? undefined : (data ?? undefined)}
      autosaveKey={`nta-antrag-step1-draft:${profile.id}`}
      forceNew={forceNew}
    />
  );
}
