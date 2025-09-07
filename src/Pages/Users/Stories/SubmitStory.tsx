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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["healing", "escape", "support", "recovery", "awareness"] as const;

export default function SubmitStory() {
  const fmtErr = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const anyE = e as any;
      return anyE.message || anyE.error_description || anyE.error || JSON.stringify(anyE);
    }
    return "Unknown error";
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "">("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setError("You must be logged in to submit a story.");
        navigate("/auth/login");
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  const parseTags = () => {
    const raw = (tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const withCat = category ? [
      // ensure single category tag
      `cat:${category}`,
      ...raw.filter((t) => !t.startsWith("cat:")),
    ] : raw;
    return Array.from(new Set(withCat));
  };

  const upsert = async (status: "draft" | "published") => {
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
        status,
        author_id: auth.user.id,
      } as any;

      const { data, error } = await supabase.from("stories").insert(payload).select("id").single();
      if (error) throw error;
      toast.success(status === "published" ? "Story published" : "Draft saved");
      navigate("/account/my-stories");
    } catch (e) {
      console.error(e);
      const msg = fmtErr(e);
      if (/row-level security|RLS/i.test(msg)) {
        toast.error("Permission denied by security policy.", {
          description: "Ensure you are logged in. Author policy must allow inserts.",
        });
      } else {
        toast.error("Failed to save story.", { description: msg });
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
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your story a title" />
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
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. healing, support, sensitive" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <Button variant="outline" disabled={saving} onClick={() => upsert("draft")}>Save as Draft</Button>
                <Button className="bg-primary hover:bg-primary/80" disabled={saving} onClick={() => upsert("published")}>{saving ? "Saving..." : "Publish"}</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
