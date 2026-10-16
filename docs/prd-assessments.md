Source: https://chatgpt.com/space/page_8c02d8da6fa88191a18d9a2f4b75a5c5

**Draft PRD · Version 1.2 · October 15, 2026**

Build a learner-facing Exams area, a companion assessment site and a shared curriculum standard for every Language Threshold module. Each module must provide 30 complete lessons on par with the accepted Roofing reference, plus module-specific entrance, day 45 and day 90 exams. Independent learners use their own results to guide learning; team admins use authorized team results to guide assignments. Roofing Foreman is the first module to meet and verify the complete standard; the rest follow in measured batches.

The product follows one cycle: entrance assessment → initial learning plan → day 45 assessment → revised plan → day 90 assessment → continued learning recommendations. The primary work module stays central. Supporting modules fill demonstrated gaps without overwhelming the learner.

**Product requirements are based on the owner’s decisions in this conversation.** Proposed defaults below are implementation starting points, not validated assessment standards. Existing app behavior, module inventory, authentication and data contracts must be verified before implementation; this PRD does not assert that the features described are already built.

# 1 Product outcome and scope

A learner should know where to start, what to practice next, and how that practice connects to real conversations. An admin should see what the learner demonstrated, what remains uncertain, what changed over 90 days, and which assignments would help.

The first complete release delivers Roofing’s full lesson path and all three exams for independent and team learners, a learner-facing Exams area, a focused assessment site, shared account access, private skill profiles, an admin assessment dashboard, lesson personalization, and reviewed supporting-module recommendations. Product completion also requires bringing every remaining published module up to the same lesson and exam standard; wider rollout is required scope, not an optional expansion.

Assessments measure language use within the assigned module’s context. For work modules, they do not certify trade competence, determine whether a worker is safe to perform a task, or make employment decisions. Participation alone and self-reported mastery remain separate from demonstrated assessment results.

**Initial audience:** adult independent learners studying Roofing Foreman, team learners in the same module, their authorized team admins, and curriculum reviewers. Independent use is included in the first complete Roofing release and requires no team membership, invitation or admin account.

# 2 Product principles

- **One connected experience.** Exams, the companion site and the learning app share learner, enrollment and module identity. A team association exists only for team-owned enrollments; it is never required for independent study.

- **Six ways to practice.** See it, recall it, hear it, type it, say it, write it. Measure the relevant underlying skills; activity participation is not a proficiency score.

- **Teach from evidence.** Use task results to choose practice, while allowing the learner to revisit every lesson.

- **Explain every recommendation.** Show the observed gap, evidence, supporting content, expected benefit and time commitment.

- **Protect attention.** Keep the work module primary and place supporting activities inside the same daily plan.

- **Keep scores interpretable.** Separate missing evidence, incorrect answers, low-confidence AI ratings and technical failures.

- **Build toward offline learning.** Downloaded content and locally saved work should remain useful without a connection.

# 3 Roles and permissions

| Role | Can do | Boundaries |
| --- | --- | --- |
| Independent learner | Start module exams; set a personal study schedule; inspect own results; accept or dismiss practice/module suggestions; request score review | Personal results are private; no team or admin is required |
| Team learner | Take assigned assessments; inspect own results; review plan suggestions; practice earlier lessons; request score review | Cannot access other learners or admin-only records; team visibility applies only to the relevant team enrollment |
| Team admin | Assign eligible team members; view team assessment summaries; inspect authorized evidence; approve or change module recommendations | No access to unrelated learner profile fields, personal Reader content, private tutor chats or other teams |
| Curriculum reviewer | Author and review questions, rubrics, module mappings and equivalent forms | Learner evidence access requires a separate explicit role |
| Assessment reviewer | Review flagged responses and record justified scoring corrections | Changes are audited; cannot silently overwrite original scores |

Existing admin visibility must expand explicitly for assessment information. Entry screens explain what the team can see. Proposed default: admins see skill scores and text feedback; raw handwriting and voice evidence require an explicit evidence-access policy. Raw media is not included in ordinary exports.

# 4 Entry points and connected navigation

**Proposed hostname:** assessment.languagethreshold.com. The final hostname and DNS setup are owner decisions; no domain availability is assumed.

Entry points: a permanent **Exams** destination in the app’s primary learning navigation; a checkpoint card inside each module’s Core 30 plan; the learner’s Progress dashboard; and team assignment links where applicable. Exams uses the existing navigation pattern rather than adding another competing navigation system. Links carry an opaque enrollment or assignment reference rather than a learner name or score.

Use the app’s existing identity provider with a supported shared sign-in or redirect flow. Do not put bearer credentials in URLs or assume sibling subdomains can read each other’s browser storage. Returning from sign-in restores the assignment.

