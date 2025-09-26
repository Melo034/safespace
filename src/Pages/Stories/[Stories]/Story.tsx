// Story.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import supabase from "@/server/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import ReadingProgress from "@/components/utils/ReadingProgress";
import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  User,
  Clock,
  ArrowLeft,
  ThumbsUp,
  BookOpen,
  AlertTriangle,
  Trash2,
  Shield,
  BadgeCheck,
  Bookmark,
} from "lucide-react";
import type { PostgrestError, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Loading from "@/components/utils/Loading";
import type { Story as StoryType, Comment } from "@/lib/types";
import LiveChat from "@/components/Home/LiveChat";
import { usePreferences } from "@/hooks/usePreferences";

/* ----------------------------- Validation ----------------------------- */

const commentSchema = z.object({
  content: z
    .string()
    .min(5, "Comment must be at least 5 characters")
    .max(500, "Comment must be less than 500 characters"),
});

const ITEMS_PER_PAGE = 10;

/* ------------------------------- Types -------------------------------- */

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  created_at: string;
  tags: string[] | null;
  status?: string | null;
};

type CommentRow = {
  id: string;
  author_id: string | null;
  content: string | null;
  created_at: string;
};

type CommentView = Comment & { author_avatar: string | null };

type StoryUI = StoryType & {
  /** local-only flag for saved state */
  is_saved?: boolean;
};

/* ----------------------------- Mappers ------------------------------- */

function mapStoryRow(row: StoryRow, authorName: string): StoryType {
  return {
    id: row.id,
    slug: row.id,
    title: row.title ?? "",
    content: row.content ?? "",
    full_content: row.content ?? "",
    author: {
      id: row.author_id ?? null,
      name: authorName || (row.author_id ? "User" : "Anonymous"),
      anonymous: !row.author_id,
      avatar: null,
      verified: false,
    },
    created_at: row.created_at,
    category: "general",
    likes: 0,
    comments_count: 0,
    views: 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    featured: false,
    is_liked: false,
  };
}

/* ------------------------------ Component ----------------------------- */

