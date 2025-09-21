import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MissionImpact() {
  const goals = [
    { label: "Reports Supported", target: "+1,000" },
    { label: "Verified Resources", target: "+300" },
    { label: "Avg. Response Time", target: "<24h" },
  ];
  const milestones = [
    { date: "2024 Q4", title: "MVP Launch" },
    { date: "2025 Q1", title: "Verified Resource Directory" },
    { date: "2025 Q2", title: "Emergency SOS + Location" },
  ];
  return (
    <section className="mb-12">
      <Card>
        <CardHeader>
          <CardTitle>Mission & Impact</CardTitle>
          <CardDescription>
            Build compassionate, privacy‑respecting tools so survivors can report safely and find trusted support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">Measurable Goals</h3>
              <ul className="space-y-2">
                {goals.map((g) => (
                  <li key={g.label} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm text-muted-foreground">{g.label}</span>
                    <Badge variant="secondary">{g.target}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Milestones</h3>
              <ul className="space-y-2">
                {milestones.map((m) => (
                  <li key={m.title} className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">{m.date}</p>
                    <p className="text-sm font-medium">{m.title}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

