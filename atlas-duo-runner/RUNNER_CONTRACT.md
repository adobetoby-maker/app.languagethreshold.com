# Atlas Duo Runner — Executor Contract

## Purpose

This contract lets Atlas coordinate Claude Code, Codex, and future executors
without embedding provider-specific assumptions in the state machine.

## Adapter interface

Each adapter implements:

```ts
interface ExecutorAdapter {
  probe(): Promise<CapabilityReport>
  prepare(job: AtlasJob): Promise<PreparedRun>
  start(run: PreparedRun): Promise<RunHandle>
  resume(handle: RunHandle, input: ResumeInput): Promise<RunHandle>
  status(handle: RunHandle): Promise<RunStatus>
  cancel(handle: RunHandle): Promise<CancelResult>
  collect(handle: RunHandle): Promise<RunResult>
  cleanup(handle: RunHandle): Promise<CleanupResult>
}
```

Atlas must call `probe()` and validate capabilities before dispatch. It cannot
assume a CLI option, model name, sandbox feature, or remote API exists.

## Capability report

```json
{
  "adapter": "claude-code",
  "adapter_version": "semver",
  "provider_version": "string",
  "host_id": "mac-studio",
  "supports_noninteractive": true,
  "supports_resume": true,
  "supports_structured_output": true,
  "supports_model_selection": true,
  "supports_tool_policy": true,
  "supported_roles": ["designer", "builder", "reviewer"],
  "limitations": []
}
```

Capability reports are cached briefly but rechecked after upgrades.

## Job envelope

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "task_id": "DUO-20260727-example",
  "run_id": "uuid",
  "project_id": "language-threshold",
  "repository": "owner/repo",
  "baseline_commit": "40-char-sha",
  "coordination_ref": "coord/task",
  "role": "designer|builder|reviewer|integrator",
  "mode": "parallel_build|designer_builder|crossover|lead_qa|dual_analysis",
  "branch": "role/task-slug",
  "input_bundle_sha256": "hex",
  "allowed_paths": ["glob"],
  "denied_paths": ["glob"],
  "required_checks": ["string"],
  "timeout_seconds": 7200,
  "production_allowed": false
}
```

The prompt bundle is content-addressed and stored separately. Secret values are
never part of the envelope.

## Input bundle

Common:

- role instructions;
- brief;
- acceptance criteria;
- verified repository facts;
- exact baseline;
- branch and file policy;
- required output schema;
- current factual remote state;
- stop conditions.

Role-specific:

### Designer

- product evidence;
- design constraints;
- required experience artifacts;
- no application-writing authority.

### Builder

- approved immutable design commit;
- implementation boundaries;
- required tests;
- authorized branch.

### Independent implementer

- shared brief;
- no other agent plan or result;
- isolation declaration.

### Reviewer

- exact subject application commit;
- result and claimed checks;
- acceptance rubric;
- no subject-branch write authority.

## Structured events

Adapters emit newline-delimited JSON:

```json
{"type":"run.started","run_id":"...","at":"..."}
{"type":"phase.changed","phase":"investigating","at":"..."}
{"type":"heartbeat","at":"...","commit":"..."}
{"type":"artifact.created","path":"...","sha256":"..."}
{"type":"check.completed","name":"typecheck","status":"passed"}
{"type":"checkpoint.requested","checkpoint":"independent-complete"}
{"type":"run.blocked","classification":"credential","summary":"..."}
{"type":"run.completed","status":"success","ending_commit":"..."}
```

Human-readable prose may be attached, but Atlas advances state only after
validating structured events against GitHub and policy.

## Checkpoint request

An executor may request a checkpoint. Atlas verifies:

- correct branch;
- remote ending commit;
- required artifacts;
- schema validity;
- checks;
- Preview alignment when required;
- no prohibited files or secret patterns;
- cleanup outcome.

Atlas may accept, reject with actionable errors, or classify an external block.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | completed; checkpoint may be evaluated |
| 10 | task input invalid |
| 20 | repository preflight blocked |
| 30 | provider authentication blocked |
| 40 | implementation or check failed |
| 50 | external service unavailable |
| 60 | policy violation |
| 70 | canceled |
| 80 | adapter internal failure |

Exit code alone never proves success.

## Git behavior

Adapters must:

- fetch before work;
- confirm remote identity;
- use the assigned worktree and branch;
- refuse unexplained dirty state;
- never force-push;
- never write another role's branch;
- commit intentional changes;
- push before requesting completion;
- fetch and verify the remote SHA after push.

## Tool and command policy

The host executor, not issue text, decides which commands are allowed.

Minimum restrictions:

- no recursive deletion outside the run directory;
- no credential-printing commands;
- no Production deployment unless job authority is true;
- no interactive GUI control;
- no arbitrary access to unrelated repositories;
- no use of the user's personal browser sessions;
- no installing persistent system services from an agent run.

## Environment contract

Secrets are referenced by logical name:

```json
{
  "required_secrets": [
    {"name":"ANTHROPIC_API_KEY","scope":"preview","owner":"project"}
  ]
}
```

The host or GitHub Environment injects values at runtime. The adapter receives
only the scoped environment it needs. Results report presence and verification,
never values.

## Artifact limits

- text logs: bounded and redacted;
- screenshots: only task surfaces, no secret-bearing dashboards;
- videos: explicit task requirement and retention policy;
- build artifacts: referenced by URI/checksum rather than committed when large;
- raw model transcripts: off by default;
- `.env*`, keychains, tokens, cookies, and browser profiles: prohibited.

## Cleanup contract

Cleanup reports:

```json
{
  "processes_stopped": true,
  "ports_released": [8080],
  "worktree_state": "clean|pushed|quarantined|preserved",
  "worktree_removed": true,
  "credentials_removed": true,
  "limitations": []
}
```

Atlas does not mark a run fully closed until cleanup is known.
