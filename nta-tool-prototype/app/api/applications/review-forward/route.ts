import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureAdjustmentBaselines } from "@/lib/r1-adjustment-baseline";
import { dataWithoutLegacyReviewRoots } from "@/lib/r2-review-persist";
import {
  REVIEW_WORKSPACE_BLOCK_IDS,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import type { UserRole } from "@/lib/auth";
import {
  type ApplicationData,
  type RecommendationWorkspaceReview,
} from "@/lib/test-flow-types";
import { hasR2WorkspaceCapabilities } from "@/lib/workspace-role";

function canForwardWorkspaceReview(role: UserRole): boolean {
  return hasR2WorkspaceCapabilities(role) || role === "R3";
}

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
    .maybeSingle<{ id: string; role: UserRole }>();

  if (!profile || !canForwardWorkspaceReview(profile.role)) {
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

  const adjustmentBlockIds =
    nextStatus === "needs_correction"
      ? REVIEW_WORKSPACE_BLOCK_IDS.filter((id) => {
          const phase = workspaceReview.postSubmit?.blocks?.[id]?.phase;
          return phase === "adjustment";
        })
      : [];

  const r1AdjustmentBlockBaselines =
    adjustmentBlockIds.length > 0
      ? captureAdjustmentBaselines(base, adjustmentBlockIds as ReviewWorkspaceBlockId[])
      : undefined;

  /**
   * Baselines unter `recommendation` — trigger-konform für R2.
   * `r1AdjustmentResolutions` (Root) darf nicht entfernt oder geändert werden.
   */
  const payload = {
    status: nextStatus,
    data: {
      ...base,
      recommendation: {
        ...row.data.recommendation,
        workspaceReview,
        ...(r1AdjustmentBlockBaselines
          ? { r1AdjustmentBlockBaselines }
          : {}),
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
