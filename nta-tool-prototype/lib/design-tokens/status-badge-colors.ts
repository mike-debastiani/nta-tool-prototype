import type { CanonicalApplicationState } from "@/lib/application-status";

/**
 * Status badge utility classes — High Fidelity palettes (bg-*-100 + text-*-500/600/700).
 * Single source for `application-status.ts`; do not duplicate in components.
 */
export const hfStatusBadgeClass: Record<CanonicalApplicationState, string> = {
  draft: "bg-entwurf-100 text-entwurf-500",
  consultation_recommendation: "bg-beratung-100 text-beratung-500",
  in_review: "bg-in-review-100 text-in-review-500",
  needs_adjustment: "bg-adjustment-100 text-adjustment-500",
  in_decision: "bg-in-decision-100 text-in-decision-500",
  approved: "bg-bewilligt-100 text-bewilligt-700",
  rejected: "bg-abgelehnt-200 text-abgelehnt-700",
};

/** R2: Empfehlung freigegeben — neutral stone (HF Graustufen). */
export const hfRecommendationReleasedBadgeClass =
  "bg-stone-100 text-stone-500";
