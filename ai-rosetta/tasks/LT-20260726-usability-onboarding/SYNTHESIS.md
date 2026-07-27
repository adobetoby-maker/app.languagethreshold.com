# SYNTHESIS — DUO-002 cross-review

> **PREMATURE — superseded, retained for history.** The protocol requires each
> agent to file its own review first (`CLAUDE_REVIEW_OF_CODEX.md`,
> `CODEX_REVIEW_OF_CLAUDE.md`), and the final synthesis to land on the
> coordination branch once both exist. This document was written before Codex's
> review of Claude existed, so it is one-sided. Claude's formal review is
> `CLAUDE_REVIEW_OF_CODEX.md`. Do not treat this as the final synthesis.

Author: Claude Code (Claude-side cross-review)
Date: 2026-07-27

Claude head: `5d5923a` · implementation head `e668022` · PR #3
Codex head: `8acd101` (docs) · implementation head `8e3c6b4` · PR #4
Shared baseline: `8dff4f2b`

Codex's branch was fetched and read **read-only**. Not checked out, not edited,
not merged. This document is Claude's half of the cross-review; Codex's half is
its own to write.

---

## 1. Where we independently agree

Neither agent could see the other's plan. Convergence is therefore evidence
about the product, not about copying.

| Finding | Codex | Claude |
|---|---|---|
| Reader-first entry, before the toolkit map | ✅ | ✅ |
| Preserve every tool; explain purpose rather than remove | ✅ | ✅ |
| Carry structured Reader context into the Tutor turn | ✅ | ✅ |
| **Saved vocabulary must be language-owned** | ✅ | ✅ |
| Learner-safe diagnostics (hide QA instrumentation) | ✅ | ✅ |
| Reserve mobile space for fixed nav / Tutor controls | ✅ | ✅ |
| Delay account-saving pressure until after value | ✅ | ✗ not actioned |

The fourth row is the strongest signal in this task. Both agents, independently,
identified that vocabulary saved from the Reader was language-mismatched and
silently dropped. That was not in the brief — it was found in the code, twice.

---

## 2. Where Codex is better — conceded plainly

### 2.1 The vocabulary fix. Codex's is structurally better than mine.

Same bug, two solutions:

**Claude (`5f5ea28`)** — stamp `vocabLang` when the list is unowned:
```
const unclaimed = state.vocabLang === null || state.userVocab.length === 0;
vocabLang: unclaimed && action.lang ? action.lang : state.vocabLang
```

**Codex (`src/state/vocab-store.ts`)** — replace the single labelled list with
`VocabByLanguage<Language>`, a per-language map, plus `mergeVocabItems`
(idempotent, case-normalised via `vocabWordKey`, preserves max `correctCount`)
and `includeLegacyVocab` for migration.

**Mine fixes the reported symptom. Codex's eliminates the class.** Under my fix a
learner who saves Spanish words, then switches to French, still cannot save
French words usefully: `vocabLang` stays `"Spanish"`, so every consumer gating on
`vocabLang === selectedLanguage` hides the whole list while learning French. The
word is stored and invisible — the same failure mode, one step further along.
Codex's per-language map has no gate to fail.

**Recommendation: take Codex's `vocab-store.ts` wholesale.** This is the single
clearest merge decision in the task.

### 2.2 Codex wrote tests. I did not.

`tests/vocab-store.test.mjs` (50 lines) and `tests/learner-diagnostics.test.mjs`
(40 lines), wired into `npm run rosetta:check`. My verification was all ad-hoc
Playwright scripts — real evidence, but not repeatable by anyone else and not
run in CI. For a fix whose entire failure mode is *silence*, regression tests are
worth more than a screenshot.

**Recommendation: take Codex's tests, and keep them as the gate on this bug.**

### 2.3 Codex's Tutor context is the more complete answer to the open regression.

