# AI Rosetta

AI Rosetta is Toby's repository-native collaboration system for keeping
projects, machines, agents, branches, deployments, and decisions aligned while
preserving useful differences between Claude and Codex.

## Authority model

GitHub is the durable source of truth.

- `main` is released source authority.
- The recorded **coordination ref** is task-control authority until its
  documentation is merged to `main`.
- Agent branches are independent implementation and evidence surfaces.
- Vercel is deployment evidence, not source authority.
- Mac Studio, MacBook Air, Claude mobile, and Codex workspaces are disposable
  working copies.

Never infer current state from whichever folder is open. Fetch first.

## Two kinds of information

### Shared facts

Facts may propagate immediately without violating independent thinking:

- repository, task, and baseline identity;
- branch and PR heads;
- PR state;
- check and deployment state;
- preview URL and attached commit;
- external blockers and their owner;
- Toby decisions;
- corrected reproducible evidence.

Shared facts live in the active task's `REMOTE_STATE.md` on the coordination
ref. The coordinator refreshes that ledger from GitHub and Vercel. Agents read
it with `git show` or through GitHub; they do not merge the coordination branch
into application work merely to see it.

### Solution reasoning

Plans, implementation choices, and recommendations remain isolated until each
agent marks its own plan `independent-complete`. Factual propagation is allowed;
solution copying is not.

## Required session lifecycle

### Start

1. Identify the repository by owner/name.
2. Fetch `origin` and the recorded coordination ref.
3. Run `ai-rosetta/PREFLIGHT.md`.
4. Read `AI_HANDOFF.md`, `REMOTE_STATE.md`, this file, and the task brief.
5. Confirm task, branch, baseline, PR, and application head.
6. Update only the current agent's status file.

If the Rosetta control files are not present in the task baseline, stop
application work. Either merge the documentation-only control PR first or
record its exact commit as the coordination ref. Never let each branch invent
its own protocol snapshot.

### Independent work

- Keep Claude and Codex on separate branches.
- Open a draft PR as soon as the branch has its first reviewable checkpoint.
- Continue within the approved brief while the other agent is still working.
- Stop only for a changed objective, an unsafe shared external dependency, a
  baseline conflict, or work outside the approved plan.
- Do not wait merely because the other agent has not finished.
- Do not cross-review until both plans/results declare the appropriate
  independent checkpoint complete.

### Checkpoint

Each result distinguishes:

- `application_head`: last commit that changes application behavior;
- `documentation_head`: current branch/PR head;
- `preview_commit`: commit attached to the preview;
- `application_tree_verified_identical`: whether later docs-only commits leave
  the application tree unchanged;
- implementation completion;
- runtime certification;
- remaining limitations.

In prose, these are the application head, documentation head, and preview
commit. They must never be collapsed into one ambiguous “current commit.”

A READY preview proves build/deployment state only. It does not certify an
AI-backed flow without the required project-scoped runtime configuration.

### Cross-review

1. Claude writes `CLAUDE_REVIEW_OF_CODEX.md` on Claude's branch.
2. Codex writes `CODEX_REVIEW_OF_CLAUDE.md` on Codex's branch.
3. Each review identifies the exact reviewed application commit.
4. The coordinator creates `coord/<task-slug>-synthesis` from the canonical
   Rosetta baseline and lands `SYNTHESIS.md` there.
5. Toby's decision is recorded there before integration.

No agent writes directly into the other agent's branch.

### Finish

1. Update your result and status.
2. Record server cleanup and secret-hygiene results.
3. Commit and push.
4. Fetch again and verify the remote SHA.
5. Confirm the PR state and preview/application alignment.
6. Ask the coordinator to refresh `REMOTE_STATE.md`; Toby is not the message
   relay.

## Completion vocabulary

- `plan-independent-complete`: initial plan locked before reading the other.
- `independent-complete`: approved implementation checkpoint committed,
  pushed, documented, and aligned to preview evidence where required.
- `runtime-certified`: required live flows passed with the correct environment.
- `cross-review-ready`: both independent checkpoints are complete.
- `awaiting-toby`: synthesis contains a product decision only Toby should make.
- `done`: decision, integration, QA, release alignment, and final handoff exist.

Open limitations do not make an independent checkpoint incomplete when they are
clearly separated, externally owned, and do not represent unfinished approved
implementation.

## External-state ownership

| State | Owner | Durable location |
|---|---|---|
| Agent plan/result | That agent | Its branch/PR |
| Branch/PR/check facts | Coordinator | `REMOTE_STATE.md` |
| Vercel preview alignment | Coordinator | `REMOTE_STATE.md` |
| Project environment variables | Project owner/operator | Vercel/project secret manager |
| Product decision | Toby | `TOBY_DECISION.md` |
| Cross-review | Reviewer | Reviewer's branch |
| Synthesis | Coordinator | Coordination/synthesis branch |

## Local server rule

A dev server record must include checkout path, branch, commit, port, PID,
start time, and owner. Stop the server at session end unless another named
reviewer is actively using it. A persistent runner requires a dedicated
worktree and port; never serve one branch while claiming to test another.

## Secret rule

- Never commit `.env` files or secret values.
- Never copy or borrow a credential from another product.
- Never recover credentials from client bundles.
- Use a dedicated project credential in the project secret manager.
- Scope Preview and Production separately.
- Record presence, scope, and owner—never the value.
- Remove temporary local credentials and stop dependent servers at handoff.

## Important files

- `AI_HANDOFF.md`: concise entrypoint.
- `ai-rosetta/PREFLIGHT.md`: synchronization proof.
- `ai-rosetta/PRD.md`: operating requirements.
- `ai-rosetta/SECURITY_BASELINE.md`: known legacy secret-path debt and
  remediation boundary.
- `ai-rosetta/tasks/<task>/REMOTE_STATE.md`: current cross-branch facts.
- `ai-rosetta/agents/`: agent-owned status snapshots.
- `ai-rosetta/tasks/`: plans, results, reviews, synthesis, and history.
- `ai-rosetta/templates/`: portable task artifacts.
