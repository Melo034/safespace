// src/components/admin/AdminFilters.tsx
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import type { AdminStatus, RoleType } from "@/lib/types";

interface AdminFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: AdminStatus | "all";
  setFilterStatus: (status: AdminStatus | "all") => void;
  filterRole: RoleType | "all";
  setFilterRole: (role: RoleType | "all") => void;
}


const AdminFilters: React.FC<AdminFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterRole,
  setFilterRole,
}) => {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search administrators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          aria-label="Search administrators by name or email"
        />
      </div>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-32" aria-label="Filter administrators by status">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterRole} onValueChange={setFilterRole}>
        <SelectTrigger className="w-32" aria-label="Filter administrators by role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="super_admin">Super Admin</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="moderator">Moderator</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AdminFilters;