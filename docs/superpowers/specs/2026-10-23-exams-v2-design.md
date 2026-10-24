# Exam design: fixed checkpoints A/B/C, a 50-question adaptive diagnostic, and a public mode

## 0. Things found in the code that change the brief

- **Name clash with "master".** The app already has `master-<trade>` modules: `isMasterModule()` in `src/lib/core30-plan.ts`, `src/data/master-roofing-curriculum.ts`, and a 20-lesson / 70-day pace. Calling the new exam "Master exam" will confuse people. Use **"Roofing Spanish Diagnostic"** (internal kind `diagnostic`); the marketing name can be "Roofing Spanish Check".
- **Email capture was retired on purpose.** `src/routes/api.capture-email.ts` returns 410 with the comment that its legacy endpoint "must not collect contacts". Lead capture is therefore an owner privacy decision. The default here is "create a free account to save your study map", which attaches the session to the new account. Optional email capture stays behind a flag that is off by default.
- **The public diagnostic exposes its items to anyone**, so its pool must not share any item with A/B/C. Form C is the certificate exam.
- **The timing fits the existing plan.** `CORE30_NEW_LESSON_EVERY_DAYS = 3` and `CORE30_PLAN_DAYS = 90` mean day 45 falls at lesson 15 and day 90 at lesson 30, which matches A/B/C exactly. Day 0 comes from `Core30ModuleLog.startDate` in `profiles.data`.
- **Lesson links already exist.** `moduleLessonUrl()` in `src/lib/learning-link.ts` produces `/?module=roofing&tab=core30&target=Spanish&native=English&lesson=N&way=see|recall`.
- **Rate limiting already exists.** `consumeServerRequestBudget()` in `src/lib/speaking-security.ts` plus the IP and origin pattern in `src/lib/voice-catalog-security.ts` work with no migration.

## 1. Recommendation: a lightweight new path beside the engine, with one small additive migration

**Why not slim the existing engine.** It runs on about 26 migrations and many triggers: frozen-snapshot guards, `assessment_targeted_attempt_insert`, route guards, speech-reference validators, and lesson-binding guards on releases. Several of its rules contradict the owner's model:
- `validateFormDefinition` requires all six skills, including speaking and writing, each with at least 3 objectives.
- `assessment_start_attempt` ties forms to the enrollment's release.
- `lessonReleaseReadiness` makes exams unavailable whenever any lesson text changes.
- `officialFormAvailable` requires `calibrated`, a statistical claim we can't honestly make.
- Checkpoint kinds are a CHECK constraint (`entrance|day45|day90`), so a diagnostic doesn't fit.
- Day-45 coverage is per learner (`studied`/`transfer`), against "the same for everyone".

Bypassing all that means fighting triggers or adding migrations to relax them. That costs more migrations, not fewer.

**Why not zero migrations.** I checked it:
- `team_assessment_attempts` has generic columns, but `organization_id` is NOT NULL, so personal learners can't use it.
- `profiles.data` can be written by the client, so results there could be forged (fine for a study map, not for the certificate).
- Banks could go in `assessment_forms` rows, but the `checkpoint` CHECK would force the diagnostic bank into a fake `entrance` row, and old engine code would see it.
- A new Storage bucket safely needs a restrictive `storage.objects` policy, which is itself a migration (precedent: `20261016115847`).

**Choice: one additive migration, two service-only tables, no functions or triggers.** The owner applies it once. All logic lives in TypeScript.

```sql
-- exams v2: hand-made fixed checkpoints + adaptive diagnostic. Item content is private (service role only).
create table public.exam_banks (
  module_id text not null check (module_id ~ '^[a-z][a-z0-9-]{0,79}$'),
  target_language text not null, instruction_language text not null,
  version text not null check (version ~ '^v[0-9]{1,4}$'),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text) <= 3000000),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  review_records jsonb not null default '[]' check (jsonb_typeof(review_records)='array'),
  approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (module_id, target_language, instruction_language, version),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null
         and jsonb_array_length(review_records) >= 2))
);
create unique index exam_banks_one_approved on public.exam_banks(module_id,target_language,instruction_language) where status='approved';

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null, target_language text not null, instruction_language text not null,
  bank_version text not null,
  kind text not null check (kind in ('A','B','C','diagnostic')),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.team_organizations(id) on delete set null,
  public_secret_hash text check (public_secret_hash ~ '^[0-9a-f]{64}$'),
  seed text not null,
  step integer not null default 0 check (step between 0 and 200),
  served jsonb not null default '[]' check (jsonb_typeof(served)='array'),
  responses jsonb not null default '[]' check (jsonb_typeof(responses)='array' and octet_length(responses::text) <= 200000),
  result jsonb,
  score numeric, total numeric,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  ip_hash text, lead_email text, lead_consent_version text, lead_consented_at timestamptz,
  started_at timestamptz not null default now(), completed_at timestamptz,
  check (user_id is not null or public_secret_hash is not null),
  check (kind = 'diagnostic' or user_id is not null),
  check ((status='completed') = (completed_at is not null))
);
create index exam_sessions_user_idx on public.exam_sessions(user_id,module_id,kind,started_at desc);
create index exam_sessions_org_idx on public.exam_sessions(organization_id,module_id,kind) where status='completed';
create unique index exam_sessions_one_open on public.exam_sessions(user_id,module_id,kind) where status='in_progress' and user_id is not null;
alter table public.exam_banks enable row level security; alter table public.exam_sessions enable row level security;
revoke all on public.exam_banks, public.exam_sessions from public, anon, authenticated;
grant all on public.exam_banks, public.exam_sessions to service_role;
```

