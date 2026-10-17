# Speaking lifecycle audit — October 16

Codex inspected the current upload, retry, memory-draft, private playback, independent scoring and deletion code. This is a code audit with synthetic/local regression evidence, not a human content review, calibration decision or real-device production pilot.

## Findings resolved

1. An upload reservation expires after ten minutes. The server previously returned that as a generic 400 while the client retained and retried the same request ID. It now returns a recoverable 409; the client offers to load current saved state/policy, clears the old request metadata, obtains explicit consent again and retains the original local Blob. A local UI trial reproduced expiry, preserved the take and completed the next upload with a fresh request ID. A unit test covers the server status mapping.
2. A lost response can mean an upload reached the server even though the local take remains unsynced. Discarding that local take previously showed a generic discarded message without reloading the saved copy. Discard now checks authoritative saved state and explains that a synced recording stays attached and must be withdrawn separately. The local trial simulated accepted upload/lost response, discarded local audio, reloaded the saved revision and retained visible playback/withdrawal controls.
3. Cleanup previously returned a selected/deleted count even when some rows failed, without an explicit failed/backlog indicator. The shared worker and operator command now report failures and possible remaining full batches; the command returns nonzero for either. A storage-delete failure keeps its hidden tombstone; failure after byte removal but before database finalization also remains retryable. Regression tests prove both ordering cases and full-batch signaling.

## Operator entrypoint

`npm run assessment:speech-cleanup` is read-only. `-- --execute` processes approved enabled policies only, up to ten batches of 25, with bounded request and overall deadlines. Its service credentials remain in process memory; output contains counts only. The same worker is used by the server-only wrapper and the CLI, so the executable path does not duplicate deletion logic or depend on a test bundler.

The actual hosted dry-run and execution against the empty disabled queue selected/deleted zero rows. Collection and cleanup remain off; no human approval or raw learner audio was created. See `qa-speech-operator-2026-10-16.json` and `docs/assessments/speech-operations.md`.

## Remaining release evidence

A scheduler has not been installed. The operator host, daily schedule, notification owner, most recent successful UTC run and actual failure/recovery evidence must be recorded before collection is enabled. The owner must decide the retention period and approve the exact notice. A consented real-device capture/playback/cleanup pilot and qualified content/rubric reviews remain required. Existing private forms remain draft and uncalibrated.
