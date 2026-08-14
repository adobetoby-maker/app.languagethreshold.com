import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  googleVoiceLabel,
  googleVoicesForLocale,
  googleVoiceSupportsSpeakingRate,
  googleVoiceTier,
  isSupportedGoogleTtsLocale,
  languageFamily,
  MISSION_TTS_SPEEDS,
  MISSION_TTS_SUPPORTED_LANGUAGES,
  sortGoogleTtsVoices,
  type GoogleTtsGender,
  type GoogleTtsVoice,
} from "../data/mission-tts";
import { initSentry, Sentry } from "../lib/sentry";
import {
  authenticateSpeakingRequest,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  hasSpeakingAgeAttestation,
  isStrictSameOrigin,
} from "../lib/speaking-security";

initSentry();

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  voiceName: z.string().trim().min(1).max(160),
  languageCode: z.string().trim().min(2).max(24).refine(isSupportedGoogleTtsLocale),
  speakingRate: z.number().min(0.25).max(2),
  usage: z.enum(["learning", "mission"]),
});

const GOOGLE_VOICE_CACHE_MS = 6 * 60 * 60 * 1000;
const voiceCache = new Map<string, { expiresAt: number; voices: GoogleTtsVoice[] }>();

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function providerReady() {
  return (
    process.env.GOOGLE_CLOUD_TTS_ENABLED === "true" && Boolean(process.env.GOOGLE_CLOUD_TTS_API_KEY)
  );
}

function isGoogleGender(value: unknown): value is GoogleTtsGender {
  return ["FEMALE", "MALE", "NEUTRAL", "SSML_VOICE_GENDER_UNSPECIFIED"].includes(String(value));
}

async function listGoogleVoices(apiKey: string, locale: string): Promise<GoogleTtsVoice[]> {
  const family = languageFamily(locale);
  const cached = voiceCache.get(family);
  if (cached && cached.expiresAt > Date.now()) return cached.voices;

  const url = new URL("https://texttospeech.googleapis.com/v1/voices");
  url.searchParams.set("languageCode", family);
  const response = await fetch(url, { headers: { "x-goog-api-key": apiKey } });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Cloud TTS voices ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as {
    voices?: Array<{
      name?: unknown;
      languageCodes?: unknown;
      ssmlGender?: unknown;
      naturalSampleRateHertz?: unknown;
    }>;
  };
  const voices = sortGoogleTtsVoices(
    (payload.voices ?? []).flatMap((candidate): GoogleTtsVoice[] => {
      if (
        typeof candidate.name !== "string" ||
        !Array.isArray(candidate.languageCodes) ||
        !candidate.languageCodes.every((code) => typeof code === "string") ||
        !isGoogleGender(candidate.ssmlGender) ||
        typeof candidate.naturalSampleRateHertz !== "number"
      ) {
        return [];
      }
      const voice: GoogleTtsVoice = {
        name: candidate.name,
        languageCodes: candidate.languageCodes,
        ssmlGender: candidate.ssmlGender,
        naturalSampleRateHertz: candidate.naturalSampleRateHertz,
        tier: googleVoiceTier(candidate.name),
        label: "",
      };
      voice.label = googleVoiceLabel(voice);
      return [voice];
    }),
  );
  voiceCache.set(family, { expiresAt: Date.now() + GOOGLE_VOICE_CACHE_MS, voices });
  return voices;
}

async function capabilities(locale: string) {
  const ready = providerReady();
  if (!ready) {
    return {
      provider: "google-cloud-tts" as const,
      ready: false,
      supportedLanguages: [...MISSION_TTS_SUPPORTED_LANGUAGES],
      voices: [] as GoogleTtsVoice[],
      speakingRates: [...MISSION_TTS_SPEEDS],
    };
  }
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY as string;
  const voices = googleVoicesForLocale(await listGoogleVoices(apiKey, locale), locale);
  return {
    provider: "google-cloud-tts" as const,
    ready: voices.length > 0,
    supportedLanguages: [...MISSION_TTS_SUPPORTED_LANGUAGES],
    voices,
    speakingRates: [...MISSION_TTS_SPEEDS],
  };
}

