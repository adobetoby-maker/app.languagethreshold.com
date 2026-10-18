import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const body = {
  mode: "challenge",
  language: "Spanish",
  level: "A1",
  concepts: ["synthetic-private-concept"],
};
function request(path = "speak", value = body, signal) {
  return new Request(`https://fixture.invalid/api/${path}`, {
    method: "POST",
    headers: {
      Origin: "https://fixture.invalid",
      "Content-Type": "application/json",
      "x-vercel-id": "synthetic-private-request-id",
    },
    body: JSON.stringify(value),
    signal,
  });
}
function privateHeaders(response) {
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-admission-"));
  const saved = {
    set: setTimeout,
    clear: clearTimeout,
    fetch: globalThis.fetch,
    log: console.log,
    error: console.error,
    key: process.env.ANTHROPIC_API_KEY,
  };
  const c = {
    timers: new Map(),
    operations: new Set(),
    requests: [],
    shutdown: new AbortController(),
    gates: [],
    models: [],
    writes: [],
    logs: [],
    sentry: [],
    ip: async () => ({ allowed: true }),
    auth: async () => ({ userId: "synthetic-a" }),
    budget: async () => ({ allowed: true }),
    age: async () => true,
    write: async () => {},
    provider: async (args) =>
      args.stream
        ? (async function* () {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "synthetic-reply" },
            };
            yield { type: "message_stop" };
          })()
        : {
            content: [
              {
                type: "tool_use",
                input:
                  args.tools[0].name === "grammar_tip"
                    ? { tip: "synthetic-tip" }
                    : args.tools[0].name === "speaking_mission_turn"
                      ? {
                          assistantText: "synthetic-partner",
                          deferredFeedback: ["synthetic-coaching"],
                          provisionalObjectiveIds: [],
                          shouldEnd: false,
                          safetyStop: false,
                        }
                      : {
                          target: "synthetic-target",
                          gloss: "synthetic-gloss",
                          hint: "synthetic-hint",
                          keyword: "synthetic-keyword",
                        },
              },
            ],
          },
    expire(ms) {
      for (const [timer, fn] of [...this.timers]) if (timer.ms === ms) fn();
    },
    async until(predicate) {
      for (let i = 0; i < 100 && !predicate(); i++) await tick();
      assert.ok(predicate());
    },
  };
  try {
    globalThis.__speakingAdmissionFixture = c;
    const outfile = join(dir, "routes.mjs");
    await build({
      stdin: {
        contents: `export {Route as speak} from './src/routes/api.speak';export {Route as consent} from './src/routes/api.speaking-consent';export {findSpeakingMission} from './src/data/speaking-missions';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "controls",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(@tanstack\/react-router|@anthropic-ai\/sdk|\.\.\/lib\/(speaking-security|sentry))$/,
              },
              (a) => ({ path: a.path, namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `const c=globalThis.__speakingAdmissionFixture;export const createFileRoute=()=>x=>x;export default class Anthropic {messages={create:async(args)=>{c.models.push(args);return c.provider(args)}}} export const initSentry=()=>{};export const Sentry={captureException:e=>c.sentry.push(String(e))};export const isStrictSameOrigin=r=>r.headers.get('Origin')===new URL(r.url).origin;export const isSpeakingMissionLanguageEnabled=l=>l!=='Japanese';export const enforceSpeakingPreAuthRateLimit=async(...a)=>{c.gates.push(['ip',...a]);return c.ip(...a)};export const authenticateSpeakingRequest=async(...a)=>{c.gates.push(['auth',...a]);return c.auth(...a)};export const enforceSpeakingRateLimit=async(...a)=>{c.gates.push(['user',...a]);return c.budget(...a)};export const hasSpeakingAgeAttestation=async(...a)=>{c.gates.push(['age',...a]);return c.age(...a)};export const setSpeakingAgeAttestation=async(...a)=>{c.writes.push(a);return c.write(...a)};`,
            }));
          },
        },
      ],
    });
    const m = await import(outfile);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 10000 && ms !== 15000) return saved.set(fn, ms, ...args);
      const timer = { ms, unref() {} };
      c.timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (c.timers.has(timer)) c.timers.delete(timer);
      else saved.clear(timer);
    };
    globalThis.fetch = () => {
      throw new Error("Unexpected real transport");
    };
    console.log = (...args) => c.logs.push(args.map(String).join(" "));
    console.error = console.log;
    process.env.ANTHROPIC_API_KEY = "synthetic-provider-key";
    const h = {};
    for (const route of ["speak", "consent"]) {
      h[route] = {};
      for (const [method, handler] of Object.entries(m[route].server.handlers))
        h[route][method] = (req) => {
          const owned = new Request(req, {
            signal: AbortSignal.any([req.signal, c.shutdown.signal]),
          });
          c.requests.push(owned);
          const operation = handler({ request: owned });
          c.operations.add(operation);
          void operation.then(
            () => c.operations.delete(operation),
            () => c.operations.delete(operation),
          );
          return operation;
        };
    }
    c.mission = m.findSpeakingMission("scenario_version_construction_safety_briefing_es_v1");
    await run(h, c);
    assert.equal(c.timers.size, 0);
  } finally {
    c.shutdown.abort();
    await Promise.allSettled([...c.operations]);
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    globalThis.fetch = saved.fetch;
    console.log = saved.log;
    console.error = saved.error;
    if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.key;
    delete globalThis.__speakingAdmissionFixture;
    rmSync(dir, { recursive: true, force: true });
  }
}
const missionBody = (c) => ({
  mode: "mission",
  language: c.mission.language,
  level: c.mission.level,
  scenarioVersionId: c.mission.id,
  messages: [
    { role: "assistant", content: c.mission.openingLine },
    { role: "user", content: "synthetic-private-learner-text" },
  ],
});
test("speaking and consent malformed/oversized bodies fail privately before admission or writes", () =>
  fixture(async (h, c) => {
    for (const [route, path, limit] of [
      ["speak", "speak", 384 * 1024],
      ["consent", "speaking-consent", 1024],
    ]) {
      for (const [raw, status] of [
        ["{", 400],
        [JSON.stringify({ mode: "synthetic-private-invalid-value" }), 400],
        [" ".repeat(limit + 1), 413],
      ]) {
        const response = await h[route].POST(
          new Request(`https://fixture.invalid/api/${path}`, {
            method: "POST",
            headers: { Origin: "https://fixture.invalid" },
            body: raw,
          }),
        );
        assert.equal(response.status, status);
        privateHeaders(response);
        assert.doesNotMatch(await response.text(), /synthetic-private-invalid-value/);
      }
    }
    assert.equal(c.gates.length, 0);
    assert.equal(c.models.length, 0);
    assert.equal(c.writes.length, 0);
  }));
