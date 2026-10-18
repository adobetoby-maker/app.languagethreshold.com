/** Fixed local database only; no hosted connection or migration history mutation. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const psql = "/opt/homebrew/opt/postgresql@16/bin/psql";
const args = [
  "-X",
  "-qAt",
  "-h",
  "/tmp",
  "-d",
  "lt_exams_qa_20261015_codex",
  "-v",
  "ON_ERROR_STOP=1",
];
const emptySql =
  "select (select count(*) from pg_tables where schemaname in ('public','auth','storage','assessment_private'))+(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')+(select count(*) from pg_namespace where nspname in ('auth','storage','assessment_private'));";
const count = () => execFileSync(psql, [...args, "-c", emptySql], { encoding: "utf8" }).trim();
assert.equal(count(), "0", "Refuse to use a nonempty local QA database");
execFileSync(psql, [...args, "-f", "tests/sql/assessment-adaptive-runtime.sql"], {
  stdio: "inherit",
});
assert.equal(count(), "0", "Local runtime fixture must roll back in full");
