import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const sourceHashes = {
  "src/data/spanish-basics-core.json": "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38",
  "src/data/spanish-basics-practice.json": "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe",
};

test("French 101 conflict source pins match current main bytes", () => {
  for (const [file, expected] of Object.entries(sourceHashes)) {
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(actual, expected, file);
  }
});

test("French 101 conflict API checks owner first and returns closed, source-exact conflicts", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-french101-conflicts-"));
  const oldFetch = globalThis.fetch;
  const envKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"];
  const oldEnv = envKeys.map((key) => process.env[key]);
  try {
    await build({
      entryPoints: ["src/routes/api.owner-french101-conflicts.ts"],
      outfile: join(dir, "api.mjs"), bundle: true, format: "esm", platform: "node",
      packages: "external", logLevel: "silent",
      plugins: [{ name: "router-shell", setup(api) {
        api.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({ path: "router-shell", namespace: "shell" }));
        api.onLoad({ filter: /.*/, namespace: "shell" }, () => ({ contents: "export const createFileRoute=()=>config=>config;" }));
      } }],
    });
    const { Route } = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
    delete process.env.PLATFORM_OWNER_EMAIL;
    let role = "learner";
    const calls = [];
    globalThis.fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      calls.push(path);
      if (path === "/auth/v1/user") return Response.json({
        id: "10000000-0000-4000-8000-000000000001", email: "owner@example.invalid",
        email_confirmed_at: "2026-01-01",
      });
      if (path === "/rest/v1/platform_admin_roles")
        return Response.json(role === "owner" ? [{ role: "owner" }] : []);
      throw Error(`Unexpected private operation ${path}`);
    };
    const request = (auth) => new Request("https://app.invalid/api/owner-french101-conflicts", {
      headers: auth ? { authorization: "Bearer fake-token" } : {},
    });
    let response = await Route.server.handlers.GET({ request: request(false) });
    assert.equal(response.status, 403);
    response = await Route.server.handlers.GET({ request: request(true) });
    assert.equal(response.status, 403);
    assert.ok(calls.every((path) => ["/auth/v1/user", "/rest/v1/platform_admin_roles"].includes(path)));
    role = "owner";
    response = await Route.server.handlers.GET({ request: request(true) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const packet = await response.json();
    assert.deepEqual(packet.sourceHashes, sourceHashes);
    assert.deepEqual(packet.lessons.map((lesson) => lesson.stableId),
      [22, 23, 24, 25, 26, 27, 28, 29, 30].map((n) => `french-basics:${n}:fr-en`));
    assert.deepEqual(packet.lessons.map((lesson) => lesson.cards.length), [2, 2, 1, 2, 2, 2, 3, 3, 2]);
    assert.ok(packet.lessons.slice(5).every((lesson) => lesson.modes.length === 0));
    const core = JSON.parse(readFileSync("src/data/spanish-basics-core.json", "utf8"));
    const practice = JSON.parse(readFileSync("src/data/spanish-basics-practice.json", "utf8"));
    for (const lesson of packet.lessons) {
      const source = core.lessons.find((item) => item.n === lesson.n);
      assert.equal(lesson.sourceObjectiveEnglish, source.objective);
      for (const card of lesson.cards) {
        const word = source.words[card.number - 1];
        assert.equal(card.sourceSpanish, word.es);
        assert.equal(card.sourceEnglish, word.en);
        assert.equal(card.kind, word.kind);
        assert.equal(card.scoringEnabled, false);
        assert.equal(card.normalCardProjectionAllowed, false);
        assert.ok(card.semanticNote.length > 30);
      }
      for (const key of ["reviewed", "registered", "audioRegistered", "listeningReviewed",
        "scoringEnabled", "progressEnabled", "normalCardProjectionAllowed"])
        assert.equal(lesson[key], false, `${lesson.n}.${key}`);
      const reading = practice["spanish-basics"][String(lesson.n)].reading;
      for (const mode of lesson.modes) {
        assert.equal(mode.sourceSpanish, reading.target[mode.sourceReaderTurn - 1]);
        assert.equal(mode.sourceEnglish, reading.native[mode.sourceReaderTurn - 1]);
        assert.equal(mode.recordedAudio, false);
        assert.equal(mode.readyForLearner, false);
        assert.equal(mode.scoringEnabled, false);
      }
    }
    assert.deepEqual(packet.lessons[2].modes.map((mode) => mode.name),
      ["see", "recall", "hear", "type", "say", "write"]);
  } finally {
    globalThis.fetch = oldFetch;
    envKeys.forEach((key, i) => oldEnv[i] === undefined ? delete process.env[key] : (process.env[key] = oldEnv[i]));
    rmSync(dir, { recursive: true, force: true });
  }
});
