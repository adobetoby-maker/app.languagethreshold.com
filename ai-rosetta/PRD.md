# PRD: AI Rosetta Portfolio and Handoff System

## Product owner

Toby Anderton

## Audience

Claude mobile, Claude Code on Mac Studio, Claude Code on MacBook Air, Codex,
and human collaborators.

## Purpose

Build a GitHub-native operating system that keeps Toby's many simultaneous
sites and tasks correctly identified, synchronized, independently analyzed,
and cleanly handed off.

The system must preserve the useful difference between Claude and Codex while
preventing them—or two physical Macs—from working against stale or ambiguous
state.

## Core model

GitHub is the durable authority. Every local folder is a working copy:

- Mac Studio has its own clone.
- MacBook Air has its own clone.
- Codex obtains a task-specific checkout.
- Claude mobile reads GitHub-visible state and communicates Toby's direction.
- Vercel proves what is deployed but does not replace GitHub as source.

There is no direct Mac-to-Mac or Mac-to-Codex folder synchronization. Git is
the synchronization protocol:

```text
local preflight → fetch GitHub → verify identity/state → work on branch
→ update handoff → commit/push → re-read GitHub → verify remote SHA
```

## Problems solved

- the wrong repository is open under an old folder name;
- one Mac has commits the other Mac has not pulled;
- Claude mobile assumes local work was pushed when it was not;
- Codex starts from a stale baseline;
- Claude and Codex overwrite shared files;
- an agent follows contradictory deployment instructions;
- production and GitHub diverge;
- Toby becomes the manual message bus across many projects;
- task reasoning disappears inside chat histories.

## Product principles

1. Identify before editing.
2. GitHub state beats folder familiarity.
3. Exact commits beat “latest.”
4. Separate working copies are expected.
5. Dirty or divergent state is a stop condition, not an invitation to overwrite.
6. Agents share facts and objectives, then think independently.
7. Toby's recorded decision overrides agent recommendations.
8. Production authority is explicit and never inferred.
9. Handoffs must be readable on a phone.
10. Status should be concise; historical reasoning belongs in task folders.

## Four-surface contract

### Claude mobile

Claude mobile is the most convenient surface for Toby's ideas, reviews, and
decisions. It may:

- inspect repository-visible handoffs;
- summarize portfolio and task state;
- help Toby create or refine briefs;
- record clearly stated product decisions through an approved GitHub change;
- compare branch, PR, and deployment evidence.

It may not:

- claim a Mac folder is synchronized without a new device preflight;
- invent unpushed local changes;
- infer production approval;
- treat conversational agreement as a completed code handoff.

### Claude Code on Mac Studio

The Studio checkout is independent. Before work Claude Code must:

- resolve the repository owner/name;
- fetch GitHub;
- inspect dirty state;
- confirm branch, upstream, and exact baseline;
- read Rosetta instructions;
- update `CLAUDE_STATUS.md`;
- push and verify the remote commit at session end.

### Claude Code on MacBook Air

The Air follows the same contract. It must not assume the Studio pushed or that
its own local branch is current. Switching machines always starts with a fresh
preflight.

If both Macs contain unpushed work, neither is silently selected as newer.
Preserve both and reconcile through separate branches.

### Codex

Codex should assume its checkout can disappear. Durable output must be committed
and pushed before the session ends. Codex must fetch GitHub at the start and
verify the remote after pushing.

## Portfolio layer

Every product repository contains:

- `AI_HANDOFF.md`;
- `ai-rosetta/README.md`;
- a project record;
- agent status files;
- task folders;
- templates;
- a validation check.

A dedicated control repository may aggregate lightweight pointers:

```text
ai-rosetta-control/
├── PROJECTS.md
├── projects/
│   ├── app.languagethreshold.com.md
│   └── other-project.md
└── templates/
```

The control repository must not duplicate application source. Each project row
links to the canonical product repository and records:

- project ID and friendly name;
- canonical owner/repository;
- production URL;
- active task ID;
- Claude branch/status;
- Codex branch/status;
- GitHub main commit;
- production commit;
- blocker;
- next Toby decision.

Until the dedicated control repository exists, `ai-rosetta/PORTFOLIO.md` is the
bootstrap index.

## Project identity

Each repository must have one machine-readable project record. A preflight
fails if:

- the Git remote does not match the record;
- the task points to another project;
- the production domain or provider contradicts current verified documentation;
- legacy names are presented as canonical.

Historical folder names may remain, but they must be labeled aliases.

## Mandatory preflight

Every coding session records:

