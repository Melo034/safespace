// Saved.tsx — styled & aligned with your Supabase schema. Shows titles instead of raw IDs.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/server/supabase";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Sidebar from "../Components/Sidebar";
import { useSavedItems } from "@/hooks/useSavedItems";
import {
  Bookmark,
  BookOpen,
  FileText,
  Globe,
  Users,
  Scale,
  Heart,
  Shield,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────────────────────
// Minimal DB row shapes for the three lists
// ──────────────────────────────────────────────────────────────────────────────
type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  author_id: string | null;
  tags: string[] | null;
};

type ResourceRow = {
  id: string;
  title: string;
  category:
    | "safety-planning"
    | "legal-aid"
    | "counseling"
    | "emergency"
    | "education";
  type: "website" | "pdf";
  image: string | null;
  is_verified: boolean;
};

type SupportRow = {
  id: string;
  name: string | null;
  type: "lawyer" | "therapist" | "activist" | "support-group" | string | null;
  status: "pending" | "approved" | "rejected" | string | null;
  verified: boolean | null;
  avatar: string | null;
  availability: "available" | "limited" | "unavailable" | string | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers
// ──────────────────────────────────────────────────────────────────────────────
const categoryIcon: Record<ResourceRow["category"], React.ComponentType<{ className?: string }>> = {
  "safety-planning": Shield,
  "legal-aid": Scale,
  counseling: Heart,
  emergency: Shield,
  education: BookOpen
};

const serviceTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  lawyer: Scale,
  therapist: Heart,
  activist: Shield,
  "support-group": Users
};

function toInitials(name?: string | null) {
  const clean = (name || "").trim();
  if (!clean) return "?";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || "?";
}

