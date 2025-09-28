// src/pages/admin/CommunityManagement.tsx
import { useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import supabase from "@/server/supabase";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  Ban,
  Eye,
  Filter,
  Users,
  MessageSquare,
  Heart,
  BookOpen,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AppSidebar } from "@/components/utils/app-sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import type { CommunityMember } from "@/lib/types";

/** DB-aligned enums */
type CommunityStatus = "active" | "warned" | "suspended" | "banned";

/** Row shape returned by Supabase */
type CommunityMemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  status: CommunityStatus | null;
  join_date: string | null;
  last_active: string | null;
  avatar_url: string | null;
  bio: string | null;
  stories_count: number | null;
  comments_count: number | null;
  likes_received: number | null;
  reports_count: number | null;
  location: string | null;
  verified: boolean | null;
  violations:
    | Array<{
        type: "hate_speech" | "harassment" | "inappropriate_content" | "spam";
        date: string;
        description: string;
      }>
    | null;
};

const COMMUNITY_STATUS_VALUES: CommunityStatus[] = ["active", "warned", "suspended", "banned"];

const MODERATION_TO_STATUS: Record<"warn" | "suspend" | "ban" | "activate", CommunityStatus> = {
  warn: "warned",
  suspend: "suspended",
  ban: "banned",
  activate: "active",
};

const STATUS_LABELS: Record<CommunityStatus, string> = {
  active: "Active",
  warned: "Warned",
  suspended: "Suspended",
  banned: "Banned",
};

const normalizeStatus = (value: string | null): CommunityStatus =>
  COMMUNITY_STATUS_VALUES.includes(value as CommunityStatus) ? (value as CommunityStatus) : "active";

/** Validation */
const moderationSchema = z.object({
  reason: z.string().min(5).max(500),
});

const ITEMS_PER_PAGE = 10;

