// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// adsb.lol live ADS-B aircraft tracking, no API key required. The /v2/mil
// endpoint returns currently-tracked military aircraft worldwide.
// https://api.adsb.lol/docs
const ADSBLOL_MIL_ENDPOINT = "https://api.adsb.lol/v2/mil";

export interface TrackedAircraft {
  hex: string;
  flight: string | null;
  registration: string | null;
  type: string | null;
  category: string | null;
  lat: number;
  lon: number;
  altitudeFt: number | null;
  groundSpeedKt: number | null;
  trackDeg: number | null;
}

interface AdsbLolAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  category?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
}

interface AdsbLolResponse {
  ac: AdsbLolAircraft[];
}

export async function fetchAdsbLolMilitary(): Promise<TrackedAircraft[]> {
  let res: Response;
  try {
    res = await fetch(ADSBLOL_MIL_ENDPOINT, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`adsb.lol request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`adsb.lol fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as AdsbLolResponse;

  return (data.ac ?? [])
    .filter(
      (a): a is AdsbLolAircraft & { lat: number; lon: number } =>
        typeof a.lat === "number" && typeof a.lon === "number",
    )
    .map((a) => ({
      hex: a.hex,
      flight: a.flight?.trim() || null,
      registration: a.r ?? null,
      type: a.t ?? null,
      category: a.category ?? null,
      lat: a.lat,
      lon: a.lon,
      altitudeFt: typeof a.alt_baro === "number" ? a.alt_baro : null,
      groundSpeedKt: a.gs ?? null,
      trackDeg: a.track ?? null,
    }));
}
