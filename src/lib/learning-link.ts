/** Apply assignment links after the saved profile, once for each signed-in identity. */
export function learningLinkIdentity({
  hydrated,
  authLoading,
  userId,
  profileReadyUserId,
  appliedFor,
}: {
  hydrated: boolean;
  authLoading: boolean;
  userId: string | null;
  profileReadyUserId: string | null;
  appliedFor: string | null;
}) {
  if (!hydrated || authLoading) return null;
  if (userId && profileReadyUserId !== userId) return null;
  const identity = userId ?? "guest";
  return appliedFor === identity ? null : identity;
}

/** Exam/support return links preserve the assessed language pair and exact activity. */
export function moduleLessonUrl({
  moduleId,
  target,
  native,
  lesson,
  way,
  planId,
}: {
  moduleId: string;
  target: string;
  native: string;
  lesson?: number;
  way?: string;
  planId?: string;
}) {
  const params = new URLSearchParams({ module: moduleId, tab: "core30", target, native });
  if (lesson !== undefined && Number.isInteger(lesson) && lesson > 0)
    params.set("lesson", String(lesson));
  if (way && ["see", "recall", "hear", "type", "say", "write"].includes(way))
    params.set("way", way);
  if (planId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId))
    params.set("plan", planId);
  return "/?" + params.toString();
}
export function requestedLesson(params: URLSearchParams, moduleId: string, total: number) {
  if (params.get("module") !== moduleId || params.get("tab") !== "core30") return null;
  const raw = params.get("lesson");
  if (!raw || !/^\d+$/.test(raw)) return null;
  const lesson = Number(raw);
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > total) return null;
  const way = params.get("way");
  return {
    lesson,
    way: way && ["see", "recall", "hear", "type", "say", "write"].includes(way) ? way : "see",
  };
}
