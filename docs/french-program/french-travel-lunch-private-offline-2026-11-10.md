# French Lunch private offline text candidates

Three content-addressed exact `French:English` text candidates derive from the disabled 60-lesson private runtime candidate. The source SHA-256 is `cd641ba438419d9928c320c8791f45507fea614660e5dfed72cd5fe6f34cdf51`. Each stage retains its stage-local IDs, cards and their exact dictionary entries, aligned Reader and passage text, speaking scenes, six authored mode inputs and verb examples.

| Pack ID | Lessons | Cards | Dictionary entries | Content bytes | SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- |
| `foundation-travel-lunch-fr-en` | 10 | 159 | 158 | 154,720 | `ab147007de3d0989a07094da9ef2764a957d90fa98761a760059b381b5b5d2cb` |
| `travel-lunch-fr-en` | 30 | 451 | 414 | 479,611 | `2d80f86893159a4700c193dec49266bcaa27ec22351250d61179dba498e49a58` |
| `master-travel-lunch-fr-en` | 20 | 338 | 327 | 388,856 | `ad051ec4d2bf1b372695a4d960aa174e84ff533c1f52d2f827c5aa68a93231fd` |

`python3 content/french-travel-lunch/build-private-offline-candidates.py --check` rebuilds and compares the exact bytes and filenames. The focused Node test checks pair/stage/content and dictionary hashes, all source lesson payloads, card counts and nonregistration. Every manifest has `releaseEnabled:false`, `workerAllowlistEnabled:false`, `appAssetInventory:null`, `installationStatus:"not-installed"` and `content.routeCandidate:null`. Candidate cache and progress scopes include the exact language pair and stage. The files stay under `content/french-travel-lunch/private-offline/`, outside public lesson packs; neither the worker nor service-worker registry names these IDs. The candidate bytes include no audio, device voice or offline AI conversation.

These are reviewable text-pack inputs, not installed offline lessons. Qualified French/content and dictionary review, audio listening approval, pair-safe public runtime and progress wiring, actual offline install/reload testing, browser/phone checks and independent V4 acceptance remain open. Spanish lesson and progress identities were not changed.
