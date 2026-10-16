# Language Threshold review and implementation sequence

Date: October 15, 2026. Codex review, requested by Toby.

## Release coordination

Claude desktop Code session “Languagethreshold.com model upgrades” owns the lesson release in `/Users/drive/lt-worktrees/app-haiku-5-5`. Codex owns dashboard and Exams work in `/Users/drive/lt-worktrees/admin-exams`, branch `codex/admin-exams`, initially based on a739580. No shared working-file edits.

The user authorized sending this review and the implementation plan to Claude. The handoff was sent through that session and acknowledged. Claude agreed to resolve the five lesson findings and leave admin/Exams work to Codex.

Canonical specification: https://chatgpt.com/space/page_8c02d8da6fa88191a18d9a2f4b75a5c5 (v1.2).

## Lesson preview findings

Tested the active localhost:3210 preview, desktop and 390×844 phone. These findings must be retested after the final deployment.

Verified: six learning modes, previous/next lesson controls, typing feedback for an accent error, full Reader return to the same lesson, speaking mission opens the correct lesson and Back to Lesson returns to the same Say step. Phone next-step button is reachable by scrolling. Anonymous speaking correctly requires sign-in.

Five findings sent to Claude:

1. See it described contextual reading but displayed a 32-item materials glossary. Thirty Roofing lessons shared five reading seeds. Claude accepted and is adding thirty lesson-specific passages with progression.
2. Handwriting recognition took roughly thirty seconds and fell back to self-comparison. Try again erased the drawing. Claude accepted preserving strokes, separate Check again/Start over and a timeout. Recognition success is not verified by this run.
3. React logged an update to WriteMode during HandwritingPad rendering. Claude accepted the callback fix.
4. The outer six learning modes and inner six practice modes used different lists and completion counters. Claude accepted removing duplicate kit navigation inside a lesson.
5. Desktop automatic scrolling hid heading/step controls behind the fixed header. Claude accepted a scroll offset fix.

## Dashboard baseline and repairs

Production review found progress below large billing/invitation forms, a horizontally scrolling phone roster, an assignment form without Cancel, and a requirement checkbox that did not start from the current assignment. These are usability issues independent of the certificate fixture.

The certificate and its supporting completion data were explicitly fabricated at the user’s request for demonstration. They are not evidence of real learner activity or a synchronization defect. Do not issue real credentials from QA data.

Draft repairs: progress before setup in document order; two-column phone summary; learner cards on phones; collapsed billing/invitations; assignment edit defaults preserved when switching away and back; Cancel; distinct labels for recorded practice, self-reported mastery and certificate test; zero-score display; General language label for legacy core identifier; assigned-module-only Core 30 summaries to avoid sharing unrelated personal study.

UI verified with a clearly labeled local QA fixture and no real writes/email. Tests prove defaults and Cancel; fixture showed 0/25 correctly. Production sign-in, backend integration, real learner→admin synchronization and final deployment remain outstanding.

## Source catalog baseline

See `module-readiness-baseline-2026-10-15.json`. Source inventory before Claude’s release:

- 59 modules, 1,510 lessons.
- 16 travel modules have 15 lessons; Sport Fishing has 10. These need expansion to meet the requested 30-lesson standard.
- Only Roofing has authored `words` on every lesson (30/30). Generated deck availability must be audited after Claude’s release.
- No lesson has an explicit level field in the existing curriculum schema.
- Structural presence of a tool or generated list is not proof of reviewed content, objective alignment, offline readiness or mastery measurement.

## Build sequence

