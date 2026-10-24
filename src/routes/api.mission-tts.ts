import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkVoiceCatalogBudget, voiceCatalogOriginDenied } from "../lib/voice-catalog-security";
import { withSpeechPreflight, SpeechPreflightError } from "../lib/speech-preflight";
import { readPrivateJson, PrivateJsonRequestError } from "../lib/private-json-request";
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
import {
  withGoogleSpeechProvider,
  GoogleSpeechProviderError,
  MAX_GOOGLE_SPEECH_AUDIO_BYTES,
  type GoogleSpeechProvider,
} from "../lib/google-speech-provider";
import {
  authenticateSpeakingRequest,
  enforceSpeakingPreAuthRateLimit,
  enforceSpeakingRateLimit,
  hasSpeakingAgeAttestation,
  isStrictSameOrigin,
} from "../lib/speaking-security";

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  voiceName: z.string().trim().min(1).max(160),
  languageCode: z.string().trim().min(2).max(24).refine(isSupportedGoogleTtsLocale),
  speakingRate: z.number().min(0.25).max(2),
  usage: z.enum(["learning", "mission"]),
});

const TTS_RATE_LIMIT_RETRY_AFTER_SECONDS = 20;
const GOOGLE_VOICE_CACHE_MS = 6 * 60 * 60 * 1000;
const voiceCache = new Map<string, { expiresAt: number; voices: GoogleTtsVoice[] }>();

function json(payload: unknown, status = 200, retryAfter?: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(retryAfter === undefined ? {} : { "Retry-After": String(retryAfter) }),
    },
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

