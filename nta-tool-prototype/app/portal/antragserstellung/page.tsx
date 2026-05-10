import { NtaAntragDesktop } from "@/components/nta-antrag-desktop";
import { requireUserProfile } from "@/lib/auth";
import { deriveCanonicalApplicationState } from "@/lib/application-status";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/server";

type PortalAntragserstellungPageProps = {
  searchParams?: Promise<{ new?: string; applicationId?: string }>;
};

export default async function PortalAntragserstellungPage({
  searchParams,
}: PortalAntragserstellungPageProps) {
  const params = (await searchParams) ?? {};
  // Accept any presence of `?new` (e.g. `?new`, `?new=1`, `?new=true`) as a
  // request to start a fresh application. Previously only the exact value `"1"`
  // worked, which silently fell back to loading the most recent application —
  // confusing if that one was already in review.
  const forceNew = params.new !== undefined;
  const applicationId =
    typeof params.applicationId === "string" && params.applicationId.length > 0
      ? params.applicationId
      : undefined;
  const profile = await requireUserProfile(["R1"], "/student/login");
  const supabase = await createClient();

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
      // Only auto-resume an application that still requires R1 action. If the
      // latest one is already locked for R1 (`in_review`/`in_decision`/
      // `approved`/`rejected`), fall back to a fresh form so R1 can start a
      // second application without seeing the previous one's success screen
      // or read-only step 1.
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

  return (
    <NtaAntragDesktop
      userId={profile.id}
      initialApplication={startFresh ? undefined : initial}
      autosaveKey={`nta-antrag-step1-draft:${profile.id}`}
      forceNew={startFresh}
    />
  );
}
