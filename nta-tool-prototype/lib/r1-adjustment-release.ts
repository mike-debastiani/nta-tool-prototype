import {
  REVIEW_WORKSPACE_BLOCK_IDS,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import {
  type ApplicationData,
  type RecommendationWorkspaceReview,
  type R2PostSubmitReview,
  type R2ReviewBlockSnapshot,
} from "@/lib/test-flow-types";

function readPostSubmit(
  data: ApplicationData,
): {
  postSubmit: R2PostSubmitReview;
  /** Fehlt bei rein legacy `r2PostSubmitReview` — Release baut dann ein neues Objekt. */
  workspaceReview: RecommendationWorkspaceReview | null;
} | null {
  const wr = data.recommendation?.workspaceReview;
  const postSubmit = wr?.postSubmit ?? data.r2PostSubmitReview;
  if (!postSubmit?.blocks) return null;
  return { postSubmit, workspaceReview: wr ?? null };
}

/**
 * Alle Blöcke, für die R2 eine Anpassung angefordert hat, müssen von R1
 * mindestens einmal gespeichert sein (`r1AdjustmentResolutions`).
 */
export function r1AllRequestedAdjustmentsSaved(data: ApplicationData): boolean {
  const bundle = readPostSubmit(data);
  if (!bundle) return false;
  const { postSubmit } = bundle;
  const resolutions = data.r1AdjustmentResolutions ?? {};
  const adjustmentIds = REVIEW_WORKSPACE_BLOCK_IDS.filter(
    (id) => postSubmit.blocks[id]?.phase === "adjustment",
  );
  if (adjustmentIds.length === 0) return false;
  return adjustmentIds.every((id) => Boolean(resolutions[id]));
}

export type R1AdjustmentReleaseBuild = {
  workspaceReview: RecommendationWorkspaceReview;
};

/**
 * Nach R1-Freigabe: `adjustment` → `pending_after_adjustment` (Bemerkung bleibt
 * als `lockedRemark`), `confirmed` unverändert. Kommentar-Einträge zu
 * zurückgewiesenen Anpassungs-Blöcken entfallen (Bemerkung lebt im Block).
 */
export function buildWorkspaceReviewAfterR1AdjustmentRelease(
  data: ApplicationData,
): R1AdjustmentReleaseBuild | null {
  const bundle = readPostSubmit(data);
  if (!bundle || !r1AllRequestedAdjustmentsSaved(data)) return null;

  const { postSubmit, workspaceReview } = bundle;
  const prevBlocks = postSubmit.blocks;

  const nextBlocks = {} as Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot>;
  for (const id of REVIEW_WORKSPACE_BLOCK_IDS) {
    const entry = prevBlocks[id];
    if (!entry) {
      nextBlocks[id] = { phase: "confirmed" };
      continue;
    }
    if (entry.phase === "confirmed") {
      nextBlocks[id] = { phase: "confirmed" };
    } else if (entry.phase === "adjustment") {
      const remark =
        typeof entry.remark === "string" ? entry.remark : "";
      nextBlocks[id] = {
        phase: "pending_after_adjustment",
        lockedRemark: remark,
      };
    } else {
      nextBlocks[id] = entry;
    }
  }

  const stripCommentForBlock = (blockId: string) => {
    const bid = blockId as ReviewWorkspaceBlockId;
    const prev = prevBlocks[bid];
    return prev?.phase === "adjustment";
  };

  const baseComments = workspaceReview?.forwardedComments ?? [];
  const forwardedComments = baseComments.filter(
    (c) => !stripCommentForBlock(c.blockId),
  );

  const nextWorkspaceReview: RecommendationWorkspaceReview = {
    ...(workspaceReview ?? {}),
    draft: undefined,
    postSubmit: {
      forwardedAt: postSubmit.forwardedAt,
      blocks: nextBlocks,
    },
    forwardedComments,
  };

  return { workspaceReview: nextWorkspaceReview };
}
