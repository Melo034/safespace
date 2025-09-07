import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { z } from "zod";
import { debounce } from "lodash";
import supabase from "@/server/supabase";
import Logo from "@/assets/safespacelogo.png";

const passwordSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/,
      "Password must include a number and a special character"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  }>({});
  const [isValidLink, setIsValidLink] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // 1) If already signed in (recovery session), you're good to update
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setIsValidLink(true); return; }

      // 2) If link delivered tokens in the URL hash (#access_token/#refresh_token)
      const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        setIsValidLink(!error);
        return;
      }

      // 3) Fallback for magic-link "code" + "email" in query string
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get("code");
      const emailFromUrl = qs.get("email");
      if (code && emailFromUrl) {
        const { error } = await supabase.auth.verifyOtp({ email: emailFromUrl, token: code, type: "recovery" });
        setEmail(emailFromUrl);
        setIsValidLink(!error);
        return;
      }

      setIsValidLink(false);
    })();
  }, []);


  const handleSubmit = debounce(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    const sanitizedInputs = {
      email: email.trim() || undefined,
      password: password.trim(),
      confirmPassword: confirmPassword.trim(),
    };

    const result = passwordSchema.safeParse(sanitizedInputs);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      setIsLoading(false);
      return;
    }

    if (!sanitizedInputs.email) {
      setFormErrors({ email: ["Email is required to reset password"] });
      setIsLoading(false);
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (!code) throw new Error("Invalid or missing reset code");

      // Verify OTP to set the session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: sanitizedInputs.email,
        token: code,
        type: "recovery",
      });
      if (verifyError) throw verifyError;

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: sanitizedInputs.password,
      });
      if (updateError) throw updateError;

      toast.success("Your password has been reset. Please sign in.");
      navigate("/auth/login");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "invalid_otp") {
        setIsValidLink(false);
      } else if (error.code === "network_error") {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(error.message || "Failed to reset password.");
      }
    } finally {
      setIsLoading(false);
    }
  }, 300);

  if (!isValidLink) {
    return (
      <div className="container px-4 py-16 md:px-6 max-w-6xl mx-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-8">
            <img
              src={Logo}
              alt="SafeSpace Logo"
              className="mx-auto h-16 w-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-bold font-lora">Invalid Reset Link</h1>
            <p className="text-gray-600 mt-2 font-pt-serif">
              The password reset link is invalid or has expired.
            </p>
          </div>
          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-primary hover:underline"
              aria-label="Request a new password reset link"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-16 md:px-6 max-w-6xl mx-auto">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <img
            src={Logo}
            alt="SafeSpace Logo"
            className="mx-auto h-16 w-auto mb-4"
            aria-hidden="true"
          />
          <h1 className="text-3xl font-bold font-lora">Set New Password</h1>
          <p className="text-gray-600 mt-2 font-pt-serif">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!email && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
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
              Password must be at least 8 characters and include a number and a special character.
            </p>
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
                  setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                required
                aria-invalid={!!formErrors.confirmPassword}
                aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formErrors.confirmPassword && (
              <p id="confirm-password-error" className="text-red-500 text-sm">{formErrors.confirmPassword[0]}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/80"
            disabled={isLoading}
            aria-label="Reset password"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/auth/login" className="text-primary hover:underline" aria-label="Sign in to SafeSpace">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <Toaster richColors position="top-center" closeButton={true} />
    </div>
  );
};

export default ResetPassword;