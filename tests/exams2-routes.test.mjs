// Built by TAC — 2026-10-23
// Route wiring for /api/exam-check and /api/exam-bank with the real team-server auth and owner
// gate, against a mocked Supabase REST/Auth over fetch: kill switch, non-owner 403 before any bank
// read, missing-migration 503, and the T11 client-bundle scan.
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findExamBankKeyLeaks } from "../scripts/verify-vercel-artifact.mjs";

const USER = "10000000-0000-4000-8000-000000000001";
const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PLATFORM_OWNER_EMAIL",
  "LT_EXAMS_V2",
  "LT_EXAMS_PUBLIC",
];

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/exams2-routes-"));
  const oldFetch = globalThis.fetch;
  const saved = KEYS.map((k) => process.env[k]);
  try {
    await build({
      stdin: {
        contents: `export {Route as check} from '@/routes/api.exam-check';export {Route as bank} from '@/routes/api.exam-bank';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "shell",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "shell",
              namespace: "shell",
            }));
            b.onLoad({ filter: /.*/, namespace: "shell" }, () => ({
              contents: "export const createFileRoute=()=>config=>config;",
            }));
          },
        },
      ],
    });
    const api = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
    for (const k of ["PLATFORM_OWNER_EMAIL", "LT_EXAMS_V2", "LT_EXAMS_PUBLIC"])
      delete process.env[k];
    const c = { role: "learner", calls: [] };
    const missingTable = (table) =>
      Response.json(
        {
          code: "PGRST205",
          message: `Could not find the table 'public.${table}' in the schema cache`,
        },
        { status: 404 },
      );
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      c.calls.push({ path: url.pathname, method: init?.method ?? "GET" });
      if (url.pathname === "/auth/v1/user")
        return Response.json({
          id: USER,
          email: "owner@example.invalid",
          email_confirmed_at: "2026-01-01",
        });
      if (url.pathname === "/rest/v1/platform_admin_roles")
        return Response.json(c.role === "learner" ? [] : [{ role: c.role }]);
      if (url.pathname === "/rest/v1/platform_audit_events")
        return new Response(null, { status: 201 });
      if (url.pathname === "/rest/v1/exam_banks") return missingTable("exam_banks");
      if (url.pathname === "/rest/v1/exam_sessions") return missingTable("exam_sessions");
      throw Error("Unexpected private operation " + url.pathname);
    };
    const request = (path, body, { auth = true, origin = "https://app.invalid" } = {}) =>
      new Request("https://app.invalid" + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(auth ? { authorization: "Bearer fake-token" } : {}),
          ...(body ? { origin, "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    await run({ api, c, request });
  } finally {
    globalThis.fetch = oldFetch;
    KEYS.forEach((k, i) =>
      saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}
const post = (route) => route.server.handlers.POST;
const get = (route) => route.server.handlers.GET;

test("exam-check: kill switch off is a 404 with no private call; on + missing tables is 503", async () => {
  await fixture(async ({ api, c, request }) => {
    const body = { action: "start", moduleId: "roofing", kind: "C" };
    const off = await post(api.check)({ request: request("/api/exam-check", body) });
    assert.equal(off.status, 404);
    assert.equal((await off.json()).code, "disabled");
    assert.equal(c.calls.length, 0);

    process.env.LT_EXAMS_V2 = "1";
    const guest = await post(api.check)({
      request: request("/api/exam-check", body, { auth: false }),
    });
    assert.equal(guest.status, 401);
    const notReady = await post(api.check)({ request: request("/api/exam-check", body) });
    assert.equal(notReady.status, 503);
    assert.deepEqual(await notReady.json(), {
      error: "Exams are being set up. Please try again later.",
      code: "exams_not_ready",
    });
    const cross = await post(api.check)({
      request: request("/api/exam-check", body, { origin: "https://evil.invalid" }),
    });
    assert.equal(cross.status, 403);
  });
});

test("exam-bank: guests and non-owners get 403 before any bank read; owners reach storage", async () => {
  await fixture(async ({ api, c, request }) => {
    const guest = await get(api.bank)({
      request: request("/api/exam-bank", null, { auth: false }),
    });
    assert.equal(guest.status, 403);
    const learner = await get(api.bank)({ request: request("/api/exam-bank") });
    assert.equal(learner.status, 403);
    const learnerPost = await post(api.bank)({
      request: request("/api/exam-bank", { action: "approve", moduleId: "roofing" }),
    });
    assert.equal(learnerPost.status, 403);
    assert.ok(!c.calls.some((call) => call.path === "/rest/v1/exam_banks"));

    c.role = "owner";
    const owner = await get(api.bank)({ request: request("/api/exam-bank") });
    assert.equal(owner.status, 503);
    assert.equal((await owner.json()).code, "exams_not_ready");
    assert.ok(c.calls.some((call) => call.path === "/rest/v1/exam_banks"));
  });
});

test("verify-vercel-artifact runs its checks when invoked through a symlink", () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/exams2-verify-link-"));
  try {
    const link = join(dir, "verify-link.mjs");
    symlinkSync(resolve("scripts/verify-vercel-artifact.mjs"), link);
    // No .vercel output in this directory: if the checks run, they must fail on the first file.
    const viaLink = spawnSync(process.execPath, [link], { cwd: dir, encoding: "utf8" });
    assert.equal(viaLink.status, 1);
    assert.match(viaLink.stderr, /missing \.vercel\/output\/config\.json/);
    const viaRelative = spawnSync(process.execPath, ["verify-link.mjs"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(viaRelative.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T11: the client-bundle scan flags bank keys but not ordinary property reads", () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/exams2-static-"));
  try {
    mkdirSync(join(dir, "assets"));
    // Legacy-style property access and prose are fine.
    writeFileSync(
      join(dir, "assets", "ok.js"),
      'const a=s.options.map(l=>l.id===s.correctOptionId?" · accepted key":"");x.accepted=1;',
    );
    writeFileSync(join(dir, "index.html"), "<p>accepted: yes</p>");
    assert.deepEqual(findExamBankKeyLeaks(dir), []);
    writeFileSync(
      join(dir, "assets", "json.js"),
      `const b=JSON.parse('{"id":"x","accepted":["y"]}');`,
    );
    writeFileSync(
      join(dir, "assets", "escaped.js"),
      'const c="{\\"distractorRationale\\":\\"z\\"}";',
    );
    writeFileSync(join(dir, "assets", "literal.js"), 'const d=[{id:"x",correctOptionId:"a"}];');
    writeFileSync(join(dir, "assets", "map.js.map"), '{"correctOptionId":"a"}');
    const leaks = findExamBankKeyLeaks(dir).sort((a, b) => a.file.localeCompare(b.file));
    assert.deepEqual(leaks, [
      { file: join("assets", "escaped.js"), key: "distractorRationale" },
      { file: join("assets", "json.js"), key: "accepted" },
      { file: join("assets", "literal.js"), key: "correctOptionId" },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
