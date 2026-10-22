// Built by TAC — 2026-10-21
// Verb Games round-mode text helpers (no JSX): eyebrow pattern part, goal titles, recap summaries.
import { familyById } from "@/lib/verb-games/families";
import { familyPick, modeOf } from "@/lib/verb-games/rules";
import type { CrushLevel, EndReason, FamilyId, RoundConfig, RoundMode, RoundResult } from "@/lib/verb-games/types";

/** The eyebrow's pattern part: "MIX", one family's label, or the picked families' pills joined. */
export function pickLabel(config: RoundConfig): string {
  const pick = familyPick(config);
  if (pick === "mix") return "MIX";
  if (pick.length === 1) return familyById(pick[0] as FamilyId).label;
  return pick.length === 2 ? pick.map((id) => familyById(id).pill).join(" + ") : `${pick.length} PATTERNS`;
}

/** "GAME · BUBBLE POP", plus the mode for a count or forever round ("GAME · VERB CRUSH · 10 WORDS"). */
export function recapEyebrow(config: RoundConfig): string {
  const game = config.game === "crush" ? "GAME · VERB CRUSH" : "GAME · BUBBLE POP";
  const mode = modeOf(config);
  if (mode.kind === "timed") return game;
  return `${game} · ${mode.kind === "count" ? `${mode.n} WORDS` : "FOREVER"}`;
}

/**
 * The Crush goal's title: the level label as is (timed), with the count's N in place of the level's
 * own number ("Make 10 yo forms"), or without a number in forever ("Make yo forms").
 */
export function goalTitle(level: CrushLevel, mode: RoundMode): string {
  if (mode.kind === "timed") return level.label;
  if (mode.kind === "count") return /\d+/.test(level.label) ? level.label.replace(/\d+/, String(mode.n)) : `${level.label} · ${mode.n} forms`;
  return level.label.replace(/^Make \d+ /, "Make ");
}

/** Round time as m:ss ("1:42"). */
export function roundTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Count rounds: "10 words in 1:42", or "4 of 10 words in 0:52" when the round stopped short. */
export function countSummary(result: RoundResult, goal: number): string {
  const words = Math.min(result.correct, goal);
  const what = words >= goal ? `${goal} words` : `${words} of ${goal} words`;
  return `${what} in ${roundTime(result.durationMs)}`;
}

/** The recap line for a forever round, by the engine's own end reason. Null when the reason is unknown. */
export function endLine(reason: EndReason | undefined): string | null {
  switch (reason) {
    case "miss":
      return "One miss ends a forever round.";
    case "moves":
      return "Out of moves.";
    case "cap":
      return "Round complete — that's the longest round we keep.";
    case "player":
      return "You ended the round.";
    default:
      return null;
  }
}