export default function Story() {
  const [story, setStory] = useState<StoryUI | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [related, setRelated] = useState<Array<{ id: string; title: string; created_at: string }>>([]);

  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const { prefs } = usePreferences();

  const readingMinutes = useMemo(() => {
    const text = (story?.full_content || story?.content || "").trim();
    if (!text) return 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [story?.full_content, story?.content]);

  const contentWarnings = useMemo(() => {
    return (story?.tags || [])
      .filter((t) => typeof t === "string" && t.toLowerCase().startsWith("cw:"))
      .map((t) => t.slice(3));
  }, [story?.tags]);

  const toc = useMemo(() => {
    const source = (story?.full_content || story?.content || "").split(/\n+/);
    const items: Array<{ level: 1 | 2 | 3; text: string; id: string }> = [];
    const slug = (s: string) =>
      s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);

    for (const line of source) {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        const text = trimmed.slice(4);
        items.push({ level: 3, text, id: slug(text) });
      } else if (trimmed.startsWith("## ")) {
        const text = trimmed.slice(3);
        items.push({ level: 2, text, id: slug(text) });
      } else if (trimmed.startsWith("# ")) {
        const text = trimmed.slice(2);
        items.push({ level: 1, text, id: slug(text) });
      }
    }

    return items;
  }, [story?.full_content, story?.content]);

  /* ---------------------------- Data loaders ---------------------------- */

  const fetchComments = useCallback(async (storyId: string, pageNumber: number) => {
    const from = (pageNumber - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("comments")
      .select("id, author_id, content, created_at", { count: "exact" })
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const baseRows = (data || []) as CommentRow[];
    const authorIds = Array.from(new Set(baseRows.map((r) => r.author_id).filter(Boolean))) as string[];

    const authorMap = new Map<string, { name: string; avatar_url: string | null }>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("community_members")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);

      if (profiles) {
        for (const p of profiles) {
          authorMap.set(p.user_id, { name: p.name || "Anonymous", avatar_url: p.avatar_url ?? null });
        }
      }
    }

    const rows = baseRows.map((r) => ({
      id: r.id,
      author_id: r.author_id,
      author_name: r.author_id ? authorMap.get(r.author_id)?.name || "Anonymous" : "Anonymous",
      content: r.content || "",
      created_at: r.created_at,
      author_avatar: r.author_id ? authorMap.get(r.author_id)?.avatar_url ?? null : null,
    })) as CommentView[];

    return { rows, total: count ?? baseRows.length };
  }, []);

  /* -------------------------- Init / Realtime --------------------------- */

  useEffect(() => {
    let storyChannel: ReturnType<typeof supabase.channel> | null = null;
    let commentsChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();

        let isAdminLocal = false;
        if (auth.user) {
          const { data: adminRow } = await supabase
            .from("admin_members")
            .select("user_id, role")
            .eq("user_id", auth.user.id)
            .maybeSingle();
          if (adminRow) {
            isAdminLocal = true;
            setIsAdmin(true);
          }
        }

        if (!idParam) {
          toast.error("Invalid story URL.");
          setLoading(false);
          return;
        }

        // Story (fallback if status column missing)
        let { data: storyRow, error: storyError } = await supabase
          .from("stories")
          .select("id, title, content, author_id, created_at, tags, status")
          .eq("id", idParam)
          .maybeSingle<StoryRow>();

        if (storyError && (storyError as PostgrestError).code === "42703") {
          const r2 = await supabase
            .from("stories")
            .select("id, title, content, author_id, created_at, tags")
            .eq("id", idParam)
            .maybeSingle();
          storyRow = r2.data ? ({ ...(r2.data as StoryRow) }) : null;
          storyError = r2.error;
        }

        if (storyError || !storyRow) {
          toast.error("Story not found.");
          setLoading(false);
          return;
        }

        // Visibility: published OR owner OR admin
        const visible =
          (storyRow as StoryRow).status
            ? (storyRow as StoryRow).status === "published" ||
            (auth.user && (storyRow.author_id === auth.user.id || isAdminLocal))
            : true;
        if (!visible) {
          toast.error("This story is not available.");
          setLoading(false);
          return;
        }

        // Author profile (name, avatar, verified)
        let authorName = "Anonymous";
        let authorAvatar: string | null = null;
        let authorVerified = false;
        if (storyRow.author_id) {
          const { data: cm } = await supabase
            .from("community_members")
            .select("name, avatar_url, verified")
            .eq("user_id", storyRow.author_id)
            .maybeSingle<{ name: string | null; avatar_url: string | null; verified: boolean | null }>();
          if (cm) {
            authorName = cm?.name || "Anonymous";
            authorAvatar = cm?.avatar_url ?? null;
            authorVerified = !!cm?.verified;
          }
        }

        const base = mapStoryRow(storyRow as StoryRow, authorName);
        const withAuthor: StoryUI = {
          ...base,
          author: {
            ...base.author,
            name: authorName,
            avatar: authorAvatar,
            verified: authorVerified,
            anonymous: !storyRow.author_id,
          },
        };

        // Likes count
        const { data: likeCountData } = await supabase
          .from("story_like_counts")
          .select("likes")
          .eq("story_id", storyRow.id)
          .maybeSingle();
        const likesValue = likeCountData?.likes ?? 0;

        // Is liked by current user
        let isLiked = false;
        if (auth.user) {
          const { data: mine } = await supabase
            .from("story_likes")
            .select("story_id")
            .eq("story_id", storyRow.id)
            .eq("user_id", auth.user.id)
            .maybeSingle();
          isLiked = !!mine;
        }

        // Comments count
        const { count: totalComments } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyRow.id);

        // Views count
        const { data: viewCountData } = await supabase
          .from("story_view_counts")
          .select("views")
          .eq("story_id", storyRow.id)
          .maybeSingle();
        const viewsValue = viewCountData?.views ?? 0;

        // Saved state (gracefully ignore if table is missing)
        let isSaved = false;
        try {
          if (auth.user) {
            const { data: mineSave } = await supabase
              .from("story_saves")
              .select("story_id")
              .eq("story_id", storyRow.id)
              .eq("user_id", auth.user.id)
              .maybeSingle();
            isSaved = !!mineSave;
          }
        } catch (e: unknown) {
          if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code !== "42P01") {
            console.debug("Load saved failed:", e);
          }
        }

        setStory({
          ...withAuthor,
          comments_count: totalComments ?? 0,
          likes: likesValue,
          is_liked: isLiked,
          views: viewsValue,
          is_saved: isSaved,
        });

        // Record unique view for logged-in users (author's views do not count)
        if (auth.user && auth.user.id !== storyRow.author_id) {
          try {
            await supabase.from("story_views").insert({ story_id: storyRow.id }); // user_id default = auth.uid()
          } catch (e: unknown) {
            // ignore duplicates or missing perms
            if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code !== "23505") {
              console.debug("view insert failed:", e);
            }
          }
        }

        // First page of comments
        const first = await fetchComments(storyRow.id, 1);
        setComments(first.rows);
        setHasMore(ITEMS_PER_PAGE < first.total);
        setPage(1);

        // Realtime subscriptions
        storyChannel = supabase
          .channel(`story-${storyRow.id}`)
          // current user like status
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "story_likes", filter: `story_id=eq.${storyRow.id}` },
            (payload) => {
              if (
                payload.new &&
                "user_id" in payload.new &&
                (payload.new as { user_id?: string }).user_id === auth.user?.id
              ) {
                setStory((s) => (s ? { ...s, is_liked: true } : s));
              }
            }
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "story_likes", filter: `story_id=eq.${storyRow.id}` },
            (payload) => {
              if (payload.old && "user_id" in payload.old && (payload.old as { user_id?: string }).user_id === auth.user?.id) {
                setStory((s) => (s ? { ...s, is_liked: false } : s));
              }
            }
          )
          // aggregate like count
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "story_like_counts", filter: `story_id=eq.${storyRow.id}` },
            (payload: RealtimePostgresChangesPayload<{ likes?: number }>) => {
              let likes = 0;
              const newRow = payload.new as unknown;
              if (newRow && typeof newRow === "object" && "likes" in newRow) {
                const v = (newRow as { likes?: number }).likes;
                likes = typeof v === "number" ? v : 0;
              }
              setStory((s) => (s ? { ...s, likes } : s));
            }
          )
          // aggregate view count
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "story_view_counts", filter: `story_id=eq.${storyRow.id}` },
            (payload: RealtimePostgresChangesPayload<{ views?: number }>) => {
              let views = 0;
              const newRow = payload.new as unknown;
              if (newRow && typeof newRow === "object" && "views" in newRow) {
                const v = (newRow as { views?: number }).views;
                views = typeof v === "number" ? v : 0;
              }
              setStory((s) => (s ? { ...s, views } : s));
            }
          )
          .subscribe();

        commentsChannel = supabase
          .channel(`comments-${storyRow.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "comments", filter: `story_id=eq.${storyRow.id}` },
            async () => {
              const refreshed = await fetchComments(storyRow!.id, 1);
              setComments(refreshed.rows);
              setHasMore(ITEMS_PER_PAGE < refreshed.total);
              setPage(1);
              setStory((prev) => (prev ? { ...prev, comments_count: refreshed.total } : prev));
            }
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "comments", filter: `story_id=eq.${storyRow.id}` },
            async () => {
              const refreshed = await fetchComments(storyRow!.id, 1);
              setComments(refreshed.rows);
              setHasMore(ITEMS_PER_PAGE < refreshed.total);
              setPage(1);
              setStory((prev) => (prev ? { ...prev, comments_count: refreshed.total } : prev));
            }
          )
          .subscribe();

        setLoading(false);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load story.");
        setLoading(false);
      }
    };

    init();

    return () => {
      storyChannel?.unsubscribe();
      commentsChannel?.unsubscribe();
    };
  }, [idParam, fetchComments]);

  /* ---------------------------- Handlers ---------------------------- */

  const handleLoadMore = async () => {
    if (!story || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const next = await fetchComments(story.id, nextPage);
      setComments((prev) => [...prev, ...next.rows]);
      setHasMore(ITEMS_PER_PAGE * nextPage < next.total);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load more comments.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLike = async () => {
    if (!story) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Login required.");
        navigate("/auth/login");
        return;
      }

      const nextLiked = !story.is_liked;
      // optimistic update
      setStory((s) => (s ? { ...s, is_liked: nextLiked, likes: Math.max(0, s.likes + (nextLiked ? 1 : -1)) } : s));

      if (nextLiked) {
        const { error } = await supabase.from("story_likes").insert([{ story_id: story.id }]); // user_id default = auth.uid()
        if (error && (error as { code?: string }).code !== "23505") {
          // rollback
          setStory((s) => (s ? { ...s, is_liked: false, likes: Math.max(0, s.likes - 1) } : s));
          const msg =
            (error as PostgrestError)?.message ||
            (error as PostgrestError)?.hint ||
            (error as PostgrestError)?.details ||
            "Like failed.";
          toast.error("Like failed", { description: msg });
        }
      } else {
        const { error } = await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", story.id)
          .eq("user_id", user.id);
        if (error) {
          // rollback
          setStory((s) => (s ? { ...s, is_liked: true, likes: s.likes + 1 } : s));
          const msg =
            (error as PostgrestError)?.message ||
            (error as PostgrestError)?.hint ||
            (error as PostgrestError)?.details ||
            "Unlike failed.";
          toast.error("Unlike failed", { description: msg });
        }
      }
    } catch (e) {
      console.error("Like toggle error:", e);
    }
  };

  const handleToggleSave = async () => {
    if (!story) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Login required.");
      navigate("/auth/login");
      return;
    }

    const currentlySaved = !!story.is_saved;
    setSaveLoading(true);

    try {
      if (!currentlySaved) {
        await supabase.from("story_saves").insert({ story_id: story.id }); // user_id default = auth.uid()
        setStory((s) => (s ? { ...s, is_saved: true } : s));
      } else {
        await supabase.from("story_saves").delete().eq("story_id", story.id).eq("user_id", user.id);
        setStory((s) => (s ? { ...s, is_saved: false } : s));
      }
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e) {
        if ((e as { code?: string }).code === "42P01") {
          toast.error("Saving not set up yet (missing story_saves table).");
        } else if ((e as { code?: string }).code !== "23505") {
          toast.error((e as { message?: string }).message || "Failed to update saved state.");
        }
      } else {
        toast.error("Failed to update saved state.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async () => {
    if (!story) return;
    try {
      const storyUrl = `${window.location.origin}/stories/${story.id}`;
      const shareText = (story.content || "").slice(0, 140);

      if (navigator.share && window.isSecureContext) {
        await navigator.share({
          title: story.title || "Story",
          text: shareText,
          url: storyUrl,
        });
      } else {
        await navigator.clipboard.writeText(storyUrl);
        toast.success("Link copied to clipboard.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Share failed:", msg);
      toast.error(`Share failed: ${msg}`);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !story) return;

    const sanitized = newComment.trim();
    const result = commentSchema.safeParse({ content: sanitized });
    if (!result.success) {
      setCommentError(result.error.flatten().fieldErrors.content?.[0] || "Invalid comment");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.warning("Please log in to comment.");
      navigate("/auth/login");
      return;
    }

    try {
      setCommentLoading(true);

      const { data: inserted, error } = await supabase
        .from("comments")
        .insert({ story_id: story.id, author_id: auth.user.id, content: sanitized })
        .select("id, created_at")
        .single();

      if (error) throw error;

      // fetch current user's profile for name/avatar
      let authorName = "Anonymous";
      let authorAvatar: string | null = null;
      const { data: me } = await supabase
        .from("community_members")
        .select("name,avatar_url")
        .eq("user_id", auth.user.id)
        .maybeSingle<{ name: string | null; avatar_url: string | null }>();
      if (me) {
        authorName = me.name || "Anonymous";
        authorAvatar = me.avatar_url ?? null;
      }

      setComments((prev) => [
        {
          id: inserted.id,
          author_id: auth.user.id,
          author_name: authorName,
          content: sanitized,
          created_at: inserted.created_at,
          author_avatar: authorAvatar,
        },
        ...prev,
      ]);
      setStory((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
      setNewComment("");
      setCommentError(null);
      toast.success("Comment added.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Error adding comment:", msg);
      toast.error(`Failed to add comment: ${msg}`);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!story) return;
    try {
      await supabase.from("comments").delete().eq("id", commentId);
      // optimistic update
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setStory((prev) => (prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : prev));
      toast.success("Comment deleted.");
    } catch (e) {
      console.error("Delete comment failed:", e);
      toast.error("Failed to delete comment.");
    }
  };

  /* ------------------------------ Related ------------------------------ */

  useEffect(() => {
    if (!story?.id || !story?.tags?.length) {
      setRelated([]);
      return;
    }
    let isActive = true;

    const loadRelated = async () => {
      const firstTag = story.tags[0];
      if (!firstTag) return;

      const { data, error } = await supabase
        .from("stories")
        .select("id,title,tags,created_at")
        .neq("id", story.id)
        .contains("tags", [firstTag])
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error && isActive) {
        setRelated(
          (data || []).map((r: { id: string; title: string | null; created_at: string | null }) => ({
            id: r.id,
            title: r.title || "Untitled",
            created_at: r.created_at || new Date().toISOString(),
          }))
        );
      }
    };

    void loadRelated();
    return () => {
      isActive = false;
    };
  }, [story?.id, story?.tags]);

  /* ------------------------------- Render ------------------------------ */

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto min-h-[60vh] flex items-center justify-center">
            <Loading />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground">Story not found.</p>
            <div className="mt-4">
              <Button variant="ghost" asChild>
                <Link to="/stories" aria-label="Back to stories">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Stories
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 antialiased">
      <ReadingProgress target="#story-content" />
      <Navbar />
      <main
        id="main"
        className="relative container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
        <div className="max-w-7xl w-full py-8">
          <div className="mb-8 ml-5">
            <Button
              variant="ghost"
              asChild
              className="text-sm font-medium text-primary hover:bg-primary/10 rounded-full px-3 py-2 transition-colors duration-200"
            >
              <Link to="/stories" aria-label="Back to stories">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Stories
              </Link>
            </Button>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-10">
            <div id="story-content" className="max-w-4xl w-full">
              {/* Content warning */}
              {contentWarnings.length > 0 && prefs.privacy.contentWarnings !== "hide" && (
                <Card className="mb-8 rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm transition-all duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Content Warning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {contentWarnings.join(", ")}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Story */}
              <Card className="mb-4 sm:mb-6 md:mb-10 rounded-2xl bg-card shadow-md transition-all duration-300 hover:shadow-lg max-w-full mx-2 sm:mx-4 md:mx-auto">
                <CardHeader className="px-4 sm:px-6 pb-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6">
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                      {story.author.avatar ? (
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 border-2 border-border ring-2 ring-primary/10 shadow-sm transition-transform duration-200 hover:scale-105">
                          <AvatarImage src={story.author.avatar} alt={story.author.name} />
                          <AvatarFallback className="text-xs sm:text-sm font-semibold bg-muted">
                            {(story.author.name || "U").slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border ring-2 ring-primary/10 shadow-sm transition-transform duration-200 hover:scale-105">
                          {story.author.anonymous ? (
                            <Shield className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-muted-foreground" />
                          ) : (
                            <User className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <p className="font-semibold text-lg sm:text-xl md:text-2xl text-foreground truncate">
                            {story.author.name}
                            {story.author.verified && (
                              <Badge
                                variant="secondary"
                                className="ml-2 inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full"
                              >
                                <BadgeCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                                Verified
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{formatDistanceToNow(parseISO(story.created_at), { addSuffix: true })}</span>
                          <span className="hidden sm:inline">· {readingMinutes} min read</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-xs font-medium border-primary/20 bg-primary/5 text-primary capitalize px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
                      >
                        {String(story.category).replace("-", " ")}
                      </Badge>
                      {story.tags.some((tag) => ["trigger", "sensitive"].includes(tag?.toLowerCase?.() ?? "")) && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-destructive/10 text-destructive rounded-full"
                        >
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                          Sensitive Content
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 line-clamp-2">
                    {story.title?.trim() || (story.content ? String(story.content).slice(0, 60) + "..." : "Untitled story")}
                  </CardTitle>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                    {story.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs bg-muted/50 text-muted-foreground px-2 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-muted/80 transition-colors duration-200"
                      >
                        #{String(tag).replace("-", "")}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm text-muted-foreground border-t pt-3 sm:pt-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Heart
                        className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-200 ${story.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                      />
                      <span>{story.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      <span>{story.comments_count}</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 sm:flex">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      <span>{readingMinutes} min read</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="prose prose-neutral dark:prose-invert max-w-none px-4 sm:px-6">
                  <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none mb-8 sm:mb-12">
                    {(story.full_content || story.content)
                      .split("\n\n")
                      .map((block, index) => {
                        const t = block.trim();
                        if (t.startsWith("### ")) {
                          const text = t.slice(4);
                          const id = text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
                          return (
                            <h3 id={id} key={index} className="scroll-mt-20 text-lg sm:text-xl md:text-2xl font-semibold text-foreground mt-4 sm:mt-6">
                              {text}
                            </h3>
                          );
                        }
                        if (t.startsWith("## ")) {
                          const text = t.slice(3);
                          const id = text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
                          return (
                            <h2 id={id} key={index} className="scroll-mt-20 text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-6 sm:mt-8">
                              {text}
                            </h2>
                          );
                        }
                        if (t.startsWith("# ")) {
                          const text = t.slice(2);
                          const id = text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
                          return (
                            <h1 id={id} key={index} className="scroll-mt-20 text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mt-8 sm:mt-10">
                              {text}
                            </h1>
                          );
                        }
                        return (
                          <p
                            key={index}
                            className="mb-4 sm:mb-6 leading-relaxed text-foreground animate-fade-in-up"
                            style={{ animationDelay: `${Math.min(index, 12) * 100}ms` }}
                          >
                            {block}
                          </p>
                        );
                      })}
                  </div>

                  <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-border/30">
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                      <Button
                        variant="outline"
                        onClick={handleLike}
                        className="flex items-center space-x-1 sm:space-x-2 bg-transparent border-primary/30 hover:bg-primary/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-foreground transition-colors duration-200"
                        aria-label={story.is_liked ? `Unlike ${story.title}` : `Like ${story.title}`}
                      >
                        <ThumbsUp
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${story.is_liked ? "fill-blue-600 text-blue-600" : "text-muted-foreground"}`}
                        />
                        <span>{story.is_liked ? "Liked" : "Like"} ({story.likes})</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleShare}
                        className="flex items-center space-x-1 sm:space-x-2 bg-transparent border-primary/30 hover:bg-primary/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-foreground transition-colors duration-200"
                        aria-label={`Share ${story.title}`}
                      >
                        <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        <span>Share</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleToggleSave}
                        disabled={saveLoading}
                        className="flex items-center space-x-1 sm:space-x-2 bg-transparent border-primary/30 hover:bg-primary/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-foreground transition-colors duration-200"
                        aria-label={story.is_saved ? `Unsave ${story.title}` : `Save ${story.title}`}
                      >
                        <Bookmark
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${story.is_saved ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                        />
                        <span>{story.is_saved ? "Saved" : "Save"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              <Card className="rounded-2xl bg-card shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span>Comments ({story.comments_count})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-3 mb-8">
                    <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="flex space-x-3">
                        <Input
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => {
                            setNewComment(e.target.value);
                            setCommentError(null);
                          }}
                          className="flex-1 rounded-full border-border/50 bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                          aria-invalid={!!commentError}
                          aria-describedby={commentError ? "comment-error" : undefined}
                          maxLength={500}
                        />
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || commentLoading}
                          aria-label="Submit comment"
                          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
                        >
                          {commentLoading ? "Posting..." : "Post"}
                        </Button>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{newComment.length}/500</span>
                        {commentError && (
                          <p id="comment-error" className="text-red-500">
                            {commentError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3 group">
                        {comment.author_avatar ? (
                          <Avatar className="h-10 w-10 border border-border/50 ring-1 ring-primary/10 transition-transform duration-200 group-hover:scale-105">
                            <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
                            <AvatarFallback className="text-xs font-semibold bg-muted/50">
                              {(comment.author_name || "U").slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center border border-border/50 transition-transform duration-200 group-hover:scale-105">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 bg-muted/30 rounded-lg p-3 transition-all duration-200 group-hover:bg-muted/50">
                          <div className="flex items-center space-x-2 mb-1.5">
                            <span className="font-medium text-sm text-foreground">{comment.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                            </span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                aria-label={`Delete comment by ${comment.author_name}`}
                                className="p-1 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}

                    {comments.length === 0 && (
                      <div className="text-center py-12">
                        <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No comments yet</h3>
                        <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
                      </div>
                    )}

                    {hasMore && comments.length > 0 && (
                      <div className="text-center mt-8">
                        <Button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          aria-label="Load more comments"
                          className="rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors duration-200"
                        >
                          {loadingMore ? "Loading..." : "Load More"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Related Stories */}
              {related.length > 0 && (
                <Card className="mt-8 rounded-2xl bg-card shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">Related Stories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {related.map((r) => (
                        <Button
                          key={r.id}
                          asChild
                          variant="ghost"
                          size="sm"
                          className="justify-start text-left text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors duration-200"
                        >
                          <Link to={`/stories/${r.id}`}>{r.title}</Link>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Community Guidelines */}
              <Card className="mt-8 rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-primary">
                    <Shield className="h-5 w-5" />
                    <span>Community Guidelines</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Keep comments respectful and supportive. Harmful content will be removed.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Table of Contents */}
            {toc.length >= 3 && (
              <div className="hidden lg:block">
                <Card className="sticky top-24 max-h-[70vh] rounded-2xl bg-card shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-semibold text-foreground">Table of Contents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[50vh] pr-4">
                      <nav aria-label="Table of contents" className="space-y-2 text-sm">
                        {toc.map((h, i) => (
                          <a
                            key={`${h.id}-${i}`}
                            href={`#${h.id}`}
                            className={`block rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors duration-200 ${h.level === 1 ? "font-semibold" : h.level === 2 ? "ml-3" : "ml-6 text-muted-foreground"
                              }`}
                          >
                            {h.text}
                          </a>
                        ))}
                      </nav>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </div>
  );
}
