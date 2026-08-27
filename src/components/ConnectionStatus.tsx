"use client";

import type { ConnectionState } from "@/lib/useEventStream";

const LABEL: Record<ConnectionState, string> = {
  connecting: "CONNECTING",
  live: "LIVE",
  disconnected: "RECONNECTING",
};

const DOT: Record<ConnectionState, string> = {
  connecting: "bg-yellow-500",
  live: "bg-red-500 shadow-[0_0_8px_2px_rgba(255,0,0,0.6)] animate-pulse",
  disconnected: "bg-neutral-700",
};

export default function ConnectionStatus({
  status,
}: {
  status: ConnectionState;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-red-500">
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </div>
  );
}
