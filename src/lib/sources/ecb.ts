// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// European Central Bank SDMX data API, no API key required.
// https://data.ecb.europa.eu/help/api/data
const ECB_ENDPOINT = "https://data-api.ecb.europa.eu/service/data";

export interface EcbObservation {
  seriesKey: string;
  timePeriod: string;
  value: number;
}

interface EcbSdmxResponse {
  dataSets: {
    series: Record<
      string,
      { observations: Record<string, [number, ...unknown[]]> }
    >;
  }[];
  structure: {
    dimensions: {
      observation: { id: string; values: { id: string }[] }[];
    };
  };
}

// Fetches one ECB series (e.g. flowRef "EXR", key "D.USD.EUR.SP00.A" for
// the daily USD/EUR reference rate) and flattens it to a plain list.
export async function fetchEcbSeries(
  flowRef: string,
  seriesKey: string,
  { lastNObservations = 10 }: { lastNObservations?: number } = {},
): Promise<EcbObservation[]> {
  const params = new URLSearchParams({
    lastNObservations: String(lastNObservations),
    format: "jsondata",
  });

  let res: Response;
  try {
    res = await fetch(
      `${ECB_ENDPOINT}/${flowRef}/${seriesKey}?${params.toString()}`,
      {
        headers: { "User-Agent": "geopulse-globe/1.0" },
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    throw new Error(`ECB request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`ECB fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as EcbSdmxResponse;
  const timeValues = data.structure.dimensions.observation.find(
    (d) => d.id === "TIME_PERIOD",
  )?.values;
  if (!timeValues) return [];

  const observations: EcbObservation[] = [];
  for (const [key, series] of Object.entries(
    data.dataSets[0]?.series ?? {},
  )) {
    for (const [obsIndex, obsValue] of Object.entries(series.observations)) {
      const timePeriod = timeValues[Number(obsIndex)]?.id;
      if (!timePeriod) continue;
      observations.push({
        seriesKey: key,
        timePeriod,
        value: obsValue[0],
      });
    }
  }
  return observations;
}
