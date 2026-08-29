import { NextRequest, NextResponse } from "next/server";
import { currencyForCountry } from "@/lib/countryCurrency";
import { stockIndexForCountry } from "@/lib/countryStockIndex";
import { fetchUsdRateFor } from "@/lib/sources/forex";
import { fetchIndexQuote, FinnhubNotConfiguredError } from "@/lib/sources/finnhub";
import { withCache } from "@/lib/layerCache";

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country");
  if (!country) {
    return NextResponse.json({ error: "missing ?country=" }, { status: 400 });
  }
  const iso2 = country.toUpperCase();

  const snapshot = await withCache(`country-snapshot:${iso2}`, 5 * 60_000, async () => {
    const currencyCode = currencyForCountry(iso2);
    const indexMeta = stockIndexForCountry(iso2);

    const [currency, index] = await Promise.all([
      currencyCode
        ? fetchUsdRateFor(currencyCode).catch(() => null)
        : Promise.resolve(null),
      indexMeta
        ? fetchIndexQuote(indexMeta.symbol).catch((err) => {
            if (!(err instanceof FinnhubNotConfiguredError)) {
              console.error(`Index quote failed for ${iso2}: ${err}`);
            }
            return null;
          })
        : Promise.resolve(null),
    ]);

    return {
      country: iso2,
      currency,
      index: index && indexMeta ? { ...index, name: indexMeta.name } : null,
    };
  });

  return NextResponse.json(snapshot);
}
