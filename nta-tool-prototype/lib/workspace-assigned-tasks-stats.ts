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
  namesMatchAssignee,
  resolveApplicationAssigneeForWorkspace,
} from "@/lib/application-assignee";
import type { UserRole } from "@/lib/auth";
import { isCombinedR2R4Role } from "@/lib/workspace-role";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type AssignedTaskBucketId = "beratungen" | "reviews" | "entscheidungen";

export type AssignedTaskBucket = {
  id: AssignedTaskBucketId;
  label: string;
  count: number;
  /** Neu heute in diesem Bucket (KPI: nur «+N», ohne separates «heute»-Label). */
  addedToday: number;
  surfaceClass: string;
  labelClass: string;
  metricClass: string;
  deltaClass: string;
};

export type AssignedTasksStats = {
  buckets: AssignedTaskBucket[];
};

const BUCKET_ORDER_R2: AssignedTaskBucketId[] = ["beratungen", "reviews"];
const BUCKET_ORDER_R2R4: AssignedTaskBucketId[] = [
  "beratungen",
  "reviews",
  "entscheidungen",
];
const BUCKET_ORDER_DECISION: AssignedTaskBucketId[] = ["entscheidungen"];

const BUCKET_META: Record<
  AssignedTaskBucketId,
  Omit<AssignedTaskBucket, "id" | "count" | "addedToday">
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

/** Antrag ist der angemeldeten Person als Bearbeitung zugewiesen (Figma «Zugewiesen an»). */
export function isApplicationAssignedToReviewer(
  application: WorkspaceApplication,
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): boolean {
  const { reviewerDisplayName, workspaceRole } = options;
  const canonicalState = deriveCanonicalApplicationState(application);

  if (
    canonicalState === "approved"
    || canonicalState === "rejected"
    || canonicalState === "needs_adjustment"
    || canonicalState === "draft"
  ) {
    return false;
  }

  const assignee = resolveApplicationAssigneeForWorkspace(application, {
    reviewerDisplayName,
    workspaceRole,
  });

  return namesMatchAssignee(assignee.displayName, reviewerDisplayName);
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

  if (isCombinedR2R4Role(workspaceRole)) {
    if (state === "consultation_recommendation") return "beratungen";
    if (state === "in_review") return "reviews";
    if (state === "in_decision") return "entscheidungen";
    return null;
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
  if (
    !isApplicationAssignedToReviewer(application, {
      reviewerDisplayName,
      workspaceRole,
    })
  ) {
    return false;
  }
  if (
    (workspaceRole === "R2" || isCombinedR2R4Role(workspaceRole))
    && isR2RecommendationReleased(application)
  ) {
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
  if (isCombinedR2R4Role(workspaceRole)) {
    return BUCKET_ORDER_R2R4;
  }
  if (workspaceRole === "R3" || workspaceRole === "R4") {
    return BUCKET_ORDER_DECISION;
  }
  return BUCKET_ORDER_R2;
}

function referenceDateForAssignedTask(application: WorkspaceApplication): Date {
  const submitted = application.data?.submittedAt;
  if (submitted) {
    const parsed = new Date(submitted);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(application.updated_at);
}

function isDateTodayDeCh(date: Date): boolean {
  const todayKey = new Date().toLocaleDateString("de-CH");
  return date.toLocaleDateString("de-CH") === todayKey;
}

/** Anträge im Bucket, die heute (Kalendertag de-CH) eingegangen sind. */
function countAssignedTasksAddedToday(
  applicationsInBucket: WorkspaceApplication[],
): number {
  return applicationsInBucket.filter((application) =>
    isDateTodayDeCh(referenceDateForAssignedTask(application)),
  ).length;
}

/**
 * Zugewiesene Aufgaben für die angemeldete Person (Figma `5483:11126`).
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
      addedToday: countAssignedTasksAddedToday(apps),
    };
  });

  return { buckets };
}
