"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "geopulse:watchlist";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    setWatchlist(load());
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setWatchlist(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback(
    (country: string) => {
      const next = new Set(watchlist);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      persist(next);
    },
    [watchlist, persist],
  );

  return { watchlist, toggle };
}
