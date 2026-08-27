import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // Primary ingest cadence is driven by the GitHub Actions workflow
  // (.github/workflows/ingest.yml, every 5 min). This daily cron is just a
  // failsafe in case that workflow is disabled or GitHub Actions is down.
  crons: [{ path: "/api/ingest", schedule: "0 6 * * *" }],
};
