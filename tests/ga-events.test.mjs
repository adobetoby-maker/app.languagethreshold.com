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
  const location = {
    href: url,
    get origin() {
      return new URL(this.href).origin;
    },
    get pathname() {
      return new URL(this.href).pathname;
    },
  };
  globalThis.window = {
    location,
    sessionStorage,
    ...(gtag ? { gtag: (...args) => calls.push(args) } : {}),
  };
  const appended = [];
  globalThis.document = {
    querySelector: () => (privateNode ? {} : null),
    referrer: "https://checkout.stripe.com/c/pay/cs_test_ref?secret=x#frag",
    scripts: appended,
    head: { appendChild: (el) => appended.push(el) },
    createElement: () => ({}),
  };
  return { calls, store, appended };
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

test("trackEvent is a no-op without window or with an invalid event name", () =>
  withModule((m) => {
    delete globalThis.window;
    assert.equal(m.trackEvent("sign_up", { method: "email" }), false);
    const { calls } = browser();
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

test("each event forwards only its own allowlisted parameters", () =>
  withModule((m) => {
    const { calls } = browser();
    m.trackEvent("team_invite_sent", {
      role: "learner",
      count: 3,
      email: "a@b.com",
      user_id: "u1",
      member_id: "m1",
      display_name: "Ana",
      name: "Ana",
      org_id: "o1",
      contact: "ana@example.com",
      note: "hello",
      seats: 5,
      ok: true,
    });
    assert.deepEqual(calls[0][2], { role: "learner", count: 3, transport_type: "beacon" });

    m.trackEvent("purchase", {
      transaction_id: "cs_test_abcdefgh",
      currency: "USD",
      value: 12.5,
      plan: "annual",
      module_id: "roofing",
    });
    assert.deepEqual(calls[1][2], {
      transaction_id: "cs_test_abcdefgh",
      currency: "USD",
      value: 12.5,
      transport_type: "beacon",
    });

    m.trackEvent("begin_checkout", {
      plan: "team",
      term: "annual",
      seats: 5,
      currency: "USD",
      value: 1,
      method: "email",
    });
    assert.deepEqual(calls[2][2], {
      plan: "team",
      term: "annual",
      seats: 5,
      currency: "USD",
      value: 1,
      transport_type: "beacon",
    });
    m.trackEvent("sign_up", { method: "google", plan: "x" });
    m.trackEvent("login", { method: "google", lesson: 1 });
    m.trackEvent("lesson_mastered", { module_id: "roofing", lesson: 4, method: "x" });
    m.trackEvent("team_seat_assigned", { module_id: "roofing", role: "admin" });
    assert.deepEqual(
      calls.slice(3).map((c) => c[2]),
      [
        { method: "google", transport_type: "beacon" },
        { method: "google", transport_type: "beacon" },
        { module_id: "roofing", lesson: 4, transport_type: "beacon" },
        { module_id: "roofing", transport_type: "beacon" },
      ],
    );

    // Value guards still apply to allowed keys.
    m.trackEvent("purchase", {
      transaction_id: "ana@example.com",
      currency: "x".repeat(101),
      value: Number.NaN,
    });
    assert.deepEqual(calls[7][2], { transport_type: "beacon" });
    // Events outside the list are refused outright.
    assert.equal(m.trackEvent("page_view", { page_location: "https://x" }), false);
    assert.equal(m.trackEvent("custom_thing"), false);
    assert.equal(m.trackEvent("constructor"), false);
    assert.equal(calls.length, 8);
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
const SUBSCRIBE = "https://app.languagethreshold.com/subscribe/success?session_id=cs_test_abcdefgh";
const TEAM = "https://app.languagethreshold.com/team?org=11111111-2222-3333-4444-555555555555";
const TEAM_RETURN = `${TEAM}&checkout=success&session_id=cs_test_abcdefgh`;
const AUTH = "https://app.languagethreshold.com/?code=abc123";
const queue = (env) => JSON.parse(env.store.get("lt.ga.pending.v1") ?? "[]");
const goTo = (url) => {
  globalThis.window.location.href = url;
};
const DEFERRABLE = [
  "purchase",
  "begin_checkout",
  "team_seat_assigned",
  "team_invite_sent",
  "sign_up",
  "login",
];

test("allowlisted events are deferred from /team, /subscribe/success and the sign-in return only", () =>
  withModule((m) => {
    const env = browser({ url: SUBSCRIBE, gtag: false });
    assert.equal(
      m.trackEvent(
        "purchase",
        { transaction_id: "cs_test_abcdefgh", currency: "USD" },
        "purchase:cs_test_abcdefgh",
      ),
      false,
    );
    goTo(TEAM_RETURN);
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    m.trackEvent("begin_checkout", { plan: "team", seats: 5 });
    goTo(AUTH);
    m.trackEvent("sign_up", { method: "google" }, "sign_up:google:u1");
    assert.deepEqual(
      queue(env).map((e) => [e.name, e.key]),
      [
        ["purchase", "purchase:cs_test_abcdefgh"],
        ["team_seat_assigned", undefined],
        ["begin_checkout", undefined],
        ["sign_up", "sign_up:google:u1"],
      ],
    );
    assert.ok(queue(env).every((e) => Number.isFinite(e.ts)));
    assert.equal(env.calls.length, 0);
    assert.equal(m.deferralRoute(TEAM_RETURN), "team");
    assert.equal(m.deferralRoute(SUBSCRIBE), "subscribe");
    assert.equal(m.deferralRoute(AUTH), "auth-return");
    assert.equal(
      m.deferralRoute("https://app.languagethreshold.com/#access_token=x"),
      "auth-return",
    );
  }));

test("exam and assessment pages never queue anything, even allowlisted names", () =>
  withModule((m) => {
    const env = browser({ gtag: false });
    for (const url of [
      "https://app.languagethreshold.com/exams",
      "https://app.languagethreshold.com/exams?attempt=a1",
      "https://app.languagethreshold.com/exam-content?form=f",
      "https://app.languagethreshold.com/exam-reviewers",
      "https://app.languagethreshold.com/?tab=exams",
      "https://app.languagethreshold.com/?tab=exams&code=abc",
      "https://app.languagethreshold.com/?module=roofing&plan=p1",
      "https://app.languagethreshold.com/?fromPlan=p1&code=abc",
      "https://app.languagethreshold.com/?enrollment=e1",
      "https://app.languagethreshold.com/team?org=o&attempt=a1",
      "https://app.languagethreshold.com/team?org=o&plan=p1",
      "https://app.languagethreshold.com/team?org=o&enrollment=e1",
      "https://app.languagethreshold.com/team/accept?token=t",
      "https://app.languagethreshold.com/team?token=t",
      "https://app.languagethreshold.com/subscribe/success?session_id=cs_x&email=a%40b.com",
      "https://app.languagethreshold.com/owner",
      "https://app.languagethreshold.com/account",
      "https://app.languagethreshold.com/account/password",
      "https://app.languagethreshold.com/certificate?id=1",
      "https://app.languagethreshold.com/family-setup",
      "https://app.languagethreshold.com/?org=o&code=abc",
      "https://app.languagethreshold.com/?code=abc&email=a%40b.com",
    ]) {
      goTo(url);
      assert.equal(m.deferralRoute(url), null, url);
      for (const name of DEFERRABLE) m.trackEvent(name, { module_id: "roofing" }, `${name}:${url}`);
    }
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
    assert.equal(env.calls.length, 0);

    // Mounted assessment content wins over an otherwise allowed route.
    const marked = browser({ url: TEAM_RETURN, gtag: false, privateNode: true });
    for (const name of DEFERRABLE) m.trackEvent(name, { module_id: "roofing" });
    assert.equal(marked.store.has("lt.ga.pending.v1"), false);
  }));

test("a name outside the allowlist is dropped on a private page, and routes only take their own events", () =>
  withModule((m) => {
    let env = browser({ url: TEAM_RETURN, gtag: false });
    for (const name of ["lesson_mastered", "page_view", "exam_started", "assessment_completed"])
      m.trackEvent(name, { module_id: "roofing" });
    m.trackEvent("sign_up", { method: "email" });
    assert.equal(env.store.has("lt.ga.pending.v1"), false);

    env = browser({ url: SUBSCRIBE, gtag: false });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    m.trackEvent("begin_checkout", { plan: "team" });
    assert.equal(env.store.has("lt.ga.pending.v1"), false);

    env = browser({ url: AUTH, gtag: false });
    m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" });
    m.trackEvent("lesson_mastered", { lesson: 1 });
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
    m.trackEvent("login", { method: "google" });
    assert.equal(queue(env).length, 1);
  }));

test("deferred events flush through gtag on a public page, once each, and the queue is cleared", () =>
  withModule((m) => {
    const env = browser({ url: TEAM_RETURN });
    m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" }, "purchase:cs_test_abcdefgh");
    m.trackEvent("team_invite_sent", { role: "learner" });
    assert.equal(m.flushPendingEvents(), 0, "still private");
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
    const env = browser({ url: TEAM });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);
    assert.equal(m.trackEvent("lesson_mastered", { module_id: "roofing", lesson: 1 }), true);
    assert.deepEqual(
      env.calls.map((c) => c[1]),
      ["team_seat_assigned", "lesson_mastered"],
    );
  }));

test("client-side navigation to a public page loads GA like the root snippet, then flushes once", () =>
  withModule((m) => {
    const env = browser({ url: SUBSCRIBE, gtag: false });
    m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" }, "purchase:cs_test_abcdefgh");
    // Private page: GA is never loaded.
    assert.equal(m.ensureGaLoaded(), false);
    assert.equal(globalThis.window.gtag, undefined);
    assert.equal(env.appended.length, 0);

    goTo("https://app.languagethreshold.com/pricing?utm=1#x");
    assert.equal(m.flushPendingEvents(), 1);
    assert.equal(typeof globalThis.window.gtag, "function");
    const layer = globalThis.window.dataLayer.map((entry) => Array.from(entry));
    assert.deepEqual(layer[0].slice(0, 1), ["js"]);
    assert.deepEqual(layer[1], [
      "config",
      "G-RP0TZ1MP7E",
      {
        anonymize_ip: true,
        send_page_view: false,
        page_location: "https://app.languagethreshold.com/pricing",
        page_referrer: "",
      },
    ]);
    assert.deepEqual(layer.slice(2), [
      ["event", "purchase", { transaction_id: "cs_test_abcdefgh", transport_type: "beacon" }],
    ]);
    assert.equal(env.appended.length, 1);
    assert.equal(env.appended[0].src, "https://www.googletagmanager.com/gtag/js?id=G-RP0TZ1MP7E");
    assert.equal(env.appended[0].async, true);
    assert.equal(JSON.stringify(layer).match(/@|email|user/i), null);

    // Nothing more is sent or loaded on the next route.
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.appended.length, 1);
    assert.equal(globalThis.window.dataLayer.length, 3);
  }));

test("GA is not injected twice when the loader script is already in the page", () =>
  withModule((m) => {
    const env = browser({ url: SUBSCRIBE, gtag: false });
    m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" });
    env.appended.push({ src: "https://www.googletagmanager.com/gtag/js?id=G-RP0TZ1MP7E" });
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1);
    assert.equal(env.appended.length, 1);
  }));

test("GA is never loaded in speaking privacy mode, on a private page, or while disabled", () =>
  withModule((m) => {
    let env = browser({ url: TEAM, gtag: false });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);
    globalThis.window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(m.ensureGaLoaded(), false);
    assert.equal(globalThis.window.gtag, undefined);
    assert.equal(queue(env).length, 1);
    assert.equal(env.appended.length, 0);
    globalThis.window.__languageThresholdSpeakingPrivacy = false;

    goTo(TEAM);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(globalThis.window.gtag, undefined);

    // An exam subtree mounted on a public URL also blocks loading.
    env = browser({ gtag: false, privateNode: true });
    assert.equal(m.ensureGaLoaded(), false);
    assert.equal(globalThis.window.gtag, undefined);
  }));

test("nothing is flushed while ga-disable is set on the same page", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1, "first call on the new page recomputes the flag");

    env.store.set(
      "lt.ga.pending.v1",
      JSON.stringify([{ name: "team_seat_assigned", params: {}, ts: Date.now() }]),
    );
    globalThis.window[GA] = true;
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(m.trackEvent("lesson_mastered", { lesson: 1 }), false);
    assert.equal(queue(env).length, 1);
    delete globalThis.window[GA];
    assert.equal(m.flushPendingEvents(), 1);
  }));

