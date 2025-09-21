import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PartnersSection() {
  const partners = ["NGO One", "NGO Two", "NGO Three", "NGO Four", "NGO Five", "NGO Six"];
  return (
    <section className="mb-12">
      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>We work with vetted organizations to ensure safe, timely support.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-4">
            {partners.map((p) => (
              <div key={p} className="h-16 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                {p}
              </div>
            ))}
          </div>
          <Button asChild>
            <a href="/support">Become a partner</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

