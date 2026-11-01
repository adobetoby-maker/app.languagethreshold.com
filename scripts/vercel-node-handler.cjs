const { performance } = require("node:perf_hooks");

// Shared with adapter tests. Timings contain durations only, never URLs, users or headers.
exports.createNodeHandler = function createNodeHandler(
  loadServer,
  clock = () => performance.now(),
) {
  return async function handler(req, res) {
    const start = clock();
    const server = await loadServer();
    const loaded = clock();
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = proto + "://" + host + req.url;
    const body = await new Promise((resolve) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => resolve(Buffer.alloc(0)));
    });
    const requestReady = clock();
    const response = await server.fetch(
      new Request(url, {
        method: req.method,
        headers: Object.fromEntries(
          Object.entries(req.headers)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]),
        ),
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body.length ? body : undefined,
      }),
    );
    const rendered = clock();
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) res.setHeader(key, value);
    const timing = `bootstrap;dur=${Math.max(0, loaded - start).toFixed(1)}, request;dur=${Math.max(0, requestReady - loaded).toFixed(1)}, render;dur=${Math.max(0, rendered - requestReady).toFixed(1)}`;
    const existing = response.headers.get("Server-Timing");
    res.setHeader("Server-Timing", existing ? `${existing}, ${timing}` : timing);
    if (!response.body) {
      res.end();
      return;
    }
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value)))
          await new Promise((resolve) => res.once("drain", resolve));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  };
};
