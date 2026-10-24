import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

// /api/verify-checkout answers one question for the success page: did the signed-in learner
// complete this Stripe Checkout session? The real route is bundled with fake Stripe and auth.
async function loadRoute() {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/verify-checkout-"));
  const out = join(dir, "route.mjs");
  await build({
    stdin: {
      contents: `export {Route} from './src/routes/api.verify-checkout.ts';export {c} from 'fixture';`,
      resolveDir: process.cwd(),
    },
    outfile: out,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    plugins: [
      {
        name: "fixture",
        setup(b) {
          b.onResolve(
            { filter: /^(fixture|@tanstack\/react-router|stripe|@\/lib\/team-server)$/ },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
export const c={user:{id:'user-1'},session:null,retrieved:[],signedIn:true};
export const createFileRoute=path=>config=>({path,...config});
export default class Stripe{constructor(){this.checkout={sessions:{retrieve:async id=>{c.retrieved.push(id);if(c.session instanceof Error)throw c.session;return c.session;}}};}}
export class TeamOperationError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const teamAdminClient=()=>({}),authenticatedTeamUser=async()=>{if(!c.signedIn)throw new TeamOperationError('Sign in to continue.',403);return c.user;};
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
export const scopedTeamError=e=>e instanceof TeamOperationError?json({error:e.message},e.status):e?.name==='ZodError'?json({error:'Check your team request and try again.'},400):json({error:'We could not confirm this team request.'},503);
`,
          }));
        },
      },
    ],
  });
  return { ...(await import(out)), dir };
}

const ID = "cs_test_a1B2c3D4e5F6";
const ask = (Route, id) =>
  Route.server.handlers.GET({
    request: new Request(`https://app.languagethreshold.com/api/verify-checkout?sessionId=${id}`, {
      headers: { authorization: "Bearer token" },
    }),
  });
const paidSession = (over = {}) => ({
  mode: "subscription",
  status: "complete",
  payment_status: "no_payment_required",
  client_reference_id: "user-1",
  amount_total: 14900,
  customer_email: "someone@example.com",
  ...over,
});

test("verify-checkout reports paid only for the signed-in learner's completed subscription session", async () => {
  const { Route, c, dir } = await loadRoute();
  const old = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  try {
    c.session = paidSession();
    let response = await ask(Route, ID);
    assert.equal(response.status, 200);
    const body = await response.json();
    // A bare boolean: no amounts, emails or ids.
    assert.deepEqual(body, { paid: true });

    c.session = paidSession({ payment_status: "paid" });
    assert.deepEqual(await (await ask(Route, ID)).json(), { paid: true });

    for (const session of [
      paidSession({ status: "open" }),
      paidSession({ status: "expired" }),
      paidSession({ payment_status: "unpaid" }),
      paidSession({ mode: "payment" }),
      paidSession({ client_reference_id: "someone-else" }),
      paidSession({ client_reference_id: null }),
    ]) {
      c.session = session;
      response = await ask(Route, ID);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { paid: false });
    }
  } finally {
    if (old === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = old;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify-checkout rejects signed-out callers and malformed ids before asking Stripe", async () => {
  const { Route, c, dir } = await loadRoute();
  const old = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  try {
    c.session = paidSession();
    c.signedIn = false;
    assert.equal((await ask(Route, ID)).status, 403);
    c.signedIn = true;
    for (const bad of [
      "",
      "cs_test_",
      "pi_123456789",
      "cs_live_../x",
      "cs_test_a%40b.com",
      "x".repeat(300),
    ])
      assert.equal((await ask(Route, bad)).status, 400, bad);
    assert.deepEqual(c.retrieved, []);

    c.session = new Error("stripe down");
    assert.equal((await ask(Route, ID)).status, 503);

    delete process.env.STRIPE_SECRET_KEY;
    c.session = paidSession();
    assert.equal((await ask(Route, ID)).status, 503);
  } finally {
    if (old === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = old;
    rmSync(dir, { recursive: true, force: true });
  }
});
