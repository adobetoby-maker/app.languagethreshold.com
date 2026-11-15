import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const sourceHashes = {
  "src/data/core60/es/master-spanish-basics.json": "27084a65c51ef96ab6b74dd969de1c4b38cd670be1c4b148e2b66f4d9bb15ede",
  "src/data/spanish-basics-practice.json": "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe",
};

test("French 101 Master conflict source pins match the current source bytes", () => {
  for (const [file, expected] of Object.entries(sourceHashes)) {
    assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"), expected, file);
  }
});

test("French 101 Master conflict API authorizes before returning source-exact, closed-gate drafts", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-french101-master-conflicts-"));
  const oldFetch = globalThis.fetch;
  const envKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"];
  const oldEnv = envKeys.map((key) => process.env[key]);
  try {
    await build({
      entryPoints: ["src/routes/api.owner-french101-master-conflicts.ts"],
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
    const request = (auth) => new Request("https://app.invalid/api/owner-french101-master-conflicts", {
      headers: auth ? { authorization: "Bearer fake-token" } : {},
    });
    let response = await Route.server.handlers.GET({ request: request(false) });
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes("sourceSpanish"), false);
    response = await Route.server.handlers.GET({ request: request(true) });
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes("sourceSpanish"), false);
    assert.ok(calls.every((path) => ["/auth/v1/user", "/rest/v1/platform_admin_roles"].includes(path)));

    role = "owner";
    response = await Route.server.handlers.GET({ request: request(true) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const packet = await response.json();
    assert.equal(packet.pairKey, "French:English");
    assert.equal(packet.courseId, "french-basics");
    assert.equal(packet.stage, "master");
    assert.deepEqual(packet.sourceHashes, sourceHashes);
    assert.deepEqual(packet.lessons.map((lesson) => lesson.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    assert.equal(new Set(packet.lessons.map((lesson) => lesson.stableId)).size, 15);
    assert.deepEqual(packet.lessons.map((lesson) => lesson.stableId),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => `master-french-basics:${n}:fr-en`));

    const master = JSON.parse(readFileSync("src/data/core60/es/master-spanish-basics.json", "utf8"));
    const practice = JSON.parse(readFileSync("src/data/spanish-basics-practice.json", "utf8"));
    for (const object of [packet, ...packet.lessons]) {
      for (const key of ["reviewed", "registered", "audioRegistered", "listeningReviewed",
        "scoringEnabled", "progressEnabled"])
        assert.equal(object[key], false, `${object.n ?? "packet"}.${key}`);
    }
    for (const lesson of packet.lessons) {
      const source = master.lessons.find((item) => item.n === lesson.n);
      const reading = practice["master-spanish-basics"][String(lesson.n)].reading;
      assert.equal(lesson.sourceTitleEnglish, source.title);
      assert.equal(lesson.sourceObjectiveEnglish, source.objective);
      assert.equal(lesson.sourceReaderTitleSpanish, reading.title);
      assert.deepEqual(lesson.sourceReaderSpanish, reading.target);
      assert.deepEqual(lesson.sourceReaderEnglish, reading.native);
      assert.ok(lesson.cards.length > 0, `Master ${lesson.n} must show a concrete conflict`);
      assert.equal(new Set(lesson.cards.map((card) => card.id)).size, lesson.cards.length);
      assert.equal(lesson.normalCardProjectionAllowed, false);
      for (const card of lesson.cards) {
        const word = source.words[card.number - 1];
        assert.ok(word, `Master ${lesson.n} card ${card.number} source exists`);
        assert.equal(card.sourceSpanish, word.es);
        assert.equal(card.sourceEnglish, word.en);
        assert.equal(card.kind, word.kind);
        assert.equal(card.id, `master-french-basics:${lesson.n}:card:${card.number}`);
        assert.equal(card.scoringEnabled, false);
        assert.equal(card.normalCardProjectionAllowed, false);
        assert.ok(card.frenchCandidate.length > 0);
        assert.ok(card.semanticNote.length > 20);
      }
      assert.ok(lesson.reviewGaps.length > 0, `Master ${lesson.n} must preserve review questions`);
    }
  } finally {
    globalThis.fetch = oldFetch;
    envKeys.forEach((key, i) => oldEnv[i] === undefined ? delete process.env[key] : (process.env[key] = oldEnv[i]));
    rmSync(dir, { recursive: true, force: true });
  }
});
