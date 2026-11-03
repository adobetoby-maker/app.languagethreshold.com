# Native V3/V4 audio reused by the website

November 3, 2026: 16,434 native recordings / 8,217 exact texts exported without synthesizing new audio. Both original app source folders remain unchanged. SHA256 and ffprobe duration validation cover every exported native clip.

The current public website lesson files match 7,722 native texts; 7,706 of those lack a matching Chirp recording. Native filenames remain stable under public/audio/native-v3. The lookup retains accents, normalizes whitespace/trailing punctuation, rejects unsafe paths and mismatched gender, and excludes other target languages and Spain voices.

The playback preference is an exact existing Chirp recording first, followed by a matching native-app recording in the selected female/male voice. V3's generated recordings use Gemini 2.5 Flash TTS, Aoede/Charon, with a Costa Rican accent prompt. They are not relabeled as Chirp. The 310 earlier source-imported clips retain unverified original model provenance in the inventory. They are still validated playable recordings mapped by the original native manifests.

Junior Linguist also receives exact matches from its own Spanish vocabulary/stories. No adult medical catalog is added. The central library keeps separate Chirp and native model identities, with a running total of reusable clips and source exports.

Verification: 11 website recording contract checks; website TypeScript; 4 Junior playback lifecycle checks; Junior production build; female/male native MP3 playback through local website URLs in Chrome.

Publication: local source integration only. These files have not been deployed to either live website. The medical HD batch is now complete: 40,106 required clips, zero missing; its completed recordings are included in this source snapshot.
