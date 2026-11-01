import type { TabKey } from "@/state/app-state";
export type NavigationVersion = "sections" | "accordion" | "focused";
export type NavigationGroup = "Learn" | "Practice" | "Reference";
export const NAVIGATION_GROUPS: NavigationGroup[] = ["Learn", "Practice", "Reference"];
const LEARN = new Set<TabKey>([
  "modules",
  "core30",
  "reader",
  "story",
  "guide",
  "dashboard",
  "exams",
  "missionary",
  "orthopedics",
]);
const REFERENCE = new Set<TabKey>(["grammar", "dictionary", "cognates", "patterns", "characters"]);
export function navigationGroup(key: TabKey): NavigationGroup {
  return LEARN.has(key) ? "Learn" : REFERENCE.has(key) ? "Reference" : "Practice";
}
export const PRIMARY_NAVIGATION = new Set<TabKey>([
  "modules",
  "core30",
  "reader",
  "story",
  "speak",
  "flashcards",
  "fieldPrep",
  "games",
  "grammar",
  "dictionary",
  "cognates",
]);
export function navigationVersion(search: string, environment: string): NavigationVersion {
  // Design comparison is confined to preview/development; no customer-facing chooser.
  if (environment !== "preview" && environment !== "development") return "sections";
  const value = new URLSearchParams(search).get("navVersion");
  return value === "accordion" || value === "focused" ? value : "sections";
}

const TOOL_ORDER: TabKey[] = [
  "reader",
  "core30",
  "story",
  "modules",
  "guide",
  "dashboard",
  "exams",
  "missionary",
  "orthopedics",
  "speak",
  "flashcards",
  "fieldPrep",
  "games",
  "penpal",
  "listeningDrill",
  "conjugation",
  "sentenceBuild",
  "wordMatch",
  "idiomMaster",
  "falseFriends",
  "anatomy",
  "kana",
  "discussions",
  "grammar",
  "dictionary",
  "cognates",
  "patterns",
  "characters",
];
export function navigationRank(key: TabKey): number {
  const rank = TOOL_ORDER.indexOf(key);
  return rank === -1 ? TOOL_ORDER.length : rank;
}
