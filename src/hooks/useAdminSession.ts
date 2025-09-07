import { useEffect, useState, useCallback } from "react";
import supabase from "@/server/supabase";

type Role = "super_admin" | "admin" | "moderator" | "member" | null;

export type AdminProfile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  username: string | null;
  status: "active" | "inactive" | "suspended";
  avatar_url: string | null;
};

type AdminMemberRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  username: string | null;
  status: "active" | "inactive" | "suspended";
  avatar_url: string | null;
  created_at?: string;
  role?: Role;
};

export function useAdminSession() {
  const ADMIN_PROFILE_KEY = "ss.admin.profile";
  const ADMIN_ROLE_KEY = "ss.admin.role";

  const readJSON = (k: string) => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };

  const cachedProfile = (typeof window !== "undefined" ? readJSON(ADMIN_PROFILE_KEY) : null) as
    | AdminProfile
    | null;
  const cachedRole = (typeof window !== "undefined" ? (localStorage.getItem(ADMIN_ROLE_KEY) as Role | null) : null);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>(cachedRole ?? null);
  const [profile, setProfile] = useState<AdminProfile | null>(cachedProfile ?? null);
  const [userId, setUserId] = useState<string | null>(null);

  const persist = (nextRole: Role, nextProfile: AdminProfile | null) => {
    try {
      if (nextRole) localStorage.setItem(ADMIN_ROLE_KEY, String(nextRole));
      else localStorage.removeItem(ADMIN_ROLE_KEY);
      if (nextProfile) localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(nextProfile));
      else localStorage.removeItem(ADMIN_PROFILE_KEY);
    } catch {
      /* ignore */
    }
  };

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setRole(null);
        setProfile(null);
        persist(null, null);
        return;
      }
      // You need to fetch 'a' from your database or API before this block.
      // For example:
      const { data: adminData } = await supabase
        .from("admin_members")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (adminData) {
        const adminMember = adminData as AdminMemberRow;
        const r = adminMember.role;
        const nextRole = (r ?? "admin") as Role;
        const nextProfile: AdminProfile = {
          id: adminMember.id,
          user_id: adminMember.user_id,
          name: adminMember.name ?? "Admin",
          email: adminMember.email ?? "",
          username: adminMember.username ?? null,
          status: adminMember.status ?? "active",
          avatar_url: adminMember.avatar_url ?? null,
        };
        setRole(nextRole);
        setProfile(nextProfile);
        persist(nextRole, nextProfile);
      } else {
        // Definitively not in admin_members
        setProfile(null);
        setRole("member");
        persist("member", null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    read();
    const { data: sub } = supabase.auth.onAuthStateChange(() => read());
    return () => sub.subscription.unsubscribe();
  }, [read]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isAdmin = role === "admin" || role === "super_admin" || role === "moderator";
  const isSuperAdmin = role === "super_admin";

  return { loading, userId, role, isAdmin, isSuperAdmin, profile, signOut, refresh: read };
}

