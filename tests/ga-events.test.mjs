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
          removeItem() {
            throw new Error("blocked");
          },
        }
      : {
          getItem: (k) => (store.has(k) ? store.get(k) : null),
          setItem: (k, v) => store.set(k, String(v)),
          removeItem: (k) => store.delete(k),
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

    // A deferred send must not burn the key: it is sent once, when the queue flushes.
    env = browser({ url: "https://app.languagethreshold.com/team" });
    assert.equal(m.trackEvent("purchase", {}, "purchase:cs_test_3"), false);
    assert.equal(
      [...env.store.keys()].some((k) => k.startsWith("lt-ga-once:")),
      false,
    );
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

const PUBLIC = "https://app.languagethreshold.com/";
const PRIVATE = "https://app.languagethreshold.com/subscribe/success?session_id=cs_test_abcdefgh";
const queue = (env) => JSON.parse(env.store.get("lt.ga.pending.v1") ?? "[]");
const goTo = (url) => {
  globalThis.window.location.href = url;
};

test("private pages defer events in sessionStorage instead of dropping them", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE, gtag: false });
    assert.equal(
      m.trackEvent(
        "purchase",
        { transaction_id: "cs_test_abcdefgh", currency: "USD" },
        "purchase:cs_test_abcdefgh",
      ),
      false,
    );
    assert.equal(m.trackEvent("team_seat_assigned", { module_id: "roofing" }), false);
    const stored = queue(env);
    assert.deepEqual(
      stored.map((e) => [e.name, e.params, e.key]),
      [
        [
          "purchase",
          { transaction_id: "cs_test_abcdefgh", currency: "USD" },
          "purchase:cs_test_abcdefgh",
        ],
        ["team_seat_assigned", { module_id: "roofing" }, undefined],
      ],
    );
    assert.ok(stored.every((e) => Number.isFinite(e.ts)));
    assert.equal(env.calls.length, 0);
  }));

test("deferred events flush through gtag on a public page, once each, and the queue is cleared", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" }, "purchase:cs_test_abcdefgh");
    m.trackEvent("team_invite_sent", { role: "learner" });
    // Still private: nothing flushes.
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 0);
    assert.equal(queue(env).length, 2);

    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 2);
    assert.deepEqual(
      env.calls.map((c) => c[1]),
      ["purchase", "team_invite_sent"],
    );
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 2);
  }));

test("a tracked event on a public page flushes the queue first", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);
    assert.equal(m.trackEvent("lesson_mastered", { module_id: "roofing", lesson: 1 }), true);
    assert.deepEqual(
      env.calls.map((c) => c[1]),
      ["team_seat_assigned", "lesson_mastered"],
    );
  }));

test("nothing is flushed while ga-disable or speaking privacy is set, or gtag is missing", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);

    globalThis.window[GA] = true;
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(m.trackEvent("lesson_mastered", { lesson: 1 }), false);
    delete globalThis.window[GA];

    globalThis.window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(m.flushPendingEvents(), 0);
    globalThis.window.__languageThresholdSpeakingPrivacy = false;

    const gtag = globalThis.window.gtag;
    delete globalThis.window.gtag;
    assert.equal(m.flushPendingEvents(), 0);
    globalThis.window.gtag = gtag;

    assert.equal(env.calls.length, 0);
    assert.equal(queue(env).length, 1, "the event is still waiting");
    assert.equal(m.flushPendingEvents(), 1);
  }));

test("speaking privacy mode drops events instead of deferring them", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    globalThis.window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(m.trackEvent("team_seat_assigned", { module_id: "roofing" }), false);
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
  }));

test("deferred events expire after 30 minutes", () =>
  withModule((m) => {
    const realNow = Date.now;
    try {
      const env = browser({ url: PRIVATE });
      const t0 = 1_800_000_000_000;
      Date.now = () => t0;
      m.trackEvent("purchase", { transaction_id: "cs_test_old" }, "purchase:cs_test_old");
      Date.now = () => t0 + 29 * 60_000;
      m.trackEvent("team_seat_assigned", { module_id: "roofing" });
      Date.now = () => t0 + 31 * 60_000;
      goTo(PUBLIC);
      assert.equal(m.flushPendingEvents(), 1);
      assert.deepEqual(
        env.calls.map((c) => c[1]),
        ["team_seat_assigned"],
      );
      // Entries stamped in the future (clock tampering) are refused as well.
      env.store.set(
        "lt.ga.pending.v1",
        JSON.stringify([{ name: "purchase", params: {}, ts: Date.now() + 3_600_000 }]),
      );
      assert.equal(m.flushPendingEvents(), 0);
    } finally {
      Date.now = realNow;
    }
  }));

test("the deferred queue holds at most 10 events and keeps the newest", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    for (let i = 1; i <= 13; i++)
      m.trackEvent("team_seat_assigned", { module_id: "roofing", n: i });
    assert.deepEqual(
      queue(env).map((e) => e.params.n),
      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    );
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 10);
  }));

test("a deferred purchase cannot be counted twice", () =>
  withModule((m) => {
    let env = browser({ url: PRIVATE });
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    assert.equal(queue(env).length, 1);

    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1);
    // Re-queued later in the same session (page reload of the success page): refused at queue time.
    goTo(PRIVATE);
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 1);

    // A duplicate already sitting in storage is refused at flush time if its key was sent.
    env.store.set(
      "lt.ga.pending.v1",
      JSON.stringify([
        { name: "purchase", params: {}, ts: Date.now(), key: "purchase:cs_test_dup" },
      ]),
    );
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 1);
  }));

test("queued parameters are filtered when stored and again when read back", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE });
    m.trackEvent("team_invite_sent", {
      role: "admin",
      email: "a@b.com",
      member_id: "m1",
      display_name: "Ana",
    });
    assert.deepEqual(queue(env)[0].params, { role: "admin" });

    env.store.set(
      "lt.ga.pending.v1",
      JSON.stringify([
        {
          name: "team_invite_sent",
          params: {
            role: "learner",
            email: "a@b.com",
            user_id: "u1",
            note: "hi",
            leak: "ana@example.com",
          },
          ts: Date.now(),
        },
        { name: "Bad Name", params: {}, ts: Date.now() },
        { name: "purchase", params: {}, ts: "yesterday" },
        "junk",
      ]),
    );
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1);
    assert.deepEqual(env.calls[0], [
      "event",
      "team_invite_sent",
      { role: "learner", transport_type: "beacon" },
    ]);

    env.store.set("lt.ga.pending.v1", "{not json");
    assert.equal(m.flushPendingEvents(), 0);
  }));

test("with storage blocked, a private-page event is dropped without throwing", () =>
  withModule((m) => {
    const env = browser({ url: PRIVATE, storage: "throws" });
    assert.equal(m.trackEvent("team_seat_assigned", { module_id: "roofing" }), false);
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 0);
  }));