The assessment screen shows the module, target language, instruction language, checkpoint, estimated effort, save state, personal or team context, and a clear “Return to my plan” action. Leaving and returning resumes the current attempt. After submission, the learner returns to a result summary and an actionable next step in the learning app.

The testing experience stays focused; it does not reproduce all of the app’s global navigation.

## 4.1 Exams area for all learners

Exams is available to signed-in learners with access to the relevant module, whether or not they belong to a team. Use the same reviewed question banks, scoring rules and six-skill profiles for personal and team study. No separate, lower-quality personal exam is needed.

The landing screen shows **My modules**, **Upcoming exams**, **Resume an exam**, and **My results**. Group cards by module and language pair. Each card shows entrance, day 45 and day 90 status, recommended date, actual completion date where applicable, and the next clear action. Distinguish Not started, Ready, In progress, Scoring, Completed, Needs review and Not yet available. An exam awaiting curriculum release is labeled honestly, with a return to available lessons.

A module detail screen compares the learner’s three checkpoints by skill, explains evidence gaps, links to answer feedback and gives “Practice this skill,” “Return to lesson plan,” and “Review suggested modules” actions. Results are not reduced to a single unexplained pass/fail grade.

For a learner with no study plan, offer “Choose a module” or an entrance exam for an accessible module, then let them create a personal plan and choose its start date. A learner already partway through a module may take a current-state baseline, labeled with the actual date and learning stage; it is never presented as an original entrance result.

On a phone, use readable module cards and expandable skill details rather than requiring horizontal table scrolling. Preserve the selected module, language pair and assessment context when moving between Exams, results and lessons.

## 4.2 Independent study and personal progress

Independent learners can start entrance testing themselves, manage their own checkpoint dates, pause their plan and resume an attempt without admin approval. Day 45 and day 90 exams are recommended milestones, not locks on continued study. Allow an early or late assessment with its actual timing clearly recorded.

Personal results show demonstrated strengths, gaps, comparable entrance/midpoint/final growth and a small proposed practice plan. The learner can accept, edit, defer or dismiss additional-module suggestions themselves, within their existing module access. Explain any schedule or workload impact before applying changes.

Retakes create new dated attempts, use equivalent forms where available and preserve all original results. Keep the designated baseline, first completed checkpoint and later retakes distinguishable; a best score does not silently replace the progress history. Repeated exposure is labeled when no fresh equivalent form exists. Apply the same scoring, uncertainty and review protections used for teams.

Team and personal enrollments are distinct even for the same person and module. Personal attempts are private by default and do not appear in a team dashboard merely because the learner joins a team. Do not automatically transfer or merge historical results. Any future sharing/import feature must show the specific records and audience and obtain the learner’s explicit action; it is outside the initial release.

# 5 Assessment checkpoints and scheduling

| Checkpoint | Timing | Content | Result |
| --- | --- | --- | --- |
| Entrance | Before or at the start of the module | Broad coverage from foundational language to later module tasks | Baseline profile, suggested starting point and initial support plan |
| Day 45 | Halfway through the learner’s plan | Common comparison tasks plus evidence from studied objectives and limited transfer tasks | Midpoint growth, gaps and proposed changes for the remaining period |
| Day 90 | End of the learner’s plan | Equivalent full-module coverage, including new scenarios | Final profile, comparable growth and next-module recommendations |

**Required for every module:** each full module enrollment has its own entrance, day 45 and day 90 exams and schedule, using the rules below. Exams assess that module’s objectives, vocabulary and scenarios; changing only the title of a generic exam does not satisfy the requirement. Roofing goes first, but no module is exempt from the three-exam standard.

Day 1 is the local plan-start date; day 45 is start date plus 44 calendar days, and day 90 is start date plus 89 days. Store absolute timestamps and the plan timezone. Proposed availability window: seven days before through seven days after the checkpoint. Missing the window shows “Overdue” and keeps the assessment available.

For team enrollments, the admin may reschedule, pause or exempt a checkpoint with a reason. Independent learners manage their personal schedule themselves. Paused-plan checkpoint dates move by paused calendar days. Retain schedule history; changes do not overwrite completed results. For an early or overdue checkpoint, show scheduled day and actual completion date.

A learner may begin lessons before completing entrance testing, but the plan is labeled “Baseline pending.” Never manufacture a baseline from later results.

# 6 Learner assessment flow

1. See why the assessment is recommended or assigned, whether this is personal or team study, and who can see results.

2. Confirm language pair and required accessibility alternatives. Changing the target language creates a separate assessment track.

3. Try an unscored practice item for each unfamiliar input method.

4. Complete a fixed core of questions, followed by a short routing branch based on demonstrated ability.

5. Save and resume between sections. Explain which answers have reached the server.

6. Submit and receive objective-item feedback plus a clear “Scoring in progress” state for pending responses.

7. Review the skill profile, evidence limits, recommended starting lesson and supporting practice.

8. Return to the lesson plan, with learner-approved personal changes or admin-approved team assignment changes applied.