**What happens to each existing gate:**

| Gate | Decision |
|---|---|
| Service-role-only item definitions | **Keep** (`exam_banks`, deny by default) |
| Public-field whitelist (`publicAssessmentItem` pattern) | **Keep** (new `publicItem()`) |
| Deterministic scoring with `AnswerPolicy` | **Keep**: reuse `scoreFixedAnswer` / `normalizeAssessmentAnswer` from `src/lib/assessments/core.ts` |
| Private authoring files outside the repo (from `import-assessment-draft.mjs`) | **Keep** |
| `review_records ≥ 3` | **Replace** with 2 blind reviews in `review_records` plus a separate owner approval (`approved_by`/`approved_at`, which must match `content_sha256`). Recorded truthfully: agents can never approve. |
| `verified` + `calibrated` | **Drop**. Results are labelled as a hand-made, owner-approved test, not statistically equated. |
| Lesson snapshot fingerprint (runtime) | **Drop at runtime**. The bank stores a hash per lesson source; an offline drift check warns the owner. |
| `LT_EXAMS_PILOT_USER_IDS` | **Replace** with an approved bank plus env kill switches `LT_EXAMS_V2`, `LT_EXAMS_PUBLIC` |
| Private audio, listening, speaking, writing, AI grading | **Drop** for v1 (auto-scored item types only) |
| Per-learner day-45 coverage | **Drop**. B is lessons 1–15 for everyone. |

The legacy engine is frozen, not deleted: its tables, history and the `/exam-content` and `/exam-reviewers` routes stay, and the `ExamsArea` entry is hidden behind a flag. The legacy 25-question roofing test is hidden once C launches. Passes already earned still count toward the certificate.

## 2. Item bank format, storage and validation

**Storage:**
- Authoring files live outside the repo, e.g. `/Users/drive/lt-private/exam-banks/<module>-es-en-v1.json`. The import script refuses paths inside the repo, like the existing script does. Never put them in `.foreman`, which is inside the worktree.
- Import goes into `exam_banks` (status `draft`) through the service role. The server loads the approved bank, caches it in memory keyed by sha, and only `src/lib/exams2/*-server.ts` imports it.
- The client never receives a private item. `verify-vercel-artifact` gets a check that client chunks contain no `correctOptionId`, `accepted` or `distractorRationale`.

**Bank file:**
```ts
interface ExamBank {
  schema: 1; moduleId: "roofing"; targetLanguage: "Spanish"; instructionLanguage: "English"; version: "v1";
  lessons: { lesson: number; title: string; sourceHash: string }[];      // 30
  items: BankItem[];
  forms: { A: string[]; B: string[]; C: string[] };                      // frozen ordered id lists
  diagnosticPool: string[];
  reviews: BlindReview[];                                                // ≥2
}
interface BankItem {
  id: string;                 // `${module}.L07.i03`, never reused; edits bump `rev`
  rev: number;
  lesson: number;             // 1..30
  skill: "recognize" | "recall" | "use" | "understand";   // es→en / en→es / situation→phrase / read crew line→meaning
  difficulty: 1 | 2 | 3;      // authored; diagnostic b = -1 / 0 / +1
  type: "mc" | "typed" | "match";
  prompt: string;             // ≤300 chars; states the answer language
  context?: string;           // short scene or crew line (≤300)
  options?: { id: string; text: string; distractorRationale?: string }[];  // mc: 4
  correctOptionId?: string;
  accepted?: string[];        // typed: canonical answer first, then accepted variants
  policy?: { accents: "ignore" | "require"; caseSensitive: false; punctuation: "ignore" };
  pairs?: { left: string; right: string }[];               // match: 4
  explanation: string;        // shown after finishing (A, B, diagnostic); never for C
  sourceRefs: string[];       // lesson words or phrases the item tests
  author: string;             // agent id
}
interface BlindReview { reviewer: string; independentOfAuthor: true; at: string; bankSha256: string;
  verdicts: Record<string, "accept" | "revise" | "reject">; notes: Record<string, string> }
```

**Validator** (`src/lib/exams2/bank.ts` `validateBank()`, run by the script, by the import, and again at owner approval):
1. Structure: ids unique and matching the pattern; lesson 1–30; every enum valid; `explanation` ≥ 20 chars; `sourceRefs` not empty.
2. Multiple choice: 4 options; option texts unique after normalizing; exactly one correct; every wrong option has a `distractorRationale`; no "all/none of the above". Across the bank, the correct answer may be the longest option in at most 40% of items.
3. Typed: at least one accepted answer; normalized variants unique; accents ignored by default (`require` only when the accent changes the meaning); no accepted answer appears in the prompt.
4. Match: 4 pairs; left and right sides unique.
5. Forms:
   - A = exactly 1 item per lesson, lessons 1–30.
   - B = exactly 2 per lesson, lessons 1–15.
   - C = exactly 2 per lesson, lessons 1–30.
   - A, B, C and the diagnostic pool share no items.
   - A and C have matching difficulty per lesson (mean difference ≤ 0.15).
   - Each form's type mix: multiple choice ≥ 50%, typed 20–35%, match ≤ 15%.
   - No item's answer appears in another item's prompt within the same form (cueing).
