export const LANGUAGE_THRESHOLD_GA_ID = "G-RP0TZ1MP7E";

declare global {
  interface Window {
    __languageThresholdSpeakingPrivacy?: boolean;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function setSpeakingPrivacyMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.__languageThresholdSpeakingPrivacy = enabled;
  window[`ga-disable-${LANGUAGE_THRESHOLD_GA_ID}`] = enabled;
}

export function isSpeakingPrivacyMode() {
  return typeof window !== "undefined" && window.__languageThresholdSpeakingPrivacy === true;
}
