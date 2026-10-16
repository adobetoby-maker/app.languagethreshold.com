/** Stable lesson objective identity shared by practice, speaking and assessment mappings. */
export function lessonObjectiveId(moduleId: string, lessonNumber: number): string {
  if (
    !/^[a-z][a-z0-9-]{0,79}$/.test(moduleId) ||
    !Number.isInteger(lessonNumber) ||
    lessonNumber < 1 ||
    lessonNumber > 1000
  )
    throw new Error("Invalid lesson identity.");
  return `${moduleId}.lesson.${lessonNumber}`;
}
