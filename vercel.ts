import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // Hobby plan caps cron at once/day. Upgrade to Pro (or use an external
  // scheduler hitting /api/ingest with the CRON_SECRET) for minute-level cadence.
  crons: [{ path: "/api/ingest", schedule: "0 6 * * *" }],
};
