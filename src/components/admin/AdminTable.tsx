// src/components/admin/AdminTable.tsx
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Edit, Trash2, Crown, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/utils/Loading";
import type { Admin } from "@/lib/types";

interface AdminTableProps {
  admins: Admin[];
  isDeleting: string | null;
  handleViewAdmin: (admin: Admin) => void;
  handleEditClick: (admin: Admin) => void;
  handleDeleteAdmin: (user_id: string) => void;
  canPerformAction: (action: "edit" | "delete", targetRole: string) => boolean;
}

const getRoleIcon = (role: Admin["role"]) => {
  switch (role) {
    case "super_admin": return <Crown className="h-4 w-4" />;
    case "admin": return <Shield className="h-4 w-4" />;
    case "moderator": return <User className="h-4 w-4" />;
    default: return <User className="h-4 w-4" />;
  }
};

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

const AdminTable: React.FC<AdminTableProps> = ({
  admins,
  isDeleting,
  handleViewAdmin,
  handleEditClick,
  handleDeleteAdmin,
  canPerformAction,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Admin</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.user_id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16 object-cover border-primary border-2">
                  <AvatarImage src={admin.avatar} loading="lazy" />
                  <AvatarFallback>{admin.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={`${getRoleColor(admin.role)} text-white`}>
                <div className="flex items-center gap-1">
                  {getRoleIcon(admin.role)}
                  <span className="capitalize">{admin.role.replace("_", " ")}</span>
                </div>
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(admin.status)}>{admin.status}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(admin.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleViewAdmin(admin)}
                  aria-label={`View details for ${admin.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleEditClick(admin)}
                  disabled={!canPerformAction("edit", admin.role)}
                  aria-label={`Edit details for ${admin.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleDeleteAdmin(admin.user_id)}
                  disabled={isDeleting === admin.user_id || !canPerformAction("delete", admin.role)}
                  aria-label={`Delete ${admin.name}`}
                >
                  {isDeleting === admin.user_id ? <Loading /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AdminTable;
