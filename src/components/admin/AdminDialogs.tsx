// src/components/admin/AdminDialogs.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Upload } from "lucide-react";
import type { Admin, AdminFormData } from "@/lib/types";

interface AdminDialogsProps {
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  isViewDialogOpen: boolean;
  setIsViewDialogOpen: (open: boolean) => void;
  formData: AdminFormData & { avatarFile?: File | null };
  setFormData: (data: AdminFormData & { avatarFile?: File | null }) => void;
  formErrors: Partial<Record<keyof AdminFormData, string>>;
  selectedAdmin: Admin | null;
  isAdding: boolean;
  isEditing: boolean;
  userRole: string | null;
  handleAddAdmin: () => void;
  handleEditAdmin: () => void;
  resetForm: () => void;
}

const AdminDialogs: React.FC<AdminDialogsProps> = ({
  isAddDialogOpen,
  setIsAddDialogOpen,
  isEditDialogOpen,
  setIsEditDialogOpen,
  isViewDialogOpen,
  setIsViewDialogOpen,
  formData,
  setFormData,
  formErrors,
  selectedAdmin,
  isAdding,
  isEditing,
  userRole,
  handleAddAdmin,
  handleEditAdmin,
  resetForm,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const getRoleColor = (role: Admin["role"]) => {
    switch (role) {
      case "super_admin": return "bg-purple-500";
      case "admin": return "bg-blue-500";
      case "moderator": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: Admin["status"]) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "inactive": return "bg-gray-500";
      case "suspended": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <>
      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
          setShowPassword(false);
        }
      }}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>
              Provide admin details and role. Leave the user ID blank to auto-generate one.
              Admins must be different from community members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, avatarFile: e.target.files?.[0] || null })}
                  aria-label="Upload admin avatar"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {formData.avatarFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {formData.avatarFile.name} ({(formData.avatarFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <Input
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? "name-error" : undefined}
            />
            {formErrors.name && <p id="name-error" className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            <Input
              placeholder="Email address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? "email-error" : undefined}
            />
            {formErrors.email && <p id="email-error" className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
            <div className="relative">
              <Input
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password ?? ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? "add-password-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formErrors.password && <p id="add-password-error" className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as "admin" | "super_admin" | "moderator" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="super_admin" disabled={userRole !== "super_admin"}>Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" | "suspended" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddAdmin} className="w-full" disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setShowNewPassword(false);
        }
      }}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Update admin profile, role, or status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, avatarFile: e.target.files?.[0] || null })}
                  aria-label="Upload new admin avatar"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {formData.avatarFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {formData.avatarFile.name} ({(formData.avatarFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <Input
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? "name-error" : undefined}
            />
            {formErrors.name && <p id="name-error" className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            <Input
              placeholder="Email address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? "email-error" : undefined}
            />
            {formErrors.email && <p id="email-error" className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
            <div className="relative">
              <Input
                placeholder="New password (optional)"
                type={showNewPassword ? "text" : "password"}
                value={formData.password ?? ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? "edit-password-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showNewPassword}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formErrors.password && <p id="edit-password-error" className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
            <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as "admin" | "super_admin" | "moderator" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="super_admin" disabled={userRole !== "super_admin"}>Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" | "suspended" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleEditAdmin} className="w-full" disabled={isEditing}>
              {isEditing ? "Updating..." : "Update Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Admin Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Admin Details</DialogTitle>
            <DialogDescription>View-only details for this admin.</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedAdmin.avatar} loading="lazy" />
                  <AvatarFallback>{selectedAdmin.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedAdmin.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Role:</span>
                  <Badge className={`ml-2 ${getRoleColor(selectedAdmin.role)} text-white`}>
                    {selectedAdmin.role.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedAdmin.status)}`}>{selectedAdmin.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2">{new Date(selectedAdmin.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDialogs;


