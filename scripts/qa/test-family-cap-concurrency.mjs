/** Disposable LOCAL database only; verifies two sessions cannot take the seventh seat. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const bin = "/opt/homebrew/opt/postgresql@16/bin/";
const database = `lt_family_cap_qa_${randomUUID().replaceAll("-", "")}`;
const group = "30000000-0000-4000-8000-000000000001";
const migration = readFileSync("supabase/migrations/20261021000000_family_rls_hardening.sql", "utf8");
const capFunction = migration.match(/create or replace function public\.enforce_family_member_cap\(\)[\s\S]*?\$\$;/)?.[0];
assert.ok(capFunction, "Migration must define its own seat cap");
const children = [];
const sql = (query) => execFileSync(`${bin}psql`, ["-h", "/tmp", "-d", database, "-v", "ON_ERROR_STOP=1", "-Atc", query], { encoding: "utf8" }).trim();
function session(name) {
  const child = spawn(`${bin}psql`, ["-h", "/tmp", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], { env: { ...process.env, PGAPPNAME: name }, stdio: "pipe" });
  children.push(child);
  const output = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk) => { output.stdout += chunk; });
  child.stderr.on("data", (chunk) => { output.stderr += chunk; });
  const done = new Promise((resolve) => child.once("close", resolve));
  return { child, output, done };
}
async function until(check) {
  for (let n = 0; n < 100; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the concurrent insert's row lock");
}

execFileSync(`${bin}createdb`, ["-h", "/tmp", database]);
try {
  sql(`create table public.family_groups(id uuid primary key);
    create table public.family_members(id uuid primary key default gen_random_uuid(),group_id uuid references public.family_groups(id));
    ${capFunction}
    create trigger trg_family_members_cap before insert or update of group_id on public.family_members for each row execute function public.enforce_family_member_cap();
    insert into public.family_groups values('${group}');
    insert into public.family_members(group_id) select '${group}'::uuid from generate_series(1,6);`);
  const first = session("family-cap-first");
  first.child.stdin.write(`begin; insert into public.family_members(group_id) values('${group}'); select 'held';\n`);
  await until(() => first.output.stdout.includes("held"));
  const second = session("family-cap-second");
  second.child.stdin.end(`set statement_timeout='10s'; insert into public.family_members(group_id) values('${group}');\n`);
  await until(() => sql("select count(*) from pg_stat_activity where datname=current_database() and application_name='family-cap-second' and wait_event_type='Lock'") === "1");
  first.child.stdin.end("commit;\n");
  assert.equal(await first.done, 0, first.output.stderr);
  assert.notEqual(await second.done, 0, "Both callers took the final seat");
  assert.match(second.output.stderr, /Family group is full/);
  assert.equal(sql("select count(*) from public.family_members"), "7");
  console.log("Concurrent seat cap passed: second session waited, then rejected the eighth member.");
} finally {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  execFileSync(`${bin}dropdb`, ["-h", "/tmp", "--force", database]);
}
