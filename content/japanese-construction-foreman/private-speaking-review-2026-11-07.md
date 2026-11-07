# Private Japanese Foreman speaking missions

The deterministic builder derives 60 lesson-linked missions (10 Foundation, 30 Core, 20 Master) from the exact Japanese target/English support runtime drafts. Each preserves the authored mission ID, English brief and partner role, Japanese opening line, `ja-JP` locale, and its own word bank with original card and dictionary IDs. Source-file hashes pin the derivation. There is no generic Spanish prompt, fallback pair, or user-progress migration.

The adapter at `src/lib/private-japanese-foreman-speaking.ts` rejects any other target/support pair and keeps `JAPANESE_FOREMAN_SPEAKING_RELEASED` false. No live speaking UI or AI route imports these missions. `reviewed:false` and `registered:false` remain accurate; this is not a released conversation feature. The Master 2 garage-deck/deicing-water source issue and other safety, rigging, medical, gas and code claims remain subject to qualified specialist review before any learner exposure.

Release work still required: qualified Japanese review of briefs, openings, role language and word-bank usage; qualified construction/domain review of technical claims; microphone permission/audio-routing and second-turn recording on iPhone; narrow-screen layout and no-scroll focus behavior; explicit voice-consent flow; signed-in return to the same mission; transcript/feedback pair isolation; offline expectations; and physical-device acceptance. No recorded audio was synthesized here.

Validation: deterministic `python3 scripts/build-japanese-foreman-private-speaking.py --check`, 14 focused Node tests across dictionary/form/speaking private adapters, `tsc --noEmit`, and `git diff --check`.
