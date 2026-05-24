import {
  deriveCanonicalApplicationState,
  type CanonicalApplicationState,
} from "@/lib/application-status";
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
    surfaceClass: "bg-beratung-100",
    labelClass: "text-beratung-500",
    metricClass: "text-beratung-500",
    deltaClass: "text-beratung-500",
  },
  reviews: {
    label: "Reviews",
    surfaceClass: "bg-adjustment-100",
    labelClass: "text-adjustment-600",
    metricClass: "text-adjustment-600",
    deltaClass: "text-adjustment-600",
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

function isAssignedToReviewer(
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
    if (!isAssignedToReviewer(application, reviewerDisplayName)) continue;

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
