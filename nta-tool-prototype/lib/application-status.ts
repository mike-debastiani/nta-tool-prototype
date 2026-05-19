import {
  hfRecommendationReleasedBadgeClass,
  hfStatusBadgeClass,
} from "@/lib/design-tokens/status-badge-colors";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "needs_correction"
  | "needs_adjustment"
  | "in_decision"
  | "approved"
  | "rejected"
  | "in_implementation";

export type StatusAudience = "R1" | "R2" | "R4";

export type CanonicalApplicationState =
  | "draft"
  | "consultation_recommendation"
  | "in_review"
  | "needs_adjustment"
  | "in_decision"
  | "approved"
  | "rejected";

export type StatusDerivationInput = {
  status: ApplicationStatus;
  data?: {
    summary?: string;
    finalSubmitted?: boolean;
    submittedAt?: string;
    applicationDefinition?: unknown;
    consultation?: {
      status?: "booked" | "done";
    };
    recommendation?: {
      ready?: boolean;
      /** Gesetzt nach R2-Freigabe — nur für Badge-/Label-Overrides, nicht für Ableitung. */
      releasedHtml?: string;
    };
  } | null;
};

const canonicalStatusLabel: Record<CanonicalApplicationState, string> = {
  draft: "Entwurf",
  consultation_recommendation: "Beratung & Empfehlung",
  in_review: "In Review",
  needs_adjustment: "Anpassung erforderlich",
  in_decision: "In Entscheid",
  approved: "Bewilligt",
  rejected: "Abgelehnt",
};

const canonicalStatusLabelR2: Partial<Record<CanonicalApplicationState, string>> = {
  in_review: "Review erforderlich",
  needs_adjustment: "Anpassung angefordert",
};

const canonicalStatusLabelR4: Partial<Record<CanonicalApplicationState, string>> = {
  in_decision: "Entscheid ausstehend",
};

export const statusBadgeClass: Record<CanonicalApplicationState, string> =
  hfStatusBadgeClass;

const R2_RECOMMENDATION_RELEASED_BADGE_CLASS =
  hfRecommendationReleasedBadgeClass;

export function deriveCanonicalApplicationState(
  application: StatusDerivationInput,
): CanonicalApplicationState {
  if (application.status === "approved") return "approved";
  if (application.status === "rejected") return "rejected";
  if (application.status === "in_decision" || application.status === "in_implementation") {
    return "in_decision";
  }
  if (
    application.status === "needs_adjustment"
    || application.status === "needs_correction"
  ) {
    return "needs_adjustment";
  }

  const hasFinalSubmissionMarker = Boolean(application.data?.finalSubmitted);
  const hasSubmitted = Boolean(application.data?.submittedAt);
  const hasApplicationDefinition = Boolean(application.data?.applicationDefinition);
  const summaryLooksLikeInReview =
    application.data?.summary?.trim().toLowerCase() === "in review";
  const consultationStarted = Boolean(
    application.data?.consultation?.status || application.data?.recommendation?.ready,
  );
  const statusSuggestsFinalReview =
    application.status === "in_review"
    || (application.status === "submitted" && !consultationStarted);

  if (
    hasFinalSubmissionMarker
    || hasSubmitted
    || hasApplicationDefinition
    || (application.status === "in_review" && summaryLooksLikeInReview)
    || statusSuggestsFinalReview
  ) {
    return "in_review";
  }
  if (consultationStarted) {
    return "consultation_recommendation";
  }
  if (application.status === "in_review") {
    return "in_review";
  }
  return "draft";
}

export function getStatusLabelForAudience(
  state: CanonicalApplicationState,
  audience: StatusAudience = "R1",
) {
  if (audience === "R2" && canonicalStatusLabelR2[state]) {
    return canonicalStatusLabelR2[state] as string;
  }
  if (audience === "R4" && canonicalStatusLabelR4[state]) {
    return canonicalStatusLabelR4[state] as string;
  }
  return canonicalStatusLabel[state];
}

export function getApplicationStatusMeta(
  application: StatusDerivationInput,
  audience: StatusAudience = "R1",
) {
  const canonicalState = deriveCanonicalApplicationState(application);
  const recommendationReleased =
    Boolean(application.data?.recommendation?.releasedHtml?.trim());

  if (
    audience === "R2"
    && canonicalState === "consultation_recommendation"
    && recommendationReleased
  ) {
    return {
      canonicalState,
      label: "Empfehlung verfasst",
      className: R2_RECOMMENDATION_RELEASED_BADGE_CLASS,
    };
  }

  return {
    canonicalState,
    label: getStatusLabelForAudience(canonicalState, audience),
    className: statusBadgeClass[canonicalState],
  };
}

export type ApplicationStatusMeta = ReturnType<typeof getApplicationStatusMeta>;
