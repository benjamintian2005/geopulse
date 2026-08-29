// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// Open-Meteo current-conditions snapshot for a fixed set of monitored
// locations, no API key required. Open-Meteo has no global "severe weather
// alerts" feed — this returns raw current conditions per location so a
// future consumer can define its own severity thresholds (e.g. WMO weather
// code + wind gust speed) rather than baking a hardcoded scale in here.
// https://open-meteo.com/en/docs
const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export interface MonitoredLocation {
  name: string;
  country: string; // ISO 3166-1 alpha-2
  lat: number;
  lon: number;
}

// A representative spread of capitals/strategic hubs across regions —
// callers can pass their own list; this is just a sane default.
export const DEFAULT_MONITORED_LOCATIONS: MonitoredLocation[] = [
  { name: "Washington, DC", country: "US", lat: 38.9072, lon: -77.0369 },
  { name: "London", country: "GB", lat: 51.5074, lon: -0.1278 },
  { name: "Moscow", country: "RU", lat: 55.7558, lon: 37.6173 },
  { name: "Beijing", country: "CN", lat: 39.9042, lon: 116.4074 },
  { name: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503 },
  { name: "New Delhi", country: "IN", lat: 28.6139, lon: 77.209 },
  { name: "Tehran", country: "IR", lat: 35.6892, lon: 51.389 },
  { name: "Tel Aviv", country: "IL", lat: 32.0853, lon: 34.7818 },
  { name: "Kyiv", country: "UA", lat: 50.4501, lon: 30.5234 },
  { name: "Taipei", country: "TW", lat: 25.033, lon: 121.5654 },
  { name: "Seoul", country: "KR", lat: 37.5665, lon: 126.978 },
  { name: "Pyongyang", country: "KP", lat: 39.0392, lon: 125.7625 },
];

export interface WeatherSnapshot {
  location: MonitoredLocation;
  temperatureC: number;
  windSpeedKmh: number;
  windGustsKmh: number;
  weatherCode: number;
  precipitationMm: number;
  observedAt: Date;
}

interface OpenMeteoResponse {
  location_id?: number;
  current: {
    time: string;
    temperature_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
    precipitation: number;
  };
}

export async function fetchOpenMeteoConditions(
  locations: MonitoredLocation[] = DEFAULT_MONITORED_LOCATIONS,
): Promise<WeatherSnapshot[]> {
  const params = new URLSearchParams({
    latitude: locations.map((l) => l.lat).join(","),
    longitude: locations.map((l) => l.lon).join(","),
    current: "temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code,precipitation",
  });

  let res: Response;
  try {
    res = await fetch(`${OPEN_METEO_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`Open-Meteo request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`Open-Meteo fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as OpenMeteoResponse[];

  // Multi-location responses come back in request order, with
  // location_id present on every entry after the first.
  return data.map((entry, i) => ({
    location: locations[i],
    temperatureC: entry.current.temperature_2m,
    windSpeedKmh: entry.current.wind_speed_10m,
    windGustsKmh: entry.current.wind_gusts_10m,
    weatherCode: entry.current.weather_code,
    precipitationMm: entry.current.precipitation,
    observedAt: new Date(`${entry.current.time}:00Z`),
  }));
}
