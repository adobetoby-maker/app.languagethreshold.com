# Private assessment content workflow

This repository is public. Real examination question banks, accepted answers, listening source transcripts and private scoring keys live in the protected assessment database and private authoring files outside Git. Source control contains the engine, schemas and synthetic fixtures only.

The first Roofing draft has 24 entrance items, 20 midpoint items and 24 exit items. All remain draft, uncalibrated and unpublished. The forms cover six skill dimensions; the midpoint's studied/transfer classification is frozen from saved learner activity at attempt start, rather than assuming everyone has completed fifteen lessons. No human language/domain review or scoring calibration has been claimed.

The private authoring file on this host is `/Users/drive/.codex/private/language-threshold-assessments/2026-10-16-roofing-es-en-draft.json` (mode0600, directory0700). Do not copy it into this public repository. The platform owner can inspect release status, questions, accepted answers, listening source and frozen rubrics at `/exam-content`. The API checks the existing platform-owner role and returns no learner records. This read-only workspace does not approve content or fabricate review records; trained reviewer administration and publication remain a separate workflow.

Import a new draft using `node scripts/import-assessment-draft.mjs /absolute/private/file.json`. The helper uses the existing authenticated Supabase CLI for this exact project, keeps credentials in memory, validates objective/language/skill coverage, and refuses an ID whose content has changed. Version changed forms with a new ID. It cannot publish a form, approve equivalence, or mark calibration complete.

Publication requires recorded curriculum, fluent-language and domain review, verified lesson/activity/assets, approved scoring rubrics and pilot evaluation. Private media retention and public rollout still need the owner's policy decision. Missing audio/speech evidence is not a zero; raw recordings are not collected by the current prototype. Supporting-module recommendations remain disabled until the relevant scoring thresholds and candidate content are verified.

The legacy Roofing certificate test is separate. These draft assessment records do not grant certificates, trade qualification, safety approval or standardized proficiency ratings.