Proposed effort budget: 20–30 minutes for entrance and exit; 10–15 minutes for midpoint. These are design targets to validate with pilot learners, not promises. Split longer assessments into resumable sections. No speed-based grading in the first release.

Do not reveal scored-item answers during the active attempt. Provide instruction and corrections after submission; keep assessment items separate from practice material.

# 7 Skills and task design

Report separate skill dimensions: vocabulary recognition, vocabulary recall, listening comprehension, reading comprehension, written production and spoken production. Handwriting is an input method for written production, with a separate optional copying/legibility practice signal.

| Learning mode | Assessment evidence | Lesson response |
| --- | --- | --- |
| See it | Match a tool or material to a meaning; read it in context | Introduce unfamiliar vocabulary with clear examples |
| Recall it | Produce a word or meaning without choices | Add retrieval practice and spaced review |
| Hear it | Understand a crew instruction without a transcript | Add listening, replay support and gradually longer instructions |
| Type it | Produce a word, phrase or short answer | Adjust written task length and feedback |
| Say it | Give an understandable response to a work scenario | Adjust prompts, model support and speaking complexity |
| Write it | Handwrite an answer from memory | Offer handwriting practice and comparison without conflating recognition errors with ability |

Copying a visible word is useful preparation but does not demonstrate recall. Multiple-choice recognition does not substitute for independent production.

The full assessment samples all six skills when evidence can be collected accessibly. Optional or technically unavailable modalities display “Not assessed.” Each reported skill requires coverage across at least three distinct objectives; publish the final item counts only after the question bank is reviewed.

# 8 Module assessment content and equivalent forms

For each module and supported language track, create a reviewed assessment blueprint, question bank and three checkpoint forms. Entrance and day 90 forms match intended difficulty and full-module objective coverage, with equivalent tasks and a small set of common anchors. Day 45 combines comparable anchors with the objectives studied so far and limited transfer tasks; its studied-content result remains distinct from full-module readiness. Most entrance and exit scenarios and surface wording differ to reduce memorized-answer effects.

Roofing is the first blueprint: cover tools and materials; quantities and measurements; short crew instructions; sequencing and location; asking for clarification; reporting a concern; and describing progress or closing out work. Verify exact coverage against its 30 lessons. For every other module, derive a new objective map and authentic scenarios from that module’s own 30-lesson curriculum. Reuse the assessment engine and task formats, not unrelated Roofing content.

Each item must contain: stable item and version IDs, module and objective IDs, skill, difficulty band, target vocabulary, language pair, prompt, approved responses or rubric, score range, rationale, required assets, offline capability, form eligibility and reviewer approval.

Safety-related scenarios evaluate whether the learner communicates a concern or clarification; they do not grade technical roofing procedures as job qualification.

Every module’s exam items, accepted regional terminology and distractors require curriculum and fluent-language review before release. Specialized terminology also requires review by someone familiar with the domain. AI-generated items stay unpublished until approved. Each supported language track has an explicit review status; one reviewed translation does not establish readiness in every language.

**Comparability rule:** day 45 studied-content scores and full-module readiness scores are distinct. Growth charts use comparable common objectives and equivalent forms. Expanded coverage must not masquerade as improvement or decline. Scores from uncalibrated forms are labeled provisional; do not claim standardized proficiency or CEFR equivalence.

# 9 Scoring and AI support

Objective tasks use deterministic scoring with approved variants, accent policies and normalization rules. These policies are item-specific and visible in feedback. Preserve the learner’s original response.

Open responses use versioned rubrics. Written and spoken tasks evaluate task completion, understandable meaning and appropriate use of target language. Separate spelling/grammar feedback from whether the message was communicated. Accent differences alone must not reduce a speaking score when the response remains understandable.

For speech, keep transcription confidence separate from rubric confidence. For handwriting, display “We read…” and permit correction of the transcription before feedback; retain original and corrected versions. Uncertain recognition produces “Needs review,” never an automatic wrong answer.

AI may suggest a score, explain evidence and suggest practice. It must not invent module IDs, publish questions, grant mastery or silently change assignments. Use structured outputs, response bounds, versioned prompts and evidence references. Treat learner responses as data, never as scoring instructions.

Use three result states: provisional, final, and under review. AI timeouts and missing media leave affected dimensions pending; they do not become zeroes. Retries must not duplicate scoring or billing work. Low-confidence and disputed results enter a review queue.

Before launch, evaluate AI scoring against a human-scored sample covering language variants and input quality. If agreement is inadequate, require human review for that task type or withhold the score. Set acceptance thresholds during the pilot before results drive recommendations.

# 10 Skill profiles and progress reporting

Each skill score includes its value, scored objectives, evidence count, coverage, confidence, assessment version and completion date. Display scores on a 0–100 criterion-referenced scale only where the underlying rubric permits it. No overall score in the first release.

