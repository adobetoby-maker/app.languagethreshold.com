# Picture & Action — reusable scene practice

Authored tracks: Spanish target / English support; English target / Spanish support. Both command strings and object glosses are stored locally; no per-question AI request. Other pairs display an availability message and preserve the learner’s selected language. Human linguistic/teaching review remains pending.

This extends the Place & Directions game into a reusable practice area in every module’s lesson view and the global Practice Lab. Module IDs choose a relevant default: clinic for medical/nursing, OR for operating-room modules, truck bed for logistics/transport, workshop for trades, bedroom for housekeeping/general practice. The learner can select any scene. Scene choice is remembered per module/language pair on the device. No new lesson IDs or mastery/progress state are introduced. This does not create a specialized exercise bank for every module or enable unsupported language tracks.

Five original image scenes, 36 authored actions: existing workshop (12), clinic (6), operating room (6), pickup cargo bed (6), bedroom/housekeeping (6). The clinic includes hanging a hat on the back-of-door hook and shoes under the chair seat. Housekeeping includes cleaning behind the bed, whose image was revised to expose actual floor behind the headboard. Placement regions were set after visually inspecting the generated artwork. OR examples teach spatial vocabulary, not technical procedure sequencing.

Instruction controls: Voice + text, Voice only, Text only; Slower/Steady/Natural voice speed; replay; explicit text help. Voice-only hides the actual command in the DOM unless help is requested. The first Listen or a mode change unlocks browser speech; subsequent Next commands play after that interaction. Text-only cancels speech. Device voice is labeled honestly; no dedicated HD narration is included. Settings persist on the device, not as assessed learner evidence.

Actions: place and hang require a valid target region; pickup commands require an initial pickup. Cleaning requires movement within the requested region, rather than just placing the brush there. Accessible alternatives allow selecting a region and pressing Clean this area repeatedly. Demonstrations and text/destination help do not award an unaided point. Game results are session-local and do not mark a lesson complete.

## Artwork and app pack

Built-in imagegen was used for original masters. Full prompts: `content/picture-action/image-prompts.json`. Selected master PNG files are saved in the owner’s project hub at `02 Brand and Images/Picture Action Scenes/Masters/`. No reference video footage was downloaded or reused.

`content/picture-action/scenes.json` contains image-specific coordinates, bilingual commands, actions and objects. `src/lib/picture-action.ts` combines that authored source with the original workshop bank. `scripts/build-picture-action-assets.py --masters <folder>` reproducibly creates uncropped 1254px HQ WebP, 768px mobile WebP, and 960px app JPEG variants. No cropping is permitted because it would invalidate placement coordinates. The ZIP includes five optimized JPEGs, hashes/dimensions manifest and a portable scene/command JSON file.

Download: `/downloads/picture-action-app-assets.zip`. The same pack is copied to the project hub under `04 Code and Websites/Language Threshold Native/Picture Action Asset Pack/`. It is ready for native integration; this web change does not claim that new native scene logic, app downloads, Watch assets, or TestFlight uploads have been implemented. Existing V4/V5 native sources were not edited.

## Verification and release

Model checks cover all 36 goals/start points, meaningful cleaning movement, module defaults, exact language pairs, invalid geometry, bounded preference parsing, and the native pack size. Browser checks cover phone/desktop interaction, replay, hidden voice-only text, scene/mode persistence, cleaning gestures, all five images, download availability, main practice entry and lesson/Reader continuity. Preview publication and test evidence are recorded separately after deployment. Production remains unchanged until explicitly released.

Local verification: 33 focused model/catalog/compile tests and 12 browser checks (six cases each on desktop and phone) pass. These include medical/OR defaults, English instruction language, per-module remembered scenes, voice-only hidden text/replay, original course/Reader continuity, real cleaning movement, all scene image loads and the app ZIP. TypeScript and changed-file lint pass; exact hosted preview evidence is saved with the release after publication. Optimized mobile backgrounds total roughly 216 KiB; the five-image native pack with data is about 1.04 MiB.
