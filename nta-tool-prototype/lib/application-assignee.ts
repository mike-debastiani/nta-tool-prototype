import type { CanonicalApplicationState } from "@/lib/application-status";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type ApplicationAssignee = {
  displayName: string;
  initials: string;
};

const R2_FALLBACK = "NTA Fachstelle";

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
const R4_FALLBACK = "Entscheidungsinstanz";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Wer den Antrag aktuell bearbeiten soll (Figma «Zugewiesen an»).
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

  if (canonicalState === "needs_adjustment") {
    const name = applicantDisplayName.trim() || "Antragsteller";
    return { displayName: name, initials: initialsFromName(name) };
  }

  if (canonicalState === "in_decision") {
    const name = r4ReviewerDisplayName?.trim() || R4_FALLBACK;
    return { displayName: name, initials: initialsFromName(name) };
  }

  if (
    canonicalState === "in_review"
    || canonicalState === "consultation_recommendation"
    || canonicalState === "draft"
  ) {
    const name = r2ReviewerDisplayName.trim() || R2_FALLBACK;
    return { displayName: name, initials: initialsFromName(name) };
  }

  return { displayName: "—", initials: "—" };
}
