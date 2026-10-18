import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-response-"));
  try {
    await build({
      entryPoints: [resolve("src/lib/team-server.ts")],
      outfile: join(dir, "helpers.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
    });
    await run(await import(join(dir, "helpers.mjs")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function privateHeaders(response) {
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Content-Type"), "application/json");
}
test("actual team JSON success has private headers without sharing mutable response headers", () =>
  fixture(async ({ json }) => {
    const first = json({ recorded: 0 });
    privateHeaders(first);
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { recorded: 0 });
    first.headers.set("Cache-Control", "public");
    first.headers.delete("CDN-Cache-Control");
    const next = json({ sessions: [] }, 201);
    privateHeaders(next);
    assert.equal(next.status, 201);
    assert.deepEqual(await next.json(), { sessions: [] });
  }));
test("actual team handled errors retain statuses with private headers", () =>
  fixture(async ({ teamError, TeamOperationError }) => {
    for (const [error, status] of [
      [new TeamOperationError("Sign in to continue.", 403), 403],
      [new TeamOperationError("Team database is not configured.", 503), 503],
      [new TeamOperationError("Unknown lesson."), 400],
      [null, 503],
    ]) {
      const response = teamError(error);
      privateHeaders(response);
      assert.equal(response.status, status);
      assert.equal(typeof (await response.json()).error, "string");
    }
  }));

test("scoped team errors expose only typed guidance, never backend text or heuristic statuses", () =>
  fixture(async ({ TeamOperationError, scopedTeamError }) => {
    const guidance = scopedTeamError(
      new TeamOperationError("Assigned learner access required.", 403),
    );
    privateHeaders(guidance);
    assert.equal(guidance.status, 403);
    assert.deepEqual(await guidance.json(), { error: "Assigned learner access required." });
    for (const error of [
      new Error("PRIVATE configured session access required"),
      { message: "PRIVATE details" },
      null,
    ]) {
      const response = scopedTeamError(error);
      privateHeaders(response);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: "We could not confirm this team request. Check your workspace before retrying.",
      });
    }
  }));
test("actual team admin and platform owner denials retain typed fixed 403 guidance", () =>
  fixture(async ({ requireTeamAdmin, requirePlatformOwner, scopedTeamError, teamError }) => {
    const db = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          retry(enabled) { assert.equal(enabled, false); return this; },
          maybeSingle: async () => ({ data: null, error: null }),
        };
      },
    };
    for (const operation of [
      () => requireTeamAdmin(db, "synthetic-org", "synthetic-user"),
      () => requirePlatformOwner(db, { id: "synthetic-user", email_confirmed_at: null }),
    ]) {
      await assert.rejects(operation(), (error) => {
        const response = scopedTeamError(error);
        privateHeaders(response);
        assert.equal(response.status, 403);
        return true;
      });
    }
    assert.equal(teamError, scopedTeamError);
  }));
