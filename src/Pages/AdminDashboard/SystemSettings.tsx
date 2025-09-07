// SystemSettings.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/server/supabase";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Lock, Bell, Globe, Save } from "lucide-react";
import type { Settings } from "@/lib/types";
import { z } from "zod";
import AdminHeader from "@/components/admin/AdminHeader";

/* ----------------------------- Types & Schemas ---------------------------- */

type Language = "en" | "es" | "fr" | "de";
type SettingsRow = Settings & { id: string };

const numberSchema = z.number().int().min(0, "Value must be a positive integer");
const sessionTimeoutSchema = numberSchema
  .min(5, "Session timeout must be at least 5 minutes")
  .max(120, "Session timeout cannot exceed 120 minutes");
const apiRateLimitSchema = numberSchema
  .min(100, "API rate limit must be at least 100 requests/hour")
  .max(10000, "API rate limit cannot exceed 10000 requests/hour");
const maxFileSizeSchema = numberSchema
  .min(1, "Max file size must be at least 1 MB")
  .max(100, "Max file size cannot exceed 100 MB");

/* ------------------------------- Defaults -------------------------------- */

const DEFAULT_SETTINGS: Settings = {
  notifications: { email: true, sms: false, push: true },
  system: { maintenance_mode: false, api_rate_limit: 1000, max_file_size: 10 },
  security: { two_factor_auth: true, session_timeout: 30 },
  language: "en",
};

/* --------------------------------- Page ---------------------------------- */

const SystemSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    try {

      // prefer maybeSingle: null when no row
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const s = data as Settings;
        setSettings(s);
        setInitialSettings(s);
      } else {
        const defaultsRow: SettingsRow = { id: "global", ...DEFAULT_SETTINGS };
        const { data: inserted, error: insertErr } = await supabase
          .from("settings")
          .insert(defaultsRow)
          .select()
          .single();
        if (insertErr) throw insertErr;
        const s = (inserted as SettingsRow) as Settings;
        setSettings(s);
        setInitialSettings(s);
      }
    } catch (err: unknown) {
      console.error("Error fetching settings:", err);
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message?: string }).message
          : "Failed to load settings.";
      toast.error(errorMessage);
    }
  }, []); // no deps -> stable

  useEffect(() => {
    fetchSettings();

    const subscription = supabase
      .channel("settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: "id=eq.global" },
        (payload) => {
          if (payload.new) {
            const data = payload.new as Settings;
            setSettings(data);
            setInitialSettings(data);
          }
        }
      )
      .subscribe((_status, error) => {
        if (error) {
          console.error("Error in settings subscription:", error);
          toast.error("Failed to update settings in real-time.");
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchSettings]); // fetchSettings is stable, effect runs once

  const handleInputChange = (
    category: keyof Settings,
    field: string,
    value: boolean | number | string
  ) => {
    setErrors((prev) => ({ ...prev, [`${category}.${field}`]: "" }));

    if (typeof value === "number") {
      let schema: z.ZodType<number> | undefined;
      if (category === "security" && field === "session_timeout") schema = sessionTimeoutSchema;
      if (category === "system" && field === "api_rate_limit") schema = apiRateLimitSchema;
      if (category === "system" && field === "max_file_size") schema = maxFileSizeSchema;

      if (schema) {
        const result = schema.safeParse(value);
        if (!result.success) {
          setErrors((prev) => ({
            ...prev,
            [`${category}.${field}`]: result.error.flatten().formErrors[0],
          }));
          return;
        }
      }
    }

    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as object),
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    if (Object.values(errors).some(Boolean)) {
      toast.error("Please fix all errors before saving.");
      return;
    }

    try {
      setSaving(true);
      // persist
      const row: SettingsRow = { id: "global", ...settings };
      const { error } = await supabase.from("settings").upsert(row);
      if (error) throw error;
      toast.success("Settings saved successfully.");
      setInitialSettings(settings);
    } catch (err: unknown) {
      console.error("Error saving settings:", err);
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message?: string }).message
          : "Failed to save settings.";
      if (errorCode === "42501") {
        toast.error("You lack permission to save settings.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings]
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "System Settings" },
          ]}
        />

        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">Configure platform settings and preferences</p>
          </div>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" aria-hidden="true" />
                Notifications
              </CardTitle>
              <CardDescription>Manage notification preferences for users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => handleInputChange("notifications", "email", checked)}
                  aria-label="Toggle email notifications"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <Switch
                  id="sms-notifications"
                  checked={settings.notifications.sms}
                  onCheckedChange={(checked) => handleInputChange("notifications", "sms", checked)}
                  aria-label="Toggle SMS notifications"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => handleInputChange("notifications", "push", checked)}
                  aria-label="Toggle push notifications"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" aria-hidden="true" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and authentication options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="two-factor-auth">Two-Factor Authentication</Label>
                <Switch
                  id="two-factor-auth"
                  checked={settings.security.two_factor_auth}
                  onCheckedChange={(checked) => handleInputChange("security", "two_factor_auth", checked)}
                  aria-label="Toggle two-factor authentication"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={settings.security.session_timeout}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (!isNaN(value)) handleInputChange("security", "session_timeout", value);
                  }}
                  min={5}
                  max={120}
                  aria-invalid={!!errors["security.session_timeout"]}
                  aria-describedby={errors["security.session_timeout"] ? "session-timeout-error" : undefined}
                />
                {errors["security.session_timeout"] && (
                  <p id="session-timeout-error" className="text-sm text-red-500">
                    {errors["security.session_timeout"]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" aria-hidden="true" />
                System Settings
              </CardTitle>
              <CardDescription>Manage platform-wide system configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <Switch
                  id="maintenance-mode"
                  checked={settings.system.maintenance_mode}
                  onCheckedChange={(checked) => handleInputChange("system", "maintenance_mode", checked)}
                  aria-label="Toggle maintenance mode"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-rate-limit">API Rate Limit (requests/hour)</Label>
                <Input
                  id="api-rate-limit"
                  type="number"
                  value={settings.system.api_rate_limit}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (!isNaN(value)) handleInputChange("system", "api_rate_limit", value);
                  }}
                  min={100}
                  max={10000}
                  aria-invalid={!!errors["system.api_rate_limit"]}
                  aria-describedby={errors["system.api_rate_limit"] ? "api-rate-limit-error" : undefined}
                />
                {errors["system.api_rate_limit"] && (
                  <p id="api-rate-limit-error" className="text-sm text-red-500">
                    {errors["system.api_rate_limit"]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                <Input
                  id="max-file-size"
                  type="number"
                  value={settings.system.max_file_size}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (!isNaN(value)) handleInputChange("system", "max_file_size", value);
                  }}
                  min={1}
                  max={100}
                  aria-invalid={!!errors["system.max_file_size"]}
                  aria-describedby={errors["system.max_file_size"] ? "max-file-size-error" : undefined}
                />
                {errors["system.max_file_size"] && (
                  <p id="max-file-size-error" className="text-sm text-red-500">
                    {errors["system.max_file_size"]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" aria-hidden="true" />
                Language
              </CardTitle>
              <CardDescription>Select the default platform language</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.language}
                onValueChange={(value: Language) => setSettings({ ...settings, language: value })}
                aria-label="Select default language"
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setSettings(initialSettings || settings)}
              disabled={!hasChanges || saving}
              aria-label="Reset changes"
            >
              Reset
            </Button>
            <Button onClick={handleSaveSettings} disabled={!hasChanges || saving} aria-label={saving ? "Saving settings" : "Save settings"}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default SystemSettings;