function safePreview(s?: string | null, len = 60) {
  if (!s) return "";
  const t = s.trim();
  return t.length > len ? `${t.slice(0, len)}…` : t;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function Saved() {
  const { saved, toggle, isSaved } = useSavedItems();
  const [loading, setLoading] = useState(true);

  const [stories, setStories] = useState<StoryRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [services, setServices] = useState<SupportRow[]>([]);

  const storyIds = saved.stories;
  const resourceIds = saved.resources;
  const serviceIds = saved.support;

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);

        const [storiesRes, resourcesRes, servicesRes] = await Promise.all([
          storyIds.length
            ? supabase
                .from("stories")
                .select("id,title,content,created_at,author_id,tags")
                .in("id", storyIds)
            : Promise.resolve({ data: [] as StoryRow[], error: null }),
          resourceIds.length
            ? supabase
                .from("resources")
                .select("id,title,category,type,image,is_verified")
                .in("id", resourceIds)
            : Promise.resolve({ data: [] as ResourceRow[], error: null }),
          serviceIds.length
            ? supabase
                .from("support_services")
                .select(
                  "id,name,type,status,verified,avatar,availability"
                )
                .in("id", serviceIds)
            : Promise.resolve({ data: [] as SupportRow[], error: null })
        ]);

        if (!isActive) return;

        const storyMap = new Map(
          (storiesRes.data as StoryRow[]).map((r) => [r.id, r])
        );
        const resourceMap = new Map(
          (resourcesRes.data as ResourceRow[]).map((r) => [r.id, r])
        );
        const serviceMap = new Map(
          (servicesRes.data as SupportRow[]).map((r) => [r.id, r])
        );

        // Preserve saved order & filter missing rows (deleted or no longer visible)
        setStories(storyIds.map((id) => storyMap.get(id)).filter(Boolean) as StoryRow[]);
        setResources(resourceIds.map((id) => resourceMap.get(id)).filter(Boolean) as ResourceRow[]);
        setServices(serviceIds.map((id) => serviceMap.get(id)).filter(Boolean) as SupportRow[]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load your saved items.");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [storyIds, resourceIds, serviceIds]);

  const totalCount = useMemo(
    () => stories.length + resources.length + services.length,
    [stories.length, resources.length, services.length]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Saved Items
                    </CardTitle>
                    <CardDescription>
                      Your saved stories, resources, and support services.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {totalCount} total
                  </Badge>
                </div>
              </CardHeader>

              <Separator className="mx-6" />

              <CardContent className="pt-6">
                {/* STORIES */}
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Stories
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {stories.length}
                    </Badge>
                  </div>

                  {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={`s-skel-${i}`} className="rounded-md border p-3">
                          <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : stories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved stories.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {stories.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-md border p-3 hover:shadow-sm transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-md bg-primary/10 p-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/stories/${s.id}`}
                                className="line-clamp-1 text-sm font-medium hover:underline underline-offset-2"
                                title={s.title || safePreview(s.content)}
                              >
                                {s.title?.trim() ||
                                  safePreview(s.content, 80) ||
                                  "Untitled story"}
                              </Link>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {new Date(
                                    s.created_at || new Date().toISOString()
                                  ).toLocaleDateString()}
                                </span>
                                {Array.isArray(s.tags) && s.tags.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="line-clamp-1">
                                      {s.tags.slice(0, 2).join(", ")}
                                      {s.tags.length > 2 ? "…" : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                isSaved("stories", s.id)
                                  ? "Unsave story"
                                  : "Save story"
                              }
                              onClick={() => toggle("stories", s.id)}
                            >
                              <Bookmark
                                className={`h-4 w-4 ${
                                  isSaved("stories", s.id)
                                    ? "fill-yellow-500 text-yellow-500"
                                    : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator className="my-4" />

                {/* RESOURCES */}
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Resources
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {resources.length}
                    </Badge>
                  </div>

                  {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={`r-skel-${i}`} className="rounded-md border p-3">
                          <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved resources.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {resources.map((r) => {
                        const CatIcon =
                          categoryIcon[r.category] || FileText;
                        const typeIcon =
                          r.type === "pdf" ? FileText : Globe;
                        return (
                          <div
                            key={r.id}
                            className="rounded-md border p-3 hover:shadow-sm transition"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-md bg-primary/10 p-2">
                                <CatIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/resources#${r.id}`}
                                  className="line-clamp-1 text-sm font-medium hover:underline underline-offset-2"
                                  title={r.title}
                                >
                                  {r.title}
                                </Link>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">
                                    {r.category.replace("-", " ")}
                                  </Badge>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    {typeIcon === FileText ? (
                                      <FileText className="h-3 w-3" />
                                    ) : (
                                      <Globe className="h-3 w-3" />
                                    )}
                                    {r.type.toUpperCase()}
                                  </span>
                                  {r.is_verified && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600">
                                        Verified
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={
                                  isSaved("resources", r.id)
                                    ? "Unsave resource"
                                    : "Save resource"
                                }
                                onClick={() => toggle("resources", r.id)}
                              >
                                <Bookmark
                                  className={`h-4 w-4 ${
                                    isSaved("resources", r.id)
                                      ? "fill-yellow-500 text-yellow-500"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <Separator className="my-4" />

                {/* SUPPORT SERVICES */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Support services
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {services.length}
                    </Badge>
                  </div>

                  {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={`ss-skel-${i}`} className="rounded-md border p-3">
                          <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved services.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {services.map((s) => {
                        const Icon =
                          (s.type && serviceTypeIcon[s.type]) || Users;
                        return (
                          <div
                            key={s.id}
                            className="rounded-md border p-3 hover:shadow-sm transition"
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={s.avatar || undefined}
                                  alt={s.name || "Support service"}
                                />
                                <AvatarFallback>
                                  {toInitials(s.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {(s.type || "service").replace("-", " ")}
                                  </span>
                                </div>
                                <Link
                                  to={`/support#${s.id}`}
                                  className="block line-clamp-1 text-sm font-medium hover:underline underline-offset-2"
                                  title={s.name || "Service"}
                                >
                                  {s.name || "Unnamed service"}
                                </Link>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {s.availability || "unavailable"}
                                  </Badge>
                                  <span>•</span>
                                  {s.status === "approved" ? (
                                    <span className="text-emerald-600">Approved</span>
                                  ) : (
                                    <span className="text-amber-600">
                                      {s.status || "Pending"}
                                    </span>
                                  )}
                                  {s.verified && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600">Verified</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={
                                  isSaved("support", s.id)
                                    ? "Unsave service"
                                    : "Save service"
                                }
                                onClick={() => toggle("support", s.id)}
                              >
                                <Bookmark
                                  className={`h-4 w-4 ${
                                    isSaved("support", s.id)
                                      ? "fill-yellow-500 text-yellow-500"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <p className="mt-6 text-xs text-muted-foreground">
                  Saved lists are stored on this device only.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
