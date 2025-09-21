import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
  const steps = [
    { icon: FileText, title: "Report", desc: "Share what happened in a secure, respectful flow." },
    { icon: Users, title: "Match", desc: "We help connect you with vetted support services." },
    { icon: LifeBuoy, title: "Support", desc: "Get guidance, counseling, and legal aid when you’re ready." },
  ];
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-center text-muted-foreground mb-8">A simple 3‑step path to safe support.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="hover:-translate-y-0.5 transition">
              <CardHeader>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg mt-2">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild><Link to="/report">Report an Incident</Link></Button>
          <Button asChild variant="outline"><Link to="/resources">Browse Resources</Link></Button>
        </div>
      </div>
    </section>
  );
}
