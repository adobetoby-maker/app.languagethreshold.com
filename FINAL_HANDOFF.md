# DUO-002 Codex branch handoff

## Receipt

- Mission: `0f81771b-2df6-47ad-9f2c-e9e2d227c885`
- Branch: `codex/usability-onboarding`
- Starting/current HEAD: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Workspace state: uncommitted implementation; Git metadata is read-only in this sandbox
- Preview URL: none; no deployment or external write was authorized
- Repair detail and exact evidence: `REPAIR_REPORT.md`
- Production and GitHub `main`: unchanged by Codex Hands

## Implemented

- Reader-first cold welcome with one dominant **Start Reading** action, optional personalization,
  optional tool exploration, and a ready sample passage.
- Action-triggered Reader guidance for word tap → context → Tutor → save → practice.
- Language-owned My Vocab persistence with legacy migration, case-insensitive deduplication,
  selected-language compatibility, and per-language local/remote union.
- Idempotent correct-language Flashcards sync; duplicate or refused saves do not receive XP.
- Structured Reader → Tutor context carrying selected word, sentence, passage excerpt, title,
  language, learner level, and Word Card explanation.
- Reader context expires after its first matching Tutor turn.
- Delayed, persistent progress prompt and increased fixed-control scroll reserve.
- Active-module recommendations preserved in production while inactive filter diagnostics remain
  development-only.
- Honest staged Grammar loading, timeout, failure, and retry UI.
- Cold Anatomy navigation gated to active medical modules; module picker and module paths retained.
- Correct Reader destination copy at onboarding completion.
- Restrained brighter semantic accents for entry, Reader, and Flashcards without changing theme
  preference or base contrast tokens.
- Complete 31-`TabKey` inventory plus Word Card, My Vocab, onboarding, account saving, module
  picker, Language Match, and Leaderboard.
- Advertising screenplay, shot list, and caption copy.

## Validation

- Focused vocabulary tests: **4 pass, 0 fail**.
- Production build: **exit 0**.
- Focused changed-file ESLint: **exit 0**, zero errors and six existing fast-refresh warnings.
- Typecheck: **exit 2**, with output exactly identical to the extracted clean baseline (40
  pre-existing diagnostics; no repair-specific diagnostic).
- Repository lint: does not pass because of the existing large formatting backlog; see
  `REPAIR_REPORT.md` for the exact receipts.
- `rosetta:check`: script absent.
- `git diff --check`: **exit 0**.

## Not yet verified

- Runtime multilingual save/reload/remote-merge behavior.
- Live sentence-aware Tutor answer and stale-context expiry.
- Maximum-scroll and mobile-keyboard geometry.
- Paired AT-25 baseline/current captures and independent visual/contrast review.
- Complete real-tap mobile/accessibility matrix.
- Advertising recording and approved artifact link.

The local browser security policy blocked the local preview URL, so no screenshot or interaction
claim is made. The build author does not certify this work.

## Unrelated work preserved

`.remember/remember.md` entered the repair stage with an unrelated 23-line deletion. Codex Hands
did not edit, restore, stage, or claim it.

`REPAIR APPLIED — INDEPENDENT VERIFICATION REQUIRED`
