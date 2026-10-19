# Claude handoff before adding Core lessons

Toby explicitly requested merging the current verified snapshot to main so Claude can inspect it before more Core lessons are added. This supersedes the earlier merge hold; it does not claim the outstanding device, curriculum or pilot checks passed. PR38 is the delivery vehicle. Runtime baseline77ce283; evidence64fcdf2 passed clean Linux CI39194344704 (1,726 tests, typecheck, lint, production audit, build/artifact) and Vercel. Main merge triggers production deployment. Consult the latest main/CI rather than copying historical deployment SHAs below.

## What is already built

- Core 30 lesson-first UI, six learning modes, module/language/plan-scoped progress, personal/team learning plans and entrance/day45/day90 assessment services. The Exams PRD, private content/reviewer controls, protected listening/speech and operational tooling are implemented with release gates.
- Reader owned cloud library, durable device upload/delete queue, stable IDs, explicit old-book recovery, selection restoration and sign-out protection. Main-profile and practice-category recovery are explicit, account-owned and preserve original legacy saves. Ordinary profile autosave refuses rejected envelopes; stale cloud custom-text/letter counters use max instead of overwriting higher current totals.
- Grammar/heard-word/game/challenge histories are account/guest owned. Rival/opponent displays explicitly say simulated. Current main-readiness tests include populated normal vocabulary/note recovery, A→guest→B→A isolation, confirmed vocabulary cloud persistence and normal fresh-origin UI restoration.
- 18 hosted assessment/API checker groups and 61 exact content/static requests passed the final runtime Preview. Chrome390x844 lesson/navigation and corrected leaderboard layouts passed. These are bounded evidence, not every feature/device acceptance.

## Read before changing lessons

1. `docs/reviews/2026-10-15-review-and-sequence.md` — newest checkpoint first; older entries are historical.
2. `docs/module-upgrade-backlog.md` and `docs/reviews/module-generated-content-coverage-2026-10-18.json` — exact scope and missing lessons.
3. `docs/prd-assessments.md`, `docs/assessments/content-workflow.md`, `docs/assessments/speech-operations.md` — private content and release/recording boundaries.
4. `docs/core30-progress-scope.md`, `src/components/modules/ModuleStudyGuide.tsx`, `src/lib/lesson-definition.ts`, `src/lib/lesson-content.ts`, `src/lib/lesson-content-core.ts` — actual lesson identity, source precedence and modes.
5. `src/data/modules.ts`, `src/data/roofing-lesson-words.ts`, `src/data/roofing-lesson-passages.ts`, `src/data/landscaper-lesson-content.ts`, `src/data/construction-foreman-lesson-content.ts`, `public/lesson-content/index.json` and the corresponding generated pair file — inspect the chosen track before adding anything.

## Content inventory and next work

There are59 generated draft files covering1,510 current lessons, all reviewed:false. Forty-two modules have30 lessons; sixteen have15 and Sport Fishing has10, leaving260 lessons missing across17 modules. These counts overlap inline lessons and must not be added to them. Roofing's30 inline word lists/passages are the first reference track, still requiring qualified human review. New lessons need coherent goals, contextual words/verbs/usage and levels, a matching passage, six meaningful modes, exact native/target pair, and their module's entrance/day45/day90 assessment path. Generated presence is not reviewed parity.

Generated words/passages/verbs and exact file hashes participate in frozen review identity. Do not mark changed content reviewed or reuse a stale approval; create the appropriate new release/review binding. Preserve existing explicit inline precedence and stable lesson IDs; changing numbered definitions can affect scoped progress and downloaded packs. Run the relevant content/scope tests, typecheck/lint, `scripts/audit-module-readiness.mjs`, normal build/artifact checks and verify exact packaged files. Preserve public-only offline caching and private assessment-bank separation.

## Still open; do not relabel as accepted

- Genuine Reader expiry with a pending owned queue, normal re-auth and cloud reconciliation, plus current real offline reload/reopen. The last follow-up prepared a disposable QA fixture but stopped when Chrome switched to the user's browsing. No token/session was edited or refresh session revoked. Resume the existing prepared trial, not a duplicate. See `qa-reader-expiry-offline-preparation-2026-10-18.json`;41 focused tests/11 real RLS checks pass but do not replace that browser trial.
- Physical iPhone/Safari/audio acceptance; checklist `docs/reviews/iphone-merge-checklist-2026-10-18.md`.
- Qualified fluent/domain/curriculum and clip reviews, calibration/equivalence, assigned-reviewer acceptance, real consented personal/team pilots, owner retention decision, scheduled cleanup activation/platform proof and companion/shared-auth acceptance. Speech collection/policies/scheduling remain off. Do not infer approval or repeat the already-pending retention question.
- Nine development-only audit findings/legacy Prisma tooling remain tracked; production dependency audit is clean.

Read-only handoff first. No new bulk generation, worker jobs, schema/role/policy changes, fake proficiency/mastery/certificates, private-bank publication, or model batch spending is authorized by this handoff. Follow Toby's next lesson request after inspecting current main. Use the repository's guarded Vercel workflow; never rewrite `.vercel/project.json` or generated route tree. Do not modify applied assessment migrations.
