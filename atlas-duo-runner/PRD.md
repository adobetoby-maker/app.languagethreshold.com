# PRD — Atlas Duo Runner

## Product owner

Toby Anderton

## Status

Architecture-ready proposal

## Purpose

Build a reusable GitHub-native runner that coordinates Claude Code and Codex
across Toby's repositories and computers while preserving independent thinking,
preventing branch collisions, and minimizing manual intervention.

The runner must support genuine role-based experiments. The system cannot treat
"Claude" as synonymous with designer or "Codex" as synonymous with builder.
Agent identity and assigned role are separate fields.

## User problem

Toby works from a phone, Mac Studio, and MacBook Air while many sites and tasks
are active simultaneously. Today, coordination requires repeated chat relays:

- telling one agent that the other finished;
- explaining which branch or commit is current;
- identifying which local server is actually running;
- correcting stale handoff files;
- moving decisions from chat into GitHub;
- checking whether a Preview belongs to the reported application commit;
- deciding when cross-review, synthesis, integration, or QA may begin.

The DUO-002 run proved that GitHub can preserve independent work, but it also
showed that a written protocol alone does not propagate facts or start the next
phase automatically.

## Product outcome

From a mobile-friendly GitHub issue or small Atlas web view, Toby can:

1. choose a repository;
2. describe the objective;
3. choose or accept a Duo operating mode;
4. start the task;
5. receive a synthesis only when evidence gates pass;
6. approve one integration direction;
7. receive one QA-certified Preview;
8. explicitly approve or reject Production.

Atlas handles the rest through GitHub branches, draft pull requests, runner
leases, provider adapters, checks, state reconciliation, and structured
artifacts.

## Personas and roles

### Toby — product owner

- supplies product intent;
- resolves true product choices;
- approves synthesis and Production;
- does not relay machine-verifiable facts.

### Atlas — coordinator

- validates task input;
- creates task state, branches, and draft PRs;
- assigns roles;
- dispatches agents;
- refreshes GitHub/Vercel facts;
- enforces phase gates;
- records the canonical state;
- pauses only at declared human gates.

Atlas does not design or implement product changes.

### Designer

- investigates the user problem;
- writes the experience specification and acceptance criteria;
- may create wireframes or interaction descriptions;
- does not edit application code in designer-only mode.

### Builder

- implements the approved design;
- records deviations and technical constraints;
- does not silently redesign the product.

### Independent reviewer

- verifies the exact application commit;
- tests product, architecture, accessibility, security, and regressions;
- cannot approve its own implementation.

Claude or Codex may hold any executor role.

## Operating modes

### 1. Parallel build

Both agents independently design and implement the same brief, then cross-review.
This is the mode used by DUO-002.

Use when exploring meaningfully different solutions is more valuable than speed.

### 2. Designer → builder

One agent produces a locked design package. The other implements it. The
designer then reviews design fidelity; Atlas also runs technical verification.

Use when role specialization is the experiment.

### 3. Crossover

Run two comparable rounds:

- Round A: Claude designs; Codex builds.
- Round B: Codex designs; Claude builds.

Use the same scoring rubric and comparable scope. This is the correct mode for
determining which agent is the stronger designer or builder.

### 4. Lead + independent QA

One agent implements; the other remains read-only until the checkpoint, then
performs QA.

Use for routine work after the preferred design direction is known.

### 5. Dual analysis, single build

Both agents independently analyze and plan. Atlas creates a synthesis. Toby
selects a plan, and one agent implements it.

Use when design divergence is useful but two full implementations are wasteful.

## Core requirements

### R1 — portfolio registry

Atlas maintains a registry of managed repositories containing:

- stable project ID;
- GitHub owner/repository;
- friendly name;
- production URL and provider;
- default branch;
- approved executor adapters;
- required checks;
- Preview and Production environment names;
- Mac runner affinity;
- current task and release state.

Local directory paths are device configuration, not project identity.

### R2 — task intake

Tasks originate from a GitHub issue form, CLI, or Atlas API. Every task has:

- immutable task ID;
- repository and verified baseline;
- objective and evidence;
- mode;
- role assignments;
- constraints and non-goals;
- required outputs;
- acceptance criteria;
- verification contract;
- human gates;
- production authorization defaulting to false.

Atlas rejects incomplete or contradictory tasks with actionable errors.

### R3 — role isolation

Atlas generates role-specific input bundles. A designer-only executor cannot
receive implementation instructions. During independent work, an executor
cannot receive the other executor's solution artifacts before its checkpoint.

Machine-verifiable facts may propagate without exposing solution reasoning.

### R4 — GitHub-native coordination

Atlas creates and maintains:

- task issue;
- coordination ref;
- agent or role branches;
- draft PRs at first reviewable checkpoint;
- canonical remote-state ledger;
- status checks;
- cross-review artifacts;
- synthesis;
- Toby decision;
- integration branch;
- QA report;
- final handoff.

All mutations are idempotent and attributable to Atlas or an executor.

### R5 — local executor control

The Mac Studio is the preferred execution host. The MacBook Air is an optional
failover or explicitly assigned host, not a simultaneous writer by default.

Each run receives:

