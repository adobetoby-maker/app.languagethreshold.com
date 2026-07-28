# Atlas Duo Runner — Mobile Workflow

## Goal

Toby can operate Atlas from a phone without reading long logs or carrying facts
between Claude, Codex, and the Macs.

## Task creation

GitHub issue form fields:

1. Project
2. Task title
3. User problem
4. Evidence or links
5. Desired operating mode
6. Designer
7. Builder
8. Reviewer
9. Preview required
10. Production explicitly excluded by default

Recommended operating-mode labels:

- `duo:parallel-build`
- `duo:designer-builder`
- `duo:crossover`
- `duo:lead-qa`
- `duo:dual-analysis`

The form shows a plain-language recommendation:

- "Need two creative solutions?" → parallel build.
- "Testing who designs versus builds better?" → crossover.
- "Direction already chosen?" → lead + QA.
- "Want two opinions but one implementation?" → dual analysis.

## Status card

One pinned task comment is maintained by Atlas:

```text
Language Threshold · DUO-002
Phase: Integration
Claude: implementing · commit abc123
Codex: waiting for QA
Preview: building
Blocker: none
Next human action: none
Last verified: 2 minutes ago
```

The comment links to details but remains short enough for a phone.

## Decision card

When synthesis is ready:

```text
Decision needed

Recommendation: Hybrid
Base: Track A
Take from Track B: vocabulary store, tests, Tutor schema

Why: Track A is clearer on mobile; Track B prevents silent data errors.
Open gate: AI Preview test

[Approve recommendation]
[Request revision]
[Pause]
```

Actions become structured issue labels/comments handled by Atlas.

## Release card

```text
Release candidate

Preview: Open
Application commit: abc123
Independent QA: Pass
AI signature loop: Pass
GitHub/Preview aligned: Yes
Production currently: unchanged

[Approve Production]
[Reject and return to integration]
```

Production approval must use a protected GitHub Environment even if the mobile
control surface also presents an approval button.

## Notifications

Notify Toby only when:

- a genuine product decision is required;
- credential/environment ownership requires action;
- both approaches fail;
- cost/time budget needs expansion;
- QA is complete and Preview is ready;
- Production verification fails.

Do not notify for:

- normal phase transitions;
- one agent taking longer;
- API facts Atlas can recheck;
- routine retries;
- successful branch/PR creation.

## Accessibility and clarity

- no internal status jargon without a plain-language translation;
- exact project name and task always visible;
- destructive actions visually distinct;
- Preview link opens directly on mobile;
- dates shown in Toby's timezone;
- decisions summarize evidence, not model confidence alone;
- all approvals can be revoked before the protected transition begins.
