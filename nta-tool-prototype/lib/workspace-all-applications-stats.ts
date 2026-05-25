import { deriveCanonicalApplicationState } from "@/lib/application-status";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

/** R4 «Alle Anträge» — nur In Entscheid, Bewilligt, Abgelehnt (Figma `5948:27359`). */
export type AllApplicationsBucketId = "in_decision" | "approved" | "rejected";

export type AllApplicationsBucket = {
  id: AllApplicationsBucketId;
  value: number;
};

export type AllApplicationsStats = {
  total: number;
  buckets: AllApplicationsBucket[];
};

/** Alle Anträge nach Entscheidungs-Cluster (R4 Dashboard-Home). */
export function computeAllApplicationsStats(
  applications: WorkspaceApplication[],
): AllApplicationsStats {
  const counts: Record<AllApplicationsBucketId, number> = {
    in_decision: 0,
    approved: 0,
    rejected: 0,
  };

  for (const application of applications) {
    const state = deriveCanonicalApplicationState(application);
    if (state === "in_decision") counts.in_decision += 1;
    else if (state === "approved") counts.approved += 1;
    else if (state === "rejected") counts.rejected += 1;
  }

  const buckets: AllApplicationsBucket[] = [
    { id: "in_decision", value: counts.in_decision },
    { id: "rejected", value: counts.rejected },
    { id: "approved", value: counts.approved },
  ];

  return {
    total: buckets.reduce((sum, bucket) => sum + bucket.value, 0),
    buckets,
  };
}
