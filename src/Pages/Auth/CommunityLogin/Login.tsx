import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import supabase from "@/server/supabase";
import Logo from "@/assets/safespacelogo.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

const AUTH_KEY = "ss.auth";
const MEMBER_LATEST_KEY = "ss.member";
const memberKey = (uid: string) => `ss.member.${uid}`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string[]; password?: string[] }>({});
  const navigate = useNavigate();

  async function ensureCommunityMember(userId: string, userEmail: string | null | undefined) {
    // Check membership
    const { data, error } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    // Create if missing
    if (!data) {
      const { error: insErr } = await supabase.from("community_members").insert({
        user_id: userId,
        email: (userEmail || "anonymous@example.com").trim(),
        // name has a DB default of 'Anonymous'
        // join_date has a DB default of now()
      });
      if (insErr) throw insErr;
    }

    // Seed navbar cache
    try {
      localStorage.setItem(memberKey(userId), "1");
      localStorage.setItem(MEMBER_LATEST_KEY, "1");
    } catch {
      // intentionally left blank: ignore localStorage errors
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    const sanitizedInputs = {
      email: email.trim(),
      password: password.trim(),
    };

    const result = loginSchema.safeParse(sanitizedInputs);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedInputs.email,
        password: sanitizedInputs.password,
      });
      if (error) throw error;

      const user = data.user;
      // Persist auth hint for navbar
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {
        // intentionally left blank: ignore localStorage errors
      }

      // If this is an admin account, redirect to admin login and do NOT create a community_members row
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_members")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminErr && adminErr.code !== "PGRST116") throw adminErr;
      if (adminRow) {
        toast.info("Admins must sign in via the admin login.", { duration: 3000 });
        setTimeout(() => navigate("/admin/login"), 3000);
        return;
      }

      // Ensure community membership row exists only for community users
      await ensureCommunityMember(user.id, user.email);

      // Done
      toast.success("Signed in successfully!");
      setEmail("");
      setPassword("");
      setTimeout(() => navigate("/stories"), 600);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error("Login error:", error);
      if (error.code === "invalid_credentials") {
        setFormErrors({ email: ["Invalid email or password"], password: ["Invalid email or password"] });
      } else if (error.code === "user_banned") {
        setFormErrors({ email: ["This account is disabled"] });
      } else if (error.code === "rate_limit_exceeded") {
        setFormErrors({ email: ["Too many attempts. Please try again later."] });
      } else if (error.code === "network_error") {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(error.message || "Failed to sign in. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      try {
        localStorage.setItem(AUTH_KEY, "0");
        localStorage.setItem(MEMBER_LATEST_KEY, "0");
      } catch {
        // intentionally left blank: ignore localStorage errors
      }
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <div>
      <Link to="/" className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button variant="ghost" className="flex items-center gap-1 cursor-pointer" aria-label="Return to homepage">
          <ArrowLeft className="h-5 w-5 text-primary" />
          <span className="font-lora">Back</span>
        </Button>
      </Link>
      <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        <div className="max-w-xl w-full mx-auto">
          <div className="text-center mb-8">
            <img
              src={Logo}
              alt="SafeSpace Logo"
              className="mx-auto h-36 w-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-bold font-lora">Welcome to SafeSpace</h1>
            <p className="text-gray-600 mt-2 font-pt-serif">Sign in to join our supportive community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? "email-error" : undefined}
              />
              {formErrors.email && (
                <p id="email-error" className="text-red-500 text-sm">{formErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline" aria-label="Reset password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? "password-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.password && (
                <p id="password-error" className="text-red-500 text-sm">{formErrors.password[0]}</p>
              )}
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/80"
              disabled={isLoading}
              aria-label="Sign in to SafeSpace"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-gray-600">
              New to SafeSpace?{" "}
              <Link to="/auth/signup" className="text-primary hover:underline" aria-label="Create a SafeSpace account">
                Create an account
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Administrator?{" "}
              <Link to="/admin/login" className="text-primary hover:underline" aria-label="Go to admin login">
                Go to Admin Login
              </Link>
            </p>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-primary"
              aria-label="Sign out to switch accounts"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Switch accounts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
