# Google Analytics 4 key events

Property tag: `G-RP0TZ1MP7E` (loaded in `src/routes/__root.tsx`). Every event is sent through
`trackEvent()` in `src/lib/ga-events.ts`. Nothing else in the app calls `gtag` directly.

## Privacy rules (enforced in `trackEvent`)

GA never loads on a private page. `trackEvent` decides what to do with an event like this:

| Situation | Result |
|---|---|
| Speaking privacy mode is on | Dropped. |
| Private page (`isPrivateAssessmentContext()`: `/exams`, `/team`, `/owner`, `/account`, `/certificate`, `/family-setup`, `/subscribe/*`, pages carrying `org`, `attempt`, `plan`, `token`, `code`, `email` and similar query parameters, or a `[data-private-assessment]` element) | Deferred: stored in `sessionStorage` (see below), not sent. |
| Public page, `window.gtag` missing or `window["ga-disable-G-RP0TZ1MP7E"]` is `true` | Dropped. |
| Public page, GA active | Any deferred events are flushed first, then the event is sent. |

Event parameters are limited to plan ids, module ids, lesson numbers, counts, currency and Stripe
order references. `trackEvent` also drops any parameter whose key looks identity-bearing (email,
user, member, name, phone, token, note, text and similar), and any string that contains `@` or is
longer than 100 characters. Never add emails, user ids, member ids, organization ids, names or
free text to an event.

`onceKey` (third argument) sends an event at most once per browser session for that key. It is
stored in `sessionStorage` (with an in-memory fallback) and is recorded only after a send succeeds.
Every event also carries `transport_type: "beacon"` so it survives a page redirect.

## Deferred events

An event raised on a private page is stored under `lt.ga.pending.v1` in `sessionStorage` as
`{ name, params, ts, key? }` and is sent later by `flushPendingEvents()`.

- Limits: at most 10 events (the oldest are dropped first) and 30 minutes. Older entries are
  discarded whenever the queue is read.
- Filtering: parameters are filtered with the same rules as a live send when they are stored, and
  filtered again when they are read back, so a tampered queue cannot push identity data to GA.
  `transaction_id` is the Stripe Checkout session id, which is an order reference.
- Flush: `flushPendingEvents()` runs in the root layout effect on every page load and route change
  (`src/routes/__root.tsx`) and before any event is sent from a public page. It sends nothing unless
  `window.gtag` exists, `ga-disable-G-RP0TZ1MP7E` is not `true`, speaking privacy mode is off and the
  page is public. The queue is cleared before sending, so each event goes out once.
- Dedupe: an event with a `onceKey` (all `purchase` events and the Google sign-up or login) is
  refused when queued if that key was already sent or is already queued, and refused again at flush
  time if the key was sent in between. A purchase therefore cannot count twice.
- If `sessionStorage` is blocked, private-page events are dropped.

Because GA is only loaded by the server-rendered page, the queue flushes on the next full load of a
public page (a page reload, a typed URL, a link that is not handled by the app's router). A
client-side navigation from a private page to a public one does not load GA, so the events wait
until that full load, or expire after 30 minutes.

## Events

| Event | Parameters | Fires from | When |
|---|---|---|---|
| `sign_up` | `method: "email"` | `src/components/auth/AuthModal.tsx` | Email sign-up returned no error (including when email confirmation is still pending). |
| `sign_up` or `login` | `method: "google"` | `src/state/auth-state.tsx` (`trackGoogleAuth`) | `SIGNED_IN` after the Google redirect. `sign_up` when the account is under 2 minutes old, otherwise `login`. Once per session per user. Deferred if the return URL still carries `code` or a token. |
| `begin_checkout` | `plan` (`monthly`, `annual`, `family`, `junior`), `currency: "USD"` | `src/routes/pricing.tsx` (`startCheckout`) | The checkout API returned a URL, or the payment-link fallback is used, just before the redirect. Not on the button press alone. |
| `begin_checkout` | `plan: "team"`, `term`, `seats`, `currency: "USD"`, `value` | `src/routes/team.tsx` (`billing()`) | The checkout API returned a Stripe URL, just before the redirect. `value` is the first-period price in USD. Deferred (private page). |
| `purchase` | `transaction_id` (Stripe Checkout session id), `currency: "USD"` | `src/routes/subscribe/success.tsx` | The individual success page loads with a `session_id`. Once per session id. Deferred (private page). |
| `purchase` | `transaction_id`, `currency: "USD"` | `src/routes/team.tsx` (checkout return) | The team billing check reports `active` or `trialing`. Once per session id. Deferred (private page). |
| `lesson_mastered` | `module_id`, `lesson` | `src/components/guide/AppGuide.tsx` (`finishLesson`) | Right after `CORE30_SET_MASTERED` is dispatched. Once per module and lesson per session. |
| `team_seat_assigned` | `module_id` | `src/routes/team.tsx` (`OwnedAssignModule.save`) | The assign request was acknowledged by the server. Deferred (private page). |
| `team_invite_sent` | `role` (`learner` or `admin`) | `src/routes/team.tsx` (invite form) | The invite request succeeded. No email or name is sent. Deferred (private page). |

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

## Verifying

- Unit tests: `node --test tests/ga-events.test.mjs`.
- End to end: `e2e/ga-events.spec.ts` reads `window.dataLayer` (the app's inline `gtag` pushes there).
  It asserts `lesson_mastered` is sent with only `module_id` and `lesson`, that nothing is sent in
  speaking privacy mode, and that a purchase seen on `/subscribe/success` is queued, flushed once on
  the next full public page load, and not counted again after a reload.
- In a browser, open DevTools, type `dataLayer` in the console and look for entries starting with
  `event`, or use GA Admin, then DebugView.
