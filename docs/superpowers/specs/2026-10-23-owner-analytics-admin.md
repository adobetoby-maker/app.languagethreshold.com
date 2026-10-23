# Owner area: Analytics + site and user management

Owner request (2026-10-23, verbatim): "can you create a anylytics page for me in the owner area? i would like to be able to manage the site and users from there."
Owner decisions: build ALL of: disable/re-enable accounts; manage any company's team; better user directory; resend confirmation / fix email. Google Analytics numbers via a service account with Viewer access (server-side GA4 Data API).

## Today (scout 2026-10-23)
- src/routes/owner.tsx: single scrolling page (Accounts, Discounts, KPIs, site usage, P/L ledger, module requests, companies & seats, last 100 owner actions). Server gate: requirePlatformOwner (src/lib/team-server.ts:155) on every owner endpoint; client has no role gate (server is the gate). APIs: /api/platform, /api/owner-users, /api/owner-customers, /api/owner-discounts. All owner POSTs write platform_audit_events via audit().
- GA tag G-RP0TZ1MP7E loads in src/routes/__root.tsx; GA property id 538705307 (account 2089328). No GA Data API code exists.
- Gaps: nothing sets bannedUntil; no cross-org team management (requireTeamAdmin doesn't let the platform owner in); directory = 50/page substring search, no filters/sort/export; audit shows UUIDs and no detail; no resend confirmation / force-confirm / change email or name.

## Build
1. Navigation: owner.tsx becomes tabbed (Overview · Analytics · Users · Companies · Money · Activity) — keep every existing section, just move it under a tab; URL-synced tab (?tab=). Mobile-friendly.
2. Analytics tab:
   - GA (server-side): new /api/owner-analytics (owner-only) calling GA4 Data API runReport for property GA_PROPERTY_ID (env, default none) with a service account from env GA_SERVICE_ACCOUNT_JSON (raw JSON or base64). Sign the JWT with node crypto (RS256) and exchange at https://oauth2.googleapis.com/token, scope https://www.googleapis.com/auth/analytics.readonly — no new heavy dependency. Cache 10 min in memory. Filter every report to hostName = app.languagethreshold.com (env GA_HOSTNAME override) so other sites never mix in.
   - Reports (date range selector 7/30/90 days): active users, new users, sessions, views over time; top pages; traffic sources (sessionDefaultChannelGroup and source/medium); countries; devices; key events counts (sign_up, begin_checkout, purchase, lesson_mastered, team_seat_assigned); realtime active users (runRealtimeReport).
   - When env is missing: a clear "Connect Google Analytics" card with the exact setup steps (no crash).
   - App data (no Google): sign-ups per day (auth.users.created_at), active users 7/30d, time by module, purchases/revenue from the ledger, seats paid vs assigned — reuse existing RPCs where possible.
   - Charts follow the dataviz conventions already in the app (no new chart lib if one exists; check package.json).
3. Users tab (extend OwnerAccounts / api.owner-users):
   - Directory: filters (paid/subscription, active in 30d, free access, disabled, unconfirmed), sort (created, last sign-in, activity), page size 50, CSV export of the current filter (email, name, created, last sign-in, status — owner-only, audited).
   - Actions (owner-only, each audited with detail, each behind an explicit confirm in the UI, idempotent where possible):
     - disable (Supabase auth admin updateUserById ban_duration e.g. "876000h") + sign out everywhere (admin signOut / revoke refresh tokens); re-enable (ban_duration "none").
     - resend confirmation email (auth.resend type signup, or generateLink type signup delivered via existing email path) — only for unconfirmed users.
     - force-confirm email (email_confirm true).
     - change email (admin update email; require typing the new email twice; email_confirm per owner choice) and change display name.
   - Never show or set passwords; password help stays the existing password_invite.
   - Guard: the owner cannot disable or change their own account or another platform owner from this UI.
4. Companies tab (cross-org team management for the platform owner):
   - New owner-only endpoint (e.g. /api/owner-teams) with actions: list members/invites/assignments for an org; change member role (owner/admin/learner — keep at least one owner); remove member; resend/revoke invite; assign module to a member (same validation as api.team assign, incl. certificate-only-for-roofing rule); adjust seats via manual_grant for non-Stripe orgs (existing rule: refuse when stripe_subscription_id exists, show "managed in Stripe" instead); transfer org ownership.
   - Reuse the server logic in api.team.ts where possible (extract shared functions) rather than duplicating; every action audited with organization_id and detail.
5. Activity tab: audit log with actor email (join), action, org name, detail summary, filters (action prefix, org, date), paging beyond 100, CSV export.

## Rules
- Server is the gate: every new endpoint calls requirePlatformOwner first. Inputs validated with zod. Service-role client only server-side.
- No new Supabase migrations unless unavoidable; if one is needed, write it but DO NOT apply it to production (owner applies); the feature must degrade gracefully until then.
- No personal data in GA events or logs. CSV exports are owner-only and audited.
- Keep existing behavior and tests green.

## Owner setup for GA (to tell the owner after build)
1. Google Cloud project "My First Project" (project-91661021-fb2d-4524-b9f): enable "Google Analytics Data API".
2. Use service account workerbee@project-91661021-fb2d-4524-b9f.iam.gserviceaccount.com (or create "lt-analytics-reader"); create a JSON key (owner does this — secret).
3. Analytics → Admin → Property access management → add the service account email as Viewer on property 538705307.
4. Vercel → language-threshold-app → Settings → Environment Variables (Production): GA_PROPERTY_ID=538705307 and GA_SERVICE_ACCOUNT_JSON=<the JSON key contents>. Redeploy.
