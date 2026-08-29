"use client";

import type { ForexResponse } from "@/lib/dataLayerTypes";

interface ForexPanelProps {
  data: ForexResponse | null;
}

export default function ForexPanel({ data }: ForexPanelProps) {
  const rates = data?.rates ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        <h2 className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-red-500">
          Forex
        </h2>
        <p className="mb-3 font-mono text-[10px] text-red-800">
          USD vs. major and geopolitically exposed currencies — Frankfurter / ECB
        </p>

        {rates.length === 0 && (
          <p className="p-1 font-mono text-xs text-neutral-600">
            Loading live rates…
          </p>
        )}

        {rates.map((r) => {
          const up = r.changePct >= 0;
          return (
            <div
              key={r.pair}
              className="mb-1.5 flex items-center justify-between gap-3 rounded border border-neutral-800 px-3 py-2"
            >
              <span className="font-mono text-xs text-red-300">{r.pair}</span>
              <span className="font-mono text-xs text-neutral-300">
                {r.rate < 1 ? r.rate.toFixed(4) : r.rate.toFixed(2)}
              </span>
              <span
                className={`w-16 shrink-0 text-right font-mono text-[11px] ${
                  up ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {up ? "+" : ""}
                {r.changePct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
