import { NextResponse } from "next/server";
import { fetchCelestrakGroup } from "@/lib/sources/celestrak";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const satellites = await withCache("layer:satellites", 5 * 60_000, () =>
    fetchCelestrakGroup("military"),
  );

  const withPeriod = satellites
    .map((sat) => ({
      ...sat,
      orbitalPeriodMin: 1440 / sat.meanMotionRevPerDay,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ satellites: withPeriod });
}
