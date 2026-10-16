# Speech evidence operations — ready for owner review, inactive

Collection and cleanup are OFF. This document and the operator command do not approve a policy, enable recording, install a schedule, publish exams or grant reviewer access. The owner has not accepted the PRD's proposed retention period. Actual forms remain private drafts.

## Reviewable proposed policy

The proposed default is to delete raw exam voice evidence 30 days after final scoring or resolution of a dispute, whichever is later. An unresolved review postpones expiry. A learner may withdraw access sooner; playback is blocked immediately and bytes are queued for deletion. Uploading a replacement withdraws the earlier recording. Unfinished uploads older than a day and orphaned account/plan objects are eligible for cleanup under an approved, enabled policy. Scores and audit records have their own retention rules; deleting raw voice does not manufacture or rewrite a result.

The notice must identify the actual retention period and who can listen: authorized reviewers of the named team plan, or an independent reviewer of the one personal attempt explicitly shared by the learner. Recording requires a separate learner consent and microphone action. No AI transcription is requested. An approved notice, retention period and approval identity cannot be edited in place; policy changes require a new version. Collection also requires cleanup enabled.

This proposal awaits the owner’s retention decision. The corresponding requirement is in `docs/prd-assessments.md`, Privacy and retention.

## Operator command

Run from this repository on the configured operator host, with Node 22 and its existing authenticated Supabase CLI. It targets only `pollhlkgltdkdskdzsgd`; no alternate project argument is accepted. Existing service credentials are held in process memory and never printed or written to a key file.

```sh
npm run assessment:speech-cleanup
npm run assessment:speech-cleanup -- --execute
```

The default is a read-only report of enabled cleanup policies and the count of tracked, undeleted records. That count is **not** a claim that all tracked records are due for deletion. It does not claim rows, touch storage or change policy. `--execute` uses the database's authoritative eligibility selector, then removes objects from the exact private speech bucket and records deletion. It cannot enable any policy. With policies disabled it selects zero rows.

Each execution records a private operational run before selecting work, acquires an exclusive expiring lease and processes up to ten batches of 25. A full final batch reports `mayHaveMore`; run again rather than treating a capped batch as a cleared queue. Each request has a 20-second timeout and the whole command a ten-minute deadline. Output contains UTC run time, target project, policy/queue counts, batches, selected/deleted/failed counts and possible backlog. It contains no learner identity, transcript, private object path or question content.

Exit zero means the selected work finished and the bounded run saw no further full batch. A nonzero exit signals a storage/API/finalization failure or possible remaining backlog. A transport failure can stop before the final report; do not infer deletion counts from a failed run. Deleting rows remain hidden and retryable. Object removal is idempotent, so a retry can finish a row whose bytes were removed but whose database finalization failed. Never clear or mark a tombstone deleted by hand to silence a failure.

## Activation and monitoring plan

Before activating collection, the real owner must choose the retention period and approve the exact notice; the operator must demonstrate private storage, cleanup credentials and a working schedule; and the consented real-device pilot/content review gates must pass. Do not substitute synthetic fixtures for any of those approvals.

The implemented Vercel adapter can emit a daily 00:15 UTC schedule for `GET /api/exam-cleanup`. It is OFF by default. Production activation requires all three build/runtime settings: `LT_ASSESSMENT_CLEANUP_SCHEDULE=enabled`, `LT_ASSESSMENT_CLEANUP_EXECUTION=enabled`, and a `CRON_SECRET` of at least 32 bytes. Configure the secret through the protected environment workflow; never put it in Git, command arguments or a URL. Vercel sends it as a Bearer header. Missing/incorrect authorization is rejected before constructing a database client. Runtime execution also stays disabled unless explicitly enabled, independently of the emitted schedule.

`npm run deploy:stage` now creates a true Preview deployment. Its build wrapper disables cron output, and the adapter refuses scheduled output in Preview context. Production schedules activate only on production deployments; inspect the actual installed platform schedule after rollout. See [Build Output configuration](https://vercel.com/docs/build-output-api/configuration), [cron authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs) and [production activation](https://vercel.com/docs/cron-jobs/quickstart).

No schedule, cron secret or notification destination has been activated. The operator must route failures or missing daily runs to established operational alerting. A manual run is not evidence that a daily schedule exists.

The platform-owner Reviewer Administration page now shows safe run history and operational health, with refresh only. Its API is `/api/exam-cleanup?view=status`; ordinary team admins and learners cannot access it. Run history contains source, status, timestamps, counts and bounded failure codes, without learner identities, object paths or question content. A scheduled-endpoint run older than 26 hours reports overdue; manual runs do not hide that state. An endpoint invocation still does not prove an installed schedule. A lease prevents overlapping work; expired leases become failed records. Storage/finalization failures and capped backlog remain visible and retryable.

Scheduled requests use an eight-second per-request timeout and a thirty-second work deadline, with a separate bounded audit client so a work timeout can still be recorded. They return 202 when another run holds the lease, 503 for failures or possible backlog, and 200 only for completed bounded work.

Record the actual host, schedule, notification owner, most recent successful UTC run and a failure/recovery trial in the release checklist before enabling recording. Review nonzero exits promptly, rerun capped batches, and investigate undeleted records that remain beyond the expected retention deadline. Withdrawal/replacement rows and incomplete uploads also need regular runs; they must not wait for a learner to return to the app.

To stop new collection, disable `collection_enabled` while keeping approved cleanup running for existing evidence. Disabling cleanup is a separate operational decision that can delay promised deletion. Do not publish an enabled recording feature with cleanup indefinitely paused. Recheck policy state and actual queue/storage evidence after any failure or rollback.

## Evidence and limits

Both the hosted dry-run and an execution against the empty, disabled queue succeeded with zero selected/deleted rows and zero enabled policies. No learner audio was collected or deleted. Unit tests exercise storage failure, finalization failure after object removal and capped-batch signaling. Local SQL fixtures (fully rolled back) exercise the eligibility rules, active disputes, resolution restarting the clock, withdrawal and replacement. Local component trials exercise expired-request recovery and discarding a local take after a simulated accepted upload/lost response.

The hosted history currently records one successful operator execution against an empty disabled queue, and zero scheduled executions. Owner-only status access is covered by controller tests; genuine owner browser acceptance on the new Preview is pending because Google login returns to the live origin. Actual production deletion of consented learner evidence, an installed schedule, real-device capture/encoding and the owner's approval remain pending. Private media test files are synthetic and never become official exam or certificate evidence.
