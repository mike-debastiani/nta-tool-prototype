import type { CanonicalApplicationState } from "@/lib/application-status";
import {
  hfConsultationStatusBadgeClass,
  hfInReviewStatusBadgeClass,
} from "@/lib/design-tokens/status-badge-colors";

/** Status-Pills auf R1-Antragkarten — gleiche Kodierung wie Workspace (`getApplicationStatusMeta`). */
export const R1_CARD_STATUS_BADGE_CLASS: Record<CanonicalApplicationState, string> = {
  draft: "bg-entwurf-100 text-entwurf-800",
  consultation_recommendation: hfConsultationStatusBadgeClass,
  in_review: hfInReviewStatusBadgeClass,
  needs_adjustment: "bg-adjustment-100 text-adjustment-600",
  in_decision: "bg-in-decision-50 text-in-decision-800",
  approved: "bg-bewilligt-50 text-bewilligt-800",
  rejected: "bg-abgelehnt-50 text-abgelehnt-600",
};

export type R1CardVisualVariant =
  | "draft"
  | "consultation"
  | "in_review"
  | "needs_adjustment"
  | "in_decision"
  | "approved"
  | "rejected";

export type R1ProgressPalette =
  | "neutral"
  | "in_review"
  | "adjustment"
  | "in_decision"
  | "bewilligt"
  | "abgelehnt";

export type R1ProgressStepState = "pending" | "active" | "completed" | "failed";

export type R1ProgressStep = {
  id: "review" | "decision" | "provision";
  label: string;
  state: R1ProgressStepState;
  palette: R1ProgressPalette;
  /** Entwurf: alle Schritte ausgegraut (opacity 40). */
  dimmed?: boolean;
};

export type R1CardVisualConfig = {
  variant: R1CardVisualVariant;
  shellClass: string;
  titleClass: string;
  title: string;
  progressSteps: R1ProgressStep[];
};

const PROGRESS_LABELS = {
  review: "In Review",
  decision: "In Entscheid",
  provision: "Verfügung",
} as const;

function pendingStep(
  id: R1ProgressStep["id"],
  dimmed = false,
): R1ProgressStep {
  return {
    id,
    label: PROGRESS_LABELS[id],
    state: "pending",
    palette: "neutral",
    dimmed,
  };
}

function activeStep(
  id: R1ProgressStep["id"],
  palette: R1ProgressPalette,
): R1ProgressStep {
  return {
    id,
    label: PROGRESS_LABELS[id],
    state: "active",
    palette,
  };
}

function completedStep(id: R1ProgressStep["id"]): R1ProgressStep {
  return {
    id,
    label: PROGRESS_LABELS[id],
    state: "completed",
    palette: "neutral",
  };
}

export function r1CardVariantFromState(
  state: CanonicalApplicationState,
): R1CardVisualVariant {
  if (state === "draft") return "draft";
  if (state === "consultation_recommendation") return "consultation";
  if (state === "in_review") return "in_review";
  if (state === "needs_adjustment") return "needs_adjustment";
  if (state === "in_decision") return "in_decision";
  if (state === "approved") return "approved";
  if (state === "rejected") return "rejected";
  return "draft";
}

export function getR1CardVisualConfig(
  state: CanonicalApplicationState,
): R1CardVisualConfig {
  const variant = r1CardVariantFromState(state);

  switch (variant) {
    case "draft":
      return {
        variant,
        shellClass: "bg-entwurf-100",
        titleClass: "text-entwurf-900",
        title: "Antrag erstellen",
        progressSteps: [
          pendingStep("review", true),
          pendingStep("decision", true),
          pendingStep("provision", true),
        ],
      };
    case "consultation":
      return {
        variant,
        shellClass: "bg-entwurf-100",
        titleClass: "text-entwurf-900",
        title: "Antrag erstellen",
        progressSteps: [
          pendingStep("review"),
          pendingStep("decision"),
          pendingStep("provision"),
        ],
      };
    case "in_review":
      return {
        variant,
        shellClass: "bg-in-review-50",
        titleClass: "text-in-review-800",
        title: "Offenes Antragsverfahren",
        progressSteps: [
          activeStep("review", "in_review"),
          pendingStep("decision"),
          pendingStep("provision"),
        ],
      };
    case "needs_adjustment":
      return {
        variant,
        shellClass: "bg-adjustment-100",
        titleClass: "text-adjustment-600",
        title: "Offenes Antragsverfahren",
        progressSteps: [
          activeStep("review", "adjustment"),
          pendingStep("decision"),
          pendingStep("provision"),
        ],
      };
    case "in_decision":
      return {
        variant,
        shellClass: "bg-in-decision-100",
        titleClass: "text-in-decision-500",
        title: "Offenes Antragsverfahren",
        progressSteps: [
          completedStep("review"),
          activeStep("decision", "in_decision"),
          pendingStep("provision"),
        ],
      };
    case "approved":
      return {
        variant,
        shellClass: "bg-bewilligt-100",
        titleClass: "text-bewilligt-800",
        title: "Bewilligt",
        progressSteps: [
          completedStep("review"),
          completedStep("decision"),
          {
            id: "provision",
            label: PROGRESS_LABELS.provision,
            state: "completed",
            palette: "bewilligt",
          },
        ],
      };
    case "rejected":
      return {
        variant,
        shellClass: "bg-abgelehnt-100",
        titleClass: "text-abgelehnt-800",
        title: "Abgelehnt",
        progressSteps: [
          completedStep("review"),
          completedStep("decision"),
          {
            id: "provision",
            label: PROGRESS_LABELS.provision,
            state: "failed",
            palette: "abgelehnt",
          },
        ],
      };
    default:
      return getR1CardVisualConfig("draft");
  }
}

/** Aktive Progress-Palette → Tailwind-Klassen (Figma `5856:21926`). */
export const R1_PROGRESS_PALETTE_CLASS: Record<
  R1ProgressPalette,
  { circle: string; label: string }
> = {
  neutral: {
    circle: "bg-stone-150 text-muted-foreground",
    label: "text-muted-foreground",
  },
  in_review: {
    circle: "bg-in-review-50 text-beratung-800",
    label: "text-beratung-800",
  },
  adjustment: {
    circle: "bg-adjustment-100 text-adjustment-600",
    label: "text-adjustment-600",
  },
  in_decision: {
    circle: "bg-in-decision-100 text-in-decision-500",
    label: "text-in-decision-500",
  },
  bewilligt: {
    circle: "bg-bewilligt-50 text-bewilligt-800",
    label: "text-bewilligt-800",
  },
  abgelehnt: {
    circle: "bg-abgelehnt-50 text-abgelehnt-600",
    label: "text-abgelehnt-600",
  },
};
