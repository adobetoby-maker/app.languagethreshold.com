# French 101 Core 10–12 form practice — private draft

`private-form-practice-core-10-12-fr-en.json` is deterministically generated from `private-runtime-core-1-30.json` by `scripts/build-french101-core-10-12-form-practice.py`. The generated file pins the source SHA-256 and stage-local keys `french-basics:10` through `:12`. It remains `registered:false` and `reviewed:false`; no public lesson, audio, or learner progress changes.

All 18 bilingual Reader turns are retained as exact French→English pairs. Six new unreviewed contrasts exercise clock expressions with singular *il est*, *vous aimez* versus *ils aiment*, and *vous voulez* versus *elles veulent*. They are grounded in each lesson's source grammar model and explanation. `knownFrenchVariants` lists only the authored examples for a given English prompt; it is not an exhaustive account of valid French.

Run `python3 scripts/build-french101-core-10-12-form-practice.py --check` after source edits. The fixture audit in `tests/language-form-practice.test.mjs` checks all 101 current Foundation/Core 1–12 prompts against the exact-pair answer checker. Qualified French review, Core 13–30 and Master form practice, course registration, audio, offline, browser/phone and V4 acceptance remain open. This contributes to [form parity issue #428](https://github.com/adobetoby-maker/app.languagethreshold.com/issues/428).
