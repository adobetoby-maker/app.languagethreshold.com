import assert from "node:assert/strict";
import test from "node:test";
import { consumeModuleRequestReturn, rememberModuleRequestReturn } from "../src/lib/auth-return.ts";

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
  rememberModuleRequestReturn("/module-request", saved, 1000);
  assert.equal(consumeModuleRequestReturn("/", false, saved, 2000), null);
  assert.equal(consumeModuleRequestReturn("/", true, saved, 2000), "/module-request");
  assert.equal(consumeModuleRequestReturn("/", true, saved, 2000), null);
});

test("only the request page can set a short-lived return", () => {
  const saved = storage();
  rememberModuleRequestReturn("/pricing", saved, 1000);
  assert.equal(consumeModuleRequestReturn("/", true, saved, 2000), null);
  rememberModuleRequestReturn("/module-request", saved, 1000);
  assert.equal(consumeModuleRequestReturn("/team", true, saved, 2000), null);
  assert.equal(consumeModuleRequestReturn("/", true, saved, 901001), null);
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
  assert.doesNotThrow(() => rememberModuleRequestReturn("/module-request", blocked));
  assert.equal(consumeModuleRequestReturn("/", true, blocked), null);
});
