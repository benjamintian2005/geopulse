// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// Bank for International Settlements SDMX data API, no API key required.
// Note the dataflow id for central bank policy rates is "WS_CBPOL" (not
// "WS_CBPOL_D" as older docs/examples sometimes show) — verified live
// against https://stats.bis.org/api/v1/dataflow/all/all/latest.
// https://stats.bis.org/api-doc/v1/
const BIS_ENDPOINT = "https://stats.bis.org/api/v1/data";

export interface BisObservation {
  seriesKey: string;
  timePeriod: string;
  value: number;
}

interface BisSdmxResponse {
  data: {
    dataSets: {
      series: Record<
        string,
        { observations: Record<string, [string, ...unknown[]]> }
      >;
    }[];
    structure: {
      dimensions: {
        observation: { id: string; values: { id: string }[] }[];
      };
    };
  };
}

// Fetches one BIS series (e.g. agencyId "BIS", dataflow "WS_CBPOL", key
// "D.US" for the daily US central bank policy rate) and flattens it.
export async function fetchBisSeries(
  agencyId: string,
  dataflow: string,
  seriesKey: string,
  { lastNObservations = 10 }: { lastNObservations?: number } = {},
): Promise<BisObservation[]> {
  const params = new URLSearchParams({
    lastNObservations: String(lastNObservations),
  });

  let res: Response;
  try {
    res = await fetch(
      `${BIS_ENDPOINT}/${agencyId},${dataflow},1.0/${seriesKey}?${params.toString()}`,
      {
        headers: {
          "User-Agent": "geopulse-globe/1.0",
          Accept: "application/vnd.sdmx.data+json",
        },
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    throw new Error(`BIS request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`BIS fetch failed: ${res.status}`);
    return [];
  }

  const body = (await res.json()) as BisSdmxResponse;
  const timeValues = body.data.structure.dimensions.observation.find(
    (d) => d.id === "TIME_PERIOD",
  )?.values;
  if (!timeValues) return [];

  const observations: BisObservation[] = [];
  for (const [key, series] of Object.entries(
    body.data.dataSets[0]?.series ?? {},
  )) {
    for (const [obsIndex, obsValue] of Object.entries(series.observations)) {
      const timePeriod = timeValues[Number(obsIndex)]?.id;
      if (!timePeriod) continue;
      observations.push({
        seriesKey: key,
        timePeriod,
        value: Number(obsValue[0]),
      });
    }
  }
  return observations;
}
