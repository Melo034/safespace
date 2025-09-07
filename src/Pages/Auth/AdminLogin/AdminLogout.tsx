import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/server/supabase";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdminLogout = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const user = data.session?.user;
      setIsAuthenticated(!!user);
      setChecked(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") {
        navigate("/admin/login");
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out of admin.");
      navigate("/admin/login");
    } catch (e) {
      console.error(e);
      toast.error("Failed to sign out. Try again.");
    } finally {
      setIsSigningOut(false);
    }
  }, [navigate]);

  useEffect(() => {
    // When session status is known
    if (!checked) return;
    if (isAuthenticated) {
      // Auto sign-out for admins
      handleSignOut();
    } else {
      // Already signed out -> go to admin login
      navigate("/admin/login");
    }
  }, [checked, isAuthenticated, navigate, handleSignOut]);

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


