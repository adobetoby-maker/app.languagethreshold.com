import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
function worker() {
  const handlers = {},
    lookups = [],
    writes = [],
    network = [],
    store = new Map();
  let offline = false;
  const cache = {
    match: async (key) => {
      lookups.push(key);
      return store.get(key)?.clone();
    },
    put: async (key, response) => {
      writes.push(key);
      store.set(key, response.clone());
    },
  };
  const context = vm.createContext({
    self: {
      location: { origin: "https://app.languagethreshold.com" },
      addEventListener: (name, fn) => (handlers[name] = fn),
    },
    URL,
    Response,
    AbortSignal,
    caches: {
      open: async () => cache,
      match: async () => {
        throw Error("No arbitrary cache lookup permitted");
      },
    },
    fetch: async (request, options) => {
      if (offline) throw Error("offline");
      network.push({ request, options });
      return typeof request === "string"
        ? new Response("<html>public Exams bootstrap</html>", {
            headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
          })
        : new Response("private navigation fixture", { headers: { "Cache-Control": "no-store" } });
    },
  });
  vm.runInContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), context);
  return {
    handlers,
    lookups,
    writes,
    network,
    offline: () => {
      offline = true;
    },
    async navigate() {
      let response;
      const pending = [];
      const request = new Request(
        "https://app.languagethreshold.com/exams?attempt=private&org=private",
      );
      Object.defineProperty(request, "mode", { value: "navigate" });
      handlers.fetch({
        request,
        respondWith: (p) => (response = p),
        waitUntil: (p) => pending.push(p),
      });
      const result = await response;
      await Promise.all(pending);
      return result;
    },
  };
}
test("offline exam refresh uses only the fixed signed-out shell, never cached identity-specific HTML or API responses", async () => {
  const w = worker();
  assert.equal(await (await w.navigate()).text(), "private navigation fixture");
  assert.deepEqual(w.writes, ["/.lt-public-exams-shell"]);
  assert.equal(w.network[1].request, "/exams?target=Spanish&native=English");
  assert.equal(w.network[1].options.credentials, "omit");
  assert.equal(w.network[1].options.cache, "no-store");
  assert.equal(w.network[1].options.redirect, "error");
  assert.equal(w.network[1].options.headers, undefined);
  w.offline();
  assert.equal(await (await w.navigate()).text(), "<html>public Exams bootstrap</html>");
  assert.deepEqual(w.lookups, ["/.lt-public-exams-shell"]);
  for (const request of [
    new Request("https://app.languagethreshold.com/api/exams"),
    new Request("https://app.languagethreshold.com/private.json", {
      headers: { Authorization: "Bearer synthetic-test" },
    }),
  ]) {
    let intercepted = false;
    w.handlers.fetch({ request, respondWith: () => (intercepted = true) });
    assert.equal(intercepted, false);
  }
});
