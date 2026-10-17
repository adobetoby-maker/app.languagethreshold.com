import { moduleLessonUrl } from "./learning-link.ts";
import {
  LANGUAGES,
  NATIVE_LANGUAGES,
  type Language,
  type NativeLanguage,
} from "../data/languages.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Assessment entry uses its focused route, with no bearer credentials or arbitrary return URL. */
export function examsLocation(context: {
  moduleId?: string | null;
  target: string;
  native: string;
  orgId?: string | null;
  attemptId?: string | null;
  review?: boolean;
  returnPlanId?: string | null;
  lesson?: number;
  way?: string | null;
}): string {
  const params = new URLSearchParams({
    target: LANGUAGES.includes(context.target as Language) ? context.target : "Spanish",
    native: NATIVE_LANGUAGES.includes(context.native as NativeLanguage)
      ? context.native
      : "English",
  });
  if (context.moduleId && context.moduleId !== "core" && context.moduleId.length <= 80)
    params.set("module", context.moduleId);
  if (context.orgId && uuid.test(context.orgId)) params.set("org", context.orgId);
  if (context.attemptId && uuid.test(context.attemptId)) params.set("attempt", context.attemptId);
  if (context.review) params.set("review", "1");
  if (params.has("module")) {
    if (context.returnPlanId && uuid.test(context.returnPlanId))
      params.set("fromPlan", context.returnPlanId);
    const lesson = examLessonNumber(context.lesson);
    if (lesson !== undefined) {
      params.set("lesson", String(lesson));
      if (context.way && ["see", "recall", "hear", "type", "say", "write"].includes(context.way))
        params.set("way", context.way);
    }
  }
  return "/exams?" + params.toString();
}

/** Legacy app-tab links redirect before the public app and its analytics render. */
export function legacyExamsLocation(current: string): string | null {
  const url = new URL(current, "https://navigation.invalid");
  if (url.pathname !== "/" || url.searchParams.get("tab") !== "exams") return null;
  const params = url.searchParams;
  return examsLocation({
    moduleId: params.get("module"),
    target: params.get("target") ?? "Spanish",
    native: params.get("native") ?? "English",
    orgId: params.get("org"),
    attemptId: params.get("attempt"),
    review: params.get("review") === "1" || params.get("review") === "true",
    returnPlanId: params.get("fromPlan") ?? params.get("plan"),
    lesson: examLessonNumber(params.get("lesson")),
    way: params.get("way"),
  });
}

export function examLessonNumber(value: unknown): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(number) && number >= 1 && number <= 30 ? number : undefined;
}

/** Carry the visible runner only when its module and both languages match the navigation context. */
export function examsFromLessonLocation(
  current: string,
  context: Parameters<typeof examsLocation>[0],
) {
  const url = new URL(current, "https://lesson-entry.invalid"),
    params = url.searchParams;
  const same =
    url.pathname === "/" &&
    params.get("tab") === "core30" &&
    params.get("module") === context.moduleId &&
    params.get("target") === context.target &&
    params.get("native") === context.native;
  return examsLocation({
    ...context,
    ...(same
      ? {
          returnPlanId: params.get("plan"),
          lesson: examLessonNumber(params.get("lesson")),
          way: params.get("way"),
        }
      : {}),
  });
}

/** Return metadata is navigation, never an assessment grant or an arbitrary destination URL. */
export function examLessonReturn(context: Parameters<typeof examsLocation>[0]): string | null {
  const params = new URL(examsLocation(context), "https://lesson-return.invalid").searchParams;
  if (!params.has("module") || (!params.has("fromPlan") && !params.has("lesson"))) return null;
  return moduleLessonUrl({
    moduleId: params.get("module")!,
    target: params.get("target")!,
    native: params.get("native")!,
    planId: params.get("fromPlan") ?? undefined,
    lesson: examLessonNumber(params.get("lesson")),
    way: params.get("way") ?? undefined,
  });
}
