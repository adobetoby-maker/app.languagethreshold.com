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

Shared factual state is not solution reasoning. Branch heads, PR state, check
state, deployment state, external blockers, corrected evidence, and Toby
decisions may propagate during the independent phase through the coordination
ref. Neither agent should need Toby to relay facts that GitHub or Vercel can
prove.

## Canonical coordination ref

Every task records one `coordination_ref` and exact `coordination_commit`.

Preferred order:

1. Rosetta control files merged to `main`;
2. a dedicated `coord/<task-slug>` branch;
3. during bootstrap only, an explicitly named documentation-only control
   branch.

An application task may not begin from a baseline that lacks the governing
Rosetta files unless the brief records the external coordination ref. Agents
must fetch that ref and read its files with `git show`; they do not merge it
into their application branches merely to receive factual updates.

This prevents the protocol from splitting into incompatible branch-local
copies when a control PR remains unmerged.

## Remote-facts ledger

Every Duo task has `REMOTE_STATE.md` on the coordination ref. It contains:

- task, baseline, coordination ref, and refresh time;
- production source/deployment alignment;
- each agent branch head and implementation head;
- result status;
- PR URL, number, and actual draft/open state;
- preview URL, status, and attached commit;
- whether a later documentation head leaves the application tree identical;
- shared external blockers, owner, and next check.

The coordinator owns this file. Agents own their plan/result files and report
new evidence on their branches or PRs. The coordinator refreshes the ledger
from GitHub/Vercel; agents do not overwrite one another's status files.

## Completion and checkpoint definitions

`plan-independent-complete`
: The agent's initial reasoning is locked before reading the other plan.

`independent-complete`
: The approved implementation checkpoint is committed, pushed, documented, and
  has aligned preview evidence when preview was required. Open environmental or
  runtime limitations are listed separately and have an owner.

`runtime-certified`
: Required live flows passed against the exact application commit with required
  project-scoped environment configuration.

`cross-review-ready`
: Both agents are `independent-complete`. Runtime certification may remain a
  shared limitation if the brief permits comparison without it.

`done`
: Toby decision, integration, independent QA, deployment alignment, and final
  handoff are complete.

Result documents must state the status explicitly. “Not done” sections may not
mix unfinished approved implementation with external limitations.

## Continue-work rule

An agent may continue its approved independent implementation while the other
agent is planning or building when all of these are true:

- its objective and baseline have not changed;
- it stays on its own branch and within its plan;
- it does not merge or read the other solution;
- no shared external dependency makes continued verification unsafe;
- shared-risk files remain isolated on separate branches.

The agent stops only for an objective change, a baseline/identity conflict, a
credential or infrastructure blocker that makes the work unsafe, work outside
the approved plan, or the cross-review boundary. The other agent merely taking
longer is not a blocker.

## Pull-request contract

Each agent opens a draft PR at the first reviewable checkpoint. The PR remains
draft during independent implementation unless Toby explicitly changes its
state. Result documents record actual GitHub state after checking it; they do
not assume “draft” because the protocol requested one.

The PR body records:

- task and baseline;
- application head;
- documentation head;
- preview commit and URL;
- checks;
- remaining limitations;
- confirmation that merge and Production are not approved.

## Application, documentation, and preview alignment

An agent result must distinguish:

- `application_head`: last application-behavior commit;
- `documentation_head`: current branch/PR head;
- `preview_commit`: commit attached to the reported preview.

The default requirement is `preview_commit == application_head`.

Later documentation-only commits are allowed when the result records:

- exact documentation head;
- an application-tree comparison proving it is identical to the application
  head;
- `application_tree_verified_identical: true`.

A READY deployment certifies build/deployment status for that commit. It does
not certify AI or database behavior unless the required environment and live
flows were also verified.

## External-state ownership

| External state | Owner | Agent behavior |
|---|---|---|
| GitHub branches, PRs, and checks | Coordinator | Fetch and record exact facts |
| Vercel preview/Production alignment | Coordinator | Match deployment to commit |
| Project environment variables | Project owner/operator | Configure through project secret manager |
| Agent plan/result | That agent | Commit on own branch |
| Cross-review | Reviewer | Commit on reviewer's branch |
| Synthesis | Coordinator | Commit on coordination/synthesis branch |
| Product decision | Toby | Record in `TOBY_DECISION.md` |

An external blocker records one owner and one next check. “Waiting for Toby” is
invalid when the fact can be queried from GitHub, Vercel, or the project
operator.

## Cross-review landing rule

Claude's review of Codex lands on Claude's branch as
`CLAUDE_REVIEW_OF_CODEX.md`. Codex's review of Claude lands on Codex's branch as
`CODEX_REVIEW_OF_CLAUDE.md`. Each review names the exact application commit it
examined.

After both reviews exist, the coordinator creates
`coord/<task-slug>-synthesis` from the canonical Rosetta baseline and adds
`SYNTHESIS.md`. The integration branch is created only after Toby's decision.

## Local development server lifecycle

Every server record includes:

- checkout/worktree path;
- branch and exact application commit;
- port and PID;
- start time and owner;
- intended reviewer;
- stop condition.

Stop the server at session end unless a named reviewer is actively using it. A
persistent Mac Studio runner uses one dedicated worktree and port per branch.
Before browser verification, compare the server process working directory and
Git commit with the PR application head. A healthy port is not provenance.

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
- Never borrow, copy, or reuse a credential from another project.
- Never recover a secret from a browser bundle or another repository's local
  files.
- Use a dedicated project credential and the project's secret manager.
- Scope Preview and Production credentials separately.
- Store only credential presence, scope, owner, and verification time in
  Rosetta—never the value.
- `.env.local` must remain ignored. Temporary credentials must be removed at
  handoff.
- Do not store credentials in handoffs.
- Do not use filesystem-sync products on active Git working directories.
- Do not automatically reset, discard, or force-push divergent state.
- Use relative repository paths.
- Mobile-friendly documents must not expose private operational data beyond
  what belongs in the repository.

Pre-existing tracked secret debt is recorded by path only in
`ai-rosetta/SECURITY_BASELINE.md`. The validator may warn for those exact
baseline paths while failing any new secret path. Exceptions are removed after
credential rotation and cleanup; they are not permanent approval.

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
- the Preview environment requires its own Language Threshold
  `ANTHROPIC_API_KEY`; a READY preview without it does not certify Word Card,
  Tutor, Grammar, or Speak;
- credentials from another project are prohibited even for temporary local
  testing.

## Duo task artifact set

Each Duo task contains:

```text
BRIEF.md
REMOTE_STATE.md
CLAUDE_PLAN.md
CODEX_PLAN.md
CLAUDE_RESULT.md
CODEX_RESULT.md
CLAUDE_REVIEW_OF_CODEX.md
CODEX_REVIEW_OF_CLAUDE.md
SYNTHESIS.md
TOBY_DECISION.md
QA.md
FINAL_HANDOFF.md
```

Only artifacts appropriate to the current phase are required. A final handoff
must not claim Production without an exact deployment reference.

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
9. A task has one canonical coordination ref and remote-facts ledger.
10. Agent results distinguish application, documentation, and preview commits.
11. Draft PR, cross-review landing, server cleanup, and secret rules are
    explicit.
12. `rosetta:check` detects missing task-control artifacts, invalid remote
    alignment fields, tracked `.env` files, and secret-shaped values.

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
