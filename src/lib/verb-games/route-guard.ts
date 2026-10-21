// Built by TAC — 2026-10-21
// Verb Games: cross-checks a parsed Verbs route against the data, so a hand-edited URL can never
// reach a screen with an impossible config. Every rejected route falls back to the Verbs home.

import { frameSlots } from "./pool.ts";
import { boardScopes, levelAvailable, roundFamilies } from "./rules.ts";
import type { VerbScreen } from "./verb-route.ts";
import type { PatternData, SourceFilter } from "./types.ts";

const HOME: VerbScreen = { screen: "home" };

/**
 * `parseVerbRoute` checks each param on its own; this checks them together. Falls back to home for:
 * a Crush round with no level, a level that is missing or not available for the family and source,
 * a Bubble round that has a level (or no frames), and a board scope that is not in `boardScopes`.
 * Never throws.
 */
export function guardVerbRoute(route: VerbScreen, data: PatternData, source: SourceFilter): VerbScreen {
  try {
    if (route.screen === "play") {
      if (route.game === "bubble") {
        if (route.level !== null) return HOME;
        const config = { game: "bubble", family: route.family, level: null, source, seed: 0, listMode: false, reducedMotion: false } as const;
        return frameSlots(data, roundFamilies(config, data), "family", source).length > 0 ? route : HOME;
      }
      if (route.level === null) return HOME;
      const row = data.crushLevels.find((l) => l.level === route.level);
      if (!row || !levelAvailable(data, row, route.family, source)) return HOME;
      return route;
    }
    if (route.screen === "board") {
      if (route.scope === null) return route;
      return boardScopes(route.game, data).some((s) => s.key === route.scope) ? route : HOME;
    }
    return route;
  } catch {
    return HOME;
  }
}
