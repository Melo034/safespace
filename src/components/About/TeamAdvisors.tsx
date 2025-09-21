import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Person = { name: string; role: string; src?: string };

export default function TeamAdvisors() {
  const team: Person[] = [
    { name: "Team Member", role: "Product & Research" },
    { name: "Team Member", role: "Engineering" },
    { name: "Team Member", role: "Community & Safety" },
  ];
  const advisors: Person[] = [
    { name: "Advisor", role: "Trauma Counseling" },
    { name: "Advisor", role: "Legal Aid" },
    { name: "Advisor", role: "Digital Safety" },
  ];
  return (
    <section className="mb-12">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4">Team</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {team.map((p, i) => (
          <Card key={i} className="hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.src || "/Images/placeholder.jpg"} />
                  <AvatarFallback>SS</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Committed to survivor‑centered, privacy‑first practices.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold mb-4">Advisors</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {advisors.map((p, i) => (
          <Card key={i} className="hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.src || "/Images/placeholder.jpg"} />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Guiding respectful design and trusted pathways to help.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

