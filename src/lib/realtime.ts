import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to realtime changes safely. If the channel errors (adblock/offline),
 * it logs once and returns null so callers can degrade without user-facing toasts.
 */
export function subscribeSafely(
  supabase: SupabaseClient,
  channelName: string,
  params: { schema: string; table: string; event?: "*" | "INSERT" | "UPDATE" | "DELETE" },
  handler: () => void
): RealtimeChannel | null {
  const logOnce = (() => {
    let done = false;
    return (msg: string, ...args: unknown[]) => {
      if (!done) {
        console.warn(msg, ...args);
        done = true;
      }
    };
  })();

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: params.event ?? "*",
          schema: params.schema,
          table: params.table
        },
        handler
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          logOnce("Realtime unavailable; continuing without live updates.");
          supabase.removeChannel(channel);
        }
      });
    return channel;
  } catch (e) {
    logOnce("Realtime unavailable; continuing without live updates.", e);
    return null;
  }
}

