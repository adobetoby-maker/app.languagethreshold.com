import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";
import { buildReminderNotification, type LearningReminderContext } from "@/lib/learning-reminders";
import {
  localDateKey,
  pushServerConfigured,
  pushSupabase,
  type StoredPushSubscription,
} from "@/lib/push-server";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const provided = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}

export const Route = createFileRoute("/api/push-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized." }, 401);
        if (!pushServerConfigured()) return json({ error: "Push delivery is not configured." }, 503);

        webpush.setVapidDetails(
          process.env.WEB_PUSH_SUBJECT!,
          process.env.WEB_PUSH_PUBLIC_KEY!,
          process.env.WEB_PUSH_PRIVATE_KEY!,
        );

        const now = new Date();
        const claimed = await pushSupabase("rpc/claim_due_push_reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p_now: now.toISOString() }),
        }).catch(() => null);
        if (!claimed?.ok) return json({ error: "Reminder schedule is unavailable." }, 503);

        const rows = (await claimed.json()) as StoredPushSubscription[];
        let sent = 0;
        let skipped = 0;
        let removed = 0;

        for (const row of rows) {
          const context = row.context as LearningReminderContext | undefined;
          if (!context || context.version !== 1) {
            skipped += 1;
            continue;
          }
          // The SQL claim has already selected the user's local delivery hour;
          // dates in the learning context are calendar dates and compare safely.
          const today = localDateKey(now, row.timezone || "UTC");
          const notification = buildReminderNotification(context, today);
          if (!notification) {
            skipped += 1;
            continue;
          }
          try {
            await webpush.sendNotification(
              { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
              JSON.stringify(notification),
              { TTL: 60 * 60 * 12, urgency: "normal", topic: "daily-practice" },
            );
            sent += 1;
          } catch (error) {
            const statusCode =
              typeof error === "object" && error && "statusCode" in error
                ? Number(error.statusCode)
                : 0;
            if (statusCode === 404 || statusCode === 410) {
              await pushSupabase(
                `push_subscriptions?endpoint_hash=eq.${encodeURIComponent(row.endpoint_hash)}`,
                { method: "DELETE" },
              ).catch(() => null);
              removed += 1;
            }
          }
        }

        return json({ ok: true, claimed: rows.length, sent, skipped, removed });
      },
    },
  },
});
