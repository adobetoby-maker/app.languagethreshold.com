# Atlas Duo Runner — Claude Architecture Review Brief

## Assignment

Reviewer: Claude Code

Role: independent architecture, operator-experience, and design reviewer

Subject:

```text
adobetoby-maker/app.languagethreshold.com
PR #7 — Design Atlas Duo Runner architecture
application/documentation head: 055c661e989cc762ecc4466233c8f008c8f0b5a0
```

Claude is not the Milestone 1 builder.

## Objective

Review whether the Atlas Duo Runner architecture can actually operate Toby's
portfolio from mobile while safely coordinating Codex and Claude Code on the Mac
Studio and MacBook Air.

Do not rewrite the system in Claude's preferred style. Identify concrete gaps,
contradictions, unsafe assumptions, unnecessary complexity, and missing
acceptance tests.

## Required review areas

### Product and mobile workflow

- Can Toby start, supervise, approve, pause, and recover a task from a phone?
- Are three normal human gates realistic?
- Does the design distinguish machine facts from product decisions?
- Are status and decision cards understandable without internal jargon?

### True role separation

- Does agent identity remain separate from designer/builder/reviewer roles?
- Does crossover produce a fair comparison?
- Can a builder receive an immutable design without silently redesigning it?
- Can design fidelity and technical quality be scored separately?

### Mac Studio operations

- Is the outbound-only executor realistic?
- Are worktrees, ports, PIDs, leases, and cleanup sufficient?
- Can it avoid interfering with Toby's normal Claude Code projects?
- What happens when the Studio sleeps, reboots, or has unpushed work?

### MacBook Air failover

- Does failover preserve uncertain Studio work?
- Is lease transfer safe?
- Are identity, remote URL, and credential checks explicit?

### GitHub control plane

- Can the coordinator reconstruct state after a restart?
- Is the single-writer state model sufficient?
- Are GitHub App permissions minimal and complete?
- Are PR, application, documentation, and Preview commits unambiguous?

### Security

- Can issue or repository text reach a shell unsafely?
- Are self-hosted runners protected from forks?
- Are credentials scoped and kept out of model prompts/logs?
- Is Production approval impossible to infer?
- What security concerns make a private repository appropriate during the pilot?

### Buildability

- Are Milestones 0–2 appropriately bounded?
- Is the proposed stack unnecessarily complex?
- Which components should remain interfaces/fakes in Milestone 1?
- What must Sol prove before connecting a live GitHub App or provider CLI?

## Required output

Create:

```text
ARCHITECTURE_REVIEW.md
```

Use:

```text
# Summary verdict
# Blockers before implementation
# High-value corrections
# What is intentionally strong
# Simplifications
# Missing tests
# Mac Studio operational findings
# Mobile workflow findings
# Security findings
# Recommendation for Milestone 1
```

Every blocker must cite the exact source document and section. Separate observed
contradictions from recommendations.

## Branch and boundaries

Work on:

```text
claude/atlas-duo-architecture-review
```

Open a draft PR targeting the Atlas design branch or, after creation, the
standalone Atlas repository's `main`.

Do not:

- edit application or runner code;
- merge PR #7;
- modify Sol's branch;
- install a self-hosted runner;
- add or recover credentials;
- deploy anything.

The review is complete when it is committed, pushed, and linked from the Atlas
design PR.
