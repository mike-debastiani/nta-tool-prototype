import type { UserRole } from "@/lib/auth";
import { hasR2WorkspaceCapabilities } from "@/lib/workspace-role";

/**
 * Workspace sidebar: «Beratungen planen».
 * - R2/R3/R2R4: visible (placeholder content for now)
 * - R4: hidden
 */
export function workspaceShowsConsultationPlannerNav(role: UserRole): boolean {
  return hasR2WorkspaceCapabilities(role) || role === "R3";
}

/** True when `?view=terminplaner` should render a dedicated page (not inbox fallback). */
export function workspaceShowsConsultationPlannerView(role: UserRole): boolean {
  return workspaceShowsConsultationPlannerNav(role);
}

/** Whether the consultation planner view has real UI beyond an empty shell. */
export function workspaceConsultationPlannerHasContent(_role: UserRole): boolean {
  return false;
}
