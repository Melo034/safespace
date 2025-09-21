import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import supabase from "@/server/supabase";
import { clearAdminSession, loadAdminSession } from "@/hooks/authUtils";

const AdminLogout = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const profile = loadAdminSession();
      setIsAuthenticated(Boolean(profile));
    } catch {
      setIsAuthenticated(false);
    } finally {
      setChecked(true);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      let uid: string | null = null;
      try {
        const profile = loadAdminSession();
        uid = profile?.user_id ?? null;
      } catch {
        uid = null;
      }

      await supabase.auth.signOut();
      clearAdminSession();
      localStorage.removeItem("ss.admin.lastLogin");
      localStorage.removeItem("ss.auth");
      localStorage.removeItem("ss.member");
      if (uid) {
        localStorage.removeItem(`ss.member.${uid}`);
      }

      toast.success("Signed out of admin.");
      navigate("/admin/login", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Failed to sign out. Try again.");
    } finally {
      setIsSigningOut(false);
      setIsAuthenticated(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!checked) return;
    if (isAuthenticated) {
      handleSignOut();
    } else {
      navigate("/admin/login", { replace: true });
    }
  }, [checked, isAuthenticated, handleSignOut, navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <p className="text-lg">Signing out…</p>
        <Button onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing out</span>
          ) : (
            "Sign out now"
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin-dashboard")} disabled={isSigningOut}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AdminLogout;
