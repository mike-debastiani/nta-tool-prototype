import { deriveCanonicalApplicationState } from "@/lib/application-status";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type OpenApplicationsBucketId = "beratung" | "adjustment" | "in_decision";

export type OpenApplicationsBucket = {
  id: OpenApplicationsBucketId;
  value: number;
};

export type OpenApplicationsStats = {
  total: number;
  buckets: OpenApplicationsBucket[];
};

function bucketForCanonicalState(
  state: ReturnType<typeof deriveCanonicalApplicationState>,
): OpenApplicationsBucketId | null {
  if (state === "consultation_recommendation" || state === "in_review") {
    return "beratung";
  }
  if (state === "needs_adjustment") return "adjustment";
  if (state === "in_decision") return "in_decision";
  return null;
}

function isOpenApplication(application: WorkspaceApplication): boolean {
  const state = deriveCanonicalApplicationState(application);
  return state !== "approved" && state !== "rejected" && state !== "draft";
}

/** Offene Anträge nach Status-Cluster (Figma Dashboard «Offene Antragsverfahren»). */
export function computeOpenApplicationsStats(
  applications: WorkspaceApplication[],
): OpenApplicationsStats {
  const counts: Record<OpenApplicationsBucketId, number> = {
    beratung: 0,
    adjustment: 0,
    in_decision: 0,
  };

  for (const application of applications) {
    if (!isOpenApplication(application)) continue;
    const bucket = bucketForCanonicalState(deriveCanonicalApplicationState(application));
    if (bucket) counts[bucket] += 1;
  }

  const buckets: OpenApplicationsBucket[] = [
    { id: "beratung", value: counts.beratung },
    { id: "adjustment", value: counts.adjustment },
    { id: "in_decision", value: counts.in_decision },
  ];

  return {
    total: buckets.reduce((sum, b) => sum + b.value, 0),
    buckets,
  };
}
