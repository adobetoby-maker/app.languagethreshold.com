# Validation — November 7, 2026

Base: current main `33428b531` (PR #242 merge). Work is isolated on `fix/heycatch-website-audit`.

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed; only the existing generated-route ignore warning.
- `git diff --check`: passed.
- 27 targeted unit tests passed: team pricing, individual checkout, navigation menu, app navigation, sitemap freshness.
- Local Chrome browser checks passed at 1440px and 390px with touch/mobile mode on the latter: homepage plus pricing, three comparison pages, support and team; one homepage h1, self canonicals, page-specific social URLs, no horizontal overflow, eight working FAQ disclosures, FAQ schema, five actual paid offers, correct Junior Linguist domain, founder photo and profile link. Phone primary navigation stays visible; desktop tools can be revealed. No page JavaScript errors observed.
- Raw served HTML separately checked for canonical and og:url on pricing, all three comparisons, support and team: correct before JavaScript.
- Full `desktop-navigation.spec.ts` across desktop and iPhone emulation initially reported **10 passed, 3 skipped, 6 failed**. A follow-up isolated the Japanese direct-link behavior; it still fails because the current menu exposes Character Studio, while the legacy assertion expects Kana Pad. Unchanged main reproduces that failure, and also reproduces Exams/menu-label failures. These older navigation assertions are not a passing release gate. The baseline subset reported 5 failed, 3 passed, 1 skipped; a separate baseline Kana run reported 1 failed, 1 passed. All six original failures reproduce on unchanged main. Concurrent baseline reporters also collided on a trace output, so that artifact error is a test-runner issue, not an app claim. No claim is made that the full suite passes.
- Founder profile: local photo copied from the source used by the newer profile site. Requested custom domain returns HTTP 404 “Build incomplete”; flagged for republishing.

The audit's missing customer evidence remains gated off the public page. No signup counter is connected to live user data. No authenticated AI session capture was fabricated. Production Safari, page-weight and performance measurements still need a deployed build/device check. This change has not been merged or deployed.

## Owner-directed FAQ and ClinicaLingo revision

The owner asked to emphasize daily work and explain the interpreter-test limitation once, rather than repeat discouraging caveats. Revised the shared homepage/pricing FAQ and its automatically derived structured data, plus the homepage scope line. ClinicaLingo's public practice page listed 29 scenarios when checked November 7, 2026; its homepage advertised 30 for upcoming Pro. Added concise topic summaries and direct source links, and removed the unspecified catalog/organization placeholders. Scenario counts are explicitly distinguished from course lesson counts.

TypeScript, lint and diff checks pass. Chrome checks at 390px touch/mobile and 1440px desktop pass: revised FAQ expands, old clinical-review question is absent, FAQ schema matches the new copy, all 29 topic summaries render, catalog source link is present, and the comparison has no horizontal page overflow.

## Duolingo and CanopyLearn topic lists

Added the same expandable, source-linked catalog treatment to the remaining comparisons. Duolingo has 14 illustrative communication topics drawn from its own early-topic and CEFR milestone guides; these are explicitly examples, not an exhaustive or fixed lesson count. Replaced its unspecified organization row with documented exercise formats. CanopyLearn has all 36 lesson-topic summaries grouped into its three 12-lesson levels, including reviews, from its 2026 Medical Spanish PDF. Rendered and visually checked all three syllabus tables to verify level placement and order; its syllabus states approximately 45 content hours. Replaced the organization placeholder with documented practice formats.

TypeScript, lint and diff checks pass. Chrome checks pass for both pages at 390px touch/mobile and 1440px desktop: expand/collapse behavior, 14 Duolingo topics, three Canopy levels with 12 entries each, self canonicals, absence of old placeholders and no horizontal page overflow. Source links are included next to each topic list. Shared FAQs remain focused on daily work.

## Four-product role matrix and real lesson previews

Added `/compare` with products as columns and actual Spanish role courses as rows, separated into Medical, Trades and Coaching & Sports. The generated source snapshot has 35 courses / 2,070 lessons (690 medical, 720 trades, 660 sports). A partial course remains 30 rather than being rounded to 60. Shared sports/coaching roles are not double-counted. CEFR labels are kept distinct from job coverage. Published related competitor material is identified rather than assigned invented specialty proficiency ratings. Recommendations change according to the visitor's goal.

Visitors can select any included role, inspect its complete real lesson list, view a Core speaking task and a Master task, play an existing exact-match recording when available, and open the corresponding lesson or speaking workspace. Four small previews are added to the homepage. All three comparison pages and the shared footer link to the matrix. Production builds regenerate the catalog; the drift test prevents stale counts. See `role-comparison-methodology.md` for sources, scope and remaining external priorities.

Validation: TypeScript, lint and diff checks pass. Four catalog/sitemap tests pass, including data regeneration, sample identity, non-duplication and recording-file existence. Chrome checks at 390px touch/mobile and 1440px desktop pass for all three category counts, column order, role switching, 60-lesson catalog disclosure, lesson/speaking links, local recorded playback, recommendation switching and no horizontal page overflow. The comparison table intentionally scrolls horizontally inside its labeled region on phones. The page and screenshots were visually inspected. No paid speech generation or live AI calls were needed for these checks. Existing broader navigation baseline limitations remain as recorded above.

## Public scenario catalog and program levels

Added `/scenarios`: source-generated Spanish/English inventory of 5,289 speaking tasks across 69 practice areas. The catalog includes lesson tasks, roleplays, verbs and grammar; counts are distinct from course lesson counts. Only the selected area's full task JSON loads, with a small server-rendered example list available first. Visitors can filter area, role, actual task level and text, expand objectives and open the exact speaking mission. Core Speaking links use the app's `module=core` convention. Abort handling prevents stale fetches replacing another area's list.

The published scope is “A1–B1 structured speaking, with advanced role-specific Master practice.” These are actual speaking labels, not a general-language exit assessment. Council of Europe descriptors explain A1/A2/B1/B2/C1/C2; there is no B3. This review does not relabel curriculum or claim a certified B2 outcome. Homepage, comparison and footer link to the catalog.

Validation: TypeScript and targeted ESLint pass. Three source/catalog tests pass, covering regeneration, inventory counts, unique IDs, task levels and exact mission-link parameters. Main marketing homepage gets a matching comparison, level explanation and real scenario examples in its own repository/PR; release the app catalog before those production links.

Browser checks pass at 1440px and 390px: filters, search, pagination, empty state, no horizontal page overflow. Network failure keeps examples visible and retry restores the full list. Exact Core Speaking and Nursing Master links open the intended mission without starting an AI session. The first deployed preview exposed a missing CDN route for the scenario JSON; added the explicit static route before the SSR catch-all and rechecked the deployed asset.
