# DUO-002 Baseline Record — Claude Code

Recorded: 2026-07-26
Agent: Claude Code (Fable/Sonnet session)
Task: `LT-20260726-usability-onboarding`

## Prerequisite verification (PRD §5)

| # | Prerequisite | Status | Evidence |
|---|---|---|---|
| 1 | DUO-001 complete (Vercel previews usable) | **UNVERIFIED** | Not confirmed by this agent — see Open Items |
| 2 | Verify current GitHub `main` commit | PASS | `8dff4f2b03f5e81a55894574e8ef3326d80d1116` — "chore: verify auto-deploy after repo rename", 2026-07-26T15:21:22Z |
| 3 | Verify production commit and deployment | **PARTIAL** | Vercel project `language-threshold-app` confirmed serving `app.languagethreshold.com`; exact prod commit SHA not yet mapped to `8dff4f2b` |
| 4 | Inspect recent Claude theme/lighting/color changes | PENDING | Deferred to independent review phase |
| 5 | Preserve accepted work already completed | PASS | Branch cut from `main` with zero modifications |
| 6 | Both agent branches begin from same commit | PASS (Claude side) | `claude/usability-onboarding` @ `8dff4f2b`. Codex branch `codex/usability-onboarding` @ `79da1c10` — descends from `main`; matches BRIEF baseline `8dff4f2b` |
| 7 | Neither branch has unrelated uncommitted work | PASS (Claude side) | `git status --porcelain` empty at branch creation |
| 8 | Record baseline in Rosetta task folder | PASS | This file |

## Claude branch

```text
Branch:          claude/usability-onboarding
Starting commit: 8dff4f2b03f5e81a55894574e8ef3326d80d1116
Working tree:    clean at creation
Local checkout:  /Users/drive/projects-local/app-lt
```

## Repository note — rename

The repository was renamed from `language-lens-elite` to `app.languagethreshold.com`.
Local symlinks `~/language-lens-elite` and `~/language-threshold` point at
`/Volumes/Drive 2/...`, which is **unreadable** from agent processes (EINTR /
macOS sandbox restriction, confirmed via `diskutil`). A fresh clone was made to
internal SSD at `/Users/drive/projects-local/app-lt` to work around this.

Any agent picking this up should use the fresh clone, not the symlinks.

## Independence attestation (PRD §6)

At the time of this record, Claude Code has **not** read `CODEX_PLAN.md`.
Verified: `CODEX_PLAN.md` does not exist on `codex/usability-onboarding` as of
`79da1c10`.

Claude has read `AI_HANDOFF.md` §6, which contains Codex's source/product review.
This is **not** a protocol violation: that same Codex review is reproduced as
shared evidence in the PRD itself (§4, "Codex's source/product review"), making
it shared fact rather than an independent proposed solution.

## Open items requiring founder input

1. **DUO-001 status unconfirmed.** PRD §5.1 requires it complete before
   implementation. Independent review can proceed regardless; implementation
   should not start until preview deploys are confirmed working.
2. **Production commit mapping.** Confirm production is serving `8dff4f2b`
   before treating live-site observations as baseline-accurate.
