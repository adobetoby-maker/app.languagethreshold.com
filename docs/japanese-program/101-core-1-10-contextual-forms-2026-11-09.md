# Japanese 101 Core 1–10 form practice — private draft

`content/japanese-basics/private-form-practice-core-1-10-ja-en.json` selects 33 exact Japanese→English dialogue pairs across Core 1–10. The deterministic builder pins the source SHA-256, stage-local module ID, dialogue turn number, and stable prompt ID. The selected scenes practice polite present and past forms, verb groups, い/な-adjectives, adjective negation, needs, motion verbs, question forms, reason `から`, and time/suggestion forms. No Spanish conjugation table is reused.

The fixture remains `registered:false` and `reviewed:false`. All 33 selected Japanese text keys occur in the corresponding private Japanese 101 Core audio manifests. This establishes text coverage only; the recordings remain subject to listening review and are not imported into learner playback. Qualified Japanese review, Core 11–30 and Master form practice, runtime connection, offline audio, browser/phone and independent V4 acceptance remain open. No learner progress changes.

Run `python3 scripts/build-japanese101-core-1-10-form-practice.py --check`, `python3 scripts/build-japanese-basics.py --check`, and `node --test tests/japanese101-form-practice.test.mjs tests/japanese-basics-course.test.mjs` after source edits. This contributes to [verb parity issue #427](https://github.com/adobetoby-maker/app.languagethreshold.com/issues/427).
