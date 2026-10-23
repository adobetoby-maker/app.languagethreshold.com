# Google Analytics 4 key events

Property tag: `G-RP0TZ1MP7E` (loaded in `src/routes/__root.tsx`). Every event is sent through
`trackEvent()` in `src/lib/ga-events.ts`. Nothing else in the app calls `gtag` directly.

## Privacy rules (enforced in `trackEvent`)

`trackEvent` is a silent no-op, and returns `false`, when any of these is true:

- `window` or `window.gtag` is missing.
- `window["ga-disable-G-RP0TZ1MP7E"]` is `true`.
- Speaking privacy mode is on (`isSpeakingPrivacyMode()`).
- The page is a private assessment context (`isPrivateAssessmentContext()`): `/exams`, `/team`,
  `/owner`, `/account`, `/certificate`, `/family-setup`, `/subscribe/*`, pages carrying `org`,
  `attempt`, `plan`, `token`, `code`, `email` and similar query parameters, or a
  `[data-private-assessment]` element.

Event parameters are limited to plan ids, module ids, lesson numbers, counts, currency and Stripe
order references. `trackEvent` also drops any parameter whose key looks identity-bearing (email,
user, member, name, phone, token, note, text and similar), and any string that contains `@` or is
longer than 100 characters. Never add emails, user ids, member ids, organization ids, names or
free text to an event.

`onceKey` (third argument) sends an event at most once per browser session for that key. It is
stored in `sessionStorage` (with an in-memory fallback) and is recorded only after a send succeeds.
Every event also carries `transport_type: "beacon"` so it survives a page redirect.

## Events

| Event | Parameters | Fires from | When |
|---|---|---|---|
| `sign_up` | `method: "email"` | `src/components/auth/AuthModal.tsx` | Email sign-up returned no error (including when email confirmation is still pending). |
| `sign_up` or `login` | `method: "google"` | `src/state/auth-state.tsx` (`trackGoogleAuth`) | `SIGNED_IN` after the Google redirect. `sign_up` when the account is under 2 minutes old, otherwise `login`. Once per session per user. |
| `begin_checkout` | `plan` (`monthly`, `annual`, `family`, `junior`), `currency: "USD"` | `src/routes/pricing.tsx` | The signed-in learner presses the subscribe button, before the Stripe redirect. |
| `begin_checkout` | `plan: "team"`, `term`, `seats`, `currency: "USD"`, `value` | `src/routes/team.tsx` (`billing()`) | The checkout API returned a Stripe URL, just before the redirect. `value` is the first-period price in USD. |
| `purchase` | `transaction_id` (Stripe Checkout session id), `currency: "USD"` | `src/routes/subscribe/success.tsx` | The individual success page loads with a `session_id`. Once per session id. |
| `purchase` | `transaction_id`, `currency: "USD"` | `src/routes/team.tsx` (checkout return) | The team billing check reports `active` or `trialing`. Once per session id. |
| `lesson_mastered` | `module_id`, `lesson` | `src/components/guide/AppGuide.tsx` (`finishLesson`) | Right after `CORE30_SET_MASTERED` is dispatched. Once per module and lesson per session. |
| `team_seat_assigned` | `module_id` | `src/routes/team.tsx` (`OwnedAssignModule.save`) | The assign request was acknowledged by the server. |
| `team_invite_sent` | `role` (`learner` or `admin`) | `src/routes/team.tsx` (invite form) | The invite request succeeded. No email or name is sent. |

## Known gaps from the privacy guard

`/team` and `/subscribe/*` are on the private-page list, and the GA script is not loaded at all on
a private page that is opened directly (`src/routes/__root.tsx`). The `purchase` events and every
`team.tsx` event therefore only reach GA if `window.gtag` exists and GA is enabled on that page,
which is not the case today for a direct load of those URLs. They are wired and tested, and become
live if the owner decides to allow event-only telemetry on those routes. See the hand-off notes
for that decision. `sign_up`, `login` (Google), `begin_checkout` from `/pricing` and
`lesson_mastered` fire on public pages and work today.

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
- End to end: `e2e/ga-events.spec.ts` reads `window.dataLayer` (the app's inline `gtag` pushes there)
  and asserts `lesson_mastered` is sent with only `module_id` and `lesson`, and that nothing is sent
  in speaking privacy mode.
- In a browser, open DevTools, type `dataLayer` in the console and look for entries starting with
  `event`, or use GA Admin, then DebugView.