Codex added a schema-validated `readerContext` to `api.tutor.ts` carrying
`selectedWord`, **exact sentence**, `textTitle`, existing Word Card
`explanation`, a `passageExcerpt` (1200-char capped), and `learnerLevel`, each
injected as a labelled line in the system prompt.

This is aimed squarely at the `Dove abiti?` / `prenotazione` defect — analysis
performed against the wrong sentence. Track A also rewrote `handleWord` to pass
the tapped sentence, but Codex additionally hardened the server contract with a
Zod schema, so a malformed or missing sentence fails loudly rather than silently
degrading to the passage opening.

**Recommendation: take Codex's `readerContext` schema.** Neither side has
*certified* the fix (§4), but this is the better-built mechanism.

---

## 3. Where the Claude branch is ahead

1. **`npm run build` completes.** Codex records two attempts stalling in
   `vite build` and explicitly declines to claim success. It completes on this
   branch — Vercel Build Output API v3 artifact created.
2. **Tutor docked into the bottom nav.** Codex reserved clearance for a floating
   control; this branch removes the floating control on mobile entirely. Toby
   directed this after device testing showed the pill obscuring different content
   at every scroll position. Removing the element beats spacing around it.
3. **Language asked before entry, with a roadmap expander.** Codex's plan does
   not record asking the learner's language. Track A's landing did not ask
   either, so a French-intending learner could still receive Spanish content.
4. **Per-pane tap counting on the training demo.** Guidance clears only after
   both panes have been used three times, so dismissal is evidence the learner
   discovered native-side lookup — not merely that they tapped once.
5. **Lint warning count is lower** (11 vs 75), though these are different trees
   and not a like-for-like comparison.

---

## 4. Where both branches are equally blocked

**No live sentence-aware Tutor response has been certified on either branch.**

- Codex: *"a live sentence-aware Tutor response and stale-context expiry were not
  certified… no dedicated Language Threshold credential was available."*
- Claude: three scripted attempts at current head; the Word Card does not open
  under Playwright after Track A's overlay changes, so no card was requested.

The `Dove abiti?` / `prenotazione` cases are **open on both sides**. Vercel
Preview has no `ANTHROPIC_API_KEY`, so no preview on either PR can settle it.

**This is the highest-value unblock in the task and it is environmental, not a
code decision.** Setting the preview credential should precede any merge choice,
because the product's differentiating claim — sentence-aware analysis — is
currently unverified in both candidate implementations.

---

## 5. Recommendation

Not a winner. **An explicit hybrid**, per PRD §17 Option C:

| Element | Take from | Why |
|---|---|---|
| Vocabulary storage | **Codex** — `vocab-store.ts` + its two test files | Eliminates the bug class; mine only fixes the first occurrence |
| Tutor reader-context schema | **Codex** — `readerContext` in `api.tutor.ts` | Schema-validated; fails loudly instead of degrading silently |
| Tutor placement | **Claude** — docked in bottom nav | Removes the overlap class rather than reserving space around it |
| Entry language selection | **Claude** — `LanguageFirstStep` + roadmap expander | Neither Track A nor Codex asks; without it the passage can be the wrong language |
| Training-demo guidance | **Claude** — per-pane tap counters on Track A's `ActionHint` | Dismissal becomes evidence of learning, not of a single tap |
| Diagnostics gating | Either — both correct | Convergent solutions |
| Reader-first landing | **Track A (Toby)** | Already accepted and merged |

**Sequencing:** set the preview `ANTHROPIC_API_KEY` first, then re-run
`Dove abiti?` and `prenotazione` against both previews. If Codex's
`readerContext` clears them and this branch's does not, that settles the Tutor
question on evidence rather than on design preference.

---

## 6. Disclosure

I am one of the two implementers, reviewing my own work against the other's.
Section 2 concedes the vocabulary fix, the tests, and the Tutor context schema to
Codex; those are the three most consequential items in this task, and they should
be weighted accordingly against my own advocacy in §3.

Toby decides. Nothing here has been merged, and no production deploy has
occurred. `main` remains at `8dff4f2b`.
