/** Local disposable QA database only; all DDL, fixtures and role flags roll back. */
import { execFileSync } from "node:child_process";
execFileSync(
  "/opt/homebrew/opt/postgresql@16/bin/psql",
  ["-h", "/tmp", "-d", "lt_exams_qa_20261015_codex", "-f", "tests/sql/family-rls.sql"],
  {
    stdio: "inherit",
    env: { ...process.env, PGHOST: "/tmp", PGDATABASE: "lt_exams_qa_20261015_codex" },
  },
);
