import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Users } from "lucide-react";
import { Link } from "react-router-dom";

type Geo = { lat: number; lng: number } | null;

async function getLocation(timeoutMs = 10000): Promise<Geo> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    const id = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(id); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(id); resolve(null); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: timeoutMs }
    );
  });
}

export default function NearbyServices() {
  const [opening, setOpening] = useState(false);

  const openMaps = async (query: string) => {
    setOpening(true);
    try {
      const loc = await getLocation(6000);
      let url = "https://www.google.com/maps/search/" + encodeURIComponent(query);
      if (loc) url += `/@${loc.lat},${loc.lng},14z`;
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  };

  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/> Nearby Services</CardTitle>
            <CardDescription>Find support near you using your device location.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => openMaps("legal aid")} disabled={opening}><Navigation className="h-4 w-4 mr-2"/> Legal Aid</Button>
            <Button onClick={() => openMaps("therapy counseling")} disabled={opening} variant="outline"><Navigation className="h-4 w-4 mr-2"/> Therapy</Button>
            <Button onClick={() => openMaps("women shelter")} disabled={opening} variant="outline"><Navigation className="h-4 w-4 mr-2"/> Shelter</Button>
            <Button asChild variant="ghost"><Link to="/support" className="inline-flex items-center"><Users className="h-4 w-4 mr-2"/> Browse Directory</Link></Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

