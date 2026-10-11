import { googleVoicesForLocale, type GoogleTtsVoice } from "./mission-tts.ts";

// An explicit device choice must survive reloads and must not be replaced by
// the automatic iPhone cloud recommendation.
export const DEVICE_DEFAULT_VOICE = "device:default";

export function shouldAutoSelectMobileVoice({
  ios,
  signedIn,
  providerReady,
  settingsHydrated,
  preference,
}: {
  ios: boolean;
  signedIn: boolean;
  providerReady: boolean;
  settingsHydrated: boolean;
  preference: string | null;
}): boolean {
  return ios && signedIn && providerReady && settingsHydrated && preference === null;
}

export function preferredMobileCloudVoice(
  voices: GoogleTtsVoice[],
  locale: string,
): GoogleTtsVoice | null {
  const compatible = googleVoicesForLocale(voices, locale);
  // googleVoicesForLocale already ranks Latin American locales ahead of Spain
  // and ranks quality tiers within each locale. Do not jump to a Spain HD voice
  // just because the best available Latin American voice has a lower tier.
  return compatible[0] ?? null;
}
