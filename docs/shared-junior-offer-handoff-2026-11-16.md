# Shared Junior and Language Threshold study-guide offer

Review-only source, no live claim, customer, promotion, charge, email or production promotion performed by this work. Public prospective policy is the owner's explicit choice: **seven-day trials for new secure Junior plans**, matching the advertised promise. Existing subscription agreements are unchanged. Old live Junior Payment Links were independently read as trial_period_days PRESENT NULL; that is an existing configuration mismatch, not proof of a new seven-day trial. Their future configuration and the new dynamic trial require coordinated vendor/signed test proof before publication.

## Sources and fixed scope

Central branch `feature/shared-junior-offer-2026-11-16`, worktree `lt-junior-offer-2026-11-16`, based on reviewed LT integration df6a6e2e3. Hosted-history fix f67fe375d is included as equivalent abb7ef1bb. Do not replay the old 20261116071911 filename: actual hosted base is 20261116082427 and privileges follow-on 20261116082703.

The new follow-on is `supabase/migrations/20261116140541_shared_junior_study_offer.sql` (applied by root after independent review). Apply only through root's coordinated shared Supabase history, recording/renaming to an MCP-assigned hosted version if needed. It adds immutable seven-day/deferred mode snapshots, exact Junior plan validation, normal Family session receipts and per-adult checkout leases even after a claim is redeemed. Hosted readback confirmed zero claims, unchanged service-only RPC grants, RLS and no direct journal writes. It does not reset the campaign, customer, code or redemption allowance. Service_role retains SELECT/RPC only, no direct journal mutation.

Verified Junior catalog:

- Monthly price_1TbL3nQjohgWhWidfF6UGvNK, product prod_UaW5IbHKFFx2iu, USD999/month, interval_count1.
- Annual price_1TbWqsQjohgWhWidON8lfVxv, product prod_UaiHU3ys9H8Dvf, USD7900/year, interval_count1.

Runtime validates all six exact plan prices, normal amounts/currency/interval/count, and five active live products (three LT plus two distinct Junior) BEFORE creating the fixed shared base coupon. First creation must include all FIVE products. Coupon applies_to is immutable: if a prior differently scoped coupon unexpectedly exists, the code holds rather than replacing or silently widening it. No live coupon has been created by this agent.

The campaign remains study-guides-10-v1 and base coupon lt_study_guides_10_once_v1, duration once, percent10. Every adult/customer has one customer-restricted promotion with max_redemptions1, across all PDFs and both apps. No invented expiry or second campaign. Normal Family/Junior purchases reuse the authenticated canonical customer but do not mint coupons.

## Trial, pending payment and paid proof

Every public offer Checkout reserves the code, starts the seven-day trial and deliberately attaches no discount to its $0 trial invoice. The signed invoice.created handler applies the promotion only to the first positive regular eligible invoice after that trial, once; later renewals remain normal price. A credit-covered/zero invoice does not consume it. Immutable price/product/amount/customer/session/attempt proof is checked.

Provider times_redeemed alone is NOT a purchase: status is reserved/review until positive paid invoice proof updates the journal to redeemed. An already validated SAME open unpaid Checkout can resume without creating a second session or allowance. Provider-used receipts that are void, uncollectible, zero-due, expired or unconfirmed hold for billing review; no blind replacement. Defensive handling for previously journaled no-trial/direct-mode receipts remains tested, including not waiting for Checkout completion on that historical positive initial invoice. That is not the approved public Junior policy, and new public routes cannot select it.

The central claim URL will be https://app.languagethreshold.com/offer?product=junior (owned URL, NOT yet declared live/verified). Safe product/resource attribution survives login without tokens or arbitrary return URLs. Junior monthly offer price is $8.99 for the first eligible paid month, then $9.99/month; annual $71.10 then $79/year, after the seven-day trial. The page does not require an LT Family subscription for standalone Junior. Claiming a code does not enroll anyone in marketing emails.

## Duplicate-charge and Family boundaries

Exact live Family and Junior product overlaps hold for reviewed account management, not silent upgrade/cancellation:

- Junior offer/normal Junior blocks an active or pending exact Family subscription or Family checkout.
- Family offer/guarded ordinary Family blocks an active or pending Junior subscription/session.
- Individual LT plus standalone Junior remain distinct valid purchases.
- The same shared canonical lease covers session creation/save; a redeemed coupon row still provides that lock for later ordinary purchases. Completing/canceling an old offer does not permanently ban later ordinary Junior resubscription.

`src/lib/resource-family-checkout.ts` supplies the narrow ordinary Family guard. It binds the same customer, journals one deterministic full-price Family session and keeps LT's seven-day trial, without creating a promo. It omits the public manual-promotion input because entering the shared PDF code there could consume it on a $0 trial invoice; reserved PDF offers use the explicit /offer path. Existing non-Family checkout behavior remains unchanged while these flags are off. Held/ambiguous plan changes need a deliberate reviewed upgrade flow, not another charge.

