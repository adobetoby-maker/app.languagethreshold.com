import assert from "node:assert/strict";
import test from "node:test";
import {
  recentConversationMessages,
  CONVERSATION_HISTORY_BYTES,
} from "../src/lib/conversation-history.ts";
test("long conversations send recent context and the complete latest question without changing local history", () => {
  const history = Array.from({ length: 81 }, (_, i) =>
    Object.freeze({ role: i % 2 === 0 ? "user" : "assistant", content: `Whole turn ${i}` }),
  );
  Object.freeze(history);
  const outbound = recentConversationMessages(history);
  assert.ok(outbound.length <= 20);
  assert.equal(outbound[0].role, "user");
  assert.deepEqual(outbound.at(-1), history.at(-1));
  assert.equal(history.length, 81);
  assert.equal(history[0].content, "Whole turn 0");
});
test("empty interrupted replies do not poison the next request, while scenario opening stays empty", () => {
  assert.deepEqual(recentConversationMessages([]), []);
  const latest = { role: "user", content: "Can we try that again?" };
  assert.deepEqual(
    recentConversationMessages([
      { role: "assistant", content: "" },
      { role: "assistant", content: "   " },
      latest,
    ]),
    [latest],
  );
});
test("UTF-8 context is bounded without splitting or silently truncating the latest turn", () => {
  const older = { role: "user", content: "文".repeat(8000) },
    latest = { role: "user", content: "最新".repeat(4000) };
  const result = recentConversationMessages([
    older,
    { role: "assistant", content: "A reply" },
    latest,
  ]);
  assert.ok(
    new TextEncoder().encode(result.map((m) => m.content).join("")).byteLength <=
      CONVERSATION_HISTORY_BYTES,
  );
  assert.deepEqual(result.at(-1), latest);
  assert.equal(
    result.some((m) => m.content === older.content),
    false,
  );
  assert.throws(
    () =>
      recentConversationMessages([
        { role: "user", content: "文".repeat(CONVERSATION_HISTORY_BYTES) },
      ]),
    /too long/,
  );
});