Proposed teaching bands: Needs foundations, Developing, Functional with support, and Independent in assessed tasks. Band thresholds are draft curriculum settings that must be validated; these labels are not general language certifications.

Compare entrance, midpoint and exit per skill on matched objectives. Show percentage-point change, actual dates and evidence gaps. When baseline coverage is insufficient, show “Comparison unavailable.” A learner starting near the ceiling may demonstrate strong final ability with little numerical gain.

Keep four concepts separate in the data and UI: steps opened, practice performance, learner-declared mastery, and assessed proficiency. No assessment silently marks skipped lessons mastered.

# 11 Personalizing the primary module

Build the initial plan from objective-level evidence and lesson prerequisites. Recommend a starting lesson, retain access to all previous lessons, and include targeted catch-up activities for gaps below that starting point.

Every lesson supplies its objective, level, vocabulary and phrases, reading passage, available activities, speaking mission, prerequisites, expected effort and offline assets. The toolkit consumes this shared definition rather than selecting unrelated content.

The same objective can have supported and independent activity variants. For example: a learner with strong recognition but weak listening gets a brief vocabulary review, more spoken-instruction practice, and a short response task using the same Roofing vocabulary.

At day 45, propose changes to activity emphasis, review frequency and supporting content. Preserve completed practice and the prior plan revision. The learner sees what changed and why. Independent learners approve their own new module additions. Team admins approve new team module assignments; practice emphasis within an already assigned module may apply automatically if the learner or team enabled that policy.

A recommended lesson remains a recommendation. Learners can revisit, and admins can override with a recorded reason.

## 11.1 Required lesson standard for every module

Every published module must be upgraded to a coherent 30-lesson path. Match the accepted Roofing module’s completeness and usability while using the module’s own content and appropriate language level. Generated word lists alone do not qualify a module as complete.

| Area | Required standard |
| --- | --- |
| Progression | A module outcome, 30 ordered lesson objectives, prerequisite links, explicit difficulty and a final task that combines earlier learning |
| Vocabulary | Reviewed target words and crew or context phrases for every lesson, with meanings, approved variants, pronunciation/audio references and usage examples; Roofing’s 8–12 terms and 4–6 phrases are the planning baseline, with documented curriculum reasons for exceptions |
| See it | A lesson-specific passage or dialogue using the target vocabulary, with word lookup and accessible visual support where useful |
| Recall it | Flashcards in both directions and matching or equivalent retrieval activities covering all target terms; phrases also receive retrieval practice |
| Hear it | Word and phrase playback plus listening tasks aligned to the lesson objective |
| Type it | Word, phrase and response tasks with useful correction feedback, progressing toward independent production |
| Say it | A mission tied to the same objective, level and vocabulary, with supported and independent task variants |
| Write it | Handwriting copy-and-compare first, then recall and short responses; recognition feedback when connected and self-comparison offline |
| Navigation | One clear sequence, previous and next lesson, full lesson list, saved position, and return to the same lesson and step after Reader or Speak |
| Review | Planned retrieval of earlier material, needs-practice handling, and separate participation, self-reported mastery and assessed results |
| Language support | Instructions in the learner’s instruction language, content in the selected target language, and reviewed terminology for each released track |
| Offline preparation | Versioned, reusable content and an asset manifest; label each activity’s connectivity requirement and preserve progress for sync |

## 11.2 Lesson level drives the toolkit

Each lesson’s shared definition sets the target vocabulary, allowed prerequisites, task complexity and support options used by every tool. Early lessons start with concrete recognition, single words and modeled short responses; later lessons require connected instructions, clarification and independent scenarios as appropriate to the module.

The activity engine must support these differences explicitly. Repeating identical games with new labels is insufficient. Reading length and sentence complexity, listening length and replay support, typing and handwriting response length, and speaking prompts must follow the lesson’s teaching settings. Reviews may reuse known vocabulary in new situations.

Curriculum review must verify both introductory and final lessons, with an objective-and-activity coverage audit across all 30. Document purposeful repetition and close missing word, phrase, passage, game or mission mappings before release.

## 11.3 Shared content production

Use one lesson engine, one assessment engine and shared dashboard contracts across modules. Store reviewed lesson content and exam banks centrally as versioned releases so every browser can reuse them and future offline packs can download them. AI can draft content; a learner’s first visit must not be the only way required content comes into existence.

Freeze the lesson, exam and rubric versions used by each enrollment or attempt. New releases need an explicit migration plan that preserves completed work and score comparability. Keep answer keys and scored exam content separate from ordinary practice packs.

# 12 Supporting module recommendations

Supporting modules supplement the assigned work module. They address a demonstrated prerequisite or a learner-selected goal; they never replace the work module silently.

**Proposed recommendation logic:**

1. Identify a gap supported by sufficient recent assessment evidence.

