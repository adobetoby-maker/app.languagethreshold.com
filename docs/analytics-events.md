# Google Analytics 4 key events

Property tag: `G-RP0TZ1MP7E` (loaded in `src/routes/__root.tsx`). Every event is sent through
`trackEvent()` in `src/lib/ga-events.ts`. Nothing else in the app calls `gtag` directly.

## Privacy rules (enforced in `trackEvent`)

GA never loads on a private page. `trackEvent` recomputes private or public from the current URL on
every call, and decides like this:

| Situation | Result |
|---|---|
| Speaking privacy mode is on | Dropped. |
| Private page and the event qualifies for deferral (see below) | Deferred: stored in `sessionStorage`, not sent. |
| Any other event on a private page | Dropped. This includes every exam, assessment, owner, account, certificate and family-setup page, whatever the event name. |
| Public page, `ga-disable-G-RP0TZ1MP7E` is `true` | Dropped. |
| Public page, GA active | Pending deferred events are flushed first, then the event is sent. GA is loaded first if client-side navigation left `window.gtag` missing. |

Only the seven events below are ever sent, and each carries only its own allowlisted parameters
(`EVENT_PARAMS` in `src/lib/ga-events.ts`). An event name that is not listed is refused, and any
other parameter key is dropped when sending and again when a deferred event is stored or read back.
A string value is also dropped if it contains `@`, is empty or is longer than 100 characters, and a
number must be finite.

| Event | Allowed parameters |
|---|---|
| `purchase` | `transaction_id`, `currency`, `value` |
| `begin_checkout` | `plan`, `term`, `seats`, `currency`, `value` |
| `sign_up`, `login` | `method` |
| `lesson_mastered` | `module_id`, `lesson` |
| `team_seat_assigned` | `module_id` |
| `team_invite_sent` | `role`, `count` |

Never add emails, user ids, member ids, organization ids, names or free text to an event. To send a
new parameter, add it to the allowlist for that event and to this table.

Private pages are recognised the way the router matches routes: percent-escapes are decoded and the
path is case-folded before it is compared, so `/Team`, `/OWNER`, `/Subscribe/success` and `/te%61m`
are all private. Query keys are compared without case, and a malformed escape counts as private.

`onceKey` (third argument) sends an event at most once per browser session for that key. It is used
by `purchase` (one per Stripe session id), `lesson_mastered` (one per module and lesson), and the
Google `sign_up` and `login` (one per user). It is stored in `sessionStorage` (with an in-memory fallback) and is recorded only after a send succeeds.
Every event also carries `transport_type: "beacon"` so it survives a page redirect.

## Deferred events

An event raised on a private page waits in `sessionStorage` under `lt.ga.pending.v1`, as
`{ name, params, ts, key? }`, and is sent by `flushPendingEvents()` on a later public page. Deferral
is deliberately narrow. An event is deferred only when all of these hold:

1. The name is on the allowlist: `purchase`, `begin_checkout`, `team_seat_assigned`,
   `team_invite_sent`, `sign_up`, `login`. Any other name is dropped.
2. The current URL is one of three explicit routes (`deferralRoute()` in `src/lib/ga-events.ts`),
   and the name is one that route may raise:

   | Route | Matches | Events |
   |---|---|---|
   | `team` | `/team` (a team checkout return carries `org`, `checkout`, `session_id`) | `purchase`, `begin_checkout`, `team_seat_assigned`, `team_invite_sent` |
   | `subscribe` | `/subscribe/success` | `purchase` |
   | `auth-return` | `/` carrying `code` or a token in the hash (the sign-in redirect back) | `sign_up`, `login` |

3. The URL carries none of `attempt`, `plan`, `fromPlan`, `enrollment`, `email`, and no `tab=exams`.
   `/team` and `/subscribe/success` also refuse `token`, `access_token`, `refresh_token` and `code`;
   the auth return also refuses `org`.
4. No `[data-private-assessment]` element is mounted.