test("speaking and consent input stalls and departed uploads release owned readers before admission", () =>
  fixture(async (h, c) => {
    for (const [route, path] of [
      ["speak", "speak"],
      ["consent", "speaking-consent"],
    ]) {
      let cancelled = 0;
      const input = new ReadableStream({
        start(s) {
          s.enqueue(new TextEncoder().encode("{"));
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      });
      const pending = h[route].POST(
        new Request(`https://fixture.invalid/api/${path}`, {
          method: "POST",
          headers: { Origin: "https://fixture.invalid" },
          body: input,
          duplex: "half",
        }),
      );
      await c.until(() => [...c.timers.keys()].some((t) => t.ms === 10000));
      c.expire(10000);
      const response = await pending;
      assert.equal(response.status, 408);
      privateHeaders(response);
      assert.equal(cancelled, 1);
      assert.equal(c.requests.at(-1).body.locked, false);
      const controller = new AbortController();
      controller.abort();
      const aborted = await h[route].POST(
        request(path, route === "speak" ? body : { attested: true }, controller.signal),
      );
      assert.equal(aborted.status, 499);
      privateHeaders(aborted);
    }
    assert.equal(c.gates.length, 0);
    assert.equal(c.models.length, 0);
    assert.equal(c.writes.length, 0);
  }));
test("speaking preserves IP/auth/12-user/mission-age denials under one owned scope", () =>
  fixture(async (h, c) => {
    c.ip = async () => ({ allowed: false, misconfigured: false });
    assert.equal((await h.speak.POST(request())).status, 429);
    c.ip = async () => ({ allowed: true });
    c.auth = async () => null;
    assert.equal((await h.speak.POST(request())).status, 401);
    c.auth = async () => ({ userId: "synthetic-a" });
    c.budget = async () => ({ allowed: false });
    assert.equal((await h.speak.POST(request())).status, 429);
    c.budget = async () => ({ allowed: true });
    c.age = async () => false;
    assert.equal((await h.speak.POST(request("speak", missionBody(c)))).status, 403);
    c.age = async () => {
      throw new Error("synthetic-private-detail");
    };
    assert.equal((await h.speak.POST(request("speak", missionBody(c)))).status, 503);
    assert.equal(c.models.length, 0);
    for (const gate of c.gates) {
      const signal = gate.at(-1);
      assert.ok(signal instanceof AbortSignal);
      assert.equal(signal.aborted, false);
      if (gate[0] === "user") assert.deepEqual(gate.slice(1, -1), ["synthetic-a", "ai", 12]);
    }
  }));
test("departed speaking and consent auth cannot admit later counters/provider/write and next request remains independent", () =>
  fixture(async (h, c) => {
    for (const [route, path, value] of [
      ["speak", "speak", body],
      ["consent", "speaking-consent", { attested: true }],
    ]) {
      c.gates.length = 0;
      const held = deferred(),
        incoming = new AbortController();
      c.auth = () => held.promise;
      const pending = h[route].POST(request(path, value, incoming.signal));
      await c.until(() => c.gates.some((g) => g[0] === "auth"));
      incoming.abort();
      const denied = await pending;
      assert.equal(denied.status, 499);
      privateHeaders(denied);
      held.resolve({ userId: "synthetic-a" });
      await tick();
      assert.deepEqual(
        c.gates.map((g) => g[0]),
        ["ip", "auth"],
      );
      assert.equal(c.models.length, 0);
      assert.equal(c.writes.length, 0);
    }
    c.auth = async () => ({ userId: "synthetic-a" });
    assert.equal((await h.speak.POST(request())).status, 200);
    assert.equal(c.models.length, 1);
  }));
test("speaking modes retain exact successful contracts and private handled diagnostics", () =>
  fixture(async (h, c) => {
    const challenge = await h.speak.POST(request());
    privateHeaders(challenge);
    assert.equal((await challenge.json()).target, "synthetic-target");
    const tip = await h.speak.POST(
      request("speak", { ...body, mode: "tip", userText: "synthetic-private-tip-text" }),
    );
    privateHeaders(tip);
    assert.deepEqual(await tip.json(), { tip: "synthetic-tip" });
    const chat = await h.speak.POST(
      request("speak", {
        ...body,
        mode: "chat",
        messages: [{ role: "user", content: "synthetic-private-chat-text" }],
      }),
    );
    privateHeaders(chat);
    assert.match(await chat.text(), /synthetic-reply/);
    const mission = await h.speak.POST(request("speak", missionBody(c)));
    assert.equal(mission.status, 200);
    privateHeaders(mission);
    assert.equal((await mission.json()).assistantText, "synthetic-partner");
    assert.equal(c.models.length, 4);
    assert.ok(c.models.every((m) => m.model === "claude-haiku-5-5"));
    assert.equal(c.models[2].stream, true);
    c.provider = async () => {
      const e = new Error("synthetic-private-learner-text synthetic-provider-key");
      e.name = "synthetic-private-error-name";
      throw e;
    };
    const failed = await h.speak.POST(request("speak", missionBody(c)));
    assert.equal(failed.status, 502);
    privateHeaders(failed);
    const chatFailed = await h.speak.POST(
      request("speak", {
        ...body,
        mode: "chat",
        messages: [{ role: "user", content: "synthetic-private-chat-text" }],
      }),
    );
    assert.equal(chatFailed.status, 500);
    privateHeaders(chatFailed);
    assert.equal(c.sentry.length, 0);
    assert.doesNotMatch(JSON.stringify(c.logs), /synthetic-private|synthetic-provider-key/);
  }));
test("consent read and explicit boolean writes keep original actor and contracts without extending admission over writes", () =>
  fixture(async (h, c) => {
    const read = await h.consent.GET(new Request("https://fixture.invalid/api/speaking-consent"));
    privateHeaders(read);
    assert.deepEqual(await read.json(), { attested: true });
    c.write = async () => assert.equal(c.timers.size, 0, "write is outside admission deadline");
    for (const attested of [true, false]) {
      const response = await h.consent.POST(request("speaking-consent", { attested }));
      assert.equal(response.status, 200);
      privateHeaders(response);
      assert.deepEqual(await response.json(), { attested });
    }
    assert.deepEqual(c.writes, [
      ["synthetic-a", true],
      ["synthetic-a", false],
    ]);
    for (const gate of c.gates)
      if (gate[0] === "user") assert.deepEqual(gate.slice(1, -1), ["synthetic-a", "consent", 10]);
    c.write = async () => {
      throw new Error("synthetic-private-detail");
    };
    const failed = await h.consent.POST(request("speaking-consent", { attested: false }));
    assert.equal(failed.status, 503);
    privateHeaders(failed);
    assert.doesNotMatch(await failed.text(), /synthetic-private/);
  }));
test("consent GET and speaking mission late age results cannot outlive admission expiry", () =>
  fixture(async (h, c) => {
    for (const [route, req] of [
      ["consent", new Request("https://fixture.invalid/api/speaking-consent")],
      ["speak", request("speak", missionBody(c))],
    ]) {
      c.gates.length = 0;
      const held = deferred();
      c.age = () => held.promise;
      const pending = route === "consent" ? h.consent.GET(req) : h.speak.POST(req);
      await c.until(() => c.gates.some((g) => g[0] === "age"));
      c.expire(15000);
      const failed = await pending;
      assert.equal(failed.status, 503);
      privateHeaders(failed);
      held.resolve(true);
      await tick();
      assert.equal(c.models.length, 0);
      assert.equal(c.writes.length, 0);
    }
  }));
test("speak maximum schema-valid UTF8 context fits the bounded envelope; foreign POSTs consume no admission", () =>
  fixture(async (h, c) => {
    const value = {
      ...body,
      mode: "chat",
      messages: Array.from({ length: 40 }, () => ({ role: "user", content: "漢".repeat(2000) })),
    };
    const response = await h.speak.POST(request("speak", value));
    assert.equal(response.status, 200);
    await response.text();
    assert.equal(c.models[0].messages.length, 40);
    c.gates.length = 0;
    for (const [route, path, value] of [
      ["speak", "speak", body],
      ["consent", "speaking-consent", { attested: true }],
    ]) {
      const foreign = request(path, value);
      foreign.headers.set("Origin", "https://outside.invalid");
      const denied = await h[route].POST(foreign);
      assert.equal(denied.status, 403);
      privateHeaders(denied);
    }
    assert.equal(c.gates.length, 0);
  }));

test("speaking and consent reject oversized valid JSON with ignored padding before model or write", () =>
  fixture(async (h, c) => {
    for (const [route, path, value, padding] of [
      ["speak", "speak", body, 384 * 1024],
      ["consent", "speaking-consent", { attested: true }, 1024],
    ]) {
      const response = await h[route].POST(
        request(path, { ...value, padding: "x".repeat(padding) }),
      );
      assert.equal(response.status, 413);
      assert.equal(c.models.length, 0);
      assert.equal(c.writes.length, 0);
      assert.equal(c.gates.length, 0);
    }
  }));
