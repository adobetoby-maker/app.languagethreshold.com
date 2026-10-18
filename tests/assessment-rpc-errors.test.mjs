import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { assessmentRpcGuidance } from "../src/lib/assessments/rpc-errors.ts";
import { loadModule } from "./helpers/bundle.mjs";
const storage = "Assessment storage is unavailable. Your saved work has not been replaced.";
async function helper() {
  return loadModule("src/lib/assessments/server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
}
function literals() {
  const rows = [];
  for (const file of readdirSync("supabase/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    const source = readFileSync("supabase/migrations/" + file, "utf8");
    if (!source.includes("assessment_")) continue;
    const raises = [...source.matchAll(/\braise\s+exception\b/gi)];
    const fixed = [...source.matchAll(/\braise\s+exception\s+'((?:''|[^'])*)'\s*;/gi)];
    assert.equal(
      fixed.length,
      raises.length,
      `Review dynamic or differently written RAISE in ${file}`,
    );
    for (const match of fixed) rows.push(match[1].replaceAll("''", "'"));
  }
  return rows;
}
test("all known fixed migration guidance retains its previous status through actual RPC wrapper", async () => {
  const { rpc, AssessmentAccessError } = await helper();
  const rows = literals();
  assert.equal(rows.length, 342);
  const messages = [...new Set(rows)];
  assert.equal(messages.length, 227);
  for (const message of messages) {
    const status = /access required|confirmation required/.test(message)
      ? 403
      : /conflict|reused|already|immutable|Speech upload expired/.test(message)
        ? 409
        : 400;
    let calls = 0;
    const args = { p_actor: "synthetic" };
    await assert.rejects(
      rpc(
        {
          rpc: async (name, input) => {
            calls++;
            assert.equal(name, "assessment_synthetic_fixture");
            assert.equal(input, args);
            return { error: { code: "P0001", message } };
          },
        },
        "assessment_synthetic_fixture",
        args,
      ),
      (error) =>
        error instanceof AssessmentAccessError &&
        error.status === status &&
        error.message === message,
    );
    assert.equal(calls, 1);
    assert.deepEqual(assessmentRpcGuidance(message), { message, status });
  }
});
test("actual RPC wrapper suppresses unknown P0001 private diagnostics and exact-match near misses", async () => {
  const { rpc, AssessmentAccessError } = await helper();
  for (const message of [
    "SYNTHETIC_PRIVATE session token email detail",
    "Assessment access required SYNTHETIC_PRIVATE",
    "SYNTHETIC_PRIVATE Assessment access required",
    "Assessment access required\n",
    "assessment access required",
    "Assessment access required\u200b",
    "constructor",
    "toString",
    "__proto__",
    "",
    null,
    undefined,
    4,
    {},
    ["Assessment access required"],
  ]) {
    const original = {
      code: "P0001",
      message,
      details: "SYNTHETIC_PRIVATE",
      hint: "SYNTHETIC_PRIVATE",
    };
    let calls = 0;
    await assert.rejects(
      rpc(
        {
          rpc: async () => {
            calls++;
            return { error: original };
          },
        },
        "assessment_synthetic_fixture",
        {},
      ),
      (error) =>
        error instanceof AssessmentAccessError && error.status === 503 && error.message === storage,
    );
    assert.equal(calls, 1);
    assert.equal(original.message, message);
    assert.equal(assessmentRpcGuidance(message), null);
  }
});
test("actual RPC wrapper preserves successful data and fixed duplicate/non-P0001 behavior", async () => {
  const { rpc, AssessmentAccessError } = await helper();
  const data = { value: ["synthetic"] };
  assert.equal(
    await rpc({ rpc: async () => ({ data, error: null }) }, "assessment_synthetic_fixture", {}),
    data,
  );
  for (const code of ["23505", "XX000", "42501", undefined]) {
    await assert.rejects(
      rpc(
        {
          rpc: async () => ({
            error: { code, message: "Assessment access required", details: "SYNTHETIC_PRIVATE" },
          }),
        },
        "assessment_synthetic_fixture",
        {},
      ),
      (error) =>
        error instanceof AssessmentAccessError &&
        error.status === (code === "23505" ? 409 : 503) &&
        error.message ===
          (code === "23505" ? "This assessment already exists. Refresh to resume it." : storage),
    );
  }
});
test("public RPC guidance lookup uses exact keys and returns independent projections", () => {
  const first = assessmentRpcGuidance("Assessment access required");
  first.message = "changed";
  first.status = 400;
  assert.deepEqual(assessmentRpcGuidance("Assessment access required"), {
    message: "Assessment access required",
    status: 403,
  });
  for (const value of [
    new String("Assessment access required"),
    Object.create(null),
    {
      toString() {
        throw Error("Do not coerce diagnostics");
      },
    },
  ])
    assert.equal(assessmentRpcGuidance(value), null);
});
