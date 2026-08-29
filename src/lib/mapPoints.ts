import type { TrackedAircraft } from "@/lib/sources/adsblol";
import type { WeatherSnapshot } from "@/lib/sources/openmeteo";

// A point rendered on the globe that isn't a geopolitical GeoEvent — the
// `kind` discriminant is how Globe.tsx tells these apart from events sharing
// the same pointsData array (globe.gl only supports one points layer, so we
// merge rather than add a second layer).
export interface ExtraMapPoint {
  kind: "flight" | "commercial-flight" | "weather";
  id: string;
  lat: number;
  lon: number;
  color: string;
  radius: number;
  label: string;
}

const FLIGHT_COLOR = "#38bdf8"; // sky blue — visually distinct from event severity reds
const COMMERCIAL_FLIGHT_COLOR = "#a3e635"; // lime — distinct from military blue
const WEATHER_COLOR = "#facc15"; // amber

export function flightsToPoints(aircraft: TrackedAircraft[]): ExtraMapPoint[] {
  return aircraft.map((a) => ({
    kind: "flight",
    id: a.hex,
    lat: a.lat,
    lon: a.lon,
    color: FLIGHT_COLOR,
    radius: 0.22,
    label: `<b>${a.flight ?? a.registration ?? a.hex}</b><br/>${a.type ?? "Unknown type"}${
      a.altitudeFt != null ? ` · ${a.altitudeFt.toLocaleString()} ft` : ""
    }${a.groundSpeedKt != null ? ` · ${Math.round(a.groundSpeedKt)} kt` : ""}`,
  }));
}

export function commercialFlightsToPoints(
  aircraft: TrackedAircraft[],
): ExtraMapPoint[] {
  return aircraft.map((a) => ({
    kind: "commercial-flight",
    id: a.hex,
    lat: a.lat,
    lon: a.lon,
    color: COMMERCIAL_FLIGHT_COLOR,
    radius: 0.16,
    label: `<b>${a.flight ?? a.hex}</b><br/>${a.category ?? "Unknown origin"}${
      a.altitudeFt != null ? ` · ${a.altitudeFt.toLocaleString()} ft` : ""
    }${a.groundSpeedKt != null ? ` · ${Math.round(a.groundSpeedKt)} kt` : ""}`,
  }));
}

export function weatherToPoints(conditions: WeatherSnapshot[]): ExtraMapPoint[] {
  return conditions.map((c) => ({
    kind: "weather",
    id: c.location.name,
    lat: c.location.lat,
    lon: c.location.lon,
    color: WEATHER_COLOR,
    radius: 0.3,
    label: `<b>${c.location.name}</b><br/>${c.temperatureC.toFixed(1)}°C · wind ${Math.round(
      c.windSpeedKmh,
    )} km/h${c.precipitationMm > 0 ? ` · ${c.precipitationMm.toFixed(1)}mm precip` : ""}`,
  }));
}
