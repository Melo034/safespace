import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: localStorage,
    storageKey: "ss.supabase.auth", // unique key to avoid conflicts
  },
   global: {
      headers: { "x-client-info": "safe-space-web" },
    },
});

export default supabase;
