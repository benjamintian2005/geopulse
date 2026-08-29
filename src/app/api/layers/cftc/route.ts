import { NextResponse } from "next/server";
import { fetchCftcPositioning } from "@/lib/sources/cftc";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  // COT reports publish weekly — cache generously.
  const positions = await withCache(
    "layer:cftc",
    6 * 60 * 60_000,
    fetchCftcPositioning,
  );
  return NextResponse.json({ positions });
}
