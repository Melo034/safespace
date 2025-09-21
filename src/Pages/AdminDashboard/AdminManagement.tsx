// AdminManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import supabase from "@/server/supabase";

import { useAuth, syncAdminProfileFromSupabase } from "@/hooks/authUtils";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminTable from "@/components/admin/AdminTable";
import AdminDialogs from "@/components/admin/AdminDialogs";
import AdminFilters from "@/components/admin/AdminFilters";
import Loading from "@/components/utils/Loading";
import type {
  Admin,
  AdminFormData,
  AdminStatus,
  RoleType,
  PageState,
} from "@/lib/types";
import AdminHeader from "@/components/admin/AdminHeader";

/** ===== Validation (UI only) ===== */
const adminSchema = z.object({
  user_id: z.string().uuid({ message: "Provide a valid user_id" }).optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  role: z
    .custom<RoleType>()
    .refine((v) => ["admin", "super_admin", "moderator"].includes(String(v))),
  status: z
    .custom<AdminStatus>()
    .refine((v) => ["active", "inactive", "suspended"].includes(String(v))),
});

const AdminManagement = () => {
  const { userRole, loading: authLoading } = useAuth();
  const { profile: currentAdmin, refresh: refreshAdminSession } = useAdminSession();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<AdminStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<RoleType | "all">("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const [formData, setFormData] = useState<
    AdminFormData & { avatarFile?: File | null }
  >({
    user_id: "",
    name: "",
    email: "",
    role: "admin",
    status: "active",
    password: "",
    avatarFile: null,
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof AdminFormData, string>>
  >({});

  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [pageState, setPageState] = useState<PageState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const from = useMemo(
    () => (pageState.page - 1) * pageState.pageSize,
    [pageState]
  );
  const to = useMemo(() => from + pageState.pageSize - 1, [from, pageState.pageSize]);

  /** ===== Helpers ===== */
  const hasPerm = (action: "add" | "edit" | "delete", targetRole: RoleType) => {
    if (!userRole) return false;
    if (userRole === "super_admin") return true;
    if (userRole === "admin") return targetRole !== "super_admin";
    if (userRole === "moderator") return action === "edit" && targetRole === "moderator";
    return false;
  };

  const isDbErrorWithCode = (err: unknown): err is { code: string } => {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as Record<string, unknown>).code === "string"
    );
  };

  const validateForm = (data: Partial<AdminFormData>) => {
    try {
      adminSchema.parse({
        user_id: data.user_id || undefined,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
      });
      setFormErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const errs: Partial<Record<keyof AdminFormData, string>> = {};
        e.issues.forEach((iss) => {
          const key = iss.path[0] as keyof AdminFormData;
          errs[key] = iss.message;
        });
        setFormErrors(errs);
      }
      return false;
    }
  };

  /** ===== Data load via RPC ===== */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const q = debouncedSearch || null;
        const s = filterStatus === "all" ? null : filterStatus;
        const r = filterRole === "all" ? null : filterRole;

        const { data, error } = await supabase.rpc("admin_list", {
          p_search: q,
          p_status: s,
          p_role: r,
          p_from: from,
          p_to: to,
        });
        if (error) throw error;

        if (!alive) return;

        const rows = (data ?? []) as Array<{
          id: string;
          user_id: string | null;
          name: string | null;
          email: string | null;
          username: string | null;
          status: string | null;
          role: string | null;
          avatar_url: string | null;
          created_at: string | null;
          total_count: number;
        }>;

        const mapped: Admin[] = rows.map((a) => ({
          id: a.id,
          user_id: a.user_id ?? null,
          name: a.name ?? "Admin",
          email: a.email ?? "",
          role: (a.role ?? "admin") as RoleType,
          status: (a.status as AdminStatus) ?? "active",
          created_at: a.created_at ?? new Date().toISOString(),
          avatar: a.avatar_url ?? undefined,
        }));

        setAdmins(mapped);
        const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
        setPageState((s0) => ({ ...s0, total }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load admins.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [from, to, filterStatus, filterRole, debouncedSearch]);

  /** ===== CRUD via RPCs ===== */

  // Create
  const handleAddAdmin = async () => {
    const payload = {
      user_id: formData.user_id?.trim() || undefined,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role as RoleType,
      status: formData.status as AdminStatus,
    };

    if (!validateForm(payload)) return;
    if (!hasPerm("add", payload.role)) {
      toast.error("No permission.");
      return;
    }

    const rawPassword = formData.password?.trim() ?? "";
    if (rawPassword.length < 8) {
      setFormErrors((prev) => ({
        ...prev,
        password: "Password must be at least 8 characters",
      }));
      return;
    }

    const username = payload.email ? payload.email.split("@")[0].toLowerCase() : null;

    setIsAdding(true);
    let avatarUrl: string | null = null;

    try {
      if (formData.avatarFile) {
        const bucket = "avatars";
        const ext = formData.avatarFile.name.split(".").pop() || "jpg";
        const base = (username || "admin").replace(/[^a-zA-Z0-9_-]/g, "");
        const path = `admins/${base}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, formData.avatarFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) {
          console.error(upErr);
          toast.error("Failed to upload avatar. Proceeding without it.");
        } else {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          avatarUrl = pub.publicUrl;
        }
      }

      const { data, error } = await supabase.rpc("admin_create", {
        p_name: formData.name.trim(),
        p_email: formData.email.trim().toLowerCase(),
        p_role: formData.role,
        p_status: formData.status,
        p_user_id: formData.user_id?.trim() || null,
        p_username: formData.email.split("@")[0].toLowerCase(),
        p_avatar_url: avatarUrl,           // null when absent
        p_password: rawPassword,
      });

      if (error) {
        if (isDbErrorWithCode(error) && error.code === "23505") {
          toast.error("Email or user ID already exists.");
          return;
        }
        throw error;
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!row) {
        toast.error("Create failed.");
        return;
      }

      const mapped: Admin = {
        id: row.id,
        user_id: row.user_id ?? null,
        name: row.name ?? payload.name,
        email: row.email ?? payload.email,
        role: (row.role ?? payload.role) as RoleType,
        status: (row.status as AdminStatus) ?? payload.status,
        created_at: row.created_at ?? new Date().toISOString(),
        avatar: row.avatar_url ?? undefined,
      };

      setAdmins((prev) => [mapped, ...prev]);
      setPageState((s) => ({ ...s, total: s.total + 1 }));

      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Admin added.");
    } catch (e) {
      console.error(e);
      const err = e as { message?: string };
      toast.error(err?.message || "Create failed.");
    } finally {
      setIsAdding(false);
    }
  };

  // Update profile and optional password
  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role as RoleType,
      status: formData.status as AdminStatus,
    };

    if (!validateForm({ ...payload, user_id: selectedAdmin.user_id ?? undefined })) return;
    if (!hasPerm("edit", selectedAdmin.role as RoleType)) {
      toast.error("No permission.");
      return;
    }

    setFormErrors((prev) => {
      const next = { ...prev };
      if ("password" in next) delete next.password;
      return next;
    });

    const trimmedPassword = formData.password?.trim() ?? "";
    if (trimmedPassword.length > 0 && trimmedPassword.length < 8) {
      setFormErrors((prev) => ({
        ...prev,
        password: "Password must be at least 8 characters",
      }));
      return;
    }

    try {
      setIsEditing(true);

      // Avatar
      let avatarUrl: string | undefined = undefined;
      if (formData.avatarFile) {
        const bucket = "avatars";
        const ext = formData.avatarFile.name.split(".").pop() || "jpg";
        const base = (
          selectedAdmin.user_id ||
          payload.email.split("@")[0] ||
          "admin"
        ).replace(/[^a-zA-Z0-9_-]/g, "");
        const path = `admins/${base}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, formData.avatarFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) {
          console.error(upErr);
          toast.error("Failed to upload new avatar.");
        } else {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          avatarUrl = pub.publicUrl;
        }
      }

      // Profile update via RPC
      // Profile update via RPC
      const { data, error } = await supabase.rpc("admin_update", {
        p_id: selectedAdmin.id,
        p_name: payload.name,
        p_email: payload.email,
        p_role: payload.role,
        p_status: payload.status,
        p_username: (
          selectedAdmin.user_id || payload.email.split("@")[0]
        ).toLowerCase(),
        p_avatar_url: avatarUrl ?? null,
      });

      if (error) {
        if (isDbErrorWithCode(error) && error.code === "23505") {
          toast.error("Another admin already uses this email.");
          setIsEditing(false);
          return;
        }
        throw error;
      }

      // Optional password reset
      if (trimmedPassword) {
        const { error: pwdErr } = await supabase.rpc("admin_set_password", {
          p_admin_id: selectedAdmin.id,
          p_password: trimmedPassword,
        });
        if (pwdErr) throw pwdErr;
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id
            ? {
              ...a,
              name: row?.name ?? payload.name,
              email: row?.email ?? payload.email,
              role: (row?.role ?? payload.role) as RoleType,
              status: (row?.status as AdminStatus) ?? payload.status,
              avatar: avatarUrl ?? a.avatar,
            }
            : a
        )
      );

      if (currentAdmin?.id === selectedAdmin.id) {
        await syncAdminProfileFromSupabase();
        refreshAdminSession();
      }

      setIsEditDialogOpen(false);
      resetForm();
      toast.success(
        trimmedPassword ? "Admin updated and password reset." : "Admin updated."
      );
    } catch (err) {
      console.error(err);
      const e = err as { message?: string };
      toast.error(e?.message || "Update failed.");
    } finally {
      setIsEditing(false);
    }
  };

  // Delete
  const handleDeleteAdmin = async (adminId: string) => {
    const row = admins.find((a) => a.id === adminId);
    if (!row) return;
    if (!hasPerm("delete", row.role as RoleType)) {
      toast.error("No permission.");
      return;
    }

    try {
      setIsDeleting(adminId);
      const { error } = await supabase.rpc("admin_delete", { p_id: adminId });
      if (error) throw error;

      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
      setPageState((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      toast.success("Admin removed.");
    } catch (err) {
      console.error(err);
      const e = err as { message?: string };
      toast.error(e?.message || "Delete failed.");
    } finally {
      setIsDeleting(null);
    }
  };

  /** ===== UI helpers ===== */
  const resetForm = () => {
    setFormData({
      user_id: "",
      name: "",
      email: "",
      role: "admin",
      status: "active",
      password: "",
      avatarFile: null,
    });
    setSelectedAdmin(null);
    setFormErrors({});
  };

  const handleViewAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      user_id: admin.user_id ?? "",
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(pageState.total / pageState.pageSize)),
    [pageState.total, pageState.pageSize]
  );

  /** ===== Render ===== */
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Admin Management" },
          ]}
        />

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Admin Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage administrators and their roles
              </p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!hasPerm("add", "admin")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const total = pageState.total;
              const active = admins.filter((a) => a.status === "active").length;
              const inactive = admins.filter((a) => a.status === "inactive").length;
              const suspended =
                admins.filter((a) => a.status === "suspended").length;
              const stats = [
                {
                  title: "Total Admins",
                  value: total,
                  description: total === 1 ? "1 admin" : `${total} admins`,
                },
                {
                  title: "Active",
                  value: active,
                  description: active === 1 ? "1 active" : `${active} active`,
                },
                {
                  title: "Inactive",
                  value: inactive,
                  description:
                    inactive === 1 ? "1 inactive" : `${inactive} inactive`,
                },
                {
                  title: "Suspended",
                  value: suspended,
                  description:
                    suspended === 1 ? "1 suspended" : `${suspended} suspended`,
                },
              ];
              return stats.map((s) => (
                <div
                  key={s.title}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                    {s.title}
                  </div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.description}
                  </div>
                </div>
              ));
            })()}
          </div>

          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle>Administrators Overview</CardTitle>
              <AdminFilters
                searchTerm={searchTerm}
                setSearchTerm={(s: string) => {
                  setSearchTerm(s);
                  setPageState((ps) => ({ ...ps, page: 1 }));
                }}
                filterStatus={filterStatus}
                setFilterStatus={(s: string) => {
                  setFilterStatus(s as AdminStatus | "all");
                  setPageState((ps) => ({ ...ps, page: 1 }));
                }}
                filterRole={filterRole}
                setFilterRole={(r: string) => {
                  setFilterRole(r as RoleType | "all");
                  setPageState((ps) => ({ ...ps, page: 1 }));
                }}
              />
            </CardHeader>
            <CardContent>
              {authLoading || loading ? (
                <div className="text-center justify-center flex py-12">
                  <Loading />
                </div>
              ) : (
                <>
                  <AdminTable
                    admins={admins}
                    isDeleting={isDeleting}
                    handleViewAdmin={handleViewAdmin}
                    handleEditClick={handleEditClick}
                    handleDeleteAdmin={handleDeleteAdmin}
                    canPerformAction={(action: "add" | "edit" | "delete", role: string) =>
                      hasPerm(action, role as RoleType)
                    }
                  />

                  {admins.length === 0 && (
                    <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                      No administrators found. Try adjusting your search or filters.
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      {pageState.total} total. Page {pageState.page} / {pageCount}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={pageState.page === 1}
                        onClick={() =>
                          setPageState((s) => ({ ...s, page: s.page - 1 }))
                        }
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={pageState.page === pageCount}
                        onClick={() =>
                          setPageState((s) => ({ ...s, page: s.page + 1 }))
                        }
                        aria-label="Next page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <AdminDialogs
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
            isEditDialogOpen={isEditDialogOpen}
            setIsEditDialogOpen={setIsEditDialogOpen}
            isViewDialogOpen={isViewDialogOpen}
            setIsViewDialogOpen={setIsViewDialogOpen}
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            selectedAdmin={selectedAdmin}
            isAdding={isAdding}
            isEditing={isEditing}
            userRole={userRole}
            handleAddAdmin={handleAddAdmin}
            handleEditAdmin={handleEditAdmin}
            resetForm={resetForm}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminManagement;
