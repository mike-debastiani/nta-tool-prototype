import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { dataWithoutLegacyReviewRoots } from "@/lib/r2-review-persist";
import {
  type ApplicationData,
  type RecommendationWorkspaceReview,
} from "@/lib/test-flow-types";

const ALLOWED_ROLES = ["R2", "R3"] as const;

type ForwardBody = {
  applicationId: string;
  nextStatus: "needs_correction" | "in_implementation";
  workspaceReview: RecommendationWorkspaceReview;
};

export async function POST(request: Request) {
  let body: ForwardBody;
  try {
    body = (await request.json()) as ForwardBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { applicationId, nextStatus, workspaceReview } = body;
  if (
    !applicationId
    || (nextStatus !== "needs_correction" && nextStatus !== "in_implementation")
    || !workspaceReview?.postSubmit
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (
    !profile
    || !ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number])
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("applications")
    .select("id,status,data")
    .eq("id", applicationId)
    .maybeSingle<{ id: string; status: string; data: ApplicationData }>();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Antrag nicht gefunden" }, { status: 404 });
  }

  if (row.status !== "in_review") {
    return NextResponse.json(
      { error: "Weiterreichung nur aus Status „In Review“ möglich." },
      { status: 409 },
    );
  }

  const base = dataWithoutLegacyReviewRoots(row.data);
  /**
   * `r1AdjustmentResolutions` darf hier nicht entfallen oder geleert werden:
   * Trigger `enforce_r2_application_update_columns` erlaubt R2 nur Änderungen
   * unter `data.recommendation` / `data.consultation`. Markierungen werden
   * ohnehin bei R1-Freigabe (`r1-release-adjustments`) und durch R1-Saves neu geführt.
   */
  const payload = {
    status: nextStatus,
    data: {
      ...base,
      recommendation: {
        ...row.data.recommendation,
        workspaceReview,
      },
    },
  };

  // Session-Client mit RLS — Status-Übergang aus `in_review` heraus ist durch
  // die Policies `applications_update_r2_worklist` (USING) und
  // `applications_select_r2_worklist` (USING, inkl. `in_implementation`/
  // `approved`/`rejected`) gedeckt. Kein Service-Role-Key nötig.
  const { error: updateError } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", applicationId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
