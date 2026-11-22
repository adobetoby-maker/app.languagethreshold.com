// Built by TAC — 2026-11-21
// Accent choices of a language. Kept out of src/state/speech-state.tsx so views can import them
// without the speech provider.
//
// Every language the PWA already taught keeps the accent list, order and labels it has always
// shown (LEGACY_ACCENTS, moved verbatim from speech-state.tsx). A language whose lessons come from
// its pack catalog (French, Italian) reads its accents from its pack (pack.speech.accents).

import { PACKS, packFor, type LanguagePack } from "@/data/language-packs/registry";
import { catalogLessonPack } from "@/data/language-packs/catalog-lessons";
import { defaultAccentTag } from "@/lib/language-pack-text";
import type { Language } from "@/state/app-state";

export interface AccentOption {
  code: string;
  label: string;
}

/** The accent lists the PWA has always shown, by stored language name. */
const LEGACY_ACCENTS: Record<string, AccentOption[]> = {
  Spanish: [
    { code: "es-CR", label: "Costa Rica · default" },
    { code: "es-MX", label: "México (es-MX)" },
    { code: "es-GT", label: "Guatemala (es-GT)" },
    { code: "es-CO", label: "Colombia (es-CO)" },
    { code: "es-PE", label: "Perú (es-PE)" },
    { code: "es-CL", label: "Chile (es-CL)" },
    { code: "es-AR", label: "Argentina (es-AR)" },
    { code: "es-419", label: "Latin America · general" },
    { code: "es-US", label: "US Spanish (es-US)" },
    { code: "es-ES", label: "Spain (es-ES)" },
  ],
  French: [
    { code: "fr-FR", label: "France (fr-FR)" },
    { code: "fr-CA", label: "Québec (fr-CA)" },
  ],
  German: [
    { code: "de-DE", label: "Germany (de-DE)" },
    { code: "de-AT", label: "Austria (de-AT)" },
    { code: "de-CH", label: "Switzerland (de-CH)" },
  ],
  Italian: [{ code: "it-IT", label: "Italy (it-IT)" }],
  Japanese: [{ code: "ja-JP", label: "Japan (ja-JP)" }],
  Chinese: [{ code: "zh-CN", label: "Mainland China (zh-CN)" }],
  Korean: [{ code: "ko-KR", label: "South Korea (ko-KR)" }],
  Portuguese: [
    { code: "pt-BR", label: "Brazil (pt-BR)" },
    { code: "pt-PT", label: "Portugal (pt-PT)" },
  ],
  Pashto: [{ code: "ps-AF", label: "Afghanistan (ps-AF)" }],
  English: [
    { code: "en-US", label: "United States (en-US)" },
    { code: "en-GB", label: "United Kingdom (en-GB)" },
    { code: "en-CA", label: "Canada (en-CA)" },
    { code: "en-IE", label: "Ireland (en-IE)" },
    { code: "en-AU", label: "Australia (en-AU)" },
    { code: "en-NZ", label: "New Zealand (en-NZ)" },
    { code: "en-ZA", label: "South Africa (en-ZA)" },
  ],
};

/** The device-voice region names the voice picker has always printed (any other locale: its tag). */
const LEGACY_REGION_NAMES: Record<string, string> = {
  "es-CR": "Costa Rica",
  "es-MX": "México",
  "es-GT": "Guatemala",
  "es-CO": "Colombia",
  "es-PE": "Perú",
  "es-CL": "Chile",
  "es-AR": "Argentina",
  "es-419": "Latin America",
  "es-US": "US Spanish",
  "es-ES": "Spain",
};

/** "France (fr-FR)", "Québec · default": a catalog pack's accent label, made unambiguous. */
function accentLabel(entry: LanguagePack["speech"]["accents"][number], pack: LanguagePack): string {
  if (entry.default && pack.speech.accents.length > 1) return `${entry.label} · default`;
  return entry.label.includes("·") ? entry.label : `${entry.label} (${entry.tag})`;
}

function accentOptions(pack: LanguagePack): AccentOption[] {
  if (catalogLessonPack(pack.code))
    return pack.speech.accents.map((entry) => ({ code: entry.tag, label: accentLabel(entry, pack) }));
  return LEGACY_ACCENTS[pack.name] ?? [];
}

const NO_ACCENTS: AccentOption[] = [];

/** Accent choices per registered language, keyed by the stored display name. */
export const ACCENTS_BY_LANGUAGE = Object.fromEntries(
  PACKS.map((pack) => [pack.name, accentOptions(pack)]),
) as Record<Language, AccentOption[]>;

/**
 * The region a voice locale names, as the voice picker prints it: the names it has always used,
 * a catalog pack's own accent label ("fr-CA" -> "Québec"), else the tag itself.
 */
export function accentRegionName(locale: string): string {
  const legacy = LEGACY_REGION_NAMES[locale];
  if (legacy) return legacy;
  const pack = PACKS.find(
    (item) =>
      catalogLessonPack(item.code) && item.speech.accents.some((entry) => entry.tag === locale),
  );
  const entry = pack?.speech.accents.find((item) => item.tag === locale);
  return entry && entry.label !== entry.tag ? entry.label.split(" · ")[0] : locale;
}

/** The accent choices of a language; empty (the picker hides, voices stay unavailable) for an unregistered one. */
export function accentsFor(language: string): AccentOption[] {
  const pack = packFor(language);
  return pack ? (ACCENTS_BY_LANGUAGE[pack.name as Language] ?? NO_ACCENTS) : NO_ACCENTS;
}

/**
 * The accent a language starts on: the first of the list it has always shown, or a catalog pack's
 * default accent. "" when it has none.
 */
export function defaultAccentFor(language: string): string {
  const pack = packFor(language);
  if (!pack) return "";
  if (catalogLessonPack(pack.code)) return defaultAccentTag(pack) ?? "";
  return accentsFor(pack.name)[0]?.code ?? "";
}
