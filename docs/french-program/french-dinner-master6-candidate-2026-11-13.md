# French Dinner Master 6 — source-grounded candidate

Status: source-pinned owner-only draft on main through #550. No learner registration, audio playback, or progress change. Qualified French and Peruvian-food review remains open.

Source: `src/data/core60/es/master-travel-dinner.json`, lesson 6, SHA-256 `fb455608407244337f08a93e1fd393c8966358f13945cf3760c8b85c2be602be`; `public/lesson-content/es/master-travel-dinner.json`, passage 6, SHA-256 `53f641f4fa66a2aa3b0adbdbbf4133fb7899858d1ea7737d2b52eee341fc0b80`. Preserve `master-travel-dinner:6:fr-en`.

Two read-only Claude CLI calls requested Haiku 5.5 but returned **Sonnet 5.5** metadata. They proposed these 24 French card texts in exact English-source order:

1. la corvina (bar)
2. la sole
3. l’encornet géant
4. la bonite
5. l’athérine
6. la pêche du jour
7. la forte houle
8. le lait de tigre
9. le piment limo
10. la patate douce
11. le maïs à gros grains
12. le maïs grillé
13. le ceviche mixte de fruits de mer
14. le poulpe
15. la texture
16. ferme
17. Alors, les bateaux ne sont pas sortis aujourd’hui à cause de la houle ?
18. Lequel sera le plus délicat, la sole ou l’athérine ?
19. Chef, pourriez-vous nous dire le prix de chacun, s’il vous plaît ?
20. Sam, l’encornet va être plus ferme que la sole.
21. La sole est plus chère, mais je pense que ça vaut le coup.
22. Y aura-t-il de la corvina demain, ou est-ce que ça dépend de la mer ?
23. Lequel préfères-tu, Sam, le plus tendre ou le plus ferme ?
24. Nous allons commander une sole et un mixte à partager.

Self-check corrected item 24 to **un ceviche de sole** so the ordered dish is clear. The 18 aligned Reader turns distinguish the Peruvian currency **soles** from **sole** the fish while preserving the source amounts (58, 48, 38), scallops in the mixed ceviche, and the 15-minute wait. The draft keeps the Peruvian names **pota** and **pejerrey** with descriptive French glosses pending qualified regional terminology review; it does not assert a species equivalence from the preliminary `athérine`/`encornet géant` suggestions. Reader lines, five forms, six source-linked mode cues and speaking roles are now in `content/french-travel-dinner/master-6-draft.json`, with all learner gates closed. Source and focused owner-route checks pass.

Two bounded Opus 5.5 read-only critique attempts timed out without findings. A subsequent direct CLI read-only pass succeeded and reported canonical `claude-opus-5-5` metadata. It found that the Reader lost the small-*but*-fresh contrast for pejerrey, implied tiger's milk was served alongside the ceviche, and used stiff or inconsistent restaurant wording. Source-grounded self-check corrected those lines, restored the Peruvian term *cancha* with its source-supported crunchy-corn gloss, made the future/request examples genuine requests, and removed an extra speaking task that the source did not assign. The critique's proposed biological reclassification of corvina was outside the pinned source and was not adopted; the exact English support meaning remains unchanged. This is AI critique, **not qualified French or Peruvian-food approval**. The exact-text scope contains 42 unique strings/84 fr-FR Aoede/Charon clips and 4,998 submitted characters. At $30 per million characters, estimated synthesis was about **$0.150** before taxes or adjustments. All 84 clips were synthesized privately using quota project `project-91661021-fb2d-4524-b9f` and pass text, voice, source-scope hash, file hash, bytes, duration, and decoded-signal checks. Two clips had just over one second of leading silence; a 0.2-second head trim removed those flags. The final private technical review reports zero signal flags. The [listening worksheet](/Users/drive/lt-audio/french-travel-dinner/master-6/listening-review.html) needs distinct per-clip decisions. Nothing has been bundled or listening-approved.
