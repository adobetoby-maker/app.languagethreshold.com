# Cleaning staff access

Code: `CLEANING2MONTHS`. Claim page: `/staff`.

The owner adds each eligible email under Owner → Email & contacts → Cleaning staff.
The recipient creates and confirms an account with that email, then enters the code
on `/staff`. Two calendar months begin on the first claim. No card, Stripe subscription,
renewal, or outgoing email is created. Repeat claims do not extend the expiry.

Each recipient has a separate $10 estimated paid AI/audio allowance across the two
months. This does not consume a Reddit tester place or the Reddit $1,000 allowance.
Reservations are conservative and atomic, retain uncertain failed-call charges,
and never reset on another claim. Verified paid subscriptions retain normal access.
Saved lessons, recordings and device voices are not charged against this allowance.

The email allowlist and balances are service-only with RLS. Owner changes are audited.
The claim RPC reads the actual confirmed auth email using a restricted private helper;
the browser cannot choose a recipient user ID or email. Expired and deleted-account
claims cannot be recycled. Access uses the existing complimentary personal-seat grant
without changing existing paid subscriptions or shortening a longer manual grant.

Owner additions are retry-safe and create a CRM contact if needed. Existing contact
notes are preserved; the existing signup trigger links pending contacts when they join.
No marketing or feedback-email permission is inferred from staff eligibility.

Validation: `tests/db/staff-coupon.sql` against the isolated synthetic fixture,
`tests/staff-offer.test.mjs`, `tests/campaign-budget.test.mjs`, and
`scripts/qa/staff-coupon-ui.mjs` (local server on port 3456; mocked accounts only).
