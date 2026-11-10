# French and Japanese pilot listening approval — 2026-11-10

The owner confirmed that every French and Japanese **pilot recording** they heard sounds good and accepted all pilot clips. The earlier pilot batches already recorded this decision. Four later private batches were still pending; their local manifests now record `listeningReviewed:true` for all 40 clips, with the owner decision and date. Each batch was checked against its exact text inventory, two voice identities, file hashes, byte counts, and measured durations before the review flag changed.

| Private pilot batch | Exact-text inventory SHA-256 | Clips | Branch evidence |
| --- | --- | ---: | --- |
| French Roofing, speaking openings F2–4/F6–7 | `030f4abafd4c0628c56ffee5e7bb8421112cc687ac5756068a086df4afaaef9b` | 10 | `364c3a483` |
| Japanese Foreman, Foundation 4–5 | `2d6c5f4429bc44de599a76b72ac1e89d4bc6fe1be629b0996e806e380c818cf4` | 10 | `29f46c2b3` |
| Japanese Roofing, Foundation 1 | `bca36ca73102c26a55df1c8366f41408b60c4df829e1d2987f3eeea36b0df409` | 10 | `8247509f4` |
| Japanese Travel Lunch, Foundation 1 | `6c5dc5a36e8af50a76bbcba510830f768e3f618f38203e176f4f83d1f9668fb8` | 10 | `5d63dfeb2` |

The files and manifests are in `/Users/drive/lt-audio/<batch>/` and remain private. Listening approval covers these pilot recordings only. It does not set `textReviewed` or course `reviewed`, settle terminology or domain review, approve the much larger full-course batches, register playback, or publish incomplete French and Japanese lessons. Those gates remain tracked in the respective draft branches and program ledgers.
