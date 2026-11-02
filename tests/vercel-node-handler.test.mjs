import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import handlerModule from "../scripts/vercel-node-handler.cjs";
const { createNodeHandler } = handlerModule;
function responseSink(backpressure = false) {
  const res = new EventEmitter();
  res.headers = {};
  res.body = [];
  res.setHeader = (k, v) => {
    res.headers[k.toLowerCase()] = v;
  };
  res.write = (value) => {
    res.body.push(value);
    if (backpressure) {
      queueMicrotask(() => res.emit("drain"));
      return false;
    }
    return true;
  };
  res.end = () => {
    res.ended = true;
  };
  return res;
}
function request(method = "GET", body = [], url = "/") {
  const req = Readable.from(body);
  req.method = method;
  req.url = url;
  req.headers = { host: "app.languagethreshold.com", "x-forwarded-proto": "https" };
  return req;
}
test("Node bridge reports distinct bootstrap/request/render durations and preserves streamed output", async () => {
  let calls = 0;
  const marks = [10, 17, 20, 35];
  const handler = createNodeHandler(
    async () => ({
      fetch: async (req) => {
        assert.equal(req.url, "https://app.languagethreshold.com/");
        return new Response("reader shell", {
          headers: {
            "content-type": "text/html",
            "server-timing": "db;dur=2",
            "cache-control": "private, no-store",
          },
        });
      },
    }),
    () => marks[calls++],
  );
  const res = responseSink(true);
  await handler(request(), res);
  assert.equal(Buffer.concat(res.body).toString(), "reader shell");
  assert.equal(
    res.headers["server-timing"],
    "db;dur=2, bootstrap;dur=7.0, request;dur=3.0, render;dur=15.0",
  );
  assert.equal(res.headers["cache-control"], "private, no-store");
  assert.equal(res.statusCode, 200);
  assert.ok(res.ended);
});
test("mutations preserve body, authorization and cookies without exposing identity in timings", async () => {
  const req = request("POST", [Buffer.from('{"answer":"private draft"}')], "/api/private");
  req.headers.authorization = "Bearer test-only";
  req.headers.cookie = "learner=test-only";
  const res = responseSink();
  await createNodeHandler(
    async () => ({
      fetch: async (web) => {
        assert.equal(await web.text(), '{"answer":"private draft"}');
        assert.equal(web.headers.get("authorization"), "Bearer test-only");
        assert.equal(web.headers.get("cookie"), "learner=test-only");
        return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
      },
    }),
    () => 5,
  )(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.doesNotMatch(res.headers["server-timing"], /test-only|learner|answer|private/);
});
test("redirects and bodyless responses keep status and headers", async () => {
  const res = responseSink();
  await createNodeHandler(async () => ({
    fetch: async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "/exams", "Cache-Control": "no-store" },
      }),
  }))(request("HEAD"), res);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, "/exams");
  assert.equal(res.body.length, 0);
  assert.ok(res.ended);
});
