import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, CheckCircle } from "lucide-react";

export default function TrustSecurity() {
  const points = [
    { icon: Shield, title: "Data Protection", desc: "We use strict access controls and audit trails." },
    { icon: Lock, title: "Privacy by Default", desc: "Anonymous reporting and minimal data collection." },
    { icon: CheckCircle, title: "Verified Providers", desc: "We vet partners and resources before listing." },
  ];
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Trust & Security</CardTitle>
            <CardDescription>Safety is built into every step.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {points.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{title}</div>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

