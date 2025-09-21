import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSavedItems } from "@/hooks/useSavedItems";
import Sidebar from "../Components/Sidebar";
import { Link } from "react-router-dom";

export default function Saved() {
  const { saved } = useSavedItems();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Items</CardTitle>
                <CardDescription>Resources, stories, and support services you saved.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium mb-1">Stories</p>
                    {saved.stories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No saved stories.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {saved.stories.map((id) => (
                          <li key={id}><Link className="text-primary underline-offset-2 hover:underline" to={`/stories/${id}`}>Story {id}</Link></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium mb-1">Resources</p>
                    {saved.resources.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No saved resources.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {saved.resources.map((id) => (
                          <li key={id}><span>Resource {id}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium mb-1">Support services</p>
                    {saved.support.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No saved services.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {saved.support.map((id) => (
                          <li key={id}><span>Service {id}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  These lists are stored on this device only.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
