// src/utils/authUtils.ts
import supabase from "@/server/supabase";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

// Session timeout in milliseconds (e.g., 30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null); 
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const navigate = useNavigate();

  const handleLogout = useCallback(async (isAdminLogout = false) => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      navigate(isAdminLogout ? "/admin/login" : "/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout.");
    }
  }, [navigate]);

  const fetchUserRole = async (uid: string) => {
    // Determine role based on admin_members membership; default to null for community members
    const { data, error } = await supabase
      .from("admin_members")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    if (error && (error as any).code !== "PGRST116") return null;
    if (!data) return null; // not an admin
    // if role column exists, return it, else default to 'admin'
    return (data as any).role ?? "admin";
  };

  useEffect(() => {
    const unsubscribe = supabase.auth.onAuthStateChange(async (_event, session) => {
      const path = window.location.pathname;
      setUser(session?.user || null);

      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        setLoading(false);

        const isAdmin = ["admin", "super_admin", "moderator"].includes(role || "");
        const isAdminRoute = path.startsWith("/admin-dashboard");
        const isAuthRoute = path.startsWith("/auth");

        // Protect admin dashboard
        if (isAdminRoute && !isAdmin) {
          toast.error("You do not have admin access.");
          navigate("/admin/login");
        }

        // If admin logs into public routes, optionally redirect
        if (!isAdminRoute && isAdmin && !isAuthRoute) {
          // Optional: Automatically send admins to dashboard
          navigate("/admin-dashboard");
        }

      } else {
        // User is not logged in
        setUserRole(null);
        setLoading(false);

        const isAdminRoute = path.startsWith("/admin-dashboard");

        // Redirect only if accessing protected pages
        if (isAdminRoute) {
          navigate("/admin/login");
        }
        // Allow public pages and auth pages without redirect
      }
    });

    // Session timeout logic
    const checkSessionTimeout = () => {
      const inactiveTime = Date.now() - lastActivity;
      if (inactiveTime > SESSION_TIMEOUT && user) {
        handleLogout();
        toast.info("Session expired due to inactivity.");
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute
    const updateActivity = () => setLastActivity(Date.now());

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);

    return () => {
      unsubscribe.data.subscription.unsubscribe();
      clearInterval(interval);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [navigate, lastActivity, handleLogout, user]);

  return { user, userRole, loading, handleLogout };
}
