// Built by TAC — 2026-10-22
// Friendly names, accents and gender for the site voice, plus the one-tap
// woman/man pick used by the Reader quick switch. Pure helpers (no DOM, no
// aliases) so node tests can import them directly.

import { encodeGoogleVoicePreference, type GoogleTtsVoice } from "./mission-tts.ts";

export type VoiceGender = "woman" | "man";

export interface VoiceIdentity {
  /** The value stored as the voice preference: an encoded Google voice or a device voiceURI. */
  id: string;
  kind: "google" | "device";
  /** Provider name, e.g. "es-US-Neural2-A" or "Paulina". Never shown as-is when it is an ID. */
  rawName: string;
  locale: string;
  gender: VoiceGender | null;
}

export interface VoiceLabel {
  name: string;
  /** "Mexico", "US Spanish", "UK" */
  accent: string;
  /** "MX", "US", "UK" */
  accentShort: string;
  /** "Mexican Spanish", "US Spanish", "British English" */
  accentSpoken: string;
  /** "Lucía · Mexico" */
  long: string;
  /** "Lucía · MX" */
  short: string;
  /** "Voice: Lucía, Mexican Spanish, woman. Change voice" */
  aria: string;
}

const ACCENT_OVERRIDES: Record<string, { accent: string; short: string; spoken?: string }> = {
  "es-US": { accent: "US Spanish", short: "US", spoken: "US Spanish" },
  "es-419": { accent: "Latin America", short: "LatAm" },
  "en-US": { accent: "US", short: "US" },
  "en-GB": { accent: "UK", short: "UK" },
};

function canonicalLocale(locale: string): string {
  const [language = "", region] = locale.trim().replace(/_/g, "-").split("-");
  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
}

function displayName(type: "region" | "language", code: string): string | null {
  try {
    const name = new Intl.DisplayNames(["en"], { type }).of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
}

/** Accent words for a locale: "es-MX" → Mexico / MX / Mexican Spanish. */
export function voiceAccent(locale: string): {
  accent: string;
  accentShort: string;
  accentSpoken: string;
} {
  const canonical = canonicalLocale(locale);
  const [language, region] = canonical.split("-");
  const override = ACCENT_OVERRIDES[canonical];
  const spoken =
    override?.spoken ?? displayName("language", canonical) ?? displayName("language", language);
  if (!region) {
    const languageName = displayName("language", language) ?? language.toUpperCase();
    return {
      accent: languageName,
      accentShort: language.toUpperCase(),
      accentSpoken: spoken ?? languageName,
    };
  }
  const accent = override?.accent ?? displayName("region", region) ?? region;
  return {
    accent,
    accentShort: override?.short ?? (region === "GB" ? "UK" : region),
    accentSpoken: spoken ?? accent,
  };
}

const RAW_ID = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,4})?-/;
const VENDOR_PREFIX = /^(?:Microsoft|Google|Apple|Amazon)\s+/i;

function genderWord(gender: VoiceGender | null): string {
  return gender === "woman" ? "Woman" : gender === "man" ? "Man" : "Voice";
}

/**
 * A human-sounding name for a voice. Google IDs such as "es-US-Chirp3-HD-Aoede"
 * become "Aoede"; letter voices such as "es-MX-Neural2-A" become "Woman A".
 * Device names drop vendor and locale noise ("Microsoft Sabina - Spanish (Mexico)"
 * → "Sabina"). A raw voice ID is never returned.
 */
export function friendlyVoiceName(
  voice: Pick<VoiceIdentity, "kind" | "rawName" | "gender">,
): string {
  const raw = voice.rawName.trim();
  if (voice.kind === "google" || RAW_ID.test(raw)) {
    const suffix = raw.split("-").at(-1) ?? "";
    if (/^[A-Za-z]{3,}$/.test(suffix)) {
      return suffix.charAt(0).toUpperCase() + suffix.slice(1);
    }
    if (/^[A-Za-z0-9]{1,2}$/.test(suffix))
      return `${genderWord(voice.gender)} ${suffix.toUpperCase()}`;
    return voice.gender ? genderWord(voice.gender) : "Cloud voice";
  }
  const cleaned = raw
    .replace(VENDOR_PREFIX, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+Online$/i, "")
    .replace(/\s+(?:Female|Male)$/i, "")
    .trim();
  const firstChar = cleaned.charAt(0);
  const looksLikeName =
    cleaned.length > 0 &&
    cleaned.length <= 24 &&
    cleaned.split(/\s+/).length <= 2 &&
    firstChar === firstChar.toLocaleUpperCase() &&
    firstChar !== firstChar.toLocaleLowerCase();
  if (looksLikeName) return cleaned;
  if (voice.gender) return genderWord(voice.gender);
  const vendor = raw.match(VENDOR_PREFIX)?.[0].trim();
  return vendor ? `${vendor} voice` : "Device voice";
}

