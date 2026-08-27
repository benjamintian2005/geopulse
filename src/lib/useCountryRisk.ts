"use client";

import { useEffect, useState } from "react";

export interface CountryRiskScore {
  country: string;
  score: number;
  eventCount: number;
  lastEventAt: string;
}

const POLL_INTERVAL_MS = 60_000;

export function useCountryRisk() {
  const [scores, setScores] = useState<CountryRiskScore[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/risk");
        const data = await res.json();
        if (!cancelled) setScores(data.scores ?? []);
      } catch {
        // keep last known scores on transient failure
      }
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return scores;
}
