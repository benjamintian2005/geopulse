import { NextResponse } from "next/server";
import { fetchTrendingRepos } from "@/lib/sources/github";
import { withCache } from "@/lib/layerCache";

export async function GET() {
  const repos = await withCache("layer:github", 10 * 60_000, () =>
    fetchTrendingRepos({ perPage: 8 }),
  );
  return NextResponse.json({ repos });
}
