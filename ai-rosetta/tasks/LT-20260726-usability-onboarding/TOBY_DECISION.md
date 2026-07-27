# Toby Decision — DUO-002

Date: 2026-07-27
Decision owner: Toby Anderton
Status: approved for integration

## Selected direction

Build the approved hybrid on `integrate/usability-onboarding`.

Track A / Claude is the experience and application base. Track B / Codex contributes the language-owned vocabulary model, regression tests, and validated Tutor-context contract.

## Role assignment

- Primary integrator: Claude Code
- Independent reviewer and QA: Codex
- Final product and release decision: Toby

## Required changes before QA

- apply every correction in `SYNTHESIS.md` and `INTEGRATION_BRIEF.md`
- configure a dedicated Language Threshold Anthropic credential for Preview
- certify the exact sentence-context regression cases
- create one current Vercel Preview aligned to the integration application commit

## Permission granted

- [x] Create integration branch
- [x] Implement the approved hybrid
- [x] Create a Vercel Preview
- [x] Perform independent QA
- [ ] Merge to `main`
- [ ] Deploy Production

Unchecked permissions must not be inferred.