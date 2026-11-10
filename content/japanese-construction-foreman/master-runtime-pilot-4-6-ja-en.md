# Japanese Foreman Master 4–6 private runtime draft

This bundle extends the **unregistered** Japanese→English Foreman Master draft with stable pair-specific lesson/card/dictionary IDs. The historical `es` word field holds Japanese and `en` English. Exact source pairs and the pinned English subset hash are preserved. Each lesson has six mode inputs, an original eight-line contextual Reader draft, cards, dictionary pairs, grammar examples, speaking prompts and three Reader cloze checks. The new scenes are in `master-original-reader-4-6-draft.json`; source pairs remain intact for private provenance. `reviewed:false`; no public or native registration.

The source translations received scoped Fable and Opus **AI** review and corrections recorded in `ai-review-master-4-6-2026-11-06.md`. The new Reader and clozes have **no independent AI or qualified human review**; see `master-original-reader-4-6-review-2026-11-07.md`. The private bundle has no recorded audio, offline pack, V4 import, or browser/phone acceptance.

Release gates by lesson:

- **Master 4 — grout:** Use the actual product data sheet and SDS for water, working/curing time, respiratory protection and safety. The source specifies no values or PPE type. A grout/masonry specialist must verify terminology and product-specific instructions. Provisional respirator and curing claims are excluded from the Reader.
- **Master 5 — septic tank:** US septic, drain-field, spread-footing, agency, removal and backfill terms need local jurisdiction and engineer review. The two proposed engineering alternatives are excluded from the Reader while preserving exact source pairs for private provenance. No alternative is approved here.
- **Master 6 — windows:** Project manager must confirm actual schedule effects. Architect written approval is required before a substitute is installed; trade review must verify protection and performance terms. Unconfirmed finish-date and plastic-cover statements are excluded from the Reader.

Run the focused test, `scripts/validate-japanese-foreman-master-translations.py`, and typecheck before extending. Human/domain approval, audio, offline and native integration remain open.
