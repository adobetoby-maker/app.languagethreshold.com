import type { SoundFamily } from "../data/sound-like-a-native.ts";
export type SoundPattern = "patter" | "switch" | "example" | "reverse" | "shuffle";
export interface SoundUnit {
  text: string;
  cue: string;
  anchor: string;
}
/** Sound cues and conventional target-language spelling are distinct fields. */
export function buildSoundPattern(
  family: SoundFamily,
  pattern: SoundPattern,
  random = Math.random,
): SoundUnit[] {
  if (family.syllables.length !== 5 || family.anchors.length !== 5)
    throw new Error("A five-vowel family is required.");
  let indices =
    pattern === "switch"
      ? [0, 2, 0, 2, 4]
      : pattern === "example"
        ? [0, 2, 2, 1, 3]
        : pattern === "reverse"
          ? [3, 1, 4, 2, 0]
          : [0, 2, 4, 1, 3];
  if (pattern === "shuffle") {
    indices = [...indices];
    for (let i = indices.length - 1; i > 0; i--) {
      const draw = random();
      const j = Math.min(i, Math.max(0, Math.floor(draw * (i + 1))));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }
  return indices.map((i) => ({
    text: family.syllables[i],
    cue: family.soundCues?.[i] ?? family.syllables[i],
    anchor: family.anchors[i],
  }));
}
export interface SoundPracticeRecord {
  completedRuns: number;
  selfCheckedRuns: number;
  best: Record<string, number>;
}
export function readSoundPracticeRecord(raw: unknown): SoundPracticeRecord {
  const empty = { completedRuns: 0, selfCheckedRuns: 0, best: {} };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Partial<SoundPracticeRecord>;
  if (
    !Number.isSafeInteger(r.completedRuns) ||
    r.completedRuns! < 0 ||
    !Number.isSafeInteger(r.selfCheckedRuns) ||
    r.selfCheckedRuns! < 0 ||
    r.selfCheckedRuns! > r.completedRuns!
  )
    return empty;
  const best: Record<string, number> = {};
  if (r.best && typeof r.best === "object" && !Array.isArray(r.best))
    for (const [key, rate] of Object.entries(r.best).slice(0, 100))
      if (key.length < 1000 && typeof rate === "number" && Number.isFinite(rate) && rate > 0)
        Object.defineProperty(best, key, {
          value: rate,
          enumerable: true,
          writable: true,
          configurable: true,
        });
  return { completedRuns: r.completedRuns!, selfCheckedRuns: r.selfCheckedRuns!, best };
}
/** A rate for manually assigned units, never a pronunciation or native-accent score. */
export function selfTimedRate(unitCount: number, elapsedMs: number): number | null {
  return Number.isInteger(unitCount) &&
    unitCount > 0 &&
    Number.isFinite(elapsedMs) &&
    elapsedMs >= 1000
    ? (unitCount * 60000) / elapsedMs
    : null;
}

/** Written accent marks carry sound/meaning contrasts in this course. */
export function soundSpellingMatches(input: string, target: string): boolean {
  const normalize = (text: string) =>
    text
      .normalize("NFC")
      .toLocaleLowerCase("es")
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const value = normalize(input);
  return !!value && value === normalize(target);
}
