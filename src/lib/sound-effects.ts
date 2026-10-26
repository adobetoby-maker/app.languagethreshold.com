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

/** A clear, original two-note chime, generated locally after an explicit click/keypress. */
export async function playFlashcardSuccess() {
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
    for (const [index, frequency] of [784, 988].entries()) {
      const note = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.085;
      note.type = "sine";
      note.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      note.connect(gain);
      gain.connect(context.destination);
      note.start(start);
      note.stop(start + 0.16);
      if (index === 1) note.onended = release;
    }
  } catch {
    // Audio availability must never block grading or navigation.
    release();
  }
}
