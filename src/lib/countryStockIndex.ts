// ISO 3166-1 alpha-2 country code -> representative major stock index.
// Symbols use the common "^"-prefixed convention (Yahoo/Google Finance
// style) that most financial data APIs, including Finnhub, recognize for
// index quotes. NOT yet live-verified against Finnhub's actual free-tier
// coverage — international indices may be limited/unavailable on the free
// plan. Verify once FINNHUB_API_KEY is set and adjust symbols/coverage as
// needed; countries with no confirmed-working symbol should be removed
// rather than left showing a silently-wrong or empty quote.
export interface CountryIndex {
  symbol: string;
  name: string;
}

export const COUNTRY_STOCK_INDEX: Record<string, CountryIndex> = {
  US: { symbol: "^GSPC", name: "S&P 500" },
  CA: { symbol: "^GSPTSE", name: "S&P/TSX Composite" },
  MX: { symbol: "^MXX", name: "IPC Mexico" },
  BR: { symbol: "^BVSP", name: "Bovespa" },
  AR: { symbol: "^MERV", name: "Merval" },
  GB: { symbol: "^FTSE", name: "FTSE 100" },
  DE: { symbol: "^GDAXI", name: "DAX" },
  FR: { symbol: "^FCHI", name: "CAC 40" },
  IT: { symbol: "FTSEMIB.MI", name: "FTSE MIB" },
  ES: { symbol: "^IBEX", name: "IBEX 35" },
  NL: { symbol: "^AEX", name: "AEX" },
  CH: { symbol: "^SSMI", name: "Swiss Market Index" },
  SE: { symbol: "^OMX", name: "OMX Stockholm 30" },
  RU: { symbol: "IMOEX.ME", name: "MOEX Russia Index" },
  UA: { symbol: "PFTS", name: "PFTS Index" },
  TR: { symbol: "^XU100", name: "BIST 100" },
  IL: { symbol: "^TA125.TA", name: "TA-125" },
  SA: { symbol: "^TASI.SR", name: "Tadawul All Share" },
  AE: { symbol: "^ADX", name: "ADX General Index" },
  EG: { symbol: "^CASE30", name: "EGX 30" },
  ZA: { symbol: "^JN0U.JO", name: "JSE Top 40" },
  NG: { symbol: "^NGSE", name: "NGX All-Share" },
  CN: { symbol: "000001.SS", name: "Shanghai Composite" },
  HK: { symbol: "^HSI", name: "Hang Seng" },
  TW: { symbol: "^TWII", name: "Taiwan Weighted" },
  JP: { symbol: "^N225", name: "Nikkei 225" },
  KR: { symbol: "^KS11", name: "KOSPI" },
  IN: { symbol: "^BSESN", name: "BSE Sensex" },
  PK: { symbol: "^KSE100", name: "KSE 100" },
  ID: { symbol: "^JKSE", name: "Jakarta Composite" },
  MY: { symbol: "^KLSE", name: "FTSE Bursa Malaysia KLCI" },
  SG: { symbol: "^STI", name: "Straits Times Index" },
  TH: { symbol: "^SET.BK", name: "SET Index" },
  VN: { symbol: "^VNINDEX", name: "VN-Index" },
  PH: { symbol: "PSEI.PS", name: "PSEi" },
  AU: { symbol: "^AXJO", name: "ASX 200" },
  NZ: { symbol: "^NZ50", name: "NZX 50" },
};

export function stockIndexForCountry(iso2: string): CountryIndex | null {
  return COUNTRY_STOCK_INDEX[iso2.toUpperCase()] ?? null;
}
