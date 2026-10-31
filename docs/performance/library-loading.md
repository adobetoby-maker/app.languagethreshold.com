# Homepage library loading

The homepage is TanStack Start. Tool screens already use React.lazy in tab-registry.ts,
but library-state imported the entire multilingual reading library immediately.

## Loading rules

The existing language and module selectors are the two inputs. Load that language's
core readings and selected module. Append modules as they are selected; do not replace
readings from previously visited modules in the same session/language. Opening the
bookshelf does not initiate a full-library download. Changing language removes the
previous language's seeded readings from the live library; downloaded chunks remain
in browser/service-worker caches. Learner-owned custom books retain existing storage
and synchronization behavior.

Core contains general literary/cultural readings and a usable general starter for each
authored language. Module assignment uses explicit lesson IDs, including parent-trade
readings for Foundation/Master; missionary books belong to the missionary module.
Keyword matching is not used for loading: preview testing showed it pulled software,
finance and other unrelated readings into nursing through generic vocabulary.
Legacy readings without an explicit assignment are preserved in a reserved
`__unassigned__` generated pack that is never loaded automatically and is not a
selectable module. These 180 readings need editorial module assignments before they can
appear in the scoped bookshelf; no ownership or new lesson content is invented.
Existing lesson order still comes from module-starters.

Generate all packs from ALL_SEEDS at build time. Content is partitioned by shared module
ownership so overlapping modules import shared chunks rather than duplicate passages.
Committed generated snapshots support fresh-checkout typechecking/development; after
editing seeds or module mappings run `node scripts/build-library-packs.mjs`. Parity tests
detect stale snapshots. Generated files are marked in .gitattributes for review.

Wait for restored profile settings before fetching. Core and module requests run in
parallel. Only the missionary module requests scripture packs; wait for those too before
restoring saved selection. Requests deduplicate, successful packs stay cached, failures
can retry, and departed account/language results cannot change the current library.

The existing service-worker cache handles content-hashed reading JS. Unfetched content
still needs a connection. Explicit offline lesson downloads now include only their
language core and selected trade's reading chunks, preserving the existing 512-asset
and 64MiB limits rather than increasing them.

## Startup navigation fix

Preview testing found BlogNavLink called useQuery without any QueryClientProvider in
this app, crashing the homepage. It also fetched full blog articles every two minutes
just to decide whether to show a navigation item. The link now points directly at the
existing /blog page, which owns content loading and its empty state. This removes both
the crash and an unrelated first-visit data request. A render test covers provider-free
navigation.

## Build measurements

Baseline: main 7953e99db522d629dfafc3a166c30840a3cd2d82, from the immediately preceding
guarantee worktree's production artifact. Same installed dependencies/public build env.
Gzip sizes use Node zlib at level 9.

| Authored reading data loaded | gzip bytes | Reduction versus baseline |
| --- | ---: | ---: |
| Baseline multilingual all-seeds chunk | 428,845 | — |
| Spanish core + Nursing | 4,675 | 98.9% |
| Spanish core + Roofing | 5,937 | 98.6% |

No all-seeds chunk remains in the candidate client output. These measurements exclude
the shell/loader registry, optional scripture and tool bundles, so they are not whole-page
payload savings or page latency claims. Shared shards trade several small parallel
requests for reusable content: core + Roofing and core + Nursing each use two chunks.

Reproduce after building both worktrees:

```sh
node scripts/qa/measure-library-payload.mjs ../baseline/dist/client/assets dist/client/assets Spanish nursing
node scripts/qa/measure-library-payload.mjs ../baseline/dist/client/assets dist/client/assets Spanish roofing
```

## Verification

Tests cover full content parity, every authored reading assigned, language isolation,
explicit module ownership, usable core readings, additive/deduplicated module loads,
retryable failures, and scoped offline assets. Existing reader-selection and device
storage tests cover saved scope and account isolation.

Preview checks: fresh guest core Reader; choose Roofing, then Nursing, then Roofing
again; confirm the first trade remains in the bookshelf and repeat selection uses cached
content. Change language and confirm no previous-language seed list is shown. Check a
saved custom reading, missionary scripture/chapter, module passage/direct lesson link,
and previously cached reading offline. Simulate a failed request, reconnect, Try again.
Use fresh desktop and phone browser contexts so cached assets do not mask downloads.

Track cold/warm mobile document TTFB, LCP and Reader-usable time separately. The audit's
1,572ms response is not a baseline for a bundle-only claim. Below-800ms p75 requires
two weeks of field data after rollout.

## Further improvements

- Profile optional provider initialization before scoping providers to first use;
  preserve mounted state after activation so tab switches do not discard work.
- Inspect static settings/tutor/onboarding dependencies and defer non-critical panels
  while preserving direct links, authentication and analytics.
- Investigate server TTFB/cold starts separately if response p75 remains high.
- Consider coalescing tiny shared reading shards if request overhead dominates on slow
  mobile connections. Preserve cross-module reuse and avoid reintroducing full-language loads.
- Keep modulepreload hints that avoid dependency waterfalls; removing tags alone is not
  a reliable optimization.
