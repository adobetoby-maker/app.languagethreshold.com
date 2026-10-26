/**
 * The Core card directions describe the learner's languages, not a fixed English/Spanish pair.
 * Legacy LessonWord fields are named `en` and `es`, but hold native and target text respectively.
 */
export type LessonCardDirection = "native-to-target" | "target-to-native";

export function lessonCardFaces(
  word: { en: string; es: string },
  direction: LessonCardDirection,
): {
  front: { text: string; role: "native" | "target" };
  back: { text: string; role: "native" | "target" };
} {
  const native = { text: word.en, role: "native" as const };
  const target = { text: word.es, role: "target" as const };
  return direction === "native-to-target"
    ? { front: native, back: target }
    : { front: target, back: native };
}
