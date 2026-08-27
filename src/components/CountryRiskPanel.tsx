"use client";

import { useEffect, useState } from "react";
import { useWatchlist } from "@/lib/useWatchlist";
import type { CountryRiskScore } from "@/lib/useCountryRisk";

interface CountryRiskEvent {
  id: number;
  title: string;
  summary: string;
  url: string;
  source: string;
  severity: number;
  publishedAt: string;
  weight: number;
}

interface CountryRiskPanelProps {
  scores: CountryRiskScore[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
}

const regionNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CountryRiskPanel({
  scores,
  selectedCountry,
  onSelectCountry,
}: CountryRiskPanelProps) {
  const [provenance, setProvenance] = useState<CountryRiskEvent[]>([]);
  const [loadingProvenance, setLoadingProvenance] = useState(false);
  const { watchlist, toggle } = useWatchlist();

  useEffect(() => {
    if (!selectedCountry) {
      setProvenance([]);
      return;
    }
    let cancelled = false;
    setLoadingProvenance(true);
    fetch(`/api/risk?country=${selectedCountry}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setProvenance(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setProvenance([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvenance(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  // Selecting a country with no current score (e.g. clicked on the globe
  // with no recent events) still gets a row, so it stays visible/expandable.
  const selectedHasScore =
    selectedCountry && scores.some((s) => s.country === selectedCountry);
  const rows: (CountryRiskScore | { country: string; placeholder: true })[] =
    selectedCountry && !selectedHasScore
      ? [{ country: selectedCountry, placeholder: true }, ...scores]
      : scores;

  const ranked = [...rows].sort((a, b) => {
    const aWatched = watchlist.has(a.country);
    const bWatched = watchlist.has(b.country);
    if (aWatched !== bWatched) return aWatched ? -1 : 1;
    const aScore = "score" in a ? a.score : -1;
    const bScore = "score" in b ? b.score : -1;
    return bScore - aScore;
  });

  const maxScore = Math.max(...scores.map((r) => r.score), 1);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-red-900/50 px-4 py-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-red-500">
          Country Risk
        </h2>
        <p className="mt-0.5 font-mono text-[10px] text-red-800">
          decayed severity, {scores.length} countries active
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {ranked.length === 0 && (
          <p className="p-4 font-mono text-xs text-neutral-600">
            No scored countries yet… click any country on the globe.
          </p>
        )}
        {ranked.map((r) => {
          const isWatched = watchlist.has(r.country);
          const isExpanded = selectedCountry === r.country;
          const isPlaceholder = "placeholder" in r;
          const score = "score" in r ? r.score : 0;
          return (
            <div key={r.country} className="border-b border-red-950">
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => toggle(r.country)}
                  aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                  className={`font-mono text-sm ${
                    isWatched ? "text-red-500" : "text-neutral-700 hover:text-red-700"
                  }`}
                >
                  {isWatched ? "★" : "☆"}
                </button>
                <button
                  onClick={() =>
                    onSelectCountry(isExpanded ? null : r.country)
                  }
                  className="flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-red-300">
                      {countryName(r.country)}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-600">
                      {isPlaceholder
                        ? "no recent events"
                        : `${r.eventCount} events · ${timeAgo(r.lastEventAt)}`}
                    </span>
                  </div>
                  {!isPlaceholder && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-red-950">
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${(score / maxScore) * 100}%` }}
                      />
                    </div>
                  )}
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-red-950/70 bg-black/40 px-4 py-2">
                  {loadingProvenance && (
                    <p className="font-mono text-[10px] text-neutral-600">
                      loading source events…
                    </p>
                  )}
                  {!loadingProvenance && provenance.length === 0 && (
                    <p className="font-mono text-[10px] text-neutral-600">
                      No tracked events for this country in the last 30 days.
                      Historical country risk ratings compiled over time are
                      coming soon.
                    </p>
                  )}
                  {!loadingProvenance &&
                    provenance.map((e) => (
                      <a
                        key={e.id}
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block border-b border-red-950/50 py-1.5 last:border-b-0 hover:bg-red-950/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-red-700">
                            {e.source} · sev {e.severity}
                          </span>
                          <span className="font-mono text-[9px] text-neutral-600">
                            {timeAgo(e.publishedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-300">
                          {e.summary}
                        </p>
                      </a>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
