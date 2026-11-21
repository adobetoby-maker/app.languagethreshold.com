// Built by TAC — 2026-11-21
import type { LanguagePack } from "./types.ts";
import { specialLetters } from "../../lib/language-pack-text.ts";

/**
 * Typing-field placeholders a pack has authored in its own language. The pack schema has no UI
 * string block yet (model section 5), so this is an authored table keyed by pack code, like
 * PREVIEW_SAMPLES in VoicePicker. A pack with no row gets the English wording with its name.
 * The Spanish row keeps the placeholders Spanish learners saw before packs.
 */
const TYPING_PLACEHOLDERS: Record<string, { typeIn: string; typeForm: string }> = {
  es: { typeIn: "Escribe en español", typeForm: "Escribe la forma" },
};

export function typeInPlaceholder(pack: LanguagePack | null, fallbackName: string): string {
  return (pack && TYPING_PLACEHOLDERS[pack.code]?.typeIn) || `Type in ${pack?.name ?? fallbackName}`;
}

export function typeFormPlaceholder(pack: LanguagePack | null): string {
  return (pack && TYPING_PLACEHOLDERS[pack.code]?.typeForm) || "Type the form";
}

/**
 * Letter buttons under a course cloze check. The Spanish course check has always offered the
 * six letters its answers use (no ü); every other pack offers its keyboard letters (none for an
 * IME script).
 */
const CLOZE_LETTERS: Record<string, readonly string[]> = {
  es: ["á", "é", "í", "ó", "ú", "ñ"],
};

export function clozeLetters(pack: LanguagePack): readonly string[] {
  return CLOZE_LETTERS[pack.code] ?? specialLetters(pack);
}
