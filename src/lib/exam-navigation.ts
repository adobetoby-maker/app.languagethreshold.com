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
  });
}
