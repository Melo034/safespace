import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Loading from "@/components/utils/Loading";
import Logo from "@/assets/safespacelogo.png";
import supabase from "@/server/supabase";
import {
  ADMIN_ROLE_KEY,
  clearAdminSession,
  loadAdminSession,
  syncAdminProfileFromSupabase,
  type AdminProfile,
  type AdminRole,
} from "@/hooks/authUtils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters"),
});


const readStoredAdmin = () => {
  if (typeof window === "undefined") {
    return { role: null as AdminRole | null, profile: null as AdminProfile | null };
  }
  try {
    const profile = loadAdminSession();
    const role = profile?.role ?? (localStorage.getItem(ADMIN_ROLE_KEY) as AdminRole | null) ?? null;
    return { role, profile };
  } catch {
    return { role: null as AdminRole | null, profile: null as AdminProfile | null };
  }
};

const Signin = ({ className, ...props }: React.ComponentProps<"div">) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string[]; password?: string[] }>({});
  const navigate = useNavigate();
  const [{ role: storedRole, profile: storedProfile }] = useState(readStoredAdmin);
  const [alreadyAdmin, setAlreadyAdmin] = useState(Boolean(storedRole && storedProfile));

  const checkSession = React.useCallback(() => {
    const { role, profile } = readStoredAdmin();
    if (role && profile) {
      setAlreadyAdmin(true);
      toast.info("You're already signed in as an admin.");
    } else {
      setAlreadyAdmin(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const sanitizedInputs = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
    };

    const result = loginSchema.safeParse(sanitizedInputs);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedInputs.email,
        password: sanitizedInputs.password,
      });

      if (authError) {
        const message = authError.message || "Invalid email or password";
        setFormErrors({ email: [message], password: [message] });
        toast.error(message);
        setLoading(false);
        return;
      }

      const profile = await syncAdminProfileFromSupabase();
      if (!profile) {
        await supabase.auth.signOut();
        clearAdminSession();
        const message = "No admin account is associated with these credentials.";
        setFormErrors({ email: [message], password: [message] });
        toast.error(message);
        setLoading(false);
        return;
      }

      if (profile.status === "suspended") {
        await supabase.auth.signOut();
        clearAdminSession();
        const message = "Your admin access is suspended. Please contact support.";
        setFormErrors({ email: [message] });
        toast.error(message);
        setLoading(false);
        return;
      }

      try {
        localStorage.setItem("ss.admin.lastLogin", new Date().toISOString());
      } catch (storageErr) {
        console.warn("Failed to persist admin last login", storageErr);
      }

      setAlreadyAdmin(true);
      toast.success("Login successful.");
      navigate("/admin-dashboard");
    } catch (err) {
      console.error(err);
      const error = err as { message?: string };
      const message = error.message || "Login failed. Please try again.";
      setFormErrors({ email: [message], password: [message] });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (field: "email" | "password", value: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === "email") setEmail(value);
    else setPassword(value);
  };

  return (
    <div>
      <Button
        variant="ghost"
        className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center gap-1 cursor-pointer"
        onClick={() => navigate("/auth/login")}
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="h-5 w-5 text-primary" />
        <span className="font-lora">Back</span>
      </Button>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-lora font-bold">Admin Login</h1>
                  <p className="text-balance font-pt-serif text-neutral-800">
                    Login to your Safe Space admin account
                  </p>
                </div>
                {alreadyAdmin && (
                  <div className="rounded-md border p-3 text-sm bg-muted/40">
                    You are already signed in.
                    <div className="mt-2 flex gap-2">
                      <Button type="button" onClick={() => navigate('/admin-dashboard')}>Go to dashboard</Button>
                      <Button type="button" variant="outline" onClick={() => navigate('/')}>Back to site</Button>
                    </div>
                  </div>
                )}
                <div className="grid gap-2 font-lexend-deca">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? "email-error" : undefined}
                  />
                  {formErrors.email && (
                    <p id="email-error" className="text-red-500 text-sm">{formErrors.email[0]}</p>
                  )}
                </div>
                <div className="grid gap-2 font-lexend-deca">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      aria-invalid={!!formErrors.password}
                      aria-describedby={formErrors.password ? "password-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size={"sm"}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password input" : "Show password input"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formErrors.password && (
                    <p id="password-error" className="text-red-500 text-sm">{formErrors.password[0]}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Password must be at least 8 characters.
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <Button type="submit" disabled={loading} aria-label="Submit login form">
                    {loading ? <Loading /> : null}
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </div>
            </form>
            <div className="relative hidden md:block">
              <img
                src={Logo}
                alt="Safe Space Logo"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signin;

