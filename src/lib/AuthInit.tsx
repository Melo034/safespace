import { useEffect, useState } from "react";
import supabase from "@/server/supabase";

// Optional. Expose session app-wide if you want.
// You already call supabase.auth.getUser() in pages, so this can be lightweight.
export default function AuthInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Rehydrate on first mount.
    // Supabase reads from localStorage when persistSession=true.
    supabase.auth.getSession().finally(() => setReady(true));

    // Keep session fresh and synced across tabs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // No-op. You can hook analytics or state here if needed.
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  return null;
}
