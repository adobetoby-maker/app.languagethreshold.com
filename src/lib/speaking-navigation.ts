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

const SPEAKING_MISSION_REQUEST_KEY = "lt.speaking.open-mission";

/** Ask the Speak tab to open the first mission whose id starts with `missionIdPrefix`. */
export function requestSpeakingMission(missionIdPrefix: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SPEAKING_MISSION_REQUEST_KEY, missionIdPrefix);
  } catch {
    // sessionStorage can be blocked; the learner just lands on the mission catalog.
  }
}

/** Returns the pending mission id prefix once, then clears it. */
export function consumeSpeakingMissionRequest(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const prefix = window.sessionStorage.getItem(SPEAKING_MISSION_REQUEST_KEY);
    window.sessionStorage.removeItem(SPEAKING_MISSION_REQUEST_KEY);
    return prefix || null;
  } catch {
    return null;
  }
}
