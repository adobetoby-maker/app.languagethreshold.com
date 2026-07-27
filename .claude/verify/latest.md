# Verification — DUO-002 Phase 1 (P0-1 … P0-4)

Branch: `claude/usability-onboarding` · Head: `8db11ee`
Baseline: `8dff4f2b` · Draft PR: #3
Date: 2026-07-26

Supersedes the earlier note, which covered only the P0-1 reducer fix. Screenshots
below were re-captured at current head after P0-2/3/4 landed — the previous
captures predated them and were stale.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | Four defects, four focused commits; the largest diff is one new 4th onboarding step. No opportunistic refactoring rode along. | 9 |
| Vision | One thesis throughout: the loop exists and is good, it was never *taught* and its last step was broken. Nothing was cut to simplify. | 9 |
| Correctness | Each fix verified by observation: state transitions read from localStorage, computed styles read per pane, production bundle inspected for the folded DEV branch, passages read per language. | 9 |
| Relationship | Target pane now reads interactive, native pane reads as reference — the contrast itself teaches the affordance. Language step is asked first because everything downstream keys off it. | 9 |
| Scope | Phase 1 only. Phases 2–4 not begun. Nine other `vocabLang` consumers, the Ask Tutor overlap, and My Vocab's missing tab were all left alone and documented instead. | 9 |
| Fit | Uses existing idioms — reducer/dispatch, `styles.css` tokens, existing spinner precedent. New `.lt-word` replaces four duplicated copies rather than adding a fifth. | 9 |
| Style | Comments explain *why* (the silent-drop, the hover-on-touch gap), not what. Native language names corrected to real scripts after the first pass romanised them. | 8 |
| Direction | Correct order: make the loop work, make it visible, remove the noise, then send learners to it. Each step is only worth doing if the previous one holds. | 9 |
| Mobile 375px | `vp375-0.png` read: language step — all 8 cards fit with margin (Pashto card bottom 623px vs 812px viewport, measured). Scripts render: Español, Français, Português, 日本語, 한국어, پښتو. 4 progress segments, Skip available. Separately `reader375.png`: dotted affordance visible on the Spanish pane only, English pane clean. | PASS |
| Desktop 1440px | `vp1440-0.png` read: same step, 2-column grid, no clipping, modal vertically centred. Notably shorter than the profession step, which still clips at this height. | PASS |
| 4K 2560px | `vp2560-0.png` read: all 8 cards visible, modal centred, generous surrounding space; no stretching or reflow artefacts. | PASS |
| 5K 2560px@2x | `vp5K-0.png` read: identical composition at 2× density; CJK and Arabic glyphs crisp, no hinting or subpixel artefacts. | PASS |
| Footer visible | No scroll video. WAIVED: the surfaces changed are a fixed modal overlay and fixed-chrome Reader panes; there is no scrolling page footer to reach. | WAIVED |
| Outside input | WAIVED: Codex cross-review is scheduled by DUO-002 §6 but blocked — Codex has not marked its independent phase complete, and its plan must not be read before then. | WAIVED |

## Behavioural verification per defect

| Defect | Check | Before | After |
|---|---|---|---|
| P0-1 | `vocabLang` after Reader save | `null` | `"Spanish"` |
| P0-1 | Saved word in Cards DOM | absent | present |
| P0-2 | Target pane decoration (touch 375) | `none` | `underline/dotted` @ 22% gold, 248 words |
| P0-2 | Native pane decoration (touch 375) | `none` | `none` — 259 words deliberately untouched |
| P0-2 | Pointer 1440 decoration | hover-only | hover-only, unchanged |
| P0-2 | TapHint lifecycle | n/a | shows → clears on first word tap → stays cleared after reload |
| P0-3 | `import.meta.env.DEV` refs in prod bundle | n/a | **0** — branch folded out entirely |
| P0-4 | Pick French → Reader | Spanish Don Quixote (C2) | *"C'est jeudi — il est temps de planifier la semaine…"* |
| P0-4 | Pick Japanese → Reader | Spanish Don Quixote (C2) | Japanese classroom passage |

## Automated checks — exact counts

- `npx tsc --noEmit`: **40 before, 40 after** across all four commits — zero added.
  Measured by stash → count → pop each time, not asserted.
- `npx eslint` on changed files: **2 before, 2 after** — both pre-existing
  (`prefer-const` :660, `no-explicit-any` :830), untouched by this work.

## Corrections made mid-flight

1. **P0-2 first pass was wrong and I changed it.** Decorating both panes read as a
   wall of links at 375px. Rescoped to `[data-pane="target"]` and dropped 38% → 22%.
2. **Native language names were romanised** ("Espanol", "Nihongo") in the first
   pass — indefensible on a language-learning product. Corrected to real scripts
   and re-verified rendering at all four viewports.

## Honest gaps

1. **No Cards-tab screenshot** showing a saved word. Two capture attempts failed on
   overlay interception; the DOM assertion is the evidence. Stated, not implied.
2. **An intermediate run appeared to show the wizard not rendering.** It was stale
   Vite HMR plus a selector grabbing the library drawer's `h2` behind the modal.
   Confirmed non-issue after a server restart; recorded in the commit rather than
   quietly dropped.
3. **Profession step still clips** at 375 and 1440 — "Just exploring" below the fold
   on every real display. Known (P1-4), out of Phase 1 scope, not fixed.
4. **Local AI features untestable** without a dedicated Anthropic credential; the
   borrowed one was removed. Word lookup shows `AI IS NOT CONFIGURED` in dev.

## Gate question

**Would I show this to Toby right now without him asking? YES** — and it has been,
with these same numbers and gaps named.
