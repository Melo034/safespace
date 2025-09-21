import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";
import { Shield, Bell, EyeOff, Download } from "lucide-react";
import Sidebar from "../Components/Sidebar";
import supabase from "@/server/supabase";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Settings() {
  const { prefs, setSafety, setPrivacy, setNotifications } = usePreferences();
  const [sosPhone, setSosPhone] = useState("");
  const [sosEmail, setSosEmail] = useState("");
  const [oneTap, setOneTap] = useState<boolean>(false);
  const [savingSafety, setSavingSafety] = useState(false);

  // hydrate from DB/local on mount
  useEffect(() => {
    // seed from preferences/local
    setSosPhone(prefs.safety.sosContact || "");
    setOneTap(prefs.safety.oneTapSOS);
    try {
      const fromLS = localStorage.getItem("ss.sos.email");
      if (fromLS) setSosEmail(fromLS);
    } catch {}

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("community_members")
          .select("sos_contact_phone,sos_contact_email,sos_one_tap")
          .eq("user_id", uid)
          .maybeSingle<{ sos_contact_phone: string | null; sos_contact_email: string | null; sos_one_tap: boolean | null }>();
        if (data?.sos_contact_phone) setSosPhone(data.sos_contact_phone);
        if (data?.sos_contact_email) setSosEmail(data.sos_contact_email);
        if (typeof data?.sos_one_tap === "boolean") setOneTap(Boolean(data.sos_one_tap));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSafety = async () => {
    const cleanedPhone = sosPhone.trim().replace(/[^+\d]/g, "");
    if (!cleanedPhone || cleanedPhone.length < 7) {
      toast.error("Enter a valid phone number (include country code).");
      return;
    }

    if (sosEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sosEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setSavingSafety(true);
    try {
      setSafety({ sosContact: cleanedPhone, oneTapSOS: oneTap });

      try {
        localStorage.setItem("ss.sos.phone", cleanedPhone);
        localStorage.setItem("ss.sos.one_tap", oneTap ? "1" : "0");
        if (sosEmail) {
          localStorage.setItem("ss.sos.email", sosEmail.trim());
        } else {
          localStorage.removeItem("ss.sos.email");
        }
      } catch (lsErr) {
        console.warn("Failed to persist SOS settings locally", lsErr);
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { error } = await supabase
          .from("community_members")
          .update({
            sos_contact_phone: cleanedPhone,
            sos_contact_email: sosEmail?.trim() || null,
            sos_one_tap: oneTap,
          })
          .eq("user_id", uid);
        if (error) throw error;
      }

      toast.success("Emergency contact saved.");
    } catch (err) {
      console.error("Failed to save SOS settings", err);
      toast.error("Could not save SOS settings. Please try again.");
    } finally {
      setSavingSafety(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <div className="space-y-6">
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/> Safety</CardTitle>
              <CardDescription>Manage SOS contact and emergency options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sosPhone">SOS Phone</Label>
                  <Input id="sosPhone" value={sosPhone} onChange={(e) => setSosPhone(e.target.value)} placeholder="+1234567890" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sosEmail">SOS Email (optional)</Label>
                  <Input id="sosEmail" type="email" value={sosEmail} onChange={(e) => setSosEmail(e.target.value)} placeholder="helper@example.com" />
                </div>
                <div className="md:col-span-2 flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">One-tap SOS</p>
                    <p className="text-xs text-muted-foreground">Enable quick SOS without confirmation</p>
                  </div>
                  <Switch checked={oneTap} onCheckedChange={(v) => setOneTap(Boolean(v))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSafety} disabled={savingSafety}>Save Safety</Button>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Emergency instructions: If you're in danger, use the Quick Exit button (top right) or call your local emergency services.
              </div>
            </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><EyeOff className="h-5 w-5"/> Privacy</CardTitle>
                <CardDescription>Control anonymity and content warnings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">Anonymity default</p>
                    <p className="text-xs text-muted-foreground">New stories default to anonymous</p>
                  </div>
                  <Switch checked={prefs.privacy.anonymityDefault} onCheckedChange={(v) => setPrivacy({ anonymityDefault: v })} />
                </div>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div>
                    <Label>Content warnings</Label>
                    <p className="text-xs text-muted-foreground">Show content warnings above stories</p>
                  </div>
                  <Select value={prefs.privacy.contentWarnings} onValueChange={(v) => setPrivacy({ contentWarnings: v as "show"|"hide" })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">Show</SelectItem>
                      <SelectItem value="hide">Hide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/> Export my data</Button>
                  <Button variant="destructive" size="sm">Delete my account</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Notifications</CardTitle>
                <CardDescription>Choose channels and frequency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">Updates via email</p>
                    </div>
                    <Switch checked={prefs.notifications.email} onCheckedChange={(v) => setNotifications({ email: v })} />
                  </div>
                  <div className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="text-sm font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">Text message alerts</p>
                    </div>
                    <Switch checked={prefs.notifications.sms} onCheckedChange={(v) => setNotifications({ sms: v })} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div>
                    <Label>Frequency</Label>
                    <p className="text-xs text-muted-foreground">How often to receive digests</p>
                  </div>
                  <Select value={prefs.notifications.frequency} onValueChange={(v) => setNotifications({ frequency: v as any })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">Incident updates</p>
                    <p className="text-xs text-muted-foreground">Get notified about incidents you follow</p>
                  </div>
                  <Switch checked={prefs.notifications.incidentUpdates} onCheckedChange={(v) => setNotifications({ incidentUpdates: v })} />
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
