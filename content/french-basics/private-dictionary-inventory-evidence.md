# French 101 private dictionary inventory

This is a deterministic, **unregistered** inventory of the French→English word and phrase rows authored for French 101. It is not a reviewed dictionary or a learner-facing release. The builder reads Foundation 1–10, Core 1–30 and redesigned Master 1–20 drafts. It applies exact, lesson-scoped card corrections from the separate language-support overlays, without changing the authored sources or learner progress.

The current source yields 1,109 rows, 874 distinct French/English provisional sense pairs and 835 French headwords. Fifty-five word corrections match their draft rows; none is unpaired. Twenty-five headwords have multiple English gloss strings and require sense review. A slash-joined form or gloss is flagged on its sense. Part of speech, inflection and France/Quebec usage have not been assessed for any sense; the JSON records `null` instead of guessing. The 25 cases may include equivalent wording, genuine polysemy or different grammatical uses; the inventory does not decide which.

Each sense has a stable content-based ID, a headword ID, exact authored metadata where present, and every stage/lesson/word occurrence. The top-level source hashes make provenance auditable. These IDs are dictionary inventory IDs; they do not replace existing course, lesson or saved-progress IDs. The inventory does not register cards, entries, offline packs or audio, and every review flag remains false.

Rebuild and verify:

```sh
python3 scripts/build-french-101-private-dictionary.py
python3 scripts/build-french-101-private-dictionary.py --check
python3 scripts/test-french-101-private-dictionary.py
```

Before a dictionary release, a qualified French reviewer must resolve ambiguous headwords, specify POS and inflection where needed, check register/regional variants, verify final English glosses and examples, and review the lesson overlays. Runtime wiring, audio and device tests are separate gates.
