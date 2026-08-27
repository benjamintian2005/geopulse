import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { desc, gt } from "drizzle-orm";

export const maxDuration = 300;

const POLL_INTERVAL_MS = 4000;
const INITIAL_BACKFILL_LIMIT = 100;

function toSseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const encoder = new TextEncoder();
  const sinceParam = req.nextUrl.searchParams.get("since");
  let lastId = sinceParam ? Number(sinceParam) : 0;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(toSseMessage(event, data)));
        } catch {
          closed = true;
        }
      };

      // Initial backfill so a fresh client sees recent alerts immediately.
      if (!sinceParam) {
        const recent = await db
          .select()
          .from(events)
          .orderBy(desc(events.id))
          .limit(INITIAL_BACKFILL_LIMIT);
        const ordered = recent.reverse();
        send("backfill", ordered);
        if (ordered.length > 0) {
          lastId = ordered[ordered.length - 1].id;
        }
      }

      while (!closed) {
        try {
          const fresh = await db
            .select()
            .from(events)
            .where(gt(events.id, lastId))
            .orderBy(events.id)
            .limit(50);

          for (const row of fresh) {
            send("event", row);
            lastId = row.id;
          }

          send("ping", { lastId, t: Date.now() });
        } catch (err) {
          send("error", { message: String(err) });
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      controller.close();
    },
    cancel() {
      // client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
