import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import ts from "typescript";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(name, run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/assessment-auth-errors-"));
  const routePath = resolve(`src/routes/api.${name}.ts`);
  const text = readFileSync(routePath, "utf8"),
    source = ts.createSourceFile(routePath, text, ts.ScriptTarget.Latest, true);
  const exports = new Map();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !node.moduleSpecifier.text.startsWith("@/lib/") ||
      node.moduleSpecifier.text === "@/lib/team-server"
    )
      continue;
    const binding = node.importClause?.namedBindings;
    if (binding && ts.isNamedImports(binding))
      exports.set(
        node.moduleSpecifier.text,
        binding.elements
          .filter((x) => !x.isTypeOnly)
          .map((x) => x.propertyName?.text ?? x.name.text),
      );
  }
  try {
    await build({
      stdin: {
        contents: `export {Route} from ${JSON.stringify(routePath)};export {c,TeamOperationError,AssessmentAccessError} from 'controls';`,
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
          name: "controlled-assessment-dependencies",
          setup(b) {
            b.onResolve(
              { filter: /^(controls|@tanstack\/react-router|@\/lib\/team-server)$/ },
              () => ({ path: "controls", namespace: "controls" }),
            );
            b.onResolve({ filter: /^@\/lib\// }, (args) =>
              exports.has(args.path)
                ? { path: args.path, namespace: "assessment-dependency" }
                : null,
            );
            b.onLoad({ filter: /.*/, namespace: "controls" }, () => ({
              resolveDir: process.cwd(),
              contents: `import {authenticatedAssessmentUser as actualAuth} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export {TeamOperationError,json} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export {AssessmentAccessError} from ${JSON.stringify(resolve("src/lib/assessments/errors.ts"))};export const c={clients:0,auth:0,privateCalls:0,clientError:null,authError:null};export const createFileRoute=()=>c=>c;export const teamAdminClient=(fetcher,authRequest)=>{c.clients++;c.authRequest=authRequest;if(c.clientError)throw c.clientError;if(c.db)return c.db;return {from(){c.privateCalls++;throw Error('Unexpected private read')},rpc(){c.privateCalls++;throw Error('Unexpected private write')}}};export const authenticatedUser=async()=>{c.auth++;if(c.authError)throw c.authError;return {id:'synthetic',email:'fixture@example.invalid'}};export const authenticatedAssessmentUser=(request,db)=>c.realAuth?actualAuth(request,db):authenticatedUser();export const requireTeamAdmin=()=>{c.privateCalls++;throw Error('Unexpected private guard')};export const memberRole=requireTeamAdmin;`,
            }));
            b.onLoad({ filter: /.*/, namespace: "assessment-dependency" }, (args) => ({
              resolveDir: process.cwd(),
              contents: exports
                .get(args.path)
                .map((name) =>
                  name === "AssessmentAccessError"
                    ? `export {AssessmentAccessError} from 'controls';`
                    : name === "isStrictSameOrigin"
                      ? `export const isStrictSameOrigin=()=>true;`
                      : `import {c as c_${name}} from 'controls';export const ${name}=()=>{c_${name}.privateCalls++;throw Error('Unexpected private dependency')};`,
                )
                .join("\n"),
            }));
          },
        },
      ],
    });
    const { Route, c, TeamOperationError, AssessmentAccessError } = await import(
      join(dir, "route.mjs")
    );
    const call = (method, supplied) =>
      Route.server.handlers[method]({
        request:
          supplied ??
          new Request(`https://fixture.invalid/api/${name}`, {
            method,
            headers: { Origin: "https://fixture.invalid", Authorization: "Bearer synthetic" },
            ...(method === "POST" ? { body: "{}" } : {}),
          }),
      });
    await run({ c, call, TeamOperationError, AssessmentAccessError });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const fallback = {
  exams: "Assessments are temporarily unavailable. Your submitted answers remain saved.",
  "exam-plans": "The assessment plan could not be updated. Saved records remain available.",
  "exam-content": "Private content review is temporarily unavailable.",
  "exam-reviewers": "Reviewer access could not be updated. Refresh before trying again.",
};
for (const name of Object.keys(fallback)) {
  test(`actual ${name} GET/POST suppresses untyped auth/config diagnostics even with former regex words`, () =>
    fixture(name, async ({ c, call }) => {
      for (const method of ["GET", "POST"])
        for (const phase of ["clientError", "authError"])
          for (const error of [
            Error("SYNTHETIC_PRIVATE session token backend detail"),
            Error("SYNTHETIC_PRIVATE Sign in backend detail"),
            Error("SYNTHETIC_PRIVATE owner access required detail"),
            Error("SYNTHETIC_PRIVATE unrelated diagnostic"),
            { message: "SYNTHETIC_PRIVATE session diagnostic" },
          ]) {
            c.clientError = null;
            c.authError = null;
            c[phase] = error;
            c.auth = 0;
            const result = await call(method);
            assert.equal(result.status, 503);
            assert.deepEqual(await result.json(), { error: fallback[name] });
            assert.equal(result.headers.get("cache-control"), "private, no-store");
            assert.equal(result.headers.get("x-content-type-options"), "nosniff");
            assert.equal(c.auth, phase === "authError" ? 1 : 0);
            assert.equal(c.privateCalls, 0);
          }
    }));
  test(`actual ${name} preserves typed auth denial and intentional assessment status/guidance`, () =>
    fixture(name, async ({ c, call, TeamOperationError, AssessmentAccessError }) => {
      for (const method of ["GET", "POST"]) {
        c.authError = new TeamOperationError("Sign in to continue.", 403);
        let result = await call(method);
        assert.equal(result.status, 403);
        assert.deepEqual(await result.json(), {
          error:
            name === "exam-content"
              ? "Sign in with an authorized content reviewer or platform owner account."
              : name === "exam-reviewers"
                ? "Registered platform owner access required."
                : "Sign in to continue.",
        });
        c.authError = new TeamOperationError("Team database is not configured.", 503);
        result = await call(method);
        assert.equal(result.status, 503);
        assert.deepEqual(await result.json(), { error: fallback[name] });
        c.authError = new AssessmentAccessError("Synthetic fixed conflict.", 409);
        result = await call(method);
        assert.equal(result.status, 409);
        assert.deepEqual(await result.json(), { error: "Synthetic fixed conflict." });
        assert.equal(c.privateCalls, 0);
      }
    }));
}
for (const name of Object.keys(fallback)) {
  test(`actual ${name} bounded auth stops preabort/deadline/disconnect before private work`, () =>
    fixture(name, async ({ c, call }) => {
      const savedSet = setTimeout,
        savedClear = clearTimeout,
        timers = new Map();
      globalThis.setTimeout = (fn, ms, ...args) => {
        if (ms !== 15000) return savedSet(fn, ms, ...args);
        const token = { unref() {} };
        timers.set(token, fn);
        return token;
      };
      globalThis.clearTimeout = (token) => {
        if (timers.has(token)) timers.delete(token);
        else savedClear(token);
      };
      const until = async (check) => {
        for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => savedSet(r, 1));
        assert.ok(check());
      };
      let pending, resolveUser;
      try {
        c.realAuth = true;
        for (const [method, query] of name === "exams"
          ? [
              ["GET", ""],
              ["POST", ""],
              ["POST", "?action=speech_upload"],
            ]
          : [
              ["GET", ""],
              ["POST", ""],
            ]) {
          for (const phase of ["preabort", "deadline", "disconnect"]) {
            c.privateCalls = 0;
            let sdkCalls = 0;
            const gate = new Promise((r) => (resolveUser = r));
            c.db = {
              auth: {
                getUser: async (token) => {
                  sdkCalls++;
                  assert.equal(token, "synthetic");
                  return gate;
                },
              },
              from() {
                c.privateCalls++;
                throw Error("Unexpected private read");
              },
              rpc() {
                c.privateCalls++;
                throw Error("Unexpected private write");
              },
            };
            const owner = new AbortController(),
              request = new Request(`https://fixture.invalid/api/${name}${query}`, {
                method,
                signal: owner.signal,
                headers: { Origin: "https://fixture.invalid", Authorization: "Bearer synthetic" },
                ...(method === "POST" ? { body: "{}" } : {}),
              });
            const listeners = new Set(),
              add = request.signal.addEventListener.bind(request.signal),
              remove = request.signal.removeEventListener.bind(request.signal);
            request.signal.addEventListener = (kind, fn, opts) => {
              if (kind === "abort") listeners.add(fn);
              add(kind, fn, opts);
            };
            request.signal.removeEventListener = (kind, fn, opts) => {
              if (kind === "abort") listeners.delete(fn);
              remove(kind, fn, opts);
            };
            if (phase === "preabort") owner.abort();
            pending = call(method, request);
            if (phase !== "preabort") {
              await until(() => sdkCalls === 1);
              if (phase === "deadline") for (const fn of [...timers.values()]) fn();
              else owner.abort();
            }
            const result = await pending;
            assert.equal(result.status, phase === "deadline" ? 503 : 499);
            assert.deepEqual(await result.json(), {
              error: phase === "deadline" ? fallback[name] : "Assessment request cancelled.",
            });
            assert.equal(c.authRequest, request);
            assert.equal(sdkCalls, phase === "preabort" ? 0 : 1);
            assert.equal(c.privateCalls, 0);
            assert.equal(listeners.size, 0);
            assert.equal(timers.size, 0);
            resolveUser({
              data: { user: { id: "synthetic", email: "fixture@example.invalid" } },
              error: null,
            });
            await new Promise((r) => savedSet(r, 1));
            assert.equal(c.privateCalls, 0);
            pending = null;
          }
        }
      } finally {
        resolveUser?.({ data: { user: null }, error: null });
        if (pending) await pending.catch(() => {});
        globalThis.setTimeout = savedSet;
        globalThis.clearTimeout = savedClear;
      }
    }));
}
