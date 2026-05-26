import { type UserRole } from "@/lib/auth";
import { filterWorkspaceApplicationsForRole } from "@/lib/workspace-application-visibility";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { type SupabaseClient } from "@supabase/supabase-js";

const SELECT =
  "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)";

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
  return filterWorkspaceApplicationsForRole(rows, role);
}
