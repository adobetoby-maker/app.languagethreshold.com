---
task_id: LT-20260726-usability-onboarding
title: Usability and signature onboarding
status: protocol-bootstrap
created: 2026-07-26
owner: toby
baseline_commit: 8dff4f2b03f5e81a55894574e8ef3326d80d1116
claude_branch:
codex_branch: codex/ai-rosetta-control
production_approved: false
---

# Task Brief

## Objective

Make Language Threshold easier to begin using—especially on mobile—without
removing the deep tools that make it fruitful.

## Product context

The product started with Reader and Tutor. Clicking a word in Reader and
carrying that context into Tutor is the magic. Flashcards became immediately
rewarding once Toby's son got past the initial complexity. The remaining tools
deserve the same clarity and discovery.

## Evidence

Claude's mobile production review found:

- Save Progress is visually dominant at narrow mobile widths because its copy
  wraps, but its dismissal works and persists across navigation and reload.
- Ask Tutor overlaps useful content.
- inactive filter developer language is shown to learners;
- Grammar generation resolves in approximately four seconds with a visible
  spinner on this baseline; the earlier indefinite-loading concern did not
  reproduce and should not be treated as an active defect;
- a complete eight-tab sweep produced zero console errors and zero page errors;
- onboarding role cards, Flashcards hierarchy, Speak empty state, theme toggle,
  and contrast changes are strong.

These three corrections supersede the earlier claims that banner dismissal was
broken, Grammar loading was indefinite or lacked a working progress state, and
the eight primary tabs produced console/page errors. They are shared factual
corrections, not solution recommendations.

Codex's review emphasized:

- Reader → selected word → Word Card → Tutor is the signature continuity loop;
- the toolkit should be orchestrated and progressively revealed, not removed;
- every major tool should be understood in source and in live flows before
  recommending simplification.

## Constraints

- Claude and Codex produce independent plans first.
- No active development on `main`.
- Both implementation branches begin from the same verified baseline.
- Existing valuable tools are retained unless Toby explicitly decides otherwise.
- GitHub is source authority; Vercel is deployment evidence.
- Production deployment requires Toby's explicit approval.

## Required output

- separate Claude and Codex plans;
- file claims and starting commits;
- preview evidence for implemented alternatives;
- cross-review and synthesis;
- Toby decision record;
- final QA and source/deployment alignment.

## Acceptance

A first-time mobile learner can understand where to begin, discover the
Reader/Tutor magic, and reach the valuable practice tools without persistent
interface elements obstructing their work.
