# INTEGRATION_RESULT — DUO-002

**Status: `integration-checkpoint-complete`**

Integration lead: Claude Code
Branch: `integrate/usability-onboarding`
**Starting commit: `e98cee869cb9d10b217295e621f2701ef8acbf5e`**
**Integration application commit: `44d74c96a62bdf99fa86e13b092fa36ae4f11861`**
Track A base: `e668022f5941d82b4acc54568d8604beea914b7b`
Track B source: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`
Shared baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Date: 2026-07-27

Documents read in the order required by `INTEGRATION_BRIEF.md`: `SYNTHESIS.md`,
`TOBY_DECISION.md`, `CLAUDE_REVIEW_OF_CODEX.md`, and
`CODEX_REVIEW_OF_CLAUDE.md` (read-only from `origin/codex/usability-onboarding`).

## Track A experience preserved

Language-first entry (`LanguageFirstStep` + roadmap expander), Reader-first
landing (`FirstRunEntry`), Tutor docked in the bottom nav, per-pane tap counting
on the training demo, learner-safe diagnostics gating. No Track A learner-facing
behaviour was replaced.

## Track B components ported — deliberately, only the approved set

| Component | Note |
|---|---|
| `src/state/vocab-store.ts` | Per-language ownership, replacing Claude's `vocabLang` stamp |
| `tests/vocab-store.test.mjs` | Ported, then extended |
| `tests/learner-diagnostics.test.mjs` | Ported unchanged; passes against Track A's diagnostics gate |
| `HYDRATE` / `SET_LANGUAGE` / `ADD_VOCAB_ITEMS` | Rewired onto `vocabByLanguage`; added to the persisted key set |

**Not ported:** Track B's `OnboardingWizard` changes and its `readerContext`
Tutor schema. The wizard would collide with Track A's `FirstRunEntry`, which
Toby's decision preserves. The Tutor schema is recorded as outstanding in
"Remaining" below — it was approved in principle but its value cannot be
certified without the Preview credential, and porting it unverified would give
the appearance of a fix without evidence.

## Synthesis corrections — all eight

| # | Correction | Evidence |
|---|---|---|
| 1 | Recover legacy words when `vocabLang` is null | `includeLegacyVocab` takes `fallbackLanguage`; runtime-verified below |
| 2 | Regression test for the pre-fix state | 4 new tests incl. SRS-preservation on re-merge |
| 3 | Deterministic normalization | `toLowerCase()` replaces `toLocaleLowerCase()`; test asserts locale independence |
| 4 | Restore mobile Language Match in More | Added as an `onOpenMatch` row; see correction note |
| 5 | Wizard Back targets | level → step 2, summary → step 3 |
| 6 | Remove duplicate Flashcards CTA | Second button removed; confirmation panel retained |
| 7 | Keyboard-accessible words | `role`/`tabIndex`/Enter-Space across **7** render sites |
| 8 | Documentation trailing whitespace | stripped; `git diff --check` clean |

### Correction 4 — a false claim in my own earlier work

My commit `e26546d` stated Match was *"still reachable from the More sheet."*
**That was false.** The More sheet renders only `TAB_ITEMS`, and Match is an
`onOpenMatch` overlay action, not a `TabKey`; it was reachable solely through
Games Hub. Codex found it. Recorded here because the failure was asserting
reachability without checking it.

## Verification at `44d74c9`

| Check | Result |
|---|---|
| `npm run rosetta:check` | **PASS** — 7 artifacts; no raw demo media; AI-gate and learner-diagnostic invariants verified |
| `node --test` (both files) | **10/10 pass**, 0 fail |
| `npx tsc --noEmit` | **PASS** — 0 errors |
| `npm run lint` | **PASS** — 0 errors, 11 warnings |
| `npm run build` | **PASS** — Vercel Build Output API v3 artifact created |

Note: `node --test tests/` (directory form) reports a spurious failure because it
treats the directory itself as a test target. Both files pass when named
explicitly. Not a code defect.

### Browser verification — seeded legacy state (the P0 case)

Seeded the exact pre-fix production profile — populated `userVocab`, **null**
`vocabLang` — at 390×844 and loaded the app:

```
vocabByLanguage : {"Spanish":[hidalgo(3), rocín(1)]}
userVocab       : [["hidalgo",3],["rocín",1]]
RECOVERED       : YES — legacy words survived
SRS preserved   : correctCount 3 and 1 intact
```

Without correction 1 these words would have been discarded on first load, since
`legacyLanguage` is null and the original guard short-circuits.

### Browser verification — per-language isolation

Seeded Spanish (legacy, orphaned), French and Italian, then switched between all
three:

```
Spanish  shows ["hidalgo"]
French   shows ["bonjour"]
Italian  shows ["prenotazione"]
final store: {"French":["bonjour"],"Italian":["prenotazione"],"Spanish":["hidalgo"]}
```

Each language shows only its own vocabulary; the recovered legacy word coexists
with the others. The bug class is eliminated, not merely its first occurrence.

## Remaining — blocking the completion gate

1. **Vercel Preview aligned to `44d74c9` not yet created** (brief step 8).
2. **AI runtime certification not performed.** `Dove abiti?` and `prenotazione`
   remain **uncertified**. This requires a dedicated Language Threshold
   `ANTHROPIC_API_KEY` in the Vercel Preview environment. Per the shared
   credential rule I have not borrowed, copied, recovered, or reused a credential
   from any other project to work around this.
3. **Track B `readerContext` Tutor schema not ported** — see rationale above.
   Recommend porting together with the certification run, so the change is
   validated by the cases it targets.

## Cleanup

Local development server stopped at handoff (see final commit).
No merge to `main`. No production deployment. `main` remains at `8dff4f2b`.
Codex's branch was read read-only and never checked out, edited, or merged.

## Handoff to Codex QA

Integration commit to fetch: **`44d74c96a62bdf99fa86e13b092fa36ae4f11861`**.
Do not review a stale local server. The legacy-state and multi-language cases in
brief steps 3–4 are already covered above with evidence; independent
reproduction is still welcome. Steps 5–7 (regression cases, 390/430 plus
keyboard, Tutor clearance / Match access / wizard Back / single Flashcards CTA)
are open, and step 5 is gated on the Preview credential.

---

# REPAIR PHASE — all five review findings addressed

**Status: `repair-complete` — ready for independent Codex re-review**

**Application commit to review: `cff6ec1504d3c33de36cd7eabd5486494fed0a3a`**
Previous checkpoint: `44d74c96a62bdf99fa86e13b092fa36ae4f11861`
Branch: `integrate/usability-onboarding` · `main` unchanged at `8dff4f2b`

Repair commits, in order:

| Commit | Contents |
|---|---|
| `5ab90e5` | F1 vocabulary write path, F2 Word Card source sentence, F5 record correction |
| `648e351` | F2 follow-up — type hierarchy and tapped-token highlight, after outside review |
| `19afc13` | 4-viewport evidence and outside-review record |
| `dd68fd1` | F3 focus-then-mix study-section selection |
| `cff6ec1` | R1 MERGE_REMOTE vocabulary union, R2 `readerContext` port (F4), R3 whitespace |

## Findings and evidence

**F1 — vocabulary counts were monotonically non-decreasing.** `SET_USER_VOCAB`,
`MASTER_VOCAB_WORD` and `START_REGRESSION_CHECK` wrote the derived `userVocab`
with no write-through to `vocabByLanguage`. Because `includeLegacyVocab` runs on
every `HYDRATE`/`SET_LANGUAGE` with `userVocab` as legacy input and
`mergeVocabItems` resolves collisions with `Math.max`, increments survived but
decreases could not — the regression drill was silently reverted. Proven broken
from the immutable commit before any fix (expected 3, actual 5). `userVocab` is
now strictly derived; `Math.max` is retained deliberately for legacy/remote
reconciliation only. FIXED, 5 tests.

**F2 — Word Card never showed the tapped sentence.** The "In this sentence"
block rendered only the grammar note; the generated example below was the only
sentence on the card. FIXED, then corrected again after independent review found
the fix defeated at a glance: the generated example rendered larger, brighter and
better-glossed than the learner's real sentence. Source sentence is now the
dominant italic (16px, full brightness) with every occurrence of the tapped token
marked; the example is demoted and labelled "Another example". Verified from a
fresh capture and computed styles at 390 and 2560.

**F3 — "Vocab (your words)" selection.** Not an inverted filter. Selection
defaults to every section and the chip handler was a plain add/remove toggle, so
tapping the section hit the REMOVE branch — deck 95→94 with the saved word gone.
Focus-then-mix adopted per Toby's decision. FIXED, 7 tests, including a guard
against regressing to plain toggle.

**F4 — Track B `readerContext` schema.** Ported as R2. Zod-validated in
`src/routes/api.tutor.ts` with `selectedWord` and `sentence` both required
`min(1)`, so an empty or missing sentence is rejected rather than degrading to
the passage opening. Certified offline by schema and prompt-assembly tests; no
live model call. FIXED.

**F5 — record correction.** The earlier claim that `WordMatch.tsx` is "the only
writer that advances vocabulary mastery" is wrong as written: `FlashcardStudy.tsx`
also dispatches `MASTER_VOCAB_WORD`. It is however unrouted dead code — the
FlashcardsStudio commit states "FlashcardDecks/FlashcardStudy/sm2.ts kept in tree
but no longer routed." Claim is wrong in letter, right in effect. No behavioural
change required.

## Verification at `cff6ec1`

| Check | Result |
|---|---|
| `git diff --check` | PASS |
| `npm run rosetta:check` | PASS |
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run lint` | PASS — 0 errors, 12 warnings |
| `node --test` (6 files) | **39/39 pass** |
| `npm run build` | PASS — Vercel Build Output API v3 |

