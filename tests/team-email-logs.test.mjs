import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
const id = "11111111-1111-4111-8111-111111111111";
async function fixture(name, run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/team-email-log-"));
  const original = {
    error: console.error,
    fetch: globalThis.fetch,
    env: Object.fromEntries(
      ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PLATFORM_OWNER_EMAIL"].map((k) => [
        k,
        process.env[k],
      ]),
    ),
  };
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.${name}';export {c} from 'controls';`,
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
          name: "isolated-mail-logs",
          setup(b) {
            if (process.env.LT_EMAIL_LOG_BASELINE)
              b.onLoad(
                { filter: /\/src\/routes\/api\.(platform|stripe-webhook)\.ts$/ },
                (args) => ({
                  contents: execFileSync(
                    "git",
                    [
                      "show",
                      `${process.env.LT_EMAIL_LOG_BASELINE}:src/routes/${args.path.split("/").pop()}`,
                    ],
                    { encoding: "utf8" },
                  ),
                  loader: "ts",
                  resolveDir: resolve("src/routes"),
                }),
              );
            b.onResolve(
              {
                filter:
                  /^(controls|@tanstack\/react-router|@\/lib\/(team-server|team-subscription|stripe-ledger-backfill)|stripe|@supabase\/supabase-js)$/,
              },
              () => ({ path: "controls", namespace: "controls" }),
            );
            b.onLoad({ filter: /.*/, namespace: "controls" }, () => ({
              resolveDir: process.cwd(),
              contents: `
        export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};
        export const c={logs:[],operations:[],mailCalls:0,audits:0,owners:0,dbError:false,invalidSignature:false,verified:[],event:{type:'checkout.session.completed',created:1,data:{object:{id:'synthetic-session',payment_status:'paid',amount_total:2000,metadata:{customModuleRequestId:${JSON.stringify(id)}}}}}};
        export const createFileRoute=()=>c=>c;
        export const authenticatedTeamUser=async()=>({id:'synthetic-owner'});
        export const requirePlatformOwner=async()=>{c.owners++;};
        export const audit=async()=>{c.audits++;};
        export const sendTeamEmail=async()=>{c.mailCalls++;throw Error('PRIVATE provider failure with credentials and recipient context');};
        export const syncTeamSubscription=async()=>{throw Error('Unexpected subscription sync');};
        export const backfillStripeLedger=async()=>{throw Error('Unexpected ledger import');};
        export const createClient=()=>{throw Error('Unexpected SDK construction');};
        export const isAuthRetryableFetchError=()=>false;
        export const teamAdminClient=()=>({auth:{admin:{getUserById:async()=>({data:{user:{email:'fixture@example.invalid'}}})}},from(table){let operation='read';return{
          select(){return this;},eq(){return this;},neq(){return this;},single(){return this;},maybeSingle(){return this;},update(value){operation='update';return this;},upsert(value){operation='upsert';return this;},
          then(done,fail){c.operations.push({table,operation});return Promise.resolve({data:{id:${JSON.stringify(id)},organization_id:${JSON.stringify(id)},requester_id:'synthetic-requester',title:'Synthetic request',audience:'Fixture',situations:'Fixture',status:'pending_payment'},error:c.dbError?Error('PRIVATE database rejection'):null}).then(done,fail);}
        };}});
        export default class Stripe{constructor(){this.webhooks={constructEventAsync:async(raw,sig,secret)=>{c.verified.push({raw,sig,secret});if(c.invalidSignature)throw Error('PRIVATE invalid signature');return c.event;}};}}
      `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    console.error = (...args) => c.logs.push(args);
    globalThis.fetch = () => {
      throw Error("Unexpected network dispatch");
    };
    Object.assign(process.env, {
      STRIPE_SECRET_KEY: "fixture-only",
      STRIPE_WEBHOOK_SECRET: "fixture-only",
      PLATFORM_OWNER_EMAIL: "fixture@example.invalid",
    });
    await run({
      c,
      post: async () =>
        Route.server.handlers.POST({
          request: new Request(`https://fixture.invalid/api/${name}`, {
            method: "POST",
            headers: {
              Origin: "https://fixture.invalid",
              "stripe-signature": "synthetic-signature",
            },
            body:
              name === "platform"
                ? JSON.stringify({
                    action: "module_request_update",
                    requestId: id,
                    status: "reviewing",
                    ownerNote: "Synthetic note",
                  })
                : "synthetic-raw-webhook",
          }),
        }),
    });
  } finally {
    console.error = original.error;
    globalThis.fetch = original.fetch;
    for (const [k, v] of Object.entries(original.env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("owner notification failure logs fixed text and preserves the saved request response", () =>
  fixture("platform", async ({ c, post }) => {
    const response = await post();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(c.mailCalls, 1);
    assert.equal(c.owners, 1);
    assert.equal(c.audits, 1);
    assert.deepEqual(c.logs, [["Custom module status email delivery could not be confirmed."]]);
    assert.equal(c.operations.filter((x) => x.operation === "update").length, 1);
  }));
test("webhook owner email failure logs fixed text and preserves processing continuation", () =>
  fixture("stripe-webhook", async ({ c, post }) => {
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(c.mailCalls, 1);
    assert.equal(c.audits, 1);
    assert.equal(c.verified.length, 1);
    assert.equal(c.verified[0].raw, "synthetic-raw-webhook");
    assert.equal(c.verified[0].sig, "synthetic-signature");
    assert.deepEqual(c.logs, [["Custom module owner email delivery could not be confirmed."]]);
    assert.ok(
      c.operations.some((x) => x.table === "platform_ledger_entries" && x.operation === "upsert"),
    );
  }));
test("invalid webhook signature stops before work and unexpected processing errors retain fixed500 without raw logs", () =>
  fixture("stripe-webhook", async ({ c, post }) => {
    c.invalidSignature = true;
    const invalid = await post();
    assert.equal(invalid.status, 400);
    assert.equal(await invalid.text(), "Invalid signature");
    assert.deepEqual(c.operations, []);
    assert.deepEqual(c.logs, []);
    c.invalidSignature = false;
    c.dbError = true;
    const failed = await post();
    assert.equal(failed.status, 500);
    assert.equal(await failed.text(), "Webhook processing failed");
    assert.equal(c.mailCalls, 0);
    assert.equal(c.audits, 0);
    assert.equal(c.verified.length, 2);
    assert.deepEqual(c.logs, [["Webhook processing could not be confirmed."]]);
  }));
