export function readerSelectionScope(moduleId: string | null, target: string, native: string) {
  return JSON.stringify([moduleId ?? "", target, native]);
}

/** A deliberate text choice survives remounts, but not a change of learning context. */
export function moduleReaderSelection({
  ready,
  scope,
  savedScope,
  selectedId,
  selected,
  target,
  firstLessonId,
  lessonPassageId,
}: {
  ready: boolean;
  scope: string;
  savedScope: string | null;
  selectedId: string;
  selected: { available: boolean; language: string; section: string } | undefined;
  target: string;
  firstLessonId: string | undefined;
  lessonPassageId: string | null;
}): string | null {
  if (!ready || !firstLessonId || selectedId === lessonPassageId) return null;
  if (
    selected?.available &&
    selected.language === target &&
    (savedScope === scope || (savedScope === null && selected.section === "custom"))
  )
    return null;
  return firstLessonId === selectedId ? null : firstLessonId;
}
