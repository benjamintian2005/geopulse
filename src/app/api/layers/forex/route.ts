import { NextResponse } from "next/server";
import { fetchForexRates } from "@/lib/sources/forex";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const rates = await withCache("layer:forex", 5 * 60_000, fetchForexRates);
  return NextResponse.json({ rates });
}