test("a disable flag left by the previous private page does not block the next public page", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    // What the root layout leaves behind on a private page.
    globalThis.window[GA] = true;
    m.trackEvent("team_seat_assigned", { module_id: "roofing" });
    goTo(PUBLIC);
    // A child effect runs before the root effect has rewritten the flag.
    assert.equal(globalThis.window[GA], true);
    assert.equal(m.trackEvent("lesson_mastered", { module_id: "roofing", lesson: 1 }), true);
    assert.equal(globalThis.window[GA], false);
    assert.deepEqual(
      env.calls.map((c) => c[1]),
      ["team_seat_assigned", "lesson_mastered"],
    );
  }));

test("speaking privacy mode drops events instead of deferring them", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    globalThis.window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(m.trackEvent("team_seat_assigned", { module_id: "roofing" }), false);
    assert.equal(env.store.has("lt.ga.pending.v1"), false);
  }));

test("deferred events expire after 30 minutes", () =>
  withModule((m) => {
    const realNow = Date.now;
    try {
      const env = browser({ url: TEAM });
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
      env.store.set(
        "lt.ga.pending.v1",
        JSON.stringify([{ name: "purchase", params: {}, ts: Date.now() + 3_600_000 }]),
      );
      assert.equal(m.flushPendingEvents(), 0, "future-stamped entries are refused");
    } finally {
      Date.now = realNow;
    }
  }));