1. Finish and verify the lesson release on production, including the five fixes, desktop/phone flows, lesson-specific reading, signed-in speaking return and honest offline behavior.
2. Finish dashboard repairs, integrate the lesson release into the isolated branch, verify actual backend data boundaries and real learner tracking without changing Toby’s mastery or sending invitations.
3. Build one durable Exams engine with explicit personal/team enrollment scope, server authentication/ownership, frozen versioned forms and rubric, answer autosave, idempotent submission and retry. Preserve the old team certificate quiz separately.
4. Ship Roofing entrance, day 45 and day 90 forms first. Six skill dimensions; deterministic fixed items plus production rubrics; uncertain recognition is pending/not assessed, never a wrong answer. Copying is practice, not recall evidence. Entrance and exit use equivalent full-module coverage; midpoint comparisons use matched objectives. Calendar offsets are +44/+89 days from day one.
5. Permanent Exams area for individuals and teams: start/resume, schedule, results/history/comparison and targeted practice. Personal results stay private and are never inherited by joining a team.
6. Admin Exams overview, learner skill timeline, review queue and evidence-linked support module recommendations. Admin approves team additions; independent learner approves personal additions. Show workload before assigning.
7. Audit every module/language against the Roofing standard: 30 complete lessons, level/objective/prerequisite-driven toolkit, six learning modes, contextual usage, reviewed vocabulary/passages/assets and all three exams. Release in tracked batches, with draft/in-review/ready states rather than claims of completion from generation alone.
8. Versioned shared packs, local practice/save recovery and explicit network requirements support offline development. Validate browser→API→database→result→authorized dashboard end to end, plus privacy, scoring, scheduling and idempotency tests.

## Verification ledger

- Initial dashboard TypeScript check: passed.
- Assigned-module privacy tests: four team Core 30 tests passed, including no-assignment and unrelated-module exclusion.
- Lint: zero errors; temporary uncommitted QA harness emitted one Fast Refresh warning. Harness will be removed before final checks/commit.
- Dashboard branch: TypeScript passed, lint zero errors after removing the temporary harness, all 224 baseline unit tests passed, production build succeeded, git diff whitespace check passed.
- QA fixture assignment Save emitted the expected requireCertificate:true payload. No real assignment or email was sent.
- Final integration with Claude’s release, live review and deployment: pending.

## Follow-up preview and boundary checks

The updated local preview shows a contextual Lesson 1 passage, removes the duplicate six-way practice counter and keeps the desktop step heading below the sticky header. Handwriting recognized a deliberately drawn T accurately; Try again preserved the ink. No new WriteMode render warning appeared during that retest (earlier console history retained the original warning).

Using Chrome DevTools on the local preview tab only, simulated no network: the UI showed an offline notice and immediately offered self-comparison. Check again preserved the exact image source. Restored normal network and the retry entered recognition again. This is a recovery check of an already loaded lesson, not proof of offline cold-start availability or every module’s offline completeness.

Live unauthenticated GET /api/team returned HTTP403, {"error":"Sign in to continue."}, and Cache-Control:no-store. This verifies rejection without a session; it does not prove cross-tenant access or learner synchronization.

## Six-mode visit tracking correction in progress

The lesson preview still maps See/Recall/Hear/Type/Say to legacy step indices and maps Write to -1; the lesson list consequently reports 3/3 opened for a six-mode lesson. The Codex branch now has a separate `wayVisits` contract and reducer action, preserving original step records and first-visit times across cloud merges. Opening handwriting alone counts toward lessons opened without implying mastery. Three new migration/merge/state tests pass; 41 relevant tests and TypeScript pass; lint has zero errors and existing app-state Fast Refresh warnings. Wiring the new runner and its UI counts is pending integration of Claude’s release.

An isolated local PostgreSQL 16.14 database, `lt_exams_qa_20261015_codex`, was created for later migration and transactional behavior tests. No assessment schema has been applied to production. The browser’s current account has one active owner membership and no learner membership; a dedicated test learner has been requested for real multi-account reporting verification. No existing member roles or business records were changed.

## Shared lesson definition prepared

