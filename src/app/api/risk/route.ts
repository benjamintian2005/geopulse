import { NextRequest, NextResponse } from "next/server";
import { getCountryRiskEvents, getCountryRiskScores } from "@/lib/risk";

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country");

  if (country) {
    const eventsForCountry = await getCountryRiskEvents(country);
    return NextResponse.json({ country: country.toUpperCase(), events: eventsForCountry });
  }

  const scores = await getCountryRiskScores();
  return NextResponse.json({ scores });
}
