import { NextResponse } from "next/server";
import { fetchWorldBankIndicator } from "@/lib/sources/worldbank";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const countries = await withCache("layer:population", 24 * 60 * 60_000, () =>
    fetchWorldBankIndicator("SP.POP.TOTL", { perPage: 300 }),
  );

  const top = [...countries]
    .filter((c) => c.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 10);

  return NextResponse.json({ countries: top });
}
