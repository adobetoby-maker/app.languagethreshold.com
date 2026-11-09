# Spanish catalog comparison for French and Japanese — 2026-11-09

Read-only source audit at `1e3328da00f25381cbe1ecb241f8b174627a9c88`:

```sh
node /Users/drive/.codex/skills/add-language-threshold-module/scripts/audit-module.mjs --repo . --all
```

The exact Spanish→English catalog has 69 base modules. Japanese→English has 56 catalog modules; 39 have some authored material, but only `japanese-basics` passes the audit's full 60-lesson mapping. French→English has 55 catalog modules and no validated full course in this source audit. These counts describe source structure, not qualified language review, accepted full-course audio, production release, or independent V4 acceptance.

The 14 Spanish catalog IDs absent from both French and Japanese catalogs are `gutters`, `medical-mission-logistics`, `place-directions`, `roofing`, `siding`, `sound-like-a-native`, `spanish-102`, `spanish-basics`, `spanish-cognates`, `spanish-common-patterns`, `spanish-conjugation-patterns`, `spanish-frequent-verbs`, `spanish-usage-verbs`, and `sport-fishing`. Japanese has its separate `japanese-basics` ID. Some absent IDs are Spanish-specific teaching tracks; French and Japanese need their own purpose-aligned lessons rather than literal Spanish grammar or IDs. The five occupational/travel IDs and language-general skills also require explicit equivalence decisions; a missing catalog ID alone does not prove the equivalent content is absent.

The immediate parity work is to inventory each Spanish lesson objective against a stable French and Japanese lesson or a documented language-specific replacement, then validate the actual 10/30/20 content and six authored modes. Keep catalog presence, mapped drafts, qualified review, audio acceptance, website release, and V4 separately recorded. This comparison must be refreshed after catalog changes and cannot be used as a release gate by itself.
