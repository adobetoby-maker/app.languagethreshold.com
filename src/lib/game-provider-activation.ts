import type { TabKey } from "@/state/app-state";
const GAME_TABS = new Set<TabKey>([
  "games",
  "conjugation",
  "sentenceBuild",
  "listeningDrill",
  "wordMatch",
  "idiomMaster",
  "falseFriends",
]);
export function needsGameProviders(tab: TabKey): boolean {
  return GAME_TABS.has(tab);
}
