import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MediaContact() {
  return (
    <section className="mb-12">
      <Card>
        <CardHeader>
          <CardTitle>Media & Contact</CardTitle>
          <CardDescription>Press, partnerships, and secure contact channels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button asChild size="sm"><a href="/support">Contact Support</a></Button>
            <Button asChild size="sm" variant="outline"><a href="mailto:safespace.salone@gmail.com">Email Us</a></Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