- repository;
- device/surface;
- task ID;
- local branch;
- local HEAD;
- remote branch HEAD;
- `origin/main`;
- production commit;
- whether the tree is clean;
- verification time;
- aligned or blocked result.

Application work must not begin when:

- the wrong repository is open;
- uncommitted work is unexplained;
- the current branch belongs to the other agent;
- the baseline differs from the task record;
- a pull would require overwriting local work;
- GitHub and production mismatch is unexplained;
- instruction files contradict verified infrastructure.

## Independent-thinking protocol

Claude and Codex read the same `BRIEF.md`. During the independent phase:

- Claude writes only its plan and status.
- Codex writes only its plan and status.
- Neither reads the other's plan until its own is marked independent-complete.
- Both record exact evidence and starting commits.
- Shared factual corrections may be added to the brief with attribution.

After independent completion:

1. cross-review;
2. synthesis of agreements and disagreements;
3. Toby decision;
4. integration branch;
5. independent QA;
6. release handoff.

## Branch and file safety

Branches:

```text
claude/<task-slug>
codex/<task-slug>
integrate/<task-slug>
```

Rules:

- never develop directly on `main`;
- both agent branches begin from the same recorded commit;
- never force-push another agent's branch;
- list file claims before implementation;
- separate application and large handoff commits when practical;
- preview deployments are evidence, not production permission;
- only Toby can authorize merging to production and production deployment.

File claims are warnings:

- `exclusive`: substantial changes expected;
- `shared-risk`: both approaches may touch it;
- `read-only`: inspection only.

## Handoff requirements

The root handoff stays concise and includes:

- canonical repository;
- production URL/provider/project;
- production branch and exact verified commit;
- active task and status;
- agent branches;
- blockers;
- latest Toby decision;
- link to Rosetta instructions.

Historical detail belongs under `ai-rosetta/tasks/<task-id>/`.

Every session ends with:

- what changed;
- what was verified;
- branch and ending commit;
- remote verification result;
- preview/deployment evidence;
- remaining work;
- next agent action.

## Deployment alignment

Before reporting release state, compare:

1. approved source commit;
2. GitHub `main`;
3. Vercel production deployment commit;
4. production alias.

Report `aligned`, `mismatch`, or `unverified`. Never use “up to date” without
the exact commit and verification time.

## Validation

Provide `npm run rosetta:check`. The first version validates:

- required Rosetta entry files;
- a valid canonical repository;
- exact 40-character commit fields where required;
- allowed status values;
- unique agent branches;
- valid task IDs;
- task baseline;
- no production approval inferred;
- no stale Cloudflare production instruction for this Vercel application.

Validation should fail with an actionable message and never mutate the
repository.

## Security and storage

- Never commit secrets or `.env` contents.
- Do not store credentials in handoffs.
- Do not use filesystem-sync products on active Git working directories.
- Do not automatically reset, discard, or force-push divergent state.
- Use relative repository paths.
- Mobile-friendly documents must not expose private operational data beyond
  what belongs in the repository.

## Language Threshold bootstrap

For `adobetoby-maker/app.languagethreshold.com`:

- GitHub source: renamed canonical repository;
- production: `https://app.languagethreshold.com`;
- provider: Vercel project `language-threshold-app`;
- initial verified baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`;
- active task: `LT-20260726-usability-onboarding`;
- signature workflow: Reader → tap word → Word Card → Tutor → My Vocab →
  practice → real-world use;
- preserve the valuable toolkit while simplifying discovery and obstructive
  interface chrome.

## Acceptance criteria

The bootstrap is complete when:

1. Rosetta entry, portfolio, project, preflight, task, agent, and template files
   exist.
2. Claude Code and Codex instruction files point to Rosetta.
3. contradictory deployment guidance is removed.
4. `npm run rosetta:check` passes.
5. the branch starts from the verified GitHub/production baseline.
6. no application code or production behavior changes.
7. a draft PR lets Toby and Claude review the protocol.
8. Mac Studio, MacBook Air, mobile, and Codex responsibilities are explicit.

## Instructions to Claude Code

When you receive this PRD:

1. Do not rewrite it from memory.
2. Read `AI_HANDOFF.md`, `ai-rosetta/README.md`, and this PRD.
3. Run the preflight on the Mac you are currently using.
4. Compare the local repository and remote with the recorded project identity.
5. Review the implementation branch without changing `main`.
6. Run `npm run rosetta:check`.
7. Identify any Mac-specific paths or workflows that the repository still fails
   to represent.
8. Record disagreements rather than silently replacing Codex's decisions.
9. Confirm the protocol works independently on Mac Studio and MacBook Air.
10. Report branch, commit, checks, blockers, and exact recommended changes.

