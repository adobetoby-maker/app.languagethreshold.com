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
function start(sql, held = false) {
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
    if (output.trim()) ready();
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
        yes(output.trim());
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
  child.stdin.end(
    `set statement_timeout='5s';set lock_timeout='4s';begin;set local role service_role;${sql}${held ? "select pg_sleep(0.3);" : ""}commit;`,
  );
  return { entered, result };
}
const run = (sql) => start(sql).result;
const literal = (value) =>
  "'" + (typeof value === "string" ? value : JSON.stringify(value)).replaceAll("'", "''") + "'";
const empty = sync(
  "select (select count(*) from pg_tables where schemaname in ('public','auth','storage','assessment_private'))+(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')+(select count(*) from pg_namespace where nspname in ('auth','storage','assessment_private','assessment_routing_qa')); ",
).trim();
assert.equal(empty, "0", "Refuse to initialize or clean a nonempty QA database");
const originalRoles = new Set(
  sync("select rolname from pg_roles where rolname in ('anon','authenticated','service_role');")
    .trim()
    .split("\n"),
);
const file = resolve("tests/sql/assessment-engine.sql");
let setup =
  "\\set assessment_adaptive_route_tests true\n" +
  readFileSync(file, "utf8").replace(
    /^\\ir (.+)$/gm,
    (_, name) => `\\ir ${resolve(dirname(file), name)}`,
  );
const cases = readFileSync("tests/sql/assessment-adaptive-route-cases.sql", "utf8");
const helpers = [
  ...cases.matchAll(
    /create function pg_temp\.(?:route_definition|route_core|route_decision)[\s\S]*?\$\$;/g,
  ),
]
  .map((match) => match[0].replaceAll("pg_temp.", "assessment_routing_qa."))
  .join("\n");
assert.equal(
  [...cases.matchAll(/create function pg_temp\.(?:route_definition|route_core|route_decision)/g)]
    .length,
  3,
);
setup = setup.replace(
  /rollback;\s*$/,
  () =>
    `create schema assessment_routing_qa;\n${helpers}\ncreate table assessment_routing_qa.cases(actor uuid,attempt uuid,definition jsonb,core jsonb,decision jsonb,request uuid);\ncommit;`,
);
let initialized = false;
function prepare() {
  const output =
    sync(`begin;do $$ declare actor uuid:=gen_random_uuid();e uuid;cp uuid;a uuid;d jsonb;updates jsonb;begin
   insert into auth.users values(actor);
   e:=public.assessment_create_enrollment(actor,actor,null,'route-test-release','2026-10-16','America/Denver',gen_random_uuid());
   select id into cp from public.assessment_checkpoints where enrollment_id=e and checkpoint='entrance';
   a:=public.assessment_start_attempt(actor,cp,'route-fixture-form',gen_random_uuid(),true);
   select form_snapshot->'definition' into d from public.assessment_attempts where id=a;
   select jsonb_agg(jsonb_build_object('itemId',i->>'id','answer',case when i->>'skill' in ('writing','speaking') then '{"inputMethod":"unavailable","missingReason":"Local fixture unavailable"}'::jsonb else '{"inputMethod":"choice","choiceId":"yes"}'::jsonb end)) into updates from jsonb_array_elements(d->'items') i where d->'routing'->'coreItemIds' ? (i->>'id');
   perform public.assessment_save_responses(actor,a,0,updates,gen_random_uuid());
   insert into assessment_routing_qa.cases values(actor,a,d,assessment_routing_qa.route_core(a),assessment_routing_qa.route_decision(a,1),gen_random_uuid());
  end $$;select row_to_json(c) from assessment_routing_qa.cases c order by ctid desc limit 1;commit;`);
  return JSON.parse(output.trim());
}
const route = (f, request = f.request, decision = f.decision) =>
  `select public.assessment_select_route(${literal(f.actor)},${literal(f.attempt)},1,${literal(request)},${literal(f.definition)},${literal(f.core)},${literal(decision)});`;
const save = (f, revision = 1, item = "recognition1") =>
  `select public.assessment_save_responses(${literal(f.actor)},${literal(f.attempt)},${revision},${literal([{ itemId: item, answer: { inputMethod: "choice", choiceId: "no" } }])},gen_random_uuid());`;
const state = (f) =>
  JSON.parse(
    sync(
      `select json_build_object('routes',(select count(*) from public.assessment_attempt_routes where attempt_id=${literal(f.attempt)}),'events',(select count(*) from public.assessment_events where action='attempt.routed' and detail->>'attemptId'=${literal(f.attempt)}),'revision',revision,'status',status,'responses',(select count(*) from public.assessment_responses where attempt_id=${literal(f.attempt)})) from public.assessment_attempts where id=${literal(f.attempt)};`,
    ),
  );
