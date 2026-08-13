import type { MissionPartnerVersion, MissionTtsSpeed } from "@/data/mission-tts";
import { speakingRequestHeaders } from "@/lib/speaking-client";

export interface MissionTtsCapabilities {
  provider: "google-cloud-tts";
  ready: boolean;
  supportedLanguages: ["Spanish"];
  voices: Record<MissionPartnerVersion, { name: string; label: string }>;
  speakingRates: number[];
}

let sharedAudio: HTMLAudioElement | null = null;
let activeController: AbortController | null = null;
let activeObjectUrl: string | null = null;
let finishActivePlayback: (() => void) | null = null;

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

export async function getMissionTtsCapabilities(signal?: AbortSignal) {
  const response = await fetch("/api/mission-tts", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Google partner voices are unavailable.");
  return (await response.json()) as MissionTtsCapabilities;
}

export async function speakMissionTts({
  text,
  partnerVersion,
  speakingRate,
  language,
}: {
  text: string;
  partnerVersion: MissionPartnerVersion;
  speakingRate: MissionTtsSpeed;
  language: "Spanish";
}) {
  stopMissionTts();
  const controller = new AbortController();
  activeController = controller;

  const response = await fetch("/api/mission-tts", {
    method: "POST",
    headers: await speakingRequestHeaders(),
    body: JSON.stringify({ text, partnerVersion, speakingRate, language }),
    signal: controller.signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Google partner voice generation failed.");
  }

  const audio = audioElement();
  const blob = await response.blob();
  if (controller.signal.aborted) return;
  activeObjectUrl = URL.createObjectURL(blob);
  audio.src = activeObjectUrl;
  audio.playbackRate = 1;
  activeController = null;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
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
    finishActivePlayback = () => finish();
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error("The generated partner audio could not play."));
    audio.play().catch((error) => {
      finish(error);
    });
  });
}