Exam and assessment pages never defer anything: `/exams`, `/exam-content`, `/exam-reviewers`,
`/?tab=exams`, `/team/accept`, `/owner`, `/account`, `/certificate`, `/family-setup`, and any page
with the parameters in rule 3 are dropped outright, even for an allowlisted event name.

Storage and flush rules:

- Limits: at most 10 events (oldest dropped first) and 30 minutes. Older entries are discarded
  whenever the queue is read.
- Filtering: parameters pass the same filter when stored and again when read back, and a stored
  entry whose name is not on the allowlist is ignored, so a tampered queue cannot push other data
  to GA. `transaction_id` is the Stripe Checkout session id, an order reference.
- Flush: `flushPendingEvents()` runs in the root layout effect on every page load and route change
  (`src/routes/__root.tsx`) and before any event is sent from a public page. It sends nothing while
  `ga-disable-G-RP0TZ1MP7E` is `true`, speaking privacy mode is on, or the page is private. The
  queue is cleared before sending.
- Loading GA after client-side navigation: GA is only loaded by the server-rendered page, so a
  learner who lands on `/subscribe/success` and clicks through to `/` has no `gtag`. When a public
  page is reached with events waiting and no `gtag`, `ensureGaLoaded()` loads GA the way the root
  snippet does (`anonymize_ip`, `page_location` without query or hash, the same gtag.js URL), then the queue flushes.
  Two settings differ from the root snippet because the loader runs after an in-app navigation:
  `send_page_view: false` (the loader reports no page view of its own) and `page_referrer` is sent
  only when the referrer is the app's own origin (origin plus path), otherwise it is blank. A Stripe
  checkout page or any other site is never reported as a referrer. It never runs on a private page,
  in speaking privacy mode or while the tag is disabled. If the loader script is already in the
  page it is not added twice.
- Stale flag: the root layout rewrites the disable flag in an effect that runs after child effects,
  so right after a navigation the flag can still describe the previous page. When the URL has changed
  since the flag was last seen, `trackEvent` and `flushPendingEvents` recompute it from the current URL,
  as the root layout does. On the same page the flag is trusted, so setting it still disables GA.
- Dedupe: an event with a `onceKey` (see above) is
  refused when queued if that key was already sent or is already queued, and refused again at flush
  time if the key was sent in between.
- If `sessionStorage` is blocked, private-page events are dropped.
- A Google sign-up or login that returns to `/team` (or any route other than `/` with a `code` or
  token) is dropped by design: only the `/` return may defer `sign_up` and `login`.

### Page views and Enhanced measurement

gtag has no client-side switch for the "Page changes based on browser history events" page views;
that is a Data stream setting. The injected loader sets `send_page_view: false` so it never sends
its own page view, but history-change page views come from GA Admin. To keep private URLs out of
them, turn that option off: Admin, Data streams, the web stream, Enhanced measurement, Page views,
Advanced settings, clear "Page changes based on browser history events". The root layout also sets
`ga-disable-G-RP0TZ1MP7E` on every private page, which stops hits there, but a history-change page
view can be recorded in the instant before the flag is rewritten, so the stream setting is the
reliable control.

## Events

