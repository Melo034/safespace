import { useEffect, useState } from "react";
import supabase from "@/server/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Sparkles, ExternalLink } from "lucide-react";

type Resource = {
  id: string;
  title: string;
  category: string;
  description: string;
  type: "pdf" | "website";
  url: string;
  is_verified: boolean;
};

export default function ResourceSpotlight() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("resources")
          .select("id,title,category,description,type,url,is_verified")
          .eq("is_verified", true)
          .limit(3);
        if (error) throw error;
        if (!alive) return;
        setItems((data || []).map((r) => ({
          id: r.id as string,
          title: (r.title as string) || "",
          category: (r.category as string) || "",
          description: (r.description as string) || "",
          type: (r.type as "pdf" | "website") || "website",
          url: (r.url as string) || "",
          is_verified: !!r.is_verified,
        }))
        );
      } catch {
        setItems([]);
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
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Resource Spotlight</h2>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/resources">View all</Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-40" />
            ))
          ) : (
            items.map((r) => (
              <Card key={r.id} className="hover:-translate-y-0.5 transition">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {r.title}
                    {r.is_verified && <Badge variant="outline">Verified</Badge>}
                  </CardTitle>
                  <CardDescription className="capitalize">{r.category.replace("-", " ")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{r.description}</p>
                  <Button size="sm" variant="outline" onClick={() => window.open(r.url, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4 mr-2"/>Open {r.type === 'pdf' ? 'PDF' : 'Link'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