2. Resolve that gap to approved skill and objective tags.

3. Find eligible content in the real module catalog.

4. Exclude already demonstrated or duplicate content and modules outside the learner’s language pair, access, prerequisites or verified readiness.

5. Rank by gap coverage, job relevance, learner goals, expected effort and offline availability.

6. Present no more than two recommendations, with evidence and a small proposed workload.

7. Let the independent learner approve, modify, defer or dismiss personal suggestions. For team assignments, let the admin decide and notify the learner of an approved assignment.

8. Recheck benefit with targeted practice or a short follow-up assessment.

The module catalog must declare skill/objective coverage, prerequisite level, recommended units, expected effort, version, language-track readiness, lesson completion status, all three exam statuses, and offline capability. Only verified content can be recommended. Proposed names below are content categories to map to actual available modules, not claims that those modules exist.

| Observed evidence | Supporting content category | How it complements Roofing |
| --- | --- | --- |
| Repeated errors understanding numbers, amounts or units | Numbers and measurements | Practice quantities before applying them in material requests |
| Understands individual words but misses short spoken instructions | Everyday listening and directions | Practice order, location and short instructions |
| Recognizes terms but struggles to form a request | Foundational sentence patterns | Build requests and questions using familiar roofing terms |
| Cannot ask someone to repeat or explain | Workplace communication and clarification | Practice repair phrases before crew exchanges |
| Work-module results are strong and the learner wants broader use | Learner-selected everyday conversation | Extend language use beyond the job without changing the work assignment |

Never infer low literacy, disability, education or personal interests from a low language score. A missing speaking result does not justify a speaking-remediation assignment. If no eligible content exists, show “Content gap” for curriculum staff rather than recommending an unrelated module.

# 13 Supporting assignment workload and lifecycle

Proposed default: retain at least 80% of the agreed study-time budget for the primary module and allocate up to 20% to supporting work, with one active supporting module at a time. Treat the percentage as a planning cap, not a learning claim. Admins can change it after seeing the projected schedule impact.

Assign specific units when they address the gap; do not require an entire 30-lesson module unnecessarily. Offer a full additional module only when the scope and learner goal justify it.

Every supporting module must still offer the complete 30-lesson curriculum and all three exams. A targeted assignment of a few units uses a short before/after skill check rather than forcing another full 90-day program. If an admin assigns the whole supporting module, create a separate enrollment with its own entrance, day 45 and day 90 schedule; do not merge its scores or deadlines into the primary work module.

Supporting assignments appear in the existing daily plan as “Support for your [primary module] lesson,” with a reason, estimated time and an automatic return to the main lesson. Roofing is the first example. Reuse embedded content or the established go-and-return pattern. An extra assignment does not silently extend the 90-day course or mark the learner behind; show any proposed schedule adjustment before approval.

Lifecycle: suggested → approved → active → checkpoint due → completed, paused or withdrawn. Dismissed suggestions retain a reason and do not reappear without new evidence. Partial completion remains available for future review.

Example: weak spoken quantity comprehension leads to a small Numbers and Measurements unit twice weekly, immediately before relevant Roofing practice. A short check later determines whether to continue; it does not require waiting until day 90.

# 14 Team dashboard requirements

Add an **Assessments** area linked from each learner’s module assignment.

**Team overview:** learner, primary module, entrance/day 45/day 90 status, next checkpoint, skill gaps needing attention, pending reviews, pending support recommendations and active supporting assignments. Filter by module, checkpoint and action needed. Do not rank employees by a single score.

**Learner detail:** three-checkpoint skill comparison; coverage and confidence; actual versus scheduled assessment dates; selected task evidence; current plan and revision history; supporting recommendations; and the distinction between mastery, participation and assessed performance.

**Recommendation card:** “Why this is suggested,” source objectives and assessment date, proposed supporting units, expected weekly effort, affected plan activities, offline availability and Approve / Edit / Defer / Dismiss actions.

**Review queue:** pending AI scores, recognition uncertainties and learner disputes, with original evidence, rubric, proposed rating and a justified review action.

**Team insight:** aggregate gaps by skill and objective to inform curriculum investment. Display denominators and missing evidence; avoid small-group disclosure. Separate a missing content mapping from a learner weakness.

Exports include authorized scores, status, coverage and assignment history. They exclude private profile fields and raw voice/handwriting by default. Tenant and role checks apply to exports as well as screens.

**Module readiness view:** show each module and language track with 30-lesson coverage, missing content/activity mappings, entrance/day 45/day 90 exam readiness, review owner, verification date and release state. Keep curriculum readiness separate from learner progress. Admins must see an honest “Upgrade in progress” state for legacy modules and cannot assign an unavailable exam.

# 15 Learner feedback and guidance

Feedback answers: what I can do, what needs practice, what I should do next, and why. Use a real task example rather than a personality label.

