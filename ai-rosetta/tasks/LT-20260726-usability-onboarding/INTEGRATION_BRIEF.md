# Integration Brief — DUO-002

Task: `LT-20260726-usability-onboarding`
Branch: `integrate/usability-onboarding`
Status: implementation-ready
Approved by: Toby Anderton

## Start here

Both agents must read, in order:

1. `SYNTHESIS.md`
2. `TOBY_DECISION.md`
3. `CLAUDE_REVIEW_OF_CODEX.md`
4. `CODEX_REVIEW_OF_CLAUDE.md` from `codex/usability-onboarding`

GitHub remote facts override stale local status. Fetch before reading or editing.

## Claude Code — integration lead

1. Confirm the branch and remote head before editing.
2. Record the starting commit in the integration result.
3. Preserve the Track A learner experience.
4. Deliberately port only the approved Track B components.
5. Fix every item in the synthesis correction list.
6. Add and run the required regression tests.
7. Run Rosetta, TypeScript, lint, build, and browser verification.
8. Create a current Vercel Preview aligned to the application commit.
9. Record exact verification evidence and mark `integration-checkpoint-complete`.
10. Stop the local development server and record cleanup before handoff.

Claude must not merge `main` or deploy Production.

## Codex — independent QA

Remain read-only while Claude is implementing. After Claude declares the integration checkpoint complete:

1. Fetch the exact integration commit; do not review a stale local server.
2. Verify that Track B’s vocabulary model, tests, and Tutor schema were ported correctly.
3. Seed and test legacy state with populated `userVocab` and null `vocabLang`.
4. Verify saving and switching between at least Spanish, French, and Italian.
5. Verify `Dove abiti?` and `prenotazione` through Word Card and Tutor.
6. Test mobile widths 390px and 430px plus keyboard interaction.
7. Confirm Tutor clearance, Match access, wizard Back behavior, and single Flashcards CTA.
8. Confirm Preview URL and commit alignment.
9. Write QA findings without editing the integration branch.

If QA finds a blocker, Claude owns the correction unless Toby explicitly reassigns it.

## Shared credential rule

Use only a dedicated Language Threshold credential supplied through the project’s approved local or Vercel environment. Never paste secrets into Markdown, chat, GitHub, screenshots, logs, or another project. Never borrow or recover a credential from another repository.

## Completion

DUO-002 is ready for Toby’s final review only when:

- the hybrid implementation is complete
- automated and browser checks pass
- the AI-backed signature loop is certified
- Codex’s independent QA is complete
- one current Preview is available
- GitHub, the Preview, and the reported application commit match

Production remains untouched until Toby explicitly approves release.