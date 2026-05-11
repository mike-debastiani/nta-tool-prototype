import { REVIEW_WORKSPACE_BLOCK_IDS } from "@/lib/review-workspace-blocks";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

/**
 * Serialisiert einen Block-Snapshot tolerant (fehlende Felder, unbekannte Shapes).
 */
function serializeBlockSnapshot(
  b: unknown,
): { p: string; r?: string; l?: string } | null {
  if (!b || typeof b !== "object" || !("phase" in b)) return null;
  const phase = (b as { phase: unknown }).phase;
  if (typeof phase !== "string") return null;
  const out: { p: string; r?: string; l?: string } = { p: phase };
  if ("remark" in b && typeof (b as { remark: unknown }).remark === "string") {
    out.r = (b as { remark: string }).remark;
  }
  if (
    "lockedRemark" in b
    && typeof (b as { lockedRemark: unknown }).lockedRemark === "string"
  ) {
    out.l = (b as { lockedRemark: string }).lockedRemark;
  }
  return out;
}

/**
 * Fingerabdruck persistierter R2-`postSubmit`-Daten. Wichtig wenn `status`
 * erneut `in_review` ist (z. B. nach R1-Freigabe der Anpassungen): React-Key
 * `id + status` allein reicht nicht — hier ändern sich die Blöcke.
 * Kein Draft-`updatedAt`, damit Autosave keinen Remount auslöst.
 */
export function workspaceReviewPostSubmitHydrationKey(
  app: WorkspaceApplication,
): string {
  const wr = app.data.recommendation?.workspaceReview;
  const ps = wr?.postSubmit ?? app.data.r2PostSubmitReview;
  const blocks = ps?.blocks;
  if (!blocks || typeof blocks !== "object") {
    return "";
  }
  const ordered = REVIEW_WORKSPACE_BLOCK_IDS.map((id) =>
    serializeBlockSnapshot(blocks[id]),
  );
  const fcLen =
    (wr?.forwardedComments ?? app.data.reviewComments ?? []).length;
  const fa =
    ps && typeof ps === "object" && "forwardedAt" in ps
      ? String((ps as { forwardedAt?: unknown }).forwardedAt ?? "")
      : "";
  return `${fa}:${fcLen}:${JSON.stringify(ordered)}`;
}
