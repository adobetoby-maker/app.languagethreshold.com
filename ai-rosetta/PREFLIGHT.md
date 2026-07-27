# Rosetta Sync Preflight

Run this before editing on every device and in every agent workspace.

```bash
git rev-parse --show-toplevel
git remote get-url origin
git status --short --branch
git fetch origin --prune
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git rev-parse "@{upstream}" 2>/dev/null || true
npm run rosetta:check
```

Fetch the recorded coordination ref, then read current facts without merging it:

```bash
git fetch origin codex/duo-002-protocol-revision
git show origin/codex/duo-002-protocol-revision:AI_HANDOFF.md
git show origin/codex/duo-002-protocol-revision:ai-rosetta/tasks/LT-20260726-usability-onboarding/REMOTE_STATE.md
```

Replace the example ref and task path with those recorded in `AI_HANDOFF.md`.

## Required evidence

```text
repository:
device_or_surface:
task_id:
coordination_ref:
coordination_commit:
branch:
local_head:
remote_branch_head:
origin_main:
application_head:
documentation_head:
production_commit:
working_tree_clean:
dev_server_pid_port_branch_commit:
remote_verified_at:
result: aligned | blocked
```

## Proceed only when

- repository owner/name matches the handoff;
- the coordination ref and task are current;
- the working tree is understood;
- the branch belongs to the acting agent;
- the baseline is recorded;
- local and remote differences are intentional;
- the live server, if any, serves the claimed branch and commit;
- GitHub/preview/production alignment is known.

## Remote-facts rule

Agent status files are branch-local snapshots. Before treating another agent,
DUO task, PR, check, or deployment as blocked or complete, fetch current GitHub
facts and the coordination ledger. Do not require Toby to relay facts already
available from GitHub or Vercel.

## Safe synchronization

Use Git fetch/pull/push as the synchronization mechanism. Do not put active Git
working directories under filesystem mirroring. If a tree is dirty or histories
diverge, preserve both versions and reconcile through separate branches.

Do not merge the other agent's branch during independent work. Reading shared
facts from the coordination ref is allowed; reading the other solution is not.