Example: “You identified most tool names. Spoken quantities were harder in two material-request tasks. Your plan adds short listening practice using those same materials.”

The result screen links to the six-mode philosophy page and suggests a practical routine: see the example, try recall before revealing it, listen, type or write a response, then say it in a short scenario. Learners can choose accessible practice alternatives.

The learner can inspect a rubric, report a recognition issue and request review. Scoring corrections update the profile and regenerate proposed recommendations without silently changing approved assignments.

# 16 Data model and integration contracts

These are logical contracts to map to the existing app during technical discovery.

| Entity | Required responsibility |
| --- | --- |
| AssessmentBlueprint and Form | Versioned objective coverage, skill mapping, equivalent forms and anchors |
| Item and Rubric | Reviewed content, accepted answers, assets and scoring rules |
| AssessmentAssignment | Personal or team ownership scope, learner, module enrollment, language pair, checkpoint, schedule and status; team reference only for team scope |
| Attempt and Response | Frozen form version, responses, save state, timestamps, accommodations and consent |
| Score and Review | Original rating, rubric/model versions, confidence, corrections and reasons |
| SkillProfile | Evidence-backed objective/skill results at a checkpoint |
| PlanRevision | Previous and proposed lesson/activity plan with reason and approval state |
| ModuleCapability | Approved objective mappings, prerequisites, effort, language support and availability |
| ModuleRelease and Readiness | Versioned 30-lesson manifest, activity/asset coverage, three-exam readiness, reviewers and release gates |
| LessonDefinition | Objective, level, prerequisites, vocabulary, passages, activities, speaking mission and offline assets |
| ModuleEnrollment | Learner, module version, personal/team scope, primary/support role, start date and per-enrollment checkpoint schedule |
| Recommendation and SupportAssignment | Evidence, catalog mapping, decision, workload and lifecycle |

Assessment results are authoritative server records. Authorize personal enrollments by their account owner and team enrollments by explicit team membership and role. A team reference is optional for personal study, never fabricated. Local practice stores are not the authority for ownership, team membership or assignment permissions.

Proposed events: assessment.assigned, attempt.started, response.saved, attempt.submitted, scoring.completed, result.reviewed, recommendation.created, support.approved, and plan.revised. Each carries a unique event ID, tenant and enrollment references, schema version and timestamp. Enforce idempotency, retries and deduplication.

On submission, persist the attempt before asynchronous scoring. A scoring failure must not lose answers. Generate recommendations from a specified final profile version, and retain the decision trail. Cross-domain links restore the same assignment and lesson context.

# 17 Offline behavior and resilience

Release 1 requires an online start and an online submission for official assessments. Answers survive refresh and short connection loss on the same device; show “Saved on this device” separately from “Synced.” Reconnection retries safely. Do not promise full offline assessment in this release.

The target offline release downloads a versioned pack of questions, approved assets and deterministic scoring data where appropriate. Protected answer-key handling and assessment integrity require a separate design review before scored offline release. Official results remain provisional until uploaded and validated.

Downloaded lesson and supporting-module packs contain vocabulary, passages, games, prompts and available audio. Content availability labels distinguish “Available offline,” “Requires connection,” and “Ready to sync.” Offline handwriting offers answer comparison; AI feedback waits for connectivity. Speaking recording may be deferred or omitted with a clear state.

Use explicit local-data cleanup on sign-out on shared devices, with a warning for unsynced work. Handle stale packs, storage exhaustion, interrupted downloads, multi-device attempt conflicts and changed assignments. Resume one authoritative attempt; do not merge conflicting answers silently.

# 18 Privacy accessibility and operating controls

Collect only evidence needed for learning and assessment. Explain voice/handwriting recording before capture and provide alternatives. No camera, biometric identification or background recording is required.

Enforce account ownership and tenant boundaries on assignments, results, media, review actions and exports. Team membership grants no access to personal exams. Use short-lived media access and server-side authorization. Record admin and reviewer changes in an audit trail.

Proposed retention default for owner approval: raw voice and handwriting deleted 30 days after final scoring or resolution of a dispute; team scores and assignment history retained for the active team relationship plus 90 days; personal results retained for the active account and governed by its account deletion policy. Leaving a team must not delete unrelated personal results. Deletion must propagate to derived copies as appropriate. Confirm actual account/export/deletion policies before launch.

Support keyboard use, screen readers, captions or equivalent accommodations, adequate contrast, and feedback that does not rely on color. When an accommodation changes the skill measured, annotate comparability without reducing the score.

Bound AI usage per authenticated learner/attempt and, where applicable, per team. Apply upload limits, server-side quotas, duplicate-request protection and spending thresholds for both personal and team use. No anonymous unlimited scoring endpoint. Monitor failures and rubric/model regressions.

# 19 Delivery phases and dependencies

