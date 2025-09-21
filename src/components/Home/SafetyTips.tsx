import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, PhoneOff, Lock, EyeOff, FileWarning } from "lucide-react";

export default function SafetyTips() {
  const tips = [
    { icon: Shield, text: "Use anonymous reporting if you don’t feel safe." },
    { icon: Lock, text: "Protect device access with a passcode or biometrics." },
    { icon: EyeOff, text: "Clear browsing history or use private browsing on shared devices." },
    { icon: FileWarning, text: "Upload only evidence you’re comfortable sharing." },
    { icon: PhoneOff, text: "In danger? Call local emergency services immediately." },
  ];
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Safety Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {tips.map(({ icon: Icon, text }) => (
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
      </div>
    </section>
  );
}

