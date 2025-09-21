import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Siren, PhoneCall, MapPin, Settings2, Share2, Mail } from "lucide-react";
import supabase from "@/server/supabase";

const LS_PHONE_KEY = "ss.sos.phone";
const LS_ONE_TAP_KEY = "ss.sos.one_tap";
const LS_EMAIL_KEY = "ss.sos.email";

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
  } catch {}
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

function mapsUrl(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function normalizePhoneForTel(phone: string) {
  return phone.trim().replace(/[^+\d]/g, "");
}
function normalizePhoneForWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}
function waUrl(phone: string, text: string) {
  const p = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
function smsHref(phone: string, body: string) {
  return `sms:${normalizePhoneForTel(phone)}?body=${encodeURIComponent(body)}`;
}
function mailtoHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function SOSButton() {
  const [contact, setContact] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [openSetup, setOpenSetup] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [oneTap, setOneTap] = useState(false);

  useEffect(() => {
    const savedPhone = readLS(LS_PHONE_KEY) || "";
    const savedEmail = readLS(LS_EMAIL_KEY) || "";
    setContact(savedPhone);
    setContactEmail(savedEmail);
    const savedOneTap = readLS(LS_ONE_TAP_KEY);
    const mobileDefault = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
    setOneTap(savedOneTap == null ? mobileDefault : savedOneTap === "1");

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("community_members")
          .select("sos_contact_phone,sos_contact_email,sos_one_tap")
          .eq("user_id", uid)
          .maybeSingle<{
            sos_contact_phone: string | null;
            sos_contact_email: string | null;
            sos_one_tap: boolean | null;
          }>();
        if (data?.sos_contact_phone) {
          setContact(data.sos_contact_phone);
          writeLS(LS_PHONE_KEY, data.sos_contact_phone);
        }
        if (data?.sos_contact_email) {
          setContactEmail(data.sos_contact_email);
          writeLS(LS_EMAIL_KEY, data.sos_contact_email);
        }
        if (data?.sos_one_tap != null) {
          setOneTap(Boolean(data.sos_one_tap));
          writeLS(LS_ONE_TAP_KEY, data.sos_one_tap ? "1" : "0");
        }
      } catch {}
    })();
  }, []);

  const normalized = useMemo(() => contact.trim(), [contact]);

  const handleSave = async () => {
    const cleaned = normalizePhoneForTel(normalized);
    if (!cleaned || cleaned.length < 7) {
      toast.error("Enter a valid phone number (include country code).");
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      writeLS(LS_PHONE_KEY, cleaned);
      writeLS(LS_ONE_TAP_KEY, oneTap ? "1" : "0");
      if (contactEmail) {
        writeLS(LS_EMAIL_KEY, contactEmail.trim());
      } else {
        try { localStorage.removeItem(LS_EMAIL_KEY); } catch {}
      }

      setContact(cleaned);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { error } = await supabase
          .from("community_members")
          .update({
            sos_contact_phone: cleaned,
            sos_contact_email: contactEmail?.trim() || null,
            sos_one_tap: oneTap,
          })
          .eq("user_id", uid);
        if (error) throw error;
      }

      toast.success("Emergency contact saved.");
      setOpenSetup(false);
      setOpenConfirm(true);
    } catch (err) {
      console.error("Failed to save emergency contact", err);
      toast.error("Could not save emergency contact. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const buildMessage = (loc: Geo) => {
    const base = "Emergency SOS - I need help.";
    if (loc) return `${base}\nMy location: ${mapsUrl(loc.lat, loc.lng)}`;
    return `${base}\nLocation unavailable (permission denied or timeout).`;
  };

  const doSendActions = (msg: string) => {
    try { if (contact) window.open(waUrl(contact, msg), "_blank"); } catch {}
    try { if (contactEmail) window.open(mailtoHref(contactEmail, "Emergency SOS", msg), "_blank"); } catch {}
    try { if (contact) window.open(smsHref(contact, msg), "_blank"); } catch {}
    if (contact) window.location.href = `tel:${normalizePhoneForTel(contact)}`;
  };

  const handleClick = async () => {
    if (!normalized) {
      setOpenSetup(true);
      return;
    }
    if (oneTap) {
      try {
        const loc = await getLocation(5000);
        const msg = buildMessage(loc);
        doSendActions(msg);
        toast.success("SOS: calling and sending messages");
      } catch {
        if (contact) window.location.href = `tel:${normalizePhoneForTel(contact)}`;
      }
    } else {
      setOpenConfirm(true);
    }
  };

  const handleSendSOS = async () => {
    setSending(true);
    try {
      const loc = await getLocation();
      const msg = buildMessage(loc);
      doSendActions(msg);
      toast.success("SOS initiated: calling and sending messages");
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
              <span>Phone: {normalized || "Not set"}</span>
              <button className="ml-auto text-xs underline" onClick={() => { setOpenConfirm(false); setOpenSetup(true); }}>
                Change
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Email: {contactEmail || "Not set"}</span>
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
              Enter the phone and email to notify when you press SOS.
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
            <Label htmlFor="sosEmail" className="mt-2">Email address (optional)</Label>
            <Input
              id="sosEmail"
              type="email"
              placeholder="e.g. helper@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="oneTap"
                checked={oneTap}
                onCheckedChange={(val) => setOneTap(Boolean(val))}
              />
              <Label htmlFor="oneTap" className="text-sm">
                One-tap SOS (call immediately)
              </Label>
            </div>
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
