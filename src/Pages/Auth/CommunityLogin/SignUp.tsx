import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast, Toaster } from "sonner";
import { z } from "zod";
import supabase from "@/server/supabase";
import Logo from "@/assets/safespacelogo.png";

const signupSchema = z
  .object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email().max(255),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v === true, "You must agree to the Terms of Service and Privacy Policy"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function parseAuthError(err: unknown) {
  let message = "";
  let status: number | undefined;

  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    const m = rec.message;
    if (typeof m === "string") {
      message = m;
    } else if (m != null) {
      message = String(m);
    }

    const s = rec.status;
    if (typeof s === "number") {
      status = s;
    } else if (typeof s === "string") {
      const parsed = Number(s);
      if (!Number.isNaN(parsed)) status = parsed;
    }
  } else if (typeof err === "string") {
    message = err;
  } else if (err != null) {
    message = String(err);
  }

  const lower = message.toLowerCase();
  if (lower.includes("registered") || lower.includes("already")) return { field: "email", msg: "Email already exists" };
  if (lower.includes("invalid email")) return { field: "email", msg: "Invalid email address" };
  if (lower.includes("weak")) return { field: "password", msg: "Password is too weak" };
  if (status === 429) return { field: "email", msg: "Too many attempts. Try again later." };
  return { field: "_", msg: message || "Failed to create account" };
}

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    firstName?: string[];
    lastName?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    terms?: string[];
  }>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    const sanitized = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password: password.trim(),
      confirmPassword: confirmPassword.trim(),
      terms,
    };

    const result = signupSchema.safeParse(sanitized);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const display_name = `${sanitized.firstName} ${sanitized.lastName}`.replace(/\s+/g, " ").trim();
      const { data, error } = await supabase.auth.signUp({
        email: sanitized.email,
        password: sanitized.password,
        options: {
          data: { display_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      const session = data.session; // null when email confirmation is on

      if (session) {
        toast.success("Account created. Redirecting to login...", { duration: 2500 });
        setTimeout(() => navigate("/auth/login"), 2500);
      } else {
        toast.success("Check your email to confirm your account.");
        setTimeout(() => navigate("/auth/login"), 1500);
      }
    } catch (err) {
      const mapped = parseAuthError(err);
      if (mapped.field && mapped.field !== "_") setFormErrors({ [mapped.field]: [mapped.msg] });
      else toast.error(mapped.msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Link to="/" className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button variant="ghost" className="flex items-center gap-1 cursor-pointer" aria-label="Back to home">
          <ArrowLeft className="h-5 w-5 text-primary" />
          <span className="font-lora">Back</span>
        </Button>
      </Link>
      <div className="container px-4 py-8 md:px-6 max-w-6xl mx-auto">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <img src={Logo} alt="Safe Space Logo" className="mx-auto h-36 w-auto" />
            <h1 className="text-3xl font-bold font-lora">Join SafeSpace</h1>
            <p className="text-gray-600 mt-2 font-pt-serif">Create an account to join our supportive community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFormErrors((p) => ({ ...p, firstName: undefined }));
                  }}
                  required
                  aria-invalid={!!formErrors.firstName}
                  aria-describedby={formErrors.firstName ? "first-name-error" : undefined}
                />
                {formErrors.firstName && <p id="first-name-error" className="text-red-500 text-sm">{formErrors.firstName[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setFormErrors((p) => ({ ...p, lastName: undefined }));
                  }}
                  required
                  aria-invalid={!!formErrors.lastName}
                  aria-describedby={formErrors.lastName ? "last-name-error" : undefined}
                />
                {formErrors.lastName && <p id="last-name-error" className="text-red-500 text-sm">{formErrors.lastName[0]}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors((p) => ({ ...p, email: undefined }));
                }}
                required
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? "email-error" : undefined}
              />
              {formErrors.email && <p id="email-error" className="text-red-500 text-sm">{formErrors.email[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((p) => ({ ...p, password: undefined }));
                  }}
                  required
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? "password-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.password && <p id="password-error" className="text-red-500 text-sm">{formErrors.password[0]}</p>}
              <p className="text-xs text-gray-500">Password must be at least 8 characters and include a number and a special character.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFormErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }}
                  required
                  aria-invalid={!!formErrors.confirmPassword}
                  aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.confirmPassword && <p id="confirm-password-error" className="text-red-500 text-sm">{formErrors.confirmPassword[0]}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(checked) => {
                  setTerms(checked === true);
                  setFormErrors((p) => ({ ...p, terms: undefined }));
                }}
                required
                aria-invalid={!!formErrors.terms}
                aria-describedby={formErrors.terms ? "terms-error" : undefined}
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the <Link to="/terms" className="text-primary hover:underline" aria-label="Terms of Service">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline" aria-label="Privacy Policy">Privacy Policy</Link>
              </Label>
            </div>
            {formErrors.terms && <p id="terms-error" className="text-red-500 text-sm">{formErrors.terms[0]}</p>}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={isLoading} aria-label="Create Safe Space account">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account? <Link to="/auth/login" className="text-primary hover:underline" aria-label="Sign in to Safe Space">Sign in</Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Admin? <Link to="/admin/login" className="text-primary hover:underline" aria-label="Go to admin login">Go to Admin Login</Link>
            </p>
          </div>
        </div>
        <Toaster richColors position="top-center" closeButton={true} />
      </div>
    </div>
  );
};

export default SignUp;
