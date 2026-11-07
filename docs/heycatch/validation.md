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
