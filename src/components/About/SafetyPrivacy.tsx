import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, EyeOff, CheckCircle } from "lucide-react";

export default function SafetyPrivacy() {
  const items = [
    { icon: Shield, text: "Row‑Level Security (RLS) and least‑privilege access controls." },
    { icon: Lock, text: "Anonymous reporting available; only the data you choose is stored." },
    { icon: EyeOff, text: "Sensitive content moderation and respectful community guidelines." },
    { icon: CheckCircle, text: "Verified resources and audited provider listings." },
  ];
  return (
    <section className="mb-12">
      <Card>
        <CardHeader>
          <CardTitle>Safety & Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

