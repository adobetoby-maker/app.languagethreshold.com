# Owner dashboard

Open https://app.languagethreshold.com/owner and sign in with the registered platform owner account. Ordinary learners and support accounts cannot access the directory or mutations.

## Users and usage

Search by name or email. The directory includes registered accounts that have never signed in and pages through all matches, 50 at a time. Select an account for creation and last-sign-in dates, email-confirmation state, personal subscription status, team access, complimentary access, invitation status and recorded practice by module/activity.

Practice reports cover the last 30 days, count UTC active days, and use the site-wide activity intervals once per user. They do not add duplicated team intervals. Unsynced/offline device activity can be absent. Recorded time is not a proficiency score or proof of lesson completion. Private conversations, answers, passwords, tokens and full profile JSON are not exposed.

## Add a tester

Choose **Add tester**, enter the name and email, free-access end date and reason, then create the account. No password is chosen by the owner and no email is sent at this step. Existing accounts are preserved; search for them instead.

Select the new account, verify the destination email, then choose **Send password invitation** or **Create private password link**. The recipient follows the private, expiring link to create their own password at `/account/password`. A one-minute recipient cooldown also applies across tabs and new request IDs.

Direct sending requires the server's `RESEND_API_KEY` and verified `TEAM_FROM_EMAIL`. When unavailable, the dashboard states this and offers a private link plus **Open email draft**, which opens the operator's email client. Review and send that draft yourself. Link creation alone does not send an email. Private links live only in the current component's memory; they are not stored in the database, audit, browser storage or exports.

A provider timeout is an unconfirmed outcome, not proof that no message was sent. The selected account shows its latest invitation state after refresh. Check with the recipient before sending again. Provider acceptance does not prove inbox delivery.

## Free access

Select an account and set **Free through** plus a reason. This sets an explicit end date, up to five years in the future. It uses one isolated complimentary learner seat and reuses that seat on subsequent grants. It creates no payment, card requirement or automatic renewal. It does not cancel or change any paid personal or team subscription; manage paid billing in Stripe. A failed multi-step tester creation can leave an account without a grant: the UI says so and directs the owner to grant access separately.

## Discount codes

Create a percentage or USD discount, choose **First invoice only** or **Every renewal**, set a redemption limit and a code expiry within one year, then review the confirmation before creating it. Share the code with customers to enter at subscription checkout. Codes are bearer offers: anyone who has the code may redeem it up to the specified limit.

The code's expiry stops new redemptions. A recurring discount already redeemed remains attached to the subscription. **Disable future redemptions** prevents new use without changing existing discounted subscriptions or invoices. This dashboard manages its own tagged codes; use Stripe to manage codes created elsewhere. Retrying an unchanged creation request reuses its coupon and code instead of creating duplicates.

Individual monthly/annual/family checkout and team subscription checkout allow promotion codes. The existing individual payment links, including Junior, also have promotion-code entry enabled. Creating a code does not create a charge. No live QA coupon or subscription is created by the regression suite.

## Operations and verification

Account reads and writes use owner-verified, no-store server APIs. New directory/grant RPCs and tables deny browser roles; directory projection of Auth accounts is service-only with a fixed search path and explicit execute revocations. Grants and owner actions are audited without password links. Request bodies, service-response sizes and transport waits are bounded. The UI cancels stale reads and hides owner data during identity changes or pending sign-out.

Local SQL verification: `/opt/homebrew/opt/postgresql@16/bin/psql -h /tmp -d lt_exams_qa_20261015_codex -f tests/sql/owner-user-management.sql`. This fixture rolls back its entire transaction. Hosted disposable verification checks real account creation, invite verification, free access and expiry, and removes the QA account/grant. Responsive fixture checks do not represent physical iPhone/Safari acceptance or real email delivery.
