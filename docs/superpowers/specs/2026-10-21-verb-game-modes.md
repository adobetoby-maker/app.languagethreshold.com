# Verb Games — round modes and multi-pattern selection

Owner request (2026-10-21): "the games should have different modes, like forever mode, where you can keep going as long as you keep getting them right. I would also like to select up to 5, 10, 15 words, or pattern types."

## Modes (both games)
| Mode | Bubble Pop | Verb Crush |
|---|---|---|
| timed (default, existing) | 60 s, unchanged | 90 s, unchanged |
| count 5 / 10 / 15 | no clock; round ends after N correct completions; score keeps existing points, plus a speed bonus is NOT added (keep scoring identical per pick); recap shows time taken | no clock; goal list has N forms (wraps 3+2 style rows); moves = existing level moves scaled by N/levelGoalCount, rounded up; ends on goal met or moves out |
| forever | no clock; frames keep coming; round ends on the FIRST miss (a wrong pick or an escaped frame); score = existing points; recap headline = streak | no clock; when the goal list is complete a fresh list deals in (same level/families), moves top up by the level's move count; round ends on the FIRST trap swap or when moves run out |

- Escaped frame in forever = a miss (it ends the round). In count mode escapes behave as today.
- Reduced motion, keyboard play, list mode keep working in every mode.

## Pattern selection
- Picker allows selecting one or more families (multi-select chips), plus the existing Mix. Selecting Mix clears the others; selecting any family clears Mix.
- Crush: only families valid for the chosen level are selectable; the level availability check uses the union pool.
- Config: `families: FamilyId[]` (length ≥ 1) replaces the single family where needed; keep backward compatibility for existing single-family links (vfamily=x → [x]); add `vfamilies=a,b` URL param (validated, max 7, unknown → home via guardVerbRoute).

## Config, scoring, device
- RoundConfig gains `mode: { kind: "timed" } | { kind: "count"; n: 5|10|15 } | { kind: "forever" }` (default timed when absent, so old logs replay identically).
- scoreRound: replays to the natural end for count/forever (no ROUND_MS end); cap events (forever: at most 2000 events; reject above); soft reason `mode` for any non-timed round (unranked) and for multi-family rounds unless exactly one family or Mix.
- scopeKey / bests: device bests keyed by game + scope + mode (e.g. `L1:go-yo|count10`, `go-yo|forever`); existing timed keys unchanged so saved bests survive.
- buildRoundLog includes mode.

## UI
- Picker: a "Mode" segmented control under Pattern: Timed · 5 · 10 · 15 · Forever (labels: "60 sec"/"90 sec", "5 words", "10 words", "15 words", "Forever"). Default Timed. Remember last choice in device settings.
- HUD: timed shows clock; count shows "3 / 10"; forever shows "STREAK" prominently and no clock.
- Recap: eyebrow shows mode ("GAME · BUBBLE POP · FOREVER"); forever headline "Streak 23"; count shows "10 words in 1:42".
- Copy: plain, no emoji, no clichés.

## Safety for the Friday demo
- Branch feature/verb-game-modes; merge only if every gate + review passes by Thu 2026-10-22 12:00 MDT. Otherwise production stays on 02798f7.