## NOT verified — Codex should close these specifically

1. **AI runtime certification on the Vercel Preview remains uncertified.** The
   Preview still has no dedicated Language Threshold `ANTHROPIC_API_KEY`. No
   credential was borrowed, copied, recovered, manufactured, or added at any
   point in this repair.
2. **Both named regression cases are unreproducible from repository content.**
   `Dove abiti?` / `abitare` appear nowhere in `src/`. `prenotazione` exists only
   in `src/data/library-seeds/service-edu-seeds.ts` ("Trattoria: Servizio al
   Tavolo"), a module seed not reachable from the default library. Certifying
   either case requires the exact source text to be specified first. This is an
   acceptance-criteria defect, not a code defect.
3. **F3 end-to-end browser check did not complete.** Save word → Cards → tap the
   Vocab chip → confirm the word remains. The MY VOCAB control sits inside the
   card's internal scroll area and the click timed out on visibility. Semantics
   proven by unit test; on-screen behaviour unconfirmed.
4. **Reader surface never reached by the automated harness** in the R1/R2/R3
   pass — the harness lands on the onboarding gate. The Word Card was verified
   separately at 390 and 2560; `ParallelReader`/`TutorPanel` were not.
5. **Word Card not captured at 1440/5K.** `cardWidth()` is fixed-pixel so it
   should not reflow, but that is reasoning rather than evidence.

## Known issues recorded, outside the five findings

- Word Card clips mid-glyph at 390×844 (card height exceeds viewport). Not
  clipped at 2560 — full card including its action row renders.
- Background UI bleeds through the Word Card modal's right edge.
- Reader Library drawer clipped at 1440; sidebar/bottom-bar collision at
  bottom-left.
- Language gate composition at ≥1440 occupies ~18% of width at 4K; WARN.
- Desktop chrome: ~500px of 900px before any reading text, three concurrent
  navigation systems, "Reader" active in two at once.
- `.env` was committed historically (3 commits) though now untracked and
  gitignored. Belongs to the separate security task PR #5 called for.

## Cleanup

Local development server stopped at handoff. No merge to `main`. No production
deployment. Codex's branch was read read-only via `git show` and never checked
out, edited, or merged.
