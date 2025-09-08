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

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters"),
});

type AdminMember = {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  username?: string | null;
  status?: string;
  avatar_url?: string | null;
  role?: string;
};

const Signin = ({ className, ...props }: React.ComponentProps<"div">) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string[]; password?: string[] }>({});
  const navigate = useNavigate();

  // Wrap checkSession in useCallback to avoid recreating it on every render
  const checkSession = React.useCallback(async () => {
    const { data: ures } = await supabase.auth.getUser();
    const user = ures.user;
    if (!user) return;
      // Only allow admins: check membership in admin_members
      const { data: adminRow, error } = await supabase
        .from("admin_members")
        .select("id,user_id,name,email,username,status,avatar_url,role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return;
      if (!adminRow) return;
      const admin = adminRow as AdminMember;
      localStorage.setItem("ss.admin.role", String(admin.role || "admin"));
      localStorage.setItem(
        "ss.admin.profile",
        JSON.stringify({
          id: admin.id,
          user_id: admin.user_id,
          name: admin.name ?? "Admin",
          email: admin.email ?? "",
          username: admin.username ?? null,
          status: admin.status ?? "active",
          avatar_url: admin.avatar_url ?? null,
        })
      );
      navigate("/admin-dashboard");
  }, [navigate]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const sanitizedInputs = {
      email: email.trim(),
      password: password.trim(),
    };

    const result = loginSchema.safeParse(sanitizedInputs);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedInputs.email,
        password: sanitizedInputs.password,
      });

      if (error) {
        throw error;
      }
      const user = data.user;

      // Guard: only allow if already present in admin_members
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_members")
        .select("id,user_id,name,email,username,status,avatar_url,role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminErr) throw adminErr;
      if (!adminRow) {
        await supabase.auth.signOut();
        toast.error("Not an admin account. Use the community login instead.");
        // Surface inline errors for clarity
        setFormErrors({ email: ["Not an admin account"], password: ["Not an admin account"] });
        return;
      }

      // Seed admin cache for instant dashboard access
      try {
        const admin = adminRow as AdminMember;
        localStorage.setItem("ss.admin.role", String(admin.role || "admin"));
        localStorage.setItem(
          "ss.admin.profile",
          JSON.stringify({
            id: admin.id,
            user_id: admin.user_id,
            name: admin.name ?? "Admin",
            email: admin.email ?? "",
            username: admin.username ?? null,
            status: admin.status ?? "active",
            avatar_url: admin.avatar_url ?? null,
          })
        );
      } catch {
        // Intentionally left blank: localStorage errors are non-critical
      }

      toast.success("Welcome back");
      navigate("/admin-dashboard");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let errorMessage = "Login failed. Please check your credentials.";
      switch (error.code) {
        case "invalid_credentials":
          errorMessage = "Invalid email or password";
          setFormErrors({ email: [errorMessage], password: [errorMessage] });
          break;
        case "rate_limit_exceeded":
          errorMessage = "Too many login attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
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
