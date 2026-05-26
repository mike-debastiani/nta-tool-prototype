import type { ApplicationStatus } from "@/lib/application-status";
import { type UserRole } from "@/lib/auth";
import { usesR4OnlyHomeLayout } from "@/lib/workspace-role";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { type SupabaseClient } from "@supabase/supabase-js";

const SELECT =
  "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)";

/**
 * R4 Home: alle eingegangenen Anträge der sichtbaren Fakultät(en).
 * RLS (`r4_application_in_department_scope`) filtert bereits nach Fakultät/Studiengang.
 */
const R4_WORKSPACE_HOME_STATUSES: readonly ApplicationStatus[] = [
  "submitted",
  "in_review",
  "needs_correction",
  "in_implementation",
  "approved",
  "rejected",
];

function filterR4WorkspaceHomeList(rows: WorkspaceApplication[]): WorkspaceApplication[] {
  const allow = new Set(R4_WORKSPACE_HOME_STATUSES);
  return rows.filter((row) => allow.has(row.status));
}

function applicationsListQuery(client: SupabaseClient) {
  return client.from("applications").select(SELECT).order("updated_at", { ascending: false });
}

/**
 * Lädt die Workspace-Antragsliste.
 * **R4:** Lesen über Session + RLS (Fakultäts-Scope in der DB). Kein Service-Role-Fallback,
 * damit die Liste nicht durch einen fehlgeschlagenen Scope-Lookup leer wird.
 */
export async function fetchWorkspaceApplicationsList(
  sessionClient: SupabaseClient,
  role: UserRole,
): Promise<WorkspaceApplication[]> {
  const { data, error } = await applicationsListQuery(sessionClient);

  if (error) {
    console.error("[workspace-applications-list]", error.message, error.details, error.hint);
    return [];
  }

  const rows = (data ?? []) as WorkspaceApplication[];
  if (!usesR4OnlyHomeLayout(role)) return rows;

  return filterR4WorkspaceHomeList(rows);
}
