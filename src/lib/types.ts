import type { EventRow } from "@/db/schema";

export type GeoEvent = EventRow;

export function isGeoEvent(value: unknown): value is GeoEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "lat" in value &&
    "lon" in value
  );
}
