import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isMissionTtsSpeed, MISSION_TTS_SPEEDS, MISSION_TTS_VOICES } from "../data/mission-tts";
import { initSentry, Sentry } from "../lib/sentry";

initSentry();

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  partnerVersion: z.enum(["woman", "man"]),
  speakingRate: z.number().refine(isMissionTtsSpeed, "Unsupported speaking rate"),
  ageConfirmed: z.literal(true),
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

function capabilities() {
  const enabled = process.env.GOOGLE_CLOUD_TTS_ENABLED === "true";
  const configured = Boolean(process.env.GOOGLE_CLOUD_TTS_API_KEY);
  return {
    provider: "google-cloud-tts" as const,
    ready: enabled && configured,
    voices: {
      woman: {
        name: MISSION_TTS_VOICES.woman.name,
        label: MISSION_TTS_VOICES.woman.label,
      },
      man: { name: MISSION_TTS_VOICES.man.name, label: MISSION_TTS_VOICES.man.label },
    },
    speakingRates: [...MISSION_TTS_SPEEDS],
  };
}

export const Route = createFileRoute("/api/mission-tts")({
  server: {
    handlers: {
      GET: async () => json(capabilities()),
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected." }, 403);
        if (!capabilities().ready) {
          return json(
            { error: "Google partner voices are not configured for this deployment." },
            503,
          );
        }

        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid partner voice request." }, 400);

        const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY as string;
        const voice = MISSION_TTS_VOICES[parsed.data.partnerVersion];
        try {
          const upstream = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              input: { text: parsed.data.text },
              voice: { languageCode: voice.languageCode, name: voice.name },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: parsed.data.speakingRate,
              },
            }),
          });
          if (!upstream.ok) {
            const detail = await upstream.text();
            throw new Error(`Google Cloud TTS ${upstream.status}: ${detail.slice(0, 300)}`);
          }

          const payload = (await upstream.json()) as { audioContent?: string };
          if (!payload.audioContent) throw new Error("Google Cloud TTS returned no audio.");
          const binary = atob(payload.audioContent);
          const audio = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
              "X-TTS-Provider": "google-cloud-tts",
              "X-TTS-Voice": voice.name,
              "X-TTS-Rate": String(parsed.data.speakingRate),
            },
          });
        } catch (error) {
          Sentry.captureException(error);
          console.error("Google mission TTS request failed:", error);
          return json({ error: "Google partner voice generation failed." }, 502);
        }
      },
    },
  },
});
