# CODEX_RESULT - DUO-002 Rosetta checkpoint

Status: `independent-complete`

Agent: Codex

Branch: `codex/usability-onboarding`

Baseline and Production commit: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Verified implementation and preview head: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`

Review PR: [#4](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/4)

GitHub currently reports PR #4 as open and ready for review, not draft. This
checkpoint uses the requested PR number but does not change its review state.

## Completion declaration

The independent Codex implementation is complete. This checkpoint changes
Rosetta documentation only; it does not modify application behavior. Runtime
certification remains incomplete where explicitly noted below.

## Checks run at the verified implementation head

| Check | Result |
| --- | --- |
| Rosetta preflight repository, remote, branch, local/upstream SHA, and `origin/main` checks | Aligned before documentation edits |
| `npm run rosetta:check` | Exit 0; 5 tests passed, 0 failed |
| `npx tsc --noEmit` | Exit 0; no diagnostics |
| `npm run lint` | Exit 0; 0 errors and 75 retained warnings |
| `npm run build` | Did not complete in this checkout; two attempts remained idle in `vite build` and were stopped |

The branch's existing `REPAIR_REPORT.md` records a successful production build
for the implementation before publication. This checkpoint does not replace
that evidence with a new success claim because the current local build attempts
did not finish.

## Vercel preview

- Status: `READY`
- Commit: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`
- Preview:
  https://language-threshold-app-git-code-cd38a2-adobetoby-5572s-projects.vercel.app
- Vercel deployment record:
  https://vercel.com/adobetoby-5572s-projects/language-threshold-app/DmRNArKfaS1Y7RbcaLwkShQrLTWR
- Alignment evidence: GitHub's successful `Vercel` status and edited Vercel PR
  comment are both attached to the exact commit above.

## Unresolved API limitation

A live sentence-aware Tutor response and stale-context expiry were not certified
in this checkpoint. Those flows require a working `ANTHROPIC_API_KEY`; no
dedicated Language Threshold credential was available for local verification.
The READY deployment proves that the preview built for the recorded SHA, not
that every AI-backed request was exercised or that preview secret configuration
was independently confirmed.

## Track A verification

Track A was inspected read-only from `origin/claude/usability-onboarding`.
Claude's branch was not checked out or edited.

- PR #3 current head:
  `43de363bfee68ce239363394ba5f790cdf14981e`
- PR #3 aligned READY preview:
  https://language-threshold-app-git-clau-55c225-adobetoby-5572s-projects.vercel.app
- Track A Vercel deployment record:
  https://vercel.com/adobetoby-5572s-projects/language-threshold-app/9TU1i1VRKTU2mxaPnFv6hwAr5wcs
- `CLAUDE_RESULT.md` reports head `8dc1400`, not the current PR head.
- `CLAUDE_RESULT.md` does not report the current aligned READY preview.

Result: **mismatch**. GitHub has a READY preview aligned to Track A's current
head, but Track A's result document is stale and does not record either current
value.

## Boundaries

- No application behavior changed in this checkpoint.
- No Claude branch file was edited.
- PR #4 was not merged.
- Production was not deployed.
- `main` and Production remain at
  `8dff4f2b03f5e81a55894574e8ef3326d80d1116`.
