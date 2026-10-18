// Pashto fallback for languages without an installed device voice.
// Learner text travels in a POST body; generated audio must never be shared-cached.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withSpeechPreflight, SpeechPreflightError } from "../lib/speech-preflight";
import { readPrivateJson, PrivateJsonRequestError } from "../lib/private-json-request";
import { isStrictSameOrigin } from "../lib/speaking-security";
import { checkLearningGenerationBudget } from "../lib/learning-generation-security";
import { remoteSpeechAudio, RemoteSpeechProviderError } from "../lib/remote-speech-provider";

const BodySchema = z.object({
  text: z.string().min(1).max(400),
  lang: z.literal("ps"),
});

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
function json(error: string, status: number, extra = {}) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...privateHeaders, "Content-Type": "application/json", ...extra },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      // Old clients must not generate/cache audio from learner text in a URL.
      GET: async () => json("Use POST", 405, { Allow: "POST" }),
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request)) return json("Open the app to use remote speech.", 403);
        let body: unknown;
        try {
          body = await readPrivateJson(request, 4096);
        } catch (error) {
          const status = error instanceof PrivateJsonRequestError ? error.status : 400;
          return json(
            status === 413
              ? "TTS request too large"
              : status === 408
                ? "TTS request timed out"
                : status === 499
                  ? "TTS cancelled"
                  : "Invalid text/lang",
            status,
          );
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return json("Invalid text/lang", 400);
        if (request.signal.aborted) return json("TTS cancelled", 499);
        const apiKey = process.env.ELEVEN_API_KEY;
        if (!apiKey) return json("TTS not configured", 503);
        let denied;
        try {
          denied = await withSpeechPreflight(request, (signal) =>
            checkLearningGenerationBudget(request, "speech", signal),
          );
        } catch (error) {
          const status = error instanceof SpeechPreflightError ? error.status : 503;
          return json(
            status === 499 ? "TTS cancelled" : "Remote speech is temporarily unavailable.",
            status,
          );
        }
        if (denied)
          return json(
            denied.status === 429
              ? "Remote speech limit reached. Try again later."
              : "Remote speech is temporarily unavailable.",
            denied.status,
            denied.retryAfter ? { "Retry-After": String(denied.retryAfter) } : {},
          );
        if (request.signal.aborted) return json("TTS cancelled", 499);
        try {
          const audio = await remoteSpeechAudio(parsed.data.text, apiKey, request.signal);
          return new Response(audio, {
            headers: { ...privateHeaders, "Content-Type": "audio/mpeg" },
          });
        } catch (error) {
          // Provider bodies and thrown errors may contain learner text or credentials.
          return json(
            request.signal.aborted ? "TTS cancelled" : "TTS error",
            request.signal.aborted
              ? 499
              : error instanceof RemoteSpeechProviderError
                ? error.status
                : 500,
          );
        }
      },
    },
  },
});
