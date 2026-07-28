# ADR-0002 — Atlas is the single canonical-state writer

## Status

Accepted for proposed architecture

## Context

Agents need to publish their own plans, results, and reviews, but allowing both
agents to edit one live status file creates conflicts and stale claims.

## Decision

Executors emit events and own role artifacts on their assigned branches. Atlas
alone projects canonical task state onto the coordination ref and pinned status
comment.

## Consequences

Positive:

- deterministic state;
- no cross-agent status-file collisions;
- external facts can propagate without sharing solution reasoning;
- idempotent recovery is possible;
- Toby sees one current status.

Negative:

- coordinator availability affects phase progression;
- reconciliation logic must be reliable;
- agent-reported state may briefly lag until validated.

## Guardrail

Atlas may correct canonical facts but must not rewrite an agent's reasoning or
result document. Discrepancies are recorded with evidence.
