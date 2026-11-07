# French 101 recording scope — private planning audit

This is a **read-only estimate**, not generated or approved audio. The deterministic inventory reads all 60 authored French→English lessons, the current private Foundation 1–10 and Core 1–30 fixtures, and the private Master 1–6 fixture. Master 7–20 has authored drafts but no private runtime fixture yet. It takes only target-language word/card text, aligned Reader/dialogue lines, explicit listening text and French speaking openings; English support text is excluded. Exact display text is kept as the proposed lookup key. Source SHA-256 hashes and each field occurrence are in the JSON.

The inventory finds **1,009 unique candidate French display strings** and **33,292 characters per voice**. Of those strings, 709 occur in the private fixtures; the rest are from Master 7–20 drafts. Six additional authored Core strings refer to studying *espagnol* and were replaced in the private fixtures; they are recorded as source-only and excluded from the candidate count. **323 candidate strings contain speaker labels** that require spoken-script review before recording. Removing labels or changing punctuation will change the final text and invalidate this count.

| Planning scenario | Proposed recordings | Spoken characters |
| --- | ---: | ---: |
| Two voices for fr-FR | 2,018 | 66,584 |
| Two voices each for fr-FR and optional fr-CA | 4,036 | 133,168 |

The locale labels are proposals only. No provider, voice identity, fr-CA pronunciation, availability, pricing or licensing has been verified. France/Quebec word choice and pronunciation need French review; a fr-CA recording should use reviewed Canadian wording where it differs, not automatically re-read an unchanged fr-FR script.

The existing V4 `WatchAudioLite` resource budget is **4 MiB**. Its observed Spanish starter pack contains 860 clips in 3,976,357 bytes, about 4,624 bytes per clip. Applying that unrelated observed average gives illustrative whole-course sizes of about **9.3 MB** for two fr-FR voices or **18.7 MB** for four voices across both locales. These are sizing examples, not French MP3 predictions: duration, encoding, manifests and filesystem overhead can change the result. The whole inventory will not fit the current Watch starter pack by that assumption. After approved recordings exist, select a bounded first-lesson pack and run the actual Watch builder and size guard; leave the rest available on iPhone/online as designed.

Next gates: finish independent French text/curriculum review and qualified human review, decide exact locale and voice identities, resolve speaker labels and regional variants, estimate provider cost on the final script, synthesize a small pilot, then validate exact text, voice, locale, duration, hashes, listening quality, browser/offline and iPhone/Watch playback. This audit does not register content, alter lesson/progress IDs, publish recordings or spend on synthesis. All review/release flags remain false.

```sh
python3 scripts/audit-french-101-audio.py --check
python3 scripts/test-french-101-audio-inventory.py
```
