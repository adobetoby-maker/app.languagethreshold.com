# Master 14 form/kana bridge: executable draft patch candidate

`bridge-candidate.mjs` implements a finite, source-pinned alternative to the private draft bridge’s exact-only variant check. It is an inert review module in `content/`, imported only by its adjacent validator. The existing #485/#488 adapter, canonical Reader/form answers, `knownJapaneseVariants`, routes, scoring, audio and progress code are unchanged.

The fixture contains exactly two existing stable form IDs and their four already-proposed orthographic variants. It supports two explicit source contexts: main delayed-meeting Reader turns 4/9, and private routine Reader turns 10/14. Each context has a different pinned source hash. An evaluation requires the exact pair (Japanese target/English native), module, lesson 14, form ID, source context/hash/turn, canonical Japanese, canonical English and a literal member of that form’s three-string set (canonical plus two variants). No other lesson or pair can borrow these proposals.

The implementation checks the complete pinned row identities, evidence, order, variant identities, context hashes and false-gate contract. It clones fixtures before use. Mixed-script variants are read through explicit positional Kanji-to-kana mappings; generated readings are never rescanned or guessed. The only permitted comparison normalization removes ASCII spaces from the canonical side while validating the pre-listed variants. Submitted answers are never normalized or folded. An unlisted synonym, changed tense, punctuation change, extra whitespace or another prompt’s answer is rejected.

`canonicalKanaReading` always returns the unchanged source kana answer, preserving small ゃ in でんしゃ and small っ in まって. It does not derive reading groups from raw Kanji or infer long vowels from ordinary う/い. No Kana Pad curriculum or reading-group code changed.

## Demonstration contract

The factory returns a draft bridge whose `releaseEnabled`, `registered` and `reviewed` fields are false. An evaluation may return `fixtureAccepted:true` for the simulation, but **every result has `releaseEnabled:false`, `scoreable:false` and `progressWritable:false`**. It also returns the source row/variant identities for review; these are not saved-item writes or adopted runtime IDs. All fixture selections and audio remain null, and every acceptance/runtime/listening/offline/browser/V4 gate remains false.

This is the proposed behavior for the existing `variant !== line.target` check, not an applied change to the unmerged PR. A future qualified patch would keep strict canonical acceptance for unrelated forms and consult a reviewed, exact-source finite variant set only for eligible identities. It must also reconcile reviewed membership in `knownJapaneseVariants`, source/Reader pins, canonical kana readings, audio identities and saved-item/progress meaning. This module does not approve that promotion.

## Executed validation

Run:

```sh
node content/japanese-basics/review/master14-bridge-patch-candidate-2026-11-24/validate.mjs
```

The independent executable fixtures pass:

- 12 positive cases: canonical and two variants, for two forms in both pinned contexts.
- 30 rejected requests: wrong/reversed pair, cross-lesson/module/form, wrong context/hash/turn, changed canonical meaning, another form’s answer, changed tense, unlisted spelling/spacing/punctuation, missing fields and malformed requests.
- 18 rejected altered fixtures: opened gates, wrong identities/hashes/turns, changed canonical text/readings/tense, duplicate rows and reordered rows.
- Source hash checks, exact prior proposal equality, external mutation isolation, canonical kana readings and actual model metadata checks.

Explicit safe-mode Haiku 5.5 authored the initial code, Opus 5.5 supplied read-only critique, Fable 5.2 corrected it, and source-grounded self-check pinned the gate names and removed “reviewed source” wording. Actual model usage/session metadata and the executed validation result are adjacent. Model design notes record generation-time limitations; they are not qualified approval or a substitute for the executed checks.

No runtime import, registration, owner page, recording, playback or progress migration was added. The existing routines remain drafts under qualified review.
