type HfStatusBadgeState =
  | "draft"
  | "consultation_recommendation"
  | "in_review"
  | "needs_adjustment"
  | "in_decision"
  | "approved"
  | "rejected";

/**
 * Status badge utility classes — High Fidelity palettes.
 * Single source for `application-status.ts`; do not duplicate in components.
 */
export const hfStatusBadgeClassR1: Record<HfStatusBadgeState, string> = {
  draft: "bg-entwurf-100 text-entwurf-500",
  consultation_recommendation: "bg-beratung-100 text-beratung-500",
  /** R1 «In Review» — HF In Review 50/800. */
  in_review: "bg-in-review-50 text-in-review-800",
  needs_adjustment: "bg-adjustment-100 text-adjustment-500",
  in_decision: "bg-in-decision-100 text-in-decision-500",
  approved: "bg-bewilligt-100 text-bewilligt-700",
  rejected: "bg-abgelehnt-200 text-abgelehnt-700",
};

/** R2/R4 Workspace — «Review erforderlich» = HF Erforderlich 100/600 (`adjustment-*`). */
export const hfStatusBadgeClassR2: Record<HfStatusBadgeState, string> = {
  ...hfStatusBadgeClassR1,
  in_review: "bg-adjustment-100 text-adjustment-600",
};

/** @deprecated Prefer `getHfStatusBadgeClass(state, audience)`. */
export const hfStatusBadgeClass: Record<HfStatusBadgeState, string> =
  hfStatusBadgeClassR1;

/** R2: Empfehlung freigegeben — neutral stone (HF Graustufen). */
export const hfRecommendationReleasedBadgeClass =
  "bg-stone-100 text-stone-500";

/** Header-Callouts: gleiche bg/text wie Status-Badge (optional R4 muted). */
export function hfStatusCalloutClasses(
  badgeClassName: string,
  options?: { muted?: boolean },
): { containerClass: string; textClass: string; iconClass: string } {
  if (options?.muted) {
    return {
      containerClass: "rounded-lg bg-muted px-4 py-3",
      textClass: "min-w-0 flex-1 text-sm font-medium leading-5 text-muted-foreground",
      iconClass: "size-4 text-muted-foreground",
    };
  }

  const parts = badgeClassName.split(/\s+/).filter(Boolean);
  const bg = parts.find((c) => c.startsWith("bg-")) ?? "bg-muted";
  const text = parts.find((c) => c.startsWith("text-")) ?? "text-foreground";

  return {
    containerClass: `rounded-lg px-4 py-3 ${bg}`,
    textClass: `min-w-0 flex-1 text-sm font-medium leading-5 ${text}`,
    iconClass: `size-4 ${text}`,
  };
}
