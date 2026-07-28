# Atlas Duo Runner

Atlas Duo Runner is a GitHub-native coordination system for Toby's portfolio of
software projects. It turns an approved task brief into a durable, restart-safe
workflow across Claude Code, Codex, the Mac Studio, the MacBook Air, GitHub, and
Vercel.

Atlas is the coordinator. Claude and Codex are executors assigned to roles.
Neither model is permanently defined as "designer" or "builder."

## Documents

1. `PRD.md` — product requirements, operating modes, and acceptance criteria.
2. `ARCHITECTURE.md` — control plane, execution plane, storage, and component
   boundaries.
3. `STATE_MACHINE.md` — task phases, events, gates, retries, and ownership.
4. `RUNNER_CONTRACT.md` — provider-neutral contract for Claude Code and Codex
   adapters.
5. `MOBILE_WORKFLOW.md` — Toby's phone-first task creation and approval
   experience.
6. `SECURITY.md` — secrets, runner trust, repository allowlists, and production
   protections.
7. `OPERATIONS.md` — installation, observability, recovery, failover, and
   cleanup.
8. `IMPLEMENTATION_PLAN.md` — progressive build plan with testable milestones.
9. `ADR/0001-github-control-plane.md` — why GitHub is the durable authority.
10. `ADR/0002-single-writer-state.md` — why Atlas alone writes canonical state.
11. `schemas/task.schema.json` — machine-readable task definition.
12. `schemas/state.schema.json` — machine-readable live task state.

## Intended repository shape

The production implementation should live in a dedicated repository:

```text
adobetoby-maker/atlas-duo-runner
```

Each managed project opts in with:

```text
.atlas-duo/
├── project.yaml
└── policy.yaml
```

The control repository stores portfolio coordination, schemas, workflows, and
runner code. Product repositories store their own briefs, branches, pull
requests, results, decisions, and final handoffs.

## Product thesis

Toby should be able to start and supervise parallel AI work from his phone
without becoming the message bus between agents or machines.

The normal human interaction should be:

1. create or approve the task;
2. choose the recommended synthesis;
3. approve or reject Production.

Everything between those gates should be observable, evidence-based, and
recoverable from GitHub.
