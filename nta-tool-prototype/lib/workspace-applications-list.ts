import { type UserRole } from "@/lib/auth";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { tryCreateServiceRoleClient } from "@/utils/supabase/service-role";
import { type SupabaseClient } from "@supabase/supabase-js";

const SELECT =
  "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)";

/**
 * Lädt die Workspace-Antragsliste. Für **R4** optional per Service-Role, wenn gesetzt — umgeht
 * RLS, falls die DB-Policy R4 noch nicht enthält (Prototyp; in Produktion Policy erweitern).
 */
export async function fetchWorkspaceApplicationsList(
  sessionClient: SupabaseClient,
  role: UserRole,
): Promise<WorkspaceApplication[]> {
  if (role === "R4") {
    const admin = tryCreateServiceRoleClient();
    if (admin) {
      const { data, error } = await admin
        .from("applications")
        .select(SELECT)
        .order("updated_at", { ascending: false });
      if (!error && data) {
        return data as WorkspaceApplication[];
      }
    }
  }

  const { data, error } = await sessionClient
    .from("applications")
    .select(SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[workspace-applications-list]", error.message);
  }
  return (data ?? []) as WorkspaceApplication[];
}
