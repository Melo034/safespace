import { useCallback, useEffect, useMemo, useState } from "react";

export type Frequency = "realtime" | "daily" | "weekly" | "off";

export type Preferences = {
  safety: {
    sosContact: string;
    oneTapSOS: boolean;
    instructionsAcknowledged: boolean;
  };
  privacy: {
    anonymityDefault: boolean;
    contentWarnings: "show" | "hide";
  };
  notifications: {
    email: boolean;
    sms: boolean;
    frequency: Frequency;
    incidentUpdates: boolean;
  };
};

const KEY = "ss.prefs";

const DEFAULTS: Preferences = {
  safety: {
    sosContact: "",
    oneTapSOS: true,
    instructionsAcknowledged: false,
  },
  privacy: {
    anonymityDefault: true,
    contentWarnings: "show",
  },
  notifications: {
    email: true,
    sms: false,
    frequency: "weekly",
    incidentUpdates: true,
  },
};

function read(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULTS, ...parsed, safety: { ...DEFAULTS.safety, ...(parsed.safety || {}) }, privacy: { ...DEFAULTS.privacy, ...(parsed.privacy || {}) }, notifications: { ...DEFAULTS.notifications, ...(parsed.notifications || {}) } };
  } catch {
    return DEFAULTS;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const setSafety = useCallback((patch: Partial<Preferences["safety"]>) => setPrefs((p) => ({ ...p, safety: { ...p.safety, ...patch } })), []);
  const setPrivacy = useCallback((patch: Partial<Preferences["privacy"]>) => setPrefs((p) => ({ ...p, privacy: { ...p.privacy, ...patch } })), []);
  const setNotifications = useCallback((patch: Partial<Preferences["notifications"]>) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, ...patch } })), []);

  return useMemo(() => ({ prefs, setPrefs, setSafety, setPrivacy, setNotifications }), [prefs, setSafety, setPrivacy, setNotifications]);
}

