# French 101 V4 Watch starter plan — unrecorded

This private manifest proposes **12 exact French display strings** from the existing Foundation 1, Core 1 and Master 1 fixtures, in priority order. It does not register a course, change V4, alter Spanish recordings, synthesize MP3s, or change learner progress. Every selected string has an exact audio-inventory hash and source-field reference. The proposed locale is fr-FR with two voices, whose identities and availability remain unverified. Every `reviewed`, `recorded` and integration state remains false.

V4 currently permits at most **4 MiB** in `WatchAudioLite`. Its observed Spanish starter pack is 3,976,357 bytes for 860 clips. Applying that pack's observed average to a proposed 24 French clips gives an **illustrative** 110,968 additional bytes and 4,087,325 combined bytes, leaving 106,979 bytes under the internal cap. The plan requires at least 65,536 bytes of uncommitted headroom by this estimate. French clip durations, encoding and manifest overhead are unknown, so this is not a verified fit or a French size prediction.

The audit also exposes a V4 lookup detail: its current normalization strips terminal punctuation after whitespace collapsing, so French spacing before `?` or `!` can leave a trailing space in the lookup key. The manifest records exact current keys and flags affected selections. Resolve and test this before playback integration; the planning script does not change native lookup behavior.

Once French scripts, pronunciation and voices have qualified review, synthesize only a bounded pilot. Validate the exact locale/text/voice/hash/duration and listen to every clip. Then add approved files to the V4 source library, run its bounded `scripts/build_watch_audio.py` selection and `scripts/verify_watch_size.py` on the built Watch app. If actual bytes exceed the cap, omit lower-priority French selections or rebalance the starter pack without replacing Spanish source recordings. Test actual Watch playback and owner TestFlight acceptance separately. No native release is part of this plan.

```sh
python3 scripts/plan-french-101-watch-starter.py --check
python3 scripts/test-french-101-watch-starter.py
```
