# French 101 Core 4–6 form practice — private draft

`private-form-practice-core-4-6-fr-en.json` is generated from the exact French→English `private-runtime-core-1-30.json` fixture by `scripts/build-french101-core-4-6-form-practice.py`. The output pins the source SHA-256 and keeps `french-basics:4` through `:6` as stable lesson keys. It is `registered:false` and `reviewed:false`; learner progress and the public course are unchanged.

Twelve prompts quote exact French/English Reader turns. Four new contextual pairs supply forms the Reader does not model: *la trousse bleue est petite* for feminine adjective agreement, *ma table* and *mon amie* for feminine possessive contrast before a vowel, and formal *vous avez*. The builder checks the lesson grammar models and the *mon amie* explanation, plus exact source pairs and stable prompt IDs. Every prompt supplies meaning-recognition and target-production authoring inputs; no live trainer is claimed.

Run `python3 scripts/build-french101-core-4-6-form-practice.py --check` after source edits. Qualified French review, Core 7–30 and Master form practice, answer checking, audio, offline, browser/phone and V4 acceptance remain open. This contributes to [verb/form parity issue #428](https://github.com/adobetoby-maker/app.languagethreshold.com/issues/428).
