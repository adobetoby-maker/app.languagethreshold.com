# SYNTHESIS — DUO-002

Status: approved for integration
Date: 2026-07-27
Shared baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Track A application: `e668022f5941d82b4acc54568d8604beea914b7b`
Track B application: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`
Integration branch: `integrate/usability-onboarding`

## Toby’s decision

Approve a hybrid. Track A is the application and experience base. Claude Code is the primary integrator. Codex is the independent technical reviewer and QA agent. No Production merge or deployment is authorized.

## Why

Track A produced the stronger learner experience: language-first entry, Reader-first onboarding, the Tutor docked into mobile navigation, clearer discovery of tappable words, and better preservation of the Reader → Word Card → Tutor signature loop.

Track B produced the stronger technical safeguards: vocabulary owned by language, executable regression tests, and a schema-validated Tutor context carrying the exact selected word and sentence.

## Preserve from Track A

- language-first entry and matching beginner passage
- Reader-first onboarding before the broader toolkit map
- mobile Tutor docked into the bottom navigation
- More Languages roadmap expander
- per-pane interaction guidance
- centered passage and selected-sentence forwarding
- no persistent dotted underline on every word; use a concise tap hint and at most one temporary example

## Port from Track B

- `src/state/vocab-store.ts` language-owned vocabulary model
- vocabulary and learner-diagnostic regression tests
- Zod-validated `readerContext` for Tutor
- exact word, sentence, passage excerpt, explanation, title, and learner level in the Tutor request

## Corrections required during integration

1. Recover legacy saved words when `vocabLang` is null; never silently discard them.
2. Add a regression test for that exact pre-fix production state.
3. Use deterministic word normalization instead of ambient-locale lowercasing.
4. Restore direct mobile Language Match access in More.
5. Correct personalization wizard Back targets.
6. Remove the duplicate Flashcards CTA.
7. Make tappable Reader words keyboard-accessible.
8. Remove documentation trailing whitespace.

## Runtime certification gate

Use a dedicated Language Threshold `ANTHROPIC_API_KEY` in the Vercel Preview environment. Never borrow, copy, recover, or reuse a credential from another project.

Certify these cases end-to-end:

- `Dove abiti?` is analyzed against that exact sentence.
- `prenotazione` is correctly identified as the object of `confermare`.
- no invented `riporto`, incorrect “object of per,” or inappropriate “nominative case” explanation appears
- Word Card → Ask Tutor retains the exact selected word and sentence
- changing the selected word cannot reuse stale context

## Mobile acceptance

At 390px and 430px widths:

- Tutor covers no Reader or lesson content
- bottom navigation remains usable
- Word Card closes and scrolls fully
- the learner reaches the first useful interaction quickly
- detailed study guidance follows rather than precedes the magic moment
- no mass dotted underlines remain

## Role assignment

Claude Code owns implementation on `integrate/usability-onboarding`. Codex first reads this synthesis and the integration brief, then remains read-only until Claude declares the integration checkpoint complete. Codex then performs independent QA. If Codex finds a blocker, Claude fixes it unless Toby explicitly reassigns that correction.

## Release boundary

Integration may produce a Vercel Preview. It may not merge to `main` or deploy Production until Toby reviews the final preview and explicitly approves release.