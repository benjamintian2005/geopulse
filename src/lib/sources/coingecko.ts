// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// CoinGecko public markets endpoint, no API key required (rate-limited on
// the free tier — fine for periodic polling, not for tight loops).
// https://docs.coingecko.com/reference/coins-markets
const COINGECKO_MARKETS_ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets";

export interface CryptoMarketSnapshot {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  marketCapUsd: number;
  change24hPct: number;
  lastUpdated: Date;
}

interface CoingeckoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number | null;
  last_updated: string;
}

export async function fetchCoingeckoMarkets(
  perPage = 20,
): Promise<CryptoMarketSnapshot[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(perPage),
    page: "1",
  });

  let res: Response;
  try {
    res = await fetch(`${COINGECKO_MARKETS_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "geopulse-globe/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`CoinGecko request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`CoinGecko fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as CoingeckoCoin[];

  return data.map((c) => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    priceUsd: c.current_price,
    marketCapUsd: c.market_cap,
    change24hPct: c.price_change_percentage_24h ?? 0,
    lastUpdated: new Date(c.last_updated),
  }));
}
