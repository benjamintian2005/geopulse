import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(events)
    .orderBy(desc(events.id))
    .limit(200);
  return NextResponse.json(rows.reverse());
}
