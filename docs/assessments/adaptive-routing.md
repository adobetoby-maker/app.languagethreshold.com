# Adaptive routing foundation — learner runtime inactive

The PRD requires a fixed core followed by a short evidence-driven branch. The private durable database foundation has been applied under the owner's explicit approval; see `adaptive-routing-migration-proposal.md`. The authenticated route coordinator now uses that foundation, but the full learner branch flow remains disabled. No hosted adaptive form, review approval, threshold policy, role, active speech policy or schedule was changed by this API checkpoint.

## Authenticated selection API

The strict `POST /api/exams` action `route` accepts only `attemptId`, saved `revision` and `requestId`. Existing authentication, same-origin, body-size, no-store and durable request-budget controls apply. The coordinator verifies actual learner ownership before reading original route evidence or saved core answers; team report access is insufficient. It computes from the frozen full-module form and authoritative saved core responses, then calls the service-only RPC, which repeats actor/source/revision checks under the attempt lock.

Retries validate and reuse the original core snapshot and decision, even after later answer edits. A new request UUID cannot reroute; the same UUID with a changed source revision conflicts. Every retry still reaches the RPC for global request-identity conflicts and fresh authorization. If another route wins concurrently, only its immutable validated decision is projected. Malformed audit/receipt data fails closed. The response contains current revision, a selected-state/core-count summary and whitelisted core/selected questions; private routing reason, percentage, evidence counts, digest, policy, keys and unselected branches remain server-only.

Adaptive preparation/start and AI review still retain their existing blanket guard. Submission also checks that guard before its durable RPC while reporting, review and learner UI remain unfinished. This action does not enable new adaptive exams. Positive route fixtures are controlled local tests, not hosted content or an approved policy.

## Selected answers and media

The internal selected-path resolver accepts an already-authorized attempt context. Historical flat forms retain their original order without reading the route table. Adaptive forms require valid full-module metadata and matching frozen form/rubric identity. Before selection only core items are usable; after selection only core plus the immutable branch are usable, including after later core edits. The resolver reads only decision/revision fields, not original core answers or the retry audit payload. Malformed identity, evidence/band metadata, revisions or storage errors fail closed.

The save handler rejects unselected updates before calling the existing save RPC; database selected-item guards repeat membership checks under lock. Listening requires an active learner and selected frozen item before a protected clip read or QA-only device-speech fallback, and rechecks active access after fetching clip bytes. Speech status validates the selected path; upload requires a selected speaking item before policy checks, request-body consumption or storage. Playback requires selected speaking evidence plus the exact attached response and retains withdrawal/byte-integrity/access rechecks. Collection/cleanup policy gates remain unchanged and disabled on the shared backend.

These paths do not activate adaptive starts or supply a new form, reviewed clip, speech policy, score or growth claim. Controlled media tests use synthetic local byte fixtures; they are not microphone, physical-device, linguistic or reviewer acceptance.

## Selected attempt reads and initial scores

Authorized attempt reads expose only core or core-plus-selected questions, a safe routing state/core count and that path's responses. Submitted attempts require a durable route and exactly one saved response per selected item, including explicit unavailable answers supplied by submission. Duplicate/unknown/unselected response identities, malformed answers or unrelated score references fail closed. Submitted feedback keys are restricted to selected items; active attempts still receive no feedback keys. Speech status, grading-job and proposal projections cannot introduce unselected item/response records, and proposal audit details are whitelisted.

Adaptive read access and the explicit organization scope are checked again after score/review reads, before preparing the private response. A revoked team/reviewer grant cannot be treated as a durable authorization from the beginning of a multi-read request.

Initial scoring resolves the same immutable path, validates the complete selected response set and prepares every deterministic result before its first scoring RPC. It uses final saved answers, without recomputing the routing decision from later core edits. Missing evidence remains not assessed, and production remains pending review. Partial storage failures resume through the existing stable per-response scoring identities. No missing responses are invented for unused branches. Flat historical forms retain their original item/feedback order without a route query.

The attempt's returned branch evidence has no comparison anchor; fixed-core evidence retains its authored anchor. Overview/history/export/team comparison paths still need integration before any adaptive growth claim or release. Adaptive AI and human-review controls remain unavailable in this checkpoint. Positive score/read/retry fixtures are local only; no hosted result or content approval is manufactured.

## Implemented source boundaries

`routing-contract.ts` defines schema/version, ordered core IDs, authored evidence/objective minima, bounded disjoint branches, complete ordered percentage bands and a separate insufficient-evidence branch. There are no engine-supplied placement cutoffs. The fixed core retains the existing requirement of three objectives per skill, so a branch cannot provide the only sample for a skill. The branch cap of 30 items (and no more than the core) is a resource bound, not a validated effort promise.

