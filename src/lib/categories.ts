export const CATEGORIES = [
  "us-iran",
  "russia-ukraine",
  "israel-palestine",
  "china-taiwan",
  "north-korea",
  "earthquake",
  "natural-disaster",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  "us-iran": "US – Iran",
  "russia-ukraine": "Russia – Ukraine",
  "israel-palestine": "Israel – Palestine",
  "china-taiwan": "China – Taiwan",
  "north-korea": "North Korea",
  earthquake: "Earthquakes",
  "natural-disaster": "Natural Disasters",
  other: "Other",
};

// Categories driven by a GDELT text-search query. Feed-driven categories
// (earthquake, natural-disaster) arrive pre-classified with their own
// source module and don't need a query here.
export const NEWS_CATEGORIES = [
  "us-iran",
  "russia-ukraine",
  "israel-palestine",
  "china-taiwan",
  "north-korea",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const CATEGORY_QUERIES: Record<NewsCategory, string> = {
  "us-iran": "Iran AND (US OR United States OR sanctions OR strike OR nuclear)",
  "russia-ukraine": "Russia AND Ukraine AND (strike OR missile OR troops OR front)",
  "israel-palestine": "Israel AND (Gaza OR Palestine OR Hamas OR Hezbollah OR Lebanon)",
  "china-taiwan": "China AND Taiwan AND (military OR incursion OR strait)",
  "north-korea": "North Korea AND (missile OR nuclear OR Kim Jong)",
};

// CORE categories are on by default and shown as the always-visible top-bar
// pills — this is the original GeoPulse view. LAYER categories are extra
// signal types (earthquakes, disasters, ...) that stay off by default and
// are opted into from the Data Layers dashboard, so the main view doesn't
// get cluttered as more sources are added over time.
export const CORE_CATEGORIES = [...NEWS_CATEGORIES, "other"] as const;

export const LAYER_CATEGORIES = ["earthquake", "natural-disaster"] as const;
