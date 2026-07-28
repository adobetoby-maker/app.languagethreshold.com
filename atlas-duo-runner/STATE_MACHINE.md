# Atlas Duo Runner — State Machine

## Principles

- Atlas is the only canonical-state writer.
- Agent messages are events, not state transitions by themselves.
- Every transition is idempotent.
- Human and Production gates are explicit.
- Failure and pause are states, not missing information.

## States

```text
draft
  → awaiting_task_approval
  → bootstrapping
  → role_work
  → role_checkpoint
  → cross_review
  → synthesis
  → awaiting_toby_decision
  → integration
  → integration_checkpoint
  → independent_qa
  → release_ready
  → awaiting_production_approval
  → releasing
  → verifying_production
  → done
```

Any active state may enter:

```text
paused
blocked_external
blocked_security
failed_recoverable
failed_terminal
canceled
```

## Mode-specific role work

### Parallel build

```text
role_work
├── claude_independent
└── codex_independent
```

Gate: both approved results are `independent-complete`.

### Designer → builder

```text
designing
→ design_checkpoint
→ optional_toby_design_approval
→ building
→ build_checkpoint
→ design_fidelity_review
→ technical_qa
```

The builder cannot start from a mutable design artifact. Atlas records the exact
design commit.

### Crossover

```text
round_a(designer=agent_1,builder=agent_2)
→ round_a_scored
→ round_b(designer=agent_2,builder=agent_1)
→ round_b_scored
→ comparative_synthesis
```

Both rounds use a versioned scoring rubric. Atlas reports agent performance by
role, not merely overall result.

### Lead + QA

```text
building
→ integration_checkpoint
→ independent_qa
```

The QA agent has no writer lease during implementation.

## Transition table

| From | Event | Guard | To | Action |
|---|---|---|---|---|
| draft | task.submitted | schema valid | awaiting_task_approval | publish task card |
| awaiting_task_approval | toby.task_approved | actor authorized | bootstrapping | lock baseline |
| bootstrapping | bootstrap.complete | branches/PRs/state exist | role_work | dispatch roles |
| role_work | role.completed | result and evidence valid | role_checkpoint | update role check |
| role_checkpoint | all_roles.complete | mode gate satisfied | cross_review or next role | dispatch |
| cross_review | reviews.complete | exact commits named | synthesis | generate synthesis |
| synthesis | synthesis.published | validation passed | awaiting_toby_decision | publish decision card |
| awaiting_toby_decision | toby.integration_approved | selection valid | integration | create branch/job |
| integration | builder.completed | checks and Preview aligned | integration_checkpoint | freeze app head |
| integration_checkpoint | qa.dispatched | independent reviewer | independent_qa | grant read lease |
| independent_qa | qa.passed | exact commit tested | release_ready | publish release card |
| release_ready | release.requested | policy permits | awaiting_production_approval | request environment |
| awaiting_production_approval | toby.production_approved | protected approval | releasing | merge/deploy |
| releasing | production.deployed | exact commit | verifying_production | reconcile |
| verifying_production | production.aligned | alias/commit/checks match | done | final handoff |

## Completion evidence

### Role checkpoint

- role output committed and pushed;
- branch head verified remotely;
- result document validates;
- required checks recorded;
- Preview evidence present when required;
- local server and worktree provenance recorded;
- executor emits cleanup outcome.

### Cross-review checkpoint

- both review files exist on reviewer-owned branches;
- each identifies exact subject application commit;
- each includes strengths, risks, verification, and recommendation;
- subject tree matches the recorded application head.

### Integration checkpoint

- approved sources and decisions are traceable;
- all required corrections addressed or explicitly deferred by Toby;
- application head frozen;
- tests pass;
- Preview maps to application head or documented identical application tree;
- runtime certification state is explicit.

### QA checkpoint

- reviewer is not primary implementer;
- exact commit and Preview tested;
- acceptance matrix completed;
- remaining blockers classified;
- release recommendation recorded.

## Human events

Valid human events are structured GitHub actions:

- approved issue command from Toby;
- approved checkbox/label on a decision issue;
- protected environment approval;
- signed Atlas mobile action.

Free-form chat is evidence for drafting but does not transition Production
authority until recorded in the project repository or protected environment.

## Retry policy

Default:

- network/API transient failure: exponential backoff, maximum five attempts;
- executor process failure: one clean resume, then blocked;
- test failure: no automatic retry unless failure is classified flaky;
- Preview build failure: one reconciliation, then builder correction;
- stale heartbeat: quarantine worktree, expire lease, inspect branch, then
  reschedule;
- authentication failure: `blocked_security`, no retry loop.

Retries preserve the same task and create a new `run_id`.

## Lease and heartbeat rules

- default lease: 30 minutes;
- heartbeat: every 60 seconds during active executor work;
- renewal allowed while process and worktree provenance match;
- missed three heartbeats: mark suspect;
- lease expiration: block new writer until branch and worktree are reconciled;
- failover never assumes unpushed work is disposable.

## Pause and cancel

Pause:

- stop new dispatches;
- allow current safe checkpoint operation to finish;
- preserve worktree for bounded time;
- record resume requirements.

Cancel:

- revoke leases;
- stop tracked processes;
- push recoverable work to a quarantine branch when safe;
- do not delete unpushed work blindly;
- close or label draft PRs as canceled;
- retain audit history.

## Invariants

1. At most one canonical coordinator writer per task.
2. At most one active writer lease per branch.
3. Production approval defaults false.
4. Reviewer and primary builder cannot be the same run.
5. Independent bundles exclude other solution artifacts.
6. Application, documentation, and Preview commits are distinct fields.
7. A healthy URL or port is not evidence without commit provenance.
8. Every state change has an actor and evidence.
9. No transition depends solely on Toby relaying a fact available from an API.
