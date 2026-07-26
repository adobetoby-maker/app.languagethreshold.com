# Rosetta Sync Preflight

Run this before editing code on every device and in every agent workspace.

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

Then compare against `AI_HANDOFF.md` and the active task brief.

## Required evidence

Record:

```text
repository:
device_or_surface:
task_id:
branch:
local_head:
remote_branch_head:
origin_main:
production_commit:
working_tree_clean:
remote_verified_at:
result: aligned | blocked
```

## Proceed only when

- repository owner/name matches the handoff;
- the working tree is understood;
- the task ID is current;
- the branch belongs to the acting agent;
- the starting commit is recorded;
- local and remote differences are intentional;
- GitHub and production alignment is known.

## Mobile rule

Claude mobile may inspect GitHub, summarize state, and record Toby's direction.
It must not claim that a Mac checkout is synchronized without GitHub evidence
from that device's next preflight.

## Safe synchronization

Use Git fetch/pull/push as the synchronization mechanism. Do not place active
Git working directories under Dropbox, iCloud Drive, OneDrive, or another
filesystem mirroring service. If a working tree is dirty or histories diverge,
stop and preserve both versions.

