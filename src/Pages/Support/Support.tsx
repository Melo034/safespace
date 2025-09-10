import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import supabase from "@/server/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import  Navbar  from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Phone,
  Globe,
  Scale,
  Heart,
  Users,
  Shield,
  MessageCircle,
  Plus,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Loading from "@/components/utils/Loading";
import LiveChat from "@/components/Home/LiveChat";
import type { SupportService } from "@/lib/types";
import SOSButton from "@/components/utils/SOSButton";

const typeIcons = {
  lawyer: Scale,
  therapist: Heart,
  activist: Shield,
  "support-group": Users,
};

const VALID_TYPES = ["lawyer", "therapist", "activist", "support-group"] as const;
type ServiceType = (typeof VALID_TYPES)[number];

const VALID_AVAILABILITY = ["available", "limited", "unavailable"] as const;
type AvailabilityType = (typeof VALID_AVAILABILITY)[number];

function toInitials(name?: string) {
  const clean = (name || "").trim();
  if (!clean) return "?";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || "?";
}

type SupportServiceRow = {
  id: string;
  name?: string | null;
  type?: string | null;
  title?: string | null;
  specialization?: string | null;
  description?: string | null;
  contact_info?: {
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  website?: string | null;
  avatar?: string | null;
  rating?: number | null;
  reviews?: number | null;
  verified?: boolean | null;
  availability?: string | null;
  status?: string | null;
  credentials?: string | null;
  languages?: unknown;
  tags?: unknown;
};

function mapRow(row: SupportServiceRow): SupportService {
  return {
    id: row.id,
    name: row.name || "",
    type: (VALID_TYPES as readonly string[]).includes(row.type as string) ? (row.type as ServiceType) : "lawyer",
    title: row.title || "",
    specialization: row.specialization || "",
    description: row.description || "",
    contact_info: {
      address: row?.contact_info?.address || "",
      phone: row?.contact_info?.phone || "",
      email: row?.contact_info?.email || "",
    },
    website: row.website || "",
    avatar: row.avatar || "",
    rating: typeof row.rating === "number" ? row.rating : null,
    reviews: row.reviews || 0,
    verified: !!row.verified,
    availability: (VALID_AVAILABILITY as readonly string[]).includes(row.availability as string)
      ? (row.availability as AvailabilityType)
      : "unavailable",
    status: row.status || "pending",
    credentials: row.credentials || "",
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  } as SupportService;
}

const Support = () => {
  const [supportServices, setSupportServices] = useState<SupportService[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ServiceType>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | AvailabilityType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupportServices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("support_services")
          .select("*")
          .eq("status", "approved");

        if (error) throw error;
        setSupportServices((data || []).map(mapRow));
      } catch (error: unknown) {
        console.error("Error fetching support services:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load support services.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupportServices();

    const channel = supabase
      .channel("support-services-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_services" },
        (payload) => {
          // Handle DELETE early
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<SupportServiceRow> | null;
            if (!oldRow?.id) return;
            setSupportServices((prev) => prev.filter((item) => item.id !== oldRow.id));
            return;
          }

          const newRow = payload.new as SupportServiceRow | null;
          if (!newRow) return;

          // Only show approved items
          if (newRow.status !== "approved") {
            setSupportServices((prev) => prev.filter((item) => item.id !== newRow.id));
            return;
          }

          const mapped = mapRow(newRow);

          if (payload.eventType === "INSERT") {
            setSupportServices((prev) => {
              // avoid dupes
              if (prev.some((p) => p.id === mapped.id)) {
                return prev.map((p) => (p.id === mapped.id ? mapped : p));
              }
              return [...prev, mapped];
            });
          } else if (payload.eventType === "UPDATE") {
            setSupportServices((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredSupport = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return supportServices.filter((support) => {
      const matchesSearch =
        support.name.toLowerCase().includes(q) ||
        support.specialization.toLowerCase().includes(q) ||
        support.description.toLowerCase().includes(q) ||
        support.tags.some((tag) => tag.toLowerCase().includes(q));

      const matchesType = typeFilter === "all" || support.type === typeFilter;
      const matchesAvailability = availabilityFilter === "all" || support.availability === availabilityFilter;

      return matchesSearch && matchesType && matchesAvailability;
    });
  }, [supportServices, searchTerm, typeFilter, availabilityFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center mb-10">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> Verified & Trusted
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">Professional Support</span>
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with vetted lawyers, therapists, activists, and support groups to help survivors and allies.
          </p>
          <Button asChild >
            <Link to="/support/apply">
              <Plus className="h-4 w-4 mr-2" />
              Apply to Offer Support Services
            </Link>
          </Button>
        </div>

        <div className="max-w-6xl mx-auto mb-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Search className="h-5 w-5 text-primary" /> Find Support
              </CardTitle>
              <CardDescription>Search by name, specialization, tags, type, or availability.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, specialization, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    disabled={loading}
                    aria-label="Search support services"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => setTypeFilter(value as "all" | ServiceType)}
                    disabled={loading}
                    aria-label="Filter by type"
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All Types</SelectItem>
                      {VALID_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={availabilityFilter}
                    onValueChange={(value) => setAvailabilityFilter(value as "all" | AvailabilityType)}
                    disabled={loading}
                    aria-label="Filter by availability"
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All</SelectItem>
                      {VALID_AVAILABILITY.map((availability) => (
                        <SelectItem key={availability} value={availability}>
                          {availability.charAt(0).toUpperCase() + availability.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Available Support ({filteredSupport.length})</h2>
          </div>

          {loading ? (
            <div className="text-center py-12 flex justify-center mx-auto">
              <Loading />
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSupport.map((support) => {
                const IconComponent =
                  typeIcons[support.type as keyof typeof typeIcons] || Users;

                const hasEmail = !!support.contact_info.email;
                const hasPhone = !!support.contact_info.phone;
                const hasWebsite = !!support.website;

                return (
                  <Card key={support.id} className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={support.avatar || "/placeholder-avatar.png"}
                            alt={support.name || "Support service avatar"}
                          />
                          <AvatarFallback>{toInitials(support.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {support.name || "Unnamed Service"}
                            </CardTitle>
                            {support.verified && <CheckCircle className="h-4 w-4 text-green-500" aria-label="Verified" />}
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <IconComponent className="h-4 w-4 text-primary" />
                            <Badge variant="outline" className="text-xs">
                              {support.type.replace("-", " ")}
                            </Badge>
                            <Badge
                              variant={support.availability === "available" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {support.availability.charAt(0).toUpperCase() + support.availability.slice(1)}
                            </Badge>
                          </div>
                          {support.title && (
                            <p className="text-sm font-medium text-muted-foreground mb-1">{support.title}</p>
                          )}
                          {support.specialization && (
                            <p className="text-sm text-primary font-medium">{support.specialization}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {support.rating !== null && (
                            <>
                              <div className="flex items-center space-x-1 mb-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{support.rating.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{support.reviews} reviews</p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {support.description && (
                        <CardDescription className="mb-4 line-clamp-3">{support.description}</CardDescription>
                      )}

                      {(support.contact_info.address || hasPhone || hasWebsite) && (
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                          {support.contact_info.address && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{support.contact_info.address}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {support.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {support.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag.replace("-", " ")}
                            </Badge>
                          ))}
                          {support.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{support.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {hasEmail && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => (window.location.href = `mailto:${support.contact_info.email}`)}
                            aria-label={`Email ${support.name || "support service"}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Contact
                          </Button>
                        )}
                        {hasPhone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => (window.location.href = `tel:${support.contact_info.phone}`)}
                            aria-label={`Call ${support.name || "support service"}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        {hasWebsite && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(support.website, "_blank", "noopener,noreferrer")}
                            aria-label={`Visit website of ${support.name || "support service"}`}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Website
                          </Button>
                        )}
                      </div>

                      {support.languages?.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Languages: {support.languages.join(", ")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredSupport.length === 0 && !loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No support services found</h3>
                <p className="text-sm text-muted-foreground">Try different keywords, types, or availability.</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto mt-12">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" /> Emergency Support
              </CardTitle>
              <CardDescription>Contact your local emergency services if you are in immediate danger.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Crisis Hotlines</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>
                      National: <a href="tel:1-800-799-7233" className="text-primary hover:underline">1-800-799-7233</a>
                    </li>
                    <li>
                      Crisis Text: Text START to <a href="sms:88788" className="text-primary hover:underline">88788</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Legal Emergency</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Emergency Protection Orders</li>
                    <li>
                      24/7 Legal Aid: <a href="tel:1-800-621-4357" className="text-primary hover:underline">1-800-621-4357</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Immediate Safety</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>
                      Emergency: <a href="tel:911" className="text-primary hover:underline">911</a>
                    </li>
                    <li>
                      Safe Shelter: <a href="tel:1-800-942-6906" className="text-primary hover:underline">1-800-942-6906</a>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <SOSButton/>
      <LiveChat />
      <Footer />
    </div>
  );
};

export default Support;
