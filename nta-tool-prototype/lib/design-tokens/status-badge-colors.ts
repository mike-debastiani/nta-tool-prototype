type HfStatusBadgeState =
  | "draft"
  | "consultation_recommendation"
  | "in_review"
  | "needs_adjustment"
  | "in_decision"
  | "approved"
  | "rejected";

/** «Beratung & Empfehlung» — Pills, Callouts, Zugewiesene Aufgaben «Beratungen», Wochen-Card. */
export const hfConsultationStatusSurfaceClass = "bg-consultation-surface";
export const hfConsultationStatusForegroundClass = "text-consultation-accent";
export const hfConsultationStatusBadgeClass = `${hfConsultationStatusSurfaceClass} ${hfConsultationStatusForegroundClass}`;

/** «In Review» / «Review erforderlich» (R1, R2, R4) — gleiche Kodierung überall. */
export const hfInReviewStatusSurfaceClass = "bg-beratung-100";
export const hfInReviewStatusForegroundClass = "text-beratung-500";
export const hfInReviewStatusBadgeClass = `${hfInReviewStatusSurfaceClass} ${hfInReviewStatusForegroundClass}`;

/**
 * Status badge utility classes — High Fidelity palettes.
 * Single source for `application-status.ts`; do not duplicate in components.
 */
export const hfStatusBadgeClassR1: Record<HfStatusBadgeState, string> = {
  draft: "bg-entwurf-100 text-entwurf-500",
  consultation_recommendation: hfConsultationStatusBadgeClass,
  in_review: hfInReviewStatusBadgeClass,
  needs_adjustment: "bg-adjustment-100 text-adjustment-600",
  in_decision: "bg-in-decision-100 text-in-decision-800",
  approved: "bg-bewilligt-100 text-bewilligt-700",
  rejected: "bg-abgelehnt-50 text-abgelehnt-600",
};

/** R2/R4: gleiche Farben wie R1 für Beratung & Review; nur Labels unterscheiden sich. */
export const hfStatusBadgeClassR2: Record<HfStatusBadgeState, string> = {
  ...hfStatusBadgeClassR1,
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
