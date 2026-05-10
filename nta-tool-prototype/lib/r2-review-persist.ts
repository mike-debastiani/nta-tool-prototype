import { type ApplicationData } from "@/lib/test-flow-types";

/** Trigger erlaubt R2 nur `consultation` / `recommendation` — keine Review-Wurzelfelder in `data`. */
export function dataWithoutLegacyReviewRoots(
  data: ApplicationData,
): Omit<
  ApplicationData,
  "reviewComments" | "r2PostSubmitReview" | "r2ReviewDraft"
> {
  const rest = { ...data };
  delete rest.reviewComments;
  delete rest.r2PostSubmitReview;
  delete rest.r2ReviewDraft;
  return rest;
}
