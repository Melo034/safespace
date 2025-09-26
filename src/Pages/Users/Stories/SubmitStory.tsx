
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function SubmitStory() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<Category | "">("");

  // helpers
  const fmtErr = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const anyE = e as Record<string, unknown>;
      return anyE.message || anyE.error_description || anyE.error || JSON.stringify(anyE);
    }
    return "Unknown error";
  };

  const parseTags = (): string[] => {
    const raw = (tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !/^cat:/.test(t)); // avoid user-injected cat: duplicates

    const withCat = category ? [`cat:${category}`, ...raw] : raw;

    // unique, keep order
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

  // require auth
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error("You must be logged in to submit a story.");
        navigate("/auth/login");
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  const createStory = async (status: "draft" | "published") => {
    if (!content.trim()) {
      toast.error("Please add your story content.");
      return;
    }

    try {
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      const me = auth?.user ?? null;
      if (!me) throw new Error("Not authenticated.");

      const payload = {
        title: title.trim() || null,
        content: content.trim(),             // NOT NULL in schema
        tags: parseTags(),                   // text[]
        status,                              // 'draft' | 'published'
        author_id: me.id,                    // RLS: insert self
        is_public: true,                     // explicit (matches default)
        // created_at/updated_at handled by defaults, but we can set updated_at too
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("stories")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      toast.success(status === "published" ? "Story published" : "Draft saved");
      navigate("/account/my-stories");
    } catch (e) {
      console.error(e);
      const msg = fmtErr(e);
      if (/row-level security|RLS/i.test(String(msg))) {
        toast.error("Permission denied by security policy.", {
          description: "Make sure you are logged in; inserts are restricted to the current user.",
        });
      } else {
        toast.error(`Failed to save story. ${msg}`);
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

  return (
    <>
      <Navbar />
      <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <main className="flex w-full flex-col overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Create Story</h1>
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
                    placeholder="Share your experience, thoughts, or journey..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Saved as a tag like <code>cat:{category || "healing"}</code>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. healing, support, sensitive"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => createStory("draft")}
                >
                  Save as Draft
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/80"
                  disabled={saving}
                  onClick={() => createStory("published")}
                >
                  {saving ? "Saving..." : "Publish"}
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
