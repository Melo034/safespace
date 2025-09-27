// src/components/admin/Dashboard.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import supabase from "@/server/supabase";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Users,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  Bell,
  Search as SearchIcon,
  XCircle,
  MapPin,
  BookOpen,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow, parseISO } from "date-fns";
import type {
  DashAlert,
  DashActivity,
  DashboardStats,
  AlertPriority,
  AlertStatus,
  Story,
} from "@/lib/types";
import { IncidentType } from "@/lib/types";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader";

const ACTIVITY_TYPES: DashActivity["type"][] = ["report", "story", "comment", "support", "system", "resource"];

function normalizeActivityType(value: unknown): DashActivity["type"] {
  const lower = String(value ?? "").toLowerCase() as DashActivity["type"];
  return ACTIVITY_TYPES.includes(lower) ? lower : "system";
}

function normalizeActivityStatus(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw || "info";
}

function formatStatusLabel(status: string): string {
  if (!status) return "Info";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActivityBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
    case "resolved":
    case "published":
    case "verified":
    case "created":
    case "success":
      return "default";
    case "pending":
    case "in progress":
    case "info":
    case "posted":
      return "outline";
    case "rejected":
    case "deleted":
    case "error":
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

/** DB-aligned unions */
type ReportPriority = "Low" | "Medium" | "High" | "Critical";
type ReportStatus = "Open" | "In Progress" | "Resolved";
type IncidentTypeDb = "harassment" | "violence" | "discrimination" | "other";

/** DB rows */
type ReportRow = {
  id: string;
  title: string | null;
  description: string | null;
  type: IncidentTypeDb | null;
  priority: ReportPriority | null;
  status: ReportStatus | null;
  location: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** UI */
const searchSchema = z.object({
  searchTerm: z.string().max(100),
});

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  bgColor: string;
  color: string;
};

const StatCard = ({ title, value, description, icon: Icon, bgColor, color }: StatCardProps) => (
  <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
        {title}
      </CardTitle>
      <div className={`h-9 w-9 rounded-full ${bgColor} flex items-center justify-center ring-1 ring-border/40`}>
        <Icon className={`h-4 w-4 ${color}`} aria-hidden />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const itemsPerPage = 10;

export default function Dashboard() {
  const { profile, loading: sessionLoading, isSignedIn } = useAdminSession();

  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    inProgressReports: 0,
    criticalReports: 0,
    resolvedReports: 0,
    totalStories: 0,
    totalMembers: 0,
    totalComments: 0,
    totalAdmins: 0,
  });
  const [alerts, setAlerts] = useState<DashAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<IncidentType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority | "all">("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);

      const [
        reportsRes,
        inProgRes,
        criticalRes,
        resolvedRes,
        storiesRes,
        membersRes,
        commentsRes,
        adminsRes,
        alertsCountRes,
      ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "In Progress"),
        supabase.from("reports").select("*", { count: "exact", head: true }).in("priority", ["High", "Critical"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "Resolved"),
        supabase.from("stories").select("*", { count: "exact", head: true }),
        supabase.from("community_members").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.rpc("admin_list", {
          p_search: null,
          p_status: null,
          p_role: null,
          p_from: 0,
          p_to: 0,
        }),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("status", ["Open", "In Progress"])
          .in("priority", ["High", "Critical"]),
      ]);

      const errs = [
        reportsRes.error,
        inProgRes.error,
        criticalRes.error,
        resolvedRes.error,
        storiesRes.error,
        membersRes.error,
        commentsRes.error,
        adminsRes.error,
        alertsCountRes.error,
      ].filter(Boolean);
      if (errs.length) throw errs[0];

      type AdminListRow = { total_count: number };
      const totalAdmins =
        Array.isArray(adminsRes.data) && adminsRes.data.length > 0
          ? Number((adminsRes.data as unknown as AdminListRow[])[0].total_count)
          : 0;

      setStats({
        totalReports: reportsRes.count || 0,
        inProgressReports: inProgRes.count || 0,
        criticalReports: criticalRes.count || 0,
        resolvedReports: resolvedRes.count || 0,
        totalStories: storiesRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalComments: commentsRes.count || 0,
        totalAdmins,
      });

      setTotalAlerts(alertsCountRes.count || 0);

      const { data: fetchedAlerts, error: alertsError } = await supabase
        .from("reports")
        .select("id,title,description,type,priority,status,location,created_at")
        .in("status", ["Open", "In Progress"])
        .in("priority", ["High", "Critical"])
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (alertsError) throw alertsError;

      const alertsData: DashAlert[] = (fetchedAlerts ?? []).map((a) => ({
        id: a.id,
        title: a.title ?? "Untitled",
        message: a.description ?? "",
        type:
          a.type === "harassment"
            ? IncidentType.Harassment
            : a.type === "violence"
              ? IncidentType.Violence
              : a.type === "discrimination"
                ? IncidentType.Discrimination
                : IncidentType.Other,
        priority: (a.priority as AlertPriority) ?? "Medium",
        status: (a.status as AlertStatus) ?? "Open",
        location: a.location ?? "Unknown",
        timestamp: a.created_at ?? new Date().toISOString(),
        reportId: a.id,
      }));
      setAlerts(alertsData);

      const { data: activityData, error: activityError } = await supabase
        .from("recent_activity")
        .select("id,message,type,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (activityError) throw activityError;

      setRecentActivity(
        (activityData ?? []).map((a) => ({
          id: a.id,
          message: a.message ?? "",
          type: normalizeActivityType(a.type),
          status: normalizeActivityStatus(a.status),
          time: a.created_at ?? new Date().toISOString(),
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [page, profile?.id]);

  useEffect(() => {
    if (!sessionLoading && isSignedIn) {
      fetchData();
    }
  }, [sessionLoading, isSignedIn, fetchData]);

  useEffect(() => {
    if (!isSignedIn) return;

    const reportsCh: RealtimeChannel = supabase
      .channel("reports-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        const r = payload.new as Partial<ReportRow> | null;
        if (!r) return;

        const newAlert: DashAlert = {
          id: r.id as string,
          title: r.title ?? "Untitled",
          message: r.description ?? "",
          type:
            r.type === "harassment"
              ? IncidentType.Harassment
              : r.type === "violence"
                ? IncidentType.Violence
                : r.type === "discrimination"
                  ? IncidentType.Discrimination
                  : IncidentType.Other,
          priority: (r.priority as AlertPriority) ?? "Medium",
          status: (r.status as AlertStatus) ?? "Open",
          location: r.location ?? "Unknown",
          timestamp: r.created_at ?? new Date().toISOString(),
          reportId: r.id as string,
        };

        if (payload.eventType === "INSERT" && ["High", "Critical"].includes(String(newAlert.priority))) {
          setAlerts((prev) => [newAlert, ...prev].slice(0, itemsPerPage));
          setRecentActivity((prev) => [
            {
              id: newAlert.id,
              message: `New ${newAlert.type} report: ${newAlert.title}`,
              type: "report",
              status: normalizeActivityStatus(newAlert.status),
              time: newAlert.timestamp,
            },
            ...prev.slice(0, 4),
          ]);
          setStats((prev) => ({
            ...prev,
            totalReports: prev.totalReports + 1,
            criticalReports: prev.criticalReports + 1,
          }));
        } else if (payload.eventType === "UPDATE") {
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === newAlert.id
                ? {
                  ...a,
                  status: newAlert.status,
                  priority: newAlert.priority,
                  title: newAlert.title,
                  message: newAlert.message,
                  location: newAlert.location,
                  timestamp: newAlert.timestamp,
                  type: newAlert.type,
                }
                : a
            )
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as Partial<ReportRow> | null;
          if (!deleted?.id) return;
          setAlerts((prev) => prev.filter((a) => a.id !== deleted.id));
        }
      })
      .subscribe();

    const storiesCh: RealtimeChannel = supabase
      .channel("stories-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stories" }, (payload) => {
        const data = payload.new as Story;
        setRecentActivity((prev) => [
          {
            id: data.id,
            message: `New story: ${data.title ?? "Untitled"}`,
            type: "story",
            status: normalizeActivityStatus("published"),
            time: data.created_at || new Date().toISOString(),
          },
          ...prev.slice(0, 4),
        ]);
        setStats((prev) => ({ ...prev, totalStories: prev.totalStories + 1 }));
      })
      .subscribe();

    const commentsCh: RealtimeChannel = supabase
      .channel("comments-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const d = payload.new as { id: string; created_at?: string };
        setRecentActivity((prev) => [
          {
            id: d.id,
            message: "New comment on story",
            type: "comment",
            status: normalizeActivityStatus("posted"),
            time: d.created_at || new Date().toISOString(),
          },
          ...prev.slice(0, 4),
        ]);
        setStats((prev) => ({ ...prev, totalComments: prev.totalComments + 1 }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsCh);
      supabase.removeChannel(storiesCh);
      supabase.removeChannel(commentsCh);
    };
  }, [isSignedIn]);

  const handleDismissAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "Resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert dismissed.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to dismiss alert.");
    }
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "Resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setStats((prev) => ({
        ...prev,
        resolvedReports: prev.resolvedReports + 1,
        inProgressReports: Math.max(0, prev.inProgressReports - 1),
      }));
      toast.success("Alert resolved.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to resolve alert.");
    }
  };

  const handleSearchChange = (value: string) => {
    const sanitized = value.replace(/(<([^>]+)>)/gi, "");
    const result = searchSchema.safeParse({ searchTerm: sanitized });
    if (!result.success) {
      setSearchError(result.error.flatten().fieldErrors.searchTerm?.[0] || "Invalid search term");
      return;
    }
    setSearchError(null);
    setSearchTerm(sanitized);
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
      return matchesSearch && matchesType && matchesPriority;
    });
  }, [alerts, searchTerm, typeFilter, priorityFilter]);

  const getAlertIcon = (type: IncidentType) => {
    switch (type) {
      case IncidentType.Harassment:
      case IncidentType.Discrimination:
      case IncidentType.Violence:
        return AlertTriangle;
      case IncidentType.Other:
      default:
        return Bell;
    }
  };

  const getStatusColor = (status: AlertStatus | string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Open":
      case "open":
        return "destructive";
      case "In Progress":
      case "InProgress":
      case "in progress":
        return "outline";
      case "Resolved":
      case "resolved":
        return "default";
      case "dismissed":
        return "secondary";
      default:
        return "default";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "report":
        return FileText;
      case "story":
        return BookOpen;
      case "comment":
        return MessageSquare;
      case "support":
        return Shield;
      case "system":
        return Bell;
      case "resource":
        return Users;
      default:
        return Clock;
    }
  };

  if (sessionLoading || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader
            breadcrumb={[
              { href: "/admin-dashboard", label: "Admin Dashboard" },
              { label: "Dashboard" },
            ]}
          />
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 p-4">
              <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
              <p className="text-muted-foreground mt-2">Monitor platform activity and manage support services</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4 mt-2" />
                    </CardContent>
                  </Card>
                ))}
            </div>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/4 mt-2" />
            </CardContent>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Dashboard" },
          ]}
        />

        <div className="flex flex-col gap-2 p-4">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor platform activity and manage support services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
          {(() => {
            const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
            const open = stats.totalReports;
            const inProg = stats.inProgressReports;
            const critical = stats.criticalReports;
            const resolved = stats.resolvedReports;
            const stories = stats.totalStories;
            const members = stats.totalMembers;
            const comments = stats.totalComments;
            const admins = stats.totalAdmins;

            return [
              { title: plural(open, "Open Case", "Open Cases"), value: open, description: open === 0 ? "No open cases" : `${open} open cases`, icon: AlertTriangle, bgColor: "bg-red-100", color: "text-red-600" },
              { title: plural(inProg, "In-progress Report", "In-progress Reports"), value: inProg, description: inProg === 0 ? "No reports under review" : `${inProg} reports under review`, icon: MessageSquare, bgColor: "bg-blue-100", color: "text-blue-600" },
              { title: plural(critical, "Critical Incident", "Critical Incidents"), value: critical, description: critical === 0 ? "No high-priority incidents" : `${critical} high-priority incidents`, icon: AlertTriangle, bgColor: "bg-orange-100", color: "text-orange-600" },
              { title: plural(resolved, "Resolved Case", "Resolved Cases"), value: resolved, description: resolved === 0 ? "No closed cases" : `${resolved} closed cases`, icon: CheckCircle, bgColor: "bg-green-100", color: "text-green-600" },
              { title: plural(stories, "Story", "Stories"), value: stories, description: stories === 0 ? "No published stories" : `${stories} published stories`, icon: BookOpen, bgColor: "bg-purple-100", color: "text-purple-600" },
              { title: plural(members, "Member", "Members"), value: members, description: members === 0 ? "No community members" : `${members} community members`, icon: Users, bgColor: "bg-teal-100", color: "text-teal-600" },
              { title: plural(comments, "Comment", "Comments"), value: comments, description: comments === 0 ? "No user comments" : `${comments} user comments`, icon: MessageSquare, bgColor: "bg-indigo-100", color: "text-indigo-600" },
              { title: plural(admins, "Admin", "Admins"), value: admins, description: admins === 0 ? "No administrator yet, add one" : `${admins} administrators`, icon: Shield, bgColor: "bg-sky-100", color: "text-sky-600" },
            ];
          })().map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform updates and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((a) => {
                  const Icon = getActivityIcon(a.type);
                  const statusLabel = formatStatusLabel(a.status);
                  return (
                    <div key={a.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(a.time), { addSuffix: true })}</p>
                      </div>
                      <Badge variant={getActivityBadgeVariant(a.status)} className="text-xs">{statusLabel}</Badge>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && <p className="text-center text-muted-foreground">No recent activity</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-emerald-50 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-emerald-800">
                <CheckCircle className="h-5 w-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-1" aria-hidden />
                <div className="flex-1">
                  <h3 className="font-medium text-emerald-800 mb-1">All Systems Operational</h3>
                  <p className="text-sm text-emerald-700">Emergency services and response teams are fully operational and available 24/7.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 flex flex-col gap-4 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Alert Management</h1>
              <p className="text-muted-foreground">Monitor and manage system alerts, emergency notifications, and warnings</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Badge variant="destructive" className="animate-pulse">
                {alerts.filter((a) => String(a.status).toLowerCase() === "open").length} Active
              </Badge>
              <Badge variant="outline">
                {alerts.filter((a) => String(a.status).toLowerCase() === "in progress").length} Investigating
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SearchIcon className="h-5 w-5" aria-hidden />
                <span>Search & Filter</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search alerts by title, message, or location..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full"
                    aria-invalid={!!searchError}
                    aria-describedby={searchError ? "search-error" : undefined}
                    aria-label="Search alerts"
                  />
                  {searchError && <p id="search-error" className="text-red-500 text-sm mt-1">{searchError}</p>}
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as IncidentType | "all")} aria-label="Filter by alert type">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.values(IncidentType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as AlertPriority | "all")} aria-label="Filter by priority">
                    <SelectTrigger className="w-32">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" aria-hidden />
                <span>Active Alerts ({filteredAlerts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => {
                    const Icon = getAlertIcon(alert.type);
                    return (
                      <Alert key={alert.id} className={`relative ${alert.priority === "High" || alert.priority === "Critical" ? "border-destructive" : ""}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <Icon
                              className={`h-5 w-5 mt-0.5 ${alert.priority === "High" || alert.priority === "Critical" ? "text-destructive" : alert.priority === "Medium" ? "text-warning" : "text-success"}`}
                              aria-hidden
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <AlertTitle className="text-sm font-medium">{alert.title}</AlertTitle>
                                <Badge variant="destructive">{alert.priority}</Badge>
                                <Badge variant={getStatusColor(alert.status)}>{alert.status}</Badge>
                              </div>
                              <AlertDescription className="text-sm text-muted-foreground">{alert.message}</AlertDescription>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" aria-hidden />
                                  <span>{alert.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" aria-hidden />
                                  <span>{formatDistanceToNow(parseISO(alert.timestamp), { addSuffix: true })}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Link to={`/reports/${alert.reportId}`} className="text-blue-600 hover:underline" aria-label={`View report ${alert.reportId}`}>
                                    Report: {alert.reportId}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {alert.status !== "Resolved" && (
                              <Button variant="outline" size="sm" onClick={() => handleMarkResolved(alert.id)} aria-label={`Mark ${alert.title} as resolved`}>
                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden />
                                Resolve
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDismissAlert(alert.id)} aria-label={`Dismiss ${alert.title}`}>
                              <XCircle className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    );
                  })}
                  {filteredAlerts.length === 0 && <p className="text-center text-muted-foreground">No active alerts</p>}
                </div>
              </ScrollArea>

              <div className="flex justify-between mt-4">
                <Button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label={`Go to previous page, current page ${page}`}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" aria-label={`Page ${page} of ${Math.ceil(totalAlerts / itemsPerPage)}`}>
                  Page {page} of {Math.ceil(totalAlerts / itemsPerPage)}
                </span>
                <Button
                  disabled={filteredAlerts.length < itemsPerPage || page * itemsPerPage >= totalAlerts}
                  onClick={() => setPage(page + 1)}
                  aria-label={`Go to next page, current page ${page}`}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
