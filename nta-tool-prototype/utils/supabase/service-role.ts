import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function serviceRoleOptions() {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  } as const;
}

/**
 * Gibt den Service-Role-Client zurück, wenn URL + Secret gesetzt sind — sonst `null`.
 * Ohne Secret kann die Route mit dem Session-Client weiterarbeiten (RLS kann dann weiterhin blockieren).
 */
export function tryCreateServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, serviceRoleOptions());
}

/**
 * Nur Server-seitig. Umgeht RLS — niemals an den Browser geben.
 * Wirft, wenn `SUPABASE_SERVICE_ROLE_KEY` fehlt.
 */
export function createServiceRoleClient() {
  const client = tryCreateServiceRoleClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return client;
}
