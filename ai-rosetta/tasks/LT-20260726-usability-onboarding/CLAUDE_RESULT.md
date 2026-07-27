# CLAUDE_RESULT — DUO-002

**Status: `independent-complete`**

Agent: Claude Code
Branch: `claude/usability-onboarding`
**Implementation head: `e668022f5941d82b4acc54568d8604beea914b7b`** (last code commit; later SHAs on this branch are Rosetta documentation only)
Baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Preview (aligned, HTTP 200): https://language-threshold-b38j3ywqc-adobetoby-5572s-projects.vercel.app
Review PR: [#3](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/3) — open, not draft
Date: 2026-07-27

Supersedes the Phase-1 checkpoint version, which was 8 commits stale.

## Completion declaration

The independent Claude implementation is **complete**. Every change is committed
and pushed to `claude/usability-onboarding` at the head recorded above, with an
aligned READY Vercel preview verified at HTTP 200.

Runtime certification of the AI-backed surfaces is **not** part of this
declaration and is listed separately under "Remaining limitations". Those items
are environmental and shared with the Codex branch; they do not indicate
incomplete implementation work on this side.

## Attribution — this branch is no longer solely Claude's work

Toby authored and merged **Track A** directly onto this branch. Recorded
explicitly so cross-review does not misattribute it:

| Commit | Author | What |
|---|---|---|
| `3497eb8` | **Toby** | Build reader-first onboarding track A |
| `43de363` | **Toby** | Merge Phase 1 checkpoint into accepted Track A |
| `5f5ea28` | Claude | P0-1 `vocabLang` fix |
| `c982e5b` | Claude | P0-2/P0-3 touch affordance + diagnostics gate |
| `8dc1400` | Claude | P0-4 language step (superseded in part by Track A) |
| `eae57c0` | Claude | Affordance correction — both panes |
| `e26546d` | Claude | Tutor docked to nav; language-first gate |
| `90417cb` | Claude | "More languages" expander |
| `e668022` | Claude | Training-demo block + underlines removed |

### What Track A (Toby) contributed

- **`FirstRunEntry`** — reader-first landing replacing the old wizard. One
  dominant "Start reading", "No account needed · Beginner passage ready", and a
  "Your first minute" ladder. Better than the wizard it replaced.
- **Tutor clearance tokens** — `--lt-bottom-strip-budget`, `.lt-scroll-safe`,
  `.lt-tutor-above-nav`, `.lt-miniplayer-above-nav`.
- **`learning-guidance.ts` + `ActionHint`** — the dismissible guidance system
  Claude's later work consolidated onto.
- **`handleWord` rewrite** — passes the tapped sentence, `sentenceIndex`, and
  `buildCenteredPassage(...)`; `WordCard` now sends `selectedSentence` /
  `passage` / `sentenceIndex` to the Tutor.
- **Seed change** — default text is now a beginner travel passage, not C2
  Don Quixote.
- **Cleared all 40 pre-existing TypeScript errors.** `tsc` is now 0.

## What Claude shipped

**P0-1 — Reader word-save was silently dropped.** `vocabLang` initialises null
and was only set by `SET_USER_VOCAB` (Pen Pal). `ADD_VOCAB_ITEMS` — the Reader
path — never claimed it, so ten consumers gating on
`vocabLang === selectedLanguage` filtered out every Reader-saved word, including
the Flashcards sync. The UI reported success regardless.

**P0-2 — the interaction was invisible on touch.** Words were `hover:text-gold`;
hover does not exist on phones. Went through three iterations, two of them
corrections of my own errors:
1. Underlines both panes — too heavy at 375.
2. Target pane only — **wrong**; tapping a native word opens the same card
   (verified with "village"). The affordance was lying.
3. Underlines removed entirely; the training-demo block carries the message.

**P0-3 — QA instrumentation shipped to learners.** `◈ Filter check · Reader`
rendered as the first element on Reader, Grammar and Speak, ungated. Now dev-only
or `?debugFilter=1`; verified folded out of the production bundle (zero
`import.meta.env.DEV` references remain).

**P0-4 — language never asked.** Restored ahead of Track A's landing as
`LanguageFirstStep`, plus a "More languages" expander separating shipped
(English, 30 seeded texts) from roadmap (Swahili, Greek, Hebrew, Arabic, Russian,
Mongolian — non-selectable, no content).

**Nav** — Tutor docked far-right in the bottom bar, More to the left, Match
removed. The floating pill is gone on mobile, which removes the overlap class of
bug rather than tuning clearance around it.

**Training demo** — per-pane tap counting: the block clears only once **both**
panes have been tapped 3 times, so dismissal is evidence the learner discovered
that native-side lookup works too.

## PRD §14 technical validation — run at head `10e1f0e`

Exact results, not "tests passed":

| Check | Result |
|---|---|
| `npm run rosetta:check` | **PASS** — 7 required artifacts verified; no raw demo media in repo; AI-gate baseline and learner-diagnostic invariants verified |
| `npx tsc --noEmit` | **PASS** — 0 errors |
| `npm run lint` | **PASS** — 0 errors, 11 warnings (pre-existing; Codex records 75 on its branch) |
| `npm run build` | **PASS** — Vercel Build Output API v3 artifact created in `.vercel/output/` |

Note: Codex could not complete `npm run build` in its checkout (two attempts
stalled in `vite build`). It completes here.

## Verification — measured

| Check | Result |
|---|---|
| `vocabLang` after Reader save | `null` → `"Spanish"` / `"French"` |
| Saved word in Cards DOM | absent → present |
| Word decoration (375, touch) | `none` — underlines removed |
| Demo block on load | shown |
| After 3 target-side taps | still shown; `tapCounts {"left":0,"right":3}` |
| Nav order (live DOM) | `More · Reader · Cards · Grammar · Games · Speak · Dashboard · Tutor` |
| Floating Ask Tutor on mobile | none rendered |
| Language → passage | French → *"C'est jeudi…"* · Japanese → classroom passage |
| Language step at 375 | all 8 fit; Pashto bottom 623px / 812px viewport |
| Roadmap languages clickable | no — `closest('button') === null` |
| `npx tsc --noEmit` | **0 errors** |
| Viewports read | 375 / 1440 / 2560 / 5K |

## Regression cases — `Dove abiti?` and `prenotazione`

**Status: NOT REPRODUCED, and NOT CLEARED. Unresolved.**

Chat identified from Toby's 06:18 screenshots that sentence analysis was wrong:
`Dove abiti?` analysed against a verb "riporto" that is not in the sentence;
`prenotazione` called the object of a preposition `per` absent from the displayed
sentence; "nominative case" misapplied to Italian; `prenota` described as a
synonymous noun when it is a verb form.

This corroborates the independent finding in `CLAUDE_PLAN.md` §1.7 — that the
tapped sentence was not reaching the API.

**Important timing fact:** those screenshots were taken at 06:18–06:22 on 07-27,
but the dev server they hit had been running since **20:56 on 07-26**, before
Track A existed locally (rebased 06:33 on 07-27). **They therefore document the
pre-Track-A build.** Track A's `handleWord` rewrite may already fix this.

**What was attempted (07-27, current head):** three scripted runs at 390×844
against local dev with a live Anthropic key, capturing outbound request payloads
and comparing the card's analysis against the sentence read from the DOM.

**Why it did not conclude:** the Word Card does not open under Playwright after
Track A's overlay changes. Matches on "IN THIS SENTENCE" resolved to the
training-demo copy rather than a rendered card. The API payload capture returned
no `sentence` field, consistent with the card never being requested.

**Correct next step:** manual device reproduction, or re-tooled selectors keyed
to Track A's markup. Do not treat as fixed.

## Anthropic preview configuration — UNRESOLVED

Local dev now has a working key (`ANTHROPIC_API_KEY` in
`~/.claude/api-keys.env`, exported via `~/.zshenv` so non-interactive
agent-started servers inherit it; `.env.local` holds only browser-safe `VITE_`
Supabase values, no service-role key, gitignored, never committed).

**The Vercel Preview environment has no Anthropic key.** Local and preview
therefore do not match: local returns AI content, preview reports AI not
configured. Any preview-based review of the Word Card, Tutor, Grammar generation
or Speak is invalid until this is set.

A previously borrowed ClearTerms key was removed on request; `git log -S"sk-ant-"`
confirms it was never committed.

## Remaining limitations — separate from the completion declaration

These are recorded as open, not as unfinished implementation:

1. **Anthropic preview credential (environmental, shared).** Vercel Preview has
   no `ANTHROPIC_API_KEY`, so preview does not match local. Word lookup, Tutor,
   Grammar generation and Speak cannot be certified from any preview on either
   branch until it is set. Codex records the same limitation independently.
2. **`Dove abiti?` / `prenotazione` sentence-context cases — not reproduced and
   not cleared.** Three scripted attempts at current head; the Word Card does
   not open under Playwright after Track A's overlay changes, so matches
   resolved to the training-demo copy rather than a card. The screenshots that
   raised these predate Track A locally. Requires manual device reproduction or
   selectors re-keyed to Track A's markup.
3. **Missionary selection-block correction — not implemented.** Could not locate
   the mid-page render from source; `lds-missionary` appears only in module
   routing, and the supplied screenshots show the Italian travel module. Needs a
   pointer rather than a guess.
4. **Language step composition at 2560/5K.** `max-w-lg` reads adrift at large
   viewports. Cosmetic; mobile was the stated priority.

## State

- `main`: unchanged at `8dff4f2b`.
- Production: unchanged, not deployed.
- PR #3: **open, not draft** (verified `isDraft=false`), head `577ee7d`.
- No merge performed. Codex branch fetched read-only; never checked out or edited.
