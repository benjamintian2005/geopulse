import type { Category } from "@/lib/categories";

// Shape produced by feed sources that already carry authoritative
// category/coordinates/severity (USGS, NASA EONET, ...) — these skip the
// LLM classification step that raw news items (GDELT/RSS) go through.
export interface DirectItem {
  source: string;
  url: string;
  title: string;
  summary: string;
  category: Category;
  location: string;
  country: string | null;
  lat: number;
  lon: number;
  severity: number;
  publishedAt: Date;
}
