import { deriveCanonicalApplicationState } from "@/lib/application-status";
import type { StatusAudience } from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

/** Fachstelle mit R2- und R4-Befugnissen (Figma `5949:3172` Dashboard_R2/R4). */
export function isCombinedR2R4Role(role: UserRole): boolean {
  return role === "R2R4";
}

export function hasR2WorkspaceCapabilities(role: UserRole): boolean {
  return role === "R2" || isCombinedR2R4Role(role);
}

export function hasR4WorkspaceCapabilities(role: UserRole): boolean {
  return role === "R4" || isCombinedR2R4Role(role);
}

/** Nur reine R4-Ansicht: 2 KPI-Karten (Alle Anträge + Zugewiesene Aufgaben). */
export function usesR4OnlyHomeLayout(role: UserRole): boolean {
  return role === "R4";
}

/** R2/R3/R2R4: drei KPI-Karten inkl. «Beratungen dieser Woche». */
export function usesR2StyleHomeLayout(role: UserRole): boolean {
  return role === "R2" || role === "R3" || isCombinedR2R4Role(role);
}

export function statusAudienceForWorkspaceApplication(
  role: UserRole,
  application: WorkspaceApplication,
): Extract<StatusAudience, "R2" | "R4"> {
  if (role === "R4") return "R4";
  if (
    isCombinedR2R4Role(role)
    && deriveCanonicalApplicationState(application) === "in_decision"
  ) {
    return "R4";
  }
  return "R2";
}
