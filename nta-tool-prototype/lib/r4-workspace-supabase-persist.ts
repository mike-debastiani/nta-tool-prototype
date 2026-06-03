import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeApplicationDataWithR4Review } from "@/lib/r4-decision-state";
import type { UserRole } from "@/lib/auth";
import type { ApplicationData, R4DecisionReview } from "@/lib/test-flow-types";
import { hasR4WorkspaceCapabilities } from "@/lib/workspace-role";

export type R4WorkspacePersistFailure = {
  status: number;
  message: string;
};

async function assertWorkspaceR4User(
  supabase: SupabaseClient,
): Promise<R4WorkspacePersistFailure | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 401, message: "Nicht angemeldet." };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole }>();

  if (error) {
    return { status: 500, message: error.message };
  }
  if (!profile?.role || !hasR4WorkspaceCapabilities(profile.role)) {
    return {
      status: 403,
      message: "Keine Berechtigung für die Entscheidungsbearbeitung.",
    };
  }
  return null;
}

/**
 * R4-Zwischenstand / Block-Bestätigung direkt per Browser-Session schreiben
 * (umgeht fehleranfällige Cookie-SSR auf `/api/...`-Routen).
 */
export async function persistR4DecisionWithSupabaseClient(
  supabase: SupabaseClient,
  applicationId: string,
  incoming: R4DecisionReview,
): Promise<{ ok: true } | { ok: false; error: R4WorkspacePersistFailure }> {
  const authErr = await assertWorkspaceR4User(supabase);
  if (authErr) return { ok: false, error: authErr };

  const { data: row, error: fetchError } = await supabase
    .from("applications")
    .select("id,status,data")
    .eq("id", applicationId)
    .maybeSingle<{ id: string; status: string; data: ApplicationData }>();

  if (fetchError || !row) {
    return {
      ok: false,
      error: { status: 404, message: fetchError?.message ?? "Antrag nicht gefunden." },
    };
  }

  if (row.status !== "in_implementation") {
    return {
      ok: false,
      error: {
        status: 409,
        message: "Bearbeitung nur im Status «Entscheid erforderlich» möglich.",
      },
    };
  }

  const nextData = mergeApplicationDataWithR4Review(row.data, incoming);
  const { data: updatedRows, error: updateError } = await supabase
    .from("applications")
    .update({ data: nextData })
    .eq("id", applicationId)
    .select("id");

  if (updateError) {
    return { ok: false, error: { status: 500, message: updateError.message } };
  }
  if (!updatedRows?.length) {
    return {
      ok: false,
      error: {
        status: 500,
        message:
          "Speichern wurde nicht ausgeführt (0 Zeilen). Fehlt die RLS-Policy «applications_update_r4_decision»? Migration `20260514120000_applications_update_r4_decision.sql` anwenden.",
      },
    };
  }

  return { ok: true };
}

function rlsCompleteDecisionHint(message: string): string {
  if (!message.includes("row-level security")) return message;
  return `${message} Auf Supabase die Migration «20260603140000_r4_decision_allow_rejected_status.sql» anwenden (RLS-Zielstatus «rejected»/«approved»).`;
}

/**
 * Entscheid abschliessen (`approved` oder `rejected`).
 * Nutzt die API-Route (optional Service-Role), damit RLS in Dev-Umgebungen
 * ohne frische Migration nicht blockiert.
 */
export async function completeR4DecisionWithSupabaseClient(
  _supabase: SupabaseClient,
  applicationId: string,
  incoming: R4DecisionReview,
): Promise<{ ok: true } | { ok: false; error: R4WorkspacePersistFailure }> {
  let response: Response;
  try {
    response = await fetch("/api/applications/r4-complete-decision", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, r4DecisionReview: incoming }),
    });
  } catch {
    return {
      ok: false,
      error: { status: 500, message: "Netzwerkfehler beim Abschluss des Entscheids." },
    };
  }

  let payload: { error?: string } = {};
  try {
    payload = (await response.json()) as { error?: string };
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.error ?? `Abschluss fehlgeschlagen (${response.status}).`;
    return {
      ok: false,
      error: {
        status: response.status,
        message: rlsCompleteDecisionHint(message),
      },
    };
  }

  return { ok: true };
}
