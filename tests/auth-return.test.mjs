import assert from "node:assert/strict";
import test from "node:test";
import {
  authReturnPath,
  authenticationRedirectUrl,
  consumeAuthReturn,
  rememberAuthReturn,
} from "../src/lib/auth-return.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("OAuth return brings a signed-in requester back to the form once", () => {
  const saved = storage();
  rememberAuthReturn("/module-request", saved, 1000);
  assert.equal(consumeAuthReturn("/", false, saved, 2000), null);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), "/module-request");
  assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
});

test("team signup returns a new admin to company setup once", () => {
  const saved = storage();
  rememberAuthReturn("/team", saved, 1000);
  assert.equal(consumeAuthReturn("/", false, saved, 2000), null);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), "/team");
  assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
});

test("only supported pages can set a short-lived return", () => {
  const saved = storage();
  rememberAuthReturn("/pricing", saved, 1000);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
  rememberAuthReturn("/module-request", saved, 1000);
  assert.equal(consumeAuthReturn("/team", true, saved, 2000), null);
  assert.equal(consumeAuthReturn("/", true, saved, 901001), null);
});

test("blocked browser storage does not interrupt authentication", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => rememberAuthReturn("/module-request", blocked));
  assert.equal(consumeAuthReturn("/", true, blocked), null);
});

test("focused exam authentication retains validated scope and excludes credentials and arbitrary destinations", () => {
  const org = "10000000-0000-4000-8000-000000000001",
    attempt = "20000000-0000-4000-8000-000000000002";
  const input = `/exams?module=roofing&target=Spanish&native=English&org=${org}&attempt=${attempt}&review=1&access_token=secret&email=fixture@example.invalid&returnTo=https://outside.invalid#refresh_token=secret`;
  const path = authReturnPath(input),
    url = new URL(path, "https://fixture.invalid");
  assert.equal(url.pathname, "/exams");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    target: "Spanish",
    native: "English",
    module: "roofing",
    org,
    attempt,
    review: "1",
  });
  assert.equal(url.hash, "");
  const saved = storage();
  rememberAuthReturn(input, saved, 1000);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), path);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
});

test("content/reviewer/owner/account pages return directly without form or credential query data", () => {
  for (const path of ["/exam-content", "/exam-reviewers", "/owner", "/account"]) {
    assert.equal(authReturnPath(path + "?form=private-ref&token=secret#access_token=secret"), path);
    assert.equal(
      authenticationRedirectUrl("https://owned-preview.invalid" + path + "?token=secret"),
      "https://owned-preview.invalid" + path,
    );
  }
  assert.equal(authReturnPath("/team?org=bad&returnTo=https://outside.invalid"), "/team");
});

test("lesson/step and Reader context survive authentication through an explicit safe root URL", () => {
  const plan = "10000000-0000-4000-8000-000000000001";
  const lesson = new URL(
    authReturnPath(
      `/?tab=core30&module=roofing&target=Spanish&native=English&lesson=15&way=write&plan=${plan}&token=secret`,
    ),
    "https://fixture.invalid",
  );
  assert.deepEqual(Object.fromEntries(lesson.searchParams), {
    tab: "core30",
    module: "roofing",
    target: "Spanish",
    native: "English",
    lesson: "15",
    way: "write",
    plan,
  });
  const reader = new URL(
    authReturnPath(
      "/?tab=reader&module=landscaper&target=French&native=English&lesson=15&way=write&access_token=secret",
    ),
    "https://fixture.invalid",
  );
  assert.deepEqual(Object.fromEntries(reader.searchParams), {
    tab: "reader",
    module: "landscaper",
    target: "French",
    native: "English",
  });
  assert.equal(
    authReturnPath("/?tab=core30&module=roofing&lesson=999&way=write&plan=invalid"),
    "/?tab=core30&module=roofing",
  );
  assert.equal(
    new URL(
      authReturnPath("/?tab=exams&module=roofing&target=English&native=Spanish"),
      "https://fixture.invalid",
    ).pathname,
    "/exams",
  );
});

