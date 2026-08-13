export type MissionPartnerVersion = "woman" | "man";

export const MISSION_TTS_SPEEDS = [0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5] as const;

export type MissionTtsSpeed = (typeof MISSION_TTS_SPEEDS)[number];

export const MISSION_TTS_VOICES: Record<
  MissionPartnerVersion,
  { name: string; languageCode: "es-US"; label: string }
> = {
  woman: {
    name: "es-US-Neural2-A",
    languageCode: "es-US",
    label: "Google Neural2 · woman",
  },
  man: {
    name: "es-US-Neural2-B",
    languageCode: "es-US",
    label: "Google Neural2 · man",
  },
};

export function isMissionTtsSpeed(value: number): value is MissionTtsSpeed {
  return MISSION_TTS_SPEEDS.some((speed) => speed === value);
}
