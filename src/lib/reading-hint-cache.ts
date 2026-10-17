/** Sentence readings can include private books/transcripts; callers supply an owned store. */
export type ReadingHintFormat = "furigana" | "pinyin" | "romaja";
export interface ReadingHintSegment {
  base: string;
  hiragana?: string;
  romaji?: string;
  pinyin?: string;
  romaja?: string;
}
interface Entry {
  text: string;
  segments: ReadingHintSegment[];
}
export const MAX_READING_HINT_ENTRIES = 80;
const fields: Record<ReadingHintFormat, readonly string[]> = {
  furigana: ["base", "hiragana", "romaji"],
  pinyin: ["base", "pinyin"],
  romaja: ["base", "romaja"],
};
export function validReadingHints(
  value: unknown,
  format: ReadingHintFormat,
  text: string,
): value is ReadingHintSegment[] {
  return (
    text.length > 0 &&
    text.length <= 2000 &&
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 2000 &&
    value.every(
      (segment) =>
        segment &&
        typeof segment === "object" &&
        typeof segment.base === "string" &&
        segment.base.length > 0 &&
        segment.base.length <= 2000 &&
        Object.entries(segment).every(
          ([key, reading]) =>
            fields[format].includes(key) &&
            typeof reading === "string" &&
            reading.length <= (key === "base" ? 2000 : 120),
        ),
    ) &&
    value.map((segment) => segment.base).join("") === text
  );
}
function entries(value: unknown, format: ReadingHintFormat): Entry[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("entries" in value) ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX_READING_HINT_ENTRIES
  )
    return [];
  return value.entries.filter(
    (entry): entry is Entry =>
      entry &&
      typeof entry.text === "string" &&
      validReadingHints(entry.segments, format, entry.text),
  );
}
export function readReadingHints(value: unknown, format: ReadingHintFormat, text: string) {
  return entries(value, format).find((entry) => entry.text === text)?.segments ?? null;
}
export function addReadingHints(
  value: unknown,
  format: ReadingHintFormat,
  text: string,
  segments: unknown,
) {
  if (!validReadingHints(segments, format, text)) return null;
  return {
    entries: [
      ...entries(value, format).filter((entry) => entry.text !== text),
      { text, segments },
    ].slice(-MAX_READING_HINT_ENTRIES),
  };
}
