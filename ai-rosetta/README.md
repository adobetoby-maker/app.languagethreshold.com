# AI Rosetta

AI Rosetta is Toby's repository-native collaboration system for keeping
projects, machines, agents, branches, deployments, and decisions aligned.

## Authority model

GitHub is the durable source of truth. The following are working surfaces:

- Claude mobile: reads status and gives product decisions through GitHub-aware
  conversations.
- Claude Code on Mac Studio: a local Git checkout.
- Claude Code on MacBook Air: a separate local Git checkout.
- Codex: a task-specific checkout that may be disposable.
- Vercel: production and preview deployment evidence, not source code authority.

No local folder is authoritative merely because it is open or newer-looking.
A session may proceed only after comparing it with GitHub.

## Required session lifecycle

### Start

1. Identify the repository by owner/name, not folder name alone.
2. Run `ai-rosetta/PREFLIGHT.md`.
3. Confirm the active task ID, branch, GitHub baseline, and production commit.
4. Read `AI_HANDOFF.md`, this file, and the task brief.
5. Update only the current agent's status file.
6. Create or use the recorded agent branch.

### Work

- Keep Claude and Codex on separate branches.
- Preserve independent reasoning until both plans are complete.
- Record file claims before changing shared-risk files.
- Never use another machine's unpushed filesystem as project state.
- Treat mobile instructions from Toby as decisions only after they are recorded
  in the task or decision file.

### Finish

1. Update the agent result/status and task handoff.
2. Commit and push the branch.
3. Fetch GitHub again.
4. Confirm the remote branch SHA equals the pushed SHA.
5. Record preview/deployment evidence if relevant.
6. Leave a precise next action and blocker.

## Conflict rule

Do not automatically merge, pull, reset, or overwrite when any of these differ:

- repository identity;
- active task ID;
- local and remote branch;
- local uncommitted work;
- baseline commit;
- production commit;
- another agent's file claim.

Stop application work, preserve local changes, and report the mismatch.

## Important files

- `AI_HANDOFF.md`: short current entrypoint.
- `ai-rosetta/PORTFOLIO.md`: projects and current work at a glance.
- `ai-rosetta/PREFLIGHT.md`: required synchronization proof.
- `ai-rosetta/PRD.md`: complete product and operating requirements.
- `ai-rosetta/agents/`: separate agent status files.
- `ai-rosetta/tasks/`: durable task history and evidence.
- `ai-rosetta/templates/`: portable project/task templates.

