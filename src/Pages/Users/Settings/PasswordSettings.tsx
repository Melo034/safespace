import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import { Footer } from "@/components/utils/Footer";
import Navbar from "@/components/utils/Navbar";
import Sidebar from "../Components/Sidebar";
import supabase from "@/server/supabase";
import Loading from "@/components/utils/Loading";

const PasswordSettings = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Initial auth check
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setError("You must be logged in to access this page.");
        navigate("/auth/login");
        return;
      }
      setLoading(false);
    })();

    // Keep in sync with auth state
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setError("You must be logged in to access this page.");
        navigate("/auth/login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[0-9]/.test(password)) return "Password must include at least one number.";
    if (!/[!@#$%^&*]/.test(password)) return "Password must include at least one special character.";
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      setIsSaving(false);
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setIsSaving(false);
      return;
    }

    try {
      // Re-authenticate by signing in again (Supabase requires a valid/refresh session; no explicit "reauth" API)
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("No authenticated user found.");

      const { error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signinErr) {
        throw new Error(signinErr.message || "Current password is incorrect.");
      }

      // Now update password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw new Error(updateErr.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);

      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.email || !user.id) throw new Error("No authenticated user found.");

      // Confirm password by signing in again
      const { error: signinErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (signinErr) throw new Error("Password is incorrect.");

      // Delete user profile data the client is allowed to remove (example: community_members row)
      // Adjust table name / cascades for your schema.
      await supabase.from("community_members").delete().eq("user_id", user.id);

      // Deleting the auth user requires a service role.
      // Call an Edge Function you control that uses the service key to delete the user.
      const { error: fnErr } = await supabase.functions.invoke("delete-user", {
        body: { user_id: user.id },
      });

      if (fnErr) {
        // If you haven't deployed the function yet, explain the situation clearly.
        toast.error("Account deletion incomplete", {
          description:
            "We removed your profile data, but removing the login requires a server function. Please contact support or set up the `delete-user` Edge Function.",
        });
      } else {
        toast.success("Account deleted", {
          description: "Your account has been successfully deleted.",
        });
      }

      // Sign out and redirect regardless (the auth user may have been removed by the function)
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setIsSaving(false);
      setDeletePassword("");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col mx-auto overflow-hidden justify-center items-center h-64">
              <Loading />
            </main>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error && !isChangingPassword && !isDeletingAccount) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <div className="container mx-auto px-4 py-20 text-center text-red-600">
              {error}
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <main className="flex w-full flex-col overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Security</h1>
            </div>

            <div className="space-y-8">
              {/* Password Change */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-medium">Password</h2>
                </div>

                {isChangingPassword ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4 pl-7">
                    {error && (
                      <p className="text-sm text-red-600" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        aria-required="true"
                        aria-describedby="password-requirements"
                      />
                      <p id="password-requirements" className="text-xs text-gray-500">
                        Password must be at least 8 characters and include a number and special character.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setError(null);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#0C713D] hover:bg-[#095e32]"
                        disabled={isSaving}
                      >
                        {isSaving ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="pl-7">
                    <p className="mb-4 text-gray-600">
                      We recommend changing your password regularly to keep your account secure.
                    </p>
                    <Button
                      className="bg-[#0C713D] hover:bg-[#095e32]"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                )}
              </div>

              {/* Delete Account */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-medium">Delete Account</h2>
                </div>

                {isDeletingAccount ? (
                  <form onSubmit={handleDeleteAccount} className="space-y-4 pl-7">
                    {error && (
                      <p className="text-sm text-red-600" role="alert">
                        {error}
                      </p>
                    )}
                    <p className="mb-4 text-gray-600">
                      Deleting your account is permanent and cannot be undone. This removes your profile and
                      related data we can delete from the client. Removing your login requires a server action.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">Enter Password to Confirm</Label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDeletingAccount(false);
                          setError(null);
                          setDeletePassword("");
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="destructive" disabled={isSaving}>
                        {isSaving ? "Deleting..." : "Delete Account"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="pl-7">
                    <p className="mb-4 text-gray-600">
                      Permanently delete your account and all associated data.
                    </p>
                    <Button variant="destructive" onClick={() => setIsDeletingAccount(true)}>
                      Delete Account
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
      <Toaster richColors position="top-center" closeButton={false} />
    </>
  );
};

export default PasswordSettings;