`routing.ts` is server-only. It evaluates saved core responses against frozen objective keys using the same deterministic scorer as the existing engine. Written/spoken production and client-provided score claims cannot supply routing points. Missing/unheard audio, uncertain recognition and unavailable inputs do not become wrong-answer zeroes. The policy's evidence and objective minima decide whether the result can select an ability band; otherwise the separate diagnostic branch is chosen, with no percentage or low-ability classification. All core responses must be attempted or explicitly unavailable first.

A candidate decision records attempt/revision, form/rubric/policy versions, evidence counts, private reason and a SHA-256 digest of canonical frozen form/core-response data. This is calculation output; it is **not** a saved decision, signature or authorization token. Candidate band counts and percentages are not final proficiency scores.

The public projection helper requires a trusted decision for the exact attempt and frozen form versions and exposes only core plus selected-branch questions through the existing whitelist. It omits the policy, answer keys, private listening text and alternative branches. The authenticated coordinator and selected-path resolver provide the durable authorization boundary; caller-supplied decision objects are never trusted. The comparison helper returns fixed-core IDs only. It is not yet wired to every reporting pipeline and does not establish calibrated equivalence.

Forms with any routing metadata still cannot be prepared/started. Valid adaptive reads use the selected-path serializer; malformed metadata fails closed rather than falling back to a flat exam. Module/catalog queries exclude any routing field using JSON-path SQL NULL semantics; JSON `null` is not silently treated as an absent field. Targeted-support readiness excludes routing definitions, too. A future adaptive form does not displace an available compatible flat form. Existing frozen flat attempts retain their previous behavior.

## Engine integration checklist

1. Database foundation applied: a separate private, append-only attempt-routing record keyed uniquely by attempt, rather than rewriting the immutable `form_snapshot`. Bind the original core response snapshot, revision, policy/form/rubric versions, selection reason and retry identity. Keep clients without direct read/write grants and authorize the actual learner within the service RPC.
2. Database foundation applied: lock the attempt in the same order as saves/submission. Require the authoritative saved revision before accepting a server-computed candidate; freeze exactly one decision. Concurrent saves, reconnects and new request keys must return the same existing decision or a conflict, never choose another branch. A failed transaction must not leave half a decision/event.
3. Database and authenticated coordinator implemented: preserve the original decision if the learner later revisits a core answer. Its audit basis is the source revision/core snapshot; final scoring uses the actual submitted answers. Do not silently re-route after a different save or label the routing percentage as a final score.
4. Enforce selected item membership for response writes, listening/speech access, AI review, submission, scoring and saved/offline views. An unselected branch must not receive fake missing responses or influence evidence denominators. Do not change historical flat attempts or their receipts.
5. Add the explicit core → continue/connection-required → branch UI. Selection requires confirmed server saves and connectivity. No browser-side routing decision or background publication is allowed. An offline core remains recoverable under its existing account; a saved selected branch must not unlock alternatives.
6. Carry fixed-core comparison anchors through histories, exports and team insights. Branch-specific additional evidence remains identified separately. Different paths, missing evidence or familiar repeated forms do not manufacture comparable growth.
7. Bind authored routing policy bytes to content review, calibration and equivalence. Keep targeted supporting checks flat until their independently reviewed routing design exists. No universal threshold, language level, approval identity or release readiness is inferred from fixture cutoffs.

Required acceptance includes true concurrent save/route/submit transactions, replay and payload conflicts, malformed snapshots, late identity changes, permission boundaries, reconnect/expiry recovery, selected-media authorization, original-history compatibility and private-bank absence. The existing flat engine is not a substitute for these checks.

## Scoped verification

Production-source controlled tests cover fixture 0/boundary/maximum bands; insufficient, uncertain and unheard evidence; minimum objective coverage; blank/missing core responses; ignored branch/client-score inputs; duplicates/unknown IDs; stable canonical digests and changed versions/revisions; exact-attempt projections and key/branch exclusion; legacy attempt access; unsupported metadata readiness; and start/read exposure guards. Fixture thresholds and verified statuses are deliberately fictional and are never inserted into the hosted project.

A read-only hosted query confirms the JSON-path filter is accepted and all three current forms remain flat. A read-only local PostgreSQL SELECT separately checks absent routing versus JSON `null`/object semantics. Current hosted content still has no adaptive policy; these checks are not a real learner pilot or a published assessment.

The concrete proposed staging database/transaction scope and acceptance matrix are in [adaptive-routing-migration-proposal.md](adaptive-routing-migration-proposal.md). It is a design for review, not an applied migration or authorization to change the schema.