const routed = (f) => {
  const s = state(f);
  assert.equal(s.routes, 1);
  assert.equal(s.events, 1);
  assert.equal(s.revision, 2);
};
const checks = {};
try {
  const initialization = sync(setup);
  initialized = true;
  const baselineSignatures = JSON.parse(
    initialization.split("\n").find((line) => line.startsWith('{"baselineResponseGuard"')),
  );
  for (const sameRequest of [true, false]) {
    const f = prepare(),
      held = start(route(f), true);
    await held.entered;
    const second = start(
      route(f, sameRequest ? f.request : "90000000-0000-4000-8000-000000000001"),
    );
    await Promise.all([held.result, second.result]);
    routed(f);
  }
  checks.concurrentSameAndDifferentRequestsFreezeOneRoute = true;
  {
    const f = prepare(),
      held = start(route(f), true);
    await held.entered;
    await assert.rejects(
      run(route(f, f.request, { ...f.decision, branchId: "low" })),
      /request key reused/,
    );
    await held.result;
    routed(f);
  }
  checks.changedRetryPayloadConflicts = true;
  {
    const f = prepare(),
      held = start(save(f), true);
    await held.entered;
    await assert.rejects(run(route(f)), /revision conflict/);
    await held.result;
    const s = state(f);
    assert.equal(s.routes, 0);
    assert.equal(s.events, 0);
    assert.equal(s.revision, 2);
  }
  checks.saveWinsStaleRouteRollsBack = true;
  {
    const f = prepare(),
      held = start(route(f), true);
    await held.entered;
    await assert.rejects(run(save(f)), /revision conflict/);
    await held.result;
    routed(f);
    await run(save(f, 2, "high"));
    await assert.rejects(run(save(f, 3, "low")), /selected frozen path/);
    assert.equal(state(f).revision, 3);
  }
  checks.routeWinsStaleSaveRejectedAndSelectedRevisionWorks = true;
  {
    const f = prepare();
    await assert.rejects(
      run(
        `select public.assessment_submit_attempt(${literal(f.actor)},${literal(f.attempt)},1,gen_random_uuid());`,
      ),
      /Select a route/,
    );
    const held = start(route(f), true);
    await held.entered;
    await assert.rejects(
      run(
        `select public.assessment_submit_attempt(${literal(f.actor)},${literal(f.attempt)},1,gen_random_uuid());`,
      ),
      /revision conflict/,
    );
    await held.result;
    await run(
      `select public.assessment_submit_attempt(${literal(f.actor)},${literal(f.attempt)},2,gen_random_uuid());`,
    );
    const s = state(f);
    assert.equal(s.status, "submitted");
    assert.equal(s.responses, 19);
    assert.equal(s.routes, 1);
  }
  checks.noAdaptiveSubmitWithoutRouteAndConcurrentSubmitSerializes = true;
  {
    const first = prepare(),
      second = prepare(),
      held = start(route(first), true);
    await held.entered;
    await assert.rejects(run(route(second, first.request)), /request key reused|duplicate key/);
    await held.result;
    routed(first);
    assert.equal(state(second).routes, 0);
    assert.equal(state(second).revision, 1);
  }
  checks.globalRetryIdentityCannotSelectAnotherAttempt = true;
  {
    const f = prepare();
    sync(
      `create function assessment_routing_qa.fail_route_event() returns trigger language plpgsql as $$begin if new.action='attempt.routed' then raise exception 'Synthetic audit failure';end if;return new;end $$;create trigger qa_fail_route before insert on public.assessment_events for each row execute function assessment_routing_qa.fail_route_event();`,
    );
    try {
      await assert.rejects(run(route(f)), /Synthetic audit failure/);
    } finally {
      sync("drop trigger qa_fail_route on public.assessment_events;");
    }
    const s = state(f);
    assert.equal(s.routes, 0);
    assert.equal(s.events, 0);
    assert.equal(s.revision, 1);
    await run(route(f));
    routed(f);
  }
  checks.auditFailureRollsBackRouteAndRevision = true;
  {
    const f = prepare();
    const payload = {
      actor: f.actor,
      attemptId: f.attempt,
      revision: 1,
      definition: f.definition,
      core: f.core,
      decision: f.decision,
    };
    await run(
      `insert into public.assessment_attempt_routes(attempt_id,request_id,source_revision,decision_revision,decision,core_snapshot,request_payload) values(${literal(f.attempt)},${literal(f.request)},1,2,${literal(f.decision)},${literal(f.core)},${literal(payload)});`,
    );
    routed(f);
    await assert.rejects(
      run(
        `insert into public.assessment_speech_evidence(attempt_id,enrollment_id,learner_id,item_id,policy_version,request_id,expected_revision,sha256,bytes,mime,duration_ms) select a.id,c.enrollment_id,${literal(f.actor)},'low','assessment-speech-pending-v1',gen_random_uuid(),2,repeat('a',64),64,'audio/webm',1000 from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=${literal(f.attempt)};`,
      ),
      /selected frozen path/,
    );
  }
  checks.directServiceInsertAtomicAndUnselectedSpeechDenied = true;
  console.log(
    JSON.stringify({
      localDatabase: db,
      baselineSignatures,
      checks,
      noHostedWrites: true,
      positiveFixturesSyntheticOnly: true,
    }),
  );
} finally {
  if (initialized) {
    sync(`do $$ declare r record;begin
     for r in select format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' loop execute 'drop function if exists '||r.signature||' cascade';end loop;
     for r in select tablename from pg_tables where schemaname='public' loop execute format('drop table if exists public.%I cascade',r.tablename);end loop;
    end $$;drop schema assessment_private cascade;drop schema storage cascade;drop schema auth cascade;drop schema assessment_routing_qa cascade;`);
    for (const role of ["anon", "authenticated", "service_role"])
      if (!originalRoles.has(role)) sync(`drop owned by ${role};drop role ${role};`);
    assert.equal(
      sync(
        "select count(*) from pg_tables where schemaname in ('public','auth','storage','assessment_private');",
      ).trim(),
      "0",
    );
  }
}