**Phase 0 — Verify the current foundations.** Before building the assessment feature, test the current Roofing lessons and team dashboard with a real test learner: lesson entry, all practice modes, previous/next navigation, Reader/Speak return, saved progress, and learner-to-admin reporting on phone and desktop. Resolve blocking usability and tracking issues. Demonstration certificate data is not proof of working progress integration. Inventory every published module and language track, then create a gap matrix against the universal standard.

**Phase 1 — Complete Roofing lessons and the reusable foundation.** Accept all 30 Roofing lessons against sections 11.1–11.3. Establish stable objective IDs, the shared lesson definition, central content storage, activity settings, review workflow and offline asset manifests. Verify beginner-to-final-lesson progression and real learner tracking before calling the lesson module usable.

**Phase 2 — Make Roofing the first complete module.** Deliver shared sign-in, the Exams area for independent and team learners, self-started personal assessments, team assignments, reviewed Roofing entrance/day 45/day 90 forms, scoring and review, skill profiles, comparable growth views, plan revisions, supporting assignments and dashboard integration. Run the full cycle both with an independent account that has no team and with a team test learner using accelerated dates, then an owner-reviewed pilot. Roofing becomes the versioned reference only after its lessons, all three exams and both learner paths pass acceptance.

**Phase 3 — Bring every remaining module to parity in batches.** Use the audited inventory rather than a fixed assumed module count. Prioritize active team assignments and high-demand modules, then related domains that can reuse validated activity patterns. Publish an ordered backlog covering every remaining module, with an owner, gap list, review dependencies and planned batch. Each batch must include complete lessons, all three module-specific exams and verified dashboard integration; lesson-only or exam-only work is recorded as partial, not complete.

**Phase 4 — Finish catalog coverage and offline rollout.** Continue batches until every published module meets the same lesson and three-exam gates for its released language tracks. Deliver and test downloadable lesson/support packs and synchronization, while retaining clear connectivity labels for AI features. Scored offline exams remain subject to section 17’s integrity requirements. Future modules enter through the same pipeline and cannot bypass the standard.

## 19.1 Repeatable module upgrade pipeline

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| Audit | Inventory of all 30 lessons, vocabulary, phrases, passages, games, missions, language tracks and exams | Every gap has an owner and a recorded disposition |
| Curriculum | Objective/prerequisite map and difficulty progression; reviewed words, phrases and usage | All 30 lessons are coherent and domain-appropriate |
| Practice | Six learning modes driven by lesson definitions; navigation and review | Coverage audit passes and sampled activities work on phone and desktop |
| Exams | Module-specific entrance, day 45 and day 90 forms with approved answers, rubrics and anchors | Curriculum/language review and scoring checks pass |
| Integration | Enrollment, placement, support recommendations, checkpoint schedule and dashboard | Real learner activity and results appear correctly for the authorized admin |
| Pilot and release | Representative learner trial, resolved blocking findings and versioned content package | Owner accepts the module against the Roofing reference |
| Maintenance | Regression checks, content feedback, version history and offline verification | Updates preserve learner records and assessment comparability |

Proposed batch size is three to five modules, reduced when specialist review capacity is limited. Batch order is set from the inventory, usage and review readiness; do not invent a rollout date before that work is sized. Reuse shared components across domains while reviewing each module’s actual content.

## 19.2 Readiness and migration rules

Track states per module and language track: Not audited → Gaps identified → In production → In review → Pilot → Verified. Record lesson and each exam readiness separately so partial progress stays visible. Offline capability is a separate verified status, not an implied property of Verified online content.

Preserve access and progress for existing learners during upgrades; label incomplete tracks “Upgrade in progress.” Apply the full standard to newly released or newly promoted tracks. Keep prior results tied to their original versions, never fabricate entrance scores, and offer a current-state baseline to learners joining after their course began.

A supporting module cannot enter automated recommendations until its assigned content is verified. A module is complete only when its 30 lessons, all three exams, learner flow and team reporting pass the release gate. Generation success, test fixtures and an attractive certificate are not substitutes for this evidence.

# 20 Acceptance criteria

- For every verified module, a team admin can assign entrance, day 45 and day 90 checkpoints to a full enrollment; the learner sees the same module-specific schedule in the app and testing site. Roofing is the first verified module.

- Sign-in and return navigation preserve the assignment without exposing credentials or learner results in URLs.

- An interrupted attempt resumes without answer loss; a duplicate submission creates one scored attempt.

- Each released exam item in every module maps to a reviewed lesson objective and rubric. All three checkpoint forms satisfy the approved module blueprint and comparison rules.

- The result profile distinguishes all six skills, unassessed modalities, pending ratings and inadequate evidence.

- Equivalent-objective growth is reproducible from stored scores and rubric versions; unequal coverage is labeled.

- Placement recommends a start and catch-up practice while keeping previous lessons available and mastery records intact.

