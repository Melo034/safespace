import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import supabase from "@/server/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import Loading from "@/components/utils/Loading";
import type { Story as StoryType, Comment } from "@/lib/types";

const commentSchema = z.object({
  content: z
    .string()
    .min(5, "Comment must be at least 5 characters")
    .max(500, "Comment must be less than 500 characters"),
});

const ITEMS_PER_PAGE = 10;

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

export default function Story() {
  const [story, setStory] = useState<StoryType | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  type CommentView = Comment & { author_avatar: string | null };
  const [comments, setComments] = useState<CommentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Route in App.tsx uses "/stories/:id"; read param as id
  const { id: idParam } = useParams();
  const navigate = useNavigate();

  const fetchComments = useCallback(
    async (storyId: string, pageNum = 1) => {
      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("comments")
        .select("id, author_id, content, created_at", { count: "exact" })
        .eq("story_id", storyId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching comments:", error);
        return { rows: [] as CommentView[], total: 0 };
      }

      const baseRows = (data ?? []).map((d: CommentRow) => ({
        id: d.id,
        author_id: d.author_id ?? null,
        author_name: d.author_id ? "User" : "Anonymous",
        content: d.content ?? "",
        created_at: d.created_at,
        author_avatar: null as string | null,
      })) as CommentView[];

      // fetch commenter profiles in batch
      const authorIds = Array.from(new Set(baseRows.map(r => r.author_id).filter(Boolean))) as string[];
      if (authorIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from("community_members")
          .select("user_id,name,avatar_url")
          .in("user_id", authorIds);
        if (!pErr && profiles) {
          const map = new Map<string, { name: string | null; avatar_url: string | null }>();
          profiles.forEach((p: { user_id: string; name: string | null; avatar_url: string | null }) => {
            map.set(p.user_id, { name: p.name, avatar_url: p.avatar_url });
          });
          baseRows.forEach((r) => {
            if (r.author_id && map.has(r.author_id)) {
              const prof = map.get(r.author_id)!;
              r.author_name = prof.name || "User";
              r.author_avatar = prof.avatar_url ?? null;
            }
          });
        }
      }

      return { rows: baseRows, total: count ?? baseRows.length };
    },
    []
  );

  useEffect(() => {
    let storyChannel: ReturnType<typeof supabase.channel> | null = null;
    let commentsChannel: ReturnType<typeof supabase.channel> | null = null;
    let countsChannel: ReturnType<typeof supabase.channel> | null = null;

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

        let { data: storyRow, error: storyError } = await supabase
          .from("stories")
          .select("id, title, content, author_id, created_at, tags, status")
          .eq("id", idParam)
          .maybeSingle();

        if (storyError && (storyError as any).code === "42703") {
          const r2 = await supabase
            .from("stories")
            .select("id, title, content, author_id, created_at, tags")
            .eq("id", idParam)
            .maybeSingle();
          storyRow = r2.data as any;
          storyError = r2.error as any;
        }

        if (storyError || !storyRow) {
          toast.error("Story not found.");
          setLoading(false);
          return;
        }

        // visibility: published or owner/admin
        const visible =
          (storyRow as any).status
            ? (storyRow as any).status === "published" ||
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
          authorName = cm?.name || "User";
          authorAvatar = cm?.avatar_url ?? null;
          authorVerified = !!cm?.verified;
        }

        const base = mapStoryRow(storyRow as StoryRow, authorName);
        const withAuthor = {
          ...base,
          author: {
            ...base.author,
            name: authorName,
            avatar: authorAvatar,
            verified: authorVerified,
            anonymous: !storyRow.author_id,
          },
        } as StoryType;

        // likes count and current user's like
        const { data: likeCount } = await supabase
          .from("story_like_counts")
          .select("story_id,likes")
          .eq("story_id", (storyRow as StoryRow).id)
          .maybeSingle<{ story_id: string; likes: number }>();

        let isLiked = false;
        if (auth.user) {
          const { data: mine } = await supabase
            .from("story_likes")
            .select("story_id")
            .eq("story_id", (storyRow as StoryRow).id)
            .eq("user_id", auth.user.id)
            .maybeSingle();
          isLiked = !!mine;
        }

        const { count: totalComments } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyRow.id);

        // views count
        const { data: viewCount } = await supabase
          .from("story_view_counts")
          .select("story_id,views")
          .eq("story_id", (storyRow as StoryRow).id)
          .maybeSingle<{ story_id: string; views: number }>();

        setStory({ ...withAuthor, comments_count: totalComments ?? 0, likes: likeCount?.likes ?? 0, is_liked: isLiked, views: viewCount?.views ?? 0 });

        // Record view for logged-in users (ignore errors/duplicates)
        if (auth.user) {
          try {
            await supabase.from("story_views").insert({ story_id: (storyRow as StoryRow).id, user_id: auth.user.id });
            setStory((prev) => prev ? { ...prev, views: prev.views + 1 } : prev);
          } catch (_) {
            // ignore
          }
        }

        const first = await fetchComments(storyRow.id, 1);
        setComments(first.rows);
        setHasMore(ITEMS_PER_PAGE < first.total);
        setPage(1);

        storyChannel = supabase
          .channel(`story-${storyRow.id}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "stories", filter: `id=eq.${storyRow.id}` },
            (payload: { new: Partial<StoryRow> }) => {
              const row = payload.new;
              if (!row) return;
              setStory((prev) =>
                prev
                  ? {
                      ...prev,
                      title: row.title ?? prev.title,
                      content: row.content ?? prev.content,
                      full_content: row.content ?? prev.full_content,
                      tags: Array.isArray(row.tags) ? (row.tags as string[]) : prev.tags,
                    }
                  : prev
              );
            }
          )
          .subscribe();

        commentsChannel = supabase
          .channel(`comments-${storyRow.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "comments", filter: `story_id=eq.${storyRow.id}` },
            async () => {
              const refreshed = await fetchComments(storyRow.id, 1);
              setComments(refreshed.rows);
              setHasMore(ITEMS_PER_PAGE < refreshed.total);
              setPage(1);
              setStory((prev) =>
                prev ? { ...prev, comments_count: refreshed.total } : prev
              );
            }
          )
          .subscribe();

        // Realtime updates for likes/views counts
        countsChannel = supabase
          .channel(`story-counts-${storyRow.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'story_like_counts', filter: `story_id=eq.${storyRow.id}` },
            (payload: any) => {
              const likes = (payload.new?.likes ?? payload.new?.count ?? null) as number | null;
              if (likes != null) setStory((prev) => (prev ? { ...prev, likes } : prev));
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'story_view_counts', filter: `story_id=eq.${storyRow.id}` },
            (payload: any) => {
              const views = (payload.new?.views ?? payload.new?.count ?? null) as number | null;
              if (views != null) setStory((prev) => (prev ? { ...prev, views } : prev));
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
      countsChannel?.unsubscribe();
    };
  }, [idParam, fetchComments]);

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
      setStory((s) => s ? { ...s, is_liked: nextLiked, likes: Math.max(0, s.likes + (nextLiked ? 1 : -1)) } : s);

      if (nextLiked) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("story_likes")
          .insert([{ story_id: story.id, user_id: user!.id }]);
        if (error && (error as { code?: string }).code !== "23505") {
          // rollback
          setStory((s) => s ? { ...s, is_liked: false, likes: Math.max(0, s.likes - 1) } : s);
          const msg = (error as any)?.message || (error as any)?.hint || (error as any)?.details || "Like failed.";
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
          setStory((s) => s ? { ...s, is_liked: true, likes: s.likes + 1 } : s);
          const msg = (error as any)?.message || (error as any)?.hint || (error as any)?.details || "Unlike failed.";
          toast.error("Unlike failed", { description: msg });
        }
      }
    } catch (e) {
      console.error("Like toggle error:", e);
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
      let authorName = "User";
      let authorAvatar: string | null = null;
      const { data: me } = await supabase
        .from("community_members")
        .select("name,avatar_url")
        .eq("user_id", auth.user.id)
        .maybeSingle<{ name: string | null; avatar_url: string | null }>();
      if (me) {
        authorName = me.name || "User";
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
      setStory((prev) =>
        prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev
      );
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

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setStory((prev) =>
        prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : prev
      );
      toast.success("Comment deleted.");
    } catch (e) {
      console.error("Error deleting comment:", e);
      toast.error("Failed to delete comment.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
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
            <h1 className="text-2xl font-bold text-foreground mb-4">Story not found</h1>
            <Button asChild>
              <Link to="/stories" aria-label="Back to stories">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Stories
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgress target="#story-content" />
      <Navbar />
      <main className="relative container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto mb-6">
          <Button variant="ghost" asChild>
            <Link to="/stories" className="mb-4" aria-label="Back to stories">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stories
            </Link>
          </Button>
        </div>

        <div id="story-content" className="max-w-4xl mx-auto">
          <Card className="mb-8 rounded-xl shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {story.author.avatar ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={story.author.avatar} alt={story.author.name} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      {story.author.anonymous ? (
                        <Shield className="h-6 w-6" />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold flex items-center gap-1">
                        {story.author.name}
                        {story.author.verified && (
                          <Badge variant="secondary" className="inline-flex items-center gap-1 px-1.5 py-0 text-[10px]">
                            <BadgeCheck className="h-3 w-3 text-primary" />
                            Verified
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(parseISO(story.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {String(story.category).replace("-", " ")}
                  </Badge>
                  {story.tags.some(
                    (tag) =>
                      ["trigger", "sensitive"].includes(
                        tag?.toLowerCase?.() ?? ""
                      )
                  ) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Content Warning
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-3xl mb-4">
                {story.title?.trim() || (story.content ? String(story.content).slice(0, 60) + "..." : "Untitled story")}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                {story.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{String(tag).replace("-", "")}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Heart
                    className={`h-4 w-4 ${
                      story.is_liked ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                  <span>{story.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>{story.comments_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {Math.max(
                      1,
                      Math.ceil(
                        (story.full_content?.length ?? story.content.length) /
                          1000
                      )
                    )}{" "}
                    min read
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <div className="prose prose-lg max-w-none mb-8">
                {(story.full_content || story.content)
                  .split("\n\n")
                  .map((paragraph, index) => (
                    <p
                      key={index}
                      className="mb-4 leading-relaxed text-foreground animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
                    >
                      {paragraph}
                    </p>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleLike}
                    className="flex items-center space-x-2 bg-transparent"
                    aria-label={
                      story.is_liked ? `Unlike ${story.title}` : `Like ${story.title}`
                    }
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        story.is_liked ? "fill-blue-500 text-blue-500" : ""
                      }`}
                    />
                    <span>{story.is_liked ? "Liked" : "Like"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex items-center space-x-2 bg-transparent"
                    aria-label={`Share ${story.title}`}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Comments ({comments.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a thoughtful comment..."
                      value={newComment}
                      onChange={(e) => {
                        setNewComment(e.target.value);
                        setCommentError(null);
                      }}
                      className="flex-1"
                      aria-invalid={!!commentError}
                      aria-describedby={commentError ? "comment-error" : undefined}
                      maxLength={500}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || commentLoading}
                      aria-label="Submit comment"
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

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    {comment.author_avatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
                        <AvatarFallback>{(comment.author_name || 'U').slice(0,1)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            aria-label={`Delete comment by ${comment.author_name}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No comments yet
                    </h3>
                    <p className="text-muted-foreground">
                      Be the first to share your thoughts on this story.
                    </p>
                  </div>
                )}

                {hasMore && comments.length > 0 && (
                  <div className="text-center mt-6">
                    <Button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      aria-label="Load more comments"
                    >
                      {loadingMore ? "Loading..." : "Load More Comments"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-primary">
                <Shield className="h-5 w-5" />
                <span>Community Guidelines</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Keep comments respectful and supportive. Harmful content will be removed.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
