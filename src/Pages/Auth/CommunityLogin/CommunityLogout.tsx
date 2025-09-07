import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import supabase from "@/server/supabase";
import Logo from "@/assets/safespacelogo.png";

const CommunityLogout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    // 1) Read current session first. Do not redirect yet.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      const user = data.session?.user;
      setIsAuthenticated(!!user);

      if (user) {
        try {
          const { data: adminRow, error } = await supabase
            .from("admin_members")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (error && (error as any).code !== "PGRST116") {
            console.error("admin check error:", error);
          } else if (adminRow) {
            setIsAdmin(true);
          }
        } catch (e) {
          console.error("admin check exception:", e);
        }
      }

      setIsCheckingAuth(false);
    })();

    // 2) Listen for real auth changes only
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          setIsAuthenticated(!!session?.user);
          break;
        case "SIGNED_OUT":
          setIsAuthenticated(false);
          navigate("/auth/login");
          break;
        // Ignore INITIAL_SESSION to avoid false logout on first paint
        default:
          break;
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleCommunityLogout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("You have signed out.");
      navigate(isAdmin ? "/admin/login" : "/auth/login");
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      const msg = e.message.includes("network_error")
        ? "Network error. Check your connection."
        : "Failed to sign out. Try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking authentication status" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8 ">
          <img src={Logo} alt="Safe Space Logo" className="mx-auto h-auto mb-4" aria-hidden="true" />
          <h1 className="text-3xl font-bold font-lora">Sign Out</h1>
          <p className="text-gray-600 mt-2 font-pt-serif">Are you sure you want to leave SafeSpace?</p>
        </div>

        <div className="space-y-6 mx-auto flex flex-col items-center">
          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={handleCommunityLogout}
              className="bg-primary hover:bg-primary/80"
              disabled={isLoading}
              aria-label="Sign out of SafeSpace"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing out...
                </span>
              ) : (
                "Sign Out"
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(isAdmin ? "/admin-dashboard" : "/stories")}
              disabled={isLoading}
              aria-label="Cancel and return to SafeSpace"
            >
              Cancel
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Changed your mind?{" "}
              <Link to="/" className="text-primary hover:underline" aria-label="Return to SafeSpace homepage">
                Return to homepage
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {isAdmin ? (
                <>
                  Admin?{" "}
                  <Link to="/admin-dashboard" className="text-primary hover:underline" aria-label="Return to admin dashboard">
                    Go to Admin Dashboard
                  </Link>
                </>
              ) : (
                <>
                  Community member?{" "}
                  <Link to="/" className="text-primary hover:underline" aria-label="Return to community stories">
                    Explore Stories
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityLogout;
