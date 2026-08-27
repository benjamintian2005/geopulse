export interface RawItem {
  source: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: Date;
}

const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string; // e.g. "20260823T120000Z"
  domain: string;
  sourcecountry: string;
}

function parseGdeltDate(seendate: string): Date {
  // Format: YYYYMMDDTHHMMSSZ
  const iso = seendate.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGdelt(
  query: string,
  maxRecords = 20,
  retries = 2,
): Promise<RawItem[]> {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: String(maxRecords),
    sort: "DateDesc",
    format: "json",
    timespan: "3h",
  });

  const res = await fetch(`${GDELT_DOC_ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": "geopulse-globe/1.0" },
  });

  if (res.status === 429 && retries > 0) {
    await sleep(2000);
    return fetchGdelt(query, maxRecords, retries - 1);
  }

  if (!res.ok) {
    console.error(`GDELT fetch failed: ${res.status} for query "${query}"`);
    return [];
  }

  const text = await res.text();
  if (!text.trim()) return [];

  let data: { articles?: GdeltArticle[] };
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`GDELT returned non-JSON for query "${query}"`);
    return [];
  }

  return (data.articles ?? []).map((a) => ({
    source: "gdelt",
    url: a.url,
    title: a.title,
    snippet: `${a.domain} (${a.sourcecountry})`,
    publishedAt: parseGdeltDate(a.seendate),
  }));
}
