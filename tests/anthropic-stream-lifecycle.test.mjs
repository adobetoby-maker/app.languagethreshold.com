import assert from "node:assert/strict";
import test from "node:test";
import { anthropicTextStream } from "../src/lib/anthropic-text-stream.ts";

for (const throws of [false, true]) {
  test(`partial stream ${throws ? "failure" : "early EOF"} never emits success or raw provider error`, async () => {
    let resume;
    const gate = new Promise((resolve) => {
      resume = resolve;
    });
    async function* events() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Partial reply" } };
      await gate;
      if (throws) throw new Error("PRIVATE request body and provider payload");
    }
    const reader = anthropicTextStream(events()).getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /Partial reply/);
    assert.ok(!first.includes("[DONE]"));
    resume();
    await assert.rejects(
      reader.read(),
      (error) => error.message === "AI response interrupted. Please try again.",
    );
  });
}

test("cancelling a response aborts the upstream controller and closes its iterator", async () => {
  const controller = new AbortController();
  let finished = false;
  async function* events() {
    try {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Partial" } };
      await new Promise((resolve) => {
        if (controller.signal.aborted) resolve();
        else controller.signal.addEventListener("abort", resolve, { once: true });
      });
    } finally {
      finished = true;
    }
  }
  const stream = events();
  stream.controller = controller;
  const reader = anthropicTextStream(stream).getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.signal.aborted, true);
  assert.equal(finished, true);
  assert.equal((await reader.read()).done, true);
});

test("response cancellation reaches the installed SDK transport after its headers", async () => {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  let transportSignal;
  let calls = 0;
  const client = new Anthropic({
    apiKey: "fixture-only",
    maxRetries: 0,
    fetch: async (_, init) => {
      calls++;
      transportSignal = init.signal;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Partial"}}\n\n',
              ),
            );
            init.signal.addEventListener(
              "abort",
              () => controller.error(new DOMException("Cancelled", "AbortError")),
              { once: true },
            );
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });
  const upstream = await client.messages.create({
    model: "fixture",
    max_tokens: 1,
    stream: true,
    messages: [{ role: "user", content: "Synthetic" }],
  });
  const reader = anthropicTextStream(upstream).getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /Partial/);
  await reader.cancel();
  assert.equal(transportSignal.aborted, true);
  assert.equal(calls, 1);
});
