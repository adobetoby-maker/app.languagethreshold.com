# AI Handoff

Canonical repository: `adobetoby-maker/app.languagethreshold.com`
Canonical Rosetta baseline: `codex/ai-rosetta-control` at `738f5152736c43732de630e30989adf66101fa80`
Coordination branch: `codex/duo-002-protocol-revision`
Production: `https://app.languagethreshold.com`
Production branch: `main`
Deployment: Vercel project `language-threshold-app`
Verified production baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Active Rosetta task: `LT-20260726-usability-onboarding`
Task phase: `cross-review-ready`
Production changes approved: no

## Current independent checkpoints

- Claude: `claude/usability-onboarding`, PR #3, implementation
  `e668022f5941d82b4acc54568d8604beea914b7b`, `independent-complete`.
- Codex: `codex/usability-onboarding`, PR #4, implementation
  `8e3c6b438c10f133be4d42d124b00f445a6dd03c`, `independent-complete`.
- Both reported implementation commits have successful Vercel deployments.
- Preview AI runtime certification remains blocked by missing or unverified
  project-scoped `ANTHROPIC_API_KEY` configuration.

## Start here

1. Read `ai-rosetta/README.md`.
2. Run `ai-rosetta/PREFLIGHT.md`.
3. Read the active task's `REMOTE_STATE.md` directly from the current
   coordination ref.
4. Read the active task brief.
5. During independent work, read only your own plan/result.
6. Update only your own agent status and result files.
7. Before ending, push and verify the remote branch, PR state, and exact
   preview/application commit.

GitHub is the durable coordination authority. Branch-local status is a snapshot,
not live truth. Current cross-branch facts come from the coordination ref and
fresh GitHub/Vercel checks—not from chat relays.
