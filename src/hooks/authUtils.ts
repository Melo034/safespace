import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import supabase from "@/server/supabase";

export const ADMIN_ROLE_KEY = 'ss.admin.role';
export const ADMIN_PROFILE_KEY = 'ss.admin.profile';
export const ADMIN_SESSION_EVENT = 'ss.admin.session';

export type AdminRole = 'super_admin' | 'admin' | 'moderator';
export type AdminStatus = 'active' | 'inactive' | 'suspended';

export type AdminProfile = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  username: string | null;
  status: AdminStatus;
  role: AdminRole;
  avatar_url: string | null;
};

type AdminMemberRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  username: string | null;
  status: AdminStatus | null;
  role: AdminRole | null;
  avatar_url: string | null;
};

const ADMIN_MEMBER_SELECT = "id,user_id,name,email,username,status,role,avatar_url";

export function saveAdminSession(profile: AdminProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_ROLE_KEY, profile.role);
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function loadAdminSession(): AdminProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_ROLE_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function isAdminSignedIn() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(ADMIN_PROFILE_KEY);
}

function mapAdminRowToProfile(row: AdminMemberRow, fallbackEmail: string | null, userId: string): AdminProfile {
  return {
    id: row.id,
    user_id: row.user_id ?? userId,
    name: row.name ?? "Admin",
    email: row.email ?? fallbackEmail ?? "",
    username: row.username ?? null,
    status: (row.status ?? "inactive") as AdminStatus,
    role: (row.role ?? "admin") as AdminRole,
    avatar_url: row.avatar_url ?? null,
  };
}

async function resolveAdminMember(user: User): Promise<AdminMemberRow | null> {
  const { data: byUserId, error: byUserIdError } = await supabase
    .from("admin_members")
    .select<AdminMemberRow>(ADMIN_MEMBER_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserIdError && byUserIdError.code !== "PGRST116") throw byUserIdError;
  if (byUserId) return byUserId;

  if (!user.email) return null;

  const { data: byEmail, error: byEmailError } = await supabase
    .from("admin_members")
    .select<AdminMemberRow>(ADMIN_MEMBER_SELECT)
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (byEmailError && byEmailError.code !== "PGRST116") throw byEmailError;
  return byEmail ?? null;
}

export async function syncAdminProfileFromSupabase(): Promise<AdminProfile | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Failed to read Supabase session", error);
      return loadAdminSession();
    }

    const user = data.user ?? null;
    if (!user) {
      clearAdminSession();
      return null;
    }

    const row = await resolveAdminMember(user);
    if (!row) {
      clearAdminSession();
      return null;
    }

    if (!row.user_id) {
      try {
        await supabase.from("admin_members").update({ user_id: user.id }).eq("id", row.id);
        row.user_id = user.id;
      } catch (updateErr) {
        console.warn("Failed to backfill admin user_id", updateErr);
      }
    }

    const profile = mapAdminRowToProfile(row, user.email ?? null, user.id);
    saveAdminSession(profile);
    return profile;
  } catch (err) {
    console.error("Failed to synchronise admin profile", err);
    return loadAdminSession();
  }
}

export function useAuth() {
  const [userRole, setUserRole] = useState<AdminRole | null>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem(ADMIN_ROLE_KEY) as AdminRole | null) ?? null;
  });
  const [loading, setLoading] = useState(true);

  const syncRole = useCallback(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(ADMIN_ROLE_KEY) as AdminRole | null;
    setUserRole(stored ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      await syncAdminProfileFromSupabase();
      if (!active) return;
      syncRole();
    };

    initialise();

    if (typeof window === 'undefined') return () => {
      active = false;
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ADMIN_ROLE_KEY || event.key === ADMIN_PROFILE_KEY) {
        syncRole();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      if (!active) return;
      await syncAdminProfileFromSupabase();
      if (!active) return;
      syncRole();
    });

    window.addEventListener('storage', handleStorage);
    window.addEventListener(ADMIN_SESSION_EVENT, syncRole as EventListener);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ADMIN_SESSION_EVENT, syncRole as EventListener);
      authListener?.subscription.unsubscribe();
    };
  }, [syncRole]);

  return {
    userRole,
    loading,
    isSignedIn: !!userRole,
  } as const;
}