6. Diagnostic pool: at least 5 items per lesson, including at least one of each difficulty and at least one typed.
7. No duplicate prompts across the bank after normalizing.
8. Reviews: at least 2 blind reviews, each covering every item id, by a reviewer who is not the item's author, signed against the current `bankSha256`. No item may have a `reject` verdict. A `revise` verdict needs a new `rev` and a re-review of that item.
9. Drift warning: each lesson's `sourceHash` against current repo lesson content (words and phrases from `src/data/roofing-curriculum.ts` / `roofing-lesson-words.ts`). This warns; it doesn't block.
10. Scripts never print prompts or answers, only ids and counts.

**Sizes per module:** about 300 approved items, drafted as about 360.
- Fixed forms: 120 items (A 30, B 30, C 60).
- Diagnostic pool: 150 items (5 per lesson, three times the 50-item session, so exposure stays low).
- Spares: 30 (1 per lesson, for retirements and a future C2).
- Per lesson: 9–11 items.

## 3. Fixed forms A/B/C

| | Opens | Content | Items | Mark |
|---|---|---|---|---|
| A (baseline) | day 0 (soft window until lesson 3 is done or day 7; later attempts are labelled "late baseline") | lessons 1–30, one each | 30 (~10 min) | none; it's the baseline |
| B (midpoint) | day 45, or earlier once lessons 1–15 are mastered | lessons 1–15, two each | 30 | "On track" at ≥ 70% |
| C (final) | day 90, or once all 30 lessons are mastered | lessons 1–30, two each, built to match A's blueprint | 60 (~20 min) | **pass at ≥ 80%** |

- **Frozen:** the ordered id lists are part of the bank content and the sha256 the owner approved. Each session stores `bank_version`. Any change means a new bank version and a new approval. Everyone gets the same items in the same lesson order; only multiple-choice option order is shuffled, using the session seed. The owner can turn that off.
- **Scoring:** 1 point per item; match items earn 0.25 per correct pair. Score is shown as a percent, overall and per lesson.
- **Saving:** all public items are sent at start, answers autosave, and submit scores everything on the server.
- **Retakes:** A once. B unlimited with a 1-hour cooldown. C allows 3 attempts per 30 days with a 24-hour cooldown; best score counts.
- **What the learner sees, instantly:** score, a per-lesson table, and missed lessons linked to `moduleLessonUrl(... way:"recall")`. A and B also show each item with the correct answer and explanation. C shows only which lessons were missed, never answers, so the cert form doesn't leak. After C, the learner sees A→C growth: "baseline 37% → final 86%", with the caveat "same blueprint, not statistically equated".
- **Team admin:** per learner, the latest and best A/B/C percent with dates, C pass status, and A→C growth. A team-wide "lessons your crew misses most" list ranks lessons by mean per-lesson score.
- **Certificate** (`src/lib/team-certificate.ts`): keeps the existing conditions (`require_certificate`, active learner, active entitlement, all 30 lessons complete). The score condition becomes: best completed C session for that org ≥ 80%, recorded in `team_certificates` as `version 2` with `score = round(pct)`. The DB check `score between 80 and 100` still holds. Legacy 20/25 passes still count. Personal learners get a "Module complete" badge, not a team certificate.

## 4. Adaptive diagnostic

Fixed length of 50 questions. Selection is stateless: the next item is a deterministic function of (bank, seed, responses), recomputed on every request. Resuming therefore works on any device, and the server can check that the answered item is the one it served. An **"I don't know"** button counts as wrong with no guessing allowance; the UI encourages it because it makes the diagnosis more accurate.

**Model:** a simple 1-parameter logistic model with a guessing floor and a Gaussian (Laplace) update. In plain terms: each lesson gets an estimated level and an uncertainty, and every answer nudges the level and shrinks the uncertainty.

```
b(d) = {1:-1, 2:0, 3:+1}[d]
c(item) = mc ? 0.8/options : 0             // guess floor; 0 for typed/match/"don't know"
p(θ,i) = c + (1-c)·σ(θ - b)
update(μ,v,i,y):                            // y ∈ {0,1}, or a fraction for match
  s=σ(μ-b); p=c+(1-c)s; dp=(1-c)s(1-s)
  I = dp²/(p(1-p)); v' = 1/(1/v + I); μ' = μ + v'·(y-p)·dp/(p(1-p))
estimate(responses):
  G = fold(update, {μ:0, v:1.5}, all responses)                    // overall level
  for each lesson ℓ: L[ℓ] = fold(update, {μ:G.μ, v:0.8+G.v}, responses in ℓ)
  mastery m_ℓ = σ(L[ℓ].μ)                    // chance of getting a medium item right
classify(ℓ): sd=√v
  strong if m ≥ .75 and σ(μ-sd) ≥ .55;  new if m < .45;  else shaky
  confidence: sd<.6 high, <.9 medium, else low
```

**Selection:**
```
SWEEP = [2,8,14,20,26,5,11,17,23,29]       // first 10: spread across the module, medium items
next(step):
  if step==50: finish
  E = estimate(responses); used = served ids
  if step<10: ℓ = SWEEP[step]; target = G.μ
  else:
    uncovered = lessons with n=0; remaining = 50-step
    cand = uncovered.length >= remaining ? uncovered : lessons with unused items and n<4
    score(ℓ) = (n_ℓ==0 ? 3 : 1) · sd_ℓ · exp(-½·(min(|μ-logit .75|, |μ-logit .45|)/sd_ℓ)²)
    ℓ = seededPick(top 3 within 10% of best, seed, step)
    target = L[ℓ].μ
  items = unused pool items in ℓ
  prefer typed if step≥30 and typedCount<8; avoid the same type 3 times in a row
  i = seededPick(the 2 items with smallest |b-target|)      // spreads item exposure
  return publicItem(i)
```

