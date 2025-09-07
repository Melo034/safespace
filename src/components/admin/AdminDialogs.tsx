// src/components/admin/AdminDialogs.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, avatarFile: e.target.files?.[0] })}
              aria-label="Upload admin avatar"
            />
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
            <Input
              placeholder="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              aria-invalid={!!formErrors.password}
              aria-describedby={formErrors.password ? "password-error" : undefined}
            />
            {formErrors.password && <p id="password-error" className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
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
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, avatarFile: e.target.files?.[0] })}
              aria-label="Upload new admin avatar"
            />
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
