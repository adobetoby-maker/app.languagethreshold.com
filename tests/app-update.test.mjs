import assert from "node:assert/strict";
import test from "node:test";
import { resetAppToFirstRun } from "../src/lib/app-update.ts";

function resetRuntime(events, overrides = {}) {
  return {
    clearCaches: async () => events.push("caches"),
    unregisterServiceWorkers: async () => events.push("service-workers"),
    clearLocalStorage: () => events.push("local-storage"),
    clearSessionStorage: () => events.push("session-storage"),
    restart: () => events.push("restart"),
    ...overrides,
  };
}

test("start-over signs out before clearing this device and restarting", async () => {
  const events = [];

  await resetAppToFirstRun(async () => events.push("sign-out"), resetRuntime(events));

  assert.equal(events[0], "sign-out");
  assert.deepEqual(new Set(events.slice(1, 3)), new Set(["caches", "service-workers"]));
  assert.deepEqual(events.slice(3), ["local-storage", "session-storage", "restart"]);
});

test("start-over still clears local state when sign-out or cache cleanup fails", async () => {
  const events = [];

  await resetAppToFirstRun(
    async () => {
      events.push("sign-out-attempt");
      throw new Error("offline");
    },
    resetRuntime(events, {
      clearCaches: async () => {
        events.push("cache-attempt");
        throw new Error("cache unavailable");
      },
    }),
  );

  assert.deepEqual(events, [
    "sign-out-attempt",
    "cache-attempt",
    "service-workers",
    "local-storage",
    "session-storage",
    "restart",
  ]);
});
