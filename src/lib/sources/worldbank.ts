// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// World Bank World Development Indicators, no API key required.
// https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
const WORLD_BANK_ENDPOINT = "https://api.worldbank.org/v2/country/all/indicator";

export interface WorldBankObservation {
  indicatorId: string;
  countryIso3: string;
  countryName: string;
  year: string;
  value: number | null;
}

interface WorldBankEntry {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
}

// World Bank mixes real countries and region/income-group aggregates (e.g.
// "World", "Africa Eastern and Southern") into the same response, both
// using 3-letter codes — so length alone can't distinguish them. This is
// the World Bank's own stable list of aggregate codes (WLD, region groups,
// income groups) as used by their "country" vs "region" API classification.
const WORLD_BANK_AGGREGATE_CODES = new Set([
  "AFE", "AFW", "ARB", "CEB", "CSS", "EAP", "EAR", "EAS", "ECA", "ECS",
  "EMU", "EUU", "FCS", "HIC", "HPC", "IBD", "IBT", "IDA", "IDB", "IDX",
  "LAC", "LCN", "LDC", "LIC", "LMC", "LMY", "LTE", "MEA", "MIC", "MNA",
  "NAC", "OED", "OSS", "PRE", "PSS", "PST", "SAS", "SSA", "SSF", "SST",
  "TEA", "TEC", "TLA", "TMN", "TSA", "TSS", "UMC", "WLD",
]);

// Not exhaustive — the World Bank has ~50 aggregate groupings and this
// covers the common ones plus any entry with a blank/non-3-letter code.
// Good enough for a "mostly real countries" view; a consumer that needs
// exact classification should cross-check against the /v2/country
// endpoint's own `region.id` field instead.
function isAggregateRegion(iso3: string): boolean {
  return iso3.length !== 3 || WORLD_BANK_AGGREGATE_CODES.has(iso3);
}

export async function fetchWorldBankIndicator(
  indicatorCode: string,
  { perPage = 300 }: { perPage?: number } = {},
): Promise<WorldBankObservation[]> {
  const params = new URLSearchParams({
    format: "json",
    per_page: String(perPage),
    mrnev: "1", // most recent non-empty value per country
  });

  let res: Response;
  try {
    res = await fetch(
      `${WORLD_BANK_ENDPOINT}/${indicatorCode}?${params.toString()}`,
      {
        headers: { "User-Agent": "geopulse-globe/1.0" },
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    throw new Error(`World Bank request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`World Bank fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as [unknown, WorldBankEntry[] | null];
  const entries = data[1] ?? [];

  return entries
    .filter((e) => !isAggregateRegion(e.countryiso3code))
    .map((e) => ({
      indicatorId: e.indicator.id,
      countryIso3: e.countryiso3code,
      countryName: e.country.value,
      year: e.date,
      value: e.value,
    }));
}
