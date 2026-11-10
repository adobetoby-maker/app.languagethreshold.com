# FR-001 Master 16–17 regional audio source audit

Exact pair: French target, English support. Internal source and rights research for the planned regional consonant and vowel listening lessons. This audit does not approve a recording, assign a phonetic label from metadata, or register a lesson.

| Source | Traceable metadata | Published reuse terms | Decision for this draft |
| --- | --- | --- | --- |
| [University of Neuchâtel OFROM](https://ofrom.unine.ch/) | Swiss Romand conversations aligned to transcription | Site states CC BY-NC-SA 4.0 and citation required | Research/reference only pending separate permission for product audio; no clips imported |
| [PFC source-data access agreement](https://www.projet-pfc.net/2008/11/23/base-de-donnees/) | Speaker metadata and downloadable WAV under an individual account | Agreement says no reproduction or dissemination without explicit prior permission and excludes commercial activity | No clips imported; obtain explicit permission before any product use |
| [University of Geneva C-PROM-PFC](https://yareta.unige.ch/archives/fe0fc9a9-81b6-4b54-867d-98b79ed3a832) | 120 identified speakers across 15 locales in France, Switzerland, and Belgium | Repository labels corpus CC BY-NC-SA 4.0 | Research/reference only pending separate permission for product audio; no clips imported |
| [Commons, “rue,” Paris speaker](https://commons.wikimedia.org/wiki/File:Fr-rue.ogg) | Shtooka recording, Vion Nicolas, described as a Paris-area speaker; 1.1 s | File page lists CC BY 2.0 France | Candidate for Master 16 only; needs exact-audio phonetic review, attribution design, and a second comparable licensed speaker |
| [Commons, “pain,” Paris speaker](https://commons.wikimedia.org/wiki/File:Fr-Pain-fr-Paris.ogg) | Kipmaster recording, Île-de-France description; 1.3 s | File page lists CC BY-SA 2.0 France | Candidate for Master 17 only; assess attribution and share-alike handling before use |
| [Commons, “pain,” Avignon speaker](https://commons.wikimedia.org/wiki/File:Fr-pain_(Avignon).ogg) | Xic667 recording, described as a male speaker from the Avignon region; 0.7 s | File page lists CC0 | Candidate for Master 17 only; compare with the Paris “pain” sample after qualified listening review |
| [Commons, “croire,” Paris speaker](https://commons.wikimedia.org/wiki/File:Fr-croire.ogg) | Shtooka/Vion Nicolas, file description says Paris speaker; 1.0 s | File page lists CC BY 2.0 France | Same-word Master 16 candidate; evaluate /ʁ/ by ear |
| [Commons, “croire,” Gaspésie-labeled file](https://commons.wikimedia.org/wiki/File:FR-Croire_(Gaspésie).ogg) | Amqui recording; filename names Gaspésie, but file-description text says only “pronunciation of croire”; 2.38 s | File page lists CC BY-SA 3.0 | Same-word Master 16 candidate only; speaker-region provenance needs independent confirmation |

The two “pain” files give a possible same-word nasal-vowel comparison with named regional descriptions. The two “croire” files give a possible same-word /ʁ/ comparison, but the Gaspésie file's description does not independently identify the speaker's region. Their pages do **not** prove a phonetic contrast, recording comparability, or suitability for a scored listening question. The Paris “rue” sample remains an alternate /ʁ/ candidate. No candidate was clipped, transcribed afresh, or placed in web/V4 assets.

Five original candidate files were downloaded to the private folder `/Users/drive/lt-audio/french-pronunciation/regional-candidates-2026-11-10/`. The [private listening worksheet](/Users/drive/lt-audio/french-pronunciation/regional-candidates-2026-11-10/listening-review-2026-11-10.html) and `technical-inventory.json` are alongside them. File headers and `ffprobe` confirm Ogg Vorbis with nonzero duration. The inventory pins the source URL, SHA-1, SHA-256, byte count, duration, codec, sample rate, and channel count; the downloaded bytes are:

| Candidate | Bytes | Duration | SHA-256 |
| --- | ---: | ---: | --- |
| Paris “rue” | 14,733 | 1.100 s | `26b9d54fa0a9ac2ba062b32043805e2959100284b4d881c3f7a1f5756052d605` |
| Paris “pain” | 23,968 | 1.340 s | `819e36a968b08abe50275038d22e19c567c14ee3ed861cd0d1f2a811c66c17e2` |
| Avignon “pain” | 16,302 | 0.710 s | `52d0e14b5b99523bd0be1149c15d4c7438f0c85ec3cfde004ea507dbe6a71dfc` |
| Paris “croire” | 13,262 | 1.000 s | `dc2dafcba48349e0aba60b1c5561e12bcdfb7e3837700669b7ba1980c0636cad` |
| Gaspésie-labeled “croire” | 29,398 | 2.380 s | `0667c08f80dde7217c9c0e75870d99bc07187653364dd95d24c5ed234292a046` |

Technical file checks do not establish pronunciation, lesson suitability, or product rights. All five remain `listeningReviewed:false`, `phoneticFeatureReviewed:false`, and `productApproved:false` in the private inventory. The worksheet leaves reviewer observations and decisions blank.

On 10 November 2026, the current Wikimedia Commons `imageinfo` response for all five file pages matched each downloaded file's SHA-1 and byte count. The source revision timestamps are Paris “rue” `2007-11-07T23:56:34Z`, Paris “pain” `2013-09-15T14:51:36Z`, Avignon “pain” `2013-07-07T18:54:39Z`, Paris “croire” `2007-11-07T23:27:23Z`, and Gaspésie-labeled “croire” `2012-05-02T02:27:44Z`; they are pinned in the private inventory. This verifies source-file identity at that check, not the audible word or the proposed phonetic comparison. The [Paris “pain” file page](https://commons.wikimedia.org/wiki/File:Fr-Pain-fr-Paris.ogg) also lists a CeCILL alternative alongside CC BY-SA 2.0 France; the eventual reuse decision must select and satisfy a specific applicable license.

Next evidence required: confirm the Gaspésie-labeled speaker’s region or replace that file with a comparable provenance-backed regional /ʁ/ recording for Master 16; complete a qualified French phonetic listening review of the actual waveforms; clear any product redistribution and attribution obligations; then pin transcript, offsets, and review status before writing Master 16–17 Hear tasks. Keep reviewed:false, runtimeRegistered:false, and audioPublished:false until those gates and the full course gates pass.
