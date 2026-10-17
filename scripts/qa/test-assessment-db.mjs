/** Integration tests are intentionally restricted to the named local QA database. */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const psql = existsSync("/opt/homebrew/opt/postgresql@16/bin/psql")
  ? "/opt/homebrew/opt/postgresql@16/bin/psql"
  : "psql";
execFileSync(
  psql,
  ["-h", "/tmp", "-d", "lt_exams_qa_20261015_codex", "-f", "tests/sql/assessment-engine.sql"],
  {
    stdio: "inherit",
    env: { ...process.env, PGHOST: "/tmp", PGDATABASE: "lt_exams_qa_20261015_codex" },
  },
);
