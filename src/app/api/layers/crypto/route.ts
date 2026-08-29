import { NextResponse } from "next/server";
import { fetchCoingeckoMarkets } from "@/lib/sources/coingecko";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const markets = await withCache("layer:crypto", 60_000, () =>
    fetchCoingeckoMarkets(10),
  );
  return NextResponse.json({ markets });
}
