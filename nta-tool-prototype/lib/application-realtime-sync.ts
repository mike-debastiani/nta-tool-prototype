/**
 * Cross-client sync for a single application row (R2 workspace → R1 portal).
 *
 * Uses Supabase Realtime **broadcast** (not `postgres_changes`), so it works
 * even when `public.applications` is not added to `supabase_realtime`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const APPLICATION_ROW_BROADCAST_EVENT = "application_row_updated" as const;

export function applicationRowBroadcastChannelName(applicationId: string): string {
  return `application-row:${applicationId}`;
}

/**
 * Fire-and-forget notify for other clients (e.g. R1) to refetch the row.
 * Never throws — a failed broadcast must not break the originating mutation.
 *
 * Uses **HTTP send before subscribe** (Supabase docs): avoids subscribe-state
 * edge cases and still delivers to other subscribed clients.
 *
 * `private: false` on the channel must match the listener config on R1.
 */
export async function broadcastApplicationRowUpdated(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<void> {
  try {
    const name = applicationRowBroadcastChannelName(applicationId);
    const channel = supabase.channel(name, {
      config: {
        private: false,
        broadcast: { ack: false, self: true },
      },
    });

    const result = await channel.send({
      type: "broadcast",
      event: APPLICATION_ROW_BROADCAST_EVENT,
      payload: { applicationId, at: Date.now() },
    });

    if (process.env.NODE_ENV === "development" && result !== "ok") {
      globalThis.console?.warn?.(
        "[broadcastApplicationRowUpdated] send returned:",
        result,
      );
    }

    await supabase.removeChannel(channel);
  } catch {
    // Intentionally swallow — DB update already succeeded.
  }
}