- a dedicated worktree;
- an exact baseline;
- an exclusive lease;
- a role-specific prompt bundle;
- scoped credentials;
- a server/port allocation when needed;
- cleanup instructions;
- a maximum duration and heartbeat interval.

### R6 — provider adapters

Atlas uses provider-neutral adapters for Claude Code and Codex. Adapters must:

- probe installed capabilities;
- prepare an isolated run;
- execute or resume;
- emit structured events;
- capture exit status and evidence;
- stop safely;
- never depend on GUI automation or private session cookies.

Unsupported CLI flags or remote APIs must be detected, not assumed.

### R7 — factual reconciliation

Atlas periodically or eventfully reconciles:

- GitHub branch heads;
- PR state and checks;
- application versus documentation heads;
- Preview deployment and commit;
- Production deployment and alias;
- runner heartbeat and worktree provenance;
- required artifact presence.

Branch-local status never overrides verified remote facts.

### R8 — automatic phase progression

When a phase gate passes, Atlas starts the next non-human phase automatically.

Examples:

- both independent results complete → start cross-review;
- both reviews complete → generate synthesis;
- Toby decision recorded → create integration branch and dispatch integrator;
- integration checkpoint complete → dispatch independent QA;
- QA pass → present release-ready decision.

Atlas does not advance through a missing human or security gate.

### R9 — mobile control

Every human decision must be understandable and actionable on a phone. A
decision card contains:

- current project/task;
- what changed;
- exact Preview link;
- agreements;
- meaningful disagreements;
- recommendation;
- risks;
- buttons or labels for approve, revise, pause, or cancel.

Toby should not need to inspect raw YAML to operate the system.

### R10 — preview and production safety

A READY Preview is not runtime certification. Atlas distinguishes:

- build passed;
- Preview attached to exact application commit;
- required environment present;
- required live flows passed.

Production requires a separate protected GitHub Environment and Toby's explicit
approval. No conversational inference can set `production_approved: true`.

### R11 — recovery

Atlas is restart-safe. On restart it reconstructs task state from GitHub,
runner leases, checks, and provider records.

It must safely handle:

- agent timeout;
- stale heartbeat;
- Mac offline;
- partially pushed branch;
- runner crash;
- Preview failure;
- duplicate webhook;
- coordinator restart;
- local dirty state;
- conflicting human edits.

### R12 — auditability

Every phase transition records:

- event ID;
- task ID;
- actor;
- previous and next state;
- exact repository commit;
- timestamp;
- evidence links;
- reason.

No secrets or full prompt transcripts containing secrets enter the audit log.

## Human intervention budget

For a normal task, Atlas should require Toby at no more than three points:

1. approve/start the brief;
2. approve synthesis or request revision;
3. approve or reject Production.

Atlas may request an additional decision only when:

- product intent is genuinely ambiguous;
- a security or credential owner must act;
- both solutions fail acceptance criteria;
- a destructive recovery choice is required;
- cost exceeds the task budget.

## Non-goals for version 1

- replacing GitHub;
- building a general-purpose autonomous-agent marketplace;
- executing untrusted public pull requests on Toby's Macs;
- merging competing implementations automatically;
- giving agents unsupervised Production authority;
- synchronizing active Git repositories through iCloud, Dropbox, or Drive;
- scraping web-session credentials;
- automating Claude or Codex desktop GUIs;
- storing model API keys in task files;
- statistically proving model superiority from one task.

## Success metrics

- manual status-relay messages per task: target zero;
- wrong-branch or wrong-server reviews: target zero;
- Preview/commit mismatches reaching Toby: target zero;
- median human approvals per normal task: three or fewer;
- restart recovery without task recreation: 100%;
- Production changes without explicit Toby approval: zero;
- tasks with complete audit trail and final handoff: 100%;
- cross-role experiments with agent and role separated in data: 100%.

## Acceptance criteria for MVP

1. A mobile-created GitHub issue starts a registered task.
2. Atlas validates repository identity and exact baseline.
3. Atlas creates a coordination ref, task folder, role branches, and draft PRs.
4. Parallel and designer→builder modes both work.
5. Claude and Codex adapters run in separate worktrees.
6. Independent artifacts remain isolated until their checkpoints.
7. Atlas alone updates canonical task state.
8. A stale or mismatched local server is rejected as verification evidence.
9. Both cross-reviews trigger synthesis without Toby relaying completion.
10. The task pauses at the synthesis decision.
11. Approval creates the integration branch and dispatches the assigned builder.
12. Independent QA runs against the exact integration application commit.
13. Preview build, commit alignment, environment readiness, and runtime
    certification are reported separately.
14. Production cannot start without protected-environment approval.
15. Runner crash and Mac-offline recovery tests pass.
16. No secret values appear in commits, logs, artifacts, or PR comments.
17. A completed task generates `FINAL_HANDOFF.md` and updates the portfolio.

## Required implementation handoff

The first builder must report:

- implementation branch and commits;
- installed GitHub App permissions;
- registered runners and labels;
- supported executor adapter versions;
- schema validation results;
- end-to-end task fixture results;
- failure-injection results;
- mobile issue and decision screenshots;
- remaining manual steps;
- exact security limitations;
- what is ready for the first live non-Production pilot.
