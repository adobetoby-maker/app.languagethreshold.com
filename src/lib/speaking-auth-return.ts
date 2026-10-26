export function speakingMissionId(value: string | null): string | null {
  return value && /^[a-z0-9][a-z0-9_.-]{0,199}$/i.test(value) ? value : null;
}

type SpeakingContext = { moduleId: string | null; target: string; native: string };

/** Only public catalog selection survives authentication, never a conversation or consent. */
export function speakingAuthMission(current: string, context: SpeakingContext): string | null {
  const url = new URL(current, "https://speaking-return.invalid");
  if (
    url.pathname !== "/" ||
    url.searchParams.get("tab") !== "speak" ||
    url.searchParams.get("module") !== (context.moduleId ?? "core") ||
    url.searchParams.get("target") !== context.target ||
    url.searchParams.get("native") !== context.native
  )
    return null;
  return speakingMissionId(url.searchParams.get("mission"));
}

export function rememberSpeakingAuthMission(id: string, context: SpeakingContext) {
  try {
    if (!speakingMissionId(id)) return;
    const url = new URL(window.location.href);
    if (url.pathname !== "/") return;
    url.searchParams.set("tab", "speak");
    url.searchParams.set("module", context.moduleId ?? "core");
    url.searchParams.set("target", context.target);
    url.searchParams.set("native", context.native);
    url.searchParams.set("mission", id);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* Signing in still works when browser history is unavailable. */
  }
}

export function clearSpeakingAuthMission() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("mission")) return;
    url.searchParams.delete("mission");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* A return marker must never block leaving a mission. */
  }
}

const SPEAKING_AUTH_NAVIGATION_KEY = "lt.speaking.auth-navigation.v1";
const AUTH_NAVIGATION_TTL = 15 * 60_000;

function speakingNavigationPath(path: string): string | null {
  const url = new URL(path, "https://speaking-return.invalid");
  const mission = speakingMissionId(url.searchParams.get("mission"));
  if (url.pathname !== "/" || url.searchParams.get("tab") !== "speak" || !mission) return null;
  const params = new URLSearchParams({ tab: "speak" });
  for (const key of ["module", "target", "native"] as const) {
    const value = url.searchParams.get(key);
    if (!value || value.length > 80 || (key === "module" && !/^[a-z0-9][a-z0-9-]*$/i.test(value)))
      return null;
    params.set(key, value);
  }
  params.set("mission", mission);
  return "/?" + params;
}

/** A short-lived, tab-local public destination survives the profile restoration race. */
export function rememberSpeakingAuthNavigation(path: string, now = Date.now()) {
  try {
    clearSpeakingAuthNavigation();
    const destination = speakingNavigationPath(path);
    if (!destination) return;
    window.sessionStorage.setItem(
      SPEAKING_AUTH_NAVIGATION_KEY,
      JSON.stringify({ path: destination, expiresAt: now + AUTH_NAVIGATION_TTL }),
    );
  } catch {
    /* Browser storage must never prevent authentication. */
  }
}

export function clearSpeakingAuthNavigation() {
  try {
    window.sessionStorage.removeItem(SPEAKING_AUTH_NAVIGATION_KEY);
  } catch {
    /* unavailable */
  }
}

export function consumeSpeakingAuthNavigation(now = Date.now()): string | null {
  try {
    const raw = window.sessionStorage.getItem(SPEAKING_AUTH_NAVIGATION_KEY);
    clearSpeakingAuthNavigation();
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (
      typeof saved.path !== "string" ||
      typeof saved.expiresAt !== "number" ||
      saved.expiresAt <= now ||
      saved.expiresAt > now + AUTH_NAVIGATION_TTL
    )
      return null;
    if (!saved.path.startsWith("/?") || saved.path.length > 1024) return null;
    return speakingNavigationPath(saved.path);
  } catch {
    return null;
  }
}
