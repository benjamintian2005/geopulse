import { NextResponse } from "next/server";
import { fetchOpenSkyStates } from "@/lib/sources/opensky";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const aircraft = await withCache(
    "layer:commercial-flights",
    20_000,
    () => fetchOpenSkyStates(),
  );
  return NextResponse.json({ aircraft });
}
