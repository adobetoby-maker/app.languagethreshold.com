// Built by TAC — 2026-10-21
// Verb Games: the Verbs sub-route under the Games tab, kept in the URL search string.

import { FAMILIES, isFamilyId } from "./families.ts";
import { modeFromKey, modeKey, orderFamilies } from "./rules.ts";
import type { FamilyId, GameId, RoundMode } from "./types.ts";

/**
 * `families` is set only for two or more picked patterns (then `family` is "mix"); `mode` only for
 * a count or forever round. A single-pattern timed route has the exact shape it always had.
 */
export type VerbScreen =
  | { screen: "home" }
  | { screen: "pick"; game: GameId; family: FamilyId | "mix" | null; families?: FamilyId[] }
  | {
      screen: "play";
      game: GameId;
      family: FamilyId | "mix";
      families?: FamilyId[];
      level: 1 | 2 | 3 | 4 | null;
      mode?: RoundMode;
    }
  | { screen: "board"; game: GameId; scope: string | null }
  | { screen: "unit"; family: FamilyId };

export const VERB_ROUTE_PARAMS = ["verbs", "vgame", "vfamily", "vfamilies", "vlevel", "vmode", "vscope"] as const;

const HOME: VerbScreen = { screen: "home" };
const MAX_SCOPE_LENGTH = 64;

function gameOf(value: string | null): GameId | null {
  return value === "bubble" || value === "crush" ? value : null;
}

/** "mix" or a known family id; anything else is null. */
function familyOrMix(value: string | null): FamilyId | "mix" | null {
  return value === "mix" || isFamilyId(value) ? value : null;
}

type Pick = { family: FamilyId | "mix"; families?: FamilyId[] };

/**
 * `vfamilies=a,b`: 1 to 7 known family ids, no repeats (FAMILIES order on the way out). One id is
 * the same as `vfamily`. Null for anything else, including both params at once.
 */
function familiesOf(raw: string, rawFamily: string | null): Pick | null {
  if (rawFamily !== null) return null;
  const ids = raw.split(",");
  if (ids.length < 1 || ids.length > FAMILIES.length) return null;
  if (!ids.every((id) => isFamilyId(id)) || new Set(ids).size !== ids.length) return null;
  const ordered = orderFamilies(ids as FamilyId[]);
  return ordered.length === 1 ? { family: ordered[0] as FamilyId } : { family: "mix", families: ordered };
}

/** Parses the Verbs sub-route from a search string; anything invalid is the home screen. */
export function parseVerbRoute(search: string): VerbScreen {
  const p = new URLSearchParams(search ?? "");
  const game = gameOf(p.get("vgame"));
  const rawFamily = p.get("vfamily");
  const rawFamilies = p.get("vfamilies");
  const multi = rawFamilies === null ? undefined : familiesOf(rawFamilies, rawFamily);
  if (multi === null) return HOME;
  switch (p.get("verbs")) {
    case "pick": {
      if (!game) return HOME;
      if (multi) return { screen: "pick", game, ...multi };
      if (rawFamily === null) return { screen: "pick", game, family: null };
      const family = familyOrMix(rawFamily);
      return family ? { screen: "pick", game, family } : HOME;
    }
    case "play": {
      const family = familyOrMix(rawFamily);
      const pick: Pick | null = multi ?? (family ? { family } : null);
      if (!game || !pick) return HOME;
      const rawMode = p.get("vmode");
      const mode = rawMode === null ? null : modeFromKey(rawMode);
      if (rawMode !== null && mode === null) return HOME;
      const extra = mode && mode.kind !== "timed" ? { mode } : {};
      const rawLevel = p.get("vlevel");
      if (rawLevel === null) return { screen: "play", game, ...pick, level: null, ...extra };
      const level = rawLevel === "1" || rawLevel === "2" || rawLevel === "3" || rawLevel === "4" ? (Number(rawLevel) as 1 | 2 | 3 | 4) : null;
      return level ? { screen: "play", game, ...pick, level, ...extra } : HOME;
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
 * Where "practice this pattern" goes: that family's five-step pattern series (`verbs=unit`).
 * The home ladder tiles and the round recap's Practice button both use it, so they never drift apart.
 */
export function practiceScreen(family: FamilyId): VerbScreen {
  return { screen: "unit", family };
}

/** "a,b" for two or more families (FAMILIES order), else null (the route uses `vfamily`). */
function multiOf(families: readonly FamilyId[] | undefined): string | null {
  const ordered = orderFamilies(families ?? []);
  return ordered.length > 1 ? ordered.join(",") : null;
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
      if (multiOf(screen.families)) p.set("vfamilies", multiOf(screen.families) as string);
      else if (screen.family) p.set("vfamily", screen.family);
      break;
    case "play": {
      p.set("verbs", "play");
      p.set("vgame", screen.game);
      if (multiOf(screen.families)) p.set("vfamilies", multiOf(screen.families) as string);
      else p.set("vfamily", screen.family);
      if (screen.level) p.set("vlevel", String(screen.level));
      const mode = screen.mode ? modeKey(screen.mode) : "";
      if (mode) p.set("vmode", mode);
      break;
    }
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
