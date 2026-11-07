# Japanese Breakfast & Cafés: private offline text candidates

The exact target/support pair is **Japanese / English**. These files extend the private Foundation 10/Core 30 runtime-input inspection checkpoint in draft PR #408. They are content-addressed **candidate bytes**, not app downloads or installed packs. The source and output manifests live only under `content/japanese-travel-breakfast/private-offline/`.

| Stage | Lessons | Cards | Candidate bytes | Content SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Foundation | 10 | 120 | 45,654 | `d0f76be8799c30ea0757597237f6ba739d84549a4675c32a7110f759535339d9` |
| Core | 30 | 402 | 141,352 | `a6791e3595c4c0b8484a049fad74976188a60f5edda0d7ca1ff33667bae8e947` |

The generator verifies the pinned private source bundles, exact `Japanese:English` pair, stable `:ja-en` lesson IDs, Reader and speaking ownership, six-mode prompt inputs, and every card's exact Japanese/English text. Its verifier independently checks source and payload hashes, stage counts, card links, private cache namespace and progress-scope candidates. The candidate cache and progress names include the pair and stage; no progress writer uses them. A wrong pair, changed source or content, Spanish cache namespace, or cross-wired lesson/card fails closed. The release gate remains `false`; the manifests have `routeCandidate:null`, `workerAllowlistEnabled:false`, `appAssetInventory:null` and `installationStatus:"not-installed"`. There is no public static asset, offline-worker allowlist entry or app registration for either pack.

These packs include text, cards, aligned Reader lines, and speaking *prompts* only. They contain no recorded audio, device voice, offline AI conversation, cloud sync, or tested learner exercises. Master is incomplete and excluded. The 404-pair private dictionary remains a separate unregistered inventory, with sense and morphology review open. All source/pack `reviewed:false` and `registered:false` flags remain unchanged. Qualified Japanese, café/food safety, browser/iPhone and offline-reload acceptance are required before any release.

Rebuild: `node scripts/build-private-japanese-travel-breakfast-offline.mjs`. Verify determinism with `--check`, run `node --test tests/japanese-travel-breakfast-private-offline.test.mjs`, the cumulative Japanese Breakfast source validator and TypeScript typecheck. Do not copy these candidates to `public/lesson-packs` or enable the worker from this private checkpoint.
