/** Device-only UI preference. Never stores learning history or changes spoken audio. */
const KEY = "lt.sound-effects.v1";
export const SOUND_EFFECTS_EVENT = "lt:sound-effects-changed";
let fallback = true;
const active = new Set<AudioContext>();

export function soundEffectsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const value = window.localStorage.getItem(KEY);
    return value === null ? fallback : value !== "off";
  } catch {
    return fallback;
  }
}

export function setSoundEffectsEnabled(enabled: boolean) {
  fallback = enabled;
  try {
    window.localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    /* device storage unavailable */
  }
  if (!enabled) {
    for (const context of active) void context.close().catch(() => {});
    active.clear();
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SOUND_EFFECTS_EVENT));
}

export function subscribeSoundEffects(update: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) update();
  };
  window.addEventListener(SOUND_EFFECTS_EVENT, update);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SOUND_EFFECTS_EVENT, update);
    window.removeEventListener("storage", onStorage);
  };
}

export type RewardSound = "cash" | "good-job";

type Tone = {
  frequency: number;
  start: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
};
// A soft "cha" followed by a bright bell with quiet metallic partials.
const CASH_TONES: Tone[] = [
  { frequency: 1800, start: 0, duration: 0.045, volume: 0.025, type: "triangle" },
  { frequency: 1046.5, start: 0.065, duration: 0.25, volume: 0.075 },
  { frequency: 2093, start: 0.065, duration: 0.18, volume: 0.02 },
  { frequency: 1567.98, start: 0.13, duration: 0.48, volume: 0.1 },
  { frequency: 3135.96, start: 0.13, duration: 0.26, volume: 0.02 },
];
// A warmer ascending major chord for an encouraging "good job" response.
const GOOD_JOB_TONES: Tone[] = [
  { frequency: 523.25, start: 0, duration: 0.17, volume: 0.1 },
  { frequency: 659.25, start: 0.09, duration: 0.17, volume: 0.1 },
  { frequency: 783.99, start: 0.18, duration: 0.26, volume: 0.11 },
];

/** Original UI sounds, synthesized locally only after a learner action. */
export async function playFlashcardSuccess(sound: RewardSound = "cash") {
  if (typeof window === "undefined" || !soundEffectsEnabled()) return;
  const Audio =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return;
  let context: AudioContext | undefined;
  const release = () => {
    if (!context) return;
    active.delete(context);
    if (context.state !== "closed") void context.close().catch(() => {});
  };
  try {
    // One short sound at a time. No audio files, network calls, microphone or speech cancellation.
    for (const previous of active) void previous.close().catch(() => {});
    active.clear();
    context = new Audio();
    active.add(context);
    if (context.state === "suspended") await context.resume();
    if (!soundEffectsEnabled() || context.state === "closed") {
      release();
      return;
    }
    const now = context.currentTime;
    // End cleanup belongs to the longest ringing tone, not the last scheduled tone.
    const tones = [...(sound === "good-job" ? GOOD_JOB_TONES : CASH_TONES)].sort(
      (a, b) => a.start + a.duration - (b.start + b.duration),
    );
    for (const [index, tone] of tones.entries()) {
      const note = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.start;
      note.type = tone.type ?? "sine";
      note.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(tone.volume, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      note.connect(gain);
      gain.connect(context.destination);
      note.start(start);
      note.stop(start + tone.duration + 0.01);
      if (index === tones.length - 1) note.onended = release;
    }
  } catch {
    // Audio availability must never block grading or navigation.
    release();
  }
}
