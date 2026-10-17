import { appTab } from "./app-navigation.ts";
import { examsLocation, legacyExamsLocation, examLessonNumber } from "./exam-navigation.ts";
import {
  LANGUAGES,
  NATIVE_LANGUAGES,
  type Language,
  type NativeLanguage,
} from "../data/languages.ts";

const AUTH_RETURN_KEY = "lt_auth_return";
const AUTH_RETURN_MS = 15 * 60 * 1000;
const RETURN_PATHS = new Set([
  "/module-request",
  "/team",
  "/owner",
  "/account",
  "/exam-content",
  "/exam-reviewers",
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type ReturnStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** App-owned relative destinations only. Never persist credentials or an arbitrary return URL. */
export function authReturnPath(value: string): string | null {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > 4096 ||
    value.includes("\\") ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return null;
  const url = new URL(value, "https://auth-return.invalid");
  if (url.pathname === "/exams") {
    return examsLocation({
      moduleId: url.searchParams.get("module"),
      target: url.searchParams.get("target") ?? "Spanish",
      native: url.searchParams.get("native") ?? "English",
      orgId: url.searchParams.get("org"),
      attemptId: url.searchParams.get("attempt"),
      returnPlanId: url.searchParams.get("fromPlan"),
      lesson: examLessonNumber(url.searchParams.get("lesson")),
      way: url.searchParams.get("way"),
      review: url.searchParams.get("review") === "1" || url.searchParams.get("review") === "true",
    });
  }
  if (url.pathname === "/") {
    const legacy = legacyExamsLocation(value);
    if (legacy) return legacy;
    const tab = appTab(url.searchParams.get("tab"));
    if (!tab) return null;
    const params = new URLSearchParams({ tab });
    const moduleId = url.searchParams.get("module"),
      target = url.searchParams.get("target"),
      native = url.searchParams.get("native");
    if (moduleId && /^[a-z0-9][a-z0-9-]{0,79}$/i.test(moduleId)) params.set("module", moduleId);
    if (target && LANGUAGES.includes(target as Language)) params.set("target", target);
    if (native && NATIVE_LANGUAGES.includes(native as NativeLanguage)) params.set("native", native);
    const lesson = url.searchParams.get("lesson"),
      way = url.searchParams.get("way"),
      plan = url.searchParams.get("plan");
    if (
      tab === "core30" &&
      lesson &&
      /^\d+$/.test(lesson) &&
      Number(lesson) >= 1 &&
      Number(lesson) <= 30
    ) {
      params.set("lesson", String(Number(lesson)));
      if (way && ["see", "recall", "hear", "type", "say", "write"].includes(way))
        params.set("way", way);
    }
    if (plan && uuid.test(plan)) params.set("plan", plan);
    return "/?" + params.toString();
  }
  if (!RETURN_PATHS.has(url.pathname)) return null;
  if (url.pathname === "/team") {
    const org = url.searchParams.get("org");
    if (org && uuid.test(org)) return "/team?" + new URLSearchParams({ org });
  }
  return url.pathname;
}

/** OAuth/email callbacks stay on the current app origin and, when supported, the focused page. */
export function authenticationRedirectUrl(currentHref: string): string {
  const url = new URL(currentHref);
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("Unsupported sign-in origin.");
  // Invitation tokens belong to this existing private acceptance route, never a general return marker.
  if (url.pathname === "/team/accept") {
    const token = url.searchParams.get("token");
    return url.origin + url.pathname + (token ? "?" + new URLSearchParams({ token }) : "");
  }
  return url.origin + (authReturnPath(url.pathname + url.search) ?? "/");
}

export function browserAuthReturnStorage(): ReturnStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function rememberAuthReturn(value: string, storage: ReturnStorage | null, now = Date.now()) {
  try {
    storage?.removeItem(AUTH_RETURN_KEY);
    const pathname = authReturnPath(value);
    if (pathname)
      storage?.setItem(
        AUTH_RETURN_KEY,
        JSON.stringify({ pathname, expiresAt: now + AUTH_RETURN_MS }),
      );
  } catch {
    // Storage restrictions must never prevent a learner from signing in.
  }
}

export function consumeAuthReturn(
  current: string,
  hasSession: boolean,
  storage: ReturnStorage | null,
  now = Date.now(),
) {
  if (!hasSession) return null;
  try {
    const saved = storage?.getItem(AUTH_RETURN_KEY);
    if (!saved) return null;
    storage?.removeItem(AUTH_RETURN_KEY);
    const { pathname: returnPath, expiresAt } = JSON.parse(saved);
    const landing = new URL(current, "https://auth-return.invalid");
    // A direct callback or another explicit incoming page wins. Do not bounce a later logo click.
    if (landing.pathname !== "/" || landing.search) return null;
    if (
      typeof returnPath !== "string" ||
      typeof expiresAt !== "number" ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now ||
      expiresAt > now + AUTH_RETURN_MS
    )
      return null;
    return authReturnPath(returnPath);
  } catch {
    return null;
  }
}

export function clearAuthReturn(storage: ReturnStorage | null) {
  try {
    storage?.removeItem(AUTH_RETURN_KEY);
  } catch {
    // The sign-in result is more important than clearing this short-lived marker.
  }
}