Guarantees: all 30 lessons get at least one item, at most 4 items per lesson, 50-item cap, and at least 8 typed items. A later offline step can re-fit item difficulties from logged responses once a module has ≥ 200 sessions, published as a new bank version.

**Server flow** (`/api/exam-check`, action `answer {sessionId, step, itemId, answer, requestId, secret?}`):
1. Load the session and check ownership (user id, or `sha256(secret)` for public sessions).
2. Check that `itemId === served[step]`.
3. Score on the server.
4. Recompute the next item.
5. Write with an optimistic check: `update … where id=? and step=? and status='in_progress'`. If no rows change, return the current state; repeating a `requestId` is harmless.
6. Return only the next public item. There is no feedback per item during the test.

At step 50 the server stores `result` and sets `status='completed'`.

**Result and study map:**
```ts
{ overallPct: round(mean(m_ℓ)·100),            // "You already know about 41% of Roofing Spanish"
  lessons: [{ lesson, title, status, mastery, confidence, seen, correct,
              href: moduleLessonUrl({moduleId, target, native, lesson, way: status==='new'?'see':'recall'}) }],
  startHere: first lesson in order that isn't strong,
  studyOrder: [...shaky by lesson, ...new by lesson], strong: [...] }
```
After finishing, the learner can review missed diagnostic items with answers and explanations. That's safe because the pool shares nothing with A/B/C. A "Practice my shaky lessons" button links into those lessons.

## 5. Public marketing mode

- **Routes:**
  - `/check/roofing`: public landing page that search engines can index (title and description, `Quiz` JSON-LD, OG card, sitemap entry).
  - `/check/roofing/run`: the runner, `noindex`.
  - `/check/roofing/r/<shareId>`: opt-in share page showing overall %, strong/shaky/new counts and the CTA. No PII, no item content.
- **No sign-in:** `start` creates a session with `user_id null`, a random 32-byte secret returned once and kept in localStorage, and `public_secret_hash` stored. Sessions can resume for 24 hours.
- **Abuse limits** (reusing `consumeServerRequestBudget`):
  - Same-origin check, as in `voiceCatalogOriginDenied`.
  - Starts: 5 per IP per hour, 20 per IP per day, 500 globally per hour.
  - Answers: 120 per session per minute.
  - The IP is stored only as a salted hash, not raw.
  - No answer key is ever sent before an answer. Items are drawn only from the diagnostic pool, with the randomized pick above for exposure.
  - The kill switch `LT_EXAMS_PUBLIC` covers the rest. Turnstile can be a later ticket if abuse shows up.
- **Lead capture:**
  - Default: "Save your study map: create a free account". On sign-in, a `claim {sessionId, secret}` action sets `user_id`, and the study map then appears in the app.
  - Optional email field behind `LT_EXAMS_LEAD_CAPTURE` (off), with an explicit consent checkbox. Stored in `exam_sessions.lead_email`, `lead_consent_version` and `lead_consented_at`.
  - The owner must approve this and the privacy policy wording first, because of the retired endpoint.
  - Unclaimed public sessions are deleted after 90 days (cron ticket).
- **Results page:** the same study map; lesson links lead to pricing/signup when the visitor isn't entitled. CTA: "Start Roofing Core 30, 90 days, one lesson every 3 days".

## 6. Tickets

| # | Ticket | Write set | Depends on | Gates | Owner action |
|---|---|---|---|---|---|
| T0 | Decisions: names, lead capture, C retake policy, option shuffle | none | none | none | **yes** |
| T1 | Migration (SQL above) | `supabase/migrations/2026102x_exams_v2.sql` | T0 | SQL review, `npm run test:assessment-db` locally | **apply migration** |
| T2 | Bank types, validator, fixed-form scoring | `src/lib/exams2/{bank,scoring,public-item}.ts`, `tests/exams2-bank.test.mjs` | none | typecheck, lint, test | none |
| T3 | Adaptive engine (pure) and simulation tests | `src/lib/exams2/adaptive.ts`, `tests/exams2-adaptive.test.mjs` | T2 | tests: 500 simulated learners give ≥ 85% exact strong/shaky/new agreement, 30/30 coverage, max item exposure ≤ 45% | none |
| T4 | Authoring scripts | `scripts/exams2-validate.mts`, `scripts/exams2-import.mjs`, `scripts/exams2-drift.mts` | T2 (+T1 for import) | test, lint; scripts refuse in-repo paths and print no content | none |
| T5 | Roofing bank: agents draft about 360 items from Core 30 content, then 2 independent blind reviews | private files only | T4 | validator clean | none yet |
| T6 | Server API | `src/lib/exams2/server.ts`, `src/routes/api.exam-check.ts`, `tests/exams2-api.test.mjs` | T1, T2, T3 | typecheck, lint, test (no private keys in responses), build | none |
| T7 | Owner approval page: shows bank, reviews and sha; records `approved_by` from the authenticated owner | `src/routes/exam-bank.tsx`, `src/routes/api.exam-bank.ts` | T1, T2 | typecheck, lint, build, screenshot | **owner signs off in UI** |
| T8 | Learner UI (A/B/C windows from `startDate`, runner, results, study map) | `src/components/exams2/*`, `src/routes/exams.tsx` (flag switch only) | T6 | typecheck, lint, build, `e2e/exams2.spec.ts`, mobile and desktop screenshots | none |
| T9 | Public mode | `src/routes/check.$module.tsx`, `src/routes/check.$module.run.tsx`, `src/routes/check.$module.r.$shareId.tsx`, sitemap | T6, T8 components | build, e2e signed out, Lighthouse SEO, screenshots | approve copy |
| T10 | Team reporting, certificate v2, legacy test hidden | `src/routes/api.team.ts`, `src/routes/team.tsx`, `src/lib/team-certificate.ts`, tests | T6 | typecheck, lint, test (cert rule), e2e team, screenshots | none |
| T11 | Bundle privacy check | `scripts/verify-vercel-artifact.mjs` | T6 | build and verify | none |
| T12 | Go live: import roofing v1, approve, set `LT_EXAMS_V2` / `LT_EXAMS_PUBLIC` | none | all | smoke on preview, then production | **env and approval** |
| T13–14 | Gutters, then siding banks (repeat T5 and T7) | private files only | T12 | validator | **sign-off for each** |

