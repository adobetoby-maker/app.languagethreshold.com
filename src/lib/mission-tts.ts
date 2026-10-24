import type { GoogleTtsVoice, MissionTtsLanguage } from "@/data/mission-tts";
import { speakingRequestHeaders, type SpeakingRequestOwner } from "@/lib/speaking-client";
import { forgetTtsAudio, lookupTtsAudio, storeTtsAudio } from "@/lib/tts-audio-cache";

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

/** A non-2xx answer from /api/mission-tts, with what the caller needs to decide on a retry. */
export class MissionTtsHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null) {
    super(message);
    this.name = "MissionTtsHttpError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(response: Response): number | null {
  const raw = response.headers?.get?.("Retry-After");
  if (raw === null || raw === undefined || raw.trim() === "") return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

const abortError = () => new DOMException("The request was aborted.", "AbortError");
const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

interface RenderedAudio {
  blob: Blob;
  renderedRate: number;
}

interface TtsRequest {
  text: string;
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  usage: "learning" | "mission";
}

interface Flight {
  promise: Promise<RenderedAudio>;
  controller: AbortController;
  waiters: number;
  settled: boolean;
}

// Identical concurrent requests share one network call. Each caller waits on the
// flight with its own signal; the call is cancelled only when nobody is left.
const flights = new Map<string, Flight>();

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
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

type RequestHeaders = Awaited<ReturnType<typeof speakingRequestHeaders>>;

function startFlight(
  key: string,
  request: TtsRequest,
  owner: SpeakingRequestOwner | undefined,
  credentials?: Promise<RequestHeaders>,
): Flight {
  const controller = new AbortController();
  const flight: Flight = {
    controller,
    waiters: 0,
    settled: false,
    promise: Promise.resolve(null as unknown as RenderedAudio),
  };
  flight.promise = (async () => {
    const headers = await (credentials ?? speakingRequestHeaders(owner, controller.signal));
    if (controller.signal.aborted) throw abortError();
    const response = await fetch("/api/mission-tts", {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new MissionTtsHttpError(
        payload?.error ?? "Google voice generation failed.",
        response.status,
        parseRetryAfterSeconds(response),
      );
    }
    const blob = await response.blob();
    const reported = Number(response.headers.get("X-TTS-Rendered-Rate") ?? request.speakingRate);
    const renderedRate = Number.isFinite(reported) ? reported : request.speakingRate;
    void storeTtsAudio(request, renderedRate, blob, owner?.userId);
    return { blob, renderedRate };
  })().finally(() => {
    flight.settled = true;
    if (flights.get(key) === flight) flights.delete(key);
  });
  flight.promise.catch(() => undefined);
  flights.set(key, flight);
  return flight;
}

async function fetchRenderedAudio(
  request: TtsRequest,
  owner: SpeakingRequestOwner | undefined,
  signal: AbortSignal,
  credentials?: Promise<RequestHeaders>,
): Promise<RenderedAudio> {
  const key = JSON.stringify([
    request.usage,
    request.voiceName,
    request.languageCode,
    request.speakingRate,
    request.text.trim(),
    owner?.userId ?? "",
  ]);
  for (let attempt = 0; ; attempt += 1) {
    if (signal.aborted) throw abortError();
    const flight = flights.get(key) ?? startFlight(key, request, owner, credentials);
    flight.waiters += 1;
    try {
      return await raceAbort(flight.promise, signal);
    } catch (error) {
      // The flight was cancelled by its starter, not by us: start our own once.
      if (attempt === 0 && !signal.aborted && isAbortError(error)) continue;
      throw error;
    } finally {
      flight.waiters -= 1;
      if (flight.waiters === 0 && !flight.settled) {
        flight.controller.abort();
        if (flights.get(key) === flight) flights.delete(key);
      }
    }
  }
}

const PREFETCH_INTERVAL_MS = 2500;
const PREFETCH_MAX_ITEMS = 8;

/**
 * Warm the audio cache for upcoming words, one request per 2.5 s so it never
 * competes with the per-minute rate limit. Stops at the first failure.
 */
export async function prefetchTts(
  items: Array<Omit<TtsRequest, "usage"> & { usage?: TtsRequest["usage"] }>,
  { owner, signal }: { owner?: SpeakingRequestOwner; signal?: AbortSignal } = {},
): Promise<number> {
  let fetched = 0;
  const seen = new Set<string>();
  const controller = new AbortController();
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward, { once: true });
  try {
    for (const item of items.slice(0, PREFETCH_MAX_ITEMS)) {
      const request: TtsRequest = { ...item, usage: item.usage ?? "learning" };
      const dedupe = `${request.voiceName}|${request.languageCode}|${request.speakingRate}|${request.text.trim()}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      if (controller.signal.aborted || (owner && !owner.isCurrent())) break;
      if (await lookupTtsAudio(request, owner?.userId)) continue;
      try {
        await fetchRenderedAudio(request, owner, controller.signal);
        fetched += 1;
      } catch {
        break;
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, PREFETCH_INTERVAL_MS);
        controller.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    }
  } finally {
    signal?.removeEventListener("abort", forward);
  }
  return fetched;
}

export async function speakMissionTts({
  text,
  voiceName,
  languageCode,
  speakingRate,
  usage = "mission",
  onPlaybackStart,
  signal,
  owner,
}: {
  text: string;
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  usage?: "learning" | "mission";
  onPlaybackStart?: () => void;
  signal?: AbortSignal;
  owner?: SpeakingRequestOwner;
}) {
  if (signal?.aborted || (owner && !owner.isCurrent()))
    throw new DOMException("The request was aborted.", "AbortError");
  stopMissionTts();
  const controller = new AbortController();
  const generation = playbackGeneration;
  activeController = controller;
  const ownsGeneration = () => generation === playbackGeneration;
  const current = () =>
    ownsGeneration() && !controller.signal.aborted && (!owner || owner.isCurrent());
  const checkCurrent = () => {
    if (!current()) throw new DOMException("The request was aborted.", "AbortError");
  };

  const abortOwnedPlayback = () => {
    if (ownsGeneration()) stopMissionTts();
  };
  signal?.addEventListener("abort", abortOwnedPlayback, { once: true });
  try {
    // Audio rendered before never changes: play it from the device with no network.
    const request: TtsRequest = { text, voiceName, languageCode, speakingRate, usage };
    // Ask for credentials up front (a local session read) so a miss pays no extra delay.
    const credentials = speakingRequestHeaders(owner, controller.signal);
    credentials.catch(() => undefined);
    const cached = await lookupTtsAudio(request, owner?.userId);
    checkCurrent();
    let rendered: RenderedAudio;
    let cacheKey: string | null = null;
    if (cached) {
      rendered = cached;
      cacheKey = cached.key;
    } else {
      rendered = await fetchRenderedAudio(request, owner, controller.signal, credentials);
      checkCurrent();
    }

    const audio = audioElement();
    const { blob, renderedRate } = rendered;
    activeObjectUrl = URL.createObjectURL(blob);
    audio.src = activeObjectUrl;
    audio.playbackRate = renderedRate === speakingRate ? 1 : speakingRate;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (!ownsGeneration()) return;
        audio.onended = null;
        audio.onerror = null;
        finishActivePlayback = null;
        releaseObjectUrl();
      };
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (!current()) reject(new DOMException("The request was aborted.", "AbortError"));
        else if (error) reject(error);
        else resolve();
      };
      finishActivePlayback = () =>
        finish(new DOMException("The request was aborted.", "AbortError"));
      audio.onended = () => finish();
      audio.onerror = () => {
        // A stored clip that will not decode is dropped so the next play fetches a fresh one.
        if (cacheKey && current()) void forgetTtsAudio(cacheKey, owner?.userId);
        finish(new Error("The generated audio could not play."));
      };
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
