import { useCallback, useEffect, useMemo, useState } from "react";

type Saved = {
  stories: string[];
  resources: string[];
  support: string[];
};

const KEY = "ss.saved";
const DEF: Saved = { stories: [], resources: [], support: [] };

function read(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEF;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return { stories: parsed.stories || [], resources: parsed.resources || [], support: parsed.support || [] };
  } catch {
    return DEF;
  }
}

export function useSavedItems() {
  const [saved, setSaved] = useState<Saved>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, [saved]);

  const toggle = useCallback((bucket: keyof Saved, id: string) => {
    setSaved((s) => {
      const exists = s[bucket].includes(id);
      const next = exists ? s[bucket].filter((x) => x !== id) : [...s[bucket], id];
      return { ...s, [bucket]: next } as Saved;
    });
  }, []);

  const isSaved = useCallback((bucket: keyof Saved, id: string) => saved[bucket].includes(id), [saved]);

  return useMemo(() => ({ saved, toggle, isSaved }), [saved, toggle, isSaved]);
}

