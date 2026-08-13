import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  authenticateSpeakingRequest,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  hasSpeakingAgeAttestation,
  isStrictSameOrigin,
  setSpeakingAgeAttestation,
} from "../lib/speaking-security";

const BodySchema = z.object({ attested: z.boolean() });

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function preAuthBudget(request: Request) {
  return enforceSpeakingPreAuthRateLimit(request).catch(() => ({
    allowed: false,
    misconfigured: true,
  }));
}

export const Route = createFileRoute("/api/speaking-consent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ipBudget = await preAuthBudget(request);
        if (!ipBudget.allowed) {
          return json(
            {
              error: ipBudget.misconfigured
                ? "Speaking controls are unavailable."
                : "Too many requests.",
            },
            ipBudget.misconfigured ? 503 : 429,
          );
        }
        const principal = await authenticateSpeakingRequest(request).catch(() => null);
        if (!principal) return json({ error: "Sign in to use AI speaking practice." }, 401);
        try {
          return json({ attested: await hasSpeakingAgeAttestation(principal.userId) });
        } catch {
          return json({ error: "Speaking consent storage is unavailable." }, 503);
        }
      },
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request))
          return json({ error: "Cross-origin request rejected." }, 403);
        const ipBudget = await preAuthBudget(request);
        if (!ipBudget.allowed) {
          return json(
            {
              error: ipBudget.misconfigured
                ? "Speaking controls are unavailable."
                : "Too many requests.",
            },
            ipBudget.misconfigured ? 503 : 429,
          );
        }
        const principal = await authenticateSpeakingRequest(request).catch(() => null);
        if (!principal) return json({ error: "Sign in to use AI speaking practice." }, 401);
        const userBudget = await enforceSpeakingRateLimit(principal.userId, "consent", 10).catch(
          () => ({ allowed: false, misconfigured: true }),
        );
        if (!userBudget.allowed) {
          return json(
            {
              error: userBudget.misconfigured
                ? "Speaking controls are unavailable."
                : "Too many requests.",
            },
            userBudget.misconfigured ? 503 : 429,
          );
        }
        const parsed = BodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid consent request." }, 400);
        try {
          await setSpeakingAgeAttestation(principal.userId, parsed.data.attested);
          return json({ attested: parsed.data.attested });
        } catch {
          return json({ error: "Speaking consent storage is unavailable." }, 503);
        }
      },
    },
  },
});
