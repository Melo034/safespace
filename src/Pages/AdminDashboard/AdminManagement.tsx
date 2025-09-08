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
import { useAuth } from "@/hooks/authUtils";
import AdminTable from "@/components/admin/AdminTable";
import AdminDialogs from "@/components/admin/AdminDialogs";
import AdminFilters from "@/components/admin/AdminFilters";
import Loading from "@/components/utils/Loading";
import type { Admin, AdminFormData, AdminStatus, RoleType, PageState } from "@/lib/types";
import AdminHeader from "@/components/admin/AdminHeader";

/** ===== Validation (UI only) ===== */
const adminSchema = z.object({
  user_id: z.string().uuid({ message: "Provide a valid user_id" }).optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  role: z.custom<RoleType>().refine((v) => ["admin", "super_admin", "moderator"].includes(String(v))),
  status: z.custom<AdminStatus>().refine((v) => ["active", "inactive", "suspended"].includes(String(v))),
});


/** ===== Page ===== */
const AdminManagement = () => {
  const { userRole, loading: authLoading } = useAuth();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<AdminStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<RoleType | "all">("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const [formData, setFormData] = useState<AdminFormData & { avatarFile?: File | null }>({
    user_id: "",
    name: "",
    email: "",
    role: "admin",
    status: "active",
    avatarFile: null,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({});

  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [pageState, setPageState] = useState<PageState>({ page: 1, pageSize: 10, total: 0 });

  const from = useMemo(() => (pageState.page - 1) * pageState.pageSize, [pageState]);
  const to = useMemo(() => from + pageState.pageSize - 1, [from, pageState.pageSize]);

  /** ===== Helpers ===== */
  const allowedRoles: RoleType[] = useMemo(() => ["super_admin", "admin", "moderator"], []);

  const hasPerm = (action: "add" | "edit" | "delete", targetRole: RoleType) => {
    if (!userRole) return false;
    if (userRole === "super_admin") return true;
    if (userRole === "admin") return targetRole !== "super_admin";
    if (userRole === "moderator") return action === "edit" && targetRole === "moderator";
    return false;
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

  /** ===== Data load ===== */
  // Route is guarded globally; no per-page gate

  // Debounce search to avoid chatty queries
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        // Read directly from admin_members (source of truth), with filters and pagination
        let amQuery = supabase
          .from("admin_members")
          .select(
            "user_id,name,email,username,status,avatar_url,role,created_at",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (filterStatus !== "all") amQuery = amQuery.eq("status", filterStatus);
        if (filterRole !== "all") amQuery = amQuery.eq("role", filterRole);
        if (debouncedSearch) {
          const q = debouncedSearch;
          amQuery = amQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`);
        }

        const { data: adminsPage, error: amErr, count } = await amQuery;
        if (amErr) throw amErr;

        if (!active) return;

        type AdminMemberRow = {
          user_id: string;
          name?: string;
          email?: string;
          username?: string;
          status?: string;
          avatar_url?: string;
        };

        const rows: Admin[] = (adminsPage ?? []).map((a: AdminMemberRow & { role?: string; created_at?: string }) => ({
          user_id: a.user_id,
          name: a.name ?? "Admin",
          email: a.email ?? "",
          role: (a.role ?? "admin") as RoleType,
          status: (a.status as AdminStatus) ?? "active",
          created_at: (a.created_at ?? new Date().toISOString()),
          avatar: a.avatar_url ?? undefined,
        }));

        setAdmins(rows);
        setPageState((s) => ({ ...s, total: count ?? 0 }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load admins.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [from, to, filterStatus, filterRole, debouncedSearch, allowedRoles]);

  /** ===== CRUD ===== */

  // Create: upsert admin_members only (source of truth)
  const handleAddAdmin = async () => {
    const payload = {
      user_id: formData.user_id?.trim(),
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

    try {
      setIsAdding(true);
      // Prepare avatar upload if provided
      let avatarUrl: string | null = null;
      if (formData.avatarFile) {
        const bucket = "avatars";
        const ext = formData.avatarFile.name.split(".").pop() || "jpg";
        const base = (payload.user_id || payload.email.split("@")[0] || "admin").replace(/[^a-zA-Z0-9_-]/g, "");
        const path = `admins/${base}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, formData.avatarFile, {
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

      // admin_members
      const username = payload.email ? payload.email.split("@")[0].toLowerCase() : null;
      const { error: amErr } = await supabase
        .from("admin_members")
        .upsert(
          {
            user_id: payload.user_id,
            name: payload.name || "Admin",
            email: payload.email,
            username,
            status: payload.status,
            role: payload.role,
            avatar_url: avatarUrl,
          },
          { onConflict: "user_id" }
        );
      if (amErr) throw amErr;

      setPageState((s) => ({ ...s, page: 1 }));
      setSearchTerm("");
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Admin added.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || "Create failed.");
      } else {
        toast.error("Create failed.");
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Update: update admin_members (role, status, profile)
  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role as RoleType,
      status: formData.status as AdminStatus,
    };
    if (!validateForm({ ...payload, user_id: selectedAdmin.user_id })) return;
    if (!hasPerm("edit", selectedAdmin.role as RoleType)) {
      toast.error("No permission.");
      return;
    }

    try {
      setIsEditing(true);
      // Upload avatar if provided
      let avatarUrl: string | undefined = undefined;
      if (formData.avatarFile) {
        const bucket = "avatars";
        const ext = formData.avatarFile.name.split(".").pop() || "jpg";
        const base = (selectedAdmin.user_id || payload.email.split("@")[0] || "admin").replace(/[^a-zA-Z0-9_-]/g, "");
        const path = `admins/${base}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, formData.avatarFile, {
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

      // admin_members
      const updatePayload: Partial<AdminFormData> & { avatar_url?: string } = {
        name: payload.name || "Admin",
        email: payload.email,
        status: payload.status,
        role: payload.role,
      };
      if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

      const { error: amErr } = await supabase
        .from("admin_members")
        .update(updatePayload)
        .eq("user_id", selectedAdmin.user_id);
      if (amErr) throw amErr;

      setAdmins((prev) =>
        prev.map((a) =>
          a.user_id === selectedAdmin.user_id ? { ...a, ...payload, avatar: avatarUrl ?? a.avatar } : a
        )
      );
      setIsEditDialogOpen(false);
      resetForm();
      toast.success("Admin updated.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || "Update failed.");
      } else {
        toast.error("Update failed.");
      }
    } finally {
      setIsEditing(false);
    }
  };

  // Delete: remove admin profile (demote implicitly by removing membership)
  const handleDeleteAdmin = async (user_id: string) => {
    const row = admins.find((a) => a.user_id === user_id);
    if (!row) return;
    if (!hasPerm("delete", row.role as RoleType)) {
      toast.error("No permission.");
      return;
    }

    try {
      setIsDeleting(user_id);
      // remove admin profile
      const { error: delErr } = await supabase
        .from("admin_members")
        .delete()
        .eq("user_id", user_id);
      if (delErr) throw delErr;

      setAdmins((prev) => prev.filter((a) => a.user_id !== user_id));
      setPageState((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      toast.success("Admin removed.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || "Delete failed.");
      } else {
        toast.error("Delete failed.");
      }
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
      user_id: admin.user_id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
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
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Admin Management</h1>
              <p className="text-sm text-muted-foreground">Manage administrators and their roles</p>
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
              const suspended = admins.filter((a) => a.status === "suspended").length;
              const stats = [
                { title: "Total Admins", value: total, description: total === 1 ? "1 admin" : `${total} admins` },
                { title: "Active", value: active, description: active === 1 ? "1 active" : `${active} active` },
                { title: "Inactive", value: inactive, description: inactive === 1 ? "1 inactive" : `${inactive} inactive` },
                { title: "Suspended", value: suspended, description: suspended === 1 ? "1 suspended" : `${suspended} suspended` },
              ];
              return stats.map((s) => (
                <div key={s.title} className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{s.title}</div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
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
                      {pageState.total} total • Page {pageState.page} / {pageCount}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={pageState.page === 1}
                        onClick={() => setPageState((s) => ({ ...s, page: s.page - 1 }))}
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={pageState.page === pageCount}
                        onClick={() => setPageState((s) => ({ ...s, page: s.page + 1 }))}
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
