import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "@/server/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Eye, Heart, MessageCircle, Shield, ThumbsUp, Search as SearchIcon, Sparkles, Bookmark } from "lucide-react";
import { useSavedItems } from "@/hooks/useSavedItems";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { PostgrestError } from "@supabase/supabase-js";

type UiStory = {
  id: string;
  title: string;
  content: string;
  full_content: string;
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
  /** NEW: db-backed saved-state */
  is_saved?: boolean;
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
  const [error] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toggle: toggleSavedLocal } = useSavedItems();

  // ── Load story + counts + my like/save
  useEffect(() => {
    if (propStory || !storyId) return;

    const fetchStory = async () => {
      try {
        setLoading(true);

        const { data: row, error: dbError } = await supabase
          .from("stories")
          .select("id,title,content,author_id,created_at,tags")
          .eq("id", storyId)
          .maybeSingle<DbStory>();
        if (dbError) throw dbError;
        if (!row) throw new Error("Story not found.");

        // author profile
        let author = {
          id: row.author_id,
          name: "Anonymous",
          anonymous: !row.author_id,
          avatar: null as string | null,
          verified: false,
        };
        if (row.author_id) {
          const { data: profile } = await supabase
            .from("community_members")
            .select("user_id,name,avatar_url,verified")
            .eq("user_id", row.author_id)
            .maybeSingle<{ user_id: string; name: string; avatar_url: string | null; verified: boolean }>();
          if (profile) {
            author = {
              id: row.author_id,
              name: profile.name || "Anonymous",
              anonymous: false,
              avatar: profile.avatar_url,
              verified: !!profile.verified,
            };
          }
        }

        // aggregates
        const [{ data: likeCount }, { data: viewCount }] = await Promise.all([
          supabase.from("story_like_counts").select("likes").eq("story_id", row.id).maybeSingle(),
          supabase.from("story_view_counts").select("views").eq("story_id", row.id).maybeSingle(),
        ]);

        // my like/save
        const { data: { user } } = await supabase.auth.getUser();
        let isLiked = false;
        let isSaved = false;

        if (user) {
          const [mineLike, mineSave] = await Promise.all([
            supabase.from("story_likes").select("story_id").eq("story_id", row.id).eq("user_id", user.id).maybeSingle(),
            supabase.from("story_saves").select("story_id").eq("story_id", row.id).eq("user_id", user.id).maybeSingle(), // NEW
          ]);
          isLiked = !!mineLike.data;
          isSaved = !!mineSave.data;
        }

        // comments count
        const { count: commentsCount } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", row.id);

        setStory({
          id: row.id,
          title: row.title ?? "",
          content: toPreview(row.content ?? ""),
          full_content: row.content ?? "",
          author,
          created_at: row.created_at ?? new Date().toISOString(),
          category: getCategoryFromTags(row.tags),
          likes: likeCount?.likes ?? 0,
          is_liked: isLiked,
          comments_count: commentsCount ?? 0,
          views: viewCount?.views ?? 0,
          tags: Array.isArray(row.tags) ? row.tags : [],
          featured: false,
          is_saved: isSaved, // NEW
        });

        // record unique view for signed-in non-author (author view doesn't count)
        if (user && user.id !== row.author_id) {
          // insert once; rely on PK (story_id,user_id)
          try {
            await supabase
              .from("story_views")
              .insert({ story_id: row.id }); // user_id defaults to auth.uid()
            setStory(s => (s ? { ...s, views: s.views + 1 } : s));
          } catch (e) {
            console.error("Failed to record story view:", e);
            toast.error("Failed to record story view. Please try again.");
          }
        }
      } catch (e) {
        console.error("Failed to load story:", e);
        toast.error("Failed to load story. Please try again.");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [propStory, storyId]);

  // ── Realtime aggregation + my like state updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let likeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const sub = async () => {
      const id = story?.id ?? storyId;
      if (!id) return;

      channel = supabase
        .channel(`story-agg-${id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "story_view_counts", filter: `story_id=eq.${id}` },
          (payload: { new?: { views?: number; count?: number } }) => {
            const views = payload?.new?.views ?? payload?.new?.count;
            if (typeof views === "number" && isMounted) setStory(s => (s ? { ...s, views } : s));
          }
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "story_like_counts", filter: `story_id=eq.${id}` },
          (payload: { new?: { likes?: number; count?: number } }) => {
            const likes = payload?.new?.likes ?? payload?.new?.count;
            if (typeof likes === "number" && isMounted) setStory(s => (s ? { ...s, likes } : s));
          }
        )
        .subscribe();

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        likeChannel = supabase
          .channel(`story-like-${id}-${auth.user.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "story_likes", filter: `story_id=eq.${id}` },
            (p: { new?: { user_id?: string } }) => {
              if (p?.new?.user_id === auth.user?.id) setStory(s => (s ? { ...s, is_liked: true } : s));
            }
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "story_likes", filter: `story_id=eq.${id}` },
            (p: { old?: { user_id?: string } }) => {
              if (p?.old?.user_id === auth.user?.id) setStory(s => (s ? { ...s, is_liked: false } : s));
            }
          )
          .subscribe();
      }
    };

    sub();
    return () => { isMounted = false; channel?.unsubscribe(); likeChannel?.unsubscribe(); };
  }, [story?.id, storyId]);

  // ── Like: 1 per member (unique index enforces), authors allowed
  const toggleLike = async () => {
    if (!story) return;
    const sid = story.id;
    const prevLiked = story.is_liked;
    const prevLikes = story.likes;

    setLikeLoading(sid);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = data?.user ?? null;
      if (!user) {
        toast.error("Login required.");
        navigate("/auth/login");
        return;
      }

      const nextLiked = !prevLiked;
      // optimistic
      setStory(s => (s && s.id === sid ? { ...s, is_liked: nextLiked, likes: Math.max(0, s.likes + (nextLiked ? 1 : -1)) } : s));

      if (nextLiked) {
        const { error } = await supabase.from("story_likes").insert({ story_id: sid, user_id: user.id });
        if (error && (error as PostgrestError).code !== "23505") throw error; // 23505: unique violation -> already liked
      } else {
        const { error } = await supabase.from("story_likes").delete().eq("story_id", sid).eq("user_id", user.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
      setStory(s => (s && s.id === sid ? { ...s, is_liked: prevLiked, likes: prevLikes } : s));
      const msg = (err as PostgrestError)?.message || "Unable to update like.";
      toast.error(msg);
    } finally {
      setLikeLoading(null);
    }
  };

  // ── Save: 1 per member (unique index enforces)
  const toggleSave = async () => {
    if (!story) return;
    const sid = story.id;
    setSaveLoading(sid);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = data?.user ?? null;
      if (!user) {
        toast.error("Login required.");
        navigate("/auth/login");
        return;
      }

      const currentlySaved = !!story.is_saved;

      // optimistic UI (+ keep local hook in sync if you want)
      setStory(s => (s && s.id === sid ? { ...s, is_saved: !currentlySaved } : s));
      try { toggleSavedLocal("stories", sid); } catch {
        // Ignore errors from local save toggle
      }

      if (!currentlySaved) {
        const { error } = await supabase.from("story_saves").insert({ story_id: sid }); // user_id defaults to auth.uid()
        if (error && (error as PostgrestError).code !== "23505") throw error; // duplicate safe
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("story_saves")
          .delete()
          .eq("story_id", sid)
          .eq("user_id", user!.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle save", err);
      setStory(s => (s && s.id === sid ? { ...s, is_saved: !s.is_saved } : s)); // revert
      toast.error((err as PostgrestError)?.message || "Unable to update saved state.");
    } finally {
      setSaveLoading(null);
    }
  };


  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm animate-pulse">
        <div className="h-40 w-full rounded-lg bg-muted" />
        <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-red-600 shadow-sm">
        {error}
        <Button onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Retry
        </Button>
      </div>
    );
  }
  if (!story) return null;

  const created = formatDistanceToNow(parseISO(story.created_at), { addSuffix: true });

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link to={`/stories/${story.id}`} className="block" aria-label={`View story: ${story.title}`}>
        <div className="relative w-full overflow-hidden">
          {story.featured && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 text-xs font-semibold rounded-md shadow-sm">
                Featured
              </Badge>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="mb-2 line-clamp-2 text-xl font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {story.title?.trim() || toPreview(story.full_content || story.content || "", 60)}
          </h3>
        </div>
      </Link>

      <div className="p-5 pt-0">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3 min-w-0">
            {story.author.avatar ? (
              <Avatar className="h-10 w-10 border-2 border-border ring-2 ring-primary/10 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <AvatarImage src={story.author.avatar} alt={story.author.name} />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {(story.author.name || "A").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border-2 border-border ring-2 ring-primary/10 shadow-sm transition-transform duration-200 group-hover:scale-105">
                {story.author.anonymous ? <Shield className="h-5 w-5 text-muted-foreground" /> : (
                  <span className="text-xs font-semibold">{(story.author.name || "A").slice(0, 1)}</span>
                )}
              </div>
            )}
            <span className="flex-1 truncate font-medium text-foreground">{story.author.name}</span>
            {story.author.verified && (
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 text-xs">
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{created}</span>
          </div>
          <div className="sm:ml-auto shrink-0">
            <Badge
              variant="outline"
              className="text-xs font-medium border-primary/20 bg-primary/5 text-primary capitalize px-2 py-1 rounded-md"
            >
              {String(story.category || "").replace("-", " ") || "General"}
            </Badge>
          </div>
        </div>

        <p className="mb-4 line-clamp-3 text-sm text-muted-foreground leading-relaxed">{story.content}</p>

        {Array.isArray(story.tags) && story.tags.filter(t => !/^cat:/.test(t)).length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {story.tags
              .filter(t => !/^cat:/.test(t))
              .slice(0, 4)
              .map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md hover:bg-muted/80 transition-colors duration-200"
                >
                  #{String(tag).replace(/-/g, "")}
                </Badge>
              ))}
            {story.tags.filter(t => !/^cat:/.test(t)).length > 4 && (
              <Badge
                variant="secondary"
                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md"
              >
                +{story.tags.filter(t => !/^cat:/.test(t)).length - 4} more
              </Badge>
            )}
          </div>
        ) : (
          <p className="mb-4 text-xs text-muted-foreground italic">No tags</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Heart
                className={`h-5 w-5 transition-colors duration-200 ${story.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
              />
              {story.likes}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              {story.comments_count}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-5 w-5 text-muted-foreground" />
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
              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors duration-200"
            >
              <ThumbsUp
                className={`h-5 w-5 ${story.is_liked ? "fill-blue-500 text-blue-500" : "text-muted-foreground"
                  }`}
              />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saveLoading === story.id}
              onClick={(e) => {
                e.preventDefault();
                toggleSave();
              }}
              aria-label={story.is_saved ? `Unsave ${story.title}` : `Save ${story.title}`}
              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors duration-200"
            >
              <Bookmark
                className={`h-5 w-5 ${story.is_saved ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                  }`}
              />
            </Button>
            <Link
              to={`/stories/${story.id}`}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline transition-colors duration-200"
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
import { Card, CardContent } from "@/components/ui/card";

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
      <main id="main" className="flex-1 relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <LiveChat />
      <Footer />
    </div>
  );
}