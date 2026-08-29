// Frankfurter (ECB-based) FX rates, no API key required, updated on ECB
// business days (~16:00 CET). Rates are quoted per 1 USD.
// https://frankfurter.dev/
const FRANKFURTER_ENDPOINT = "https://api.frankfurter.app";

export interface ForexRate {
  pair: string;
  rate: number;
  changePct: number;
  date: string;
}

// Currencies relevant to a geopolitical-risk audience. RUB and UAH are
// intentionally omitted — Frankfurter (ECB) dropped RUB after sanctions and
// never carried UAH, so both are skipped rather than silently returning 0.
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

  return TRACKED_CURRENCIES.filter(
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
}
