import {
  deriveCanonicalApplicationState,
  type CanonicalApplicationState,
} from "@/lib/application-status";
import {
  hfConsultationStatusForegroundClass,
  hfConsultationStatusSurfaceClass,
  hfInReviewStatusForegroundClass,
  hfInReviewStatusSurfaceClass,
} from "@/lib/design-tokens/status-badge-colors";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssignee,
} from "@/lib/application-assignee";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type AssignedTaskBucketId = "beratungen" | "reviews" | "entscheidungen";

export type AssignedTaskBucket = {
  id: AssignedTaskBucketId;
  label: string;
  count: number;
  /** Mock: neue Aufgaben seit letztem Login (Prototyp). */
  sinceLastLogin: number;
  surfaceClass: string;
  labelClass: string;
  metricClass: string;
  deltaClass: string;
};

export type AssignedTasksStats = {
  buckets: AssignedTaskBucket[];
};

const BUCKET_ORDER_R2: AssignedTaskBucketId[] = ["beratungen", "reviews"];
const BUCKET_ORDER_DECISION: AssignedTaskBucketId[] = ["entscheidungen"];

const BUCKET_META: Record<
  AssignedTaskBucketId,
  Omit<AssignedTaskBucket, "id" | "count" | "sinceLastLogin">
> = {
  beratungen: {
    label: "Beratungen",
    surfaceClass: hfConsultationStatusSurfaceClass,
    labelClass: hfConsultationStatusForegroundClass,
    metricClass: hfConsultationStatusForegroundClass,
    deltaClass: hfConsultationStatusForegroundClass,
  },
  reviews: {
    label: "Reviews",
    surfaceClass: hfInReviewStatusSurfaceClass,
    labelClass: hfInReviewStatusForegroundClass,
    metricClass: hfInReviewStatusForegroundClass,
    deltaClass: hfInReviewStatusForegroundClass,
  },
  entscheidungen: {
    label: "Entscheidungen",
    surfaceClass: "bg-in-decision-100",
    labelClass: "text-in-decision-500",
    metricClass: "text-in-decision-500",
    deltaClass: "text-in-decision-500",
  },
};

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function resolveR2ReviewerDisplayName(
  application: WorkspaceApplication,
  fallbackReviewerDisplayName: string,
): string {
  return application.data.recommendation?.releasedBy?.trim() || fallbackReviewerDisplayName;
}

/** Antrag ist der angemeldeten Person als Bearbeitung zugewiesen (Figma «Zugewiesen an»). */
export function isApplicationAssignedToReviewer(
  application: WorkspaceApplication,
  reviewerDisplayName: string,
): boolean {
  const canonicalState = deriveCanonicalApplicationState(application);
  if (
    canonicalState === "approved"
    || canonicalState === "rejected"
    || canonicalState === "draft"
  ) {
    return false;
  }

  const assignee = resolveApplicationAssignee({
    canonicalState,
    applicantDisplayName: resolveApplicantDisplayName(application),
    r2ReviewerDisplayName: resolveR2ReviewerDisplayName(application, reviewerDisplayName),
    r4ReviewerDisplayName: reviewerDisplayName,
  });

  return namesMatch(assignee.displayName, reviewerDisplayName);
}

/** R2: freigegebenes Empfehlungsschreiben → Badge «Empfehlung verfasst», keine offene Beratungsaufgabe. */
function isR2RecommendationReleased(application: WorkspaceApplication): boolean {
  if (deriveCanonicalApplicationState(application) !== "consultation_recommendation") {
    return false;
  }
  return Boolean(application.data?.recommendation?.releasedHtml?.trim());
}

function taskBucketForState(
  state: CanonicalApplicationState,
  workspaceRole: UserRole,
): AssignedTaskBucketId | null {
  if (workspaceRole === "R3" || workspaceRole === "R4") {
    return state === "in_decision" ? "entscheidungen" : null;
  }

  if (workspaceRole === "R2") {
    if (state === "consultation_recommendation") return "beratungen";
    if (state === "in_review") return "reviews";
    return null;
  }

  return null;
}

/**
 * Meine Aufgaben / KPI «Zugewiesene Aufgaben»:
 * - R2: `consultation_recommendation` (ohne «Empfehlung verfasst»), `in_review`
 * - R3/R4: `in_decision`
 * plus Zuweisung an `reviewerDisplayName`.
 */
export function isApplicationInMyTasksForRole(
  application: WorkspaceApplication,
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): boolean {
  const { reviewerDisplayName, workspaceRole } = options;
  if (!isApplicationAssignedToReviewer(application, reviewerDisplayName)) {
    return false;
  }
  if (workspaceRole === "R2" && isR2RecommendationReleased(application)) {
    return false;
  }
  const state = deriveCanonicalApplicationState(application);
  return taskBucketForState(state, workspaceRole) !== null;
}

export function filterMyTasksApplications(
  applications: WorkspaceApplication[],
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): WorkspaceApplication[] {
  return applications.filter((application) =>
    isApplicationInMyTasksForRole(application, options),
  );
}

function bucketOrderForRole(workspaceRole: UserRole): AssignedTaskBucketId[] {
  if (workspaceRole === "R3" || workspaceRole === "R4") {
    return BUCKET_ORDER_DECISION;
  }
  return BUCKET_ORDER_R2;
}

/** Deterministischer Mock für «+N seit letztem Login». */
function mockSinceLastLoginDelta(
  applicationsInBucket: WorkspaceApplication[],
): number {
  const count = applicationsInBucket.length;
  if (count === 0) return 0;

  const hash = applicationsInBucket.reduce(
    (acc, application) => acc + application.id.split("").reduce((h, c) => h + c.charCodeAt(0), 0),
    0,
  );
  const delta = 1 + (hash % Math.max(1, Math.min(count, 5)));
  return Math.min(count, delta);
}

/**
 * Zugewiesene Aufgaben für die angemeldete Person (Figma `5483:11126`).
 * Filter: `resolveApplicationAssignee` entspricht `reviewerDisplayName`.
 */
export function computeAssignedTasksStats(
  applications: WorkspaceApplication[],
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): AssignedTasksStats {
  const { reviewerDisplayName, workspaceRole } = options;
  const order = bucketOrderForRole(workspaceRole);
  const byBucket = new Map<AssignedTaskBucketId, WorkspaceApplication[]>(
    order.map((id) => [id, []]),
  );

  for (const application of applications) {
    if (
      !isApplicationInMyTasksForRole(application, {
        reviewerDisplayName,
        workspaceRole,
      })
    ) {
      continue;
    }

    const state = deriveCanonicalApplicationState(application);
    const bucketId = taskBucketForState(state, workspaceRole);
    if (!bucketId) continue;

    byBucket.get(bucketId)?.push(application);
  }

  const buckets: AssignedTaskBucket[] = order.map((id) => {
    const apps = byBucket.get(id) ?? [];
    const meta = BUCKET_META[id];
    return {
      id,
      ...meta,
      count: apps.length,
      sinceLastLogin: mockSinceLastLoginDelta(apps),
    };
  });

  return { buckets };
}
