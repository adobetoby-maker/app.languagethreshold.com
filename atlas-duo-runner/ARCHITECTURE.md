# Atlas Duo Runner — System Architecture

## Architecture summary

Atlas separates durable coordination from ephemeral execution.

```text
Toby mobile / CLI
        │
        ▼
GitHub issue + protected approvals
        │
        ▼
Atlas Coordinator ────────────────┐
  state machine                   │
  policy engine                   │
  reconciliation                  │
  branch/PR manager               │
        │                         │
        ├──── GitHub App/API ◄────┤
        ├──── Vercel adapter      │
        └──── Job queue           │
                    │             │
          lease + signed job      │
                    ▼             │
       Mac Studio Executor        │
       ├── Claude adapter         │
       ├── Codex adapter          │
       ├── isolated worktrees     │
       └── browser/test runner    │
                    │             │
                    └── events ───┘

MacBook Air Executor = optional failover after lease transfer
```

GitHub holds the authoritative task record. Local worktrees and coordinator
cache can be deleted and reconstructed.

## Repository topology

### Control repository

Recommended:

```text
adobetoby-maker/atlas-duo-runner
```

Contains:

```text
.github/
├── ISSUE_TEMPLATE/atlas-duo-task.yml
└── workflows/
    ├── atlas-intake.yml
    ├── atlas-reconcile.yml
    └── atlas-release.yml

apps/
├── coordinator/
└── mobile-control/

packages/
├── core/
├── github-adapter/
├── vercel-adapter/
├── executor-protocol/
├── claude-adapter/
├── codex-adapter/
└── policy/

schemas/
templates/
docs/
```

### Managed product repository

```text
.atlas-duo/
├── project.yaml
└── policy.yaml

AI_HANDOFF.md
ai-rosetta/
└── tasks/<task-id>/
```

The control repo stores pointers and live coordination. The product repo stores
the work and evidence that belong with the product.

## Control plane

### Intake service

Inputs:

- GitHub issue form;
- `atlas task create`;
- future authenticated mobile web form.

Responsibilities:

- validate `task.schema.json`;
- verify the repository allowlist;
- resolve default branch and baseline;
- load project policy;
- estimate requested operating mode and cost class;
- create immutable task ID;
- request Toby approval if the task was not already approved.

### Coordinator

The coordinator is a deterministic state machine, not an LLM.

Responsibilities:

- serialize task transitions;
- create branches, PRs, checks, and task artifacts;
- generate role-specific executor jobs;
- maintain leases;
- accept executor events;
- reconcile external facts;
- detect stale or contradictory state;
- schedule retries;
- pause at human/security gates.

An LLM may draft synthesis prose, but the coordinator decides whether the
synthesis phase is allowed to start.

### Policy engine

Evaluates:

- repository and actor allowlists;
- allowed operating modes;
- agent/model budget;
- permitted file scopes;
- required tests;
- Preview policy;
- Production gate;
- self-hosted runner eligibility;
- timeout and retry policy.

Policy is versioned. Every task records the exact policy commit used.

### Reconciler

Reconciliation is authoritative over optimistic agent status.

It compares:

- expected branch and actual branch SHA;
- reported application head and file-tree comparison;
- PR metadata and reported PR status;
- Preview deployment and commit;
- runner lease and heartbeat;
- server working directory, commit, PID, and port;
- expected artifacts and actual repository contents.

It emits discrepancy events instead of silently rewriting agent-owned results.

## Execution plane

### Host agent

A small Atlas Executor service runs on registered machines.

Recommended hosts:

- Mac Studio: primary;
- MacBook Air: failover/manual assignment.

The host agent:

- polls or receives signed jobs;
- claims a time-limited lease;
- creates a dedicated worktree;
- verifies clean baseline;
- injects role-scoped configuration;
- invokes the provider adapter;
- streams structured status;
- runs requested checks;
- uploads bounded artifacts;
- cleans the worktree and processes.

It does not accept arbitrary shell commands directly from issue text.

### Worktree isolation

Each job uses:

```text
${ATLAS_WORKSPACE_ROOT}/<project-id>/<task-id>/<role>/<run-id>/
```

Rules:

- exact commit checkout;
- no shared `node_modules` writes between concurrent jobs unless using a
  content-addressed read-only cache;
- one dev-server port allocation per run;
- PID and working directory recorded;
- no use of the user's ordinary working clone;
- no destructive cleanup outside the validated run directory.

