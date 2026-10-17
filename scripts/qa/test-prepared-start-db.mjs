/** Real concurrent connections, fictional data, only the empty named local QA database. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
const psql = "/opt/homebrew/opt/postgresql@16/bin/psql";
const db = "lt_exams_qa_20261015_codex";
const args = ["-X", "-qAt", "-h", "/tmp", "-d", db, "-v", "ON_ERROR_STOP=1"];
const sync = (sql) =>
  execFileSync(psql, args, { input: sql, encoding: "utf8", maxBuffer: 4_000_000 });
const active = new Set();
function start(sql, held = false, name = "lt-prepared-start-qa") {
  let ready, readyFail;
  const entered = new Promise((yes, no) => {
    ready = yes;
    readyFail = no;
  });
  const child = spawn(psql, args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "",
    errors = "";
  child.stdout.on("data", (data) => {
    output += data;
    if (output.includes("QA_ENTERED")) ready();
  });
  child.stderr.on("data", (data) => {
    errors += data;
  });
  const result = new Promise((yes, no) => {
    child.on("error", (error) => {
      readyFail(error);
      no(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        ready();
        yes(output.replaceAll("QA_ENTERED", "").trim());
      } else {
        const error = Error(errors);
        readyFail(error);
        no(error);
      }
    });
  });
  // A caller may only need completion; still handle early failures on the readiness promise.
  entered.catch(() => {});
  result.catch(() => {});
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    child.stdin.end("commit;\n");
  };
  const connection = { entered, result, release };
  active.add(connection);
  result.finally(() => active.delete(connection)).catch(() => {});
  child.stdin.write(
    `set application_name=${literal(name)};set statement_timeout='5s';set lock_timeout='4s';begin;set local role service_role;\n${sql}\n\\echo QA_ENTERED\n`,
  );
  if (!held) release();
  return connection;
}
const run = (sql) => start(sql).result;
const literal = (value) =>
  "'" + (typeof value === "string" ? value : JSON.stringify(value)).replaceAll("'", "''") + "'";
const emptySql =
  "select (select count(*) from pg_tables where schemaname in ('public','auth','storage','assessment_private'))+(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')+(select count(*) from pg_namespace where nspname in ('auth','storage','assessment_private','assessment_routing_qa'));";
const empty = sync(emptySql).trim();
assert.equal(empty, "0", "Refuse to initialize or clean a nonempty QA database");
const originalRoles = new Set(
  sync("select rolname from pg_roles where rolname in ('anon','authenticated','service_role');")
    .trim()
    .split("\n"),
);
const file = resolve("tests/sql/assessment-engine.sql");
let setup =
  "\\set assessment_adaptive_route_tests true\n\\set assessment_adaptive_runtime_tests true\n" +
  readFileSync(file, "utf8").replace(
    /^\\ir (.+)$/gm,
    (_, name) => `\\ir ${resolve(dirname(file), name)}`,
  );
setup = setup.replace(
  /rollback;\s*$/,
  () => readFileSync("docs/assessments/proposals/prepared-start-rpc.sql", "utf8") + "\ncommit;",
);
let initialized = false;
function prepare() {
  return JSON.parse(
    sync(`begin;do $$ declare actor uuid:=gen_random_uuid();begin
 insert into auth.users values(actor);
 perform public.assessment_create_enrollment(actor,actor,null,'route-test-release','2026-10-16','America/Denver',gen_random_uuid());
 end $$;select json_build_object('actor',e.user_id,'cp',c.id,'form',to_jsonb(f),'release',to_jsonb(r),'request',gen_random_uuid())
 from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id
 cross join public.assessment_forms f cross join public.assessment_releases r
 where c.checkpoint='entrance' and f.id='runtime-fixture-form' and r.id='route-test-release'
 order by e.created_at desc,e.ctid desc limit 1;commit;`).trim(),
  );
}
const call = (f, legacy = false, request = f.request) =>
  legacy
    ? `select public.assessment_start_attempt(${literal(f.actor)},${literal(f.cp)},'runtime-fixture-form',${literal(request)},false);`
    : `select public.assessment_start_prepared_attempt(${literal(f.actor)},${literal(f.cp)},'runtime-fixture-form',${literal(request)},${literal(f.form)},${literal(f.release)});`;
const count = (f) =>
  Number(
    sync(
      `select count(*) from public.assessment_attempts where checkpoint_id=${literal(f.cp)};`,
    ).trim(),
  );
const snapshot = (f) =>
  JSON.parse(
    sync(
      `select form_snapshot from public.assessment_attempts where checkpoint_id=${literal(f.cp)};`,
    ).trim(),
  );
async function waits(name) {
  for (let i = 0; i < 40; i++) {
    if (
      sync(
        `select count(*) from pg_stat_activity where application_name=${literal(name)} and wait_event_type='Lock';`,
      ).trim() === "1"
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Expected an observed PostgreSQL lock wait: ${name}`);
}
const checks = {};
try {
  sync(setup);
  initialized = true;
  {
    const f = prepare();
    sync("update public.assessment_forms set calibrated=false where id='runtime-fixture-form';");
    await run(call(f, true));
    assert.equal(snapshot(f).calibrated, false);
    sync("update public.assessment_forms set calibrated=true where id='runtime-fixture-form';");
    checks.legacyCalibrationTransitionGapReproduced = true;
  }
  for (const mutation of [
    "calibrated=false",
    "definition=jsonb_set(definition,'{estimatedMinutes}','99'::jsonb)",
    "version='changed-row-version'",
    "status='in_review'",
  ]) {
    const f = prepare();
    // Mutation wins the real row lock before the prepared start reaches its source read.
    const held = start(
      `update public.assessment_forms set ${mutation} where id='runtime-fixture-form' returning id;`,
      true,
    );
    await held.entered;
    const losing = start(call(f), false, "lt-prepared-stale");
    await waits("lt-prepared-stale");
    held.release();
    await assert.rejects(losing.result, /Prepared assessment source changed/);
    await held.result;
    assert.equal(count(f), 0);
    // Restore the exact original private row fields changed by these local fixtures.
    sync(
      `update public.assessment_forms set calibrated=true,definition=${literal(f.form.definition)},version=${literal(f.form.version)},status='verified' where id='runtime-fixture-form';`,
    );
  }
  checks.concurrentCalibrationDefinitionVersionAndReviewChangesRejectWithoutAttempt = true;
  {
    const f = prepare(),
      held = start(call(f), true);
    await held.entered;
    const edit = start(
      "update public.assessment_forms set calibrated=false,definition=jsonb_set(definition,'{estimatedMinutes}','88'::jsonb) where id='runtime-fixture-form';",
      false,
      "lt-prepared-edit",
    );
    await waits("lt-prepared-edit");
    held.release();
    await Promise.all([held.result, edit.result]);
    const frozen = snapshot(f);
    assert.equal(frozen.calibrated, true);
    assert.equal(frozen.pilot, false);
    assert.deepEqual(frozen.definition, f.form.definition);
    assert.equal(frozen.version, f.form.version);
    assert.equal(count(f), 1);
    // Original frozen attempt remains authoritative on both retry and new-device resume.
    const retry = await run(call(f));
    const resume = await run(call(f, false, "90000000-0000-4000-8000-000000000009"));
    assert.equal(retry, resume);
    assert.equal(count(f), 1);
    assert.deepEqual(snapshot(f), frozen);
    assert.equal(
      sync(
        `select count(*) from public.assessment_events where action='attempt.started' and detail->>'attemptId'=${literal(retry)};`,
      ).trim(),
      "1",
    );
    sync(
      `update public.assessment_forms set calibrated=true,definition=${literal(f.form.definition)} where id='runtime-fixture-form';`,
    );
  }
  checks.startWinsContentEditWaitsAndFrozenRetryResumeSingleEvent = true;
  {
    const f = prepare(),
      held = start(
        "update public.assessment_releases set status='in_review' where id='route-test-release' returning id;",
        true,
      );
    await held.entered;
    const losing = start(call(f), false, "lt-prepared-release");
    await waits("lt-prepared-release");
    held.release();
    await assert.rejects(losing.result, /Prepared assessment source changed/);
    await held.result;
    assert.equal(count(f), 0);
    sync("update public.assessment_releases set status='verified' where id='route-test-release';");
  }
  checks.releaseReviewTransitionRejectsWithoutAttempt = true;
  {
    const f = prepare(),
      held = start(call(f), true);
    await held.entered;
    const legacy = start(call(f, true));
    await waits("lt-prepared-start-qa");
    held.release();
    assert.equal(await legacy.result, await held.result);
    assert.equal(count(f), 1);
  }
  checks.newAndLegacyStartsSerializeWithoutDeadlock = true;
  {
    const f = prepare();
    await assert.rejects(
      run(call({ ...f, actor: "10000000-0000-4000-8000-000000000003" })),
      /Learner assessment access required/,
    );
    await assert.rejects(
      run(call({ ...f, form: { ...f.form, calibrated: false } })),
      /Prepared assessment source changed/,
    );
    await assert.rejects(
      run(call({ ...f, release: { ...f.release, content_version: "stale" } })),
      /Prepared assessment source changed/,
    );
    assert.equal(count(f), 0);
    for (const role of ["anon", "authenticated"])
      assert.equal(
        sync(
          `select has_function_privilege('${role}','public.assessment_start_prepared_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text[])','EXECUTE');`,
        ).trim(),
        "f",
      );
    assert.equal(
      sync(
        "select prosecdef from pg_proc where oid='public.assessment_start_prepared_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text[])'::regprocedure;",
      ).trim(),
      "f",
    );
  }
  checks.foreignActorChangedPayloadAndBrowserRoleDenial = true;
  {
    const f = prepare();
    sync(
      "create function public.qa_prepared_audit_failure() returns trigger language plpgsql as $$begin if new.action='attempt.started' then raise exception 'Synthetic prepared audit failure';end if;return new;end $$;create trigger qa_prepared_audit_failure before insert on public.assessment_events for each row execute function public.qa_prepared_audit_failure();",
    );
    try {
      await assert.rejects(run(call(f)), /Synthetic prepared audit failure/);
    } finally {
      sync(
        "drop trigger qa_prepared_audit_failure on public.assessment_events;drop function public.qa_prepared_audit_failure();",
      );
    }
    assert.equal(count(f), 0);
    await run(call(f));
    assert.equal(count(f), 1);
    await assert.rejects(
      run(call(f).replace("'runtime-fixture-form'", "'another-form'")),
      /Start request key reused/,
    );
  }
  checks.auditFailureRollsBackAndChangedFormRetryRejected = true;
  {
    const f = prepare(),
      held = start(call(f), true);
    await held.entered;
    const edit = start(
      "update public.assessment_releases set status='in_review' where id='route-test-release';",
      false,
      "lt-prepared-release-edit",
    );
    await waits("lt-prepared-release-edit");
    held.release();
    await Promise.all([held.result, edit.result]);
    assert.equal(snapshot(f).pilot, false);
    assert.equal(count(f), 1);
    sync("update public.assessment_releases set status='verified' where id='route-test-release';");
  }
  checks.startWinsReleaseReviewEditWaits = true;
  {
    const f = prepare();
    await run(
      `select public.assessment_note_content_exposure(${literal(f.actor)},'runtime-fixture-form');`,
    );
    await assert.rejects(run(call(f)), /Private question keys were viewed/);
    assert.equal(count(f), 0);
  }
  checks.currentPrivateKeyExposureStillDenied = true;
  {
    const f = prepare();
    sync(`update public.assessment_forms set calibrated=false where id='runtime-fixture-form';`);
    const current = prepare();
    await assert.rejects(run(call(current)), /Reviewed calibrated adaptive assessment required/);
    assert.equal(count(current), 0);
    sync("update public.assessment_forms set calibrated=true where id='runtime-fixture-form';");
    const flat = { ...f.form.definition };
    delete flat.routing;
    sync(
      `update public.assessment_forms set definition=${literal(flat)} where id='runtime-fixture-form';`,
    );
    const flatCurrent = prepare();
    await assert.rejects(
      run(call(flatCurrent)),
      /Reviewed calibrated adaptive assessment required/,
    );
    assert.equal(count(flatCurrent), 0);
    sync(
      `update public.assessment_forms set definition=${literal(f.form.definition)} where id='runtime-fixture-form';`,
    );
  }
  checks.currentUncalibratedAndFlatSourcesCannotUsePreparedAdaptiveRpc = true;
  console.log(
    JSON.stringify({
      localDatabase: db,
      proposalOnly: true,
      noHostedWrites: true,
      syntheticFixturesOnly: true,
      checks,
    }),
  );
} finally {
  for (const connection of active) connection.release();
  await Promise.allSettled([...active].map((connection) => connection.result));
  if (initialized) {
    sync(`do $$ declare r record;begin
   for r in select format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' loop execute 'drop function if exists '||r.signature||' cascade';end loop;
   for r in select tablename from pg_tables where schemaname='public' loop execute format('drop table if exists public.%I cascade',r.tablename);end loop;
  end $$;drop schema assessment_private cascade;drop schema storage cascade;drop schema auth cascade;`);
    for (const role of ["anon", "authenticated", "service_role"])
      if (!originalRoles.has(role)) sync(`drop owned by ${role};drop role ${role};`);
    assert.equal(sync(emptySql).trim(), "0", "Local fixture cleanup must leave no objects");
  }
}
