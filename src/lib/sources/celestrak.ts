// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// CelesTrak orbital element catalog, no API key required. Returns each
// satellite's OMM (Orbit Mean-Elements Message) record — includes the raw
// mean-motion/inclination/eccentricity elements a future consumer would
// need for orbital propagation (e.g. via satellite.js), but doesn't
// propagate positions itself.
// https://celestrak.org/NORAD/documentation/gp-data-formats.php
const CELESTRAK_ENDPOINT = "https://celestrak.org/NORAD/elements/gp.php";

// A representative slice of CelesTrak's published groups — "active" is the
// full active-satellite catalog (~10k objects); the others are focused
// subsets relevant to a geopolitical/strategic monitoring use case.
export type CelestrakGroup =
  | "active"
  | "stations"
  | "gps-ops"
  | "military"
  | "science";

export interface SatelliteRecord {
  name: string;
  noradCatId: number;
  epoch: Date;
  inclinationDeg: number;
  meanMotionRevPerDay: number;
  eccentricity: number;
}

interface CelestrakOmm {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  INCLINATION: number;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
}

export async function fetchCelestrakGroup(
  group: CelestrakGroup = "stations",
): Promise<SatelliteRecord[]> {
  const params = new URLSearchParams({ GROUP: group, FORMAT: "json" });

  let res: Response;
  try {
    res = await fetch(`${CELESTRAK_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    throw new Error(`CelesTrak request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`CelesTrak fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as CelestrakOmm[];

  return data.map((sat) => ({
    name: sat.OBJECT_NAME,
    noradCatId: sat.NORAD_CAT_ID,
    epoch: new Date(sat.EPOCH),
    inclinationDeg: sat.INCLINATION,
    meanMotionRevPerDay: sat.MEAN_MOTION,
    eccentricity: sat.ECCENTRICITY,
  }));
}