Added `lesson-definition.ts` and explicit Roofing teaching settings. All thirty Roofing objectives have stable IDs, earlier-lesson prerequisite links, source content/effort, a language-track identity, version reference and six-mode contract. Settings progress from supported words/phrases to connected responses and independent scenarios, with lesson-specific response contexts. Translation and replay suggestions are supports, not accessibility locks or proficiency ratings. Another language track cannot silently inherit Spanish content. Three relevant definition tests and TypeScript pass.

These definitions intentionally remain draft. Runtime wiring, contextual listening/response activity implementation, asset manifests and curriculum/release review remain required; metadata alone does not complete those requirements.

## Repeatable catalog audit and full rollout backlog

Added a read-only audit CLI covering every module and every distinct compatible instruction/target language pair, normalizing the Chinese source alias. Current baseline: 59 modules, 1,510 lessons, 7,076 advertised compatible pairs, 17 modules below thirty lessons, and 1,059 lessons without an explicit recall-game step. Embedded matching may still exist in the shared kit; this last count is a curriculum mapping gap, not an unavailable-game count. Generated lists and authored lists are counted separately, and neither implies reviewer approval. Vocabulary counts check the 8–12 term/4–6 phrase baseline separately from mere presence.

The complete local matrix is `/Users/drive/git-backups/language-threshold-readiness-2026-10-15.json` (approximately 4.6 MB; reproducible, not committed). `docs/module-upgrade-backlog.md` covers all 59 catalog IDs exactly once in proposed batches and records reviewer/owner dependencies. It does not invent dates or claim that all compatible pairs have been released.

The isolated Codex branch now passes all 230 unit tests; TypeScript passes and lint has zero errors (existing app-state Fast Refresh warnings). Claude's final worker is still active; its initial full click run was explicitly invalidated because workers changed files and shared login state, so only its later clean run may support release acceptance.

## Real QA account and learner-to-admin verification completed

The dedicated-account dependency was resolved through the already authenticated Supabase CLI and the official Auth admin API. No existing key was reset. Provisioned a reserved-example-address QA learner, a scoped QA admin, and the clearly labeled “QA ONLY — Roofing trial 2026-10-15” organization. Toby’s existing account is an owner of that QA workspace for review. No business-team memberships or business learner progress changed; no invitations were sent. Generated QA credentials are mode0600 outside the repository; service credentials remain in process memory and are never logged or committed.

Live server checks with the real QA learner passed: own team HTTP200, learner role, only own records; business organization HTTP403; anonymous HTTP403; no-store; no certificates. The learner signed in through the actual UI in a separate Incognito window. Started its plan, opened Roofing Lesson1, matched all10terms and submitted a correct typed answer. Actual UI activity produced90recorded active seconds. The QA mastery action recorded exactly one Lesson1 completion and advanced to Lesson2. The learner team page and Toby’s authorized owner view both displayed1recorded,1mastered,1opened,Ontrack. Database inspection confirmed one completion, saved QA mastery and zero certificates. This verifies the existing live build; the new lesson release still needs its repeat trial.

Proof screenshot: `/Users/drive/git-backups/language-threshold-qa-admin-baseline-2026-10-15.jpg`. These are explicitly QA practice records, not a claim about a real worker’s proficiency.

## Additional cold-entry and assignment fixes

The real first-run trial found a team module card that linked only to flashcards, and generic onboarding that replaced a valid Core30 deep link with Reader. Added a primary lesson-plan link and a validated direct-entry helper preserving Core30/card destinations. Unknown modules/arbitrary tabs do not bypass onboarding; English-for-work retains its instruction-language safeguard. Three targeted tests and TypeScript passed.

The repaired dashboard was then tested with a real scoped QA admin against the same live QA data on the isolated local server (port4311, independent dependencies, billing/email disabled). Desktop and390×844 phone show the saved learner result; phone cards need no horizontal scrolling. Saving the QA certificate requirement preserved a pre-existing2026-11-01T12:00Z deadline in the database. Cancel discarded an unsaved change. A subsequent save restored the QA certificate requirement to false. Reworded save feedback to avoid falsely claiming notification when email is not configured. Phone screenshot: `/Users/drive/git-backups/language-threshold-qa-admin-phone-2026-10-15.jpg`.

