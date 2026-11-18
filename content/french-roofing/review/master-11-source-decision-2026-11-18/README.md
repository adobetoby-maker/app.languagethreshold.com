# French Roofing Master 11: current-source decision packet

This source-only packet pins current Spanish and English source rows and keeps archived French as unapproved evidence. It is inert review material. It does not register a learner lesson, scoring, audio, offline content, progress, saved items, browser delivery or independent V4 delivery.

- Source: `src/data/master-roofing-curriculum.ts` and `public/lesson-content/es/master-roofing.json`, with exact SHA-256 values in `packet.json`.
- Archived candidate: `content/review-archive/french-japanese-2026-11-15/french-roofing/master-10-12-draft.json`.
- Pair and proposed stable identity: English target, French native; `master-roofing:11:fr-en`. This is a proposal, with no migration or saved-item mapping.
- Contents: 22 ordered cards and 16 Reader turns; 10 card faces and 12 Reader faces are explicitly held. All selected French and audio scripts are null.
- Source grammar, five verb examples and speaking instruction are included as evidence. Six authored prompt/target mode pairs remain missing.
- Qualified French, roofing, dictionary, source and locale review remain open. All gates are false.

## Decisions still needed

Heat exhaustion and heatstroke, an unlabelled 100-degree threshold, the source's 911 setting, work hours, shade and water, and the conditional Friday promise need qualified source, clinical, occupational heat-safety and locale decisions. The archived French adds Fahrenheit, so that unit stays unselected.

The `sourceDecisionQuestions` field lists exact affected row IDs. Clinical and trade vocabulary remains visible in current source; internal review notes do not replace learner-facing teaching.

## Reproduce

```sh
python3 content/french-roofing/review/master-11-source-decision-2026-11-18/build.py --check
python3 content/french-roofing/review/master-11-source-decision-2026-11-18/validate.py
```

Claude CLI 2.1.325 was unauthenticated (`loggedIn:false`, `authMethod:none`), so there were no Haiku, Opus or Fable calls for this packet. The Python checks are structural and source checks, not qualified approval.
