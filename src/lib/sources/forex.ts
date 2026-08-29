// Frankfurter (ECB-based) FX rates, no API key required, updated on ECB
// business days (~16:00 CET). Rates are quoted per 1 USD.
// https://frankfurter.dev/
const FRANKFURTER_ENDPOINT = "https://api.frankfurter.app";

// fawazahmed0/currency-api — free, no-key, community-maintained CDN (via
// jsdelivr) mirroring a broad set of fiat + crypto rates daily, with dated
// historical snapshots. Used only for RUB and UAH, which Frankfurter/ECB
// doesn't carry (RUB dropped after sanctions, UAH never included) — those
// two currencies are exactly the ones a geopolitical-risk audience cares
// about most, so it's worth a second provider rather than dropping them.
// https://github.com/fawazahmed0/exchange-api
const CDN_CURRENCY_ENDPOINT = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api";
const CDN_EXTRA_CURRENCIES = ["RUB", "UAH"];

export interface ForexRate {
  pair: string;
  rate: number;
  changePct: number;
  date: string;
}

// Majors + geopolitically exposed currencies covered by Frankfurter/ECB.
const TRACKED_CURRENCIES = [
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "CHF",
  "INR",
  "KRW",
  "TRY",
  "ILS",
  "SAR",
  "AED",
];

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

async function fetchRatesOn(date: string): Promise<FrankfurterResponse> {
  const res = await fetch(`${FRANKFURTER_ENDPOINT}/${date}?from=USD`, {
    headers: { "User-Agent": "geopulse-globe/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Frankfurter fetch failed: ${res.status}`);
  return (await res.json()) as FrankfurterResponse;
}

interface CdnCurrencyResponse {
  date: string;
  usd: Record<string, number>;
}

async function fetchCdnRatesOn(dateOrLatest: string): Promise<CdnCurrencyResponse> {
  const res = await fetch(
    `${CDN_CURRENCY_ENDPOINT}@${dateOrLatest}/v1/currencies/usd.json`,
    { headers: { "User-Agent": "geopulse-globe/1.0" }, signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) throw new Error(`Currency CDN fetch failed: ${res.status}`);
  return (await res.json()) as CdnCurrencyResponse;
}

async function fetchExtraCurrencyRates(): Promise<ForexRate[]> {
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let latest: CdnCurrencyResponse;
  let previous: CdnCurrencyResponse;
  try {
    [latest, previous] = await Promise.all([
      fetchCdnRatesOn("latest"),
      fetchCdnRatesOn(twoDaysAgo),
    ]);
  } catch (err) {
    // Non-fatal — the majors from Frankfurter still work without this.
    console.error(`Extra currency fetch failed: ${err}`);
    return [];
  }

  return CDN_EXTRA_CURRENCIES.filter((ccy) => {
    const key = ccy.toLowerCase();
    return latest.usd[key] != null && previous.usd[key] != null;
  }).map((ccy) => {
    const key = ccy.toLowerCase();
    const rate = latest.usd[key];
    const prevRate = previous.usd[key];
    return {
      pair: `USD/${ccy}`,
      rate,
      changePct: ((rate - prevRate) / prevRate) * 100,
      date: latest.date,
    };
  });
}

export async function fetchForexRates(): Promise<ForexRate[]> {
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let latest: FrankfurterResponse;
  let previous: FrankfurterResponse;
  try {
    [latest, previous] = await Promise.all([
      fetchRatesOn("latest"),
      fetchRatesOn(twoDaysAgo),
    ]);
  } catch (err) {
    throw new Error(`Forex request failed: ${err}`);
  }

  const majors = TRACKED_CURRENCIES.filter(
    (ccy) => latest.rates[ccy] != null && previous.rates[ccy] != null,
  ).map((ccy) => {
    const rate = latest.rates[ccy];
    const prevRate = previous.rates[ccy];
    return {
      pair: `USD/${ccy}`,
      rate,
      changePct: ((rate - prevRate) / prevRate) * 100,
      date: latest.date,
    };
  });

  const extra = await fetchExtraCurrencyRates();

  return [...majors, ...extra];
}
