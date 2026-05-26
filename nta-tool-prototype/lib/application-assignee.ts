import {
  deriveCanonicalApplicationState,
  type CanonicalApplicationState,
} from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import { isCombinedR2R4Role } from "@/lib/workspace-role";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type ApplicationAssignee = {
  displayName: string;
  initials: string;
};

const R2_FALLBACK = "NTA Fachstelle";
const R4_FALLBACK = "Entscheidungsinstanz";

/** Prototyp: R4-Name in Listen, wenn Viewer R2 ist (sollte zum R4-Test-`display_name` passen). */
export const WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME = R4_FALLBACK;

/** Prototyp: R2-Name in Listen, wenn Viewer R4 ist. */
export const WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME = R2_FALLBACK;

const APPLICANT_ASSIGNEE_STATES: ReadonlySet<CanonicalApplicationState> = new Set([
  "needs_adjustment",
  "approved",
  "rejected",
]);

const R2_ASSIGNEE_STATES: ReadonlySet<CanonicalApplicationState> = new Set([
  "in_review",
  "consultation_recommendation",
  "draft",
]);

/** Vor- und Nachname aus Step 1, sonst Profil. */
export function resolveApplicantDisplayName(application: WorkspaceApplication): string {
  const pd = application.data.personalData;
  const fromForm = pd ? `${pd.vorname ?? ""} ${pd.name ?? ""}`.trim() : "";
  if (fromForm) return fromForm;
  const u = application.users[0];
  if (u?.display_name?.trim()) return u.display_name.trim();
  if (u?.email?.trim()) return u.email.trim();
  return "Antragsteller";
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Prototyp: feste R2-/R4-Anzeigenamen je nach angemeldeter Rolle,
 * damit «Zugewiesen an» und «Meine Aufgaben» konsistent sind.
 */
export function resolveWorkspaceRoleAssigneeNames(options: {
  workspaceRole: UserRole;
  reviewerDisplayName: string;
}): { r2ReviewerDisplayName: string; r4ReviewerDisplayName: string } {
  const loggedIn = options.reviewerDisplayName.trim();
  const role = options.workspaceRole;

  const r2ReviewerDisplayName =
    role === "R2" || isCombinedR2R4Role(role)
      ? loggedIn || R2_FALLBACK
      : WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME;

  const r4ReviewerDisplayName =
    role === "R4" || role === "R3" || isCombinedR2R4Role(role)
      ? loggedIn || R4_FALLBACK
      : WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME;

  return { r2ReviewerDisplayName, r4ReviewerDisplayName };
}

/**
 * Wer den Antrag aktuell bearbeiten soll (Figma «Zugewiesen an»).
 *
 * - Anpassung erforderlich / Bewilligt / Abgelehnt → Antragsteller (Formularname)
 * - In Review / Beratung & Empfehlung → angemeldetes R2-Konto
 * - In Entscheid → angemeldetes R4-Konto
 */
export function resolveApplicationAssignee(options: {
  canonicalState: CanonicalApplicationState;
  applicantDisplayName: string;
  r2ReviewerDisplayName: string;
  r4ReviewerDisplayName?: string;
}): ApplicationAssignee {
  const {
    canonicalState,
    applicantDisplayName,
    r2ReviewerDisplayName,
    r4ReviewerDisplayName,
  } = options;

  if (APPLICANT_ASSIGNEE_STATES.has(canonicalState)) {
    const name = applicantDisplayName.trim() || "Antragsteller";
    return { displayName: name, initials: initialsFromDisplayName(name) };
  }

  if (canonicalState === "in_decision") {
    const name = r4ReviewerDisplayName?.trim() || R4_FALLBACK;
    return { displayName: name, initials: initialsFromDisplayName(name) };
  }

  if (R2_ASSIGNEE_STATES.has(canonicalState)) {
    const name = r2ReviewerDisplayName.trim() || R2_FALLBACK;
    return { displayName: name, initials: initialsFromDisplayName(name) };
  }

  return { displayName: "—", initials: "—" };
}

export function resolveApplicationAssigneeForWorkspace(
  application: WorkspaceApplication,
  options: {
    workspaceRole: UserRole;
    reviewerDisplayName: string;
  },
): ApplicationAssignee {
  const roleNames = resolveWorkspaceRoleAssigneeNames(options);
  return resolveApplicationAssignee({
    canonicalState: deriveCanonicalApplicationState(application),
    applicantDisplayName: resolveApplicantDisplayName(application),
    r2ReviewerDisplayName: roleNames.r2ReviewerDisplayName,
    r4ReviewerDisplayName: roleNames.r4ReviewerDisplayName,
  });
}

export function namesMatchAssignee(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
