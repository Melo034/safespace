import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "@/server/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Eye, Heart, MessageCircle, Shield, ThumbsUp, Search as SearchIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { PostgrestError } from "@supabase/supabase-js";

type UiStory = {
  id: string;
  title: string;
  content: string;          // preview text
  full_content: string;     // full text
  author: {
    id: string | null;
    name: string;
    anonymous: boolean;
    avatar: string | null;
    verified: boolean;
  };
  created_at: string;
  category: "healing" | "escape" | "support" | "recovery" | "awareness" | "general";
  likes: number;
  is_liked: boolean;
  comments_count: number;
  views: number;
  tags: string[];
  featured: boolean;
};

type DbStory = {
  id: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  created_at: string | null;
  tags: string[] | null;
};

type StoryCardProps =
  | { story: UiStory; storyId?: never }
  | { story?: never; storyId: string };


const CATEGORIES = ["healing", "escape", "support", "recovery", "awareness"] as const;

function getCategoryFromTags(tags: string[] | null | undefined): UiStory["category"] {
  if (!tags?.length) return "general";
  const cat = tags.find(t => /^cat:/.test(t))?.split(":")[1];
  return (CATEGORIES as readonly string[]).includes(cat as string) ? (cat as UiStory["category"]) : "general";
}

function toPreview(full: string, len = 200) {
  if (!full) return "";
  return full.length > len ? full.slice(0, len) + "..." : full;
}

