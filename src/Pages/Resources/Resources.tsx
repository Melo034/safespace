import { useState, useEffect } from "react";
import supabase from "@/server/supabase";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, ExternalLink, FileText, Globe, Search, Filter, Heart, BookOpen, Scale, Shield, Phone, Sparkles, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import LiveChat from "@/components/Home/LiveChat";
import { useLocation } from "react-router-dom";
import type { Resource } from "@/lib/types";
import { useSavedItems } from "@/hooks/useSavedItems";

const categoryIcons = {
  "safety-planning": Shield,
  "legal-aid": Scale,
  counseling: Heart,
  emergency: Phone,
  education: BookOpen,
} as const;

const VALID_CATEGORIES = ["safety-planning", "legal-aid", "counseling", "emergency", "education"] as const;
type CategoryType = (typeof VALID_CATEGORIES)[number];

const Resources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "pdf" | "website">("all");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { toggle: toggleSaved, isSaved } = useSavedItems();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("resources")
          .select("id,title,category,description,type,url,image,tags,downloads,views,is_verified")
          .eq("is_verified", true);

        if (error) throw error;

        type SupabaseResource = {
          id: string;
          title: string;
          category: string | null;
          description: string;
          type: string;
          url: string;
          image: string;
          tags: string[] | null;
          downloads: number | null;
          views: number | null;
          is_verified: boolean;
        };

        const cleaned: Resource[] = (data ?? []).map((r) => {
          const resource = r as SupabaseResource;
          // Narrow/normalize each field to match our DB schema + UI expectations
          const catRaw = resource.category;
          const cat = (VALID_CATEGORIES as readonly string[]).includes(catRaw ?? "")
            ? (catRaw as CategoryType)
            : ("" as CategoryType | "");
          const typeRaw = (resource.type ?? "website") as string;
          const typeNorm = typeRaw === "pdf" ? "pdf" : "website";

          return {
            id: resource.id as Resource["id"],
            title: resource.title ?? "",
            category: cat as CategoryType,
            description: resource.description ?? "",
            type: typeNorm as "pdf" | "website",
            url: resource.url ?? "",
            image: resource.image ?? "",
            tags: Array.isArray(resource.tags) ? (resource.tags as string[]) : [],
            downloads: Number(resource.downloads ?? 0),
            views: Number(resource.views ?? 0),
            is_verified: Boolean(resource.is_verified),
          } as Resource;
        });

        setResources(cleaned);
      } catch (err) {
        console.error("Error fetching resources:", err);
        toast.error("Failed to load resources.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Apply Starter Kit from URL (?kit=legal-aid|safety-planning|counseling|emergency|education)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const kit = params.get("kit");
      const allowed = VALID_CATEGORIES as readonly string[];
      if (kit && allowed.includes(kit)) setCategoryFilter(kit as CategoryType);
    } catch {
      /* ignore invalid querystring */
    }
  }, [location.search]);

  const openResource = (resource: Resource) => {
    try {
      if (resource.type === "website") {
        const u = new URL(resource.url);
        window.open(u.toString(), "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = resource.url;
        link.download = resource.title || "download";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      toast.error("Invalid resource link.");
    }
  };

  const incrementMetric = async (resource: Resource) => {
    // Best-effort: try RPC first (atomic in DB). If not present, fall back to a direct update.
    type Metric = "downloads" | "views";
    const metric: Metric = resource.type === "pdf" ? "downloads" : "views";

    try {
      const { error } = await supabase.rpc("bump_resource_metric", {
        _id: resource.id,
        _metric: metric,
      });

      if (error) {
        // If RPC is missing (PGRST202), attempt a non-atomic update as a fallback.
        type SupabaseError = { code?: string };
        const err = error as SupabaseError;
        if (err.code === "PGRST202") {
          const next = (resource[metric] ?? 0) + 1;
          await supabase.from("resources").update({ [metric]: next }).eq("id", resource.id);
        } else {
          throw error;
        }
      }

      // Optimistic UI
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id
            ? {
              ...r,
              [metric]:
                metric === "downloads"
                  ? (r.downloads ?? 0) + 1
                  : (r.views ?? 0) + 1,
            }
            : r
        )
      );
    } catch (e) {
      // Silent: public users may be blocked by RLS; UI already updated optimistically
      console.debug("Metric update failed:", e);
    }
  };

  const handleResourceClick = (resource: Resource) => {
    openResource(resource);
    incrementMetric(resource);
  };

  const filteredResources = resources.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (Array.isArray(r.tags) && r.tags.some((t) => t.toLowerCase().includes(q)));
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main id="main" className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center mb-10">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> Curated & Verified
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">Support Resources</span>
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Access trusted guides, hotlines, and services to help survivors and allies.
          </p>
        </div>

        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Featured Resources</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading resources...</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredResources.map((resource) => {
                const IconComponent =
                  categoryIcons[resource.category as keyof typeof categoryIcons] || FileText;
                return (
                  <Card
                    key={resource.id}
                    className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border"
                  >
                    <div className="relative">
                      <img
                        src={resource.image || "/placeholder-image.png"}
                        alt={resource.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground">
                          Featured
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant={resource.type === "pdf" ? "destructive" : "default"}>
                          {resource.type === "pdf" ? (
                            <FileText className="h-3 w-3 mr-1" />
                          ) : (
                            <Globe className="h-3 w-3 mr-1" />
                          )}
                          {resource.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <Badge variant="outline" className="text-xs">
                          {String(resource.category || "").replace("-", " ")}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {resource.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(resource.tags ?? []).slice(0, 3).map((tag) => (
                          <Badge key={`${resource.id}-${tag}`} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {resource.type === "pdf"
                            ? `${resource.downloads ?? 0} downloads`
                            : `${resource.views ?? 0} views`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResourceClick(resource)}
                            aria-label={
                              resource.type === "pdf"
                                ? `Download ${resource.title}`
                                : `Visit ${resource.title}`
                            }
                          >
                            {resource.type === "pdf" ? (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit
                              </>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.preventDefault(); toggleSaved("resources", resource.id); }}
                            aria-label={isSaved("resources", resource.id) ? `Unsave ${resource.title}` : `Save ${resource.title}`}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved("resources", resource.id) ? "fill-yellow-500 text-yellow-500" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!loading && filteredResources.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No resources found</h3>
                <p className="text-sm text-muted-foreground">Try different keywords or categories.</p>
              </div>
            </div>
          )}
        </div>
        <div className="max-w-6xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Find Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search resources by title, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    aria-label="Search resources"
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => setCategoryFilter(value as CategoryType | "all")}
                    disabled={loading}
                    aria-label="Filter by category"
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {VALID_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => setTypeFilter(value as "all" | "pdf" | "website")}
                    disabled={loading}
                    aria-label="Filter by type"
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">All Resources</h2>
            <div className="text-sm text-muted-foreground">
              Showing {filteredResources.length} of {resources.length} resources
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading resources...</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredResources.map((resource) => {
                const IconComponent =
                  categoryIcons[resource.category as keyof typeof categoryIcons] || FileText;
                return (
                  <Card key={resource.id} className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                    <div className="relative">
                      <img
                        src={resource.image || "/placeholder-image.png"}
                        alt={resource.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute bottom-2 left-2">
                        <Badge variant={resource.type === "pdf" ? "destructive" : "default"}>
                          {resource.type === "pdf" ? (
                            <FileText className="h-3 w-3 mr-1" />
                          ) : (
                            <Globe className="h-3 w-3 mr-1" />
                          )}
                          {resource.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex items-center space-x-2 mb-2">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="text-xs">
                          {String(resource.category || "").replace("-", " ")}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {resource.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(resource.tags ?? []).slice(0, 3).map((tag) => (
                          <Badge key={`${resource.id}-all-${tag}`} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {resource.type === "pdf"
                            ? `${resource.downloads ?? 0} downloads`
                            : `${resource.views ?? 0} views`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResourceClick(resource)}
                            aria-label={
                              resource.type === "pdf"
                                ? `Download ${resource.title}`
                                : `Visit ${resource.title}`
                            }
                          >
                            {resource.type === "pdf" ? (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit
                              </>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.preventDefault(); toggleSaved("resources", resource.id); }}
                            aria-label={isSaved("resources", resource.id) ? `Unsave ${resource.title}` : `Save ${resource.title}`}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved("resources", resource.id) ? "fill-yellow-500 text-yellow-500" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!loading && filteredResources.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No resources found</h3>
                <p className="text-sm text-muted-foreground">Try different keywords or categories.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <LiveChat />
      <Footer />
    </div>
  );
};

export default Resources;
