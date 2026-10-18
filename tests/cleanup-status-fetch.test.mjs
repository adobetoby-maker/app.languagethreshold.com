import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const transport = () => loadModule("src/lib/assessments/cleanup-status-fetch.ts");
const row = () => ({
  source: "scheduled_endpoint",
  status: "succeeded",
  started_at: new Date(Date.now() - 60000).toISOString(),
  finished_at: new Date().toISOString(),
  selected_count: 5,
  deleted_count: 5,
  failed_count: 0,
  may_have_more: false,
  failure_code: null,
});
const endpoint = (kind) =>
  `https://synthetic.invalid/rest/v1/${kind === "owner" ? "platform_admin_roles" : "assessment_cleanup_runs?limit=20"}`;
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
test("status transport accepts exact byte budgets, empty owner and full valid SQL projection", async () => {
  const api = await transport();
  for (const [kind, data] of [
    ["owner", { role: "owner" }],
    ["owner", [{ role: "support" }]],
    ["owner", []],
    ["owner", null],
    ["history", Array.from({ length: 20 }, row)],
  ]) {
    const max =
        kind === "owner" ? api.CLEANUP_OWNER_RESPONSE_BYTES : api.CLEANUP_HISTORY_RESPONSE_BYTES,
      text = JSON.stringify(data);
    const payload = text + " ".repeat(max - Buffer.byteLength(text));
    let calls = 0;
    const wrapped = api.cleanupStatusReadFetch(
      "https://synthetic.invalid",
      new AbortController().signal,
      async (_, init) => {
        calls++;
        assert.equal(init.cache, "no-store");
        assert.ok(init.signal instanceof AbortSignal);
        return new Response(payload);
      },
    );
    const response = await wrapped(endpoint(kind));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), data);
    assert.equal(calls, 1);
  }
  for (const status of ["running", "partial", "failed"]) {
    const data = row();
    data.status = status;
    if (status === "running") data.finished_at = null;
    else if (status === "failed") data.failure_code = "worker_failed";
    const wrapped = api.cleanupStatusReadFetch(
      "https://synthetic.invalid",
      new AbortController().signal,
      async () => Response.json([data]),
    );
    assert.equal((await wrapped(endpoint("history"))).status, 200);
  }
});
test("status transport rejects excess/invalid wire JSON and bounded SQL shape failures", async () => {
  const api = await transport();
  const invalidOwner = [
    { role: "owner", private: "SYNTHETIC_PRIVATE" },
    [{ role: "owner" }, { role: "owner" }],
    { role: "unexpected" },
    {},
  ];
  const invalidRows = [
    { ...row(), source: "other" },
    { ...row(), status: "other" },
    { ...row(), failure_code: "SYNTHETIC_PRIVATE" },
    { ...row(), selected_count: 251 },
    { ...row(), deleted_count: 6 },
    { ...row(), failed_count: -1 },
    { ...row(), may_have_more: "false" },
    { ...row(), finished_at: null },
    { ...row(), started_at: "bad" },
    { ...row(), private: "SYNTHETIC_PRIVATE" },
    { ...row(), failed_count: 1 },
    { ...row(), may_have_more: true },
  ];
  const cases = [
    ...invalidOwner.map((data) => ["owner", Response.json(data)]),
    ...invalidRows.map((data) => ["history", Response.json([data])]),
    ["history", Response.json(Array.from({ length: 21 }, row))],
    ["history", new Response(new Uint8Array([255]))],
    ["history", new Response("{")],
    ["owner", Response.json({ message: "SYNTHETIC_PRIVATE" }, { status: 400 })],
  ];
  for (const kind of ["owner", "history"]) {
    const max =
        kind === "owner" ? api.CLEANUP_OWNER_RESPONSE_BYTES : api.CLEANUP_HISTORY_RESPONSE_BYTES,
      data = kind === "owner" ? { role: "owner" } : [row()],
      text = JSON.stringify(data);
    cases.push(
      [kind, new Response(text, { headers: { "content-length": String(max + 1) } })],
      [kind, new Response(text + " ".repeat(max + 1 - Buffer.byteLength(text)))],
    );
  }
  for (const [kind, original] of cases) {
    const wrapped = api.cleanupStatusReadFetch(
      "https://synthetic.invalid",
      new AbortController().signal,
      async () => original,
    );
    const response = await wrapped(endpoint(kind));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: "Cleanup status read unavailable" });
    assert.equal(original.body.locked, false);
  }
  const one = api.cleanupStatusReadFetch(
    "https://synthetic.invalid",
    new AbortController().signal,
    async () => Response.json([row(), row()]),
  );
  assert.equal((await one(endpoint("history").replace("limit=20", "limit=1"))).status, 503);
});
test("status transport abort owns ignored headers/body and preserves unrelated/write request identity", async () => {
  const { cleanupStatusReadFetch } = await transport();
  for (const phase of ["preabort", "headers", "body"]) {
    const owner = new AbortController(),
      gate = defer();
    let calls = 0,
      cancel = 0;
    const original = new Response(
      new ReadableStream({
        start(c) {
          if (phase === "body") c.enqueue(new TextEncoder().encode("["));
        },
        cancel() {
          cancel++;
          return new Promise(() => {});
        },
      }),
    );
    if (phase === "preabort") owner.abort();
    const wrapped = cleanupStatusReadFetch("https://synthetic.invalid", owner.signal, async () => {
      calls++;
      return phase === "headers" ? gate.promise : original;
    });
    const pending = wrapped(endpoint("history"));
    if (phase !== "preabort") {
      for (let i = 0; i < 30 && (phase === "body" ? !original.body.locked : !calls); i++)
        await new Promise((r) => setTimeout(r, 1));
      owner.abort();
    }
    assert.equal((await pending).status, 503);
    if (phase === "headers") {
      gate.resolve(original);
      await new Promise((r) => setTimeout(r, 1));
    }
    assert.equal(calls, phase === "preabort" ? 0 : 1);
    if (phase !== "preabort") assert.equal(cancel, 1);
    assert.equal(original.body.locked, false);
  }
  for (const [url, method] of [
    [endpoint("owner"), "POST"],
    ["https://other.invalid/rest/v1/platform_admin_roles", "GET"],
    ["https://synthetic.invalid/auth/v1/user", "GET"],
    ["https://synthetic.invalid/rest/v1/other", "GET"],
  ]) {
    const input = new Request(url, { method }),
      init = { headers: { "x-synthetic": "value" } },
      response = new Response("unchanged");
    const wrapped = cleanupStatusReadFetch(
      "https://synthetic.invalid",
      new AbortController().signal,
      async (a, b) => {
        assert.equal(a, input);
        assert.equal(b, init);
        return response;
      },
    );
    assert.equal(await wrapped(input, init), response);
  }
});
test("actual cleanup SDK admits populated projection and rejects invalid/oversized data without retry", async () => {
  const { handleCleanup } = await loadModule("src/lib/assessments/cleanup-schedule-server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLATFORM_OWNER_EMAIL"],
    saved = names.map((n) => process.env[n]),
    savedFetch = globalThis.fetch,
    savedError = console.error;
  let logs = 0;
  try {
    process.env.SUPABASE_URL = "https://synthetic.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
    process.env.PLATFORM_OWNER_EMAIL = "";
    console.error = () => logs++;
    for (const phase of [
      "success",
      "owner-extra",
      "owner-over",
      "history-extra",
      "history-over",
      "history-shape",
    ]) {
      const calls = [],
        valid = row();
      globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.origin, "https://synthetic.invalid");
        assert.equal(init.method, "GET");
        calls.push(url.pathname);
        if (url.pathname === "/auth/v1/user")
          return Response.json({ id: "synthetic", email: "fixture@example.invalid" });
        assert.equal(init.cache, "no-store");
        assert.ok(init.signal instanceof AbortSignal);
        assert.equal(new Headers(init.headers).has("X-Retry-Count"), false);
        if (url.pathname === "/rest/v1/platform_admin_roles")
          return phase === "owner-extra"
            ? Response.json([{ role: "owner", private: "SYNTHETIC_PRIVATE" }])
            : phase === "owner-over"
              ? new Response(JSON.stringify([{ role: "owner" }]) + " ".repeat(4096))
              : Response.json([{ role: "owner" }]);
        assert.equal(url.pathname, "/rest/v1/assessment_cleanup_runs");
        const data = Array.from({ length: url.searchParams.get("limit") === "1" ? 1 : 20 }, () => ({
          ...valid,
        }));
        if (phase === "history-extra") data[0].private = "SYNTHETIC_PRIVATE";
        if (phase === "history-shape") data[0].selected_count = 251;
        return phase === "history-over"
          ? new Response(JSON.stringify(data) + " ".repeat(32768))
          : Response.json(data);
      };
      const response = await handleCleanup(
          new Request("https://fixture.invalid/api/exam-cleanup?view=status", {
            headers: { Authorization: "Bearer synthetic" },
          }),
          {},
        ),
        body = await response.json();
      assert.equal(response.status, phase === "success" ? 200 : 503);
      if (phase === "success") {
        assert.equal(body.runs.length, 20);
        assert.equal(body.health, "healthy");
        assert.equal(body.executionEnabled, false);
        assert.deepEqual(body.runs[0], valid);
      } else
        assert.deepEqual(body, { error: "Cleanup status is temporarily unavailable. Try again." });
      assert.equal(calls.filter((p) => p === "/auth/v1/user").length, 1);
      assert.equal(calls.filter((p) => p === "/rest/v1/platform_admin_roles").length, 1);
      assert.equal(
        calls.filter((p) => p === "/rest/v1/assessment_cleanup_runs").length,
        phase.startsWith("owner-") ? 0 : 2,
      );
    }
    assert.equal(logs, 0);
  } finally {
    globalThis.fetch = savedFetch;
    console.error = savedError;
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name];
      else process.env[name] = saved[i];
    });
  }
});
