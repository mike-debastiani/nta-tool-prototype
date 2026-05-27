import { NextResponse } from "next/server";
import { broadcastApplicationRowUpdated } from "@/lib/application-realtime-sync";
import {
  allVisibleR4BlocksConfirmed,
  getR4BlockVisibility,
  materializeApprovedR4DecisionReview,
  mergeApplicationDataWithR4Review,
} from "@/lib/r4-decision-state";
import type { ApplicationStatus } from "@/lib/application-status";
import { type ApplicationData, type R4DecisionReview } from "@/lib/test-flow-types";
import type { UserRole } from "@/lib/auth";
import { canEditR4DecisionApplication } from "@/lib/workspace-application-visibility";
import { hasR4WorkspaceCapabilities } from "@/lib/workspace-role";
import { createClient } from "@/utils/supabase/server";
import { tryCreateServiceRoleClient } from "@/utils/supabase/service-role";

type Body = {
  applicationId?: string;
  r4DecisionReview?: R4DecisionReview;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const applicationId = body.applicationId?.trim();
  const incoming = body.r4DecisionReview;
  if (
    !applicationId
    || typeof incoming !== "object"
    || incoming === null
    || typeof incoming.blocks !== "object"
    || incoming.blocks === null
  ) {
    return NextResponse.json({ error: "Ungültige Anfrage (r4DecisionReview.blocks erforderlich)" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole }>();

  if (!profile?.role || !hasR4WorkspaceCapabilities(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = tryCreateServiceRoleClient();
  const db = admin ?? supabase;

  const { data: row, error: fetchError } = await db
    .from("applications")
    .select("id,status,data")
    .eq("id", applicationId)
    .maybeSingle<{ id: string; status: ApplicationStatus; data: ApplicationData }>();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Antrag nicht gefunden" }, { status: 404 });
  }

  if (!canEditR4DecisionApplication(row)) {
    return NextResponse.json(
      { error: "Abschluss nur im Status «Entscheid erforderlich» möglich." },
      { status: 409 },
    );
  }

  const mergedData = mergeApplicationDataWithR4Review(row.data, incoming as R4DecisionReview);

  const visibility = getR4BlockVisibility(mergedData);
  if (!allVisibleR4BlocksConfirmed(incoming, visibility)) {
    return NextResponse.json(
      { error: "Bitte bestätigen Sie zuerst alle sichtbaren Entscheid-Blöcke." },
      { status: 409 },
    );
  }

  const finalizedData = materializeApprovedR4DecisionReview(mergedData);

  const { error: updateError } = await db
    .from("applications")
    .update({
      status: "approved",
      data: finalizedData,
    })
    .eq("id", applicationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await broadcastApplicationRowUpdated(supabase, applicationId);

  return NextResponse.json({ ok: true });
}
