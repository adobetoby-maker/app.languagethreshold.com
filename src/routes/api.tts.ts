// Pashto fallback for languages without an installed device voice.
// Learner text travels in a POST body; generated audio must never be shared-cached.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json("Invalid text/lang", 400);
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return json("Invalid text/lang", 400);
        if (request.signal.aborted) return json("TTS cancelled", 499);
        const apiKey = process.env.ELEVEN_API_KEY;
        if (!apiKey) return json("TTS not configured", 503);
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
