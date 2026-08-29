// STANDALONE / NOT INTEGRATED — see src/lib/sources/README.md.
//
// GitHub public Search API, no API key required for low-volume use
// (unauthenticated requests are capped at 10/min — fine for periodic
// polling, not for tight loops). Used here as a lightweight "tech
// ecosystem signal" proxy: recently-active, highly-starred repositories.
// https://docs.github.com/en/rest/search/search
const GITHUB_SEARCH_ENDPOINT = "https://api.github.com/search/repositories";

export interface RepoSignal {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  pushedAt: Date;
}

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
}

interface GithubSearchResponse {
  items: GithubRepo[];
}

// Repos pushed in the last `sinceDays` days, ranked by stars — a rough
// pulse check on where developer attention is concentrated right now.
export async function fetchTrendingRepos(
  { sinceDays = 7, perPage = 20 }: { sinceDays?: number; perPage?: number } = {},
): Promise<RepoSignal[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const params = new URLSearchParams({
    q: `pushed:>${since} stars:>500`,
    sort: "stars",
    order: "desc",
    per_page: String(perPage),
  });

  let res: Response;
  try {
    res = await fetch(`${GITHUB_SEARCH_ENDPOINT}?${params.toString()}`, {
      headers: {
        "User-Agent": "geopulse-globe/1.0",
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`GitHub request failed: ${err}`);
  }

  if (!res.ok) {
    console.error(`GitHub fetch failed: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as GithubSearchResponse;

  return data.items.map((repo) => ({
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    stars: repo.stargazers_count,
    language: repo.language,
    pushedAt: new Date(repo.pushed_at),
  }));
}
