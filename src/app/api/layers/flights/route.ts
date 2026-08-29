import { NextResponse } from "next/server";
import { fetchAdsbLolMilitary } from "@/lib/sources/adsblol";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const aircraft = await withCache("layer:flights", 15_000, fetchAdsbLolMilitary);
  return NextResponse.json({ aircraft });
}
