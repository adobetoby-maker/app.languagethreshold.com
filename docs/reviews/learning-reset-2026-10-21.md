# Delete learning progress and saved materials

Account Settings gains a red **Delete all progress and start over** button. The user explicitly chose to delete saved materials as well as progress. The dialog identifies the signed-in email, lists the deleted categories, requires typing RESET, and offers Keep my progress. No deletion occurs on opening, typing, canceling, or closing it.

The authenticated database function derives the actor from auth.uid(); callers cannot supply another user ID. It atomically clears learning fields in that user's profile and deletes their private Reader books. Account identity, purchases, billing/access metadata, preferences, other accounts, and official exam/team records remain. An idempotency UUID makes retrying an uncertain response safe for new work created after the original reset.

A reset generation rejects stale profile writes and stale Reader uploads. The updated app replaces a stale profile instead of unioning deleted vocabulary or taking maximum XP. Device cleanup clears only that actor's practice envelopes, Reader cache, unsubmitted drafts, and memory speech captures. Auth tokens, guest/other accounts, unassigned legacy saves and recovery receipts remain. Other browser tabs reload when the reset notice arrives; other devices invalidate their old cache when they restore the new cloud generation. Old-version writers are rejected after a reset; users must update/reload to resume saving.

## Verification

- Local signed-in QA account: red button visible; final action disabled without RESET and enabled after typing it. Keep my progress closes the dialog. Confirmed at 390×844 with no horizontal overflow. The destructive browser action was never clicked.
- Four reset regression tests exercise actor isolation, storage failure, stale device-store callbacks, and the production profile reducer replacing old progress after a new cloud generation.
- Existing conjugation tests still require catalog-only lookups to perform zero storage/network IO. Reset epoch reads are lazy and actor-scoped.
- All 2,172 Node tests pass; type checking, changed-file lint, and stage build pass. Lint has five existing mixed-export warnings and no errors.
- Database acceptance fixture ran against the actual project inside BEGIN/ROLLBACK. It verified auth and confirmation rejection; deletion of synthetic learning/Reader data; preservation of synthetic subscription/purchases/billing metadata; rejection of stale writes/uploads; preservation of new work on retry; and metadata-only patches retaining learning data/reset generation. All test data/schema changes were rolled back. The reset function and new column were confirmed absent afterward.

## Release

Includes the Account/Family/Pricing authentication provider fix from PR #46. Apply migration `20261022013531_learner_learning_reset.sql` before deploying this app code, because Reader writes include the new generation column. Migration is prepared and rollback-tested, **not applied**. The user has requested the button, not an immediate reset of their account. Do not run it on the owner or any real learner as deployment verification.
