// src/components/admin/SupportServiceApprovals.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "@/server/supabase";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logRecentActivity } from "@/lib/recentActivity";
import {
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  MapPin,
  Star,
  Scale,
  Heart,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader";

/* ===== Constants / local types aligned to DB ===== */
const VALID_TYPES = ["lawyer", "therapist", "activist", "support-group"] as const;
type ServiceType = (typeof VALID_TYPES)[number];

type Availability = "available" | "limited" | "unavailable";
type ApprovalStatus = "pending" | "approved" | "rejected";

type DbSupportRow = {
  id: string;
  name: string | null;
  type: ServiceType | string | null;
  title: string | null;
  specialization: string | null;
  description: string | null;
  contact_info: {
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  website: string | null;
  avatar: string | null;
  rating: number | null;
  reviews: number | null;
  verified: boolean | null;
  availability: Availability | string | null;
  status: ApprovalStatus | string | null;
  credentials: string | null;
  languages: string[] | null;
  tags: string[] | null;
  updated_at?: string | null;
};

type UiSupport = {
  id: string;
  name: string;
  type: ServiceType;
  title: string;
  specialization: string;
  description: string;
  contact_info: { address: string; phone: string; email: string };
  website: string;
  avatar: string;
  rating: number | null;
  reviews: number;
  verified: boolean;
  availability: Availability;
  status: ApprovalStatus;
  credentials: string;
  languages: string[];
  tags: string[];
};

const toUi = (s: DbSupportRow): UiSupport => ({
  id: s.id,
  name: s.name ?? "",
  type: (VALID_TYPES.includes((s.type ?? "") as ServiceType) ? (s.type as ServiceType) : "lawyer"),
  title: s.title ?? "",
  specialization: s.specialization ?? "",
  description: s.description ?? "",
  contact_info: {
    address: s.contact_info?.address ?? "",
    phone: s.contact_info?.phone ?? "",
    email: s.contact_info?.email ?? "",
  },
  website: s.website ?? "",
  avatar: s.avatar ?? "",
  rating: s.rating ?? null,
  reviews: Number(s.reviews ?? 0),
  verified: !!s.verified,
  availability: (["available", "limited", "unavailable"].includes(String(s.availability)) ? (s.availability as Availability) : "unavailable"),
  status: (["pending", "approved", "rejected"].includes(String(s.status)) ? (s.status as ApprovalStatus) : "pending"),
  credentials: s.credentials ?? "",
  languages: Array.isArray(s.languages) ? s.languages : [],
  tags: Array.isArray(s.tags) ? s.tags : [],
});

const typeIcons: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  lawyer: Scale,
  therapist: Heart,
  activist: Shield,
  "support-group": Users,
};

const SupportServiceApprovals = () => {
  const { loading: sessionLoading } = useAdminSession();

  const [support, setSupport] = useState<UiSupport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ServiceType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>("all");
  const [selectedSupport, setSelectedSupport] = useState<UiSupport | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  /* load + realtime */
  useEffect(() => {
    if (sessionLoading) return;
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("support_services")
          .select(
            [
              "id",
              "name",
              "type",
              "title",
              "specialization",
              "description",
              "contact_info",
              "website",
              "avatar",
              "rating",
              "reviews",
              "verified",
              "availability",
              "status",
              "credentials",
              "languages",
              "tags",
              "updated_at",
            ].join(",")
          )
          .order("updated_at", { ascending: false, nullsFirst: false });

        if (error) throw error;
        if (!alive) return;
        setSupport(
          Array.isArray(data) && data.every(item => typeof item === "object" && item !== null && "id" in item)
            ? (data as DbSupportRow[]).map(toUi)
            : []
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch support services.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    const sub = supabase
      .channel("support_services_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_services" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const delId = (payload.old as { id?: string } | null)?.id;
          if (!delId) return;
          setSupport((prev) => prev.filter((x) => x.id !== delId));
          return;
        }
        const s = payload.new as DbSupportRow;
        const row = toUi(s);
        if (payload.eventType === "INSERT") {
          setSupport((prev) => [row, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setSupport((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        }
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(sub);
    };
  }, [sessionLoading]);

  /* actions */
  const handleView = (item: UiSupport) => {
    setSelectedSupport(item);
    setShowViewDialog(true);
  };

  const handleEdit = (item: UiSupport) => {
    setSelectedSupport(item);
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this support service?")) return;
    try {
      setLoading(true);
      const target = support.find((svc) => svc.id === id);
      const { error } = await supabase.from("support_services").delete().eq("id", id);
      if (error) throw error;
      toast.success("Support service deleted.");
      if (target) {
        await logRecentActivity({
          message: `Support service deleted: ${target.name}`,
          type: "support",
          status: "deleted",
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to delete support service.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("support_services")
        .update({
          status: "approved",
          verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id,status,verified,name")
        .single();
      if (error || !data) throw error || new Error("No row updated");
      // optimistic UI
      setSupport((prev) => prev.map(x => x.id === id ? { ...x, status: "approved", verified: true } : x));
      toast.success("Support service approved.");
      await logRecentActivity({
        message: `Support service approved: ${data.name ?? id}`,
        type: "support",
        status: "approved",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve support service.");
    } finally {
      setLoading(false);
    }
  };


  const handleReject = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("support_services")
        .update({
          status: "rejected",
          verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id,status,verified,name")
        .single();
      if (error || !data) throw error || new Error("No row updated");
      toast.success("Support service rejected.");
      await logRecentActivity({
        message: `Support service rejected: ${data.name ?? id}`,
        type: "support",
        status: "rejected",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject support service.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSupport = async () => {
    if (!selectedSupport) return;
    if (!VALID_TYPES.includes(selectedSupport.type)) {
      toast.error("Invalid service type.");
      return;
    }
    try {
      setLoading(true);
      const payload: Omit<DbSupportRow, "id"> = {
        name: selectedSupport.name,
        type: selectedSupport.type,
        title: selectedSupport.title,
        specialization: selectedSupport.specialization,
        description: selectedSupport.description,
        contact_info: selectedSupport.contact_info,
        website: selectedSupport.website,
        avatar: selectedSupport.avatar,
        rating: selectedSupport.rating,
        reviews: selectedSupport.reviews,
        verified: selectedSupport.verified,
        availability: selectedSupport.availability,
        status: selectedSupport.status,
        credentials: selectedSupport.credentials,
        languages: selectedSupport.languages,
        tags: selectedSupport.tags,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("support_services").update(payload).eq("id", selectedSupport.id);
      if (error) throw error;
      setShowEditDialog(false);
      toast.success("Support service updated.");
      await logRecentActivity({
        message: `Support service updated: ${selectedSupport.name}`,
        type: "support",
        status: selectedSupport.status,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update support service.");
    } finally {
      setLoading(false);
    }
  };

  /* helpers */
  const getStatusColor = (status: ApprovalStatus | string): "default" | "outline" | "destructive" | "secondary" => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getAvailabilityColor = (availability: Availability | string): "default" | "outline" | "destructive" | "secondary" => {
    switch (availability) {
      case "available":
        return "default";
      case "limited":
        return "outline";
      case "unavailable":
        return "destructive";
      default:
        return "secondary";
    }
  };

  /* filters */
  const filteredSupport = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return support.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.specialization.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [support, searchTerm, typeFilter, statusFilter]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Support Service Approvals" },
          ]}
        />

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-1">Support Services</h1>
              <p className="text-sm text-muted-foreground">
                Manage professional support services including lawyers, therapists, and advocates
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-sm">
                {support.length} {support.length === 1 ? "Service" : "Services"}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const total = support.length;
              const approved = support.filter((s) => s.status === "approved").length;
              const pending = support.filter((s) => s.status === "pending").length;
              const rejected = support.filter((s) => s.status === "rejected").length;
              const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
              const stats = [
                { title: plural(total, "Service", "Services"), value: total, description: total === 0 ? "No services yet" : `${total} total services`, icon: Users, bgColor: "bg-slate-100", color: "text-slate-600" },
                { title: "Approved", value: approved, description: approved === 0 ? "No approved services" : `${approved} approved`, icon: CheckCircle, bgColor: "bg-green-100", color: "text-green-600" },
                { title: "Pending", value: pending, description: pending === 0 ? "No pending reviews" : `${pending} pending reviews`, icon: Scale, bgColor: "bg-blue-100", color: "text-blue-600" },
                { title: "Rejected", value: rejected, description: rejected === 0 ? "No rejections" : `${rejected} rejected`, icon: XCircle, bgColor: "bg-red-100", color: "text-red-600" },
              ];
              return stats.map((s) => (
                <Card key={s.title} className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{s.title}</CardTitle>
                    <div className={`h-9 w-9 rounded-full ${s.bgColor} flex items-center justify-center ring-1 ring-border/40`}>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight text-foreground">{s.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>

          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search & Filter</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, specialization, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    disabled={loading}
                    aria-label="Search support services"
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as "all" | ServiceType)}
                    disabled={loading}
                    aria-label="Filter by type"
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {VALID_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as "all" | ApprovalStatus)}
                    disabled={loading}
                    aria-label="Filter by status"
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading support services...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSupport.map((item) => {
                const IconComponent = typeIcons[item.type] || Users;
                const cityRegion = item.contact_info.address
                  ? item.contact_info.address.split(",").slice(-2).join(",")
                  : "—";
                return (
                  <Card key={item.id} className="group rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 bg-primary/10 rounded-lg ring-1 ring-border/40">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.name}</h3>
                              <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                              <Badge variant={getAvailabilityColor(item.availability)}>{item.availability}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{item.title}</p>
                            <p className="text-sm font-medium text-primary mb-2">{item.specialization}</p>
                            <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{cityRegion}</span>
                              </div>
                              {item.rating && item.rating > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>
                                    {item.rating.toFixed(1)} ({item.reviews} reviews)
                                  </span>
                                </div>
                              )}
                              {item.languages.length > 0 && <div>Languages: {item.languages.join(", ")}</div>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleApprove(item.id)}
                                disabled={loading}
                                aria-label={`Approve ${item.name}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleReject(item.id)}
                                disabled={loading}
                                aria-label={`Reject ${item.name}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleView(item)}
                            disabled={loading}
                            aria-label={`View ${item.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleEdit(item)}
                            disabled={loading}
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(item.id)}
                            disabled={loading}
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && filteredSupport.length === 0 && (
            <Card className="rounded-xl border border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground">No support services found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </CardContent>
            </Card>
          )}

          {/* View dialog */}
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="max-w-2xl rounded-xl">
              <DialogHeader>
                <DialogTitle>Support Service Details</DialogTitle>
              </DialogHeader>
              {selectedSupport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm text-muted-foreground">{selectedSupport.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">
                        {selectedSupport.type.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm text-muted-foreground">{selectedSupport.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Specialization</Label>
                    <p className="text-sm text-muted-foreground">{selectedSupport.specialization}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{selectedSupport.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p className="text-sm text-muted-foreground">{selectedSupport.contact_info.address}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm text-muted-foreground">{selectedSupport.contact_info.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">{selectedSupport.contact_info.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Website</Label>
                      <p className="text-sm text-muted-foreground">{selectedSupport.website || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Credentials</Label>
                    <p className="text-sm text-muted-foreground">{selectedSupport.credentials}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Languages</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSupport.languages.join(", ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSupport.tags.join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl rounded-xl">
              <DialogHeader>
                <DialogTitle>Edit Support Service</DialogTitle>
              </DialogHeader>
              {selectedSupport && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateSupport();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <Input
                        value={selectedSupport.name}
                        onChange={(e) => setSelectedSupport({ ...selectedSupport, name: e.target.value })}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <Select
                        value={selectedSupport.type}
                        onValueChange={(v) => setSelectedSupport({ ...selectedSupport, type: v as ServiceType })}
                        disabled={loading}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.replace("-", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <Input
                      value={selectedSupport.title}
                      onChange={(e) => setSelectedSupport({ ...selectedSupport, title: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Specialization</Label>
                    <Input
                      value={selectedSupport.specialization}
                      onChange={(e) => setSelectedSupport({ ...selectedSupport, specialization: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <Textarea
                      value={selectedSupport.description}
                      onChange={(e) => setSelectedSupport({ ...selectedSupport, description: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <Input
                        value={selectedSupport.contact_info.address}
                        onChange={(e) =>
                          setSelectedSupport({
                            ...selectedSupport,
                            contact_info: { ...selectedSupport.contact_info, address: e.target.value },
                          })
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <Input
                        value={selectedSupport.contact_info.phone}
                        onChange={(e) =>
                          setSelectedSupport({
                            ...selectedSupport,
                            contact_info: { ...selectedSupport.contact_info, phone: e.target.value },
                          })
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        value={selectedSupport.contact_info.email}
                        onChange={(e) =>
                          setSelectedSupport({
                            ...selectedSupport,
                            contact_info: { ...selectedSupport.contact_info, email: e.target.value },
                          })
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Website</Label>
                      <Input
                        value={selectedSupport.website}
                        onChange={(e) => setSelectedSupport({ ...selectedSupport, website: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Credentials</Label>
                    <Input
                      value={selectedSupport.credentials}
                      onChange={(e) => setSelectedSupport({ ...selectedSupport, credentials: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Languages (comma-separated)</Label>
                    <Input
                      value={selectedSupport.languages.join(", ")}
                      onChange={(e) =>
                        setSelectedSupport({
                          ...selectedSupport,
                          languages: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                        })
                      }
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tags (comma-separated)</Label>
                    <Input
                      value={selectedSupport.tags.join(", ")}
                      onChange={(e) =>
                        setSelectedSupport({
                          ...selectedSupport,
                          tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Availability</Label>
                    <Select
                      value={selectedSupport.availability}
                      onValueChange={(v) =>
                        setSelectedSupport({ ...selectedSupport, availability: v as Availability })
                      }
                      disabled={loading}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={selectedSupport.status}
                      onValueChange={(v) =>
                        setSelectedSupport({ ...selectedSupport, status: v as ApprovalStatus })
                      }
                      disabled={loading}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      Update Support Service
                    </Button>
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

export default SupportServiceApprovals;
