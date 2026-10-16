import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { offlineLessonDownload } = await loadModule("src/lib/offline-lesson-download.ts");
async function withBrowser(behavior, action) {
  const original = new Map(
    ["navigator", "window", "MessageChannel"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const sent = [],
    timeouts = [],
    closed = [];
  class Channel {
    constructor() {
      this.port1 = { close: () => closed.push(true), onmessage: null };
      this.port2 = { peer: this.port1 };
    }
  }
  const serviceWorker = {
    controller: {
      postMessage: (message, ports) => {
        sent.push(message.type);
        behavior(message, ports[0].peer, serviceWorker);
      },
    },
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker } });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout: (callback, ms) => {
        timeouts.push({ callback, ms });
        return timeouts.length;
      },
      clearTimeout: () => {},
    },
  });
  Object.defineProperty(globalThis, "MessageChannel", { configurable: true, value: Channel });
  try {
    await action({ sent, timeouts, closed });
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("a worker without the download protocol cannot receive an install request or cause a four-minute wait", async () => {
  await withBrowser(
    () => {},
    async ({ sent, timeouts }) => {
      const result = offlineLessonDownload("LESSON_PACK_INSTALL");
      assert.deepEqual(sent, ["LESSON_PACK_PING"]);
      assert.equal(timeouts[0].ms, 6000);
      timeouts[0].callback();
      await assert.rejects(result, /worker did not respond/);
      assert.deepEqual(sent, ["LESSON_PACK_PING"]);
    },
  );
});

test("a compatible worker receives a command only after acknowledgement and returns bounded public metadata", async () => {
  await withBrowser(
    (message, port) =>
      port.onmessage({
        data:
          message.type === "LESSON_PACK_PING"
            ? { ok: true, protocol: 1 }
            : { ok: true, ready: true, version: "synthetic-version", bytes: 123 },
      }),
    async ({ sent, closed }) => {
      assert.deepEqual(await offlineLessonDownload("LESSON_PACK_INSTALL"), {
        ready: true,
        version: "synthetic-version",
        bytes: 123,
      });
      assert.deepEqual(sent, ["LESSON_PACK_PING", "LESSON_PACK_INSTALL"]);
      assert.equal(closed.length, 2);
    },
  );
});

test("a controller replacement during handshake cannot start an install against the stale worker", async () => {
  await withBrowser(
    (_message, port, serviceWorker) => {
      serviceWorker.controller = {};
      port.onmessage({ data: { ok: true, protocol: 1 } });
    },
    async ({ sent }) => {
      await assert.rejects(offlineLessonDownload("LESSON_PACK_INSTALL"), /app is updating/);
      assert.deepEqual(sent, ["LESSON_PACK_PING"]);
    },
  );
});
