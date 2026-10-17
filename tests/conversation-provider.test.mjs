import assert from "node:assert/strict";
import test from "node:test";
import {
  conversationCallOptions,
  conversationProviderOptions,
} from "../src/lib/conversation-provider.ts";

test("conversation deadline aborts the provider signal independently of the incoming request", () => {
  const savedTimeout = AbortSignal.timeout;
  const deadline = new AbortController();
  const incoming = new AbortController();
  AbortSignal.timeout = (milliseconds) => {
    assert.equal(milliseconds, 45_000);
    return deadline.signal;
  };
  try {
    const { signal } = conversationCallOptions(
      new Request("https://example.invalid", { signal: incoming.signal }),
    );
    assert.equal(signal.aborted, false);
    deadline.abort(new DOMException("Deadline", "TimeoutError"));
    assert.equal(signal.aborted, true);
    assert.equal(signal.reason.name, "TimeoutError");
    assert.equal(incoming.signal.aborted, false);
    assert.deepEqual(conversationProviderOptions("fixture-only"), {
      apiKey: "fixture-only",
      timeout: 45_000,
      maxRetries: 0,
    });
  } finally {
    AbortSignal.timeout = savedTimeout;
  }
});

test("installed SDK performs one HTTP attempt on retryable failure", async () => {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  let calls = 0;
  const client = new Anthropic({
    ...conversationProviderOptions("fixture-only"),
    fetch: async () => {
      calls++;
      return Response.json(
        { error: { type: "rate_limit_error", message: "Synthetic failure" } },
        { status: 429 },
      );
    },
  });
  await assert.rejects(
    client.messages.create(
      { model: "fixture", max_tokens: 1, messages: [{ role: "user", content: "Synthetic" }] },
      conversationCallOptions(new Request("https://example.invalid")),
    ),
    (error) => error.status === 429,
  );
  assert.equal(calls, 1);
});

test("installed SDK forwards abort to an already-open streaming response", async () => {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const incoming = new AbortController();
  let transportSignal;
  const client = new Anthropic({
    ...conversationProviderOptions("fixture-only"),
    fetch: async (_, init) => {
      transportSignal = init.signal;
      return new Response(
        new ReadableStream({
          start(controller) {
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
  const stream = await client.messages.create(
    {
      model: "fixture",
      max_tokens: 1,
      messages: [{ role: "user", content: "Synthetic" }],
      stream: true,
    },
    conversationCallOptions(new Request("https://example.invalid", { signal: incoming.signal })),
  );
  const iterator = stream[Symbol.asyncIterator]();
  const pending = iterator.next();
  incoming.abort();
  assert.equal(transportSignal.aborted, true);
  // The SDK treats a deliberate abort as a completed iterator, without retrying it.
  assert.equal((await pending).done, true);
});
