// Dashboard.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
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
import type { DashAlert, DashActivity, DashboardStats, AlertPriority, AlertStatus, Story } from "@/lib/types";
import { IncidentType } from "@/lib/types";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader"; // adjust path if needed

const searchSchema = z.object({
  searchTerm: z.string().max(100, "Search term must be less than 100 characters"),
});

// Lightweight local stat card for consistent, modern styling
type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  bgColor: string;
  color: string;
};

const StatCard = ({
  title,
  value,
  description,
  icon: IconComponent,
  bgColor,
  color,
}: StatCardProps) => (
  <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
        {title}
      </CardTitle>
      <div className={`h-9 w-9 rounded-full ${bgColor} flex items-center justify-center ring-1 ring-border/40`}>
        <IconComponent className={`h-4 w-4 ${color}`} aria-hidden="true" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { loading: sessionLoading } = useAdminSession();

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
  const [lastId, setLastId] = useState<string | null>(null);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);
  const itemsPerPage = 10;

  // Route is guarded globally; no per-page gate needed

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        { count: totalReports, error: reportsError },
        { count: inProgressReports, error: inProgressError },
        { count: criticalReports, error: criticalError },
        { count: resolvedReports, error: resolvedError },
        { count: totalStories, error: storiesError },
        { count: totalMembers, error: membersError },
        { count: totalComments, error: commentsError },
        { count: totalAdmins, error: adminsError },
        { count: alertsCount, error: alertsCountError },
      ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "In Progress"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("priority", ["High", "Critical"]),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "Resolved"),
        supabase.from("stories").select("*", { count: "exact", head: true }),
        supabase.from("community_members").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("admin_members").select("*", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("status", ["Open", "In Progress"]) 
          .in("priority", ["High", "Critical"]),
      ]);

      if (reportsError || inProgressError || criticalError || resolvedError || storiesError || membersError || commentsError || adminsError || alertsCountError) {
        throw new Error("Failed to fetch some data");
      }

      setStats({
        totalReports: totalReports || 0,
        inProgressReports: inProgressReports || 0,
        criticalReports: criticalReports || 0,
        resolvedReports: resolvedReports || 0,
        totalStories: totalStories || 0,
        totalMembers: totalMembers || 0,
        totalComments: totalComments || 0,
        totalAdmins: totalAdmins || 0,
      });

      setTotalAlerts(alertsCount || 0);

      let alertsQuery = supabase
        .from("reports")
        .select("id,title,description,type,priority,status,location,created_at")
        .in("status", ["Open", "In Progress"])
        .in("priority", ["High", "Critical"])
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (page > 1 && lastId) {
        alertsQuery = alertsQuery.lt("id", lastId);
      }

      const { data: fetchedAlerts, error: alertsError } = await alertsQuery;
      if (alertsError) throw alertsError;

      const alertsData = (fetchedAlerts || []).map(
        (alert) =>
          ({
            id: alert.id,
            title: alert.title || "Untitled",
            message: alert.description || "",
            type: alert.type || IncidentType.Other,
            priority: alert.priority || "Medium",
            status: alert.status || "Open",
            location: alert.location || "Unknown",
            timestamp: alert.created_at || new Date().toISOString(),
            reportId: alert.id,
          }) as DashAlert
      );
      setAlerts(alertsData);
      setLastId(fetchedAlerts?.[fetchedAlerts.length - 1]?.id || null);

      const { data: activityData, error: activityError } = await supabase
        .from("recent_activity")
        .select("id,message,type,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (activityError) throw activityError;

      const recentActivityData = (activityData || []).map(
        (a) =>
          ({
            id: a.id,
            message: a.message || "",
            type: a.type || "report",
            status: a.status || "unknown",
            time: a.created_at || new Date().toISOString(),
          }) as DashActivity
      );
      setRecentActivity(recentActivityData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [page, lastId]);

  useEffect(() => {
    if (!sessionLoading) fetchData();

    const subs = [
      supabase
        .channel("reports-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
          // Map report row -> DashAlert, aligning with reports schema (created_at)
          const r = payload.new as Partial<{
            id: string;
            title: string;
            description: string;
            type: string;
            priority: string;
            status: string;
            location: string;
            created_at: string;
          }>;

          const newAlert: DashAlert = {
            id: r?.id as string,
            title: r?.title || "Untitled",
            message: r?.description || "",
            type: (r?.type as IncidentType) || IncidentType.Other,
            priority: (r?.priority as AlertPriority) || "Medium",
            status: (r?.status as AlertStatus) || "Open",
            location: r?.location || "Unknown",
            // Use created_at from reports table, not a non-existent 'timestamp' column
            timestamp: r?.created_at || new Date().toISOString(),
            reportId: r?.id as string,
          };

          if (payload.eventType === "INSERT" && ["High", "Critical"].includes(newAlert.priority)) {
            setAlerts((prev) =>
              [...prev, newAlert]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, itemsPerPage)
            );
            setRecentActivity((prev) => [
              {
                id: newAlert.id,
                message: `New ${newAlert.type} report: ${newAlert.title}`,
                type: "report",
                status: newAlert.status,
                time: newAlert.timestamp,
              },
              ...prev.slice(0, 4),
            ]);
            setStats((prev) => ({
              ...prev,
              totalReports: prev.totalReports + 1,
              criticalReports: ["High", "Critical"].includes(newAlert.priority)
                ? prev.criticalReports + 1
                : prev.criticalReports,
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
            setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }
        })
        .subscribe(),

      supabase
        .channel("stories-changes")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "stories" }, (payload) => {
          const data = payload.new as Story;
          setRecentActivity((prev) => [
            {
              id: data.id,
              message: `New story: ${data.title}`,
              type: "story",
              status: "published",
              time: data.created_at || new Date().toISOString(),
            },
            ...prev.slice(0, 4),
          ]);
          setStats((prev) => ({ ...prev, totalStories: prev.totalStories + 1 }));
        })
        .subscribe(),

      supabase
        .channel("comments-changes")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
          const d = payload.new as { id: string; created_at?: string };
          setRecentActivity((prev) => [
            {
              id: d.id,
              message: "New comment on story",
              type: "comment",
              status: "posted",
              time: d.created_at || new Date().toISOString(),
            },
            ...prev.slice(0, 4),
          ]);
          setStats((prev) => ({ ...prev, totalComments: prev.totalComments + 1 }));
        })
        .subscribe(),
    ];

    return () => subs.forEach((s) => supabase.removeChannel(s));
  }, [sessionLoading, fetchData]);

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
        inProgressReports: prev.inProgressReports - (prev.inProgressReports > 0 ? 1 : 0),
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
      default:
        return Clock;
    }
  };

  if (loading) {
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
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
                    </CardContent>
                  </Card>
                ))}
            </div>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
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
            const pluralize = (count: number, singular: string, plural: string) =>
              count >= 0 && count <= 1 ? singular : plural;

            const open = stats.totalReports;
            const openTitle = pluralize(open, "Open Case", "Open Cases");
            const openDesc = open === 0 ? "No open cases" : open === 1 ? "1 open case" : `${open} open cases`;

            const inProg = stats.inProgressReports;
            const inProgTitle = pluralize(inProg, "In-progress Report", "In-progress Reports");
            const inProgDesc = inProg === 0 ? "No reports under review" : inProg === 1 ? "1 report under review" : `${inProg} reports under review`;

            const critical = stats.criticalReports;
            const criticalTitle = pluralize(critical, "Critical Incident", "Critical Incidents");
            const criticalDesc = critical === 0 ? "No high-priority incidents" : critical === 1 ? "1 high-priority incident" : `${critical} high-priority incidents`;

            const resolved = stats.resolvedReports;
            const resolvedTitle = pluralize(resolved, "Resolved Case", "Resolved Cases");
            const resolvedDesc = resolved === 0 ? "No closed cases" : resolved === 1 ? "1 closed case" : `${resolved} closed cases`;

            const stories = stats.totalStories;
            const storyTitle = pluralize(stories, "Story", "Stories");
            const storyDesc = stories === 0 ? "No published stories" : stories === 1 ? "1 published story" : `${stories} published stories`;

            const members = stats.totalMembers;
            const memberTitle = pluralize(members, "Member", "Members");
            const memberDesc = members === 0 ? "No community members" : members === 1 ? "1 community member" : `${members} community members`;

            const comments = stats.totalComments;
            const commentTitle = pluralize(comments, "Comment", "Comments");
            const commentDesc = comments === 0 ? "No user comments" : comments === 1 ? "1 user comment" : `${comments} user comments`;

            const admins = stats.totalAdmins;
            const adminTitle = pluralize(admins, "Admin", "Admins");
            const adminDescription = admins === 0 ? "No administrator yet — add one" : admins === 1 ? "1 administrator" : `${admins} administrators`;

            const statsArray = [
              { title: openTitle, value: open, description: openDesc, icon: AlertTriangle, bgColor: "bg-red-100", color: "text-red-600" },
              { title: inProgTitle, value: inProg, description: inProgDesc, icon: MessageSquare, bgColor: "bg-blue-100", color: "text-blue-600" },
              { title: criticalTitle, value: critical, description: criticalDesc, icon: AlertTriangle, bgColor: "bg-orange-100", color: "text-orange-600" },
              { title: resolvedTitle, value: resolved, description: resolvedDesc, icon: CheckCircle, bgColor: "bg-green-100", color: "text-green-600" },
              { title: storyTitle, value: stories, description: storyDesc, icon: BookOpen, bgColor: "bg-purple-100", color: "text-purple-600" },
              { title: memberTitle, value: members, description: memberDesc, icon: Users, bgColor: "bg-teal-100", color: "text-teal-600" },
              { title: commentTitle, value: comments, description: commentDesc, icon: MessageSquare, bgColor: "bg-indigo-100", color: "text-indigo-600" },
              { title: adminTitle, value: admins, description: adminDescription, icon: Shield, bgColor: "bg-sky-100", color: "text-sky-600" },
            ];
            return statsArray;
          })().map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              bgColor={stat.bgColor}
              color={stat.color}
            />
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
                {recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(activity.time), { addSuffix: true })}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{activity.status}</Badge>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && (
                  <p className="text-center text-muted-foreground">No recent activity</p>
                )}
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
                <CheckCircle className="h-6 w-6 text-emerald-600 mt-1" aria-hidden="true" />
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
                <SearchIcon className="h-5 w-5" aria-hidden="true" />
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
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span>Active Alerts ({filteredAlerts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="" aria-label="Active alerts list">
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => {
                    const IconComponent = getAlertIcon(alert.type);
                    return (
                      <Alert
                        key={alert.id}
                        className={`relative ${alert.priority === "High" || alert.priority === "Critical" ? "border-destructive" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <IconComponent
                              className={`h-5 w-5 mt-0.5 ${alert.priority === "High" || alert.priority === "Critical"
                                ? "text-destructive"
                                : alert.priority === "Medium"
                                  ? "text-warning"
                                  : "text-success"
                                }`}
                              aria-hidden="true"
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
                                  <MapPin className="h-3 w-3" aria-hidden="true" />
                                  <span>{alert.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" aria-hidden="true" />
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
                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                Resolve
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDismissAlert(alert.id)} aria-label={`Dismiss ${alert.title}`}>
                              <XCircle className="h-4 w-4" aria-hidden="true" />
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
};

export default Dashboard;
