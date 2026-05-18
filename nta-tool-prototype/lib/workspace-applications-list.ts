import type { ApplicationStatus } from "@/lib/application-status";
import { type UserRole } from "@/lib/auth";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { tryCreateServiceRoleClient } from "@/utils/supabase/service-role";
import { type SupabaseClient } from "@supabase/supabase-js";

const SELECT =
  "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)";

/** DB-Status, die R4 in der Inbox sieht (fachlich: Entscheid ausstehend, Bewilligt, Abgelehnt). */
const R4_WORKSPACE_LIST_STATUSES: readonly ApplicationStatus[] = [
  "in_implementation",
  "in_decision",
  "approved",
  "rejected",
];

function filterR4Inbox(rows: WorkspaceApplication[]): WorkspaceApplication[] {
  const allow = new Set(R4_WORKSPACE_LIST_STATUSES);
  return rows.filter((r) => allow.has(r.status));
}

function applicationsListQuery(client: SupabaseClient) {
  return client.from("applications").select(SELECT).order("updated_at", { ascending: false });
}

/**
 * Lädt die Workspace-Antragsliste. Für **R4** optional per Service-Role, wenn gesetzt — umgeht
 * RLS, falls die DB-Policy R4 noch nicht enthält (Prototyp; in Produktion Policy erweitern).
 *
 * R4-Inbox-Statusfilter passiert **nach** dem Select in TypeScript, damit PostgREST/Enum-Embed
 * nicht mit `.in("status", …)` leer zurückkommt.
 */
export async function fetchWorkspaceApplicationsList(
  sessionClient: SupabaseClient,
  role: UserRole,
): Promise<WorkspaceApplication[]> {
  if (role === "R4") {
    const admin = tryCreateServiceRoleClient();
    if (admin) {
      const { data, error } = await applicationsListQuery(admin);
      if (!error) {
        return filterR4Inbox((data ?? []) as WorkspaceApplication[]);
      }
    }
  }

  const { data, error } = await applicationsListQuery(sessionClient);

  if (error) {
    console.warn("[workspace-applications-list]", error.message);
  }

  const rows = (data ?? []) as WorkspaceApplication[];
  return role === "R4" ? filterR4Inbox(rows) : rows;
}