test("the deferred queue holds at most 10 events and keeps the newest", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    for (let i = 1; i <= 13; i++) m.trackEvent("team_seat_assigned", { module_id: `m${i}` });
    assert.deepEqual(
      queue(env).map((e) => e.params.module_id),
      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => `m${n}`),
    );
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 10);
  }));

test("a deferred purchase cannot be counted twice", () =>
  withModule((m) => {
    const env = browser({ url: SUBSCRIBE });
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    assert.equal(queue(env).length, 1);

    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1);
    goTo(SUBSCRIBE);
    m.trackEvent("purchase", { transaction_id: "cs_test_dup" }, "purchase:cs_test_dup");
    assert.equal(env.store.has("lt.ga.pending.v1"), false, "refused at queue time");
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 1);

    env.store.set(
      "lt.ga.pending.v1",
      JSON.stringify([
        { name: "purchase", params: {}, ts: Date.now(), key: "purchase:cs_test_dup" },
      ]),
    );
    assert.equal(m.flushPendingEvents(), 0, "refused at flush time");
    assert.equal(env.calls.length, 1);
  }));

test("queued parameters pass the PII filter when stored and again when read back", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    m.trackEvent("team_invite_sent", {
      role: "admin",
      email: "a@b.com",
      member_id: "m1",
      display_name: "Ana",
      contact: "ana@example.com",
      note: "hello",
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
        { name: "lesson_mastered", params: { lesson: 1 }, ts: Date.now() },
        { name: "exam_started", params: {}, ts: Date.now() },
        { name: "Bad Name", params: {}, ts: Date.now() },
        { name: "purchase", params: {}, ts: "yesterday" },
        "junk",
      ]),
    );
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1, "only the allowlisted, well-formed entry is sent");
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
    const env = browser({ url: TEAM, storage: "throws" });
    assert.equal(m.trackEvent("team_seat_assigned", { module_id: "roofing" }), false);
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 0);
    assert.equal(env.calls.length, 0);
  }));

