import { NextResponse } from "next/server";
import { broadcastApplicationRowUpdated } from "@/lib/application-realtime-sync";
import {
  buildWorkspaceReviewAfterR1AdjustmentRelease,
  r1AllRequestedAdjustmentsSaved,
} from "@/lib/r1-adjustment-release";
import { dataWithoutLegacyReviewRoots } from "@/lib/r2-review-persist";
import { type ApplicationData, type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/server";

type Body = { applicationId?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const applicationId = body.applicationId?.trim();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("applications")
    .select("id,applicant_id,status,data")
    .eq("id", applicationId)
    .maybeSingle<ApplicationRow>();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Antrag nicht gefunden" }, { status: 404 });
  }

  if (row.applicant_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (row.status !== "needs_correction" && row.status !== "needs_adjustment") {
    return NextResponse.json(
      { error: "Freigabe nur im Status «Anpassung erforderlich» möglich." },
      { status: 409 },
    );
  }

  const data = row.data as ApplicationData;
  if (!r1AllRequestedAdjustmentsSaved(data)) {
    return NextResponse.json(
      {
        error:
          "Bitte speichern Sie zuerst für jeden Block, für den eine Anpassung angefordert wurde, die Anpassung.",
      },
      { status: 409 },
    );
  }

  const built = buildWorkspaceReviewAfterR1AdjustmentRelease(data);
  if (!built) {
    return NextResponse.json(
      { error: "Review-Daten konnten nicht aufbereitet werden." },
      { status: 422 },
    );
  }

  const base = dataWithoutLegacyReviewRoots(data);
  const nextData: ApplicationData = {
    ...base,
    r1AdjustmentResolutions: {},
    recommendation: {
      ...data.recommendation,
      workspaceReview: built.workspaceReview,
    },
  };

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: "in_review",
      data: nextData,
    })
    .eq("id", applicationId)
    .eq("applicant_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await broadcastApplicationRowUpdated(supabase, applicationId);

  return NextResponse.json({ ok: true });
}
