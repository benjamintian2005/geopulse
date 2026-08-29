import { NextResponse } from "next/server";
import { fetchOpenMeteoConditions } from "@/lib/sources/openmeteo";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const conditions = await withCache(
    "layer:weather",
    5 * 60_000,
    fetchOpenMeteoConditions,
  );
  return NextResponse.json({ conditions });
}
