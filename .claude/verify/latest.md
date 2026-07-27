# Verification — Tutor docked to nav + language-first gate

Branch: `claude/usability-onboarding` · Head: `e26546d`
Base: `43de363` (Toby, Track A) · Date: 2026-07-27

Covers two changes since the last note: bottom-nav rebuild (Tutor docked, More
left, Match out) and `LanguageFirstStep` ahead of Track A's landing.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | Two focused changes; nav row rewritten in place, one new 80-line component. No spread into Track A's files. | 9 |
| Vision | Docking Tutor removes the overlap *class* rather than tuning clearance around a floating element — the structural fix, not the cosmetic one. | 9 |
| Correctness | Nav order read from the live DOM, not assumed: `["More","Reader","Cards","Grammar","Games","Speak","Dashboard","Tutor"]`. Language step confirmed to render before the landing and to set `selectedLanguage`. | 9 |
| Relationship | Tutor sits in the far-right slot and is the only gold item besides the active tab — reads as a distinct action rather than a seventh peer. | 8 |
| Scope | Did not build the demo-block spec, because it belongs in Track A's `learning-guidance` system; layering mine on top would produce two competing scaffolds. Reported instead of guessing. | 9 |
| Fit | Reuses Track A's nav idiom and its `lt-*` tokens; the nav button dispatches an event rather than importing tutor state, keeping AppSidebar uncoupled. | 8 |
| Style | Comments record why the pill was removed and what it used to obscure, so it doesn't get "restored" later as a convenience. | 8 |
| Direction | **Weakest dimension.** Two competing guidance systems now exist on the Reader (mine + Track A's), and Track A's copy repeats the target-pane-only error. Correct next step is consolidation, not more building. | 6 |
| Mobile 375px | `vp375-0.png` read: language step renders first — all 8 languages, correct scripts (Español/Français/Português/日本語/한국어/پښتو), no clipping, generous tap targets. Separately `nav375.png`: bottom bar reads More · Reader · Cards · Grammar · Games · Speak · Dashboard · Tutor; **no floating pill over content** — previously it covered Spanish text at this exact viewport. | PASS |
| Desktop 1440px | `vp1440-0.png` read: same step, centred, comfortable measure, no clipping. | PASS |
| 4K 2560px | `vp2560-0.png` read: renders correctly but **composition is weak** — `max-w-lg` leaves the card small and adrift in a large empty field. Functional, not proud. Logged below rather than scored as a clean pass. | WARN |
| 5K 2560px@2x | `vp5K-0.png` read: identical composition at 2× density; glyphs crisp including Arabic and CJK, no scaling artefacts. Same max-width weakness as 2560. | WARN |
| Footer visible | No scroll video. WAIVED: both surfaces are fixed full-viewport overlays with no scrolling footer. | WAIVED |
| Outside input | PRESENT — Toby device-tested and directed the nav layout; Chat reviewed the screenshots. Both fed this change. | PASS |

## Verified behaviour

| Check | Result |
|---|---|
| Bottom nav order | `More · Reader · Cards · Grammar · Games · Speak · Dashboard · Tutor` |
| Match in bottom row | removed (still reachable via More sheet) |
| Floating Ask Tutor on mobile | none rendered — `lg:inline-flex` only |
| Language step precedes landing | yes; landing hidden until a language is picked |
| `selectedLanguage` set on pick | yes |
| `npx tsc --noEmit` | **0 errors** — Track A cleared the previous 40 |

## Open, and why not done

1. **Demo-block spec not built.** Toby specified: training-demo copy, dismiss
   button, fall-away after 3 taps *per pane*, self-removal once a word reaches
   My Vocab, no underlines. This must go into Track A's
   `src/lib/learning-guidance.ts` system, which already renders its own blocks.
   Building it into my `TapHint` would leave two scaffolds stacked on one screen
   — visible in `nav375.png`.
2. **Track A's guidance copy repeats my corrected error** — it reads "Tap any
   word in the target-language column", the same half-truth Toby corrected an
   hour ago. Tapping a native-pane word opens the same card (verified with
   "village").
3. **`dove` / `prenotazione` regression untested.** Still the highest-value item;
   blocked on re-tooled selectors for Track A's new overlay.
4. **Missionary-in-selection-blocks** not actioned.
5. **2560/5K composition** — language step's `max-w-lg` is too narrow at large
   viewports. Cosmetic, mobile is the stated priority, but it is a real weakness
   and marked WARN rather than PASS.

## Gate question

**Would I show this to Toby right now without him asking? YES** for the nav and
language gate — both verified from the DOM. The direction conflict (two guidance
systems) is named as the thing needing a decision, not silently carried.
