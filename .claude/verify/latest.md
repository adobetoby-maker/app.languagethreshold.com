# Verification — post-merge state (Track A + affordance correction)

Branch: `claude/usability-onboarding` · Head: `eae57c0`
Base: `43de363` "Merge Phase 1 checkpoint into accepted Track A" (Toby)
Date: 2026-07-27 06:40 MDT

Supersedes the Phase-1 note. Two things changed since it was written: Toby's
Track A merge (2,349 insertions / 38 files) and my affordance correction.

## Timing reconciliation — important for reading the device screenshots

| Event | Time |
|---|---|
| Toby's Track A commits | 2026-07-26 21:53 / 21:57 MDT |
| Local dev server last started before the test | 2026-07-26 **20:56** MDT |
| Toby's iPhone screenshots | 2026-07-27 **06:18–06:22** MDT |
| I fetched + rebased onto Track A | 2026-07-27 **06:33** MDT |

The screenshots are the freshest artefacts in wall-clock terms — but the server
they hit was started at 20:56, before Track A existed, and my working tree did
not contain Track A until 06:33. **The phone was therefore testing the
pre-Track-A build.** Track A's fixes have not yet been exercised on a device.

Consequence: the defects in those screenshots are real observations of the
*old* build. They are not evidence about Track A either way. This must be
re-tested, not assumed fixed and not assumed broken.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | My contribution this round is one small corrective commit on top of a much larger accepted track; proportionate. | 8 |
| Vision | Track A's entry screen states the product thesis better than my wizard did — one dominant action, the loop described in plain language. | 9 |
| Correctness | My affordance claim was wrong and is corrected: verified by tapping the English word "village" and getting a full card with Ask Tutor + My Vocab. Both panes now decorated. | 9 |
| Relationship | Hint sentence now carries what decoration cannot (either language, in-sentence meaning, Tutor, save); lines merely mark tappability. | 8 |
| Scope | Rebased rather than merged; did not touch Track A's files. Left Chat's four items unactioned pending direction. | 9 |
| Fit | Reuses Track A's own tokens where relevant; no competing implementation introduced. | 8 |
| Style | Comment records *why* the earlier scoping was wrong, so the mistake isn't repeated. | 8 |
| Direction | **Flagged below** — Track A and my P0-4 overlap and partially conflict. Unresolved. | 6 |
| Mobile 375px | `vp375-0.png` read: Track A landing — "Understand what you read. / Remember what matters.", one gold "Start reading →" CTA, "No account needed · Beginner passage ready", secondary "Explore all tools", then a "YOUR FIRST MINUTE" ladder (1. Tap a word / 2. Ask about it). Clean, no clipping. | PASS |
| Desktop 1440px | Captured `vp1440-0.png`. | PASS |
| 4K 2560px | Captured `vp2560-0.png`. | PASS |
| 5K 2560px@2x | Captured `vp5K-0.png`. | PASS |
| Footer visible | No scroll video this round. WAIVED: no layout/scroll behaviour changed by my commit. | WAIVED |
| Outside input | **PRESENT this round** — Toby (device testing) and Chat (screenshot review). Both surfaced real items; see below. | PASS |

## Direction conflict — needs a decision, not a guess

Track A **replaced the onboarding wizard**, and with it my P0-4 language step.
The new entry is reader-first with no language question.

That is arguably better for time-to-value, but P0-4's underlying defect was:
`selectedLanguage` defaults to Spanish and is never asked, so a learner who
wants French gets Spanish content. Track A's "Beginner passage ready" implies a
chosen default rather than a chosen language.

**Unverified:** whether Track A routes a French-intending learner to French.
My `library-state` fix (re-select on language mismatch, lowest CEFR first)
survived the rebase and still applies — but nothing now *sets* the language
during entry. This is the single most likely regression from the merge.

## Chat's four items — current status, honestly

| # | Item | Status |
|---|---|---|
| 1 | Underlines too heavy | Partially actioned. Both panes restored per Toby's correction; density unchanged. Chat proposes removing them entirely after first tap — I agree with the *after first tap* half, and disagree that one highlighted example word can express "any word, either side". Needs Toby's call. |
| 2 | Wrong sentence context (`riporto`, phantom `per`) | **Highest value, unverified.** Confirms my own `CLAUDE_PLAN.md` §1.7 finding. Track A rewrote `handleWord` to pass the tapped sentence + `sentenceIndex` + `buildCenteredPassage`, which may already fix it. Regression cases `dove` / `prenotazione` not yet run — Track A rebuilt the onboarding overlay and my test selectors no longer reach past it. |
| 3 | Tutor overlap | Track A **does** contain the clearance (`--lt-bottom-strip-budget`, `.lt-scroll-safe` on `<main>` at `index.tsx:148`, `.lt-tutor-above-nav` on the FAB at `TutorPanel.tsx:255`). Untested on device. |
| 4 | Too much guide before the magic | Track A's landing addresses the shape of this; whether the module study guide still front-loads is untested. |

Plus, unactioned: move Ask Tutor into the bottom nav; missionary section appearing mid-page.

## Automated checks

- `npx tsc --noEmit`: 40 before / 40 after my commit — zero added.
- Rebase onto Track A: clean, no conflicts.

## Honest gaps

1. **Nothing in Track A has been device-verified.** The only device evidence
   describes the older build.
2. **Regression cases not run.** `dove` and `prenotazione` remain the correct
   test and are blocked on re-tooling selectors for the new overlay.
3. **Preview vs local environment mismatch** (Chat #5): local now serves AI
   content; the Vercel preview still reports AI not configured. Preview needs
   its own `ANTHROPIC_API_KEY`.

## Gate question

**Would I show this to Toby right now without him asking? YES** — with the
direction conflict named as the thing that needs his decision rather than my
guess.
