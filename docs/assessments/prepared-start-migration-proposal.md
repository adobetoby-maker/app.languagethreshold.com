# Proposal: bind adaptive start to the validated source

Status: locally tested proposal; **not applied, not wired into the application, not an activation approval**. The existing Preview capability stays explicitly off. Owner approval for the earlier durable-routing migration does not automatically approve this additional RPC.

The API checks the prepared disclosure digest and reviewed/calibrated private form before invoking `assessment_start_attempt`. The existing RPC reads that source again without holding a source-row lock and does not require calibration. A calibration/content edit between those operations can create an attempt different from the source the API validated. The fixed local QA database reproduced an actual nonpilot start freezing `calibrated=false` after the previously read source was calibrated. No hosted adaptive attempt or content was created.

## Concrete additive change

[SQL proposal](proposals/prepared-start-rpc.sql) adds only `assessment_start_prepared_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text[])`. It changes no existing table, function signature, role membership, policy, content approval, historical snapshot or retention behavior. It is a service-only security-invoker function with an empty search path; PUBLIC, anon and authenticated cannot execute it.

The authenticated server supplies the full private form and release rows it has validated, plus studied coverage. These JSONB rows are trusted server parameters, never accepted from a browser body or returned to a learner. The browser's existing opaque preparation digest is still checked by the API. Full row equality deliberately fails closed on any intervening source edit, including review metadata and equivalence fields; PostgreSQL JSONB equality avoids comparing JavaScript and PostgreSQL JSON serialization hashes. Source payloads are bounded at two megabytes each.

The wrapper acquires the existing learner/track advisory lock first, then enrollment SHARE and checkpoint UPDATE locks, then form SHARE and release SHARE locks. This preserves the existing start/exposure ordering, schedule enrollment→checkpoint ordering and review form→release ordering. It rechecks actual learner access. For a new attempt, it requires active full-module scope, a scheduled checkpoint, exact expected source rows, verified/calibrated module content, matching definition/row versions and language/checkpoint identity, adaptive schema metadata and the stored thirty-lesson binding. It holds the source locks while delegating creation to the existing RPC with pilot=false. That transaction retains coverage transforms, attempt limits, private-key exposure denial and the single start event.

An existing start request for a different form conflicts. The original frozen attempt remains authoritative for a valid retry or a new-device resume, even if its source has since changed; the legacy transaction repeats current access/exposure/status checks. The wrapper never rewrites that snapshot. It is only for new adaptive starts; flat/support callers retain the existing RPC.

## Local proof

Run `node scripts/qa/test-prepared-start-db.mjs`. This refuses any nonempty database and uses only the fixed `/tmp` PostgreSQL socket and `lt_exams_qa_20261015_codex`. It runs all fixed-form, routing and adaptive-runtime SQL baselines, then installs the proposal locally. Synthetic metadata remains local. Separate real PostgreSQL connections use explicit held transactions and observed `pg_stat_activity` lock waits; no timer alone is counted as a concurrency pass.

Ten result groups cover the legacy gap; calibration/definition/version/review edits winning before start; start winning before form/release edits; stale release review rejection; concurrent new/legacy starts without deadlock; exact frozen bytes and single-event retry/resume; foreign actor/source/browser-role denial; audit-failure rollback and changed-form retry; current private-key exposure denial; current uncalibrated/flat rejection. All pass. Fixture objects are removed in finally and the database is verified empty afterward. Evidence: `../reviews/qa-prepared-start-local-2026-10-17.json`.

## Requested authorization and rollout

Approve this additional additive database RPC on the existing shared backend, then wire only the disabled adaptive Preview start path to it. Generate a fresh migration with the CLI; never edit the applied routing migration or historical start functions. Repeat local proof against the final migration; apply once, verify function grants/signature and advisors, then deploy a true Preview with the capability explicitly false and repeat the existing authenticated compatibility checks. Existing flat live callers keep their current RPC.

This does not authorize enabling the capability, advancing the accepted companion alias, pushing main, promoting production, publishing forms, creating approvals/results, recording speech, changing retention or scheduling cleanup. Rollback is to leave the capability off and stop calling the new RPC; retain existing attempts and immutable migration history. Genuine content/calibration, browser/device/reviewer/consented-pilot and other launch acceptance remain required.

The approval request follows the heartbeat's explicit schema freeze and the limited scope of the prior durable-routing exception. It is not a new skill-imposed approval step.
