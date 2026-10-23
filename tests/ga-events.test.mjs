import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const GA = "ga-disable-G-RP0TZ1MP7E";

async function load() {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/ga-events-"));
  try {
    const out = join(dir, "ga-events.mjs");
    await build({
      entryPoints: [resolve("src/lib/ga-events.ts")],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: out,
      logLevel: "silent",
    });
    return { mod: await import(`${out}?${Date.now()}${Math.random()}`), dir };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

function browser({
  url = "https://app.languagethreshold.com/",
  gtag = true,
  privateNode = false,
  storage = "ok",
} = {}) {
  const calls = [];
  const store = new Map();
  const sessionStorage =
    storage === "throws"
      ? {
          getItem() {
            throw new Error("blocked");
          },
          setItem() {
            throw new Error("blocked");
          },
        }
      : {
          getItem: (k) => (store.has(k) ? store.get(k) : null),
          setItem: (k, v) => store.set(k, String(v)),
        };
  globalThis.window = {
    location: { href: url },
    sessionStorage,
    ...(gtag ? { gtag: (...args) => calls.push(args) } : {}),
  };
  globalThis.document = { querySelector: () => (privateNode ? {} : null) };
  return { calls, store };
}

async function withModule(run) {
  const old = Object.fromEntries(
    ["window", "document"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const { mod, dir } = await load();
  try {
    await run(mod);
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("trackEvent sends a sanitized event through gtag on a public page", () =>
  withModule((m) => {
    const { calls } = browser();
    assert.equal(
      m.trackEvent("begin_checkout", { plan: "annual", currency: "USD", value: 12.5 }),
      true,
    );
    assert.deepEqual(calls, [
      [
        "event",
        "begin_checkout",
        { plan: "annual", currency: "USD", value: 12.5, transport_type: "beacon" },
      ],
    ]);
  }));

test("trackEvent is a no-op without window, without gtag, or with an invalid event name", () =>
  withModule((m) => {
    delete globalThis.window;
    assert.equal(m.trackEvent("sign_up", { method: "email" }), false);
    const { calls } = browser({ gtag: false });
    assert.equal(m.trackEvent("sign_up", { method: "email" }), false);
    browser();
    assert.equal(m.trackEvent("Bad Name"), false);
    assert.equal(m.trackEvent(""), false);
    assert.equal(calls.length, 0);
  }));

test("trackEvent honors the GA disable flag, speaking privacy mode and private assessment pages", () =>
  withModule((m) => {
    let env = browser();
    globalThis.window[GA] = true;
    assert.equal(m.trackEvent("sign_up", { method: "email" }), false);
    assert.equal(env.calls.length, 0);

    env = browser();
    globalThis.window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(m.trackEvent("sign_up", { method: "email" }), false);
    assert.equal(env.calls.length, 0);

    for (const url of [
      "https://app.languagethreshold.com/team?org=x",
      "https://app.languagethreshold.com/exams",
      "https://app.languagethreshold.com/subscribe/success?session_id=cs_test_123456789",
      "https://app.languagethreshold.com/?tab=exams",
      "https://app.languagethreshold.com/?code=abc",
    ]) {
      env = browser({ url });
      assert.equal(m.trackEvent("purchase", { currency: "USD" }), false, url);
      assert.equal(env.calls.length, 0, url);
    }

    env = browser({ privateNode: true });
    assert.equal(m.trackEvent("lesson_mastered", { module_id: "roofing" }), false);
    assert.equal(env.calls.length, 0);

    env = browser();
    assert.equal(m.trackEvent("sign_up", { method: "email" }), true);
    assert.equal(env.calls.length, 1);
  }));

test("trackEvent never forwards identity-bearing or free-text parameters", () =>
  withModule((m) => {
    const { calls } = browser();
    m.trackEvent("team_invite_sent", {
      role: "learner",
      email: "a@b.com",
      user_id: "u1",
      member_id: "m1",
      display_name: "Ana",
      contact: "ana@example.com",
      note: "hello",
      long: "x".repeat(101),
      empty: "",
      nan: Number.NaN,
      "Bad Key": "x",
      seats: 5,
      ok: true,
    });
    assert.deepEqual(calls[0][2], {
      role: "learner",
      seats: 5,
      ok: true,
      transport_type: "beacon",
    });
  }));

test("onceKey sends once per session, is stored only after a successful send, and survives blocked storage", () =>
  withModule((m) => {
    let env = browser();
    assert.equal(m.trackEvent("purchase", { currency: "USD" }, "purchase:cs_test_1"), true);
    assert.equal(m.trackEvent("purchase", { currency: "USD" }, "purchase:cs_test_1"), false);
    assert.equal(m.trackEvent("purchase", { currency: "USD" }, "purchase:cs_test_2"), true);
    assert.equal(env.calls.length, 2);
    assert.ok([...env.store.keys()].every((k) => k.startsWith("lt-ga-once:")));

    // A blocked send must not burn the key.
    env = browser({ url: "https://app.languagethreshold.com/team" });
    assert.equal(m.trackEvent("purchase", {}, "purchase:cs_test_3"), false);
    assert.equal(env.store.size, 0);
    env = browser();
    assert.equal(m.trackEvent("purchase", {}, "purchase:cs_test_3"), true);

    // Same page load, new session storage that throws: in-memory dedupe still holds.
    env = browser({ storage: "throws" });
    assert.equal(m.trackEvent("lesson_mastered", { lesson: 1 }, "lesson_mastered:roofing:1"), true);
    assert.equal(
      m.trackEvent("lesson_mastered", { lesson: 1 }, "lesson_mastered:roofing:1"),
      false,
    );
    assert.equal(env.calls.length, 1);
  }));

test("trackEvent swallows a throwing gtag and does not mark the key as sent", () =>
  withModule((m) => {
    browser();
    globalThis.window.gtag = () => {
      throw new Error("boom");
    };
    assert.equal(m.trackEvent("sign_up", {}, "k"), false);
    const calls = [];
    globalThis.window.gtag = (...a) => calls.push(a);
    assert.equal(m.trackEvent("sign_up", {}, "k"), true);
    assert.equal(calls.length, 1);
  }));
