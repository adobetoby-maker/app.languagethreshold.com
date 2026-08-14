const CORE_SPEAKING_ENTRY_KEY = "lt.speaking.open-core";

export function requestCoreSpeakingEntry() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CORE_SPEAKING_ENTRY_KEY, "1");
}

export function consumeCoreSpeakingEntry() {
  if (typeof window === "undefined") return false;
  const requested = window.sessionStorage.getItem(CORE_SPEAKING_ENTRY_KEY) === "1";
  window.sessionStorage.removeItem(CORE_SPEAKING_ENTRY_KEY);
  return requested;
}