test("the injected loader reports only the app's own referrer, and no automatic page view", () =>
  withModule((m) => {
    for (const [referrer, expected] of [
      [
        "https://app.languagethreshold.com/pricing?x=1#y",
        "https://app.languagethreshold.com/pricing",
      ],
      ["https://checkout.stripe.com/c/pay/cs_test_abc#secret", ""],
      ["https://www.google.com/search?q=private", ""],
      ["https://evil.example/https://app.languagethreshold.com/", ""],
      ["", ""],
      ["not a url", ""],
    ]) {
      const env = browser({ url: SUBSCRIBE, gtag: false });
      globalThis.document.referrer = referrer;
      m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" });
      goTo("https://app.languagethreshold.com/");
      assert.equal(m.flushPendingEvents(), 1, referrer);
      const config = globalThis.window.dataLayer
        .map((e) => Array.from(e))
        .find((e) => e[0] === "config");
      assert.equal(config[2].page_referrer, expected, referrer);
      assert.equal(config[2].send_page_view, false);
      assert.equal(config[2].anonymize_ip, true);
      assert.equal(config[2].page_location, "https://app.languagethreshold.com/");
      assert.equal(env.appended.length, 1);
    }
  }));

test("routes are matched case-insensitively and after percent-decoding", () =>
  withModule((m) => {
    const base = "https://app.languagethreshold.com";
    for (const [path, route] of [
      ["/Team?org=o1&checkout=success&session_id=cs_test_abcdefgh", "team"],
      ["/TEAM", "team"],
      ["/te%61m?org=o1", "team"],
      ["/%54eam?org=o1", "team"],
      ["/te%2561m?org=o1", "team"],
      ["/Subscribe/Success?session_id=cs_test_abcdefgh", "subscribe"],
      ["/SUBSCRIBE/success", "subscribe"],
      ["/subscribe/succe%73s", "subscribe"],
      ["/?CODE=abc", "auth-return"],
    ]) {
      assert.equal(m.deferralRoute(base + path), route, path);
    }
    for (const path of [
      "/Exams",
      "/EXAMS?attempt=1",
      "/%65xams",
      "/Exam-Content",
      "/exam-reviewers",
      "/Owner",
      "/%4Fwner",
      "/ACCOUNT",
      "/Team/Accept?token=t",
      "/Team?ATTEMPT=a",
      "/Team?org=o&Plan=p",
      "/?Tab=Exams&code=abc",
      "/te%zz",
      "/Subscribe/success?EMAIL=a%40b.com",
      "/?TOKEN=t",
    ])
      assert.equal(m.deferralRoute(base + path), null, path);
  }));

