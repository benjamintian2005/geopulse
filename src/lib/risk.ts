import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";

// Half-life for the decay: a severity-5 event contributes half its weight
// to a country's score after this many days, and is effectively negligible
// after ~10 half-lives.
const HALF_LIFE_DAYS = 3;
const LOOKBACK_DAYS = 30;
const DECAY_RATE = Math.LN2 / HALF_LIFE_DAYS;

export interface CountryRiskScore {
  country: string;
  score: number;
  eventCount: number;
  lastEventAt: string;
}

export async function getCountryRiskScores(): Promise<CountryRiskScore[]> {
  const db = getDb();
  const rows = await db
    .select({
      country: events.country,
      score: sql<number>`sum(${events.severity} * exp(-${sql.raw(String(DECAY_RATE))} * extract(epoch from (now() - ${events.publishedAt})) / 86400))`,
      eventCount: sql<number>`count(*)`,
      lastEventAt: sql<string>`max(${events.publishedAt})`,
    })
    .from(events)
    .where(
      sql`${events.country} is not null and ${events.publishedAt} > now() - interval '${sql.raw(String(LOOKBACK_DAYS))} days'`,
    )
    .groupBy(events.country)
    .orderBy(sql`2 desc`);

  return rows
    .filter((r): r is typeof r & { country: string } => r.country !== null)
    .map((r) => ({
      country: r.country,
      score: Number(r.score),
      eventCount: Number(r.eventCount),
      lastEventAt: r.lastEventAt,
    }));
}

export interface CountryRiskEvent {
  id: number;
  title: string;
  summary: string;
  url: string;
  source: string;
  severity: number;
  publishedAt: string;
  weight: number;
}

export async function getCountryRiskEvents(
  country: string,
): Promise<CountryRiskEvent[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      summary: events.summary,
      url: events.url,
      source: events.source,
      severity: events.severity,
      publishedAt: events.publishedAt,
      weight: sql<number>`${events.severity} * exp(-${sql.raw(String(DECAY_RATE))} * extract(epoch from (now() - ${events.publishedAt})) / 86400)`,
    })
    .from(events)
    .where(
      sql`${events.country} = ${country.toUpperCase()} and ${events.publishedAt} > now() - interval '${sql.raw(String(LOOKBACK_DAYS))} days'`,
    )
    .orderBy(sql`${events.publishedAt} desc`)
    .limit(50);

  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt.toISOString(),
    weight: Number(r.weight),
  }));
}
