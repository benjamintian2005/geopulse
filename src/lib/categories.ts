export const CATEGORIES = [
  "us-iran",
  "russia-ukraine",
  "israel-palestine",
  "china-taiwan",
  "north-korea",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  "us-iran": "US – Iran",
  "russia-ukraine": "Russia – Ukraine",
  "israel-palestine": "Israel – Palestine",
  "china-taiwan": "China – Taiwan",
  "north-korea": "North Korea",
  other: "Other",
};

export const CATEGORY_QUERIES: Record<Exclude<Category, "other">, string> = {
  "us-iran": "Iran AND (US OR United States OR sanctions OR strike OR nuclear)",
  "russia-ukraine": "Russia AND Ukraine AND (strike OR missile OR troops OR front)",
  "israel-palestine": "Israel AND (Gaza OR Palestine OR Hamas OR Hezbollah OR Lebanon)",
  "china-taiwan": "China AND Taiwan AND (military OR incursion OR strait)",
  "north-korea": "North Korea AND (missile OR nuclear OR Kim Jong)",
};
