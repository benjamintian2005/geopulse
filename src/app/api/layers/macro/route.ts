import { NextResponse } from "next/server";
import { fetchEcbSeries } from "@/lib/sources/ecb";
import { fetchBisSeries } from "@/lib/sources/bis";
import { fetchEurostatDataset } from "@/lib/sources/eurostat";
import { withCache } from "@/lib/layerCache";

interface MacroSnapshot {
  eurUsd: { value: number; date: string } | null;
  usPolicyRate: { value: number; date: string } | null;
  euUnemploymentPct: { value: number; period: string } | null;
}

async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const [eurUsdObs, policyRateObs, unemploymentObs] = await Promise.all([
    fetchEcbSeries("EXR", "D.USD.EUR.SP00.A", { lastNObservations: 1 }).catch(
      () => [],
    ),
    fetchBisSeries("BIS", "WS_CBPOL", "D.US", { lastNObservations: 1 }).catch(
      () => [],
    ),
    fetchEurostatDataset("une_rt_m", {
      geo: "EU27_2020",
      sex: "T",
      age: "TOTAL",
      unit: "PC_ACT",
      s_adj: "SA",
    }).catch(() => []),
  ]);

  const latestUnemployment = unemploymentObs.at(-1) ?? null;

  return {
    eurUsd: eurUsdObs[0]
      ? { value: eurUsdObs[0].value, date: eurUsdObs[0].timePeriod }
      : null,
    usPolicyRate: policyRateObs[0]
      ? { value: policyRateObs[0].value, date: policyRateObs[0].timePeriod }
      : null,
    euUnemploymentPct: latestUnemployment
      ? { value: latestUnemployment.value, period: latestUnemployment.timePeriod }
      : null,
  };
}

export async function GET() {
  const snapshot = await withCache("layer:macro", 15 * 60_000, fetchMacroSnapshot);
  return NextResponse.json(snapshot);
}
