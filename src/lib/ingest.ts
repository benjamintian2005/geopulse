import { getDb } from "@/db";
import { events } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { CATEGORY_QUERIES } from "./categories";
import { fetchGdelt, type RawItem } from "./sources/gdelt";
import { fetchAllRssFeeds } from "./sources/rss";
import { classifyBatch, isLikelyGeopolitical } from "./classify";

const BATCH_SIZE = 15;

function dedupeByUrl(items: RawItem[]): RawItem[] {
  const seen = new Map<string, RawItem>();
  for (const item of items) seen.set(item.url, item);
  return [...seen.values()];
}

export interface IngestResult {
  fetched: number;
  candidates: number;
  inserted: number;
  errors: string[];
}

export async function runIngest(): Promise<IngestResult> {
  const errors: string[] = [];

  const gdeltResults: RawItem[][] = [];
  for (const q of Object.values(CATEGORY_QUERIES)) {
    try {
      gdeltResults.push(await fetchGdelt(q, 15));
    } catch (err) {
      errors.push(`gdelt(${q}): ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const rssResults = await fetchAllRssFeeds().catch((err) => {
    errors.push(`rss: ${err}`);
    return [] as RawItem[];
  });

  const all = dedupeByUrl([...gdeltResults.flat(), ...rssResults]);
  const candidates = all.filter(
    (item) => item.source === "gdelt" || isLikelyGeopolitical(item),
  );

  if (candidates.length === 0) {
    return { fetched: all.length, candidates: 0, inserted: 0, errors };
  }

  const db = getDb();

  // Skip URLs we've already stored.
  const existing = await db
    .select({ url: events.url })
    .from(events)
    .where(inArray(events.url, candidates.map((c) => c.url)))
    .catch(() => []);
  const existingUrls = new Set(existing.map((e) => e.url));
  const fresh = candidates.filter((c) => !existingUrls.has(c.url));

  let inserted = 0;

  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    try {
      const classified = await classifyBatch(batch);
      const rows = batch
        .map((item, idx) => {
          const c = classified.get(idx);
          if (!c || !c.relevant) return null;
          return {
            source: item.source,
            url: item.url,
            title: item.title,
            summary: c.summary,
            category: c.category,
            location: c.location,
            lat: c.lat,
            lon: c.lon,
            severity: c.severity,
            publishedAt: item.publishedAt,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        const result = await db
          .insert(events)
          .values(rows)
          .onConflictDoNothing({ target: events.url })
          .returning({ id: events.id });
        inserted += result.length;
      }
    } catch (err) {
      errors.push(`classify batch ${i}: ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return { fetched: all.length, candidates: fresh.length, inserted, errors };
}
