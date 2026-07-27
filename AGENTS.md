# Language Threshold — Agent Instructions

## Verified project identity

- Canonical repository: `adobetoby-maker/app.languagethreshold.com`
- Production: `https://app.languagethreshold.com`
- Framework: TanStack Start + React 19 + Vite
- Deployment: Vercel project `language-threshold-app`
- Production branch: `main`

This application is not Next.js. Its active hosting target is Vercel.
`wrangler.jsonc` is legacy configuration. Do not deploy this app with Wrangler.

## AI Rosetta — mandatory coordination

Before beginning project work:

1. Read `AI_HANDOFF.md`.
2. Fetch and read the current coordination ref and task `REMOTE_STATE.md`.
3. Read `ai-rosetta/README.md` and run `ai-rosetta/PREFLIGHT.md`.
4. Read the active task brief.
5. Update only `ai-rosetta/agents/CODEX_STATUS.md`.
6. During independent work, do not read Claude's plan until Codex's plan is marked `independent-complete`; current factual status may still be read.
7. Work from a `codex/<task-slug>` branch, never directly from `main`.
8. Open a draft PR at the first reviewable checkpoint.
9. Distinguish application head, documentation head, and preview commit.
10. Record and stop local dev servers at handoff unless a named reviewer is actively using one.
11. Use only project-scoped credentials; never borrow secrets from another repository.
12. Preserve dirty or divergent state; never reset or overwrite it to make a preflight pass.
13. Commit, push, fetch again, and verify the remote SHA before ending.
14. Production changes require Toby's explicit approval.

GitHub is the durable coordination authority. Local Mac and Codex folders are working copies.
Branch-local status is not live cross-branch truth; the task coordination ref is.

## Before touching application code

Read:

- `src/components/tab-registry.ts` — exhaustive tab registration.
- `src/state/app-state.tsx` — application state and the separate XP tier system.
- `CLAUDE.md` — current architecture, infrastructure, commands, and failure patterns.

Adding a tab requires updating both the `TabKey` union and `TAB_COMPONENTS`.
Never edit `src/routeTree.gen.ts` manually.

## Verification

Run the checks relevant to the work:

```bash
npm run rosetta:check
npx tsc --noEmit
npm run lint
npm run build
```

Report the exact branch, starting and ending commits, checks, preview or deployment evidence, remaining risks, and next action.
