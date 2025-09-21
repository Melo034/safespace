import { useCallback, useEffect, useState } from 'react';
import supabase from '@/server/supabase';
import {
  ADMIN_PROFILE_KEY,
  ADMIN_ROLE_KEY,
  ADMIN_SESSION_EVENT,
  type AdminProfile,
  clearAdminSession,
  loadAdminSession,
  syncAdminProfileFromSupabase,
} from '@/hooks/authUtils';

export function useAdminSession() {
  const [profile, setProfile] = useState<AdminProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    return loadAdminSession();
  });
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    setProfile(loadAdminSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const synced = await syncAdminProfileFromSupabase();
      if (!active) return;
      if (synced) {
        setProfile(synced);
      } else {
        setProfile(loadAdminSession());
      }
      setLoading(false);
    };

    hydrate();

    if (typeof window === 'undefined') {
      return () => {
        active = false;
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ADMIN_PROFILE_KEY || event.key === ADMIN_ROLE_KEY) {
        syncProfile();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        const updated = await syncAdminProfileFromSupabase();
        if (!active) return;
        setProfile(updated ?? loadAdminSession());
      } else {
        clearAdminSession();
        setProfile(null);
      }
      setLoading(false);
    });

    window.addEventListener('storage', handleStorage);
    window.addEventListener(ADMIN_SESSION_EVENT, syncProfile as EventListener);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ADMIN_SESSION_EVENT, syncProfile as EventListener);
      authListener?.subscription.unsubscribe();
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