T2/T3/T4 and T7/T8 can run in parallel; their write sets don't overlap. T10 owns `team.tsx`, so hiding the legacy test is folded into it. Rough effort: about 6–7 dev-days for code, plus 1–2 agent-days per module bank.

---

### Summary for the lead

- **Approach:** build a lightweight path beside the existing engine rather than slimming it. The engine's triggers and its rules (six skills including speaking, `calibrated`, lessons fingerprint, per-learner day-45 coverage, checkpoint CHECK) conflict with "hand-made, the same for everyone, auto-scored". Bypassing them would need more migrations, not fewer.
- **Migration:** zero migrations doesn't work cleanly. `team_assessment_attempts` needs an org, so personal learners can't use it; `profiles.data` can be forged; new Storage needs a policy migration. So: **one additive migration** with two service-only tables (`exam_banks`, `exam_sessions`) and no functions or triggers.
- **Your interpretation holds.** A/B/C as fixed lists of 30, 30 and 60 items; C pass at 80% feeds team certificate v2, and legacy passes still count. The diagnostic is 50 items with a simple per-lesson Bayesian update, stateless selection that guarantees all 30 lessons are covered, and a strong/shaky/new study map linking to `/?module=…&tab=core30&lesson=N`.
- **Banks:** about 300 items per module, with the diagnostic pool sharing nothing with A/B/C. They're authored outside the repo and validated by script. Two blind reviews plus owner approval are recorded against the bank's sha256, and only the authenticated owner can approve.
- **Decisions needed from the owner:**
  - Rename the "master exam": "master" already names the `master-<trade>` modules.
  - Lead capture: email capture was retired on purpose. The default is account-claim, with email behind a flag that is off.
  - Apply the migration.
  - Approve banks in the UI.
  - Set the env flags.

### Critical Files for Implementation
- /Users/drive/lt-worktrees/master/src/lib/assessments/core.ts (reuse `scoreFixedAnswer` / `normalizeAssessmentAnswer`)
- /Users/drive/lt-worktrees/master/src/lib/team-certificate.ts (C ≥ 80% rule, certificate version 2)
- /Users/drive/lt-worktrees/master/src/routes/api.team.ts and /Users/drive/lt-worktrees/master/src/routes/team.tsx (team reporting, hiding the legacy test)
- /Users/drive/lt-worktrees/master/scripts/import-assessment-draft.mjs (pattern for private import outside the repo)
- /Users/drive/lt-worktrees/master/src/lib/learning-link.ts and /Users/drive/lt-worktrees/master/src/lib/speaking-security.ts (study-map links; public rate limits)
## Owner decisions (2026-10-23)
- Adaptive test name: "<Trade> Spanish Check" (e.g. Roofing Spanish Check). Internal kind `diagnostic`. Never call it "Master".
- Public lead capture: free account to save results (claim flow). No email capture (LT_EXAMS_LEAD_CAPTURE stays off / not built in v1).
- Migration: lead writes it; owner applies it. Nothing touches production until then.
- Test C retakes: unlimited, best score counts, no cooldown. C still never reveals answers. Pass at 80%.
- Scope order: roofing first, then gutters, siding. Auto-scored item types only (mc, typed, match).

## Implementation notes: T1-T4 (2026-10-23, branch feature/exams-v2-core, incl. fix round)

**T1 migration** (`supabase/migrations/20261024090000_exams_v2.sql`, still not applied; the owner applies it). Changes from the SQL in section 1, made in the fix round:
- `exam_banks.approved_sha256`, with the check `(status <> 'approved') or (approved_sha256 is not null and approved_sha256 = content_sha256)`. An approval therefore names the exact content it approves; a NULL hash cannot pass.
- `exam_sessions_one_open` now includes `target_language` and `instruction_language`.
- `lead_email`, `lead_consent_version` and `lead_consented_at` are dropped, since v1 builds no email capture.
- New checks:
  - `score`/`total` ≥ 0 and `score ≤ total`
  - `seed` 1–128 characters
  - `ip_hash` is a 64-character hex string when set
  - `served` ≤ 20 KB
  - `result` is an object ≤ 100 KB
- The file was checked on a throwaway local Postgres 16 with stub `auth.users` and `team_organizations`, then deleted. All 8 invalid inserts were rejected, including an approval with a NULL `approved_sha256`, and all valid ones were accepted.

**Bank format.** In the fix round each bank gained `phases: { id, title, lessons[] }[]`.
- The phases cover lessons 1–30 exactly once, in consecutive ascending groups.
- There are 3–8 phases of 3–10 lessons each. That allows the real roofing grouping (5/5/10/5/5), and also the six-of-five split used in tests.

