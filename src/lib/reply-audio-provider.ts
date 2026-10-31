import { readPrivateServiceJson } from "./private-service-json";

export class ReplyTranscriptionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function transcribeReplyAudio(
  bytes: Uint8Array,
  language: string,
  key: string,
  incoming: AbortSignal,
) {
  const controller = new AbortController();
  let expired = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, 40000);
  timer.unref?.();
  incoming.addEventListener("abort", abort, { once: true });
  if (incoming.aborted) controller.abort();
  try {
    controller.signal.throwIfAborted();
    const body = new FormData();
    body.set("model_id", "scribe_v1");
    body.set("language_code", language);
    body.set("tag_audio_events", "false");
    body.set("diarize", "false");
    body.set("file", new Blob([new Uint8Array(bytes).buffer], { type: "audio/wav" }), "reply.wav");
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      body,
      headers: { "xi-api-key": key },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (response.status === 401 || response.status === 403)
        throw new ReplyTranscriptionError(
          503,
          "Audio was captured, but the transcription service needs access configured. Your recording is available to play or retry.",
        );
      if (response.status === 429)
        throw new ReplyTranscriptionError(
          429,
          "Transcription is busy. Your recording is saved on this screen; try transcribing again shortly.",
        );
      throw new ReplyTranscriptionError(
        502,
        "Audio was captured, but transcription failed. Play your recording or retry transcription.",
      );
    }
    const data = (await readPrivateServiceJson(response, 128 * 1024, controller.signal)) as {
      text?: unknown;
    };
    controller.signal.throwIfAborted();
    if (typeof data.text !== "string" || !data.text.trim())
      throw new ReplyTranscriptionError(
        422,
        "No speech was recognized. Play your recording to check the sound, or record again.",
      );
    return data.text.trim().slice(0, 2000);
  } catch (error) {
    if (incoming.aborted) throw new ReplyTranscriptionError(499, "Transcription cancelled.");
    if (expired)
      throw new ReplyTranscriptionError(
        504,
        "Transcription timed out. Your recording is available; retry transcription.",
      );
    if (error instanceof ReplyTranscriptionError) throw error;
    throw new ReplyTranscriptionError(
      502,
      "Audio was captured, but transcription could not connect. Play your recording or retry transcription.",
    );
  } finally {
    clearTimeout(timer);
    incoming.removeEventListener("abort", abort);
  }
}
