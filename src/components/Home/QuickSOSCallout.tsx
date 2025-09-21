import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Siren, Phone, Settings2 } from "lucide-react";

const LS_PHONE_KEY = "ss.sos.phone";

export default function QuickSOSCallout() {
  const [hasContact, setHasContact] = useState(false);
  useEffect(() => {
    try { setHasContact(!!localStorage.getItem(LS_PHONE_KEY)); } catch {}
  }, []);

  // If already configured, keep it subtle but still visible
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="border-red-200/60 bg-red-50/70 dark:bg-rose-950/20">
          <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600"><Siren className="h-5 w-5"/></div>
              <div>
                <div className="font-semibold text-red-700 dark:text-rose-200">Emergency SOS</div>
                <p className="text-sm text-red-800/90 dark:text-rose-200/90">{hasContact ? "SOS is ready. You can call with one tap." : "Save a trusted contact so SOS can call and share your location."}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="#" onClick={(e)=>{e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="hidden" aria-hidden="true"/>
              <Button onClick={() => (window.location.hash = "#")} className="sm:w-auto"><Phone className="h-4 w-4 mr-2"/>Open SOS</Button>
              {!hasContact && (
                <Button variant="outline" onClick={() => (window.location.hash = "#")} className="sm:w-auto"><Settings2 className="h-4 w-4 mr-2"/>Setup</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

