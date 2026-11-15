# French Breakfast Foundation 2 — private lesson-team checkpoint

**Disposition:** source-aligned, structurally valid *candidate* for owner-only review; qualified French/Mexican-food and numbers pedagogy review remains. All review, registration, audio and learner gates stay false. This is not an approval.

Source at current `origin/main` (`a5609b01e18a25c2517c13d3f569a01b1efc0b1e` at audit): `src/data/core60/es/foundation-travel-breakfast.json` SHA-256 `94621cca4158b76c69435f35eb1dfdc4893df553afaccb8a1963bdd9e6d80e79`; `public/lesson-content/es/foundation-travel-breakfast.json` SHA-256 `e11886cd3e030534ba8f8b8e92515c528e07c2875f20a58034faed2bc3d0f78a`. Private #475 head `5cc469f5a54828c48238ccdf411238ed2e3e2c08` supplied the old draft.

The private draft adapted pesos to euros, Café Luna to Lyon/Café Lumière, chilaquiles to fruit bowls, pan dulce to pastries and several prices. This candidate restores 16 exact English card faces/kinds, nine exact English Reader lines, all Spanish anchors, the 30/35/20/200/45 prices and 120-peso arithmetic. It retains stable stage-local `foundation:2`, five Reader-linked forms, source-linked six modes and the source speaking objective. No existing audio can be reused for changed exact strings without a fresh text/voice/hash/listening decision; no audio was generated here.

Direct safe-mode CLI evidence: `--model haiku` returned canonical `claude-haiku-5-5` authoring, `--model opus` returned `claude-opus-5-5` read-only critique, `--model fable` returned `claude-fable-5-2` correction. All raw JSON reports have `is_error:false`. Self-check fixed a Fable source-note assertion about the `la pièce` note and chose `la tranche` for the generic English card “the slice”, while retaining natural `la part de gâteau` in the cake Reader line. It also removed the adapted-location text from learner faces. AI is not qualified review.

Validator `python3 /Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-2/validate_packet.py` passes current source hashes, exact English/Spanish cards and Reader, kinds, stable IDs, source-linked forms/six modes, and closed gates. Packet: `/Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-2/owner-review-packet.json`.

Residuals: `3 pièces de pain sucré mexicain` is semantically source-aligned but stiff French and adds a contextual qualifier; a qualified reviewer should choose an idiomatic Mexican-pan-dulce phrasing while preserving the count. `2 americanos` is a loan form; reviewer should confirm the intended menu term. `la tranche` and cake-specific `la part` contrast is intentional. `En tasse` is terse; `Dans une tasse` may be clearer. Digit 8 in French and added `h` in 7–11 need answer normalization. The hear cue is partner-read only, with no recorded audio verification. Learner runtime/offline/progress and V4 acceptance remain untested.

The validator runs entirely from archived source snapshots; it does not require the original worktree. To recheck current `origin/main`, fetch the repository separately and compare the two SHA-256 values above.

Archive audit 2026-11-14 17:11 UTC: normalized explicit `readyForLearner:false`, `learnerRuntimeEnabled:false`, `audioPlaybackEnabled:false`, and `progressEnabled:false` in this private packet. No route or learner registration changed. Validator and SHA-256 manifest refreshed.
