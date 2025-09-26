// EditStory.tsx — aligned with your Supabase schema & policies
// - Reads/writes `stories` (status: 'draft' | 'published' | 'pending'; tags: text[]; content: text NOT NULL)
// - Category is stored as a tag "cat:<category>"
// - Only the story author or an admin (row in `admin_members`) can edit

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["healing", "escape", "support", "recovery", "awareness"] as const;
type Category = (typeof CATEGORIES)[number];

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  tags: string[] | null;
  status: "draft" | "published" | "pending" | null;
  author_id: string | null;
};

export default function EditStory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [authorId, setAuthorId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fmtErr = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const anyE = e as Record<string, unknown>;
      return anyE.message || anyE.error_description || anyE.error || JSON.stringify(anyE);
    }
    return "Unknown error";
  };

  // Helpers
  const parseTags = (): string[] => {
    const basics = (tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !/^cat:/.test(t)); // we'll inject cat: separately

    const withCat = category ? [`cat:${category}`, ...basics] : basics;

    // unique, keep order (first occurrence wins)
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const t of withCat) {
      if (!seen.has(t)) {
        seen.add(t);
        deduped.push(t);
      }
    }
    return deduped;
  };

  // Load story + auth/admin
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        if (!id) {
          setError("Invalid story id.");
          return;
        }

        // Auth
        const { data: auth } = await supabase.auth.getUser();
        const me = auth?.user ?? null;
        if (!me) {
          setError("You must be logged in to edit a story.");
          navigate("/auth/login");
          return;
        }

        // Admin?
        const { data: adminRow } = await supabase
          .from("admin_members")
          .select("user_id, role")
          .eq("user_id", me.id)
          .maybeSingle();
        const amAdmin = !!adminRow;
        setIsAdmin(amAdmin);

        // Load story
        const { data, error } = await supabase
          .from("stories")
          .select("id,title,content,tags,status,author_id")
          .eq("id", id)
          .maybeSingle<StoryRow>();
        if (error) throw error;
        if (!data) throw new Error("Story not found.");

        setAuthorId(data.author_id);

        // Client-side permission check (RLS also protects server-side)
        const isOwner = data.author_id === me.id;
        if (!isOwner && !amAdmin) {
          setError("You are not allowed to edit this story.");
          return;
        }

        // Populate form
        setTitle(data.title ?? "");
        setContent(data.content ?? "");

        const tagList = Array.isArray(data.tags) ? data.tags : [];
        const foundCat = tagList.find((t) => /^cat:/.test(t))?.split(":")[1] as Category | undefined;
        setCategory(foundCat && CATEGORIES.includes(foundCat) ? foundCat : "");

        setTagsInput(tagList.filter((t) => !/^cat:/.test(t)).join(", "));
        setStatus((data.status === "published" ? "published" : "draft"));
      } catch (e) {
        console.error(e);
        const msg = fmtErr(e);
        setError("Failed to load story.");
        toast.error("Failed to load story.", { description: String(msg) });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleUpdate = async (nextStatus?: "draft" | "published") => {
    if (!id) return;

    const desired = nextStatus ?? status;

    if (!content.trim()) {
      toast.error("Please add your story content.");
      return;
    }
    if (desired !== "draft" && desired !== "published") {
      toast.error("Invalid status.");
      return;
    }

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth?.user ?? null;
      if (!me) throw new Error("Not authenticated.");

      // Client-side guard (server-side RLS still enforced)
      const isOwner = authorId === me.id;
      if (!isOwner && !isAdmin) {
        toast.error("You are not allowed to update this story.");
        return;
      }

      const payload = {
        title: title.trim() || null,
        content: content.trim(),
        tags: parseTags(), // text[]
        status: desired, // 'draft' | 'published'
        updated_at: new Date().toISOString(),
      };

      // For authors, we include author filter; for admins we just target by id
      const q = supabase.from("stories").update(payload).eq("id", id);
      const { error } = isAdmin && !isOwner ? await q : await q.eq("author_id", me.id);

      if (error) throw error;

      toast.success("Story updated.");
      navigate("/account/my-stories");
    } catch (e) {
      console.error(e);
      const msg = fmtErr(e);
      if (/row-level security|RLS/i.test(String(msg))) {
        toast.error("Permission denied by security policy.", {
          description: "Ensure you are the story author (or admin) and logged in.",
        });
      } else {
        toast.error("Failed to update story.", { description: <>{msg}</> });
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
              <div className="rounded-md border p-4 text-red-600">{error}</div>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
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
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your story a title"
                  />
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
                    <Select
                      value={category}
                      onValueChange={(v) => setCategory(v as Category)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c[0].toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. healing, support, sensitive"
                    />
                    <p className="text-xs text-muted-foreground">
                      Category is saved as a tag like <code>cat:{category || "healing"}</code>.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as "draft" | "published")}
                  >
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
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => handleUpdate("draft")}
                >
                  Save as Draft
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/80"
                  disabled={saving}
                  onClick={() => handleUpdate("published")}
                >
                  {saving ? "Saving..." : "Save & Publish"}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
