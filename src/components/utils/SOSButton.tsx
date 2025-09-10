import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Siren, PhoneCall, MapPin, Settings2, Share2 } from "lucide-react";

const LS_PHONE_KEY = "ss.sos.phone";

function readLS(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // Intentionally ignore localStorage errors
  }
}

type Geo = { lat: number; lng: number; accuracy?: number } | null;

async function getLocation(timeoutMs = 10000): Promise<Geo> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    const id = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(id);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {
        clearTimeout(id);
        resolve(null);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: timeoutMs }
    );
  });
}

function smsHref(phone: string, body: string) {
  // Try common variants; many devices accept `sms:number?body=...`
  const enc = encodeURIComponent(body);
  // Prefer format with number
  return `sms:${phone}?body=${enc}`;
}

function mapsUrl(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export default function SOSButton() {
  const [contact, setContact] = useState<string>("");
  const [openSetup, setOpenSetup] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const saved = readLS(LS_PHONE_KEY) || "";
    setContact(saved);
  }, []);

  const normalized = useMemo(() => contact.trim(), [contact]);

  const handleSave = () => {
    const cleaned = normalized.replace(/[^+\d]/g, "");
    if (!cleaned || cleaned.length < 7) {
      toast.error("Enter a valid phone number (include country code if possible).");
      return;
    }
    setSaving(true);
    try {
      writeLS(LS_PHONE_KEY, cleaned);
      setContact(cleaned);
      toast.success("Emergency contact saved.");
      setOpenSetup(false);
      setOpenConfirm(true);
    } finally {
      setSaving(false);
    }
  };

  const handleClick = () => {
    if (!normalized) {
      setOpenSetup(true);
    } else {
      setOpenConfirm(true);
    }
  };

  const handleSendSOS = async () => {
    if (!normalized) {
      setOpenConfirm(false);
      setOpenSetup(true);
      return;
    }

    setSending(true);
    try {
      const loc = await getLocation();
      let msg = "Emergency SOS — I need help.";
      if (loc) {
        const url = mapsUrl(loc.lat, loc.lng);
        msg += `\nMy location: ${url}`;
      } else {
        msg += "\nLocation unavailable (permission denied or timeout).";
      }

      // Prefer native share first (lets user choose app, e.g., Messages/WhatsApp)
      try {
        if (navigator.share) {
          await navigator.share({ title: "SOS — Safespace", text: msg });
        } else {
          // Fallback to SMS deep link with body
          window.location.href = smsHref(normalized, msg);
        }
      } catch {
        // If share fails or is cancelled, try SMS link
        window.location.href = smsHref(normalized, msg);
      }

      // Then initiate the phone call
      window.setTimeout(() => {
        window.location.href = `tel:${normalized}`;
      }, 250);

      toast.success("SOS initiated — calling and sharing location");
      setOpenConfirm(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating SOS */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
        <Button
          onClick={handleClick}
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg ring-2 ring-red-300 text-white"
          aria-label="Send SOS"
        >
          <Siren className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          className="hidden sm:flex h-12 items-center gap-2"
          onClick={() => setOpenSetup(true)}
          aria-label="Configure SOS contact"
        >
          <Settings2 className="h-4 w-4" />
          <span>Setup</span>
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Emergency SOS</DialogTitle>
            <DialogDescription>
              This will share your current location and call your emergency contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PhoneCall className="h-4 w-4" />
              <span>Contact: {normalized || "Not set"}</span>
              <button className="ml-auto text-xs underline" onClick={() => { setOpenConfirm(false); setOpenSetup(true); }}>
                Change
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>We’ll request location permission</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenConfirm(false)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSendSOS} disabled={sending || !normalized}>
              {sending ? "Sending..." : (
                <span className="inline-flex items-center gap-2"><Share2 className="h-4 w-4" /> Send SOS</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={openSetup} onOpenChange={setOpenSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Emergency Contact</DialogTitle>
            <DialogDescription>
              Enter the phone number to call and message when you press SOS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sosPhone">Phone number</Label>
            <Input
              id="sosPhone"
              inputMode="tel"
              placeholder="e.g. +233 55 123 4567"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenSetup(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

