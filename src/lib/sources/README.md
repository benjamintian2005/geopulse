# Source modules

Most files here are wired into `src/lib/ingest.ts` and feed the live `events`
table (see `gdelt.ts`, `rss.ts`, `usgs.ts`, `eonet.ts`, `gdacs.ts`).

The following modules are **standalone and intentionally not integrated**:
`openmeteo.ts`, `celestrak.ts`, `adsblol.ts`, `coingecko.ts`, `worldbank.ts`,
`eurostat.ts`, `ecb.ts`, `bis.ts`, `github.ts`. Each exports a working,
live-verified fetch function returning normalized data, but none are called
from `ingest.ts` and none affect the UI. They exist as a starting point for
future work: most of them (prices, indicators, live-tracked flights/orbits)
don't fit the "point event on the globe" model the `events` table and feed
use, and would need their own panel/layer type rather than being forced into
the existing pipeline.

`gpsjam.org` (GPS interference) was investigated but skipped — its data feed
is fetched server-side by their own app and isn't exposed at a documented
public URL, so there's nothing safe to build against yet.
