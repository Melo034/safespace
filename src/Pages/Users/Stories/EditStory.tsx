import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import supabase from "@/server/supabase";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import Sidebar from "../Components/Sidebar";
import Loading from "@/components/utils/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["healing", "escape", "support", "recovery", "awareness"] as const;

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  tags: string[] | null;
  status?: string | null;
  author_id?: string | null;
};

export default function EditStory() {
  const fmtErr = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const anyE = e as any;
      return anyE.message || anyE.error_description || anyE.error || JSON.stringify(anyE);
    }
    return "Unknown error";
  };
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "">("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError("You must be logged in to edit a story.");
        navigate("/auth/login");
        return;
      }
      if (!id) {
        setError("Invalid story id");
        return;
      }
      try {
        let { data, error } = await supabase
          .from("stories")
          .select("id,title,content,tags,status,author_id")
          .eq("id", id)
          .maybeSingle<StoryRow>();
        // Fallback when 'status' column doesn't exist
        if (error && (error as any).code === "42703") {
          const r2 = await supabase
            .from("stories")
            .select("id,title,content,tags,author_id")
            .eq("id", id)
            .maybeSingle<StoryRow>();
          data = r2.data as any;
          error = r2.error as any;
        }
        if (error) throw error;
        if (!data) throw new Error("Story not found");
        if (data.author_id && data.author_id !== auth.user.id) {
          setError("You are not allowed to edit this story.");
          return;
        }
        setTitle(data.title || "");
        setContent(data.content || "");
        const tagList = Array.isArray(data.tags) ? data.tags : [];
        const cat = tagList.find((t) => t.startsWith("cat:"))?.split(":")[1] || "";
        setCategory((cat as any) || "");
        setTagsInput(tagList.filter((t) => !t.startsWith("cat:")).join(", "));
        setStatus(((data.status as any) === "published" ? "published" : "draft"));
      } catch (e) {
        console.error(e);
        const msg = fmtErr(e);
        setError("Failed to load story.");
        toast.error("Failed to load story.", { description: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const parseTags = () => {
    const raw = (tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const withCat = category ? [
      `cat:${category}`,
      ...raw.filter((t) => !t.startsWith("cat:")),
    ] : raw;
    return Array.from(new Set(withCat));
  };

  const update = async (nextStatus?: "draft" | "published") => {
    if (!id) return;
    if (!content.trim()) {
      toast.error("Please add your story content.");
      return;
    }
    try {
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated.");
      const payload = {
        title: title.trim() || null,
        content: content.trim(),
        tags: parseTags(),
        status: nextStatus ?? status,
        updated_at: new Date().toISOString(),
      } as any;
      let { error } = await supabase
        .from("stories")
        .update(payload)
        .eq("id", id)
        .eq("author_id", auth.user.id);
      if (error && (error as any).code === "42703") {
        // Retry without optional columns that might not exist
        const fallback = {
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
        } as any;
        const r2 = await supabase
          .from("stories")
          .update(fallback)
          .eq("id", id)
          .eq("author_id", auth.user.id);
        error = r2.error as any;
      }
      if (error) throw error;
      toast.success("Story updated");
      navigate("/account/my-stories");
    } catch (e) {
      console.error(e);
      const msg = fmtErr(e);
      if (/row-level security|RLS/i.test(msg)) {
        toast.error("Permission denied by security policy.", {
          description: "Ensure you are the story author and logged in.",
        });
      } else {
        toast.error("Failed to update story.", { description: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col mx-auto overflow-hidden justify-center items-center h-64">
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
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
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
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <main className="flex w-full flex-col overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Edit Story</h1>
              <Button variant="outline" asChild>
                <Link to="/account/my-stories">Back to My Stories</Link>
              </Button>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your story a title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Story</Label>
                  <Textarea
                    id="content"
                    className="min-h-[240px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Update your story..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. healing, support, sensitive" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <Button variant="outline" disabled={saving} onClick={() => update("draft")}>Save as Draft</Button>
                <Button className="bg-primary hover:bg-primary/80" disabled={saving} onClick={() => update("published")}>{saving ? "Saving..." : "Save & Publish"}</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
