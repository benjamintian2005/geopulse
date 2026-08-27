import { generateObject } from "ai";
import { z } from "zod";
import { CATEGORIES } from "./categories";
import type { RawItem } from "./sources/gdelt";

const KEYWORDS =
  /iran|israel|gaza|palestin|hamas|hezbollah|lebanon|russia|ukraine|kremlin|putin|zelensk|taiwan|beijing|china.*military|north korea|kim jong|pyongyang|missile|airstrike|nuclear|sanctions|troops|invasion|ceasefire|drone strike/i;

export function isLikelyGeopolitical(item: RawItem): boolean {
  return KEYWORDS.test(item.title) || KEYWORDS.test(item.snippet);
}

const classifiedItemSchema = z.object({
  id: z.number(),
  relevant: z
    .boolean()
    .describe(
      "true only if this is a real, specific geopolitical/military/conflict event or development (not opinion, sports, culture, or unrelated news)",
    ),
  summary: z
    .string()
    .describe("One tight sentence, under 200 characters, plain factual tone"),
  category: z.enum(CATEGORIES),
  location: z
    .string()
    .describe("Primary place name the event is centered on, e.g. 'Tehran, Iran'"),
  lat: z.number(),
  lon: z.number(),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      "1=minor/diplomatic statement, 3=notable escalation, 5=major military action or strike with casualties",
    ),
});

export type ClassifiedItem = z.infer<typeof classifiedItemSchema>;

const batchSchema = z.object({
  items: z.array(classifiedItemSchema),
});

export async function classifyBatch(
  items: RawItem[],
): Promise<Map<number, ClassifiedItem>> {
  if (items.length === 0) return new Map();

  const prompt = items
    .map(
      (item, i) =>
        `[${i}] TITLE: ${item.title}\nCONTEXT: ${item.snippet}\nSOURCE: ${item.source}`,
    )
    .join("\n\n");

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: batchSchema,
    system:
      "You are a geopolitical intelligence analyst triaging a live news feed for a situation-awareness map. " +
      "For each numbered item, decide if it is a genuine, specific geopolitical/conflict event, then extract a factual one-line summary, " +
      "the category, the primary location with approximate real-world latitude/longitude, and a 1-5 severity score. " +
      "Reject opinion pieces, retrospectives, sports, and anything not tied to a concrete event.",
    prompt,
  });

  const map = new Map<number, ClassifiedItem>();
  for (const item of object.items) {
    map.set(item.id, item);
  }
  return map;
}
