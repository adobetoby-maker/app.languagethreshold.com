import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { lessonCorrectionSchema, correctionText } = await loadModule("src/lib/lesson-correction.ts");
const { deliverLessonCorrection } = await loadModule("src/lib/lesson-correction-server.ts");
const item = {
  requestId: "00000000-0000-4000-8000-000000000001",
  moduleId: "roofing",
  lessonNumber: 2,
  lessonTitle: "Deck, Underlayment & Edges",
  language: "Spanish",
  nativeLanguage: "English",
  suggestion: "Please review the regional term for underlayment.",
};
test("corrections require bounded lesson context and do not accept recipient overrides", () => {
  assert.deepEqual(lessonCorrectionSchema.parse(item), item);
  for (const change of [
    { suggestion: "   " },
    { suggestion: "a".repeat(3001) },
    { lessonNumber: 0 },
    { moduleId: "roofing\nBcc: another" },
    { to: "another@example.invalid" },
  ])
    assert.throws(() => lessonCorrectionSchema.parse({ ...item, ...change }));
  assert.match(correctionText(item), /Lesson 2: Deck, Underlayment & Edges/);
});
test("notifications use only the support inbox, authenticated reply address, and stable idempotency", async () => {
  const previous = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "synthetic";
  try {
    const requests = [];
    const fetcher = async (url, init) => {
      requests.push({ url, ...init });
      return Response.json({ id: "synthetic-receipt" });
    };
    for (let n = 0; n < 2; n++)
      assert.deepEqual(
        await deliverLessonCorrection(
          item,
          { id: "learner", email: "learner@example.invalid" },
          new AbortController().signal,
          fetcher,
        ),
        { accepted: true },
      );
    const body = JSON.parse(requests[0].body);
    assert.deepEqual(body.to, ["support@languagethreshold.com"]);
    assert.equal(body.reply_to, "learner@example.invalid");
    assert.match(body.text, /Instruction language: English/);
    assert.equal(requests[0].headers["Idempotency-Key"], requests[1].headers["Idempotency-Key"]);
    await assert.rejects(
      deliverLessonCorrection(
        item,
        { id: "learner", email: "learner@example.invalid" },
        new AbortController().signal,
        async () => Response.json({ error: "private provider details" }, { status: 500 }),
      ),
      /saved for review/,
    );
    await assert.rejects(
      deliverLessonCorrection(
        item,
        { id: "learner", email: "learner@example.invalid" },
        new AbortController().signal,
        async () => {
          throw new Error("private details");
        },
      ),
      /could not be confirmed/,
    );
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
  }
});
