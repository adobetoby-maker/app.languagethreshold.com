// Voice selection for browser SpeechSynthesis.
// Preference order:
//   1. The exact voice the user picked (by voiceURI), if it still matches the locale.
//   2. A Google-branded voice for the locale (Chrome ships "Google español", "Google français", etc.).
//   3. A Google-branded voice for the language family (e.g. "es" when locale is "es-MX").
//   4. Any voice for the locale.
//   5. Any voice for the language family.

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
  const exact = all.filter((v) => v.lang.toLowerCase() === locale.toLowerCase());
  const fam = all.filter(
    (v) => v.lang.toLowerCase().startsWith(family + "-") && !exact.includes(v),
  );
  // Sort: Google voices first, then by name
  const score = (v: SpeechSynthesisVoice) => (v.name.includes("Google") ? 0 : 1);
  return [...exact, ...fam].sort((a, b) => {
    const s = score(a) - score(b);
    return s !== 0 ? s : a.name.localeCompare(b.name);
  });
}

export function pickVoice(
  locale: string,
  preferredVoiceURI?: string | null,
): SpeechSynthesisVoice | null {
  const candidates = getVoicesForLocale(locale);
  if (preferredVoiceURI) {
    const match = candidates.find((v) => v.voiceURI === preferredVoiceURI);
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
