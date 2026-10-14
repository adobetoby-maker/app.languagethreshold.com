import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cacheReceipt,
  ttsCostUsd,
  usageReceipt,
  receiptCostUsd,
  monthlySessionCost,
} from "../src/lib/usage-cost.ts";
import { anthropicTextStream } from "../src/lib/anthropic-text-stream.ts";
test("price cache units separately and honor the Haiku long-prompt threshold", () => {
  const r = usageReceipt({
    model: "claude-haiku-5-5",
    usage: {
      input_tokens: 1000,
      output_tokens: 200,
      cache_creation_input_tokens: 300,
      cache_read_input_tokens: 500,
      cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 100 },
    },
  });
  assert.equal(receiptCostUsd(r), 0.00025);
  assert.ok(
    Math.abs(
      receiptCostUsd({
        ...r,
        inputTokens: 100000,
        cacheReadTokens: 1,
        cacheWrite1hTokens: 0,
        cacheWrite5mTokens: 0,
        outputTokens: 0,
      }) - 0.05000005,
    ) < 1e-12,
  );
  assert.equal(receiptCostUsd(cacheReceipt()), 0);
  assert.equal(receiptCostUsd({ ...r, model: "unrecognized-model" }), null);
  assert.equal(receiptCostUsd({ ...r, inputTokens: -1 }), null);
  assert.ok(Math.abs(monthlySessionCost(0.1, 3) - 1.3) < 1e-12);
});
test("stream counters are cumulative, not additive, and preserve text and terminal marker", async () => {
  async function* events() {
    yield {
      type: "message_start",
      message: { model: "claude-haiku-5-5", usage: { input_tokens: 100, output_tokens: 1 } },
    };
    yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hola" } };
    yield { type: "message_delta", usage: { input_tokens: null, output_tokens: 10 } };
    yield { type: "message_delta", usage: { output_tokens: 25 } };
    yield { type: "message_stop" };
  }
  const text = await new Response(anthropicTextStream(events())).text();
  const packets = text
    .split("\n\n")
    .filter((s) => s.startsWith("data: {"))
    .map((s) => JSON.parse(s.slice(6)));
  assert.equal(packets[0].choices[0].delta.content, "Hola");
  assert.equal(packets.at(-1).metering.outputTokens, 25);
  assert.equal(packets.at(-1).metering.inputTokens, 100);
  assert.ok(text.endsWith("data: [DONE]\n\n"));
  assert.ok(!text.includes("apiKey"));
});
test("an interrupted stream has no complete usage receipt", async () => {
  async function* events() {
    yield {
      type: "message_start",
      message: { model: "claude-haiku-5-5", usage: { input_tokens: 20, output_tokens: 1 } },
    };
  }
  assert.ok(!(await new Response(anthropicTextStream(events())).text()).includes("metering"));
});

test("voice estimates use Unicode character units and reject unknown voices", () => {
  assert.equal(ttsCostUsd("es-US-Neural2-A", 1000), 0.016);
  assert.equal(ttsCostUsd("es-US-Chirp3-HD-Aoede", 1000), 0.03);
  assert.equal(ttsCostUsd("es-US-Standard-A", 1000), 0.004);
  assert.equal(ttsCostUsd("unknown", 1000), null);
  assert.equal(ttsCostUsd("es-US-Neural2-A", -1), null);
});

test("standalone benchmark uses the app RPC framing without a browser or server context", async () => {
  const { callLearningServerFn } = await import("../scripts/learning-session-transport.mjs");
  let requested = false;
  const value = await callLearningServerFn(
    "https://example.invalid/_serverFn/fixture",
    { data: { word: "techo" } },
    async (url, init) => {
      requested = true;
      assert.equal(url, "https://example.invalid/_serverFn/fixture");
      assert.equal(init.headers.get("x-tsr-serverFn"), "true");
      assert.ok(init.body.includes("techo"));
      return new Response(JSON.stringify({ result: { error: null } }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  assert.equal(requested, true);
  assert.equal(value.result.error, null);
});
