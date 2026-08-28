"use client";

import { useMemo, useState } from "react";
import GlobeView from "@/components/Globe";
import FeedPanel from "@/components/FeedPanel";
import CategoryFilter from "@/components/CategoryFilter";
import ConnectionStatus from "@/components/ConnectionStatus";
import AlertToast from "@/components/AlertToast";
import CountryRiskPanel from "@/components/CountryRiskPanel";
import { useEventStream } from "@/lib/useEventStream";
import { useCountryRisk } from "@/lib/useCountryRisk";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { GeoEvent } from "@/lib/types";

type MobilePanel = "feed" | "risk" | null;

export default function Home() {
  const { events, status, incoming, dismissIncoming } = useEventStream();
  const countryScores = useCountryRisk();
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(CATEGORIES),
  );
  const [selected, setSelected] = useState<GeoEvent | null>(null);
  const [showRiskPanel, setShowRiskPanel] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

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
          onSelect={(event) => {
            setSelected(event);
            setMobilePanel(null);
          }}
          flyToId={selected?.id ?? null}
          countryScores={countryScores}
          selectedCountry={selectedCountry}
          onCountryClick={(country) => {
            setSelectedCountry(country);
            setShowRiskPanel(true);
            setMobilePanel("risk");
          }}
        />
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3 sm:gap-4 sm:p-4">
        <div className="pointer-events-auto min-w-0">
          <h1 className="font-mono text-base font-bold tracking-[0.2em] text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)] sm:text-lg sm:tracking-[0.3em]">
            GEOPULSE
          </h1>
          <p className="font-mono text-[9px] tracking-widest text-red-800 sm:text-[10px]">
            LIVE GEOPOLITICAL SIGNAL MAP
          </p>
          <div className="mt-2 -ml-1 max-w-[calc(100vw-1.5rem)] overflow-x-auto pl-1 pb-1 sm:max-w-none sm:overflow-visible">
            <CategoryFilter active={activeCategories} onToggle={toggleCategory} />
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowRiskPanel((v) => !v)}
            className={`hidden rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition lg:block ${
              showRiskPanel
                ? "border-red-500 bg-red-950/60 text-red-300 shadow-[0_0_8px_rgba(255,0,0,0.3)]"
                : "border-neutral-800 text-neutral-600 hover:border-red-900 hover:text-red-700"
            }`}
          >
            Country Risk
          </button>
          <ConnectionStatus status={status} />
        </div>
      </div>

      {/* Incoming alert toasts */}
      <div className="pointer-events-none absolute inset-x-3 top-24 z-20 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80">
        {incoming.slice(-4).map((event) => (
          <AlertToast
            key={event.id}
            event={event}
            onDismiss={() => dismissIncoming(event.id)}
            onFocus={() => {
              setSelected(event);
              dismissIncoming(event.id);
              setMobilePanel(null);
            }}
          />
        ))}
      </div>

      {/* Desktop sidebar feed */}
      <div className="absolute bottom-0 right-0 top-0 z-10 hidden w-96 border-l border-red-950 bg-black/85 backdrop-blur-sm lg:block">
        <FeedPanel
          events={filtered}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      {/* Desktop country risk sidebar */}
      {showRiskPanel && (
        <div className="absolute bottom-0 left-0 top-0 z-10 hidden w-80 border-r border-red-950 bg-black/85 backdrop-blur-sm lg:block">
          <CountryRiskPanel
            scores={countryScores}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </div>
      )}

      {/* Mobile bottom-sheet panel */}
      {mobilePanel && (
        <div className="absolute inset-x-0 bottom-14 top-24 z-20 rounded-t-xl border-t border-red-950 bg-black/95 backdrop-blur-sm lg:hidden">
          {mobilePanel === "feed" ? (
            <FeedPanel
              events={filtered}
              selectedId={selected?.id ?? null}
              onSelect={(event) => {
                setSelected(event);
                setMobilePanel(null);
              }}
            />
          ) : (
            <CountryRiskPanel
              scores={countryScores}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          )}
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-14 border-t border-red-950 bg-black/95 backdrop-blur-sm lg:hidden">
        <button
          onClick={() =>
            setMobilePanel((p) => (p === "risk" ? null : "risk"))
          }
          className={`flex flex-1 items-center justify-center font-mono text-xs uppercase tracking-wider transition ${
            mobilePanel === "risk" ? "text-red-400" : "text-neutral-500"
          }`}
        >
          Country Risk
        </button>
        <div className="w-px bg-red-950" />
        <button
          onClick={() =>
            setMobilePanel((p) => (p === "feed" ? null : "feed"))
          }
          className={`flex flex-1 items-center justify-center font-mono text-xs uppercase tracking-wider transition ${
            mobilePanel === "feed" ? "text-red-400" : "text-neutral-500"
          }`}
        >
          Live Feed{" "}
          {filtered.length > 0 && (
            <span className="ml-1 text-red-700">({filtered.length})</span>
          )}
        </button>
      </div>
    </div>
  );
}
