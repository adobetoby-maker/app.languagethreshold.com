# CODEX_PLAN - DUO-002

Status: `independent-complete`

Agent: Codex

Branch: `codex/usability-onboarding`

Baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Verified implementation head: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`

Review PR: [#4](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/4)

## Independence checkpoint

The independent Codex implementation is complete. Its implementation and original
product reasoning were finished before this checkpoint inspected Track A's result.
This checkpoint adds Rosetta documentation only and does not change application
behavior.

## Product approach

- Put the Reader and its contextual word interaction before the toolkit map.
- Preserve all legitimate learning tools while explaining their purpose and
  relationships.
- Carry structured Reader context into the first matching Tutor turn.
- Make saved vocabulary language-owned and synchronize it idempotently into
  Flashcards.
- Delay account-saving pressure until after demonstrated value.
- Reserve mobile space for fixed navigation and Tutor controls.
- Keep specialty tools behind their existing module gates.
- Use restrained semantic accents while preserving the established themes.

## Implementation disposition

The branch implementation covers the Reader-first entry, contextual guidance,
Reader-to-Tutor context, vocabulary continuity, progress-prompt timing, fixed
control clearance, learner-safe diagnostics, Grammar wait/retry states, complete
tool inventory, and advertising source documents.

Independent implementation is complete. Independent runtime certification is
not complete because the live AI-backed Tutor flow remains constrained by the
API limitation recorded in `CODEX_RESULT.md`.

## Checkpoint plan

1. Run the Rosetta, typecheck, lint, and build commands against the exact PR head.
2. Verify PR #4 and its Vercel status directly from GitHub.
3. Record the READY preview only when its status is attached to the same SHA.
4. Compare Track A's `CLAUDE_RESULT.md` with PR #3 and its current Vercel status
   without changing Claude's branch.
5. Commit and push only these Codex checkpoint documents.