| Event | Parameters | Fires from | When |
|---|---|---|---|
| `sign_up` | `method: "email"` | `src/components/auth/AuthModal.tsx` | Email sign-up returned no error (including when email confirmation is still pending). |
| `sign_up` or `login` | `method: "google"` | `src/state/auth-state.tsx` (`trackGoogleAuth`) | `SIGNED_IN` after the Google redirect, only when this page load is that redirect (it carries `code` or a token) and the Google marker was set by `signInWithGoogle`. Email sign-in and sign-up clear the marker, and so does any page load that is not a provider return. `sign_up` when the account is under 2 minutes old, otherwise `login`. Once per session per user. Deferred while the return URL still carries `code` or a token; dropped if the return lands on `/team` or anywhere else. |
| `begin_checkout` | `plan` (`monthly`, `annual`, `family`, `junior`), `currency: "USD"` | `src/routes/pricing.tsx` (`startCheckout`) | The checkout API returned a URL, or the payment-link fallback is used, just before the redirect. Not on the button press alone. |
| `begin_checkout` | `plan: "team"`, `term`, `seats`, `currency: "USD"`, `value` | `src/routes/team.tsx` (`billing()`) | The checkout API returned a Stripe URL, just before the redirect. `value` is the first-period price in USD. Deferred (private page). |
| `purchase` | `transaction_id` (Stripe Checkout session id), `currency: "USD"` | `src/routes/subscribe/success.tsx` | The individual success page asks `GET /api/verify-checkout?sessionId=...` (signed in, server-side Stripe) and the answer is `{ paid: true }`. Nothing is sent when signed out, unpaid or on error. Once per session id. Deferred (private page). |
| `purchase` | `transaction_id`, `currency: "USD"` | `src/routes/team.tsx` (checkout return) | The team billing check reports `active` or `trialing`. Once per session id. Deferred (private page). |
| `lesson_mastered` | `module_id`, `lesson` | `src/components/guide/AppGuide.tsx` (`finishLesson`) | Right after `CORE30_SET_MASTERED` is dispatched. Once per module and lesson per session (`onceKey`). |
| `team_seat_assigned` | `module_id` | `src/routes/team.tsx` (`OwnedAssignModule.save`) | The assign request was acknowledged by the server. Deferred (private page). |
| `team_invite_sent` | `role` (`learner` or `admin`) | `src/routes/team.tsx` (invite form) | The invite request succeeded, and once per CSV bulk import with `count` set to the invitations created (no names or emails). Deferred (private page). |

### Individual purchase verification

The individual `purchase` is counted only after the server confirms the Stripe Checkout session.
`src/routes/api.verify-checkout.ts` (`GET /api/verify-checkout?sessionId=cs_...`) needs the
signed-in learner's bearer token, retrieves the session from Stripe on the server, and returns
`{ "paid": true }` only when the session is a completed subscription whose `client_reference_id` is
that learner (the value `/api/create-checkout` sets) and whose payment status is `paid` or
`no_payment_required` (a 7-day trial). Any other case returns `{ "paid": false }`. It returns no
amounts, emails or ids. The team `purchase` already relies on the server-checked
`/api/team-billing` status, so it needed no new endpoint.

## One-time setup in GA Admin

Events only count as conversions once they are marked as key events. In Google Analytics go to
Admin, then Events, find each event after it has been received at least once (it can take up to a
day to appear), and switch on "Mark as key event" for:

- `sign_up`
- `begin_checkout`
- `purchase`
- `lesson_mastered`
- `team_seat_assigned`

`login` and `team_invite_sent` are informational and do not need to be key events.

## Privacy note

Private pages (exams, assessments, team, account, subscribe) keep their existing rule: GA is not
loaded there and no page view is sent. The deferral path adds no data from those pages beyond the
event name, plan, term, seat count, module id, role, currency and Stripe order reference listed
above. It never reads the page content, and it is switched off on every exam and assessment page.

## Verifying

- Unit tests: `node --test tests/ga-events.test.mjs`.
- Unit tests: `node --test tests/verify-checkout.test.mjs` covers the verification endpoint with a
  fake Stripe and fake auth.
- End to end: `e2e/ga-events.spec.ts` reads `window.dataLayer` (the app's inline `gtag` pushes there).
  It asserts `lesson_mastered` carries only `module_id` and `lesson`; nothing is sent in speaking
  privacy mode; a purchase on `/subscribe/success` is sent only after the (stubbed) verification
  says paid, once, after either a client-side navigation to `/` (GA is loaded then) or a full public
  page load; an unpaid session or a signed-out visitor never counts; and private routes written as
  `/Subscribe/Success`, `/SUBSCRIBE/success` or `/%73ubscribe/success` never load GA.
- In a browser, open DevTools, type `dataLayer` in the console and look for entries starting with
  `event`, or use GA Admin, then DebugView.
