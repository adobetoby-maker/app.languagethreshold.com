# CLAUDE_RESULT — DUO-002 Phase 1

Agent: Claude Code
Branch: `claude/usability-onboarding`
Baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Head: `8dc1400`
Draft PR: https://github.com/adobetoby-maker/app.languagethreshold.com/pull/3
Status: **Phase 1 complete — stopped at checkpoint. Phases 2–4 not started.**
Date: 2026-07-26

## Independence attestation

`CODEX_PLAN.md` has not been read. Codex's branches (`codex/usability-onboarding`,
`codex/ai-rosetta-control`) have not been inspected. Both subagents dispatched
during the review were explicitly firewalled from them. No cross-review has begun.

Prior disclosure stands: `AI_HANDOFF.md` §6 (which contains Codex's product
review) was read before the independent phase. Judged not a violation because
that same review is reproduced as shared evidence in the PRD §4.

## What shipped

| # | Defect | Commit |
|---|---|---|
| P0-1 | Reader word-save silently dropped by the `vocabLang` gate | `5f5ea28` |
| P0-2 | No touch affordance on tappable words | `c982e5b` |
| P0-3 | Internal QA diagnostics rendered to learners | `c982e5b` |
| P0-4 | Language never asked; wrong default passage | `8dc1400` |

### P0-1 — the signature loop had no payoff

`vocabLang` initialises `null` and was only ever set by `SET_USER_VOCAB` (the Pen
Pal builder). `ADD_VOCAB_ITEMS` — the Reader's save path — never claimed it. Ten
consumers gate on `vocabLang === selectedLanguage`, so **every word saved from
the Reader was silently filtered out** of Flashcards, Tutor, Word Match, Pattern
Lab, Daily Story, Pen Pal, Conjugation and Speak. The UI reported success anyway.

Fix claims the language only when the list is unowned; a populated list is never
relabelled, so words saved under another language cannot be mis-tagged.

### P0-2 — the interaction was invisible on mobile

Words were styled `hover:text-gold`. Hover does not exist on touch. New `.lt-word`
class expresses the affordance as real media queries. Scoped to
`[data-pane="target"]` — a first pass decorated both panes and read as a wall of
links at 375px; restricting it halves the density and points at the side where
lookup is useful. Four components each carried a private copy of the hover-only
class; they now share one definition, so Japanese and Korean readers get it too.
Plus `TapHint`: one-time, non-blocking, self-dismissing on the first real tap.

### P0-3 — QA instrumentation in production

`ModuleMatchPanel` rendered `◈ Filter check · Reader / No active module` as the
first element on Reader, Grammar Studio and Speak, entirely ungated. Now dev-only
or `?debugFilter=1`.

### P0-4 — new learners got the wrong content

Onboarding never asked the language. A beginner who came for French got a C2
Cervantes text in Spanish. New step 1 asks first (everything downstream keys off
it), `finish()` dispatches it, `skip()` preserves it, non-module learners now land
in the Reader rather than the App Guide, and `library-state` re-selects on
language mismatch choosing the lowest available CEFR level.

## Verification — measured, not asserted

| Check | Result |
|---|---|
| Vocab save | `vocabLang` `null` → `"Spanish"`; word present in Cards DOM (was absent) |
| Touch affordance | target pane `underline/dotted` @ 22% gold, 248 words; native pane `none`, 259 words |
| Pointer affordance | 1440 mouse: `none` — original hover behaviour preserved |
| TapHint lifecycle | shows on entry → clears on first word tap → stays cleared after reload |
| P0-3 in prod build | DEV branch folded out; **zero** `import.meta.env.DEV` refs remain in bundle |
| Language → passage | French → *"C'est jeudi — il est temps de planifier la semaine…"* |
| Language → passage | Japanese → Japanese classroom passage |
| Language step at 375 | all 8 cards fit; Pashto card bottom 623px vs 812px viewport |
| Viewports read | 375 / 1440 / 2560 / 5K |
| `npx tsc --noEmit` | 40 errors before, 40 after — **zero added** (stash/count/pop) |
| `npx eslint` | 2 errors before, 2 after — both pre-existing (`:660`, `:830`) |

## Deliberately not done

Phases 2–4 not started, per instruction. Advertising screenplay/shot list (§11)
pending. `main` and Production untouched — no merge, no production deploy.

## Known-remaining, ranked (detail in `CLAUDE_PLAN.md`)

1. **P1-1** — floating Ask Tutor covers content on every primary tab, including
   the flashcard tap-to-flip target and, on mobile, the entire bottom nav
   (the only route to 16 of 22 tabs).
2. **P1-4** — My Vocab still has no tab of its own, and the `vocabLang` gate is
   still silent when it hides a list.
3. **P1-3** — Word Card action row sits ~2400px down inside the card.
4. **P1-2** — Word Card blanks for 3–5s with no loading state.
5. **P1-6** — three disagreeing nav lists; 6 tabs unreachable, 3 desktop-only.
6. **P1-7** — no mobile sign-in path once the progress banner is dismissed.
7. **Profession step still clips** at 375 and 1440 — "Just exploring" is below the
   fold on every real display. The new language step does not have this problem.

## Corrections to the shared brief

Three items in PRD §4 do **not** reproduce on this baseline. `BRIEF.md` should be
corrected so Codex is not chasing them either:

1. Banner dismissal **works** and persists across tab change and reload. Its 12.3%
   height at 375px is a text-wrap effect (7.1% at 430, 3.0% at 1440), not fixed cost.
2. Grammar generation is **not** indefinite — ~4s with a visible spinner, 6 A1 lessons.
3. **Zero** console errors and zero page errors across the full 8-tab sweep.

## Process defect to correct — Rosetta coordination

DUO-001 was reported blocked by this agent because its completion existed only in
**PR #2's comments** and had never propagated to this branch or task folder.
Nothing in the Rosetta task state recorded it as done, so the only honest read
from here was "unverified".

That is a coordination defect, not a judgement error: **completion signalled in a
PR comment is invisible to an agent working from branch state.** Fix after the
independent phase — task completion must be written into the Rosetta task folder
(or `BRIEF.md`), not left in review threads.

## Housekeeping

- Borrowed ClearTerms `ANTHROPIC_API_KEY` **removed** from `.env.local`.
  Confirmed never committed (`git log -S"sk-ant-"` is empty).
- `.env.local` now holds only browser-safe `VITE_` Supabase values. No
  service-role key present. Gitignored.
- **Language Threshold needs its own Anthropic credential** for local testing.
  Word lookup, Tutor, Grammar generation and Speak are all AI-backed; without a
  dedicated project key the Word Card shows `AI IS NOT CONFIGURED` in dev.
- Dev server stopped at handoff.
