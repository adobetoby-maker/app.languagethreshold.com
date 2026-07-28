# ADR-0001 — GitHub is the durable control plane

## Status

Accepted for proposed architecture

## Context

Toby works across phone, Mac Studio, MacBook Air, Claude, Codex, GitHub, and
Vercel. Local folders and chat sessions are partial views. DUO-002 showed that
branch-local files can become stale and that Toby becomes the message bus when
remote facts are not reconciled.

## Decision

Use GitHub as the durable project and task authority:

- issues for intake and human decisions;
- branches and PRs for work;
- checks for machine gates;
- coordination refs for canonical state;
- protected Environments for Production approval.

The Atlas database is an operational projection that can be rebuilt.

## Consequences

Positive:

- visible from mobile;
- durable across machines;
- existing audit and permission model;
- exact commits and PRs;
- no new source-control system.

Negative:

- GitHub API availability and rate limits matter;
- concurrent state writes require serialization;
- large logs/media require external artifact storage;
- some executor state is temporarily local.

## Rejected alternatives

- direct folder synchronization: unsafe for active Git repositories;
- chat as authority: incomplete, surface-specific, and difficult to audit;
- local Mac database as sole authority: unavailable when that Mac is offline;
- Vercel as authority: proves deployments, not source or task decisions.
