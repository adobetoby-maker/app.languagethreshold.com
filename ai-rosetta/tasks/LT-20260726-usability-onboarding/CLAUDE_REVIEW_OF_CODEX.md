# CLAUDE_REVIEW_OF_CODEX — DUO-002

Reviewer: Claude Code
Date: 2026-07-27

**Subject — Codex application commit: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`**
Codex documentation head: `8acd101` · PR [#4](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/4)
Reviewer branch: `claude/usability-onboarding` · application head `e668022f5941d82b4acc54568d8604beea914b7b`
Shared baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Codex's branch was fetched and read **read-only**. Never checked out, edited, or
merged. Diff reviewed: 34 files, +1520 / −363 against the shared baseline.

**Disclosure:** I am one of the two implementers reviewing the other. Where our
approaches compete I have tried to state the case against my own work first.

---

## 1. Genuine strengths

### 1.1 `src/state/vocab-store.ts` is a better fix than mine

We independently found the same defect — Reader-saved vocabulary silently
dropped by a language mismatch. The solutions differ in kind:

- **Mine** stamps `vocabLang` when the list is unowned. Fixes the first
  occurrence only. A learner who saves Spanish words, then switches to French,
  still gets a silently hidden list, because `vocabLang` stays `"Spanish"` and
  every consumer gates on `vocabLang === selectedLanguage`.
- **Codex's** replaces the single labelled list with `VocabByLanguage<Language>`.
  There is no gate left to fail.

`mergeVocabItems` is careful in ways mine is not: case-normalised keys via
`vocabWordKey`, idempotent re-merge, and `correctCount` preserved by `Math.max`
so a re-save cannot reset SRS progress. `mergeVocabByLanguage` extends the same
discipline to local↔remote sync.

**This should be adopted over mine.**

### 1.2 Regression tests

`tests/vocab-store.test.mjs` and `tests/learner-diagnostics.test.mjs`, wired into
`npm run rosetta:check`. I wrote none — my evidence was ad-hoc Playwright, which
is real but not repeatable by anyone else and not enforced in CI. For a bug whose
failure mode is *silence*, an executable guard is worth more than a screenshot.

### 1.3 Schema-validated `readerContext` in `api.tutor.ts`

Zod-validated, carrying `selectedWord`, the **exact sentence**, `textTitle`, the
existing Word Card `explanation`, a 1200-char-capped `passageExcerpt`, and
`learnerLevel`, each injected as a labelled prompt line. Aimed squarely at the
`Dove abiti?` / `prenotazione` defect, and it fails loudly on malformed input
rather than silently degrading to the passage opening. Better-built than the
equivalent path on my branch.

### 1.4 Honest reporting

Codex declined to claim a successful `npm run build` after two stalled attempts,
citing prior evidence instead of manufacturing a fresh pass. It also correctly
identified that my `CLAUDE_RESULT.md` was stale against its own PR head — a real
defect in my work, which I have since fixed.

---

## 2. Risks and regressions

### 2.1 **P0 — legacy vocabulary is silently discarded for exactly the users hit by the original bug**

`src/state/vocab-store.ts`:

```
export function includeLegacyVocab(byLanguage, legacyLanguage, legacyItems) {
  const next = { ...(byLanguage ?? {}) };
  if (legacyLanguage && legacyItems?.length) {
    next[legacyLanguage] = mergeVocabItems(next[legacyLanguage] ?? [], legacyItems);
  }
  return next;
}
```

Called on every load — `app-state.tsx` `HYDRATE` (line ~367) passes
`(hydrated.vocabByLanguage, hydrated.vocabLang, hydrated.userVocab)`, and again
on `SET_LANGUAGE` (~384).

**The guard requires `legacyLanguage` to be truthy.** But the original defect
produced precisely the state `vocabLang === null` **with a populated
`userVocab`** — `ADD_VOCAB_ITEMS` appended words without ever setting the label.
That is the whole reason the words were invisible.

So for any learner who saved words from the Reader on the current production
build, migration evaluates `null && …` → false, the legacy branch is skipped, and
`userVocab` is **not carried into `vocabByLanguage`**. Their saved words are
dropped on first load after deploy.

The cohort affected is exactly the cohort the fix is meant to rescue.

**Severity:** data loss, silent, on real user state. **Confidence:** high — the
guard is unambiguous and I traced both call sites. **Not yet reproduced at
runtime**, because certifying it needs a seeded pre-fix profile; I am reporting
it from code rather than claiming an observed failure.

**Suggested fix** — fall back rather than discard:

```
const target = legacyLanguage ?? fallbackLanguage; // e.g. selectedLanguage
if (target && legacyItems?.length) { … }
```

Attributing orphaned words to the current language is a guess, but a recoverable
one. Dropping them is not.

### 2.2 Medium — `vocabWordKey` uses `toLocaleLowerCase()` without a locale

`vocabWordKey` lowercases with the ambient locale. Under a Turkish locale,
dotted `İ`/`I` casefold differently, so the same word can produce two keys and
`mergeVocabItems` will store a duplicate. Low likelihood for the current
audience, trivial to harden with `toLocaleLowerCase("en")` or `toLowerCase()`.

### 2.3 Medium — `npm run build` unverified on that branch

Codex reports two stalled `vite build` attempts and does not claim success. It
completes on my branch (Vercel Build Output v3 artifact created). Since both
branches share a baseline, this is more likely environmental than a defect in
Codex's code — but it is unproven on the branch being proposed for merge, and
should be re-run before any merge decision.

### 2.4 Low — `OnboardingWizard.tsx` (+148/−…) may collide with Track A

Track A repurposed `OnboardingWizard` into an optional personalization modal and
introduced `FirstRunEntry` as the entry surface. Codex's implementation predates
that merge and modifies the wizard substantially. This is a merge-mechanics risk,
not a defect in either implementation, but a hybrid will need an explicit
decision about which entry surface survives.

### 2.5 Observation — language is still not asked

Codex's plan records "Reader before the toolkit map" but not asking the learner's
target language. With Track A's landing also not asking, `selectedLanguage`
remains at its `"Spanish"` default, so a French-intending learner can be shown
Spanish content. My `LanguageFirstStep` addresses this; I flag it as a gap in
Codex's coverage rather than a defect in its code.

---

## 3. Ideas worth combining

| Take | From | Reason |
|---|---|---|
| `vocab-store.ts` (with the §2.1 fallback applied) | Codex | Eliminates the bug class; mine fixes one occurrence |
| Both test files | Codex | Repeatable guard on a silent-failure bug |
| `readerContext` schema | Codex | Loud failure beats silent degradation |
| Tutor docked in bottom nav | Claude | Removes the overlap class rather than reserving space around it |
| `LanguageFirstStep` + roadmap expander | Claude | Neither Track A nor Codex asks the language |
| Per-pane tap counting on `ActionHint` | Claude | Dismissal becomes evidence of learning, not of one tap |
| Reader-first landing | Track A (Toby) | Already accepted and merged |

---

## 4. What neither branch has settled

No live sentence-aware Tutor response is certified on **either** side. Codex
lacked a credential; my attempts failed because the Word Card does not open under
Playwright after Track A's overlay changes. `Dove abiti?` and `prenotazione`
remain open on both branches, and Vercel Preview has no `ANTHROPIC_API_KEY`, so
no preview on either PR can settle them.

Recommend setting that credential **before** the hybrid decision, so the Tutor
comparison rests on evidence rather than design preference.

---

## 5. Verdict

Codex's implementation is stronger than mine on the two things that matter most
in this task — the vocabulary data model and its test coverage — and its Tutor
context contract is better built. I would adopt all three.

It carries one **P0 data-loss risk** in the legacy migration path (§2.1) that
must be fixed before merge, and it does not ask the learner's language.

No merge performed. No production change. Codex's branch untouched.