export function formatVoiceLabel(voice: VoiceIdentity): VoiceLabel {
  const name = friendlyVoiceName(voice);
  const { accent, accentShort, accentSpoken } = voiceAccent(voice.locale);
  const genderPart = voice.gender ? `, ${voice.gender}` : "";
  return {
    name,
    accent,
    accentShort,
    accentSpoken,
    long: `${name} · ${accent}`,
    short: `${name} · ${accentShort}`,
    aria: `Voice: ${name}, ${accentSpoken}${genderPart}. Change voice`,
  };
}

export function googleVoiceGender(voice: Pick<GoogleTtsVoice, "ssmlGender">): VoiceGender | null {
  return voice.ssmlGender === "FEMALE" ? "woman" : voice.ssmlGender === "MALE" ? "man" : null;
}

export function googleVoiceIdentity(voice: GoogleTtsVoice): VoiceIdentity | null {
  const locale = voice.languageCodes[0];
  if (!locale) return null;
  return {
    id: encodeGoogleVoicePreference(voice),
    kind: "google",
    rawName: voice.name,
    locale,
    gender: googleVoiceGender(voice),
  };
}

// Browser voices do not report gender. These are the common Apple, Microsoft
// and Chrome voices; anything unknown is left out of the woman/man switch.
const DEVICE_WOMEN = new Set([
  "paulina",
  "mónica",
  "monica",
  "marisol",
  "angélica",
  "angelica",
  "francisca",
  "isabela",
  "soledad",
  "jimena",
  "sabina",
  "helena",
  "laura",
  "dalia",
  "elvira",
  "elena",
  "lucía",
  "lucia",
  "esperanza",
  "valeria",
  "camila",
  "samantha",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "victoria",
  "allison",
  "ava",
  "susan",
  "serena",
  "kate",
  "zira",
  "hazel",
  "aria",
  "jenny",
  "amélie",
  "amelie",
  "audrey",
  "aurélie",
  "aurelie",
  "marie",
  "anna",
  "petra",
  "alice",
  "federica",
  "luciana",
  "joana",
  "catarina",
  "kyoko",
  "o-ren",
  "yuna",
  "sara",
  "flo",
  "grandma",
  "sandy",
  "shelley",
  "tingting",
  "meijia",
  "sinji",
]);
const DEVICE_MEN = new Set([
  "jorge",
  "juan",
  "diego",
  "carlos",
  "raul",
  "raúl",
  "pablo",
  "alvaro",
  "álvaro",
  "alex",
  "daniel",
  "fred",
  "tom",
  "aaron",
  "arthur",
  "gordon",
  "oliver",
  "rishi",
  "thomas",
  "nicolas",
  "markus",
  "yannick",
  "luca",
  "felipe",
  "otoya",
  "hattori",
  "eddy",
  "reed",
  "rocko",
  "grandpa",
  "ralph",
  "david",
  "mark",
  "george",
  "guy",
  "ryan",
  "jacques",
  "henri",
]);

export function deviceVoiceGender(name: string): VoiceGender | null {
  if (/\bfemale\b/i.test(name)) return "woman";
  if (/\bmale\b/i.test(name)) return "man";
  const first = name
    .trim()
    .replace(VENDOR_PREFIX, "")
    .split(/[\s(-]/)[0]
    ?.toLocaleLowerCase();
  if (!first) return null;
  if (DEVICE_WOMEN.has(first)) return "woman";
  if (DEVICE_MEN.has(first)) return "man";
  return null;
}

export function deviceVoiceIdentity(
  voice: Pick<SpeechSynthesisVoice, "name" | "lang" | "voiceURI">,
): VoiceIdentity {
  return {
    id: voice.voiceURI,
    kind: "device",
    rawName: voice.name,
    locale: voice.lang,
    gender: deviceVoiceGender(voice.name),
  };
}

function sameLocale(a: string, b: string): boolean {
  return canonicalLocale(a) === canonicalLocale(b);
}

/**
 * The best voice of `gender` from `candidates`, which arrive in the existing
 * preferred-locale order (Google ranking first, then device ranking). A voice
 * in the same locale as the current one wins, then one of the same kind
 * (cloud or device), then list order.
 */
export function pickVoiceByGender(
  candidates: VoiceIdentity[],
  gender: VoiceGender,
  current: Pick<VoiceIdentity, "locale" | "kind"> | null,
): VoiceIdentity | null {
  let best: VoiceIdentity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate, index) => {
    if (candidate.gender !== gender) return;
    const score =
      (current && sameLocale(candidate.locale, current.locale) ? 0 : 2) * candidates.length * 2 +
      (current && candidate.kind === current.kind ? 0 : 1) * candidates.length +
      index;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
}

export interface GenderSwitchState {
  woman: VoiceIdentity | null;
  man: VoiceIdentity | null;
  /** The pressed side: the current voice's gender, or the only gender available. */
  selected: VoiceGender | null;
}

export function genderSwitchState(
  candidates: VoiceIdentity[],
  current: VoiceIdentity | null,
): GenderSwitchState {
  const pickFor = (gender: VoiceGender) =>
    current?.gender === gender ? current : pickVoiceByGender(candidates, gender, current);
  const woman = pickFor("woman");
  const man = pickFor("man");
  const selected = current?.gender ?? (woman && !man ? "woman" : man && !woman ? "man" : null);
  return { woman, man, selected };
}