export function StoryCard({ story: propStory, storyId }: StoryCardProps) {
  const [story, setStory] = useState<UiStory | null>(propStory ?? null);
  const [loading, setLoading] = useState(!propStory && !!storyId);
  const [error, setError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (propStory || !storyId) return;

    const fetchStory = async () => {
      try {
        setLoading(true);

        // base story
        const { data: row, error: dbError } = await supabase
          .from("stories")
          .select("id,title,content,author_id,created_at,tags")
          .eq("id", storyId)
          .maybeSingle<DbStory>();
        if (dbError) throw dbError;
        if (!row) throw new Error("Story not found.");

        // author profile

        const { data: auth } = await supabase.auth.getUser();
        let canReadProfiles = false;
        if (auth.user) {
          const { data: am } = await supabase
            .from("admin_members")
            .select("user_id")
            .eq("user_id", auth.user.id)
            .maybeSingle();
          canReadProfiles = !!am;
        }
        
        let author = {
          id: row.author_id,
          name: "Anonymous",
          anonymous: !row.author_id,
          avatar: null as string | null,
          verified: false,
        };
        if (row.author_id && (canReadProfiles || auth.user?.id === row.author_id)) {
          const { data: profiles } = await supabase
            .from("community_members")
            .select("user_id,name,avatar_url,verified")
            .eq("user_id", row.author_id)
            .maybeSingle<{ user_id: string; name: string; avatar_url: string | null; verified: boolean }>();
          if (profiles) {
            author = {
              id: row.author_id,
              name: profiles.name || "User",
              anonymous: false,
              avatar: profiles.avatar_url,
              verified: !!profiles.verified,
            };
          }
        }

        // like count (with fallback)
        const { data: likeCount } = await supabase
          .from("story_like_counts")
          .select("story_id,likes")
          .eq("story_id", row.id)
          .maybeSingle<{ story_id: string; likes: number }>();
        let likesValue = likeCount?.likes ?? null;
        if (likesValue == null) {
          const { count: likesC } = await supabase
            .from("story_likes")
            .select("story_id", { count: "exact", head: true })
            .eq("story_id", row.id);
          likesValue = likesC ?? 0;
        }

        // view count (with fallback)
        const { data: viewCount } = await supabase
          .from("story_view_counts")
          .select("story_id,views")
          .eq("story_id", row.id)
          .maybeSingle<{ story_id: string; views: number }>();
        let viewsValue = viewCount?.views ?? null;
        if (viewsValue == null) {
          const { count: viewsC } = await supabase
            .from("story_views")
            .select("story_id", { count: "exact", head: true })
            .eq("story_id", row.id);
          viewsValue = viewsC ?? 0;
        }

        // comments count
        const { count: commentsCount } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", row.id);

        // current user like
        const { data: { user } } = await supabase.auth.getUser();
        let isLiked = false;
        if (user) {
          const { data: mine } = await supabase
            .from("story_likes")
            .select("story_id")
            .eq("story_id", row.id)
            .eq("user_id", user.id)
            .maybeSingle();
          isLiked = !!mine;
        }

        const mapped: UiStory = {
          id: row.id,
          title: row.title ?? "",
          content: toPreview(row.content ?? ""),
          full_content: row.content ?? "",
          author,
          created_at: row.created_at ?? new Date().toISOString(),
          category: getCategoryFromTags(row.tags),
          likes: likesValue ?? 0,
          is_liked: isLiked,
          comments_count: commentsCount ?? 0,
          views: viewsValue ?? 0,
          tags: Array.isArray(row.tags) ? row.tags : [],
          featured: false,
        };

        setStory(mapped);
      } catch (err) {
        console.error("Error fetching story:", err);
        setError("Failed to load story.");
        toast.error("Failed to load story. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [propStory, storyId]);

  // Realtime updates for likes/views and current user's like status
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let likeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const sub = async () => {
      const id = (story?.id ?? storyId) as string | undefined;
      if (!id) return;

      channel = supabase
        .channel(`story-agg-${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'story_like_counts', filter: `story_id=eq.${id}` },
          (payload: { new?: { likes?: number; count?: number }; old?: unknown }) => {
            const likes = (payload.new?.likes ?? payload.new?.count ?? null) as number | null;
            if (likes != null && isMounted) setStory((s) => (s ? { ...s, likes } : s));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'story_view_counts', filter: `story_id=eq.${id}` },
          (payload: { new?: { views?: number; count?: number }; old?: unknown }) => {
            const views = (payload.new?.views ?? payload.new?.count ?? null) as number | null;
            if (views != null && isMounted) setStory((s) => (s ? { ...s, views } : s));
          }
        )
        .subscribe();

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        likeChannel = supabase
          .channel(`story-like-${id}-${auth.user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'story_likes', filter: `story_id=eq.${id}` },
            (payload: { new?: { user_id?: string }; old?: { user_id?: string } }) => {
              if (payload.new?.user_id === auth.user!.id && isMounted) {
                setStory((s) => (s ? { ...s, is_liked: true } : s));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'story_likes', filter: `story_id=eq.${id}` },
            (payload: { new?: { user_id?: string }; old?: { user_id?: string } }) => {
              if (payload.old?.user_id === auth.user!.id && isMounted) {
                setStory((s) => (s ? { ...s, is_liked: false } : s));
              }
            }
          )
          .subscribe();
      }
    };

    sub();
    return () => {
      isMounted = false;
      channel?.unsubscribe();
      likeChannel?.unsubscribe();
    };
  }, [story?.id, storyId]);

  const toggleLike = async () => {
    if (!story) return;
    setLikeLoading(story.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Login required.");
        navigate("/auth/login");
        return;
      }

      const nextLiked = !story.is_liked;
      // optimistic update
      setStory(s => s ? { ...s, is_liked: nextLiked, likes: s.likes + (nextLiked ? 1 : -1) } : s);

      if (nextLiked) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("story_likes")
          .insert([{ story_id: story.id, user_id: user!.id }]);
        if (error && (error as { code?: string }).code !== "23505") {
          // rollback
          setStory(s => s ? { ...s, is_liked: false, likes: Math.max(0, s.likes - 1) } : s);
          const errObj = error as PostgrestError;
          const msg = errObj?.message || errObj?.hint || errObj?.details || "Like failed.";
          toast.error("Like failed", { description: msg });
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", story.id)
          .eq("user_id", user?.id ?? "");
        if (error) {
          // rollback
          setStory(s => s ? { ...s, is_liked: true, likes: s.likes + 1 } : s);
          const errObj = error as PostgrestError;
          const msg = errObj?.message || errObj?.hint || errObj?.details || "Unlike failed.";
          toast.error("Unlike failed", { description: msg });
        }
      }
    } finally {
      setLikeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="h-40 w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-center text-red-600">
        {error}
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!story) {
    toast.warning("Missing story data");
    return null;
  }

  const created = formatDistanceToNow(parseISO(story.created_at), { addSuffix: true });

  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5">
      <Link
        to={`/stories/${story.id}`}
        className="block"
        aria-label={`View story: ${story.title}`}
      >
        <div className="relative w-full overflow-hidden">
          {story.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary text-primary-foreground">Featured</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="mb-1 line-clamp-2 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
            {story.title?.trim() || toPreview(story.full_content || story.content || "", 60)}
          </h3>
        </div>
      </Link>

      <div className="p-4 pt-0">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-muted-foreground min-w-0">
          <div className="flex items-center gap-3">
            {story.author.avatar ? (
              <Avatar className="h-8 w-8 border border-border ring-1 ring-primary/10 shadow-sm">
                <AvatarImage src={story.author.avatar} alt={story.author.name} />
                <AvatarFallback className="text-[11px] font-semibold">
                  {(story.author.name || "A").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border ring-1 ring-primary/10">
                {story.author.anonymous ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] font-semibold">
                    {(story.author.name || "A").slice(0, 1)}
                  </span>
                )}
              </div>
            )}
            <span className="flex-1 truncate font-medium text-foreground">
              {story.author.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{created}</span>
          </div>
          <div className="sm:ml-auto shrink-0">
            <Badge variant="outline" className="text-xs">
              {String(story.category || "").replace("-", " ") || "general"}
            </Badge>
          </div>
        </div>
        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
          {story.content}
        </p>
        {Array.isArray(story.tags) && story.tags.filter(t => !/^cat:/.test(t)).length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1">
            {story.tags
              .filter((t) => !/^cat:/.test(t))
              .slice(0, 4)
              .map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{String(tag).replace(/-/g, "")}
                </Badge>
              ))}
            {story.tags.filter(t => !/^cat:/.test(t)).length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{story.tags.filter(t => !/^cat:/.test(t)).length - 4} more
              </Badge>
            )}
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">No tags</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Heart className={`h-4 w-4 ${story.is_liked ? "fill-red-500 text-red-500" : ""}`} />
              {story.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {story.comments_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {story.views}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={likeLoading === story.id}
              onClick={toggleLike}
              aria-label={story.is_liked ? `Unlike ${story.title}` : `Like ${story.title}`}
            >
              <ThumbsUp className={`h-4 w-4 ${story.is_liked ? "fill-blue-500 text-blue-500" : ""}`} />
            </Button>
            <Link
              to={`/stories/${story.id}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              Read more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import Loading from "@/components/utils/Loading";
import LiveChat from "@/components/Home/LiveChat";

type ListItem = { id: string };

export default function Stories() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<UiStory["category"] | "all">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 12;

  const fetchIds = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const from = reset ? 0 : (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase.from("stories").select("id,created_at,tags,title,content,status", { count: "exact" });
      q = q.eq("status", "published");
      if (category !== "all") {
        q = q.contains("tags", [`cat:${category}`]);
      }
      if (search.trim()) {
        const term = search.trim();
        q = q.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      }
      q = q.order("created_at", { ascending: false }).range(from, to);

      let { data, error, count } = await q;
      // Fallback: if 'status' column doesn't exist, retry without it
      if (error && (error as PostgrestError).code === "42703") {
        let q2 = supabase.from("stories").select("id,created_at,tags,title,content", { count: "exact" });
        if (category !== "all") q2 = q2.contains("tags", [`cat:${category}`]);
        if (search.trim()) {
          const term = search.trim();
          q2 = q2.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
        }
        q2 = q2.order("created_at", { ascending: false }).range(from, to);
        const r2 = await q2;
        data = r2.data
          ? r2.data.map((item) => ({ ...item, status: "published" }))
          : null;
        error = r2.error;
        count = r2.count as number | null;
      }
      if (error) throw error;
      const newIds = (data as ListItem[] | null)?.map((d: ListItem) => d.id) ?? [];
      setIds((prev) => (reset ? newIds : [...prev, ...newIds]));
      const total = typeof count === "number" ? count : newIds.length;
      const consumed = (reset ? 0 : (page - 1) * PAGE_SIZE) + newIds.length;
      setHasMore(consumed < total);
      if (!reset) setPage((p) => p + 1);
    } catch (e) {
      console.error("Failed to load stories list:", e);
      setError("Failed to load stories.");
      toast.error("Failed to load stories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchIds(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // refetch when category changes
    fetchIds(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    // debounce search input
    const h = setTimeout(() => {
      fetchIds(true);
    }, 400);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> Community Stories
          </span>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">Share, Support, Heal</span>
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Read and share lived experiences to inspire, inform, and empower others.
          </p>
        </div>

        <Card className="mb-8 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full max-w-2xl gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search stories"
                    className="pl-9 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50"
                  />
                </div>
                <Select value={category} onValueChange={(v) => setCategory(v as UiStory["category"] | "all")}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">All</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button asChild>
                <Link to="/account/my-stories/new">Share Your Story</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loading />
          </div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : ids.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <SearchIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No stories found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/account/my-stories/new">Be the first to share</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ids.map((id, idx) => (
                <div
                  key={id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(idx, 10) * 60}ms` }}
                >
                  <StoryCard storyId={id} />
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button onClick={() => fetchIds(false)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </main>
      <LiveChat/>
      <Footer />
    </div>
  );
}