const CommunityManagement = () => {
  const { loading: sessionLoading, role } = useAdminSession();

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<CommunityStatus | "all">("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isModerationDialogOpen, setIsModerationDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [moderationAction, setModerationAction] =
    useState<"warn" | "suspend" | "ban" | "activate">("warn");
  const [moderationReason, setModerationReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const canModerate = useMemo(
    () => role === "super_admin" || role === "admin",
    [role]
  );

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // load members + realtime
  useEffect(() => {
    let active = true;

    const fetchMembers = async () => {
      try {
        setLoading(true);
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = page * ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("community_members")
          .select(
            "id,name,email,username,status,join_date,last_active,avatar_url,bio,stories_count,comments_count,likes_received,reports_count,location,verified,violations"
          )
          .order("join_date", { ascending: false })
          .range(start, end);

        if (filterStatus !== "all") query = query.eq("status", filterStatus);

        if (debouncedSearch) {
          const q = debouncedSearch.replace(/'/g, "''");
          query = query.or(
            `name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!active) return;

        const rows: CommunityMember[] = (data ?? []).map((d: CommunityMemberRow) => ({
          id: d.id,
          name: d.name ?? "Anonymous",
          email: d.email ?? "",
          username: d.username ?? "",
          status: normalizeStatus(d.status),
          join_date: d.join_date ?? new Date().toISOString(),
          last_active: d.last_active ?? new Date().toISOString(),
          avatar: d.avatar_url ?? undefined,
          bio: d.bio ?? "",
          stories_count: d.stories_count ?? 0,
          comments_count: d.comments_count ?? 0,
          likes_received: d.likes_received ?? 0,
          reports_count: d.reports_count ?? 0,
          location: d.location ?? "",
          verified: d.verified ?? false,
          violations: (d.violations ?? []) as CommunityMember["violations"],
        }));

        setMembers(rows);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load community members.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (!sessionLoading) fetchMembers();

    const channel: RealtimeChannel = supabase
      .channel("community_members_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [page, filterStatus, debouncedSearch, sessionLoading]);

  // derived for current page view
  const filteredMembers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || m.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [members, searchTerm, filterStatus]);

  const validateModeration = () => {
    const res = moderationSchema.safeParse({ reason: moderationReason });
    if (!res.success) {
      setReasonError(
        res.error.flatten().fieldErrors.reason?.[0] || "Invalid reason"
      );
      return false;
    }
    setReasonError(null);
    return true;
  };

  // moderation
  const handleModerationAction = async () => {
    if (!selectedMember) return;
    if (!canModerate) {
      toast.error("Not allowed.");
      return;
    }
    if (!validateModeration()) return;

    try {
      setLoading(true);

      const nextStatus = MODERATION_TO_STATUS[moderationAction];

      const currentViolations = Array.isArray(selectedMember.violations)
        ? selectedMember.violations
        : [];

      const updatedViolations: CommunityMember["violations"] =
        moderationAction === "activate"
          ? currentViolations
          : [
              ...currentViolations,
              {
                type:
                  moderationAction === "ban"
                    ? "hate_speech"
                    : moderationAction === "suspend"
                    ? "inappropriate_content"
                    : "harassment",
                date: new Date().toISOString(),
                description: moderationReason,
              },
            ];

      const nextReports =
        moderationAction === "activate"
          ? selectedMember.reports_count
          : selectedMember.reports_count + 1;

      const { error } = await supabase
        .from("community_members")
        .update({
          status: nextStatus,
          violations: updatedViolations,
          reports_count: nextReports,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMember.id);

      if (error) {
        console.error("Moderation update failed", error, {
          memberId: selectedMember.id,
          nextStatus,
          nextReports,
          violationsCount: updatedViolations.length,
        });
        throw error;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? {
                ...m,
                status: nextStatus,
                violations: updatedViolations,
                reports_count: nextReports,
              }
            : m
        )
      );

      setSelectedMember((prev) =>
        prev && prev.id === selectedMember.id
          ? {
              ...prev,
              status: nextStatus,
              violations: updatedViolations,
              reports_count: nextReports,
            }
          : prev
      );

      setIsModerationDialogOpen(false);
      setModerationReason("");
      toast.success(
        moderationAction === "activate" ? "Member activated" : `Member ${moderationAction}ed`
      );
    } catch (e) {
      const err = e as PostgrestError | Error;
      if ("code" in (err ?? {})) {
        console.error("Failed to apply moderation action", err);
        toast.error(err.message ?? "Failed to apply moderation action.");
      } else {
        console.error("Failed to apply moderation action", err);
        toast.error(err instanceof Error ? err.message : "Failed to apply moderation action.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewMember = (member: CommunityMember) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  const handleModerationClick = (member: CommunityMember) => {
    setSelectedMember(member);
    setIsModerationDialogOpen(true);
  };

  const getStatusColor = (status: CommunityStatus) => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "warned":
        return "bg-yellow-500 text-black";
      case "suspended":
        return "bg-orange-500 text-white";
      case "banned":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getViolationTypeColor = (
    type: "hate_speech" | "harassment" | "inappropriate_content" | "spam"
  ) => {
    switch (type) {
      case "hate_speech":
        return "bg-red-100 text-red-800";
      case "harassment":
        return "bg-orange-100 text-orange-800";
      case "inappropriate_content":
        return "bg-yellow-100 text-yellow-800";
      case "spam":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Community Management" },
          ]}
        />

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Community Moderation</h1>
              <p className="text-muted-foreground">
                Monitor and manage community members
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-500" />}
              label="Total Members"
              value={members.length}
            />
            <StatCard
              icon={<Shield className="h-5 w-5 text-green-500" />}
              label="Active"
              value={members.filter((m) => m.status === "active").length}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
              label="Warned"
              value={members.filter((m) => m.status === "warned").length}
            />
            <StatCard
              icon={<Ban className="h-5 w-5 text-orange-500" />}
              label="Suspended"
              value={members.filter((m) => m.status === "suspended").length}
            />
            <StatCard
              icon={<Ban className="h-5 w-5 text-red-500" />}
              label="Banned"
              value={members.filter((m) => m.status === "banned").length}
            />
          </div>

          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-foreground">
                Community Members
              </CardTitle>
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => {
                      setPage(1);
                      setSearchTerm(e.target.value);
                    }}
                    className="pl-10"
                    aria-label="Search community members"
                  />
                </div>
                <Select
                  value={filterStatus}
                  onValueChange={(v) => {
                    setPage(1);
                    setFilterStatus(v as CommunityStatus | "all");
                  }}
                  aria-label="Filter by status"
                >
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="warned">Warned</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                  <p className="sr-only">Loading community members...</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[60vh]">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Reports</TableHead>
                          <TableHead>Join Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow
                            key={member.id}
                            className="even:bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatar} loading="lazy" />
                                  <AvatarFallback>
                                    {member.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{member.name}</p>
                                    {member.verified && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-600"
                                      >
                                        Verified
                                      </Badge>
                                    )}
                                    {member.violations.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-red-50 text-red-600"
                                      >
                                        {member.violations.length} Violations
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    @{member.username}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(member.status)}>
                                {STATUS_LABELS[member.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>{member.stories_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>{member.comments_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-4 w-4" />
                                  <span>{member.likes_received}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{member.reports_count}</TableCell>
                            <TableCell>
                              {formatDistanceToNow(parseISO(member.join_date), {
                                addSuffix: true,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={() => handleViewMember(member)}
                                      aria-label={`View ${member.name}'s profile`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View profile</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={() => handleModerationClick(member)}
                                      disabled={!canModerate}
                                      aria-label={`Moderate ${member.name}`}
                                    >
                                      <Shield className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Moderate</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {filteredMembers.length === 0 && (
                    <div className="text-center py-12">
                      <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No members found
                      </h3>
                      <p className="text-muted-foreground">
                        Try different search terms or filters.
                      </p>
                    </div>
                  )}

                  {members.length >= page * ITEMS_PER_PAGE && (
                    <div className="text-center mt-6">
                      <Button
                        onClick={() => setPage(page + 1)}
                        aria-label="Load more members"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* View dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Member Profile</DialogTitle>
              </DialogHeader>
              {selectedMember && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedMember.avatar} />
                      <AvatarFallback>
                        {selectedMember.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {selectedMember.name}
                        </h3>
                        {selectedMember.verified && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-50 text-blue-600"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{selectedMember.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMember.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoCell label="Status">
                      <Badge className={getStatusColor(selectedMember.status)}>
                        {STATUS_LABELS[selectedMember.status]}
                      </Badge>
                    </InfoCell>
                    <InfoCell label="Location">
                      {selectedMember.location || "Not provided"}
                    </InfoCell>
                    <InfoCell label="Joined">
                      {formatDistanceToNow(parseISO(selectedMember.join_date), {
                        addSuffix: true,
                      })}
                    </InfoCell>
                    <InfoCell label="Last Active">
                      {formatDistanceToNow(parseISO(selectedMember.last_active), {
                        addSuffix: true,
                      })}
                    </InfoCell>
                  </div>

                  <InfoCell label="Bio">
                    {selectedMember.bio || "No bio provided"}
                  </InfoCell>

                  <div className="grid grid-cols-3 gap-4">
                    <InfoCell label="Stories">{selectedMember.stories_count}</InfoCell>
                    <InfoCell label="Comments">
                      {selectedMember.comments_count}
                    </InfoCell>
                    <InfoCell label="Likes">
                      {selectedMember.likes_received}
                    </InfoCell>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Violations ({selectedMember.violations.length})
                    </p>
                    {selectedMember.violations.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMember.violations.map((v, i) => (
                          <div key={i} className="border p-3 rounded-md">
                            <div className="flex items-center justify-between">
                              <Badge className={getViolationTypeColor(v.type)}>
                                {v.type.replace("_", " ")}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(v.date), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <p className="text-sm mt-2">{v.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No violations recorded
                      </p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                  aria-label="Close member profile"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Moderation dialog */}
          <Dialog open={isModerationDialogOpen} onOpenChange={setIsModerationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Moderate Member</DialogTitle>
                <DialogDescription>
                  Apply a moderation action to {selectedMember?.name || "this member"}.
                </DialogDescription>
              </DialogHeader>
              {selectedMember && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedMember.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.email}
                    </p>
                  </div>

                  <Select
                    value={moderationAction}
                    onValueChange={(v) =>
                      setModerationAction(
                        v as "warn" | "suspend" | "ban" | "activate"
                      )
                    }
                    aria-label="Select moderation action"
                    disabled={!canModerate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warn">Warn</SelectItem>
                      <SelectItem value="suspend">Suspend</SelectItem>
                      <SelectItem value="ban">Ban</SelectItem>
                      <SelectItem value="activate">Activate</SelectItem>
                    </SelectContent>
                  </Select>

                  <div>
                    <p className="text-sm font-medium mb-2">Reason for Action</p>
                    <Input
                      placeholder="Enter reason for moderation action..."
                      value={moderationReason}
                      onChange={(e) => {
                        setModerationReason(e.target.value);
                        setReasonError(null);
                      }}
                      aria-invalid={!!reasonError}
                      aria-describedby={reasonError ? "reason-error" : undefined}
                    />
                    {reasonError && (
                      <p id="reason-error" className="text-red-500 text-sm mt-1">
                        {reasonError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsModerationDialogOpen(false)}
                  aria-label="Cancel moderation"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleModerationAction}
                  disabled={loading || !!reasonError || !canModerate}
                  aria-label={`Apply ${moderationAction} action`}
                >
                  Apply Action
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CommunityManagement;

/** Small helpers */
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <CardContent className="p-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const InfoCell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-sm">{children}</p>
  </div>
);
