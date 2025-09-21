import { useEffect, useState } from "react";
import supabase from "@/server/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

type Story = { id: string; title: string; content: string; created_at: string };

export default function RecentStoriesHome() {
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("stories")
          .select("id,title,content,created_at,status")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(4);
        if (error) throw error;
        if (!alive) return;
        setItems((data || []).map((r) => ({
          id: r.id as string,
          title: (r.title as string) || "Untitled",
          content: (r.content as string) || "",
          created_at: (r.created_at as string) || new Date().toISOString(),
        })));
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false };
  }, []);

  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recent Stories</h2>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/stories">Explore Stories</Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-40" />
            ))
          ) : (
            items.map((s) => (
              <Card key={s.id} className="hover:-translate-y-0.5 transition">
                <CardHeader>
                  <CardTitle className="text-base line-clamp-1">{s.title}</CardTitle>
                  <CardDescription>{new Date(s.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{s.content}</p>
                  <Button asChild size="sm" className="mt-3"><Link to={"/stories/" + s.id}>Read</Link></Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

