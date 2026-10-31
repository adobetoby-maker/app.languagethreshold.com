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
} from "../lib/speaking-security";
import { checkLearningGenerationBudget } from "../lib/learning-generation-security";
import { REPLY_AUDIO_CONSENT, REPLY_AUDIO_MAX_BYTES, validateReplyWav } from "../lib/reply-audio";
import { ReplyTranscriptionError, transcribeReplyAudio } from "../lib/reply-audio-provider";

const headers = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const schema = z.object({
  audio: z
    .string()
    .min(1)
    .max(Math.ceil(REPLY_AUDIO_MAX_BYTES / 3) * 4),
  language: z.string().regex(/^[a-z]{2,3}$/),
  audioConsent: z.literal(REPLY_AUDIO_CONSENT),
});

export const Route = createFileRoute("/api/speaking-transcribe")({
  server: {
    handlers: {
      GET: async () =>
        json({
          available: Boolean(process.env.ELEVEN_API_KEY),
          provider: "ElevenLabs",
          maxSeconds: 40,
        }),
      POST: async ({ request }) => {
        if (!isStrictSameOrigin(request))
          return json({ error: "Open the app to transcribe a recording." }, 403);
        const key = process.env.ELEVEN_API_KEY;
        if (!key)
          return json(
            { error: "Audio transcription is not configured. You can use keyboard dictation." },
            503,
          );
        try {
          const denial = await withSpeechPreflight(request, async (signal) => {
            const ip = await enforceSpeakingPreAuthRateLimit(request, signal);
            if (!ip.allowed)
              return json(
                { error: "Too many microphone requests. Wait a minute and retry." },
                ip.misconfigured ? 503 : 429,
              );
            const principal = await authenticateSpeakingRequest(request, signal);
            if (!principal) return json({ error: "Sign in to transcribe a recording." }, 401);
            if (!(await hasSpeakingAgeAttestation(principal.userId, signal)))
              return json({ error: "Confirm speaking privacy before recording." }, 403);
            const budget = await enforceSpeakingRateLimit(
              principal.userId,
              "transcription",
              12,
              signal,
            );
            if (!budget.allowed)
              return json(
                { error: "Recording limit reached. Wait a minute, then retry transcription." },
                budget.misconfigured ? 503 : 429,
              );
            const globalBudget = await checkLearningGenerationBudget(request, "speech", signal);
            if (globalBudget) return json({ error: globalBudget.error }, globalBudget.status);
            return null;
          });
          if (denial) return denial;
          const body = schema.safeParse(await readPrivateJson(request, 2 * 1024 * 1024));
          if (!body.success)
            return json(
              { error: "Invalid recording or missing audio-transcription confirmation." },
              400,
            );
          const { audio, language } = body.data;
          if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audio))
            return json({ error: "Invalid recording encoding." }, 400);
          const bytes = Buffer.from(audio, "base64");
          let recording;
          try {
            recording = validateReplyWav(bytes);
          } catch {
            return json({ error: "Use a recording of forty seconds or less." }, 400);
          }
          if (!recording.audible)
            return json(
              {
                error:
                  "No audible sound was captured. Play the recording, check your microphone, and record again.",
              },
              422,
            );
          const text = await transcribeReplyAudio(bytes, language, key, request.signal);
          return json({ text, seconds: recording.seconds });
        } catch (error) {
          if (error instanceof ReplyTranscriptionError)
            return json({ error: error.message }, error.status);
          if (error instanceof PrivateJsonRequestError || error instanceof SpeechPreflightError)
            return json(
              { error: "The recording request could not finish. Your clip is available to retry." },
              error.status,
            );
          return json(
            { error: "Transcription is unavailable. Your recording is available to retry." },
            503,
          );
        }
      },
    },
  },
});
