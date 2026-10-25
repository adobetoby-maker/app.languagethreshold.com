# Support inbox

Incoming Language Threshold email is retained in the support Worker's existing KV namespace and forwarded to the already-verified owner Gmail destination. The owner dashboard exposes only Language Threshold ticket records through a private server connection. Customers contact `support@languagethreshold.com`; account, checkout-success and pricing link to `/support`.

## Configuration

The app requires Production-only `SUPPORT_INBOX_URL` and secret `SUPPORT_INBOX_TOKEN`. The Worker requires the same token as a secret. Tokens belong in provider secret stores, never source, logs, browser code or notes. Existing deployment configuration supplies the KV binding. The HTTP API is authenticated and preview URLs stay disabled.

Only authenticated platform owners can read tickets, mark status or request a reply through the app API. Replies use the existing sending credential and verified support sender. Incoming Reply-To/From headers determine the human reply address; the SMTP bounce envelope is retained separately. Ambiguous reply headers disable direct replying instead of choosing a recipient.

Language Threshold intake bypasses automatic AI replies. Other brands continue through the unchanged legacy handler. A forwarding failure retains the ticket and raises a fixed diagnostic. Receipt records are independent, so concurrent arrivals do not share a read/modify/write index.

Dashboard previews expire after 90 days, exclude attachments, and cap parsed messages and displayed text. Full messages remain in Gmail. KV visibility can lag, and duplicate inbound deliveries can appear separately. Provider acceptance is not inbox delivery. Reply sending requires a human review step; status resolution is separate. Dashboard-sent replies are not synchronized into Gmail Sent or stored as conversation history.

## Development checks

Run typecheck, changed-file lint, `tests/support-worker.test.mjs`, `tests/owner-support.test.mjs`, and `tests/owner-admin-routes.test.mjs`. Install the pinned parser with `npm ci --prefix support-worker` when testing the Worker. `playwright.support.config.ts` exercises the UI against an isolated local server with synthetic sessions and mocked APIs. No real credentials or messages are required for those tests.

The Worker manifest references the existing shared deployment. Treat its deployment as a separate reviewed operation from Vercel app deployment. Preserve existing provider secrets, other-brand handlers and mail routes. Use a dry run before any approved Worker release.

## Integration

This feature-only source omits private operational evidence, historical-message import tooling, and the one-time rollout-message script. Ordinary builds must not send internal test messages. Review changes against the latest canonical main before publishing. Coordinate any other app release so a deployment from main cannot replace the live support feature with an older version.