### Runner leases

A lease contains:

- task and run ID;
- host ID;
- role;
- worktree path hash;
- claimed branch;
- expiration;
- heartbeat;
- allowed operations.

Only one active writer lease may exist per task role/branch. MacBook Air
failover requires the Studio lease to expire or be explicitly released.

## Executor adapters

Adapters isolate model-specific invocation.

### Claude adapter

MVP target: supported Claude Code CLI on a registered Mac.

### Codex adapter

MVP target: supported Codex CLI on a registered Mac. A future Codex Cloud
adapter may be added only through a documented supported API.

Both implement the same contract from `RUNNER_CONTRACT.md`. The coordinator does
not parse conversational prose to determine completion; it consumes structured
events plus GitHub evidence.

## GitHub integration

Use a GitHub App rather than a broad personal access token.

Minimum expected permissions:

- Contents: read/write on opted-in repositories;
- Pull requests: read/write;
- Issues: read/write;
- Checks: read/write;
- Actions: read;
- Deployments: read;
- Metadata: read.

GitHub webhooks:

- issues and issue labels;
- pull requests;
- check suites/runs;
- push;
- deployment and deployment status;
- workflow dispatch.

Webhook deliveries are deduplicated by delivery ID.

## Vercel integration

Vercel adapter responsibilities:

- find project by configured immutable project ID;
- list Preview and Production deployments;
- map deployment to Git commit;
- inspect READY/ERROR/CANCELED status;
- return alias and environment;
- record environment-variable presence metadata without values;
- never promote to Production outside the protected release transition.

Preview protection is a project policy choice. Atlas must report whether Toby can
open the URL from mobile; it must not silently weaken access controls.

## State storage

### Durable authority

- GitHub task issue: user-visible event and decision log;
- coordination branch: canonical Markdown/JSON state;
- product branches and PRs: implementation evidence;
- protected environment approvals: release authority.

### Coordinator database

The coordinator may use SQLite for a single-host prototype and PostgreSQL for
multi-host production.

The database is a materialized operational view, not the only durable record.
It stores:

- webhook deduplication IDs;
- active leases;
- queued jobs;
- heartbeats;
- retry counters;
- cached external facts.

Atlas can rebuild task state from GitHub plus provider APIs.

## Event model

Every event has:

```json
{
  "event_id": "uuid",
  "task_id": "DUO-20260727-example",
  "run_id": "uuid-or-null",
  "source": "github|atlas|executor|claude|codex|vercel|toby",
  "type": "string",
  "occurred_at": "RFC3339",
  "idempotency_key": "string",
  "payload": {}
}
```

Events are append-only. Canonical state is a projection produced by the
single-writer coordinator.

## Agent input bundles

Atlas produces immutable bundles containing:

- task brief and acceptance criteria;
- repository identity and exact baseline;
- role and mode;
- permitted branches and files;
- required checks;
- stopping rules;
- output schema;
- task-scoped factual state.

In independent phases, bundles exclude the other solution. After the boundary,
review bundles include the exact subject commit and allowed artifacts.

## Synthesis architecture

When both reviews exist:

1. coordinator validates reviewed commit identity;
2. coordinator gathers plans, results, reviews, verification, and Toby evidence;
3. synthesis generator produces agreements, disagreements, recommended
   integration sources, and unresolved decisions;
4. deterministic validator ensures every recommendation cites evidence;
5. Atlas publishes the synthesis on the coordination branch;
6. task pauses for Toby.

Synthesis cannot be written on an executor branch and treated as joint truth.

## Release architecture

```text
QA pass
  → release-ready check
  → Toby protected-environment approval
  → merge approved integration PR
  → Vercel Production deployment
  → commit/alias reconciliation
  → final handoff
```

If Production and GitHub differ, Atlas reports mismatch and stops. Rollback
requires an explicit target commit and approval.

## Deployment options

### MVP

- coordinator and database on Mac Studio;
- GitHub App webhooks through a secure tunnel or polling fallback;
- Mac Studio executor as a separate service;
- GitHub as durable authority.

### Recommended production

- coordinator hosted on a small managed service;
- PostgreSQL;
- GitHub App webhook endpoint;
- Mac Studio and Air connect outbound only to claim jobs;
- no inbound port exposed on either Mac;
- Vercel hosts the optional mobile control surface.

Outbound-only executors materially reduce home-network risk.
