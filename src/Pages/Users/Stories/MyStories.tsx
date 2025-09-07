import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit, Trash2, Plus, MoreHorizontal, Heart, MessageCircle, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Footer } from "@/components/utils/Footer";
import Sidebar from "../Components/Sidebar";
import Navbar from "@/components/utils/Navbar";
import Loading from "@/components/utils/Loading";
import supabase from "@/server/supabase";

type StoryRow = {
  id: string;
  title: string;
  created_at: string;
  status?: string;
};

const MyStories = () => {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [metrics, setMetrics] = useState<Record<string, { likes: number; comments: number; views: number }>>({});
  const [authorName, setAuthorName] = useState<string>("");
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError("You must be logged in to view this page.");
        navigate("/auth/login");
        return;
      }

      try {
        const query = supabase
          .from("stories")
          .select("id, title, created_at, status")
          .eq("author_id", authData.user.id)
          .order("created_at", { ascending: false });
        let { data, error: qErr } = await query;

        // Fallback if 'status' column does not exist
        if (qErr && (qErr as { code?: string }).code === "42703") {
          const r2 = await supabase
            .from("stories")
            .select("id, title, created_at")
            .eq("author_id", authData.user.id)
            .order("created_at", { ascending: false });
          data = r2.data?.map((story) => ({
            ...story,
            status: "draft", // or undefined, depending on your default
          })) ?? [];
          qErr = r2.error;
        }

        if (qErr) throw qErr;
        const rows = (data as StoryRow[] | null) ?? [];
        setStories(rows);

        // Fetch likes/views in batch and comments per story for these rows
        const ids = rows.map((r) => r.id);
        if (ids.length > 0) {
          const [likesRes, viewsRes] = await Promise.all([
            supabase.from("story_like_counts").select("story_id,likes").in("story_id", ids),
            supabase.from("story_view_counts").select("story_id,views").in("story_id", ids),
          ]);

          type LikeRow = { story_id: string; likes: number };
          const likeMap = new Map<string, number>();
          if (!likesRes.error && Array.isArray(likesRes.data)) {
            (likesRes.data as LikeRow[]).forEach((row) => likeMap.set(row.story_id, Number(row.likes) || 0));
          }
          type ViewRow = { story_id: string; views: number };
          const viewMap = new Map<string, number>();
          if (!viewsRes.error && Array.isArray(viewsRes.data)) {
            (viewsRes.data as ViewRow[]).forEach((row) => viewMap.set(row.story_id, Number(row.views) || 0));
          }

          const commentPairs = await Promise.all(
            ids.map(async (id) => {
              const { count } = await supabase
                .from("comments")
                .select("id", { count: "exact", head: true })
                .eq("story_id", id);
              return [id, count ?? 0] as const;
            })
          );
          const commentMap = new Map<string, number>(commentPairs);

          const combined: Record<string, { likes: number; comments: number; views: number }> = {};
          ids.forEach((id) => {
            combined[id] = {
              likes: likeMap.get(id) ?? 0,
              comments: commentMap.get(id) ?? 0,
              views: viewMap.get(id) ?? 0,
            };
          });
          setMetrics(combined);
        }

        // Fetch profile for author name/avatar
        const { data: profile } = await supabase
          .from("community_members")
          .select("name, avatar_url")
          .eq("user_id", authData.user.id)
          .maybeSingle<{ name: string | null; avatar_url: string | null }>();
        setAuthorName(profile?.name || "You");
        setAuthorAvatar(profile?.avatar_url ?? null);
      } catch (e) {
        console.error(e);
        setError("Failed to load stories. Please try again.");
        toast.error("Failed to load stories. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleDeleteClick = (id: string) => {
    setStoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!storyToDelete) return;
    try {
      const { error } = await supabase.from("stories").delete().eq("id", storyToDelete);
      if (error) throw error;
      setStories((prev) => prev.filter((s) => s.id !== storyToDelete));
      toast.success("Story deleted", { description: "Your story has been deleted successfully." });
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete story. Please try again.");
    } finally {
      setDeleteDialogOpen(false);
      setStoryToDelete(null);
    }
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    if (status === "published") return <Badge className="bg-green-600">Published</Badge>;
    if (status === "pending") return <Badge className="bg-amber-500">Pending Review</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col overflow-hidden justify-center items-center h-64">
              <Loading />
            </main>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col overflow-hidden">
              {error}
              <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
            </main>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="container md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <main className="flex w-full flex-col overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">My Stories</h1>
              <Link to="/account/my-stories/new">
                <Button className="bg-primary hover:bg-primary/80">
                  <Plus className="mr-2 h-4 w-4" />
                  New Story
                </Button>
              </Link>
            </div>

            {stories.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No stories yet</h3>
                <p className="text-gray-500 mb-6">Start sharing your stories with the community</p>
                <Link to="/account/my-stories/new">
                  <Button className="bg-primary hover:bg-primary/80">Create Your First Story</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {stories.map((story) => (
                  <div key={story.id} className="flex border rounded-lg overflow-hidden">
                    <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border border-border ring-1 ring-primary/10 shadow-sm">
                          {authorAvatar ? (
                            <AvatarImage src={authorAvatar} alt={authorName} />
                          ) : null}
                          <AvatarFallback className="text-[12px] font-semibold">{(authorName || "U").slice(0,1)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{story.title}</h3>
                            <StatusBadge status={story.status} />
                          </div>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-foreground">{authorName}</span>
                            {" "}• Added on {new Date(story.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {metrics[story.id]?.likes ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {metrics[story.id]?.comments ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {metrics[story.id]?.views ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/stories/${story.id}`}>View</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                          <Link to={`/account/my-stories/${story.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteClick(story.id)}>
                              <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                              <span className="text-red-500">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your story from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MyStories;
