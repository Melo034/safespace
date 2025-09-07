import { useEffect, useMemo, useState } from "react";
import supabase from "@/server/supabase";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Search as SearchIcon,
  Filter as FilterIcon,
  MapPin,
  Calendar,
  UserIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportType } from "@/lib/types";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader";

// Local stat card for consistent modern styling
interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  color: string;
}

const StatCard = ({ title, value, description, icon: Icon, bgColor, color }: StatCardProps) => (
  <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
        {title}
      </CardTitle>
      <div className={`h-9 w-9 rounded-full ${bgColor} flex items-center justify-center ring-1 ring-border/40`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);


/** ---------- Page ---------- */
const ReportManagement = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, role } = useAdminSession();

  const [reports, setReports] = useState<ReportType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Gate access by role from admin_members
  useEffect(() => {
    if (sessionLoading) return;
    if (role === null) return;
    const allowed = ["super_admin", "admin", "moderator"];
    if (!allowed.includes(String(role))) {
      toast.error("Only admins can access this page.");
      navigate("/unauthorized");
    }
  }, [sessionLoading, role, navigate]);

  // load and subscribe
  useEffect(() => {
    let alive = true;

    async function load() {
      const { data, error } = await supabase.from("reports").select("*");
      if (error) {
        toast.error("Failed to fetch reports.");
        return;
      }
      if (!alive) return;

      const rows: ReportType[] = (data ?? []).map((r: ReportType) => ({
        id: r.id,
        title: r.title || "",
        description: r.description || "",
        type: r.type || "other",
        priority: r.priority || "Low",
        status: r.status || "Open",
        location: r.location || "",
        reported_by: r.reported_by || "anonymous",
        reported_at: r.reported_at || "",
        assigned_to: r.assigned_to || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        follow_up_actions: Array.isArray(r.follow_up_actions) ? r.follow_up_actions : [],
        evidence: Array.isArray(r.evidence) ? r.evidence : [],
        created_at: r.created_at || "",
        updated_at: r.updated_at || "",
      }));

      setReports(rows);
    }

    if (!sessionLoading) load();

    const sub = supabase
      .channel("reports_changes_rm")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        const r = payload.new as ReportType;
        const row: ReportType = {
          id: r?.id,
          title: r?.title || "",
          description: r?.description || "",
          type: r?.type || "other",
          priority: r?.priority || "Low",
          status: r?.status || "Open",
          location: r?.location || "",
          reported_by: r?.reported_by || "anonymous",
          reported_at: r?.reported_at || "",
          assigned_to: r?.assigned_to || null,
          tags: Array.isArray(r?.tags) ? r.tags : [],
          follow_up_actions: Array.isArray(r?.follow_up_actions) ? r.follow_up_actions : [],
          evidence: Array.isArray(r?.evidence) ? r.evidence : [],
          created_at: r?.created_at || "",
          updated_at: r?.updated_at || "",
        };

        if (payload.eventType === "INSERT") {
          setReports((prev) => [row, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setReports((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        } else if (payload.eventType === "DELETE") {
          setReports((prev) => prev.filter((x) => x.id !== (payload.old as ReportType)?.id));
        }
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(sub);
    };
  }, [sessionLoading]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return reports.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
  }, [reports, searchTerm, typeFilter, statusFilter, priorityFilter]);

  const getPriorityVariant = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case "Critical":
      case "High":
        return "destructive";
      case "Medium":
        return "default";
      case "Low":
      default:
        return "secondary";
    }
  };

  const getStatusVariant = (status: ReportType["status"]): "destructive" | "default" | "secondary" => {
    switch (status) {
      case "Open":
        return "destructive";
      case "In Progress":
        return "default";
      case "Resolved":
      default:
        return "secondary";
    }
  };

  const handleEdit = (report: ReportType) => {
    setSelectedReport(report);
    setIsEditDialogOpen(true);
  };

  const handleView = (report: ReportType) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this report")) return;
    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
      toast.success("Report deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete report.");
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          priority: selectedReport.priority,
          status: selectedReport.status,
          assigned_to: selectedReport.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id);
      if (error) throw error;
      setIsEditDialogOpen(false);
      toast.success("Report updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update report.");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Report Management" },
          ]}
        />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports Management</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage incident reports</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-sm">
              {filtered.length} {filtered.length === 1 ? "Report" : "Reports"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const open = reports.filter((r) => r.status === "Open").length;
              const inprog = reports.filter((r) => r.status === "In Progress").length;
              const critical = reports.filter((r) => r.priority === "Critical").length;
              const resolved = reports.filter((r) => r.status === "Resolved").length;
              const pluralize = (n: number, s: string, p: string) => (n <= 1 ? s : p);
              const stats = [
                { title: pluralize(open, "Open Case", "Open Cases"), value: open, description: open === 0 ? "No open cases" : open === 1 ? "1 open case" : `${open} open cases`, icon: AlertTriangle, bgColor: "bg-red-100", color: "text-red-600" },
                { title: pluralize(inprog, "In-progress", "In-progress"), value: inprog, description: inprog === 0 ? "No reports under review" : inprog === 1 ? "1 report under review" : `${inprog} reports under review`, icon: MessageSquare, bgColor: "bg-blue-100", color: "text-blue-600" },
                { title: pluralize(critical, "Critical", "Critical"), value: critical, description: critical === 0 ? "No high-priority incidents" : critical === 1 ? "1 high-priority incident" : `${critical} high-priority incidents`, icon: AlertTriangle, bgColor: "bg-orange-100", color: "text-orange-600" },
                { title: pluralize(resolved, "Resolved Case", "Resolved Cases"), value: resolved, description: resolved === 0 ? "No closed cases" : resolved === 1 ? "1 closed case" : `${resolved} closed cases`, icon: AlertTriangle, bgColor: "bg-green-100", color: "text-green-600" },
              ];
              return stats.map((s) => <StatCard key={s.title} {...s} />);
            })()}
          </div>

          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      aria-label="Search reports"
                    />
                  </div>
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="discrimination">Discrimination</SelectItem>
                    <SelectItem value="violence">Violence</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filtered.map((r) => (
              <Card key={r.id} className="group rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">{r.title}</h3>
                        <Badge variant={getPriorityVariant(r.priority)}>{r.priority}</Badge>
                        <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {r.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {r.reported_at}
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {r.reported_by}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleView(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleEdit(r)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl rounded-xl">
              <DialogHeader>
                <DialogTitle>Report Details</DialogTitle>
              </DialogHeader>
              {selectedReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Badge variant={getPriorityVariant(selectedReport.priority)}>{selectedReport.priority}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Badge variant={getStatusVariant(selectedReport.status)}>{selectedReport.status}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.location}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reported By</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.reported_by}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reported At</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.reported_at}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigned To</label>
                      <p className="text-sm text-muted-foreground">{selectedReport.assigned_to || "Unassigned"}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReport.description}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Follow-up Actions</label>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedReport.follow_up_actions.map((a, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{a}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Evidence</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.evidence.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline">Evidence {i + 1}</Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl rounded-xl">
              <DialogHeader>
                <DialogTitle>Edit Report</DialogTitle>
              </DialogHeader>
              {selectedReport && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateReport();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select
                        value={selectedReport.priority}
                        onValueChange={(v) =>
                          setSelectedReport({ ...selectedReport, priority: v as ReportType["priority"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical">Critical</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select
                        value={selectedReport.status}
                        onValueChange={(v) =>
                          setSelectedReport({ ...selectedReport, status: v as ReportType["status"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Assigned To</label>
                    <Input
                      value={selectedReport.assigned_to || ""}
                      onChange={(e) => setSelectedReport({ ...selectedReport, assigned_to: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Report</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ReportManagement;
