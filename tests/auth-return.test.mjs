import assert from "node:assert/strict";
import test from "node:test";
import { consumeAuthReturn, rememberAuthReturn } from "../src/lib/auth-return.ts";

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
