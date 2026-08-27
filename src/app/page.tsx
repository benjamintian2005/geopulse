"use client";

import { useMemo, useState } from "react";
import GlobeView from "@/components/Globe";
import FeedPanel from "@/components/FeedPanel";
import CategoryFilter from "@/components/CategoryFilter";
import ConnectionStatus from "@/components/ConnectionStatus";
import AlertToast from "@/components/AlertToast";
import { useEventStream } from "@/lib/useEventStream";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { GeoEvent } from "@/lib/types";

export default function Home() {
  const { events, status, incoming, dismissIncoming } = useEventStream();
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(CATEGORIES),
  );
  const [selected, setSelected] = useState<GeoEvent | null>(null);

  const filtered = useMemo(
    () => events.filter((e) => activeCategories.has(e.category as Category)),
    [events, activeCategories],
  );

  const toggleCategory = (cat: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-black">
      <div className="absolute inset-0">
        <GlobeView
          events={filtered}
          onSelect={setSelected}
          flyToId={selected?.id ?? null}
        />
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto">
          <h1 className="font-mono text-lg font-bold tracking-[0.3em] text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]">
            GEOPULSE
          </h1>
          <p className="font-mono text-[10px] tracking-widest text-red-800">
            LIVE GEOPOLITICAL SIGNAL MAP
          </p>
          <div className="mt-2">
            <CategoryFilter active={activeCategories} onToggle={toggleCategory} />
          </div>
        </div>
        <div className="pointer-events-auto">
          <ConnectionStatus status={status} />
        </div>
      </div>

      {/* Incoming alert toasts */}
      <div className="pointer-events-none absolute right-4 top-24 z-20 flex w-80 flex-col gap-2">
        {incoming.slice(-4).map((event) => (
          <AlertToast
            key={event.id}
            event={event}
            onDismiss={() => dismissIncoming(event.id)}
            onFocus={() => {
              setSelected(event);
              dismissIncoming(event.id);
            }}
          />
        ))}
      </div>

      {/* Sidebar feed */}
      <div className="absolute bottom-0 right-0 top-0 z-10 w-96 border-l border-red-950 bg-black/85 backdrop-blur-sm">
        <FeedPanel
          events={filtered}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}
