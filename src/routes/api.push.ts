import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  authenticateSpeakingRequest,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  isStrictSameOrigin,
} from "@/lib/speaking-security";
import {
  hashPushEndpoint,
  pushServerConfigured,
  pushSupabase,
  validTimeZone,
  webPushPublicKey,
} from "@/lib/push-server";

const CountdownSchema = z
  .object({
    label: z.string().min(1).max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(["mission", "trip"]),
  })
  .nullable();

const ContextSchema = z.object({
  version: z.literal(1),
  language: z.string().min(1).max(40),
  topicTitle: z.string().max(140).nullable(),
  lastPracticeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  mission: CountdownSchema,
  trip: CountdownSchema,
  stack: z
    .object({
      moduleId: z.string().min(1).max(120),
      name: z.string().min(1).max(100),
      totalLessons: z.number().int().min(0).max(10_000),
      completedLessons: z.number().int().min(0).max(10_000),
      remainingLessons: z.number().int().min(0).max(10_000),
      nextLessonTitle: z.string().max(140).nullable(),
    })
    .nullable(),
  streak: z
    .object({
      current: z.number().int().min(0).max(100_000),
      best: z.number().int().min(0).max(100_000),
      lessonsCompletedToday: z.number().int().min(0).max(1_000),
      recoveryLessonsRemaining: z.number().int().min(0).max(2),
      travelPasses: z.number().int().min(0).max(3),
      travelBreakEndsOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    })
    .optional(),
});

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    subscription: z.object({
      endpoint: z
        .string()
        .url()
        .max(2048)
        .refine((value) => value.startsWith("https://")),
      keys: z.object({
        p256dh: z.string().min(40).max(256),
        auth: z.string().min(8).max(128),
      }),
    }),
    reminderHour: z.number().int().min(0).max(23),
    timezone: z.string().min(1).max(80),
    context: ContextSchema,
  }),
  z.object({
    action: z.literal("preferences"),
    enabled: z.boolean(),
    reminderHour: z.number().int().min(0).max(23),
    timezone: z.string().min(1).max(80),
    context: ContextSchema,
  }),
  z.object({ action: z.literal("sync-context"), context: ContextSchema }),
  z.object({
    action: z.literal("unsubscribe"),
    endpoint: z
      .string()
      .url()
      .max(2048)
      .refine((value) => value.startsWith("https://")),
  }),
]);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function principalFor(request: Request) {
  const ipBudget = await enforceSpeakingPreAuthRateLimit(request).catch(() => ({
    allowed: false,
    misconfigured: true,
  }));
  if (!ipBudget.allowed) return null;
  return authenticateSpeakingRequest(request).catch(() => null);
}

async function upsertPreferences(
  userId: string,
  values: { enabled?: boolean; reminderHour?: number; timezone?: string; context: unknown },
) {
  const payload = {
    user_id: userId,
    enabled: values.enabled ?? true,
    reminder_hour: values.reminderHour ?? 19,
    timezone: values.timezone ?? "UTC",
    context: values.context,
    updated_at: new Date().toISOString(),
  };
  const response = await pushSupabase("push_reminder_preferences?on_conflict=user_id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Reminder preferences were rejected.");
}

export const Route = createFileRoute("/api/push")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const principal = await principalFor(request);
        if (!principal) return json({ error: "Sign in to manage practice reminders." }, 401);
        const response = await pushSupabase(
          `push_reminder_preferences?select=enabled,reminder_hour,timezone&user_id=eq.${encodeURIComponent(principal.userId)}&limit=1`,
        ).catch(() => null);
        if (!response?.ok) return json({ error: "Practice reminders are unavailable." }, 503);
        const rows = (await response.json()) as Array<{
          enabled?: boolean;
          reminder_hour?: number;
          timezone?: string;
        }>;
        const row = rows[0];
        return json({
          configured: pushServerConfigured(),
          enabled: row?.enabled === true,
          reminderHour: row?.reminder_hour ?? 19,
          timezone: row?.timezone ?? "UTC",
          publicKey: webPushPublicKey(),
        });
      },
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request))
          return json({ error: "Cross-origin request rejected." }, 403);
        const principal = await principalFor(request);
        if (!principal) return json({ error: "Sign in to manage practice reminders." }, 401);
        const budget = await enforceSpeakingRateLimit(principal.userId, "push", 30).catch(() => ({
          allowed: false,
          misconfigured: true,
        }));
        if (!budget.allowed)
          return json({ error: "Too many reminder changes. Try again soon." }, 429);

        const parsed = BodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid reminder request." }, 400);
        const body = parsed.data;
        try {
          if (body.action === "unsubscribe") {
            const endpointHash = await hashPushEndpoint(body.endpoint);
            const deleted = await pushSupabase(
              `push_subscriptions?endpoint_hash=eq.${endpointHash}&user_id=eq.${encodeURIComponent(principal.userId)}`,
              { method: "DELETE" },
            );
            if (!deleted.ok) throw new Error("Subscription removal failed.");
            await pushSupabase(
              `push_reminder_preferences?user_id=eq.${encodeURIComponent(principal.userId)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() }),
              },
            );
            return json({ ok: true });
          }

          if (body.action === "sync-context") {
            const updated = await pushSupabase(
              `push_reminder_preferences?user_id=eq.${encodeURIComponent(principal.userId)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  context: body.context,
                  updated_at: new Date().toISOString(),
                }),
              },
            );
            if (!updated.ok) throw new Error("Reminder context update failed.");
            return json({ ok: true });
          }

          if (!validTimeZone(body.timezone)) return json({ error: "Invalid time zone." }, 400);

          if (body.action === "subscribe") {
            if (!pushServerConfigured())
              return json({ error: "Push delivery is not configured." }, 503);
            const endpointHash = await hashPushEndpoint(body.subscription.endpoint);
            const subscription = await pushSupabase(
              "push_subscriptions?on_conflict=endpoint_hash",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Prefer: "resolution=merge-duplicates,return=minimal",
                },
                body: JSON.stringify({
                  endpoint_hash: endpointHash,
                  user_id: principal.userId,
                  endpoint: body.subscription.endpoint,
                  p256dh: body.subscription.keys.p256dh,
                  auth: body.subscription.keys.auth,
                  updated_at: new Date().toISOString(),
                }),
              },
            );
            if (!subscription.ok) throw new Error("Push subscription was rejected.");
            await upsertPreferences(principal.userId, body);
            return json({ ok: true });
          }

          await upsertPreferences(principal.userId, body);
          return json({ ok: true });
        } catch {
          return json({ error: "Practice reminder storage is unavailable." }, 503);
        }
      },
    },
  },
});
