import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture() {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/document-payments-"));
  const out = join(dir, "fixture.mjs");
  await build({
    stdin: {
      contents: `export {Route} from './src/routes/api.documents.ts';export {fulfillDocumentSession,fulfillDocumentInvoice} from './src/lib/document-billing-server.ts';export {c} from 'fixture';`,
      resolveDir: process.cwd(),
    },
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    plugins: [
      {
        name: "fixture",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(fixture|stripe|@tanstack\/react-router|@\/lib\/team-server|\.\/team-server|@\/lib\/document-translation-server|@\/lib\/learning-generation-security)$/,
            },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
export const c={rpc:[],checkouts:[],account:null,reserveError:null,translationError:false,translated:0};
export const createFileRoute=()=>x=>x;
export class TeamOperationError extends Error{constructor(message,status=400){super(message);this.status=status}}
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
export const scopedTeamError=e=>json({error:e.message},e.status??503);
export const authenticatedTeamUser=async req=>{if(!req.headers.has('authorization'))throw new TeamOperationError('Sign in',403);return{id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid'}};
export function teamAdminClient(){return{rpc:async(name,args)=>{c.rpc.push({name,args});return{error:name==='document_reserve'?c.reserveError:null}},from:()=>({upsert:async()=>({error:null}),select(){return this},eq(){return this},order:async()=>({data:[],error:null}),maybeSingle:async()=>({data:c.account,error:null}),single:async()=>({data:{id:'doc',sentences:[{en:'Original',target:'Traducción'}]},error:null})})}}
export const learningGenerationOriginError=()=>null;
export const checkLearningGenerationBudget=async()=>null;
export const translateDocumentContent=async()=>{c.translated++;if(c.translationError)throw Error('Provider unavailable');return[{en:'Original',target:'Traducción'}]};
export default class Stripe{constructor(){this.checkout={sessions:{retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/recovered'}),create:async(params,options)=>{c.checkouts.push({params,options});return{url:'https://checkout.stripe.com/test'}}}}}}
`,
          }));
        },
      },
    ],
  });
  return { ...(await import(out)), dir };
}
const origin = "https://app.languagethreshold.com";
const post = (Route, data, auth = true) =>
  Route.server.handlers.POST({
    request: new Request(origin + "/api/documents", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        ...(auth ? { authorization: "Bearer fixture" } : {}),
      },
      body: JSON.stringify(data),
    }),
  });
const id = "22222222-2222-4222-8222-222222222222";
test("document checkout fixes price and quantities server-side and requires authentication", async () => {
  const f = await fixture();
  const old = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "test-fixture";
  try {
    assert.equal(
      (await post(f.Route, { action: "checkout", kind: "translations", id }, false)).status,
      403,
    );
    assert.equal(f.c.checkouts.length, 0);
    assert.equal(
      (
        await post(f.Route, {
          action: "checkout",
          kind: "translations",
          id,
          amount: 1,
          quantity: 999,
        })
      ).status,
      200,
    );
    const first = f.c.checkouts[0].params;
    assert.equal(first.mode, "payment");
    assert.equal(first.line_items[0].price_data.unit_amount, 500);
    assert.equal(first.line_items[0].quantity, 1);
    assert.equal(first.metadata.documentPurchase, "translations");
    assert.equal((await post(f.Route, { action: "checkout", kind: "storage", id })).status, 200);
    const storage = f.c.checkouts[1].params;
    assert.equal(storage.mode, "subscription");
    assert.equal(storage.line_items[0].price_data.recurring.interval, "month");
    assert.equal(storage.subscription_data.metadata.documentPurchase, "storage");
    assert.ok(!storage.subscription_data.trial_period_days);
    f.c.account = { storage_checkout_session_id: "cs_pending" };
    const recovered = await post(f.Route, { action: "checkout", kind: "storage", id });
    assert.equal((await recovered.json()).url, "https://checkout.stripe.com/recovered");
    assert.equal(f.c.checkouts.length, 2, "existing checkout must not create another subscription");
  } finally {
    if (old === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = old;
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("quota denial never calls the provider, and provider failure refunds its reservation", async () => {
  const f = await fixture();
  try {
    const data = {
      action: "translate",
      id,
      title: "Safety",
      text: "Do not lift 15 kg alone.",
      sourceLanguage: "English",
      targetLanguage: "Spanish",
      quality: "standard",
    };
    f.c.reserveError = { message: "Allowance reached" };
    assert.equal((await post(f.Route, data)).status, 400);
    assert.equal(f.c.translated, 0);
    f.c.reserveError = null;
    f.c.translationError = true;
    assert.equal((await post(f.Route, data)).status, 503);
    assert.equal(f.c.translated, 1);
    assert.deepEqual(f.c.rpc.at(-1), {
      name: "document_finish",
      args: { p_user: "11111111-1111-4111-8111-111111111111", p_id: id, p_sentences: null },
    });
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("only paid matching document sessions are fulfilled; renewals use the paid invoice period", async () => {
  const f = await fixture();
  try {
    const stripe = {
      checkout: {
        sessions: {
          listLineItems: async () => ({
            data: [{ quantity: 1, price: { unit_amount: 500, currency: "usd" } }],
          }),
        },
      },
      subscriptions: { retrieve: async () => ({}) },
    };
    const session = {
      id: "cs_test",
      mode: "payment",
      payment_status: "unpaid",
      metadata: { documentPurchase: "translations", userId: "user" },
    };
    assert.equal(await f.fulfillDocumentSession(stripe, session), true);
    assert.equal(f.c.rpc.length, 0);
    await f.fulfillDocumentSession(stripe, { ...session, payment_status: "paid" });
    assert.equal(f.c.rpc[0].name, "document_grant");
    assert.equal(f.c.rpc[0].args.p_payment, "checkout:cs_test");
    const sub = {
      id: "sub",
      customer: "cus",
      metadata: { documentPurchase: "storage", userId: "user" },
      items: {
        data: [
          {
            current_period_end: 2000000000,
            quantity: 1,
            price: { unit_amount: 500, currency: "usd", recurring: { interval: "month" } },
          },
        ],
      },
    };
    await f.fulfillDocumentInvoice(
      stripe,
      { id: "in_old", status: "paid", lines: { data: [{ period: { end: 1900000000 } }] } },
      sub,
    );
    assert.equal(f.c.rpc.at(-1).args.p_until, new Date(1900000000000).toISOString());
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