export const Route = createFileRoute("/api/mission-tts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const locale = new URL(request.url).searchParams.get("languageCode") ?? "es-US";
        if (!isSupportedGoogleTtsLocale(locale)) {
          return json({ error: "Unsupported voice language." }, 400);
        }
        try {
          return json(await capabilities(locale));
        } catch (error) {
          Sentry.captureException(error);
          console.error("Google TTS voice catalog request failed:", error);
          return json({
            provider: "google-cloud-tts",
            ready: false,
            supportedLanguages: [...MISSION_TTS_SUPPORTED_LANGUAGES],
            voices: [],
            speakingRates: [...MISSION_TTS_SPEEDS],
          });
        }
      },
      POST: async ({ request }) => {
        const requestStartedAt = Date.now();
        const requestId = request.headers.get("x-vercel-id");
        if (!isStrictSameOrigin(request)) {
          return json({ error: "Cross-origin request rejected." }, 403);
        }
        const ipBudget = await enforceSpeakingPreAuthRateLimit(request).catch(() => ({
          allowed: false,
          misconfigured: true,
        }));
        if (!ipBudget.allowed) {
          return json(
            {
              error: ipBudget.misconfigured
                ? "Speaking controls are unavailable."
                : "Too many voice requests. Please wait a minute and try again.",
            },
            ipBudget.misconfigured ? 503 : 429,
          );
        }

        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid Google voice request." }, 400);

        const principal = await authenticateSpeakingRequest(request).catch(() => null);
        if (!principal) return json({ error: "Sign in to use Google voices." }, 401);
        if (parsed.data.usage === "mission") {
          const ageAttested = await hasSpeakingAgeAttestation(principal.userId).catch(() => null);
          if (ageAttested === null) {
            return json({ error: "Speaking consent storage is unavailable." }, 503);
          }
          if (!ageAttested) {
            return json({ error: "Add the account age self-attestation first." }, 403);
          }
        }
        const budget = await enforceSpeakingRateLimit(principal.userId, "tts", 30).catch(() => ({
          allowed: false,
          misconfigured: true,
        }));
        if (!budget.allowed) {
          return json(
            {
              error: budget.misconfigured
                ? "Speaking controls are unavailable."
                : "Too many voice requests. Please wait a minute and try again.",
            },
            budget.misconfigured ? 503 : 429,
          );
        }
        if (!providerReady()) {
          return json({ error: "Google voices are not configured for this deployment." }, 503);
        }

        const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY as string;
        try {
          const voices = googleVoicesForLocale(
            await listGoogleVoices(apiKey, parsed.data.languageCode),
            parsed.data.languageCode,
          );
          const voice = voices.find((candidate) => candidate.name === parsed.data.voiceName);
          if (!voice) return json({ error: "That Google voice is unavailable." }, 400);

          const renderedRate = googleVoiceSupportsSpeakingRate(voice.name)
            ? parsed.data.speakingRate
            : 1;
          const providerStartedAt = Date.now();
          const upstream = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              input: { text: parsed.data.text },
              voice: { languageCode: parsed.data.languageCode, name: voice.name },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: renderedRate,
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
          const providerMs = Date.now() - providerStartedAt;
          const totalMs = Date.now() - requestStartedAt;
          console.log(
            JSON.stringify({
              level: "info",
              message: "Mission voice ready",
              route: "/api/mission-tts",
              status: 200,
              requestId,
              provider: "google-cloud-tts",
              providerMs,
              totalMs,
            }),
          );
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
              "X-TTS-Provider": "google-cloud-tts",
              "X-TTS-Voice": voice.name,
              "X-TTS-Rate": String(parsed.data.speakingRate),
              "X-TTS-Rendered-Rate": String(renderedRate),
              "Server-Timing": `google-tts;dur=${providerMs}, total;dur=${totalMs}`,
            },
          });
        } catch (error) {
          Sentry.captureException(error);
          console.error(
            JSON.stringify({
              level: "error",
              message: "Google TTS request failed",
              route: "/api/mission-tts",
              status: 502,
              requestId,
              totalMs: Date.now() - requestStartedAt,
              errorType: error instanceof Error ? error.name : "UnknownError",
            }),
          );
          return json({ error: "Google voice generation failed." }, 502);
        }
      },
    },
  },
});
