# Private French and Japanese 101 listening review

The local French and Japanese 101 batches have separate 60-lesson manifests. Build one private worksheet per lesson with:

```bash
python3 scripts/build-language101-listening-review.py build --audio-root /absolute/path/to/lt-audio
```

The output is `french-101/course-listening-review/index.html` and `japanese-101/course-listening-review/index.html` beneath that audio root. The builder prefers each complete Foundation 1 manifest to its earlier, smaller pilot. It checks every referenced clip's bytes, SHA-256, locale, selected Aoede/Charon voice and positive duration metadata before writing pages. Each page pins its source manifest hash and exports one JSON decision per exact display/spoken text, voice and clip hash. The recorded media stay local; the script does not register them on the website.

Collect exported lesson JSON files in a private review directory, retaining their generated filenames. Reconcile them with:

```bash
python3 scripts/build-language101-listening-review.py verify --audio-root /absolute/path/to/lt-audio --reviews /absolute/path/to/reviews > /absolute/path/to/review-report.json
```

The verifier requires all 120 lesson receipts, rejects changed manifests or files, duplicate or missing decisions, invalid statuses, and missing reviewer fields. It exits nonzero until every exported decision is `accept`. Its report is a mechanical reconciliation of user-supplied JSON, **not authenticated proof of who listened**. Independently confirm the reviewer, any retakes and qualified language review before changing `listeningReviewed` or registering playback. The 120 owner-approved French/Japanese pilot clips are separately pinned in `docs/french-japanese-pilot-listening-acceptance-2026-11-08.json`; their approval does not apply to newly recorded or differently hashed clips in these full-lesson batches.
