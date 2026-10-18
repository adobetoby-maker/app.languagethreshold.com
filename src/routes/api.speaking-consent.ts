import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { readPrivateJson, PrivateJsonRequestError } from "../lib/private-json-request";
import { withSpeechPreflight, SpeechPreflightError } from "../lib/speech-preflight";
import {
  authenticateSpeakingRequest,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  hasSpeakingAgeAttestation,
  isStrictSameOrigin,
  setSpeakingAgeAttestation,
  type SpeakingPrincipal,
} from "../lib/speaking-security";

const BodySchema = z.object({ attested: z.boolean() });
function json(payload: unknown, status = 200, retryAfter?: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(retryAfter === undefined ? {} : { "Retry-After": String(retryAfter) }),
    },
  });
}
function rejected(error: string, status: number, retryAfter?: number) {
  return json({ error, writeOutcome: "not_started" }, status, retryAfter);
}
function controlsFailure(error: unknown) {
  const status = error instanceof SpeechPreflightError ? error.status : 503;
  return rejected("Speaking controls are unavailable.", status);
}
async function principalForConsent(
  request: Request,
  signal: AbortSignal,
  updating: boolean,
): Promise<SpeakingPrincipal | Response> {
  const ipBudget = await enforceSpeakingPreAuthRateLimit(request, signal).catch(() => ({
    allowed: false,
    misconfigured: true,
  }));
  signal.throwIfAborted();
  if (!ipBudget.allowed)
    return rejected(
      ipBudget.misconfigured ? "Speaking controls are unavailable." : "Too many requests.",
      ipBudget.misconfigured ? 503 : 429,
      60,
    );
  const principal = await authenticateSpeakingRequest(request, signal).catch(() => null);
  signal.throwIfAborted();
  if (!principal) return rejected("Sign in to use AI speaking practice.", 401);
  if (updating) {
    const budget = await enforceSpeakingRateLimit(principal.userId, "consent", 10, signal).catch(
      () => ({ allowed: false, misconfigured: true }),
    );
    signal.throwIfAborted();
    if (!budget.allowed)
      return rejected(
        budget.misconfigured ? "Speaking controls are unavailable." : "Too many requests.",
        budget.misconfigured ? 503 : 429,
        60,
      );
  }
  return principal;
}
export const Route = createFileRoute("/api/speaking-consent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await withSpeechPreflight(request, async (signal) => {
            const principal = await principalForConsent(request, signal, false);
            if (principal instanceof Response) return principal;
            const attested = await hasSpeakingAgeAttestation(principal.userId, signal).catch(
              () => null,
            );
            signal.throwIfAborted();
            return attested === null
              ? json({ error: "Speaking consent storage is unavailable." }, 503)
              : json({ attested });
          });
        } catch (error) {
          return controlsFailure(error);
        }
      },
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request)) return rejected("Cross-origin request rejected.", 403);
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await readPrivateJson(request, 1024));
        } catch (error) {
          return rejected(
            "Invalid consent request.",
            error instanceof PrivateJsonRequestError ? error.status : 400,
          );
        }
        let principal: SpeakingPrincipal | Response;
        try {
          principal = await withSpeechPreflight(request, (signal) =>
            principalForConsent(request, signal, true),
          );
        } catch (error) {
          return controlsFailure(error);
        }
        if (principal instanceof Response) return principal;
        if (request.signal.aborted) return rejected("Speaking request cancelled.", 499);
        // The admission deadline ends before this existing write. A timeout cannot prove no write.
        try {
          await setSpeakingAgeAttestation(principal.userId, body.attested);
          return json({ attested: body.attested });
        } catch {
          return json(
            { error: "Speaking consent storage is unavailable.", writeOutcome: "unknown" },
            503,
          );
        }
      },
    },
  },
});
