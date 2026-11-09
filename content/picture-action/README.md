# Picture & Action module coverage

The preview catalog has 73 main modules and 144 separate Foundation/Master entries (217 entries). Main currently has 72 main modules; Place & Directions is the new preview module. `module-profiles.json` explicitly maps each base module to two authored objects and a default background. Stage IDs reuse the base profile. `tests/picture-action-module-catalog.test.mjs` checks that no current catalog module is omitted.

Each module profile supplies six placement/pickup commands. Spanish/English and English/Spanish are the playable pairs. The Japanese 101 profile is reserved; the Japanese selected language remains preserved and unavailable rather than displaying Spanish. There are 72 playable module-specific sets, eight shared variety scenes, and 492 command identities in the single-item rounds (930 including the new packing puzzles and reserved profile). Human teaching review remains pending.

Shared HQ backgrounds: workshop/table/toolbox/cones, clinic, operating room, pickup bed, bedroom, fishing dock, sports training field, farmyard. All playable modules can select their own objects/actions set and any of the eight shared scenes. Defaults and choices are scoped to module and language pair. Voice only, Voice + text, Text only, HD voice choice/speed, assisted practice, and automatic advancement use the same game engine.

Sources:
- `scenes.json`: authored targets/commands for the shared backgrounds, with coordinates inspected against uncropped artwork.
- `module-profiles.json`: authored local object meanings/icons and explicit module mappings.
- `src/lib/picture-action.ts`: derived module commands; no AI request during a round.
- `image-prompts.json` / `module-image-prompts.json`: original image generation prompts; masters saved in the owner's Picture Action Scenes/Masters folder.
- `audio-script.json`: exact derived command inventory. `scripts/generate-picture-action-audio.py` builds it from the engine, reuses identical text/voice MP3s, verifies decode durations, and generates the playback manifest.

`public/downloads/picture-action-app-assets.zip` contains eight 960px JPEGs, image hashes and all portable scene/profile data. Native gameplay UI and TestFlight releases are separate deliverables; the image pack does not establish native gameplay or offline audio readiness. Responsive WebP files preserve the same uncropped coordinate system. Only the selected picture and command recording are requested during play.

## Final packing puzzle

After the last command, the learner completes a six-item packing/organization puzzle. Correctly placed items remain visible; they can choose the remaining items in any order, retry a wrong compartment, and restart. A direct Final challenge button supports practice. Backpack, toolbox, tackle organizer and worktable tasks use three dedicated HQ container artworks and module-appropriate equipment. Final items have their own HD recordings in both voices/languages. `src/lib/picture-assembly.ts` derives the puzzles; the portable pack includes their data and all eleven optimized images. There are 930 command identities including the reserved Japanese profile, 918 playable Spanish/English identities, and 1,608 unique recorded MP3 files shared across those identities. Human review remains pending.
