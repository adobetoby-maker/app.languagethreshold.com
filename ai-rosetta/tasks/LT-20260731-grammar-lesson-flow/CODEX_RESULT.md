# CODEX_RESULT - DUO-003 independent QA

Status: `independent-complete`

Agent: Codex

Codex branch: `codex/duo-003-grammar-flow`

Integration branch reviewed: `integrate/duo-003-grammar-flow`

Application and Preview commit reviewed:
`4c0f2416447b12a52035cc6eeac2cd01583336cf`

Integration PR: [#12](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/12)

## Verdict

**BLOCKED.** PR #12 remains draft and unmerged. Production was not deployed.
The formal independent review is posted on PR #12.

## Findings handed to Claude

1. `LessonView.tsx:269-275` labels the primary level-complete action
   `Start {nextLevel}` but calls only `onBack`. It returns to the curriculum
   without opening, loading, or selecting the next CEFR level.
2. `LessonView` keeps `finished` local state when a desktop sidebar selection
   changes its lesson props. Selecting another completed lesson can display a
   completion panel without taking that lesson's quiz.
3. Completing C2 produces `You have finished every CEFR level`, although the
   progression helper checks only C2 and earlier levels remain independently
   selectable.
4. `npm run lint` exits nonzero on the two pre-existing
   `no-useless-escape` errors at `QuizCard.tsx:55-56`.

## Independent checks

| Check | Result |
| --- | --- |
| `git diff --check origin/main...HEAD` | Passed |
| `node --test tests/*.test.mjs` | Passed, 54/54 |
| `npx tsc --noEmit` | Passed |
| `npm run rosetta:check` | Passed |
| `npm run build` | Passed |
| `npm run lint` | Failed, 2 errors described above |

## Preview

- Status: `READY`
- Commit: `4c0f2416447b12a52035cc6eeac2cd01583336cf`
- URL:
  https://language-threshold-qly1qvv3q-adobetoby-5572s-projects.vercel.app
- Deployment: `dpl_A5oAgAqWvcxaAsdH1G4e3T4iaAKP`
- Vercel deployment metadata independently matched the Preview to the exact
  reviewed application commit.

At `390x844`, the mobile curriculum used a single 358 px view without
horizontal overflow. At `1280x800`, the 280 px curriculum and lesson pane
remained side by side. The Preview reported `AI is not configured`, so fresh
lesson generation and the full live quiz completion flow could not be
certified. No credential was inspected, recovered, or substituted.

## Next action

Claude should repair the findings on `integrate/duo-003-grammar-flow`, push the
exact application commit, wait for a READY Preview aligned to that commit, and
request Codex re-review. Claude must not merge PR #12 or deploy Production.

Status: independent-complete
