// Pashto fallback for languages without an installed device voice.
// Learner text travels in a POST body; generated audio must never be shared-cached.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isStrictSameOrigin } from "../lib/speaking-security";
import { checkLearningGenerationBudget } from "../lib/learning-generation-security";

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

const MAX_BODY_BYTES = 4096;
class BodyLimitError extends Error {}
async function boundedJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new BodyLimitError();
  if (!request.body) throw new Error("Empty body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new BodyLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      // Old clients must not generate/cache audio from learner text in a URL.
      GET: async () => json("Use POST", 405, { Allow: "POST" }),
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request)) return json("Open the app to use remote speech.", 403);
        if (request.signal.aborted) return json("TTS cancelled", 499);
        let body: unknown;
        try {
          body = await boundedJson(request);
        } catch (error) {
          return error instanceof BodyLimitError
            ? json("TTS request too large", 413)
            : json("Invalid text/lang", 400);
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return json("Invalid text/lang", 400);
        if (request.signal.aborted) return json("TTS cancelled", 499);
        const apiKey = process.env.ELEVEN_API_KEY;
        if (!apiKey) return json("TTS not configured", 503);
        const denied = await checkLearningGenerationBudget(request, "speech");
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
          const res = await fetch(
            "https://api.elevenlabs.io/v1/text-to-speech/XrExE9yKIg1WjnnlVkGX?output_format=mp3_44100_64",
            {
              method: "POST",
              cache: "no-store",
              signal: request.signal,
              headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                text: parsed.data.text,
                model_id: "eleven_v3",
                language_code: parsed.data.lang,
              }),
            },
          );
          if (!res.ok) {
            await res.body?.cancel();
            return json("TTS generation failed", 502);
          }
          return new Response(res.body, {
            headers: { ...privateHeaders, "Content-Type": "audio/mpeg" },
          });
        } catch {
          // Provider bodies and thrown errors may contain learner text or credentials.
          return json(
            request.signal.aborted ? "TTS cancelled" : "TTS error",
            request.signal.aborted ? 499 : 500,
          );
        }
      },
    },
  },
});
