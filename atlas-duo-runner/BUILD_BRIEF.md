# Atlas Duo Runner — Milestone 1 Build Brief

## Assignment

Primary builder: Codex GPT-5.6 Sol

Role: builder and implementation architect

Reviewer: Claude Code, read-only until its architecture review is published

## Objective

Build the trustworthy foundation of Atlas Duo Runner in a dedicated repository.
Milestone 1 implements contracts, deterministic state, project/task validation,
fixtures, and a simulated control plane. It does not invoke Claude or Codex,
write to Production repositories, or deploy anything.

## Required reading

Read every file under `atlas-duo-runner/`, in this order:

1. `README.md`
2. `PRD.md`
3. `ARCHITECTURE.md`
4. `STATE_MACHINE.md`
5. `RUNNER_CONTRACT.md`
6. `SECURITY.md`
7. `IMPLEMENTATION_PLAN.md`
8. both ADRs and both schemas
9. `ARCHITECTURE_REVIEW.md` when Claude publishes it

Do not silently replace an approved architectural decision. Record proposed
changes in a new ADR.

## Repository and branch

Target repository:

```text
adobetoby-maker/atlas-duo-runner
```

Working branch:

```text
codex/foundation-contracts-state
```

Open a draft pull request immediately after the initial scaffold passes tests.
Never work directly on `main`.

## Milestone 1 scope

Create:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json

apps/
└── coordinator/
    ├── package.json
    └── src/
        ├── index.ts
        └── config.ts

packages/
├── core/
│   ├── package.json
│   ├── src/
│   │   ├── events.ts
│   │   ├── state.ts
│   │   ├── reducer.ts
│   │   ├── transitions.ts
│   │   └── index.ts
│   └── test/
├── schemas/
│   ├── package.json
│   ├── src/
│   │   ├── task.ts
│   │   ├── state.ts
│   │   └── index.ts
│   └── test/
├── policy/
│   ├── package.json
│   ├── src/
│   │   ├── project-policy.ts
│   │   ├── role-isolation.ts
│   │   └── index.ts
│   └── test/
└── github-adapter/
    ├── package.json
    └── src/
        ├── contract.ts
        └── fake.ts

fixtures/
├── projects/
├── tasks/
├── events/
└── failures/

docs/
└── architecture/
```

Equivalent organization is acceptable only when the reason is documented.

## Required implementation

### Schemas

- TypeScript runtime validation for task and state schemas.
- JSON Schema files remain the external contract.
- Invalid fixtures produce actionable field-level errors.

### Event model

- append-only Atlas events;
- unique event and idempotency keys;
- deterministic timestamp handling through injected clock;
- actor/source validation;
- no secret-bearing payload fields.

### State reducer

- pure deterministic reducer;
- all phases in `STATE_MACHINE.md`;
- mode-specific guards;
- production approval defaults false;
- invalid transitions fail without mutating state;
- duplicate events are idempotent.

### Policy

- repository allowlist;
- role assignment validation;
- independent-artifact isolation;
- reviewer cannot review its own implementation run;
- one canonical-state writer;
- Production transition denied without protected approval evidence.

### Simulated GitHub adapter

Define the interface Atlas will later use for:

- issues;
- branches;
- files;
- draft PRs;
- checks;
- protected approvals.

Implement only an in-memory fake for Milestone 1. Do not request a live GitHub
credential yet.

### Coordinator simulation

Provide a command that replays a fixture task and prints state transitions:

```text
pnpm atlas:simulate fixtures/tasks/lead-qa.json
```

Include fixtures for:

- parallel build;
- designer→builder;
- crossover;
- lead + QA;
- duplicate webhook/event;
- invalid self-review;
- unauthorized Production.

## Quality contract

Required commands:

```text
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Requirements:

- Node version pinned;
- package manager pinned;
- strict TypeScript;
- no `any` at public boundaries;
- deterministic tests;
- at least 90% branch coverage for reducer and transition guards;
- secret-pattern scan;
- dependency audit reported;
- no external network required for unit tests.

## Security boundaries

- no PATs, API keys, `.env` files, cookies, or browser sessions;
- no real GitHub mutations;
- no self-hosted runner installation;
- no agent invocation;
- no Vercel connection;
- no Production deployment;
- do not add broad shell execution.

## Required result

Create `MILESTONE_1_RESULT.md` containing:

- starting and ending commits;
- exact file tree;
- architectural decisions or disagreements;
- checks and coverage;
- fixture results;
- known limitations;
- security review;
- what Claude should inspect;
- Milestone 2 recommendation.

Milestone 1 is complete only when the draft PR is pushed and Claude's review can
reproduce all checks from a clean clone.