## Deployment prerequisites and flags

Root owns deployment and vendor mutation. Keep all activation flags OFF until source review, schema, permissions and signed/test proof pass.

1. Shared hosted base/privileges are already applied by the provisioning agent. Apply this follow-on once to pollhlkgltdkdskdzsgd, with advisors/grant/RPC checks and recorded actual migration history.
2. Apply the compatible Junior migration from approved candidate 5587b0639003607b27eb56295dec611321e4973a AFTER this follow-on. Its central-offer importer requires seven-day/deferred snapshots; its new profile-only compatibility RPC MUST exist before replacing the old production Junior webhook, even if rollout flags remain off.
3. Deploy reviewed central and Junior code as disabled candidates; do not deploy the old 3ac LT base or old Junior renderer base. The central target is existing language-threshold-app / app.languagethreshold.com; Junior is its existing verified project prj_3XxHM2VuyLYq9InvKNlg4mYtA0hP / juniorlinguist.com.
4. Existing LT endpoint must retain its ID/secret and include invoice.created plus invoice.paid/payment_succeeded. Existing Junior endpoint is EXACT https://juniorlinguist.vercel.app/api/stripe-webhook, we_1TbL5XQjohgWhWid3ZEQoFfV, not a newly invented custom-domain endpoint. Provisioning has added paused/resumed to its existing checkout/subscription event union. Preserve its signing secret and verify actual raw signed delivery.
5. Backend secrets remain existing STRIPE_SECRET_KEY or isolated STRIPE_OWNER_SECRET_KEY, exact webhook secrets, SUPABASE_URL/service role; no keys in browser, PDFs or logs. Verify live key scopes for product/price/customer/subscription reads/search, coupon/promo/customer/Checkout create, invoice discount updates and endpoint reads. Runtime never needs an arbitrary Stripe proxy.
6. Junior config: exact verified price/product IDs above, JUNIOR_TRIAL_DAYS=7. Keep JUNIOR_BILLING_ENABLED=false, JUNIOR_ENTITLEMENTS_ENABLED=false, JUNIOR_RESOURCE_OFFER_READY=false in disabled preview. Historical private-reader activation is a separate migration: existing legitimate identities AND lifecycle must be reconciled first. Flags-off profile compatibility remains non-authoritative but operational; new authenticated and central-offer receipts never fall back to legacy on failure.
7. Central activation requires RESOURCE_OFFER_ENABLED, RESOURCE_OFFER_JUNIOR_ENABLED and RESOURCE_OFFER_FAMILY_GUARDS_ENABLED. Junior offers cannot bypass missing Family guards: ordinary Family checkout holds if Junior is enabled without its reviewed guard. Optional new-offer fulfillment can work while strict Junior-reader migration stays off because verified receipts are privately recorded and safely projected to legacy JL status. Do not claim this fixes all historic profile authorization.
8. Verify the owner-approved seven-day trial, first positive invoice discount, failed-payment/replay handling and full-price renewal in the existing Stripe account test environment. No live charge/customer-email fixture and no separate claimable Stripe account. Known external customer.created listeners make live fixtures unsafe without specific audit/authorization.
9. Only after authoritative deployed proof may root emit verified:true / claimFlowVerified:true / mode:live for PDF QR publication. Current readiness remains false; no working coupon claims are promised by a draft manifest.

## Verification completed locally

- Full repository npm test: 3011 pass, zero failures.
- Focused monetary/auth/discount/product tests:46 pass, including owner-approved Junior7, zero invoices, first positive bill once, legacy direct-mode pending/resume, out-of-order paid receipts, credits/void ambiguity, cross-app/Family overlap and normal Family no-coupon isolation.
- Full TypeScript passes; lint passes with only the intentionally ignored generated-route warning.
- Vite client/server build passes. No production deployment performed.
- Fresh local PostgreSQL16 applied shared base + privilege + this follow-on + compatible Junior SQL, then rolled back synthetic assertions. Exact Junior catalog, trial mode, cross-app redeemed lease, normal Family isolation, service-only authority, atomic profile/consent preservation and legacy compatibility passed. The shared follow-on is now hosted as20261116140541; Junior schema and disabled application staging remain coordinated root work.
- Actual anonymous /offer?product=junior rendered at1280 and390 with approved seven-day terms, no runtime errors or horizontal overflow. Flag-off API returns enabled:false. No signup, claim, provider mutation or email was performed.

Remaining product gaps are explicit: protected historical reader/lifecycle backfill, reviewed upgrades/discount transfer to existing trials, robust invoice-hook monitoring, trusted cross-domain sign-in handoff, and purchase-brand allowlists/CRM progression for actual positive Junior payments. Trial/discount redemption is never reported as a paid conversion.
