import React, { useState, useEffect, useMemo, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Eye,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import supabase from "@/server/supabase";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader";
import type {
  ImpactDataItem,
  EngagementDataItem,
  MonthlyDataItem,
} from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c"];

function monthStr(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function emptyMonth(): MonthlyDataItem {
  return {
    month: monthStr(),
    reports: 0,
    stories: 0,
    resources: 0,
    support: 0,
    impact_data: [],
    engagement_data: [],
  };
}

function titleize(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function updateEngagement(
  engagement: EngagementDataItem[],
  metric: "Story Views" | "Comments" | "Likes",
  nextValue: number
): EngagementDataItem[] {
  const idx = engagement.findIndex((e) => e.metric === metric);
  if (idx === -1) return [...engagement, { metric, current: nextValue, change: 0 }];
  const prev = engagement[idx]?.current ?? 0;
  const change = prev ? Math.round(((nextValue - prev) / prev) * 100) : 0;
  const next = [...engagement];
  next[idx] = { metric, current: nextValue, change };
  return next;
}

const Analytics: React.FC = () => {
  const { loading: sessionLoading } = useAdminSession();

  const [monthlyData, setMonthlyData] = useState<MonthlyDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [previousCounts, setPreviousCounts] = useState<{
    reports: number;
    stories: number;
    resources: number;
    support: number;
  }>({ reports: 0, stories: 0, resources: 0, support: 0 });
  const [reportTypeDistribution, setReportTypeDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Totals
      const [reportsRes, storiesRes, resourcesRes, supportRes] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("stories").select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("support_services").select("*", { count: "exact", head: true }),
      ]);

      const totalReports = reportsRes.count ?? 0;
      const totalStories = storiesRes.count ?? 0;
      const totalResources = resourcesRes.count ?? 0;
      const totalSupport = supportRes.count ?? 0;

      // Engagement
      const [
        { data: likeRows },
        { data: viewRows },
        commentsRes,
      ] = await Promise.all([
        supabase.from("story_like_counts").select("likes"),
        supabase.from("story_view_counts").select("views"),
        supabase.from("comments").select("id", { count: "exact", head: true }),
      ]);

      const likesTotal = (likeRows ?? []).reduce<number>(
        (acc, r: { likes: number | null }) => acc + (r.likes ?? 0),
        0
      );
      const viewsTotal = (viewRows ?? []).reduce<number>(
        (acc, r: { views: number | null }) => acc + (r.views ?? 0),
        0
      );
      const commentsTotal = commentsRes.count ?? 0;

      const engagement_data: EngagementDataItem[] = [
        { metric: "Story Views", current: viewsTotal, change: 0 },
        { metric: "Comments", current: commentsTotal, change: 0 },
        { metric: "Likes", current: likesTotal, change: 0 },
      ];

      // Impact, resources by category
      const { data: resCats } = await supabase.from("resources").select("category");
      const catCounts = (resCats ?? []).reduce<Record<string, number>>(
        (acc, r: { category: string | null }) => {
          const key = r.category ?? "unknown";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {}
      );
      const impact_data: ImpactDataItem[] = Object.entries(catCounts)
        .map(([name, value]) => ({ name: titleize(name), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const snapshot: MonthlyDataItem = {
        month: monthStr(),
        reports: totalReports,
        stories: totalStories,
        resources: totalResources,
        support: totalSupport,
        impact_data,
        engagement_data,
      };

      setMonthlyData([snapshot]);
      setPreviousCounts({
        reports: totalReports,
        stories: totalStories,
        resources: totalResources,
        support: totalSupport,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analytics data.");
      toast.error("Failed to fetch analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    fetchAnalytics();

    const channels: RealtimeChannel[] = [
      supabase
        .channel("reports-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reports" },
          async () => {
            const { count } = await supabase
              .from("reports")
              .select("*", { count: "exact", head: true });
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const next: MonthlyDataItem = { ...base, reports: count ?? 0 };
              return [next];
            });
            setPreviousCounts((prev) => ({ ...prev, reports: count ?? 0 }));
          }
        ),
      supabase
        .channel("stories-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "stories" },
          async () => {
            const { count } = await supabase
              .from("stories")
              .select("*", { count: "exact", head: true });
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const next: MonthlyDataItem = { ...base, stories: count ?? 0 };
              return [next];
            });
            setPreviousCounts((prev) => ({ ...prev, stories: count ?? 0 }));
          }
        ),
      supabase
        .channel("resources-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "resources" },
          async () => {
            const { count, data } = await supabase
              .from("resources")
              .select("*", { count: "exact" });
            const catCounts = (data ?? []).reduce<Record<string, number>>(
              (acc, r: { category: string | null }) => {
                const key = r.category ?? "unknown";
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
              },
              {}
            );
            const impact_data: ImpactDataItem[] = Object.entries(catCounts)
              .map(([name, value]) => ({ name: titleize(name), value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5);

            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const next: MonthlyDataItem = {
                ...base,
                resources: count ?? 0,
                impact_data,
              };
              return [next];
            });
            setPreviousCounts((prev) => ({ ...prev, resources: count ?? 0 }));
          }
        ),
      supabase
        .channel("support_services-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_services" },
          async () => {
            const { count } = await supabase
              .from("support_services")
              .select("*", { count: "exact", head: true });
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const next: MonthlyDataItem = { ...base, support: count ?? 0 };
              return [next];
            });
            setPreviousCounts((prev) => ({ ...prev, support: count ?? 0 }));
          }
        ),
      supabase
        .channel("comments-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comments" },
          async () => {
            const { count } = await supabase
              .from("comments")
              .select("*", { count: "exact", head: true });
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const nextEng = updateEngagement(
                base.engagement_data ?? [],
                "Comments",
                count ?? 0
              );
              const next: MonthlyDataItem = { ...base, engagement_data: nextEng };
              return [next];
            });
          }
        ),
      supabase
        .channel("story_like_counts-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "story_like_counts" },
          async () => {
            const { data } = await supabase
              .from("story_like_counts")
              .select("likes");
            const likesTotal = (data ?? []).reduce<number>(
              (acc, r: { likes: number | null }) => acc + (r.likes ?? 0),
              0
            );
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const nextEng = updateEngagement(
                base.engagement_data ?? [],
                "Likes",
                likesTotal
              );
              const next: MonthlyDataItem = { ...base, engagement_data: nextEng };
              return [next];
            });
          }
        ),
      supabase
        .channel("story_view_counts-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "story_view_counts" },
          async () => {
            const { data } = await supabase
              .from("story_view_counts")
              .select("views");
            const viewsTotal = (data ?? []).reduce<number>(
              (acc, r: { views: number | null }) => acc + (r.views ?? 0),
              0
            );
            setMonthlyData((prev) => {
              const base = prev[0] ?? emptyMonth();
              const nextEng = updateEngagement(
                base.engagement_data ?? [],
                "Story Views",
                viewsTotal
              );
              const next: MonthlyDataItem = { ...base, engagement_data: nextEng };
              return [next];
            });
          }
        ),
    ];

    channels.forEach((c) =>
      c.subscribe((_status, err?: unknown) => {
        if (err) {
          console.error(`Realtime error on ${c.topic}`, err);
          toast.error(`Realtime error on ${c.topic}`);
        }
      })
    );

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [sessionLoading, fetchAnalytics]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.from("reports").select("type");
        if (error) throw error;

        const counts = (data ?? []).reduce<Record<string, number>>(
          (acc, r: { type: string | null }) => {
            const t = r.type ?? "other";
            acc[t] = (acc[t] ?? 0) + 1;
            return acc;
          },
          {}
        );
        const dist = Object.entries(counts).map(([name, value], i) => ({
          name: titleize(name),
          value,
          color: COLORS[i % COLORS.length],
        }));
        setReportTypeDistribution(dist);
      } catch {
        setReportTypeDistribution([]);
      }
    };
    if (!sessionLoading) run();
  }, [sessionLoading]);

  const {
    totalReports,
    totalStories,
    totalResources,
    totalSupport,
    reportChange,
    storyChange,
    resourceChange,
    supportChange,
  } = useMemo(() => {
    if (monthlyData.length === 0) {
      return {
        totalReports: 0,
        totalStories: 0,
        totalResources: 0,
        totalSupport: 0,
        reportChange: 0,
        storyChange: 0,
        resourceChange: 0,
        supportChange: 0,
      };
    }
    const m: MonthlyDataItem = monthlyData[monthlyData.length - 1];
    const changePct = (cur: number, prev: number) =>
      prev ? Math.round(((cur - prev) / prev) * 100) : 0;
    return {
      totalReports: m.reports,
      totalStories: m.stories,
      totalResources: m.resources,
      totalSupport: m.support,
      reportChange: changePct(m.reports, previousCounts.reports),
      storyChange: changePct(m.stories, previousCounts.stories),
      resourceChange: changePct(m.resources, previousCounts.resources),
      supportChange: changePct(m.support, previousCounts.support),
    };
  }, [monthlyData, previousCounts]);

  const latestMonth: MonthlyDataItem | undefined =
    monthlyData[monthlyData.length - 1];
  const impactData: ImpactDataItem[] = latestMonth?.impact_data ?? [];
  const engagementData: EngagementDataItem[] = latestMonth?.engagement_data ?? [];
  const maxImpactValue =
    impactData.length > 0 ? Math.max(...impactData.map((i) => i.value)) : 1;

  if (error) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-6 text-center" role="alert" aria-live="assertive">
            <p className="text-red-500 text-sm">{error}</p>
            <Button onClick={fetchAnalytics} className="mt-4" aria-label="Retry fetching analytics data">
              Retry
            </Button>
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
            { label: "Analytics" },
          ]}
        />

        <div className="p-6 space-y-6" role="main" aria-label="Analytics Dashboard">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform usage and impact metrics</p>
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 7 }).map((_, i) => (
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
              <Card>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Reports"
                  icon={<AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />}
                  value={totalReports.toLocaleString()}
                  change={`${reportChange >= 0 ? "+" : ""}${reportChange}%`}
                />
                <KPICard
                  title="Community Stories"
                  icon={<MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />}
                  value={totalStories.toLocaleString()}
                  change={`${storyChange >= 0 ? "+" : ""}${storyChange}%`}
                />
                <KPICard
                  title="Resources Shared"
                  icon={<BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />}
                  value={totalResources.toLocaleString()}
                  change={`${resourceChange >= 0 ? "+" : ""}${resourceChange}%`}
                />
                <KPICard
                  title="Support Services"
                  icon={<Users className="h-4 w-4 text-accent" aria-hidden="true" />}
                  value={totalSupport.toLocaleString()}
                  change={`${supportChange >= 0 ? "+" : ""}${supportChange}%`}
                />
              </div>

              <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Monthly Activity Trends</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {monthlyData.length === 0 ? (
                    <p className="text-center text-muted-foreground">No data available</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={monthlyData}
                          aria-label="Monthly activity trends chart"
                          role="img"
                          aria-describedby="monthly-activity-chart-description"
                        >
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="reports" fill="#8884d8" name="Reports" />
                          <Bar dataKey="stories" fill="#82ca9d" name="Stories" />
                          <Bar dataKey="resources" fill="#ffc658" name="Resources" />
                          <Bar dataKey="support" fill="#ff7300" name="Support" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div id="monthly-activity-chart-description" className="sr-only">
                        Bar chart showing monthly trends for reports, stories, resources, and support services.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">Report Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reportTypeDistribution.length === 0 ? (
                      <p className="text-center text-muted-foreground">No data available</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart
                            aria-label="Report type distribution chart"
                            role="img"
                            aria-describedby="report-type-chart-description"
                          >
                            <Pie
                              data={reportTypeDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(props) =>
                                `${props.name}: ${(((props.percent ?? 0) * 100) | 0).toString()}%`
                              }
                              outerRadius={80}
                              dataKey="value"
                            >
                              {reportTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div id="report-type-chart-description" className="sr-only">
                          Pie chart showing the distribution of report types.
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">Platform Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {impactData.length === 0 ? (
                      <p className="text-center text-muted-foreground">No impact data available</p>
                    ) : (
                      impactData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(item.value / maxImpactValue) * 100}
                              className="w-28"
                              aria-label={`${item.name}: ${item.value.toLocaleString()}`}
                            />
                            <span className="text-sm font-semibold text-foreground">
                              {item.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Community Engagement</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {engagementData.length === 0 ? (
                    <p className="text-center text-muted-foreground">No engagement data available</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {engagementData.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{item.metric}</span>
                            {item.metric === "Story Views" && (
                              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                            {item.metric === "Comments" && (
                              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                            {item.metric === "Likes" && (
                              <ThumbsUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                          </div>
                          <div
                            className="text-2xl font-semibold mb-1 text-foreground"
                            aria-label={`${item.metric}: ${item.current.toLocaleString()}`}
                          >
                            {item.current.toLocaleString()}
                          </div>
                          <div className="flex items-center text-xs">
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" aria-hidden="true" />
                            <span className="text-green-600">+{item.change}%</span>
                            <span className="text-muted-foreground ml-1">vs last month</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Analytics;

const KPICard: React.FC<{
  title: string;
  icon: React.ReactNode;
  value: string;
  change: string;
}> = ({ title, icon, value, change }) => (
  <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
        {title}
      </CardTitle>
      <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center ring-1 ring-border/40">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight text-foreground" aria-label={`${title}: ${value}`}>
        {value}
      </div>
      <div className="mt-1 flex items-center text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-green-600 mr-1" aria-hidden="true" />
        {change} from last fetch
      </div>
    </CardContent>
  </Card>
);
