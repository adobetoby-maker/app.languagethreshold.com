// Built by TAC — 2026-11-21
import type { LanguagePack } from "./types.ts";
import { appData } from "./app-data.ts";
import { specialLetters } from "../../lib/language-pack-text.ts";

/**
 * Typing-field placeholders a language has written in its own words (app/<code>.json
 * typingPlaceholders). A language with none gets the English wording with its name.
 */
export function typeInPlaceholder(pack: LanguagePack | null, fallbackName: string): string {
  return (pack && appData(pack).typingPlaceholders?.typeIn) || `Type in ${pack?.name ?? fallbackName}`;
}

export function typeFormPlaceholder(pack: LanguagePack | null): string {
  return (pack && appData(pack).typingPlaceholders?.typeForm) || "Type the form";
}

/**
 * Letter buttons under a course cloze check: the letters the language's app file names for its
 * course answers, otherwise its keyboard letters (none for an IME script).
 */
export function clozeLetters(pack: LanguagePack): readonly string[] {
  return appData(pack).clozeLetters ?? specialLetters(pack);
}
