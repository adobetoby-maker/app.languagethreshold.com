import assert from "node:assert/strict";
import test from "node:test";
import {
  withConversationProvider,
  ConversationProviderError,
} from "../src/lib/conversation-provider.ts";
import { withSpeakingProvider, SpeakingProviderError } from "../src/lib/speaking-provider.ts";

test("conversation shares the exercised owned Speaking transport and error identity", () => {
  assert.equal(withConversationProvider, withSpeakingProvider);
  assert.equal(ConversationProviderError, SpeakingProviderError);
});
test("conversation installed SDK uses one no-store attempt on retryable failure", async () => {
  const saved = fetch;
  let calls = 0;
  globalThis.fetch = async (_, options) => {
    calls++;
    assert.equal(options.cache, "no-store");
    return Response.json(
      { error: { type: "rate_limit_error", message: "Synthetic private detail" } },
      { status: 429 },
    );
  };
  try {
    await assert.rejects(
      withConversationProvider(
        new Request("https://fixture.invalid"),
        "fixture-only",
        async (client, options) => {
          await client.messages.create(
            { model: "fixture", max_tokens: 1, messages: [{ role: "user", content: "Synthetic" }] },
            options,
          );
          throw Error("unreachable");
        },
      ),
      (e) => e instanceof ConversationProviderError && e.status === 502 && e.cause === undefined,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = saved;
  }
});
test("conversation already-aborted owner starts no provider attempt", async () => {
  const saved = fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error("unreachable");
  };
  const owner = new AbortController();
  owner.abort();
  try {
    await assert.rejects(
      withConversationProvider(
        new Request("https://fixture.invalid", { signal: owner.signal }),
        "fixture-only",
        async () => {
          calls++;
          return Response.json({});
        },
      ),
      (e) => e.status === 499,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = saved;
  }
});