Banks may also declare `cueGroups?: string[][]`. Each inner array lists item ids that cue each other.
- Each group has at least 2 known ids and no repeats. An id may sit in several groups.
- A fixed form (A, B or C) may not contain two items of one group; that is the error `form.cue_group`.
- The diagnostic never serves two items of one group in a session. Before picking, the engine checks the item's group-mates would not leave an owed lesson, a short phase, the typed minimum or the 50 total with nothing left to serve.
- In a test with 154 dense groups, all 150 sessions kept 30/30 coverage, at least 6 questions per phase and at least 8 typed items.

`bankSha256()` is SHA-256 over canonical JSON of the bank without `reviews`. Blind reviews sign that hash. The importer stores it as `content_sha256`, the bank minus reviews as `content`, and the reviews as `review_records`.

**How the validator reads the rules:**
- Rule 2: the "longest correct option" count uses strictly longest options after normalizing.
- Rule 3: the answer-leak check covers both prompt and context. `accents: "require"` needs an accented answer.
- Rule 5, A/C difficulty: the per-lesson absolute differences, averaged over lessons, must be ≤ 0.15.
- Rule 5, cueing: an answer (mc correct text, typed accepted form) counts as cued when it shows anywhere in another item of the same form: prompt, context, mc options or match columns. A match pair counts as cued when its left and right both show together in another item. Inside the diagnostic pool this is only a warning.
- Rule 6: at least **6** diagnostic items per lesson (fix round; it was 5).
- Rule 7: the duplicate key is prompt plus context, plus the pairs for match items.
- Rule 8: all reviews must be signed against the current hash. Reviewer and author names are compared trimmed and case-insensitively, and the same reviewer twice counts once. Any `reject`, or a `revise` on the current hash, is an error.
- Wrong JSON types anywhere become validation issues. A fuzz test (more than 400 cases) checks that validation never throws.

**Public data.**
- `publicItem` only ever sends whitelisted fields, and option ids are opaque per session.
- `publicFixedFormResult` is the only fixed-form result that leaves the server:
  - Form C: overall percent, pass/fail and the missed lessons.
  - A and B: the per-lesson table, without item ids or points.
- Per-item points stay in the server-only `FixedFormResult`.

**Adaptive engine.** Differences from section 4:
- Lessons are fitted jointly under four prior models, averaged by Laplace evidence:
  - "even" (small lesson effects)
  - "uneven" (large effects, correlation 0.75)
  - "patchy" (large effects, uncorrelated)
  - "stretches" (large effects, correlation 0.92)
- Opening sweep shifted −1/0/+1 by seed.
- Lesson score without the sd factor.
- At most 3 items per lesson (2 for lessons 1 and 30).
- Lesson pick among the top 5 within 25% of the best; item pick among items within 1 logit of the closest.
- **Phases** (fix round):
  - Each phase gets at least 6 questions.
  - Phase mastery is the mean of its lessons' masteries, with uncertainty from the joint posterior covariance.
  - The call is made on the mastery scale: strong when ≥ .75 and still ≥ .55 one sd below; new when < .45.
  - Confidence is the posterior chance that the call is right: high at ≥ .8, medium at ≥ .6.
- The result leads with phases. Lessons are listed under their phase as **"likely"** strong/shaky/new.
- "I don't know" with a score above 0 is rejected.

**Simulation results.**

> **Caveat:** all agreement figures below come from simulated learners scored against their own simulated truth, with the engine's thresholds. They describe the engine on these learner models only. Real agreement depends on how real learners' knowledge is structured, and those patterns have not been measured yet. There is **no single headline accuracy number**, and marketing copy must not claim one.

The figures come from 400 learners per kind for the contiguous kinds and 250 per kind for the scattered kinds, on the synthetic bank with a 6-item pool and 6 phases of 5. Truth for a phase is the mean of its true lesson masteries.

| Learner kind | Lesson-level agreement | Phase-level agreement | Right when the phase call is high confidence | … medium | … low |
|---|---|---|---|---|---|
| progress (studied 1..k) | 90.5% | 92.5% | 99.4% | 75.1% | 51.0% |
| even (same level everywhere) | 83.6% | 87.6% | 97.7% | 73.4% | 50.5% |
| phase (knows some job phases) | 82.1% | 84.9% | 99.9% | 62.5% | 40.5% |
| independent (each lesson a coin flip) | 50.6% | 74.5% | 96.5% | 76.4% | 60.1% |
| random-half (15 random lessons known) | 47.7% | 72.7% | 95.8% | 76.3% | 59.6% |
| mid-level (partly learned everywhere) | 74.4% | 85.3% | 94.5% | 82.1% | 58.1% |

What the table shows:
- **Lesson-level calls are reliable only when knowledge is contiguous.** For scattered knowledge they are near chance. Fifty questions over 30 lessons leave 1–3 answers per lesson. This is why the result labels lessons "likely" and leads with phases.
- **Phase-level calls hold up better** across every kind: 72–93%.
- **In these simulations, phase confidence tracked accuracy.** Across the scattered kinds, high-confidence phase calls were right 95.1% of the time, against simulated truth. Calibration on real learners has not been measured. Confidence is also capped by evidence: a phase with fewer than 3 of its own answers is always "low", and one with fewer than 6 is at most "medium". A lesson with 0 answers is "low", and with 1 answer at most "medium".
- **Exposure and quotas:**
  - Maximum item exposure: 40.8% (contiguous sessions), 37.9% (scattered sessions).
  - Every session covered 30/30 lessons, gave each phase at least 6 questions and used at least 10 typed items.
- **Test floors are regression guards set from these measurements, not targets or claims.**
  - Pooled lesson-level and phase-level agreement ≥ 85% (contiguous kinds).
  - Phase-level ≥ 68% for each scattered kind.
  - High-confidence phase calls ≥ 90% right (simulated truth).
