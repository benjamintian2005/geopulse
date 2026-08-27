import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured yet (local dev) — allow
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runIngest();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
