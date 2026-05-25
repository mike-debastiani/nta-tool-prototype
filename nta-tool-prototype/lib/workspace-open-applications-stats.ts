import { deriveCanonicalApplicationState } from "@/lib/application-status";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type OpenApplicationsBucketId = "in_review" | "adjustment" | "in_decision";

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
  if (state === "in_review") return "in_review";
  if (state === "needs_adjustment") return "adjustment";
  if (state === "in_decision") return "in_decision";
  return null;
}

/** Zählt in KPI «Offene Antragsverfahren» (Total + Balken). */
function countsTowardOpenKpi(
  state: ReturnType<typeof deriveCanonicalApplicationState>,
): boolean {
  return (
    state === "in_review"
    || state === "needs_adjustment"
    || state === "in_decision"
  );
}

/** Offene Anträge nach Status-Cluster (Figma Dashboard «Offene Antragsverfahren»). */
export function computeOpenApplicationsStats(
  applications: WorkspaceApplication[],
): OpenApplicationsStats {
  const counts: Record<OpenApplicationsBucketId, number> = {
    in_review: 0,
    adjustment: 0,
    in_decision: 0,
  };

  for (const application of applications) {
    const state = deriveCanonicalApplicationState(application);
    if (!countsTowardOpenKpi(state)) continue;

    const bucket = bucketForCanonicalState(state);
    if (bucket) counts[bucket] += 1;
  }

  const buckets: OpenApplicationsBucket[] = [
    { id: "in_review", value: counts.in_review },
    { id: "adjustment", value: counts.adjustment },
    { id: "in_decision", value: counts.in_decision },
  ];

  return {
    total: buckets.reduce((sum, b) => sum + b.value, 0),
    buckets,
  };
}