- Supporting recommendations reference real eligible catalog units, explain the evidence and effort, and require admin approval before assignment.

- Approved support appears in the learner’s daily plan with a return path to the primary module and no hidden deadline change.

- Day 45 findings can revise the remaining plan while preserving the original and the reason for each change.

- AI uncertainty and recognition failures cannot automatically become incorrect answers; review corrections preserve an audit trail.

- Cross-team access is denied for UI, APIs, media and exports; ordinary admin views expose only approved assessment information.

- Core learner flows work on phone and desktop with keyboard/accessibility alternatives.

- Offline claims match tested behavior; release 1 never labels locally saved work as officially submitted.

- A real test learner completes Roofing entrance → lessons → midpoint adjustment → exit → next-module recommendation using an accelerated test schedule. Repeat the full enrollment and reporting verification for each released module.

- Every upgraded module has 30 reviewed lessons and all six practice modes with appropriate accessibility alternatives; no missing objective, word, phrase, passage, game or speaking-mission mapping remains unaccounted for.

- Introductory and final lessons demonstrate appropriate changes in toolkit difficulty and support, rather than only swapping vocabulary.

- A complete inventory and readiness matrix covers every published module and released language track. No module is labeled complete on word-list generation alone.

- Existing learner records survive content upgrades; modules and exams show their actual readiness, and unreviewed language tracks are not presented as verified.

- All new modules use the same release checklist, assessment contracts and dashboard behavior as Roofing.

- An independent learner with no team can open Exams, start an accessible module’s entrance assessment, resume after interruption, inspect private results and create or update a personal study plan.

- The same learner can take day 45 and day 90 exams, compare skill growth, distinguish retakes from original checkpoints and accept or dismiss supporting-module suggestions without an admin.

- Joining a team, leaving a team or switching between personal and team enrollments does not silently expose, merge, delete or overwrite personal exam history.

- Every module’s release verification includes both independent and team learner flows, using the same reviewed exams and scoring engine.

# 21 Pilot measurement and release gate

Measure assessment completion and abandonment by section; time to first useful lesson; unscored or disputed response rates; AI/human scoring agreement; recommendation approval and dismissal reasons; supporting-assignment effort and completion; comparable skill changes; and navigation return failures.

Proposed technical targets: no lost submitted answers in resilience testing; no duplicate official results under retries; immediate objective feedback; open-response scoring normally within two minutes, with an explicit pending state when delayed. Validate actual latency and cost before setting a service promise.

Pilot Roofing first with representative independent and team learners across starting levels, language variants and device/input choices. Include an account with no team and one with both personal and team enrollments to test ownership boundaries. Apply the same pilot method to each subsequent module, scaled to its domain and content risks. Review whether low scores reflect language gaps, unclear questions or interface friction. Do not treat a small pilot’s score growth as proof of causal teaching effectiveness.

Each module’s release requires 30 complete reviewed lessons, all three approved exams, acceptable human/AI scoring agreement, completed privacy decisions, tested tenant isolation, usable learner/admin flows, an owner-reviewed dashboard and accurate offline capability labels. Track catalog progress as verified modules divided by the full audited catalog, with a separate breakdown by language track; no module is exempt from parity.

# 22 Owner decisions and proposed defaults

| Decision | Proposed default |
| --- | --- |
| Companion hostname | assessment.languagethreshold.com |
| First supported track | Roofing Foreman, English instructions and Spanish target; other tracks follow reviewed content |
| Required catalog scope | Every module: 30 complete lessons plus entrance, day 45 and day 90 exams; Roofing first |
| Rollout order | Audited backlog prioritized by active learners, demand, domain reuse and reviewer capacity |
| Proposed batch size | Three to five modules, adjusted to review capacity |
| Learner access | Exams area for independent and team learners from the first complete Roofing release |
| Primary role of assessment | Learning placement and progress; personal suggestions approved by the learner, team assignments by the admin |
| Supporting workload | One supporting module at a time; selected units first; up to 20% of planned study time |
| Official result visibility | Personal results private to the learner; team enrollment results visible to authorized team admins; raw media behind an explicit evidence policy |
| Assignment automation | Learner approval for personal module additions; admin approval for team module additions; configurable within-module practice adjustments |
| Offline launch scope | Resilient online assessment first; downloadable lesson packs and scored-offline design follow |
| Rating bands and placement cutoffs | Validate in pilot; no hard-coded universal thresholds |
| Retention | Proposed 30-day raw evidence and active relationship plus 90-day result history, subject to owner approval |
| Language expansion | Separate versioned question banks and rubrics; do not auto-translate published exams without review |

Implementation starts by proving the current Roofing lesson and dashboard foundations usable, then completing Roofing’s lesson and three-exam standard before rolling that standard across the catalog. Proposed operational defaults remain reviewable. DNS, new public hosting, retention-policy changes and learner-visible rollout are separate implementation actions.
