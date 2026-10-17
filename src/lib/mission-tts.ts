import type { GoogleTtsVoice, MissionTtsLanguage } from "@/data/mission-tts";
import { speakingRequestHeaders } from "@/lib/speaking-client";

export interface MissionTtsCapabilities {
  provider: "google-cloud-tts";
  ready: boolean;
  supportedLanguages: MissionTtsLanguage[];
  voices: GoogleTtsVoice[];
  speakingRates: number[];
}

let playbackGeneration = 0;
let sharedAudio: HTMLAudioElement | null = null;
let activeController: AbortController | null = null;
let activeObjectUrl: string | null = null;
let finishActivePlayback: (() => void) | null = null;
const capabilitiesCache = new Map<string, { expiresAt: number; value: MissionTtsCapabilities }>();
const capabilitiesInFlight = new Map<string, Promise<MissionTtsCapabilities>>();

function observeCapabilitiesRequest(
  request: Promise<MissionTtsCapabilities>,
  signal?: AbortSignal,
) {
  if (!signal) return request;
  if (signal.aborted) {
    return Promise.reject(new DOMException("The request was aborted.", "AbortError"));
  }

  return new Promise<MissionTtsCapabilities>((resolve, reject) => {
    const abort = () => reject(new DOMException("The request was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    request.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function audioElement() {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

function releaseObjectUrl() {
  if (!activeObjectUrl) return;
  URL.revokeObjectURL(activeObjectUrl);
  activeObjectUrl = null;
}

export function stopMissionTts() {
  playbackGeneration += 1;
  activeController?.abort();
  activeController = null;
  if (sharedAudio) {
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
    sharedAudio.pause();
    sharedAudio.removeAttribute("src");
    sharedAudio.load();
  }
  finishActivePlayback?.();
  finishActivePlayback = null;
  releaseObjectUrl();
}

export async function getMissionTtsCapabilities(languageCode: string, signal?: AbortSignal) {
  const cacheKey = languageCode.trim().toLowerCase();
  const cached = capabilitiesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = capabilitiesInFlight.get(cacheKey);
  if (pending) return observeCapabilitiesRequest(pending, signal);

  const params = new URLSearchParams({ languageCode });
  const request = fetch(`/api/mission-tts?${params}`, {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Google voices are unavailable.");
      const value = (await response.json()) as MissionTtsCapabilities;
      capabilitiesCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, value });
      return value;
    })
    .finally(() => capabilitiesInFlight.delete(cacheKey));
  capabilitiesInFlight.set(cacheKey, request);
  return observeCapabilitiesRequest(request, signal);
}

export async function speakMissionTts({
  text,
  voiceName,
  languageCode,
  speakingRate,
  usage = "mission",
  onPlaybackStart,
  signal,
}: {
  text: string;
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  usage?: "learning" | "mission";
  onPlaybackStart?: () => void;
  signal?: AbortSignal;
}) {
  if (signal?.aborted) throw new DOMException("The request was aborted.", "AbortError");
  stopMissionTts();
  const controller = new AbortController();
  const generation = playbackGeneration;
  activeController = controller;
  const current = () => generation === playbackGeneration && !controller.signal.aborted;
  const checkCurrent = () => {
    if (!current()) throw new DOMException("The request was aborted.", "AbortError");
  };

  const abortOwnedPlayback = () => {
    if (current()) stopMissionTts();
  };
  signal?.addEventListener("abort", abortOwnedPlayback, { once: true });
  try {
    const headers = await speakingRequestHeaders();
    checkCurrent();

    const response = await fetch("/api/mission-tts", {
      method: "POST",
      headers,
      body: JSON.stringify({ text, voiceName, languageCode, speakingRate, usage }),
      signal: controller.signal,
    });
    checkCurrent();
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      checkCurrent();
      throw new Error(payload?.error ?? "Google voice generation failed.");
    }

    const audio = audioElement();
    const blob = await response.blob();
    checkCurrent();
    const renderedRate = Number(response.headers.get("X-TTS-Rendered-Rate") ?? speakingRate);
    activeObjectUrl = URL.createObjectURL(blob);
    audio.src = activeObjectUrl;
    audio.playbackRate = renderedRate === speakingRate ? 1 : speakingRate;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (!current()) return;
        audio.onended = null;
        audio.onerror = null;
        finishActivePlayback = null;
        releaseObjectUrl();
      };
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      finishActivePlayback = () =>
        finish(new DOMException("The request was aborted.", "AbortError"));
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error("The generated audio could not play."));
      audio
        .play()
        .then(() => {
          if (!settled && current()) onPlaybackStart?.();
        })
        .catch((error) => finish(error));
    });
  } catch (error) {
    checkCurrent();
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortOwnedPlayback);
    if (activeController === controller) activeController = null;
  }
}