test("direct callbacks and newer incoming links clear a stale fallback instead of bouncing a later root visit", () => {
  for (const current of [
    "/exam-content",
    "/exams?module=framer",
    "/?tab=reader&module=landscaper",
  ]) {
    const saved = storage();
    rememberAuthReturn("/exam-reviewers", saved, 1000);
    assert.equal(consumeAuthReturn(current, true, saved, 2000), null);
    assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
  }
  const saved = storage();
  rememberAuthReturn("/exam-content", saved, 1000);
  rememberAuthReturn("/pricing", saved, 2000);
  assert.equal(consumeAuthReturn("/", true, saved, 3000), null);
});

test("malformed, external, expired and implausibly long-lived return markers cannot redirect", () => {
  for (const value of [
    "https://outside.invalid/exams",
    "//outside.invalid/exams",
    "/\\outside.invalid/exams",
    "/exams\n",
    "/unknown",
    "/?tab=unknown",
  ])
    assert.equal(authReturnPath(value), null);
  for (const value of [
    "{",
    "null",
    JSON.stringify({ pathname: "https://outside.invalid", expiresAt: 3000 }),
    JSON.stringify({ pathname: "/exam-content", expiresAt: 999 }),
    JSON.stringify({ pathname: "/exam-content", expiresAt: 99999999 }),
    JSON.stringify({ pathname: "/exam-content", expiresAt: "3000" }),
  ]) {
    const saved = storage();
    saved.setItem("lt_auth_return", value);
    assert.equal(consumeAuthReturn("/", true, saved, 2000), null);
  }
});

test("OAuth targets stay on the current origin and preserve only the existing invitation token", () => {
  assert.equal(
    authenticationRedirectUrl(
      "https://owned-preview.invalid/team/accept?token=fictional-invite&access_token=secret&returnTo=https://outside.invalid#refresh_token=secret",
    ),
    "https://owned-preview.invalid/team/accept?token=fictional-invite",
  );
  assert.equal(
    authenticationRedirectUrl(
      "https://owned-preview.invalid/exams?returnTo=https://outside.invalid#access_token=secret",
    ),
    "https://owned-preview.invalid/exams?target=Spanish&native=English",
  );
  assert.equal(
    authenticationRedirectUrl("https://owned-preview.invalid/pricing"),
    "https://owned-preview.invalid/",
  );
  assert.throws(() => authenticationRedirectUrl("javascript:alert(1)"), /Unsupported/);
  assert.doesNotThrow(() => rememberAuthReturn("/exam-content", null));
});

test("focused auth callback retains explicit lesson/plan return while removing credential and redirect fields", () => {
  const plan = "11111111-2222-4333-8444-555555555555";
  const current = `/exams?module=landscaper&target=Spanish&native=English&fromPlan=${plan}&lesson=15&way=hear&access_token=secret&return=https://outside.invalid#refresh_token=secret`;
  const callback = new URL(authenticationRedirectUrl("https://owned-preview.invalid" + current));
  assert.equal(callback.origin, "https://owned-preview.invalid");
  assert.equal(callback.pathname, "/exams");
  assert.equal(callback.searchParams.get("fromPlan"), plan);
  assert.equal(callback.searchParams.get("lesson"), "15");
  assert.equal(callback.searchParams.get("way"), "hear");
  assert.equal(callback.hash, "");
  for (const key of ["access_token", "refresh_token", "return"])
    assert.equal(callback.searchParams.has(key), false);
  const saved = storage();
  rememberAuthReturn(current, saved, 1000);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), authReturnPath(current));
});


test("speaking authentication retains only a valid public mission selection", () => {
  const path = "/?tab=speak&module=roofing&target=Spanish&native=English&mission=roofing.lesson-02.v1&email=private&access_token=secret";
  const result = authReturnPath(path);
  assert.equal(new URL(result, "https://qa.invalid").searchParams.get("mission"), "roofing.lesson-02.v1");
  assert.ok(!result.includes("private") && !result.includes("secret"));
  assert.equal(authenticationRedirectUrl("https://preview.example" + path), "https://preview.example" + result);
  const saved = storage(); rememberAuthReturn(path, saved, 1000);
  assert.equal(consumeAuthReturn("/", true, saved, 2000), result);
  for (const mission of ["https://outside.invalid", "x".repeat(201), "../outside", "bad id"]) {
    assert.equal(new URL(authReturnPath("/?tab=speak&mission=" + encodeURIComponent(mission)), "https://qa.invalid").searchParams.has("mission"), false);
  }
  assert.equal(new URL(authReturnPath("/?tab=reader&mission=public-id"), "https://qa.invalid").searchParams.has("mission"), false);
});
