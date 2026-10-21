// Built by TAC — 2026-10-21
// Verb Games: the Verbs sub-route under the Games tab, kept in the URL search string.

import { isFamilyId } from "./families.ts";
import type { FamilyId, GameId } from "./types.ts";

export type VerbScreen =
  | { screen: "home" }
  | { screen: "pick"; game: GameId; family: FamilyId | "mix" | null }
  | { screen: "play"; game: GameId; family: FamilyId | "mix"; level: 1 | 2 | 3 | 4 | null }
  | { screen: "board"; game: GameId; scope: string | null }
  | { screen: "unit"; family: FamilyId };

export const VERB_ROUTE_PARAMS = ["verbs", "vgame", "vfamily", "vlevel", "vscope"] as const;

const HOME: VerbScreen = { screen: "home" };
const MAX_SCOPE_LENGTH = 64;

function gameOf(value: string | null): GameId | null {
  return value === "bubble" || value === "crush" ? value : null;
}

/** "mix" or a known family id; anything else is null. */
function familyOrMix(value: string | null): FamilyId | "mix" | null {
  return value === "mix" || isFamilyId(value) ? value : null;
}

/** Parses the Verbs sub-route from a search string; anything invalid is the home screen. */
export function parseVerbRoute(search: string): VerbScreen {
  const p = new URLSearchParams(search ?? "");
  const game = gameOf(p.get("vgame"));
  const rawFamily = p.get("vfamily");
  switch (p.get("verbs")) {
    case "pick": {
      if (!game) return HOME;
      if (rawFamily === null) return { screen: "pick", game, family: null };
      const family = familyOrMix(rawFamily);
      return family ? { screen: "pick", game, family } : HOME;
    }
    case "play": {
      const family = familyOrMix(rawFamily);
      if (!game || !family) return HOME;
      const rawLevel = p.get("vlevel");
      if (rawLevel === null) return { screen: "play", game, family, level: null };
      const level = rawLevel === "1" || rawLevel === "2" || rawLevel === "3" || rawLevel === "4" ? (Number(rawLevel) as 1 | 2 | 3 | 4) : null;
      return level ? { screen: "play", game, family, level } : HOME;
    }
    case "board": {
      if (!game) return HOME;
      const scope = p.get("vscope");
      if (scope === null) return { screen: "board", game, scope: null };
      return scope.length > 0 && scope.length <= MAX_SCOPE_LENGTH ? { screen: "board", game, scope } : HOME;
    }
    case "unit":
      return isFamilyId(rawFamily) ? { screen: "unit", family: rawFamily } : HOME;
    default:
      return HOME;
  }
}

/**
 * Where "practice this pattern" goes: the Bubble Pop picker with that family preselected.
 * The home ladder tiles and the round recap's Practice button both use it, so they never drift apart.
 * When the pattern unit page lands, change this one function to return { screen: "unit", family }.
 */
export function practiceScreen(family: FamilyId): VerbScreen {
  return { screen: "pick", game: "bubble", family };
}

/** Returns "?…" with every non-verb param kept and the verb params replaced by `screen`. */
export function verbRouteSearch(search: string, screen: VerbScreen): string {
  const p = new URLSearchParams(search ?? "");
  for (const key of VERB_ROUTE_PARAMS) p.delete(key);
  switch (screen.screen) {
    case "home":
      break;
    case "pick":
      p.set("verbs", "pick");
      p.set("vgame", screen.game);
      if (screen.family) p.set("vfamily", screen.family);
      break;
    case "play":
      p.set("verbs", "play");
      p.set("vgame", screen.game);
      p.set("vfamily", screen.family);
      if (screen.level) p.set("vlevel", String(screen.level));
      break;
    case "board":
      p.set("verbs", "board");
      p.set("vgame", screen.game);
      if (screen.scope) p.set("vscope", screen.scope);
      break;
    case "unit":
      p.set("verbs", "unit");
      p.set("vfamily", screen.family);
      break;
  }
  const out = p.toString();
  return out ? `?${out}` : "";
}
