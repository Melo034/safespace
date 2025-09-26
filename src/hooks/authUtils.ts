// src/hooks/authUtils.ts
import supabase from "@/server/supabase";
import { useEffect, useState } from "react";

export const ADMIN_PROFILE_KEY = "ss.admin.profile";
export const ADMIN_ROLE_KEY = "ss.admin.role";
export const ADMIN_SESSION_EVENT = "ss.admin.session";

export type AdminRole = "super_admin" | "admin" | "moderator";

export type AdminProfile = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  username: string | null;
  status: "active" | "inactive" | "suspended";
  join_date: string;
  last_active: string | null;
  avatar_url: string | null;
  bio: string | null;
  teams: string[];
  created_at: string;
  updated_at: string;
  role: AdminRole;
};

export const loadAdminSession = (): AdminProfile | null => {
  try {
    const profile = localStorage.getItem(ADMIN_PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  } catch {
    return null;
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_PROFILE_KEY);
  localStorage.removeItem(ADMIN_ROLE_KEY);
  localStorage.removeItem("ss.admin.lastLogin");
};

export const syncAdminProfileFromSupabase = async (): Promise<AdminProfile | null> => {
  try {
    const { data, error } = await supabase.rpc("admin_me");
    if (error || !data) {
      clearAdminSession();
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.status !== "active") {
      clearAdminSession();
      return null;
    }

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
      role: row.role as AdminRole,
    };

    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(updatedProfile));
    localStorage.setItem(ADMIN_ROLE_KEY, updatedProfile.role);
    return updatedProfile;
  } catch {
    clearAdminSession();
    return null;
  }
};

/** Minimal role hook for gating UI */
export const useAuth = () => {
  const [userRole, setUserRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const profile = await syncAdminProfileFromSupabase();
      setUserRole(profile?.role ?? null);
      setLoading(false);
    };
    load();
  }, []);

  return { userRole, loading };
};
