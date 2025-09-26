// StoryCard.tsx — aligned with your Supabase schema & RLS policies
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/server/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Eye, Heart, MessageCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import type { Story } from "@/lib/types";

type StoryCardProps = {
  story?: Story;      // full story object (optional)
  storyId?: string;   // or just pass an id and we'll fetch
};

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  created_at: string | null;
  tags: string[] | null;
  status?: string | null; // may not exist on older DBs—guard below
};

const CATEGORIES = ["healing", "escape", "support", "recovery", "awareness"] as const;

function getCategoryFromTags(tags: string[] | null | undefined): Story["category"] {
  if (!tags?.length) return "general";
  const found = tags.find((t) => /^cat:/.test(t))?.split(":")[1];
  return (CATEGORIES as readonly string[]).includes(found as string) ? (found as Story["category"]) : "general";
}

function mapRowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    slug: String(row.id),
    title: row.title ?? "",
    content: row.content ?? "",
    full_content: row.content ?? "",
    author: {
      id: row.author_id ?? null,
      name: row.author_id ? "User" : "Anonymous",
      anonymous: !row.author_id,
      avatar: null,
      verified: false,
    },
    created_at: row.created_at ?? new Date().toISOString(),
    category: getCategoryFromTags(row.tags),
    likes: 0,
    comments_count: 0,
    views: 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    featured: false,
    is_liked: false,
  };
}

export function StoryCard({ story: propStory, storyId }: StoryCardProps) {
  const [story, setStory] = useState<Story | null>(propStory ?? null);
  const [loading, setLoading] = useState(!propStory && !!storyId);
  const [error, setError] = useState<string | null>(null);

  // Fetch story by id (explicit columns to match DB)
  useEffect(() => {
    if (propStory || !storyId) return;

    const fetchStory = async () => {
      try {
        setLoading(true);

        // Prefer selecting explicit columns present in your schema
        let { data: row, error: selErr } = await supabase
          .from("stories")
          .select("id,title,content,author_id,created_at,tags,status")
          .eq("id", storyId)
          .maybeSingle<StoryRow>();

        // Fallback for schemas without `status`
        if (selErr?.code === "42703") {
          const r2 = await supabase
            .from("stories")
            .select("id,title,content,author_id,created_at,tags")
            .eq("id", storyId)
            .maybeSingle<StoryRow>();
          row = r2.data ?? null;
          selErr = r2.error as typeof selErr;
        }

        if (selErr) throw selErr;
        if (!row) throw new Error("Story not found.");

        // Aggregate counts (RLS: both are public SELECT per your policies)
        const [{ data: likeRow }, { data: viewRow }] = await Promise.all([
          supabase.from("story_like_counts").select("likes").eq("story_id", row.id).maybeSingle<{ likes: number }>(),
          supabase.from("story_view_counts").select("views").eq("story_id", row.id).maybeSingle<{ views: number }>(),
        ]);

        // Comments count (public SELECT on comments)
        const { count: commentsCount } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("story_id", row.id);

        const mapped = mapRowToStory(row);
        mapped.likes = likeRow?.likes ?? 0;
        mapped.views = viewRow?.views ?? 0;
        mapped.comments_count = commentsCount ?? 0;

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

  // Enrich author profile (name/avatar/verified) from community_members
  // NOTE: RLS allows SELECT only for authenticated; we gracefully ignore errors for anon users.
  useEffect(() => {
    const enrichAuthor = async () => {
      if (!story?.author?.id) return;

      const hasCustomName =
        story.author.name && story.author.name !== "User" && story.author.name !== "Anonymous";
      if (story.author.avatar && hasCustomName) return;

      const { data, error: pErr } = await supabase
        .from("community_members")
        .select("name, avatar_url, verified")
        .eq("user_id", story.author.id)
        .maybeSingle<{ name: string | null; avatar_url: string | null; verified: boolean | null }>();

      if (pErr) {
        // Likely blocked by RLS when anon; just keep existing anonymous display
        return;
      }
      if (data) {
        setStory((s) =>
          s
            ? {
                ...s,
                author: {
                  ...s.author,
                  name: data.name || s.author.name,
                  avatar: data.avatar_url ?? s.author.avatar,
                  verified: !!data.verified,
                },
              }
            : s
        );
      }
    };
    enrichAuthor();
  }, [story?.author?.id, story?.author?.avatar, story?.author?.name]);

  // Refresh metrics for prop-provided stories as well
  useEffect(() => {
    const enrichMetrics = async () => {
      if (!story?.id) return;
      try {
        const [{ data: likeRow }, { data: viewRow }, { count: commentsCount }] = await Promise.all([
          supabase.from("story_like_counts").select("likes").eq("story_id", story.id).maybeSingle<{ likes: number }>(),
          supabase.from("story_view_counts").select("views").eq("story_id", story.id).maybeSingle<{ views: number }>(),
          supabase.from("comments").select("id", { count: "exact", head: true }).eq("story_id", story.id),
        ]);

        setStory((s) =>
          s
            ? {
                ...s,
                likes: likeRow?.likes ?? s.likes,
                views: viewRow?.views ?? s.views,
                comments_count: typeof commentsCount === "number" ? commentsCount : s.comments_count,
              }
            : s
        );
      } catch {
        // ignore metric errors
      }
    };
    enrichMetrics();
  }, [story?.id]);

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

  return (
    <div className="group overflow-hidden rounded-lg border transition-all hover:shadow-md">
      <Link to={`/stories/${story.id}`} className="block" aria-label={`View story: ${story.title}`}>
        <div className="relative w-full overflow-hidden">
          {story.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary text-primary-foreground">Featured</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="mb-1 line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
            {story.title?.trim() || (story.content ? String(story.content).slice(0, 60) + "..." : "Untitled")}
          </h3>
        </div>
      </Link>

      <div className="p-4 pt-0">
        <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground min-w-0">
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
                <span className="text-[11px] font-semibold">{(story.author.name || "A").slice(0, 1)}</span>
              )}
            </div>
          )}

          <span className="flex-1 truncate font-medium text-foreground">{story.author.name}</span>
          <span className="shrink-0">•</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <Clock className="h-4 w-4" />
            {new Date(story.created_at).toLocaleDateString()}
          </span>
          <span className="ml-auto shrink-0">
            <Badge variant="outline" className="text-xs">
              {String(story.category || "").replace("-", " ") || "general"}
            </Badge>
          </span>
        </div>

        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{story.content}</p>

        {Array.isArray(story.tags) && story.tags.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1">
            {story.tags
              .filter((t) => !/^cat:/.test(String(t)))
              .slice(0, 4)
              .map((tag) => (
                <Badge key={`${story.id}-${tag}`} variant="secondary" className="text-xs">
                  #{String(tag).replace(/-/g, "")}
                </Badge>
              ))}
            {story.tags.filter((t) => !/^cat:/.test(String(t))).length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{story.tags.filter((t) => !/^cat:/.test(String(t))).length - 4} more
              </Badge>
            )}
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">No tags</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-4 w-4" />
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
          <Link to={`/stories/${story.id}`} className="text-primary underline-offset-2 hover:underline">
            Read more
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StoryCard;
