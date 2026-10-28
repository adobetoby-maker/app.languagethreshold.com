import { VERB_ROUTE_PARAMS } from "./verb-games/verb-route.ts";

/** One tab vocabulary for app state and refreshable root-page links. */
export const APP_TABS = [
  "missionary",
  "orthopedics",
  "reader",
  "grammar",
  "speak",
  "discussions",
  "dashboard",
  "anatomy",
  "modules",
  "kana",
  "characters",
  "conjugation",
  "sentenceBuild",
  "games",
  "listeningDrill",
  "wordMatch",
  "idiomMaster",
  "falseFriends",
  "soccer",
  "baseball",
  "orEvs",
  "fmg",
  "penpal",
  "patterns",
  "cognates",
  "story",
  "guide",
  "core30",
  "exams",
  "climbing",
  "fishing",
  "fieldPrep",
  "dictionary",
  "flashcards",
] as const;
export type AppTab = (typeof APP_TABS)[number];
export function appTab(value: string | null): AppTab | null {
  return value !== null && (APP_TABS as readonly string[]).includes(value)
    ? (value as AppTab)
    : null;
}

export function appNavigationLocation(
  current: string,
  context: {
    ready: boolean;
    moduleId: string | null;
    target: string;
    native: string;
    tab: AppTab;
  },
): string | null {
  if (!context.ready || !context.target || !context.native || !appTab(context.tab)) return null;
  const url = new URL(current, "https://navigation.invalid");
  if (url.pathname !== "/") return null;
  const params = url.searchParams;
  const sameTrack =
    params.get("module") === (context.moduleId ?? "core") &&
    params.get("target") === context.target &&
    params.get("native") === context.native;
  if (!sameTrack) params.delete("plan");
  if (!sameTrack || context.tab !== "speak" || params.get("tab") !== "speak")
    params.delete("mission");
  // Lesson position belongs only to the current Core 30 module/pair. The runner owns
  // changes within that position; other tools must not leave stale lesson/way markers.
  if (!sameTrack || context.tab !== "core30" || params.get("tab") !== "core30") {
    params.delete("lesson");
    params.delete("way");
    params.delete("focus");
  }
  // The Verbs sub-route lives only under the Games tab.
  if (context.tab !== "games") for (const key of VERB_ROUTE_PARAMS) params.delete(key);
  // An explicit Core link must not inherit a specialty from another learner's profile.
  params.set("module", context.moduleId ?? "core");
  params.set("target", context.target);
  params.set("native", context.native);
  params.set("tab", context.tab);
  return url.pathname + url.search + url.hash;
}
