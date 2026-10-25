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