- The design's literal model reached about 67% lesson-level agreement on the contiguous kinds.

**For T5 (authoring):**
- Author 6 diagnostic items per lesson (180 in the pool).
- Choose the phases with the owner. Roofing's job phases are 5/5/10/5/5; splitting install gives six groups of five.
- Get each lesson's `sourceHash` from `node scripts/exams2-drift.mts --print-hashes roofing`.

## Implementation notes: T6, T7, T11 (2026-10-23, branch feature/exams-v2-core)

**T6 server API** (`src/lib/exams2/server.ts`, route `src/routes/api.exam-check.ts`, POST only, zod, 64 KB body cap):
- Order of checks: kill switch `LT_EXAMS_V2` (off gives 404 "Exams aren't available yet."), then same-origin (an Origin header is required), then the body.
- Actions:
  - `start {moduleId, kind, public?, target="Spanish", native="English"}`. Signed-in sessions need auth (401). `public: true` is allowed only for `diagnostic` and only with `LT_EXAMS_PUBLIC=1`. It returns a 32-byte base64url secret once and stores only `sha256(secret)`. One open session per user, module, languages and kind is reused. If the approved bank version changed, the open session is marked `abandoned` and a new one starts. A/B/C send every public item in frozen order, with MC options shuffled by the session seed. The diagnostic sends only the current item.
  - `resume {sessionId, secret?}`: added so a learner can pick a session up again on any device. Read-only. Public sessions give 410 after 24 hours.
  - `answer {sessionId, step, itemId, answer, requestId, secret?}` (diagnostic only). Order: ownership, then the `requestId` repeat check, then status, then `step` and `itemId === served[step]`. Scoring happens on the server. The next item is recomputed by `nextDiagnosticItem`, which respects cueGroups. The write is optimistic: `where step=? and status='in_progress'`. The response carries only the next public item. At 50 answers the session stores `result` (the study map), `score` and `total`.
  - `save` / `submit` (A/B/C): autosave merges answers for items on the form, and any other item id gives 400. `submit` scores on the server, stores the full `FixedFormResult` in `result` (server-only) and is idempotent.
  - `result {sessionId, secret?}`:
    - C: only `publicFixedFormResult`: percent rounded to 5, pass/fail on the exact score, missed phases (changed in the security fix round below). No lesson or item data, no review.
    - A/B: that result plus an item review.
    - Diagnostic: the stored study map (phases first, lessons "likely", hrefs) plus a review of the served items.
    - Review items name the right answer `solution {optionId|text|pairs}` rather than using the bank's key names.
  - `claim {sessionId, secret}` (signed in): attaches an unclaimed public session to the user. Claiming twice as the same user does nothing new. Another account gets 404, because the first claim clears the secret (see the fix round below), or 409 if it loses a race.
- Retakes: C and the diagnostic have no cooldown (owner decision); C is limited to 3 starts per rolling 24 hours (security fix round below). From section 3, A is taken once (409) and B has a 1-hour cooldown (429 with `retryAfterSeconds`). All are constants in `EXAM_LIMITS`.
- Abuse limits:
  - Public starts: 5 per IP per hour and 500 per hour site-wide, through `consumeServerRequestBudget`.
  - Public starts per day: 20 per IP, counted from `exam_sessions.ip_hash` over the last 24 hours. The shared budget RPC refuses windows over 3600 s, so it cannot count a day.
  - Answers and saves: 120 per session per minute.
  - The IP is stored only as HMAC-SHA256 under `LT_EXAMS_IP_SALT`, or under a salt derived from `SUPABASE_SERVICE_ROLE_KEY` when that is unset.
- Not found and not yours return the same 404. A missing migration (PGRST205/42P01) returns 503 "Exams are being set up. Please try again later." Banks are loaded only when `status` is approved or retired and `approved_sha256 = content_sha256`. The sha is recomputed from the content and the bank is re-validated with reviews skipped. Loaded banks are cached in memory, at most 8, keyed by `content_sha256`.
- `organization_id` is left null; T10 decides how team sessions set it.

**T7 owner approval** (`src/routes/exam-bank.tsx`, `src/routes/api.exam-bank.ts`; link added to the `/owner` header):
- Every request runs `authenticatedTeamUser` and `requirePlatformOwner` before any parsing or bank read. POST also requires the same origin.
- GET returns a list of summaries: status, sha with a recomputed-match flag, counts, a review summary per reviewer (verdict counts, signed against the current sha, independent), validator blocker codes and `approvable`.
- GET with `?moduleId&target&native&version` returns an owner-only preview grouped by phase and lesson, with a placement per item (A/B/C/check pool/spare). Answers use preview names (`choices[].right`, `why`, `answers`).
- POST `approve` requires:
  - `confirmModuleId === moduleId`
  - status `draft`
  - the `sha256` the owner reviewed equals `content_sha256`
  - the stored sha recomputes
  - `validateBank` with reviews required on content plus `review_records`
  - at least 2 independent reviewers signed against the current sha, with no revise or reject.
- The approve step first retires the currently approved version, then sets `approved`, `approved_by` (the authenticated owner), `approved_at` and `approved_sha256`. If the approve step fails, the retired version is restored. Every list, preview, approval, refusal and failure is written to `platform_audit_events` with no content.

