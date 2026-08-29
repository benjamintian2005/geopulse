// CFTC Commitments of Traders (Legacy Futures Only report), no API key
// required. Published weekly (Fridays, as of the prior Tuesday's data).
// Shows how large speculators are positioned in currency futures — the
// standard professional read on FX crowding/sentiment.
// https://publicreporting.cftc.gov/resource/6dca-aqww
const CFTC_COT_ENDPOINT = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";

// CFTC only publishes COT data for currencies with liquid CME futures —
// a small subset of the pairs in forex.ts. Others (CNY, INR, KRW, TRY,
// ILS, SAR, AED) simply have no positioning data and are omitted.
const CONTRACT_TO_CURRENCY: Record<string, string> = {
  "EURO FX": "EUR",
  "BRITISH POUND": "GBP",
  "JAPANESE YEN": "JPY",
  "SWISS FRANC": "CHF",
};

export interface CftcPosition {
  currency: string;
  contractName: string;
  netSpeculativePosition: number;
  longPositions: number;
  shortPositions: number;
  openInterest: number;
  reportDate: string;
}

interface CftcRow {
  contract_market_name: string;
  report_date_as_yyyy_mm_dd: string;
  noncomm_positions_long_all: string;
  noncomm_positions_short_all: string;
  open_interest_all: string;
}

export async function fetchCftcPositioning(): Promise<CftcPosition[]> {
  const contractNames = Object.keys(CONTRACT_TO_CURRENCY)
    .map((name) => `'${name}'`)
    .join(",");
  const params = new URLSearchParams({
    $where: `contract_market_name in(${contractNames})`,
    $order: "report_date_as_yyyy_mm_dd DESC",
    $limit: String(Object.keys(CONTRACT_TO_CURRENCY).length),
    $select:
      "contract_market_name,report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all",
  });

  let res: Response;
  try {
    res = await fetch(`${CFTC_COT_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`CFTC request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`CFTC fetch failed: ${res.status}`);
    return [];
  }

  const rows = (await res.json()) as CftcRow[];

  return rows.map((row) => {
    const long = Number(row.noncomm_positions_long_all);
    const short = Number(row.noncomm_positions_short_all);
    return {
      currency: CONTRACT_TO_CURRENCY[row.contract_market_name],
      contractName: row.contract_market_name,
      netSpeculativePosition: long - short,
      longPositions: long,
      shortPositions: short,
      openInterest: Number(row.open_interest_all),
      reportDate: row.report_date_as_yyyy_mm_dd.slice(0, 10),
    };
  });
}