Claude supplied frozen local checkpoint c1206351ea5422969f252959cea51618e69c73cd while its clean full suite continues; no push/deploy from that checkpoint was claimed. Integration and six-mode runtime wiring are next. The temporary async request for a test learner is resolved; no password or further owner action is needed for that test.


## Oct 16, integrated lesson runtime checkpoint

Merged Claude's frozen c120635 into 7ec236c. Claude reports deployment9042951 includes saved-deck routing fix; its production click suite remains in progress. Own branch adds independent six-way visits with old-client preservation, progressive Roofing matching/listening/reading/speaking support, typed and handwritten contextual responses, private per-account device drafts with sign-out cleanup, and explicit lesson+activity Resume. These are draft teaching settings, not validated proficiency levels or verified curriculum releases.

Actual browser verification on localhost4311, normal QA-admin sign-in: existing real learner result still1 recorded/1mastered/1opened/Ontrack/0cert; assigned Roofing Core30 deep link skips unrelated onboarding. A typed lesson response survives activity changes and refresh. Resume initially showed Cards under Type heading; fixed initialization and retested to confirm Type drill and saved text. Handwritten T plus incidental dot saved and survived refresh as an image; restored ink transcribed as T through the real Anthropic service. Missing-key failure preserved ink before configuring the key from the existing .dev.vars in process memory. Write-a-new-response clears stored ink/transcription. Evidence screenshot: /Users/drive/git-backups/language-threshold-writing-recovery-2026-10-16.jpg. No mastery/certificate clicked on QA admin.

372 unit tests pass; TypeScript clean; lint0errors with7existing app-state FastRefresh warnings; production build and Vercel artifact verification pass. Build precedes final minor resume/comment wording edits, so rebuild before deployment. Full own release verification still required, including final lesson settings, return flows, phone and production. Exams implementation has not yet started: do not confuse shared definitions/backlog with finished Exams.


## Oct 16, live foundation review and release preparation

Claude completed live suite (see its session for exact count); both previously dev-only failures, tutor and offline Reader cache, passed live. Frozen deployed9042951 merged cleanly into b5001cc. Our manual production QA learner trial hard-refreshed and applied SW update: team result remains genuine, Lesson2→Lesson1 works, contextual passage loads, real Lesson1 Spanish speaking response returned in2.2s with lesson-specific partner reply/coaching, BacktoLesson1 restores Sayit, longer Reader and return restore Seeit. No new mastery/certificate manufactured. Microphone/pronunciation quality not assessed: text-only input used.

Local integrated lesson30 verified: translation initially hidden vs visible lesson1, listening uses5 connected message chunks, matching distributes all10terms in two5pair rounds under configured8pair ceiling (early ceiling4); Sayit hint bank collapsed; typed response asks3sentences vs1early. Phone390×844 screenshot reviewed, no horizontal overflow (clientWidth=scrollWidth375 after scrollbar). Screenshot /Users/drive/git-backups/language-threshold-lesson-phone-2026-10-16.jpg. Re-audited59modules1510lessons7076compatibletracks; generated inventory /Users/drive/git-backups/language-threshold-readiness-2026-10-16.json. Counts describe structure, not verified translations.

New-found first-time speaking failure: local rate guard correctly refuses requests with no trusted proxy IP, but confirmation-save error was rendered behind the modal. Added visible alert to consent dialog; production speaking works with guards intact. No bypass introduced. Own Vercel directory initially unlinked; explicit read-only project inspection confirmed language-threshold-app/prj_at1LY9ncmWfGUecndikWrEUccuqo in adobetoby-5572s-projects, then CLI linked only that existing project and deployment guard passed. Production environment pulled to ignored mode0600 file for proper public build configuration; no keys printed/reset.
