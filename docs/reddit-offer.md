# Reddit free month and feedback

Prepared code: **REDDITMONTH**. Entry: `/reddit`; product feedback: `/feedback`.
**Redemption deadline: December 1, 2026, 11:59 p.m. America/Denver (MST).** New grants
close at December 2 07:00 UTC. Existing claims still receive their full month.

One calendar month starts on the first successful authenticated claim after email confirmation.
No Stripe checkout, card, payment, renewal, paid-plan cancellation, or email sending is introduced.
Repeating a claim never extends access or changes the original consent. Feedback permission can
be updated independently on `/reddit`, including withdrawing it. General marketing is not opted in.

## Owner workflow

Owner → Email & contacts → Reddit coupon users lists the cohort, expiry and current feedback-email
permission. The opt-in filter is selected initially; pagination scans 50 coupon accounts per page.
Use the existing **Users → Customer email** tools to prepare and deliberately send feedback requests
to opted-in accounts. Recheck permission before sending; existing unsubscribe/suppression rules apply.
No feedback campaign has been sent or scheduled by this feature.

Thoughtful, specific feedback qualifies for **two additional free months** after owner review;
positive feedback is not required. Use **Review for two-month reward → Confirm two-month reward**
on a feedback item. The server verifies the writer is a coupon user, locks their redemption and
records one reward per account. Repeating approval cannot add more time. The extension starts
after the later of their current expiry and approval time, so it never shortens remaining access.
Paid billing is not altered. Use **Review emailed feedback for reward** on a coupon user to record a short review summary
and approve feedback received by email. This shares the same one-reward-per-account protection
as site feedback, so approving both cannot give duplicate months. Emailed feedback can also be
saved without granting a reward. Each coupon row shows its redemption date, feedback count, latest
feedback date and reward status; the feedback inbox identifies site versus email submissions.

Suggested feedback request draft:

Subject: How is your free month going?

Thanks for trying Language Threshold through Reddit. What has helped you learn, and what has been
confusing or frustrating? Thoughtful, specific feedback can qualify for two additional free months
after review; it does not need to be positive. You can reply to this email or share feedback at
https://app.languagethreshold.com/feedback.

If you no longer want feedback requests, change your preference at
https://app.languagethreshold.com/reddit. Existing customer email tools add the required footer.

## Data and access

`20261103010000_reddit_feedback_campaign.sql` adds service-only RLS tables for redemptions and
product feedback, four tightly scoped service-only RPCs and a private auth trigger. Signup and changed
account emails are mirrored into the existing owner CRM; existing manual contacts with the same
email are linked without overwriting notes. A redemption also ensures an existing account is in CRM.
No historical contact backfill is performed. Every new account is captured going forward; coupon
membership and feedback permission live in structured redemption fields rather than editable notes.

The claim and feedback endpoints authenticate the current server-side identity, reject cross-origin
writes, and validate bounded bodies. Client-supplied user IDs are rejected. Claim and feedback writes
are atomic/idempotent. Feedback is limited to six new submissions per account per hour. Only owners
can read the feedback/cohort API. Free access is checked separately from paid/team plans, expires
without a scheduled job, and never shortens existing access. Existing public demo behavior is preserved;
expiration ends the promotional entitlement, not any independently available public demo content.

## Rollout

Apply the additive database migration before deploying this branch. The existing owner CRM migration
must already be installed. Never advertise the URL/code as active until live redemption, CRM sync,
consent withdrawal, feedback intake and expiry checks have been verified. Review auth-trigger changes
carefully because auth signup depends on CRM storage availability. No production migration or deploy
is performed merely by running local tests or creating the PR.

## Local database verification (synthetic only)

Use an isolated temporary PostgreSQL cluster with an `auth.users(id uuid primary key,email text)`
fixture and roles `anon`, `authenticated`, `service_role bypassrls`. Apply the existing
`20261025141031_owner_email_crm.sql`, then this migration, then `tests/db/reddit-offer.sql` with
`psql -v ON_ERROR_STOP=1`. Assertions run in a transaction and roll back. They cover signup/email sync,
manual-contact deduplication, one-month expiry, repeat claims, explicit consent, denied browser access
and feedback retry deduplication. No real accounts, messages or Stripe requests are used.

## Verification evidence

- 2,847 repository tests passed, including code/expiry validation, current-identity authorization,
  email-permission withdrawal, owner-only approval and emailed/site reward requests.
- PostgreSQL 16 synthetic migration/assertion suite passed: signup/email sync, CRM deduplication,
  one-month grant, repeat claims, denied browser privileges, feedback retry deduplication, two-month
  extension preserving remaining time and reward replay across emailed/site feedback.
- Chrome at 390px and 1280px: guest landing, claim, explicit opt-in, withdrawal and feedback
  submission passed with intercepted synthetic API data. Reproduce with
  `node scripts/qa/reddit-offer-ui.mjs` against its isolated local server port.
- TypeScript, lint (no errors) and Vite production-bundle compilation in development mode passed.
- No production migration, live claim, paid billing change, email send, or deployment was performed.