test("private paths in any case or encoding are never sent, and never deferred from exam pages", () =>
  withModule((m) => {
    for (const path of ["/Team", "/OWNER", "/Subscribe/success", "/te%61m", "/%65xams", "/Exams"]) {
      const env = browser({ url: `https://app.languagethreshold.com${path}` });
      assert.equal(m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" }), false, path);
      assert.equal(m.trackEvent("lesson_mastered", { lesson: 1 }), false, path);
      assert.equal(env.calls.length, 0, path);
    }
    for (const path of ["/Exams", "/%65xams", "/OWNER", "/Exam-Content"]) {
      const env = browser({ url: `https://app.languagethreshold.com${path}`, gtag: false });
      m.trackEvent("purchase", { transaction_id: "cs_test_abcdefgh" });
      m.trackEvent("sign_up", { method: "email" });
      assert.equal(env.store.has("lt.ga.pending.v1"), false, path);
    }
  }));

test("stored queue entries lose parameters outside the event's allowlist", () =>
  withModule((m) => {
    const env = browser({ url: TEAM });
    m.trackEvent("team_seat_assigned", { module_id: "roofing", role: "admin", seats: 5 });
    assert.deepEqual(queue(env)[0].params, { module_id: "roofing" });
    env.store.set(
      "lt.ga.pending.v1",
      JSON.stringify([
        {
          name: "purchase",
          params: { transaction_id: "cs_test_abcdefgh", currency: "USD", org_id: "o1", plan: "x" },
          ts: Date.now(),
        },
      ]),
    );
    goTo(PUBLIC);
    assert.equal(m.flushPendingEvents(), 1);
    assert.deepEqual(env.calls[0][2], {
      transaction_id: "cs_test_abcdefgh",
      currency: "USD",
      transport_type: "beacon",
    });
  }));
