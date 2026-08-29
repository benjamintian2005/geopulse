// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// Eurostat statistics API (JSON-stat format), no API key required.
// https://wikis.ec.europa.eu/display/EUROSTATHELP/API+Statistics
const EUROSTAT_ENDPOINT =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

export interface EurostatObservation {
  dataset: string;
  geo: string;
  timePeriod: string;
  value: number;
}

interface JsonStatDimension {
  category: {
    index: Record<string, number> | string[];
    label?: Record<string, string>;
  };
}

interface JsonStatResponse {
  label: string;
  updated: string;
  value: Record<string, number>;
  dimension: {
    geo: JsonStatDimension;
    time: JsonStatDimension;
    [key: string]: JsonStatDimension;
  };
  id: string[];
  size: number[];
}

function dimensionIndexToCode(dim: JsonStatDimension): string[] {
  const idx = dim.category.index;
  if (Array.isArray(idx)) return idx;
  return Object.entries(idx)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);
}

// Fetches one Eurostat dataset (e.g. "une_rt_m" for monthly unemployment)
// and flattens its JSON-stat cube into per-geo/per-period observations.
//
// IMPORTANT: Eurostat datasets often have more dimensions than just geo/time
// (e.g. une_rt_m also has freq/s_adj/age/sex/unit). This function only
// handles a 2-D (geo x time) cube correctly — every other dimension must be
// pinned to a single value in `query` (verified via `data.size` — every
// entry should be 1 except the geo and time slots) or values will be
// silently misattributed to the wrong geo/time pair.
export async function fetchEurostatDataset(
  datasetCode: string,
  query: Record<string, string> = {},
): Promise<EurostatObservation[]> {
  const params = new URLSearchParams({ format: "JSON", lang: "EN", ...query });

  let res: Response;
  try {
    res = await fetch(`${EUROSTAT_ENDPOINT}/${datasetCode}?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new Error(`Eurostat request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`Eurostat fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as JsonStatResponse;
  const geoCodes = dimensionIndexToCode(data.dimension.geo);
  const timeCodes = dimensionIndexToCode(data.dimension.time);

  // JSON-stat packs the cube as a flat array indexed in row-major order
  // across `data.id` dimensions; for these 2-D (geo x time) queries the
  // flat index is geoIndex * timeCount + timeIndex.
  const observations: EurostatObservation[] = [];
  for (const [flatIndex, value] of Object.entries(data.value)) {
    const i = Number(flatIndex);
    const timeIdx = i % timeCodes.length;
    const geoIdx = Math.floor(i / timeCodes.length);
    if (geoIdx >= geoCodes.length) continue;
    observations.push({
      dataset: datasetCode,
      geo: geoCodes[geoIdx],
      timePeriod: timeCodes[timeIdx],
      value,
    });
  }
  return observations;
}
