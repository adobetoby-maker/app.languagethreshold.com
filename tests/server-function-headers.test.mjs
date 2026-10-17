import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve("node_modules/.cache/lle-tests");
mkdirSync(directory, { recursive: true });
const outfile = resolve(directory, "server-function-headers.mjs");
await build({
  stdin: {
    contents: `export {startInstance} from ${JSON.stringify(resolve("src/start.ts"))}; export {controls} from 'test-controls';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
  plugins: [
    {
      name: "request-registration-boundary",
      setup(b) {
        b.onResolve({ filter: /^(test-controls|@tanstack\/react-start(\/server)?)$/ }, () => ({
          path: "controls",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const controls={retry:undefined}; export const getResponseHeader=()=>controls.retry; export const createMiddleware=()=>({server:fn=>({server:fn})}); export const createCsrfMiddleware=options=>({csrf:options}); export const createStart=fn=>fn();`,
        }));
      },
    },
  ],
});
const { startInstance, controls } = await import(outfile);
const middleware = startInstance.requestMiddleware[0].server;
async function invoke(handlerType, status = 200, path = "/") {
  return middleware({
    handlerType,
    request: new Request(`https://practice.example${path}`),
    next: async () => ({
      response: new Response("fixture serialized body", {
        status,
        headers: { "Content-Type": "application/json", "x-tss-serialized": "true" },
      }),
      context: { fixture: true },
    }),
  });
}
test("final serialized server-function responses retain the body/status and get no-store", async () => {
  controls.retry = undefined;
  for (const status of [200, 403, 429, 503]) {
    const result = await invoke("serverFn", status);
    assert.equal(result.response.status, status);
    assert.equal(result.response.headers.get("cache-control"), "no-store");
    assert.equal(result.response.headers.get("x-tss-serialized"), "true");
    assert.equal(await result.response.text(), "fixture serialized body");
    assert.deepEqual(result.context, { fixture: true });
  }
});
test("retry timing is restored only for retryable server-function denials, not ordinary pages", async () => {
  controls.retry = "3600";
  for (const status of [429, 503])
    assert.equal((await invoke("serverFn", status)).response.headers.get("retry-after"), "3600");
  assert.equal((await invoke("serverFn", 200)).response.headers.get("retry-after"), null);
  const page = await invoke("router");
  assert.equal(page.response.headers.get("cache-control"), null);
  assert.equal(page.response.headers.get("retry-after"), null);
});
test("custom Start entry explicitly preserves framework CSRF protection for server functions", () => {
  const csrf = startInstance.requestMiddleware[1].csrf;
  assert.equal(csrf.filter({ handlerType: "serverFn" }), true);
  assert.equal(csrf.filter({ handlerType: "router" }), false);
  assert.equal(csrf.allowRequestsWithoutOriginCheck, undefined);
  assert.equal(csrf.origin, undefined);
  assert.equal(csrf.secFetchSite, undefined);
});

test("private page shells and scoped lesson links carry no-store/no-referrer without changing the body", async () => {
  for (const path of [
    "/exams",
    "/exam-content",
    "/exam-reviewers",
    "/team",
    "/account",
    "/owner",
    "/certificate?id=fixture",
    "/family-setup",
    "/subscribe/success",
    "/?module=roofing&plan=fixture",
  ]) {
    const result = await invoke("router", 200, path);
    assert.equal(result.response.headers.get("cache-control"), "no-store", path);
    assert.equal(result.response.headers.get("referrer-policy"), "no-referrer", path);
    assert.match(result.response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(result.response.headers.get("retry-after"), null);
    assert.equal(await result.response.text(), "fixture serialized body");
  }
  for (const path of ["/", "/pricing", "/?module=roofing&tab=core30", "/exams-faq"]) {
    const result = await invoke("router", 200, path);
    assert.equal(result.response.headers.get("cache-control"), null, path);
  }
});
