import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
const id = "11111111-1111-4111-8111-111111111111";
const inviteWarning =
  "Invitation saved. Email delivery could not be confirmed. Share the invitation link or check your workspace before retrying.";
const assignWarning =
  "Assignment saved. Email delivery could not be confirmed. Check your workspace before retrying.";
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/team-email-warning-"));
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.team';export {c} from 'controls';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "route.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-team-email",
          setup(b) {
            if (process.env.LT_TEAM_WARNING_BASELINE)
              b.onLoad({ filter: /\/src\/routes\/api\.team\.ts$/ }, () => ({
                contents: execFileSync(
                  "git",
                  ["show", `${process.env.LT_TEAM_WARNING_BASELINE}:src/routes/api.team.ts`],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve("src/routes"),
              }));
            b.onResolve(
              { filter: /^(controls|@tanstack\/react-router|@\/lib\/team-server)$/ },
              () => ({ path: "controls", namespace: "controls" }),
            );
            b.onLoad({ filter: /.*/, namespace: "controls" }, () => ({
              resolveDir: process.cwd(),
              contents: `
          export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};
          import {TeamOperationError} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};
          export const c={mailCalls:0,failMail:false,failSent:false,writes:[],audits:[],rows:[],role:'admin'};
          export const createFileRoute=()=>c=>c;
          export const authenticatedTeamUser=async request=>{if(!request.headers.has('Authorization'))throw new TeamOperationError('Sign in to continue.',403);return{id:'qa-actor'};};
          export const requireTeamAdmin=async()=>{if(c.role!=='admin')throw new TeamOperationError('Team admin access required.',403);};
          export const memberRole=async()=>({role:c.role});
          export const inviteToken=()=>({token:'synthetic-invite-token-for-tests',hash:'synthetic-hash'});
          export const teamBillingReady=()=>false;
          export const audit=async(db,actor,action,org,detail)=>{c.audits.push({actor,action,org,detail});};
          export const sendTeamEmail=async()=>{c.mailCalls++;if(c.failMail)throw c.failMail;};
          export const teamAdminClient=()=>({
            auth:{admin:{getUserById:async()=>({data:{user:{email:'fixture@example.invalid'}}})}},
            rpc:async(name,args)=>{if(name==='team_reserve_invitation'){c.writes.push({table:name,payload:args});return{data:${JSON.stringify(id)},error:null};}return{data:[],error:null};},
            from(table){let op='read',payload,scalar=false;return{
              select(){return this;},eq(){return this;},in(){return this;},not(){return this;},order(){return this;},limit(){return this;},single(){scalar=true;return this;},maybeSingle(){scalar=true;return this;},
              update(value){op='update';payload=value;return this;},upsert(value){op='upsert';payload=value;return this;},
              then(done,fail){return Promise.resolve().then(()=>{
                if(op!=='read'){c.writes.push({table,op,payload});if(c.failSent&&payload.sent_at){c.failSent=false;throw Error('PRIVATE SDK sent timestamp diagnostic');}return{data:null,error:null};}
                if(table==='team_organizations')return{data:{id:${JSON.stringify(id)},name:'Synthetic workspace'},error:null};
                if(table==='team_entitlements')return{data:{status:'active'},error:null};
                if(table==='team_members'&&scalar)return{data:{user_id:'synthetic-member',display_name:'Fixture',status:'active'},error:null};
                if(table==='team_invitations')return{data:scalar?{email:'fixture@example.invalid',display_name:'Fixture',module_id:'roofing',require_certificate:false,status:'pending'}:c.rows,error:null};
                return{data:[],error:null};
              }).then(done,fail);}
            };}
          });`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    const call = async (action, delivery = "email", auth = true) => {
      const body =
        action === "invite"
          ? {
              action,
              orgId: id,
              name: "Synthetic fixture",
              email: "fixture@example.invalid",
              moduleId: "roofing",
              requireCertificate: false,
              delivery,
            }
          : action === "resend"
            ? { action, orgId: id, invitationId: id, delivery }
            : {
                action: "assign",
                orgId: id,
                memberId: id,
                moduleId: "roofing",
                requireCertificate: false,
              };
      return Route.server.handlers.POST({
        request: new Request("https://fixture.invalid/api/team", {
          method: "POST",
          headers: {
            Origin: "https://fixture.invalid",
            ...(auth ? { Authorization: "Bearer synthetic" } : {}),
          },
          body: JSON.stringify(body),
        }),
      });
    };
    const get = () =>
      Route.server.handlers.GET({
        request: new Request("https://fixture.invalid/api/team?org=" + id, {
          headers: { Authorization: "Bearer synthetic" },
        }),
      });
    await run({ c, call, get });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function privacy(response) {
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}
for (const action of ["invite", "resend", "assign"])
  test(`${action} suppresses rejected mail diagnostics while preserving saved operation`, () =>
    fixture(async ({ c, call }) => {
      c.failMail = Error("PRIVATE mail transport session detail");
      const response = await call(action);
      privacy(response);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.warning, action === "assign" ? assignWarning : inviteWarning);
      assert.doesNotMatch(JSON.stringify(body), /PRIVATE|transport|session detail/);
      assert.equal(c.mailCalls, 1);
      assert.equal(c.audits.length, 1);
      assert.equal(c.audits[0].action, "team." + action);
      if (action === "assign") {
        assert.equal(body.ok, true);
        assert.equal(c.writes.filter((x) => x.table === "team_assignments").length, 1);
      } else {
        assert.equal(
          body.inviteUrl,
          "https://fixture.invalid/team/accept?token=synthetic-invite-token-for-tests",
        );
        assert.ok(c.writes.some((x) => x.payload?.last_email_error === inviteWarning));
      }
      assert.doesNotMatch(JSON.stringify(c.writes), /PRIVATE/);
    }));
test("post-send bookkeeping rejections return fixed uncertain delivery without sending again", () =>
  fixture(async ({ c, call }) => {
    for (const action of ["invite", "resend"]) {
      c.failSent = true;
      const before = c.mailCalls;
      const response = await call(action);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.warning, inviteWarning);
      assert.ok(body.inviteUrl);
      assert.equal(c.mailCalls, before + 1);
      assert.doesNotMatch(JSON.stringify(body), /PRIVATE|SDK/);
    }
  }));
test("successful email and manual delivery retain null warnings and original link semantics", () =>
  fixture(async ({ c, call }) => {
    for (const action of ["invite", "resend", "assign"]) {
      const response = await call(action);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.warning, null);
      if (action !== "assign") assert.equal(body.inviteUrl, null);
    }
    const sent = c.mailCalls;
    c.failMail = Error("PRIVATE must not be invoked");
    for (const action of ["invite", "resend"]) {
      const response = await call(action, "manual");
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.warning, null);
      assert.ok(body.inviteUrl);
    }
    assert.equal(c.mailCalls, sent);
  }));
test("GET normalizes old and malformed stored invitation diagnostics without changing source records", () =>
  fixture(async ({ c, get }) => {
    c.rows = [
      null,
      "",
      "PRIVATE old provider diagnostic",
      "Email service returned 400.",
      inviteWarning,
      { private: "PRIVATE" },
      false,
      0,
    ].map((last_email_error, i) => ({
      id: "fixture-" + i,
      email: "fixture@example.invalid",
      last_email_error,
    }));
    const before = structuredClone(c.rows);
    const response = await get();
    privacy(response);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(
      body.invitations,
      before.map((row, i) => ({ ...row, last_email_error: i < 2 ? null : inviteWarning })),
    );
    assert.deepEqual(c.rows, before);
    assert.deepEqual(c.writes, []);
    assert.equal(c.mailCalls, 0);
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE|provider diagnostic|service returned/);
  }));
test("missing-auth and nonadmin denials precede writes; nonadmin GET contains no invitation data", () =>
  fixture(async ({ c, call, get }) => {
    const missing = await call("invite", "email", false);
    privacy(missing);
    assert.equal(missing.status, 403);
    assert.deepEqual(c.writes, []);
    c.role = "learner";
    const denied = await call("invite");
    assert.equal(denied.status, 403);
    assert.equal(c.mailCalls, 0);
    assert.deepEqual(c.writes, []);
    c.rows = [{ last_email_error: "PRIVATE" }];
    const response = await get();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).invitations, []);
  }));
