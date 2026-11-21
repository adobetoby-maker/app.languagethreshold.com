// Built by TAC — 2026-11-21
// Accent choices of a language, read from its pack (pack.speech.accents). Kept out of
// src/state/speech-state.tsx so views can import them without the speech provider.

import { PACKS, packFor, type LanguagePack } from "@/data/language-packs/registry";
import { defaultAccentTag } from "@/lib/language-pack-text";
import type { Language } from "@/state/app-state";

export interface AccentOption {
  code: string;
  label: string;
}

/** "Costa Rica · default", "México (es-MX)": the pack's accent label, made unambiguous. */
function accentLabel(entry: LanguagePack["speech"]["accents"][number], pack: LanguagePack): string {
  // A legacy adapter's label is the bare tag: name the region from the tag instead.
  const region = entry.tag.split("-").at(-1) ?? "";
  const base =
    entry.label === entry.tag
      ? (new Intl.DisplayNames(["en"], { type: "region" }).of(region.toUpperCase()) ?? entry.tag)
      : entry.label;
  if (entry.default && pack.speech.accents.length > 1) return `${base} · default`;
  return base.includes("·") ? base : `${base} (${entry.tag})`;
}

function accentOptions(pack: LanguagePack): AccentOption[] {
  return pack.speech.accents.map((entry) => ({ code: entry.tag, label: accentLabel(entry, pack) }));
}

const NO_ACCENTS: AccentOption[] = [];

/** Accent choices per registered language (pack.speech.accents), keyed by the stored display name. */
export const ACCENTS_BY_LANGUAGE = Object.fromEntries(
  PACKS.map((pack) => [pack.name, accentOptions(pack)]),
) as Record<Language, AccentOption[]>;

/**
 * The region a voice locale names ("es-MX" -> "México"): the pack's accent label without its
 * "· note" suffix, else the region Intl knows for the tag, else the tag itself.
 */
export function accentRegionName(locale: string): string {
  const pack = PACKS.find((item) => item.speech.accents.some((entry) => entry.tag === locale));
  const entry = pack?.speech.accents.find((item) => item.tag === locale);
  if (entry && entry.label !== entry.tag) return entry.label.split(" · ")[0];
  const region = locale.split("-").at(-1) ?? "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(region.toUpperCase()) ?? locale;
  } catch {
    return locale;
  }
}

/** The accent choices of a language; empty (the picker hides, voices stay unavailable) for an unregistered one. */
export function accentsFor(language: string): AccentOption[] {
  const pack = packFor(language);
  return pack ? (ACCENTS_BY_LANGUAGE[pack.name as Language] ?? NO_ACCENTS) : NO_ACCENTS;
}

/** The accent a language starts on (the pack's default), or "" when it has none. */
export function defaultAccentFor(language: string): string {
  const pack = packFor(language);
  return (pack && defaultAccentTag(pack)) || "";
}
