// src/hooks/useAdminSession.ts
import { useCallback, useEffect, useState } from "react";
import supabase from "@/server/supabase";
import {
  ADMIN_PROFILE_KEY,
  ADMIN_ROLE_KEY,
  ADMIN_SESSION_EVENT,
  type AdminProfile,
  clearAdminSession,
  loadAdminSession,
} from "@/hooks/authUtils";

export function useAdminSession() {
  const [profile, setProfile] = useState<AdminProfile | null>(() => {
    if (typeof window === "undefined") return null;
    return loadAdminSession();
  });
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async () => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const cached = loadAdminSession();

    try {
      // Use server-trusted no-arg RPC
      const { data, error } = await supabase.rpc("admin_me");
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.status !== "active") {
        clearAdminSession();
        setProfile(null);
      } else {
        const updatedProfile: AdminProfile = {
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          username: row.username,
          status: row.status,
          join_date: row.join_date ?? row.created_at,
          last_active: row.last_active ?? null,
          avatar_url: row.avatar_url,
          bio: row.bio ?? null,
          teams: row.teams ?? [],
          created_at: row.created_at,
          updated_at: row.updated_at ?? row.created_at,
          role: row.role,
        };
        localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(updatedProfile));
        localStorage.setItem(ADMIN_ROLE_KEY, updatedProfile.role);
        setProfile(updatedProfile);
      }
    } catch (err) {
      // Keep cached profile for this render if one exists, but mark as not loading
      console.error("Error syncing admin profile:", err);
      if (!cached) {
        clearAdminSession();
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }
      await syncProfile();
      if (!active) return;
    };

    hydrate();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ADMIN_PROFILE_KEY || event.key === ADMIN_ROLE_KEY) {
        syncProfile();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ADMIN_SESSION_EVENT, syncProfile as unknown as EventListener);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ADMIN_SESSION_EVENT, syncProfile as unknown as EventListener);
    };
  }, [syncProfile]);

  return {
    profile,
    role: profile?.role ?? null,
    isSignedIn: !!profile,
    loading,
    refresh: syncProfile,
  } as const;
}
