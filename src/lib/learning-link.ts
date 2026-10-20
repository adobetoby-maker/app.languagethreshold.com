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

/** Keep refresh/share aligned with the visible Core 30 runner without adding history entries. */
export function lessonLocation(
  current: string,
  context: { moduleId: string; target: string; native: string },
  position: { lesson: number; way: string } | null,
): string | null {
  if (!context.moduleId || !context.target || !context.native) return null;
  if (
    position &&
    (!Number.isInteger(position.lesson) ||
      position.lesson < 1 ||
      !["see", "recall", "hear", "type", "say", "write"].includes(position.way))
  )
    return null;
  const url = new URL(current, "https://lesson.invalid");
  if (url.pathname !== "/") return null;
  const params = url.searchParams;
  const sameTrack =
    params.get("module") === context.moduleId &&
    params.get("target") === context.target &&
    params.get("native") === context.native;
  // A plan belongs to its enrollment's module and pair, not the next module selected.
  if (!sameTrack) params.delete("plan");
  params.set("module", context.moduleId);
  params.set("target", context.target);
  params.set("native", context.native);
  params.set("tab", "core30");
  if (position) {
    params.set("lesson", String(position.lesson));
    params.set("way", position.way);
  } else {
    params.delete("lesson");
    params.delete("way");
  }
  return url.pathname + url.search + url.hash;
}

/** A cached Core 30 screen must not replace a different incoming route during profile restore. */
export function lessonOverviewLocation(
  current: string,
  context: { moduleId: string; target: string; native: string },
) {
  const params = new URL(current, "https://lesson.invalid").searchParams;
  if (
    params.get("tab") !== "core30" ||
    params.get("module") !== context.moduleId ||
    params.get("target") !== context.target ||
    params.get("native") !== context.native
  )
    return null;
  return lessonLocation(current, context, null);
}
export function canRestoreLessonReturn(
  current: string,
  context: { moduleId: string; target: string; native: string },
) {
  const params = new URL(current, "https://lesson.invalid").searchParams;
  return Object.entries({
    module: context.moduleId,
    target: context.target,
    native: context.native,
    tab: "core30",
  }).every(([key, value]) => !params.has(key) || params.get(key) === value);
}

/**
 * Where the address must point so a Core 30 return marker is accepted: the lesson and way the
 * learner left, on the marker's own module and the learner's current language pair.
 */
export function lessonReturnLocation(
  current: string,
  marker: { moduleId: string; lesson: number; section: string },
  languages: { target: string; native: string },
) {
  return lessonLocation(
    current,
    { moduleId: marker.moduleId, target: languages.target, native: languages.native },
    { lesson: marker.lesson, way: marker.section },
  );
}

/**
 * Point the browser address at the lesson a return marker names, before switching to the Core 30
 * tab. While it still says another tab (Speak or Reader), canRestoreLessonReturn refuses the
 * marker as a stale link and the learner lands on the overview. No history entry is added.
 */
export function pointAddressAtLessonReturn(
  marker: { moduleId: string; lesson: number; section: string },
  languages: { target: string; native: string },
) {
  const next = lessonReturnLocation(window.location.href, marker, languages);
  if (next) window.history.replaceState(window.history.state, "", next);
}
