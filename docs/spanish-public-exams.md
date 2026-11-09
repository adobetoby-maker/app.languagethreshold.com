# Free Spanish module exams

The public entry point is `/exams?target=Spanish&native=English`. The welcome screen links to it. No account, purchase, service-role key or paid generation is required to take these study checks.

## Behavior

- Placement uses existing authored lesson vocabulary and contextual cloze checks in five-lesson blocks. It estimates the first block to revisit, continuing from Foundation through Core and Master where those stages exist. The estimate is lesson-relative, not a CEFR proficiency rating.
- Post-Core tests cover all 30 Core lessons with 60 questions, continue after wrong answers, show a score and direct links to lessons to revisit, and allow unlimited fresh attempts.
- Each attempt draws from the module's own Spanish/English material. Results do not grant lesson-completion credit. Speaking is not assessed.
- Tests run in the browser and results are held for the current page visit. Reloading ends the attempt. There is no account history or certificate in this release.
- These checks use public lesson material, not the separately reviewed private exam banks. Formal bank approval, scheduled assessments, owner access and saved learner progress are unchanged.

## Source coverage

`spanish-exam-coverage.json` records all 69 Spanish/English base modules, excluding duplicate Foundation/Master catalog entries. All 69 load both placement and a complete 30-lesson post-Core check. Medical Mission Logistics currently has a 30-lesson placement path; other audited paths contain 60 lessons. This is source and wiring evidence, not independent psychometric or linguistic approval of each generated question.

Reproduce the count-only audit from the repository root:

```sh
EXAM_SOURCE_REVISION=$(git rev-parse HEAD) node scripts/audit-public-module-exams.mjs
```

The audit reads public static content from this checkout, makes no service calls and writes only coverage metadata. It refuses a successful exit if any module has missing placement coverage or an incomplete post-Core check.

## Verification

- TypeScript and lint checks passed.
- Production build and Vercel artifact/private-bank scan passed.
- All 2,942 unit tests passed with compiler-cache access.
- Guest flows verified on desktop and iPhone-sized Chromium: placement recommendation, all 60 post-Core questions, results, fresh retake and no horizontal overflow. No real users or exam sessions were created.

Run the saved guest regression against a local app with public Supabase configuration:

```sh
E2E_BASE_URL=http://127.0.0.1:3478 npx playwright test --config e2e/free-spanish-exams.config.ts
```

Release status: implemented and verified locally; not deployed by this change.
