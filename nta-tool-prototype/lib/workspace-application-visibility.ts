import {
  deriveCanonicalApplicationState,
  type ApplicationStatus,
} from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import {
  hasR2WorkspaceCapabilities,
  isCombinedR2R4Role,
  usesR4OnlyHomeLayout,
} from "@/lib/workspace-role";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

/**
 * Reine R4-Home-Liste: Entscheid (`in_implementation`) + Bewilligt + Abgelehnt.
 * Kanonisch «Entscheid erforderlich» = DB-Status `in_implementation` (nicht separates Enum `in_decision`).
 */
const R4_HOME_DB_STATUSES: readonly ApplicationStatus[] = [
  "in_implementation",
  "approved",
  "rejected",
];

/**
 * Nach RLS: optionale Client-Whitelist pro Rolle.
 * R2 / R2R4: kein Filter (Union aus `applications_select_r2_worklist` + ggf. R4).
 */
export function filterWorkspaceApplicationsForRole(
  rows: WorkspaceApplication[],
  role: UserRole,
): WorkspaceApplication[] {
  if (usesR4OnlyHomeLayout(role)) {
    const allow = new Set(R4_HOME_DB_STATUSES);
    return rows.filter((row) => allow.has(row.status));
  }

  if (hasR2WorkspaceCapabilities(role) && !isCombinedR2R4Role(role)) {
    return rows.filter((row) => {
      const state = deriveCanonicalApplicationState(row);
      return state !== "draft";
    });
  }

  return rows;
}

/** R4 / R2R4: DB-Status «Entscheid erforderlich» (technisch `in_implementation`). */
export function isR4DecisionEditableStatus(status: ApplicationStatus): boolean {
  return status === "in_implementation";
}

/** R4 / R2R4: Bearbeitung der Entscheidungs-UI (Schalter, Abschluss). */
export function canEditR4DecisionApplication(
  application: Pick<WorkspaceApplication, "status">,
): boolean {
  return isR4DecisionEditableStatus(application.status);
}
