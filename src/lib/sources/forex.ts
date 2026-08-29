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

export interface SingleCurrencyRate {
  currency: string;
  rate: number;
  changePct: number | null;
  date: string;
  source: "ecb" | "community";
}

// On-demand lookup for any single currency vs USD — used by the
// country-click snapshot, which needs whatever currency a given country
// uses rather than the fixed curated list above. Tries Frankfurter/ECB
// first (most authoritative), falls back to the broader community CDN for
// currencies ECB doesn't carry. Returns null if neither source has it.
export async function fetchUsdRateFor(
  currency: string,
): Promise<SingleCurrencyRate | null> {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") {
    return {
      currency: "USD",
      rate: 1,
      changePct: 0,
      date: new Date().toISOString().slice(0, 10),
      source: "ecb",
    };
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  try {
    const params = new URLSearchParams({ from: "USD", to: ccy });
    const res = await fetch(`${FRANKFURTER_ENDPOINT}/latest?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = (await res.json()) as FrankfurterResponse;
      const rate = data.rates[ccy];
      if (rate != null) {
        let changePct: number | null = null;
        try {
          const prevRes = await fetch(
            `${FRANKFURTER_ENDPOINT}/${twoDaysAgo}?${params.toString()}`,
            { headers: { "User-Agent": "geopulse-globe/1.0" }, signal: AbortSignal.timeout(10_000) },
          );
          if (prevRes.ok) {
            const prevData = (await prevRes.json()) as FrankfurterResponse;
            const prevRate = prevData.rates[ccy];
            if (prevRate != null) changePct = ((rate - prevRate) / prevRate) * 100;
          }
        } catch {
          // Change % is a nice-to-have — keep the rate even if this fails.
        }
        return { currency: ccy, rate, changePct, date: data.date, source: "ecb" };
      }
    }
  } catch {
    // Fall through to the community CDN below.
  }

  try {
    const key = ccy.toLowerCase();
    const [latest, previous] = await Promise.all([
      fetchCdnRatesOn("latest"),
      fetchCdnRatesOn(twoDaysAgo).catch(() => null),
    ]);
    const rate = latest.usd[key];
    if (rate == null) return null;
    const prevRate = previous?.usd[key];
    return {
      currency: ccy,
      rate,
      changePct: prevRate != null ? ((rate - prevRate) / prevRate) * 100 : null,
      date: latest.date,
      source: "community",
    };
  } catch {
    return null;
  }
}
