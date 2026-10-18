# Lesson and deck generation controls

The current draft limits three paid builders: `generateLessonWords`, `generateModuleDeck`, and `generateCultureEssay`. Authored words, prebuilt/downloaded lesson decks, local cached words, and saved Reader texts do not spend these allowances. Guest learning remains available.

The three builders share fixed-window limits, defined in `src/lib/learning-generation-security.ts`:

| Budget | Limit | Window |
| --- | ---: | --- |
| One connection/IP, all three builders | 8 | Clock minute |
| One connection/IP, all three builders | 120 | Clock hour |
| All connections, all three builders | 600 | Clock hour |

Production, Preview and development use distinct namespaces. All previews sharing this database share the Preview allowance. A team behind one network connection shares its IP allowance. These are request caps, not a dollar budget or a cap on every AI feature in the app. Provider failures still consume reserved requests; window boundaries can allow a burst across two adjacent windows. Adjust the checked-in constants after observing legitimate demand rather than bypassing the counter in a browser.

Each request must have the app's exact Origin and a valid canonical `x-vercel-forwarded-for` IP. The platform header is used without caller-selectable forwarding fallbacks. Loopback development uses one development bucket. The existing server-only `consume_speaking_request` RPC provides atomic counters shared across function instances. Separate HMAC namespaces prevent interference with Speaking's original budgets; raw IPs never enter the stored counter key. The service role remains server-only. The earlier budget implementation used existing counter privileges. The separate server-only shared draft store is described below.

If a minute or hour is exhausted, the handler returns a recoverable 429 with a short explanation and Retry-After. If the durable store or platform IP is unavailable, it returns 503 before a model call. The counter request has an eight-second network timeout. Cross-origin requests return 403. Server-function responses use no-store, including framework CSRF denials. The custom Start request middleware preserves the framework's default CSRF filter and adds the final response headers after serialization; the installed serializer otherwise drops the handler's ALS headers. Ordinary pages keep their own response policy.

The lesson toolkit already displays the returned error with Retry. Field cards now retain the useful server error rather than replacing it with a generic failure. Optional culture readings remain explicit, save through the Reader device queue and reopen their own country/language-pair copy. A retry does not erase downloaded/saved study material.

Verification is scoped in `docs/reviews/qa-learning-generation-budget-2026-10-16.json` and `qa-learning-generation-entry-2026-10-16.json`. The database trial is rolled back. Hosted checks exercise both framework CSRF rejection and conflicting-origin rejection inside each actual builder; they do not exhaust a real quota or spend model requests. The ordinary browser creation trial does make one intentional culture request per tested artifact and saves only guest practice text.

Current official references checked: [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Supabase database functions and privileges](https://supabase.com/docs/guides/database/functions), and the [Supabase changelog](https://supabase.com/changelog). Relevant recent TLS/Postgres notices were read; this change performs no database upgrade, legacy cipher operation, custom operator or schema migration.

Remaining work: other AI endpoints need their own complete cost audit; shared versioned reviewed content can reduce repeat generation across browsers; full offline cold-start and signed-in/device acceptance remain separate. Generic culture readings are optional material, not evidence that a work module's lessons or exams meet the reviewed Roofing standard. The Library's existing relevance heuristic can also pin a generic reading that mentions a matching field term; this is not a reviewed lesson assignment.

## Shared lesson word drafts (5547311)

Only generateLessonWords now has a durable shared draft store. Its key includes canonical module/lesson, target/native pair, exact prompt/model request and word limits; environment separates Preview, production and development. Matching valid drafts are reused for30days without another model/budget call. Atomic120s leases return202/Retry-After3 to competitors; existing Retry remains available. A cold lease holder uses the existing content budget and45s provider timeout without automatic retries. Failed generations release their lease; a storage failure cannot authorize inference. A failed final cache write still returns the generated caller copy without claiming persistence.

The new table/RPCs are server-only: RLS enabled, guest/authenticated grants denied, SECURITY INVOKER with fixed empty search_path, service role only. Stored values contain canonical public practice words, no learner identity or private exam content. This does not add shared module-deck/essay caching or remove their request budgets. Existing browser copies and authored/offline packs retain their separate behavior. Local handler/SQL tests and hosted access/durable warm-hit evidence are in qa-shared-lesson-drafts-2026-10-16.json; cold concurrent HTTP statuses were not captured due to a corrected QA decoder issue, so that specific acceptance remains unclaimed.
