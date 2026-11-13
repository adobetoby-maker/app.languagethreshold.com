# Japanese 101 Master 1–10 form practice — private draft

`content/japanese-basics/private-form-practice-master-1-10-ja-en.json` selects 41 exact Japanese→English dialogue pairs across Master 1–10. The builder pins the Master source SHA-256, module ID, lesson/turn, and stable prompt ID. The scenes rehearse past verbs and adjectives, intention, counters with requests, giving/receiving, resulting state versus ongoing action, existence, routes, study methods, written quotations, comparison and sequential て-forms.

The fixture remains `registered:false` and `reviewed:false`. All 41 selected Japanese text keys occur in the corresponding private Master audio manifests, but listening approval is separate. Exact source lines are examples, not exhaustive translations; qualified Japanese review, Master 11–20, runtime answer handling, offline audio, browser/phone and independent V4 acceptance remain open. No learner progress changes.

Run `python3 scripts/build-japanese101-master-1-10-form-practice.py --check`, `python3 scripts/build-japanese-basics.py --check`, and `node --test tests/japanese101-form-practice.test.mjs tests/japanese-basics-course.test.mjs` after source edits. This contributes to [verb parity issue #427](https://github.com/adobetoby-maker/app.languagethreshold.com/issues/427).
