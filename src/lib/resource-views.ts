import supabase from "@/server/supabase";

/**
 * Tracks a unique resource view.
 * - If user is authenticated and RPC 'track_resource_view' exists: server-enforced uniqueness by (resource_id, user_id).
 * - Otherwise: client-side de-dup via localStorage, one view per device.
 */
export async function trackResourceView(resourceId: string) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const uid = session?.session?.user?.id ?? null;
    if (uid) {
      // Try RPC if present (migration adds it). Ignore failures silently.
      await supabase.rpc("track_resource_view", { p_resource_id: resourceId });
      return;
    }
  } catch (e) {
    // ignore; fallback to client de-dup
  }

  // Client-side fallback for anon users
  const LS_KEY = "ss.resources.viewed";
  try {
    const raw = localStorage.getItem(LS_KEY);
    const viewed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    if (viewed[resourceId]) return;
    viewed[resourceId] = true;
    localStorage.setItem(LS_KEY, JSON.stringify(viewed));
    // If you must sync a simple counter on the row, do it here guardedly (optional):
    // await supabase.from('resources').update({ views: supabase.sql`views + 1` }).eq('id', resourceId);
  } catch {
    // ignore
  }
}

