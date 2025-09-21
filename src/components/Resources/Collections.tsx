import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Scale, Shield, Heart } from "lucide-react";

export default function ResourceCollections() {
  const kits = [
    {
      title: "Legal Aid Starter Kit",
      desc: "Templates, know‑your‑rights, and trusted legal resources.",
      icon: Scale,
      q: "legal-aid",
    },
    {
      title: "Safety Planning Kit",
      desc: "Guides for immediate safety, checklists, and helplines.",
      icon: Shield,
      q: "safety-planning",
    },
    {
      title: "Mental Health Kit",
      desc: "Grounding exercises, counseling guides, and support groups.",
      icon: Heart,
      q: "counseling",
    },
  ];
  return (
    <section className="max-w-6xl mx-auto mb-8">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((k) => (
          <Card key={k.title} className="hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <k.icon className="h-5 w-5" />
                <CardTitle className="text-base">{k.title}</CardTitle>
              </div>
              <CardDescription>{k.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link to={`/resources?kit=${encodeURIComponent(k.q)}`}>Open Kit</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

