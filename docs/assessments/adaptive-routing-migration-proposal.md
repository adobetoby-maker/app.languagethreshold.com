# Staging proposal: durable adaptive routing

Status: design for owner review. No migration was created or applied. Routing remains disabled. This proposal requests an exception only to the current instruction against schema changes; it does not approve content, placement thresholds, recording, retention, schedules or production deployment.

The pure selector cannot provide durable routing by itself. Current saves/submission lock the attempt row, and the frozen snapshot trigger prohibits rewriting the form. Submission also creates unavailable-response rows for every frozen item. Enabling adaptive forms without changing these boundaries would permit unselected answers and distort evidence denominators.

## Proposed database scope

Add one deny-by-default table, `public.assessment_attempt_routes`, rather than changing historical snapshots. It contains one immutable route per attempt:

| Field | Contract |
| --- | --- |
| `attempt_id` | UUID primary key referencing the existing attempt; deletion follows the existing parent lifecycle, without a new retention policy |
| `request_id` | UUID unique retry identity; an existing identity cannot select another attempt or payload |
| `source_revision` | Nonnegative authoritative saved revision used for selection |
| `decision_revision` | Exactly `source_revision + 1`, the attempt revision after the atomic routing event |
| `decision` | Bounded JSON object matching the server-only `FrozenRoutingDecision`; attempt/form/rubric/policy identities must match the frozen snapshot |
| `core_snapshot` | Bounded ordered array of the exact persisted core item IDs and original answer objects at the source revision |
| `request_payload` | Bounded private retry payload for exact JSON equality checks; no dependence on a weak hash for replay acceptance |
| `created_at` | Database timestamp, immutable |

Enable RLS with no client policies. Revoke table/function access from PUBLIC, anon and authenticated. Grant only the service access required by the API: table SELECT/INSERT, and EXECUTE for the service-only transaction. Deny ordinary direct UPDATE/DELETE; preserve the existing authorized parent-deletion lifecycle rather than installing a delete trigger that blocks cascades. A guard validates insert invariants so direct service insertion cannot create a malformed route. No existing role membership, active application policy, historical record or release approval changes.

Create a service-only security-invoker RPC with an empty fixed search path:

`assessment_select_route(p_actor uuid, p_attempt uuid, p_revision integer, p_request uuid, p_definition jsonb, p_core jsonb, p_decision jsonb)`

The API supplies `p_actor` from its verified authenticated user, never a client-selected actor. Clients cannot call the RPC directly or supply trusted decision objects. The API computes a candidate from the immutable form and authoritative saved responses using the existing deterministic selector. The database verifies those source bytes again under lock; it does not treat a client digest as proof.

## Transaction and retry behavior

1. Lock the attempt first, matching saves and submission; then resolve its checkpoint/enrollment using the existing learner ownership and `assessment_private.can_read` checks. Any additional checkpoint lock follows the existing attempt→checkpoint order. Reject a foreign learner before reading a receipt.
2. If the same request identity has a stored route, require the exact attempt and retry payload. Return its original immutable decision plus the current attempt revision; do not present an old receipt revision as the latest saved state. Identity reuse for a different payload/attempt conflicts.
3. If this attempt already has a route under another request identity, return the original route. A changed core answer, revision or newly computed candidate cannot reroute it. Authorization still applies; only a fresh selection requires an active enrollment, scheduled checkpoint and in-progress attempt.
4. For a new selection, require the saved revision to equal `p_revision` and the exact frozen definition to equal `p_definition`. Require valid routing metadata and a matching private decision identity/version/branch. Reject incomplete or malformed core snapshots.
5. Aggregate authoritative persisted core answers in policy core-ID order. Compare them to `p_core` with JSONB equality. Do not compare JavaScript canonical JSON digests to PostgreSQL JSONB serialization hashes: their byte representations differ. The existing SHA-256 digest remains private audit metadata, alongside the actual source snapshot.
6. Insert the single route, advance the attempt revision once and insert `attempt.routed` into the existing audit event table in the same transaction. The event contains only attempt/selected-branch/policy/revision references; full answer snapshots stay in the private route record. Failure rolls back all three writes.
7. Return the trusted frozen record to server code. Learner projection exposes only the core and selected branch through the existing public item whitelist; private reason/counts/percentage, keys, policy and other branches never enter an active learner response.

## Membership changes required before enabling a form

- Extend the existing response-write guard: flat attempts retain current behavior; adaptive attempts permit core only before selection and core plus the selected branch afterward. Reject items from other branches, including direct service writes.
- Submission requires a route for an adaptive attempt. Fill explicit missing evidence only for selected items, never every frozen branch. Concurrent submit/route/save operations serialize on the attempt; failed/losing operations cannot leave responses/events behind.
- Listening, speech references, review/AI requests and private answer reads use the same selected-item membership. No alternate branch may be unlocked by guessing an item/media identifier.
- Scoring and response counts use selected items only. Growth histories/exports/team insights use fixed-core comparison anchors; additional branch evidence stays separately identified. Preserve flat histories, receipts and immutable snapshots.
- Client Continue requires acknowledged saves and online server selection. A durable selected route can resume; offline clients cannot select or infer a branch. Account/expiry/reconnect behavior must preserve owned pending work without exposing another account's route.
- Targeted supporting checks remain flat. No hosted adaptive form is authored, published or enabled by the infrastructure migration.

## Required verification and deployment order

The migration must first be generated with the existing CLI, reviewed, and tested in the named local assessment QA database. Fictional content/status fixtures remain local and roll back. No hosted fake approvals, learner results, roles or certificates.

| Trial | Required result |
| --- | --- |
| Route vs route, same/different retry IDs | One frozen record/event/revision increment; no alternate branch |
| Same retry ID, changed bytes or different attempt | Conflict; original route remains unchanged |
| Save wins before selection | Stale candidate conflicts without route/event insertion |
| Route wins before save | Save uses the new revision and allowed selected membership |
| Submit wins / route wins | No post-submit new selection; no submission without selected membership |
| Later core edit | Original decision/core audit basis retained; final submitted response is scored as submitted |
| Direct client and foreign learner | Table/RPC denied; no record/receipt/private-content leakage |
| Malformed policy/decision/core | Rejected without partial writes |
| Direct service response/media write to another branch | Rejected by membership guards |
| Failure between route/revision/event writes | Full rollback |
| Flat historical attempt and old request receipt | Existing behavior and bytes preserved |
| Parent deletion and disabled speech policies | Existing authorized deletion works; recording/cleanup policy remains unchanged |
| Save/route response lost, retry after reconnect | Frozen route and current revision recovered once |
| Reports across differing paths | Core-only comparable anchors; no fabricated evidence or equivalence |

After local SQL/concurrency tests, scoped source tests, type-check, lint, private-bank absence and the staged build pass, inspect actual database advisors and review the new object grants. Apply only to the existing staged backend, verify those objects and negative access boundaries, and deploy a separate true Preview. Keep unsupported-form guards until all runtime/UI/media/reporting integration passes. Shared backend means existing live flat-form compatibility is mandatory; a Preview URL alone is not database isolation.

The accepted Exams hostname stays pinned until intentional acceptance. No push to main or production promotion occurs until the owner's completion condition and remaining launch gates are satisfied. A failure rolls back application use by keeping adaptive forms unavailable; it does not delete immutable decisions or rewrite published migrations to hide a failed rollout.
