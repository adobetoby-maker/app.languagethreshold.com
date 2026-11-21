// Voice selection for browser SpeechSynthesis.
// Preference order:
//   1. The exact voice the user picked (by voiceURI), if it still matches the locale.
//   2. A Google-branded voice for the locale (Chrome ships "Google español", "Google français", etc.).
//   3. A Google-branded voice for the language family (e.g. "es" when locale is "es-MX").
//   4. Any voice for the locale.
//   5. Any voice for the language family.

import {
  decodeGoogleVoicePreference,
  packForVoiceLocale,
  voiceLocaleRank,
} from "@/data/mission-tts";

/**
 * Device voices a pack prefers by name when the browser offers them (the pack schema has no
 * speech.preferredDeviceVoices field yet, so this is an authored table keyed by pack code).
 * Spanish keeps Paulina, a nearby Latin American voice, ahead of the browser's first Spain voice.
 */
const PREFERRED_DEVICE_VOICES: Record<string, readonly string[]> = { es: ["Paulina"] };

const LISTENERS = new Set<() => void>();
let cached: SpeechSynthesisVoice[] = [];
let refreshing = false;

function refresh() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (refreshing) return;
  refreshing = true;
  const next = window.speechSynthesis.getVoices();
  const changed = next.length !== cached.length;
  cached = next;
  if (changed) {
    // Notify listeners asynchronously to avoid calling setState during render.
    Promise.resolve().then(() => {
      LISTENERS.forEach((cb) => cb());
    });
  }
  refreshing = false;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  refresh();
  // Voices load asynchronously in Chrome.
  window.speechSynthesis.onvoiceschanged = refresh;
}

export function getAllVoices(): SpeechSynthesisVoice[] {
  if (cached.length === 0) refresh();
  return cached;
}

export function subscribeVoices(cb: () => void): () => void {
  LISTENERS.add(cb);
  return () => {
    LISTENERS.delete(cb);
  };
}

export function getVoicesForLocale(locale: string): SpeechSynthesisVoice[] {
  const all = getAllVoices();
  const family = locale.split("-")[0].toLowerCase();
  const pack = packForVoiceLocale(locale);
  const preferred = (pack && PREFERRED_DEVICE_VOICES[pack.code]) ?? [];
  const exact = all.filter((v) => v.lang.toLowerCase() === locale.toLowerCase());
  const familyMatches = all.filter((v) => v.lang.toLowerCase().startsWith(family + "-"));
  // Prefer the requested locale. Without it, fall back in the pack's accent order (Spanish: a
  // nearby Latin American voice is less surprising than the browser's first Spain voice).
  const score = (v: SpeechSynthesisVoice) => {
    if (preferred.includes(v.name)) return 0;
    if (v.name.includes("Google")) return 1;
    if (/^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley) \(/.test(v.name)) return 3;
    return 2;
  };
  return (exact.length > 0 ? exact : familyMatches).sort((a, b) => {
    if (exact.length === 0 && pack) {
      const localeOrder = voiceLocaleRank(a.lang, pack) - voiceLocaleRank(b.lang, pack);
      if (localeOrder !== 0) return localeOrder;
    }
    const s = score(a) - score(b);
    return s !== 0 ? s : a.name.localeCompare(b.name);
  });
}

export function pickVoice(
  locale: string,
  preferredVoiceURI?: string | null,
): SpeechSynthesisVoice | null {
  const candidates = getVoicesForLocale(locale);
  // Callers with owned settings pass them explicitly; no legacy device-wide read.
  const preference = preferredVoiceURI;
  if (preference && !decodeGoogleVoicePreference(preference)) {
    const match = candidates.find((v) => v.voiceURI === preference);
    if (match) return match;
  }
  return candidates[0] ?? null;
}

/**
 * Apply locale + Google-voice preference to an utterance, then return it.
 * Always sets `lang` so OS fallback still works if no JS voice is found.
 */
export function configureUtterance(
  u: SpeechSynthesisUtterance,
  locale: string,
  preferredVoiceURI?: string | null,
): SpeechSynthesisUtterance {
  u.lang = locale;
  const v = pickVoice(locale, preferredVoiceURI);
  if (v) u.voice = v;
  return u;
}