**T11:** `scripts/verify-vercel-artifact.mjs` scans `.vercel/output/static` only. It fails on bank keys in data form: a quoted key `"correctOptionId":`, `"distractorRationale":` or `"accepted":` (escaped too), or an object-literal key `{correctOptionId:` / `,distractorRationale:`. Plain property reads are allowed, such as the legacy `/exam-content` page's `s.correctOptionId`. The learner UI (T8) should keep using the client names above.

**New env vars:** `LT_EXAMS_V2`, `LT_EXAMS_PUBLIC` (both `1`/`true` to enable; default off), optional `LT_EXAMS_IP_SALT`.

## Security fix round: T6/T7/T11 (2026-10-23, blind review PASS_WITH_NOTES)

**Answer-key extraction from form C (M1, lead ruling).** Form C is the same 60 items, in the same order, for everyone. The owner also chose unlimited retakes. Together these let a learner map out the answer key: retake C and compare exact percents and per-lesson misses between attempts. Changing one answer and watching the percent move by 1/60 reveals whether it was right. The fix keeps unlimited retakes over time but removes that signal:

- **Start budget.** At most 3 form C sessions per user per rolling 24 hours, counted from `exam_sessions` rows of any status for that user, module, languages and kind C. Reopening the open session is free and adds no row. The budget is checked before an outdated open session is abandoned, so a refused start changes nothing. The refusal is 429 `c_daily_limit` and includes `retryAt`, `retryAfterSeconds`, and a message naming the UTC time the next attempt opens. Set by `EXAM_LIMITS.cStartsPerDay`.
- **Coarser feedback.** `publicFixedFormResult` for C now returns `{ kind, pct, passed, missedPhases }`:
  - `pct` is rounded to the nearest 5, and is never shown as 80+ on a fail or under 80 on a pass.
  - `passed` is still decided on the exact score on the server (≥ 80%).
  - `missedPhases` lists `{ id, title, href }`, where `href` points to the phase's first lesson in `recall` mode.
  - No lesson-level or item-level data is sent. The full per-item result stays in `exam_sessions.result` on the server.
  - A and B are unchanged.
- **Accepted remaining risk:** 3 attempts a day at 5-point resolution still leaks a little over many days. A second C form (the spare items) would remove it.

**Other fixes:**

- **L1:** the migration is now `supabase/migrations/20261024090000_exams_v2.sql`. The old version `20261023120000` clashed with `20261023120000_owner_session_revoke.sql`. No two migrations share a version.
- **L2:** `scripts/verify-vercel-artifact.mjs` runs its checks whenever it is the executed script. It compares realpaths, so symlinks and relative paths work. Importing it, as tests do, only exposes the scanner.
- **L3:** a successful claim sets `public_secret_hash = null`, so the secret stops working and only the account can open the session. Claiming applies the same 24-hour freshness rule as resume (410 for an expired in-progress public session). A second claim by the same account is a no-op.
- **L4:**
  - Public-start rate-limit keys and the stored IP hash bucket IPv6 by /64, IPv4 by full address, and IPv4-mapped IPv6 as IPv4.
  - A failed audit insert on `/api/exam-bank` logs `console.error` with the action id only.
  - If approval fails and the previously approved version cannot be restored, the API logs, audits `exam_bank.restore_failed`, and returns 500 with a fixed message.

## Decisions: 45s timer (T8, 2026-10-23, branch feature/exams2-learner-ui)

Owner: "put a 45 second timer on each test question, so the test is consistent." Built so the clock is the server's, not the page's.

- **One question at a time.** Forms A/B/C are now served like the diagnostic: `start`, `resume` and `answer` return only the current question (`item`) and its clock (`timer: { limitMs: 45000, graceMs: 5000, elapsedMs }`). The earlier "all public items are sent at start" is withdrawn: with every item on the client the clock could be beaten by reading ahead. `elapsedMs` is measured by the server, so the page needs no clock sync.
- **The clock.** Question k is served when question k-1 is recorded (the session start for question 1). Each stored response keeps `servedAt` and `at` in the existing `responses` JSON, so there is no migration and no new column. An answer within 45 s counts; up to 5 s more is network grace; later, the answer is dropped and the question is recorded as unanswered (`expired`, 0 points; "I don't know" in the diagnostic model). The page sends `answer: null` when its countdown hits 0; the server records it the same way.
- **No edits.** `answer` must name the current `step` and `itemId`, so an answered or expired question gives 409 `step_mismatch`. Leaving does not pause the clock; on return only the question on screen is lost, the next one is fresh. The batch `save` action and `submit` with answers are removed (a batch would skip the clock); `submit` with no body ends a fixed-form test early and scores the questions not reached as 0. The diagnostic uses the same clock.
- **Windows enforced server-side.** `start` for B refuses (403 `not_open`, with `opensOn` and lesson progress) before day 45 of the learner's Core 30 plan or until lessons 1-15 are mastered; C before day 90 or until all 30 are mastered; A is always open (`lateBaseline` after day 7 or lesson 3). Start date and mastered lessons come from `profiles.data.core30Log` (self-reported, so a soft gate). Dates are UTC days. An unreadable profile fails closed (503). Platform staff (any `platform_admin_roles` row, or the confirmed owner account) can start any form to preview it and skip the A once / B cool-down rules; the C 3-a-day budget still applies.
- **Overview action.** `overview { target, native }` lists modules with an approved bank and, for a signed-in learner, A/B/C window, status, attempts, best score (C coarse, nearest 5) and retake state. Signed-out visitors get the module list only. With `LT_EXAMS_V2` off it answers 404 `disabled`; that is how `/exams` decides to show the previous page. The route answers this before it builds a database client.
- **Not changed.** Retake rules, the coarse C result, and answer review for A/B only.
