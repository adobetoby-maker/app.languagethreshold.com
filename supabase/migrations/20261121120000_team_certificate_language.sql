-- Built by TAC — 2026-11-21
-- Certificates name the language they were earned in (language packs). Rows issued before this
-- column existed keep target_language null: they were all historical-course (Spanish) courses and
-- keep the exact titles they were printed with. The owner applies this migration; the app reads the
-- column only when present (select *) and writes it only for a language other than the historical
-- course, so it works before and after the migration.
alter table public.team_certificates
  add column if not exists target_language text,
  add column if not exists instruction_language text;

-- The (organization, learner, module, version) key is kept so the issuer's upsert target is unchanged;
-- a learner who earns the same module in a second language gets the next version.
