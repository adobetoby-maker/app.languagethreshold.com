# Atlas Duo Runner — Progressive Implementation Plan

## Build strategy

Build the smallest trustworthy coordinator first. Do not start with autonomous
Production deployment or a polished dashboard.

## Phase 0 — repository and contracts

Deliver:

- dedicated Atlas repository;
- TypeScript workspace;
- schemas;
- event and state reducer;
- project configuration format;
- fixture repositories/tasks;
- architecture decision records;
- threat model.

Tests:

- task and state schema fixtures;
- transition invariants;
- idempotent duplicate events;
- policy rejection fixtures.

Exit:

State can be reconstructed deterministically from an event fixture.

## Phase 1 — GitHub control plane

Deliver:

- GitHub App;
- webhook verification and deduplication;
- issue-form intake;
- project registry;
- task/branch/draft-PR bootstrap;
- pinned mobile status comment;
- single-writer remote-state projection;
- reconciliation against GitHub.

No agent execution yet.

Exit:

A task created on mobile produces correct GitHub artifacts without manual file
copying.

## Phase 2 — Mac Studio executor

Deliver:

- outbound executor service;
- host registration and leases;
- isolated worktrees;
- process and port registry;
- cleanup/quarantine;
- capability probes;
- one provider adapter in dry-run mode, then Claude Code and Codex adapters.

Exit:

Documentation-only jobs run independently, push exact branches, and clean up.

## Phase 3 — Duo orchestration

Deliver:

- parallel-build mode;
- lead + QA mode;
- independent input bundles;
- structured result/checkpoint validation;
- automatic cross-review dispatch;
- synthesis generation and validation;
- Toby decision card;
- integration dispatch;
- QA dispatch.

Exit:

An end-to-end non-Production task completes with no manual status relay.

## Phase 4 — designer/builder experiments

Deliver:

- designer→builder mode;
- immutable design package;
- design-fidelity review;
- crossover mode;
- versioned scoring rubric;
- role-specific performance report.

Exit:

Atlas can compare Claude and Codex by role without conflating model, design, and
implementation.

## Phase 5 — Vercel and runtime certification

Deliver:

- Preview discovery and commit mapping;
- environment-presence metadata;
- browser verification job;
- runtime-certification matrix;
- protected Production environment;
- post-deployment reconciliation.

Exit:

Atlas distinguishes build, Preview alignment, environment readiness, live-flow
certification, and Production.

## Phase 6 — portfolio and failover

Deliver:

- multi-repository portfolio view;
- MacBook Air executor;
- lease-transfer failover;
- project health and stale-task dashboard;
- cost and duration reporting;
- reusable project bootstrap command.

Exit:

Toby can operate multiple concurrent projects from one phone-first surface.

## Suggested implementation stack

- TypeScript/Node.js;
- Fastify or Hono coordinator API;
- PostgreSQL with a simple event table and projected state;
- GitHub App via Octokit;
- Zod or JSON Schema validation;
- durable job queue appropriate to hosting;
- small signed macOS executor;
- Playwright for browser verification;
- Vercel API adapter;
- OpenTelemetry-compatible logs and traces.

The implementation may change the framework choice, but it must preserve the
contracts and state-machine invariants.

## Test matrix

### Unit

- schema validation;
- state transitions;
- role isolation;
- policy engine;
- lease expiry;
- commit alignment;
- redaction.

### Integration

- GitHub App fixture repository;
- branch and draft PR creation;
- webhook deduplication;
- executor claim/heartbeat/result;
- Vercel Preview mapping;
- protected approval.

### Failure injection

- duplicate webhook;
- coordinator restart mid-transition;
- executor killed mid-run;
- Mac offline;
- push succeeds but result event lost;
- result event arrives before push;
- stale local server;
- missing Preview credential;
- branch manually advanced;
- dirty worktree;
- secret-shaped file introduced.

### Security

- malicious issue command;
- malicious repository instructions;
- fork PR;
- expired/replayed signed job;
- privilege escalation request;
- Production without approval.

## Build PR sequence

1. `foundation/contracts-and-state`
2. `github/control-plane`
3. `executor/mac-studio`
4. `adapters/claude-code`
5. `adapters/codex`
6. `orchestration/parallel-and-qa`
7. `orchestration/designer-builder`
8. `providers/vercel`
9. `ui/mobile-control`
10. `operations/macbook-failover`

Each PR has fixtures and tests. No PR should combine Production authorization
with initial executor implementation.

## Definition of MVP done

- Language Threshold registered as pilot;
- issue form starts a task;
- Atlas creates correct artifacts;
- Claude and Codex execute on isolated worktrees;
- parallel or lead+QA task progresses automatically;
- synthesis pauses for Toby;
- approved integration progresses to independent QA;
- one aligned Preview is presented;
- Production remains impossible without protected approval;
- coordinator restart and Mac-offline tests pass;
- final handoff is complete;
- Toby did not relay agent status manually.
