// Built by TAC — 2026-10-22
import { decodeGoogleVoicePreference } from "@/data/mission-tts";
import { getVoicesForLocale } from "@/lib/voices";

/**
 * True when this device cannot say a form: no speech engine, or no installed voice for the locale
 * and no server voice picked. A picked server voice is never "missing" here; if it fails to play,
 * the speak call reports the error instead.
 */
export function noVoiceFor(locale: string, voiceURI: string | null | undefined): boolean {
  if (decodeGoogleVoicePreference(voiceURI ?? null)) return false;
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !window.speechSynthesis) return true;
  return getVoicesForLocale(locale).length === 0;
}
