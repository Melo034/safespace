import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast} from "sonner";
import { z } from "zod";
import { debounce } from "lodash";
import supabase from "@/server/supabase";
import Logo from "@/assets/safespacelogo.png";

const emailSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate("/stories");
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = debounce(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const result = emailSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setFormError(result.error.flatten().fieldErrors.email?.[0] || "Invalid email");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success("We’ve sent a password reset link to your email. Please check your inbox.");
      setEmail("");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "user_not_found") {
        setFormError("No account found with this email.");
      } else if (error.code === "rate_limit_exceeded") {
        setFormError("Too many requests. Please try again later.");
      } else if (error.code === "network_error") {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(error.message || "Failed to send password reset email.");
      }
    } finally {
      setIsLoading(false);
    }
  }, 300);

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
          <h1 className="text-3xl font-bold font-lora">Reset Password</h1>
          <p className="text-gray-600 mt-2 font-pt-serif">
            Enter your email to receive a password reset link.
          </p>
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
                setFormError(null);
              }}
              required
              aria-invalid={!!formError}
              aria-describedby={formError ? "email-error" : undefined}
            />
            {formError && (
              <p id="email-error" className="text-red-500 text-sm">{formError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/80"
            disabled={isLoading}
            aria-label="Send password reset link"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
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
          <p className="text-sm text-gray-600 mt-2">
            Administrator?{" "}
            <Link to="/admin/login" className="text-primary hover:underline" aria-label="Go to admin login">
              Go to Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;