async function listGoogleVoices(
  locale: string,
  provider: GoogleSpeechProvider,
): Promise<GoogleTtsVoice[]> {
  const family = languageFamily(locale);
  const cached = voiceCache.get(family);
  if (cached && cached.expiresAt > Date.now()) return cached.voices;

  const url = new URL("https://texttospeech.googleapis.com/v1/voices");
  url.searchParams.set("languageCode", family);
  const payload = (await provider.json(url, undefined, 2 * 1024 * 1024)) as {
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

async function capabilities(locale: string, signal: AbortSignal) {
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
  const voices = await withGoogleSpeechProvider(apiKey, signal, async (provider) =>
    googleVoicesForLocale(await listGoogleVoices(locale, provider), locale),
  );
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
        if (voiceCatalogOriginDenied(request)) {
          return json({ error: "Cross-origin request rejected." }, 403);
        }
        // Public cached metadata and disabled configuration require no provider admission.
        const cached = voiceCache.get(languageFamily(locale));
        if (providerReady() && (!cached || cached.expiresAt <= Date.now())) {
          try {
            const denied = await withSpeechPreflight(request, (signal) =>
              checkVoiceCatalogBudget(request, signal),
            );
            if (denied) {
              return json(
                { error: "Google voice catalog is temporarily unavailable." },
                denied.status,
                denied.retryAfter,
              );
            }
          } catch (error) {
            const status = error instanceof SpeechPreflightError ? error.status : 503;
            return json({ error: "Google voice catalog is temporarily unavailable." }, status);
          }
        }
        try {
          return json(await capabilities(locale, request.signal));
        } catch {
          console.error("Google TTS voice catalog request failed.");
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

        if (!isStrictSameOrigin(request)) {
          return json({ error: "Cross-origin request rejected." }, 403);
        }
        let body: unknown;
        try {
          body = await readPrivateJson(request, 16 * 1024);
        } catch (error) {
          const status = error instanceof PrivateJsonRequestError ? error.status : 400;
          return json(
            {
              error:
                status === 413
                  ? "Google voice request too large."
                  : status === 408
                    ? "Google voice request timed out."
                    : status === 499
                      ? "Google voice request cancelled."
                      : "Invalid Google voice request.",
            },
            status,
          );
        }
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid Google voice request." }, 400);
        let admission: Response | null;
        try {
          admission = await withSpeechPreflight(request, async (signal) => {
            const ipBudget = await enforceSpeakingPreAuthRateLimit(request, signal).catch(() => ({
              allowed: false,
              misconfigured: true,
            }));
            signal.throwIfAborted();
            if (!ipBudget.allowed) {
              return json(
                {
                  error: ipBudget.misconfigured
                    ? "Speaking controls are unavailable."
                    : "Too many voice requests. Please wait a minute and try again.",
                },
                ipBudget.misconfigured ? 503 : 429,
                ipBudget.misconfigured ? undefined : TTS_RATE_LIMIT_RETRY_AFTER_SECONDS,
              );
            }

            const principal = await authenticateSpeakingRequest(request, signal).catch(() => null);
            signal.throwIfAborted();
            if (!principal) return json({ error: "Sign in to use Google voices." }, 401);
            if (parsed.data.usage === "mission") {
              const ageAttested = await hasSpeakingAgeAttestation(principal.userId, signal).catch(
                () => null,
              );
              signal.throwIfAborted();
              if (ageAttested === null) {
                return json({ error: "Speaking consent storage is unavailable." }, 503);
              }
              if (!ageAttested) {
                return json({ error: "Add the account age self-attestation first." }, 403);
              }
            }
            const budget = await enforceSpeakingRateLimit(
              principal.userId,
              "tts",
              30,
              signal,
            ).catch(() => ({
              allowed: false,
              misconfigured: true,
            }));
            signal.throwIfAborted();
            if (!budget.allowed) {
              return json(
                {
                  error: budget.misconfigured
                    ? "Speaking controls are unavailable."
                    : "Too many voice requests. Please wait a minute and try again.",
                },
                budget.misconfigured ? 503 : 429,
                // The per-minute window is a server-side counter, so the exact reset is unknown.
                budget.misconfigured ? undefined : TTS_RATE_LIMIT_RETRY_AFTER_SECONDS,
              );
            }
            return null;
          });
        } catch (error) {
          const status = error instanceof SpeechPreflightError ? error.status : 503;
          return json(
            {
              error:
                status === 499
                  ? "Google voice request cancelled."
                  : "Speaking controls are unavailable.",
            },
            status,
          );
        }
        if (admission) return admission;
        if (!providerReady()) {
          return json({ error: "Google voices are not configured for this deployment." }, 503);
        }

        const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY as string;
        try {
          return await withGoogleSpeechProvider(apiKey, request.signal, async (provider) => {
            const voices = googleVoicesForLocale(
              await listGoogleVoices(parsed.data.languageCode, provider),
              parsed.data.languageCode,
            );
            const voice = voices.find((candidate) => candidate.name === parsed.data.voiceName);
            if (!voice) return json({ error: "That Google voice is unavailable." }, 400);

            const renderedRate = googleVoiceSupportsSpeakingRate(voice.name)
              ? parsed.data.speakingRate
              : 1;
            const providerStartedAt = Date.now();
            const payload = (await provider.json(
              "https://texttospeech.googleapis.com/v1/text:synthesize",
              {
                input: { text: parsed.data.text },
                voice: { languageCode: parsed.data.languageCode, name: voice.name },
                audioConfig: { audioEncoding: "MP3", speakingRate: renderedRate },
              },
            )) as { audioContent?: unknown };
            if (
              typeof payload.audioContent !== "string" ||
              !payload.audioContent ||
              payload.audioContent.length > 4 * Math.ceil(MAX_GOOGLE_SPEECH_AUDIO_BYTES / 3)
            )
              throw new Error("Invalid Google voice audio");
            const binary = atob(payload.audioContent);
            if (!binary.length || binary.length > MAX_GOOGLE_SPEECH_AUDIO_BYTES)
              throw new Error("Invalid Google voice audio");
            const audio = Uint8Array.from(binary, (character) => character.charCodeAt(0));
            const providerMs = Date.now() - providerStartedAt;
            const totalMs = Date.now() - requestStartedAt;
            console.log(
              JSON.stringify({
                level: "info",
                message: "Mission voice ready",
                route: "/api/mission-tts",
                status: 200,
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
                "X-TTS-Characters": String(Array.from(parsed.data.text).length),
                "X-TTS-Tier": voice.tier,
                "X-TTS-Rate": String(parsed.data.speakingRate),
                "X-TTS-Rendered-Rate": String(renderedRate),
                "Server-Timing": `google-tts;dur=${providerMs}, total;dur=${totalMs}`,
              },
            });
          });
        } catch (error) {
          const status = error instanceof GoogleSpeechProviderError ? error.status : 502;
          console.error(
            JSON.stringify({
              level: "error",
              message: "Google TTS request failed",
              route: "/api/mission-tts",
              status,
              totalMs: Date.now() - requestStartedAt,
              errorType:
                status === 504 ? "Timeout" : status === 499 ? "Cancelled" : "UpstreamError",
            }),
          );
          return json({ error: "Google voice generation failed." }, status);
        }
      },
    },
  },
});
