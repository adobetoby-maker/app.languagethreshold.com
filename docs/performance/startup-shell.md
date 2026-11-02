# Startup shell and game initialization

This follow-up to PR #79 separates optional game initialization from the Reader shell.
The six game state providers load as one lazy group on the first game/Practice Lab tab,
including direct links. Once activated, they stay mounted across tab changes. Existing
account-keyed remounts isolate one learner's runs from another's. The existing chunk
error/reload boundary also protects the deferred provider import.

Daily challenges remain globally available. Match completion is observed independently
because Match can launch from the shell before any game tab opens. Game completion
observation starts after the providers' synchronous device hydration, treating restored
history as the baseline. No game run or owned learner store is replaced.

The authentication restoration gate now shows a public, branded shell with the existing
homepage headline and Pricing link rather than only a loading sentence. Learner content
is still withheld until authentication/profile restoration completes. This makes public
content visible in the initial server-rendered HTML without exposing any account data.

## Latency investigation

A fresh production request observed TLS/setup at 6,003ms and first byte at 6,244ms:
only about 241ms elapsed after request setup. This is one request, not a performance
percentile, but demonstrates why the previous multi-second curl measurements cannot
be attributed entirely to application rendering or Vercel cold starts.

The Vercel Node bridge now adds numeric-only Server-Timing durations for bootstrap
(loading the bundled server), request (reading/adapting input), and render (fetch until
response headers). Existing Server-Timing and response status/headers/body are preserved.
The render duration excludes later streaming/body transfer. Timings contain no URLs,
account identifiers, credentials or learner data. Private/no-store response directives
are preserved. No CDN cache policy or deployment region is changed based on one sample.

## Measurements

Same installed dependencies and preview build settings; baseline main bdd2fcd8.
`node scripts/qa/measure-startup-assets.mjs` inventories script/modulepreload assets
referenced by the server-rendered public root HTML, using gzip level 9.

| Metric | Baseline | Candidate |
| --- | ---: | ---: |
| Initial script/modulepreload count | 25 | 25 |
| Raw script bytes | 3,898,352 | 3,874,125 |
| Sum of gzip script bytes | 1,186,056 | 1,181,779 |
| Public heading in initial HTML | No | Yes |

The transfer reduction is modest (4,277 gzip bytes, about 0.4%). The main benefit of
this step is deferring six provider initializations and exposing useful public content
earlier. It does not establish a sub-800ms page-load target. About 1.18MB of initial
compressed JavaScript remains: shared flashcard starter data and curriculum/tool
imports need a separately measured split that preserves card IDs, SRS and saved progress.
Do not describe the reading-data savings from PR #79 as whole-app payload savings.

## Verification

Tests cover request adaptation, streaming/backpressure, existing timing headers,
private response headers, mutation bodies, redirects and empty bodies, plus activation
for each supported game tab and non-activation for Reader/other tools. The complete
suite, typecheck, lint, production build and Vercel artifact verification are run.

Preview: open Reader first, open a game tool, leave for Reader and return; confirm no
missing-context error. Verify direct game links, Match completion and learner/account
switches. Compare Server-Timing with connection/TLS timings on first and warm requests.
Use browser field measurements over two weeks for the actual p75 target.
