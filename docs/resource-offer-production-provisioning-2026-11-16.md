# Resource offer provisioning checkpoint

Coupon source is integrated on actual production `d2399b9aab931d73c8d16ded8f3a35c1940915a4`, preserving the newer French/Japanese work. Runtime source `df6a6e2e391c296cf99725198d2bef95848968d1` includes reviewed coupon commits `70c34ef51`, `d9d194005` and personal-product entitlement isolation `b858915ae`.

The production-target stage `dpl_4mNNTqr9NFGADzYFz3pu81xXyrMS`, https://language-threshold-6g3w6ja1l-adobetoby-5572s-projects.vercel.app, is READY with no aliases. `RESOURCE_OFFER_ENABLED=false`. Observed checks: rendered offer 200, API 200 with enabled:false, app home 200, unsigned Stripe webhook POST 400. It has not been promoted. Check the latest primary alias source before any promotion; other content work is active.

Required app checks passed: 3,000 tests, TypeScript, lint, full production build and Vercel artifact verification. Existing required high-severity audit passes with one moderate Seroval advisory. No dependency updates were made. Build-generated date files were restored after artifact creation; no unrelated source changes are included.

## Applied hosted migrations

Supabase `pollhlkgltdkdskdzsgd` assigned its actual history version `20261116082427` to the reviewed `resource_study_offer` SQL. Its canonical local file was renamed from `20261116071911_resource_study_offer.sql` to `20261116082427_resource_study_offer.sql` without changing SQL bytes. SHA256: `e9d648ba5d9f58d12b581630647c25b914f484851e448c2a8aa926faf1edf6f7`. Do not replay the old-version file.

The host's default privileges also granted service_role direct writes. Approved separate follow-up `20261116082703_resource_offer_service_table_privileges.sql` revoked all service_role table privileges and regranted SELECT only. Historical applied SQL bytes remain unchanged.

Observed after hardening: RLS enabled; anonymous/authenticated SELECT false; service_role SELECT true; direct INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER false; service_role reserve/checkpoint RPC EXECUTE true; anonymous/authenticated RPC EXECUTE false; SECURITY DEFINER and empty search_path retained. Reserve checks confirmed adult identity and both synthetic child email domains. Six pre-existing security advisory classes remain; no new class was introduced.

## Provider and claim gates

Separate dedicated-HMAC `resource-offer-setup` is deployed; its key is in Infisical ATLAS prod `/myaimarketing`, never the browser. Normalized live proof lives at `/Users/drive/Downloads/MY ai marketing/learning-products-2026-11-16/coupons/provisioning/`.

The four fixed LT prices resolve to three active live products. The unique **enabled live** LT app webhook is `we_1TbYLQQjohgWhWidO2TbmNcJ`; the historical disabled exact-URL endpoint `we_1TbKwVQjohgWhWidRa7rmFs2` is untouched. Do not rotate signing secrets or replace endpoints. At initial inspection the active endpoint lacked invoice.created/invoice.paid; keep any later provisioning receipt with this checkpoint.

Exact owned Junior Payment Links resolve to USD 999/month (`price_1TbL3nQjohgWhWidfF6UGvNK`, `prod_UaW5IbHKFFx2iu`) and USD 7900/year (`price_1TbWqsQjohgWhWidON8lfVxv`, `prod_UaiHU3ys9H8Dvf`). Both links have subscription_data.trial_period_days present with value null. The advertised seven-day Junior trial is not an observed existing provider setting. The shared coupon's final five-product scope and Junior terms/code must be coordinated before the first claim: coupon applies_to is immutable.

No fixture account, customer, coupon, promotion, Checkout, subscription, invoice, charge or email has been created by this provisioning checkpoint. The coupon flag remains false. The base journal is ready for the separate reviewed Junior plan extension; do not silently add plan names to the already-applied migration.

No existing test-mode credential was found in Infisical prod `/myaimarketing`; Supabase secret metadata lists only STRIPE_SECRET_KEY and its live mode is verified. Existing Stripe MCP connections require reauthentication. Actual trial → first-positive discounted invoice → full renewal proof remains pending authorized existing-account test access. Mocks and catalog reads do not prove a completed billing lifecycle.
