"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoEvent } from "@/lib/types";

export type ConnectionState = "connecting" | "live" | "disconnected";

export function useEventStream() {
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [incoming, setIncoming] = useState<GeoEvent[]>([]);
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.addEventListener("backfill", (e) => {
      const rows = JSON.parse((e as MessageEvent).data) as GeoEvent[];
      for (const r of rows) seenIds.current.add(r.id);
      setEvents(rows);
      setStatus("live");
    });

    source.addEventListener("event", (e) => {
      const row = JSON.parse((e as MessageEvent).data) as GeoEvent;
      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setEvents((prev) => [...prev, row]);
      setIncoming((prev) => [...prev, row]);
      setStatus("live");
    });

    source.addEventListener("ping", () => setStatus("live"));

    source.onerror = () => setStatus("disconnected");
    source.onopen = () => setStatus("live");

    return () => source.close();
  }, []);

  const dismissIncoming = (id: number) => {
    setIncoming((prev) => prev.filter((e) => e.id !== id));
  };

  return { events, status, incoming, dismissIncoming };
}
