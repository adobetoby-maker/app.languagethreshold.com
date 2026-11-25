import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const source = await build({
  entryPoints: ["src/routes/api.account-deletion-request.ts"],
  write: false,
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "test-services",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(@tanstack\/react-router|@\/lib\/(team-server|owner-service-fetch|speaking-security))$/,
          },
          (a) => ({ path: a.path, namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
      export const createFileRoute=()=>x=>x;
      export const teamAdminClient=()=>({});
      export class TeamOperationError extends Error {constructor(m,s){super(m);this.status=s;}}
      export const authenticatedTeamUser=async request=>{
        if(request.headers.get("authorization")!=="Bearer test")throw new TeamOperationError("Sign in",403);
        return {id:"fixture-account",email:"learner@example.invalid"};
      };
      export const requireCurrentTeamRequest=()=>{};
      export const scopedTeamError=e=>Response.json({error:"Unable to proceed"},{status:e.status??503});
      export const json=v=>Response.json(v);
      export const ownerServiceFetch=()=>globalThis.__deletionMail;
      export const consumeServerRequestBudget=async()=>true;
    `,
        }));
      },
    },
  ],
});
const { Route } = await import(
  "data:text/javascript;base64," + Buffer.from(source.outputFiles[0].text).toString("base64")
);
function post(body, auth = true, origin = "https://app.languagethreshold.com") {
  return Route.server.handlers.POST({
    request: new Request("https://app.languagethreshold.com/api/account-deletion-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(auth ? { Authorization: "Bearer test" } : {}),
      },
      body: JSON.stringify(body),
    }),
  });
}
test("only an authenticated, confirmed same-origin deletion request reaches support", async () => {
  const calls = [];
  process.env.RESEND_API_KEY = "test";
  globalThis.__deletionMail = async (url, opts) => {
    calls.push({ url, opts });
    return Response.json({ id: "test-receipt" });
  };
  const body = { confirm: "delete my account" };
  assert.equal((await post(body, false)).status, 403);
  assert.equal((await post(body, true, "https://wrong.invalid")).status, 403);
  assert.equal((await post({ ...body, email: "someone-else@example.invalid" })).status, 400);
  assert.equal((await post({ confirm: "no" })).status, 400);
  assert.equal(calls.length, 0);
  for (let i = 0; i < 2; i++) assert.equal((await post(body)).status, 200);
  assert.equal(calls[0].opts.headers["Idempotency-Key"], calls[1].opts.headers["Idempotency-Key"]);
  const email = JSON.parse(calls[0].opts.body);
  assert.deepEqual(email.to, ["support@languagethreshold.com"]);
  assert.equal(email.reply_to, "learner@example.invalid");
  assert.match(email.text, /fixture-account/);
  globalThis.__deletionMail = async () => new Response("offline", { status: 503 });
  assert.equal((await post(body)).status, 503);
});
