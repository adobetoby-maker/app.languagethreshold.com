# Lesson corrections

Every Foundation, Core and Master lesson using the shared lesson view includes a collapsed “Suggest a correction” form. Course, lesson number/title and language pair are attached automatically. Signed-in learners submit to `/api/lesson-correction`; guests compose an email to `support@languagethreshold.com` with the same context. Guest email composition does not display a sent confirmation.

Authenticated submissions are validated server-side and retained as `lesson.correction_submitted` events in the existing private `platform_audit_events` table before an email notification is attempted. They can be inspected in owner Activity if email sending fails. Successful notifications go to the existing support address and therefore enter its normal support inbox workflow; Reply-To is the authenticated learner's email. Provider acceptance is required for the UI's sent confirmation, but does not itself prove inbox delivery. No automatic correction or customer reply occurs.

A per-account recent-submission check limits ordinary repeated submissions to once per minute. This is not an atomic distributed quota. Identical retries use the email provider's idempotency key. Suggestions are bounded to 3,000 characters. No schema migration or new email credential is needed. Production needs the existing RESEND_API_KEY and support mail routing.

Verification: `node --test tests/lesson-correction.test.mjs`, typecheck, lint, mobile guest context/email composition, and signed-in success/error browser checks using synthetic sessions and mocked submissions. Do not send synthetic correction emails to the real inbox as part of automated testing.
