// src/server/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  throw new Error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing");
}

const supabase = createClient(url, anon, {
  // You are not using auth.user
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "sb-community-auth",
    storage: undefined,
  },
  // Avoid auto WebSocket connect
  global: { headers: { "x-client-info": "safe-space-web" } },
});

export default supabase;
