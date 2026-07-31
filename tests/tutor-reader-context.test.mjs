import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadModule } from "./helpers/bundle.mjs";

// Certified offline and deterministically: the approved Reader→Tutor contract
// is proven by parsing payloads against the shipped Zod schema and by asserting
// on the exact prompt lines `buildSystemPrompt` emits. No model is called and
// no credential is used.
const { BodySchema, buildSystemPrompt } = await loadModule("src/routes/api.tutor.ts", {
  stubs: [/^@anthropic-ai\/sdk$/, /^@tanstack\/react-router$/, /lib\/sentry$/],
});

const readerContextSchema = BodySchema.shape.context.shape.readerContext;

const validReaderContext = {
  selectedWord: "prenotazione",
  sentence: "Ho perso la prenotazione per il treno delle otto.",
  passageExcerpt: "Ho perso la prenotazione per il treno delle otto. Ora devo aspettare.",
  textTitle: "Alla stazione",
  language: "Italian",
  learnerLevel: "Beginner",
  explanation: "A booking or reservation; feminine noun.",
};

const body = (readerContext) => ({
  messages: [{ role: "user", content: "What does this word mean here?" }],
  context: { language: "Italian", level: "A1", readerContext },
});

describe("R2: readerContext schema", () => {
  test("accepts a fully-populated reader context", () => {
    const parsed = BodySchema.parse(body(validReaderContext));
    assert.deepEqual(parsed.context.readerContext, validReaderContext);
  });

  test("accepts the minimum required shape and omits absent optionals cleanly", () => {
    const minimal = {
      selectedWord: "treno",
      sentence: "Il treno parte alle otto.",
      language: "Italian",
    };
    const parsed = readerContextSchema.parse(minimal);

    assert.deepEqual(parsed, minimal);
    for (const key of ["passageExcerpt", "textTitle", "learnerLevel", "explanation"]) {
      assert.ok(!(key in parsed), `${key} must be absent, not undefined-valued`);
    }
  });

  test("readerContext itself is optional — a non-reader turn still parses", () => {
    const parsed = BodySchema.parse(body(undefined));
    assert.equal(parsed.context.readerContext, undefined);
  });

  test("rejects a payload missing each required field", () => {
    for (const missing of ["selectedWord", "sentence", "language"]) {
      const candidate = { ...validReaderContext };
      delete candidate[missing];
      assert.equal(
        readerContextSchema.safeParse(candidate).success,
        false,
        `${missing} must be required`,
      );
    }
  });

  test("rejects empty strings on the required fields", () => {
    for (const field of ["selectedWord", "sentence", "language"]) {
      assert.equal(
        readerContextSchema.safeParse({ ...validReaderContext, [field]: "" }).success,
        false,
        `${field} must reject the empty string`,
      );
    }
  });

  test("enforces the approved length ceilings", () => {
    const limits = {
      selectedWord: 120,
      sentence: 2000,
      passageExcerpt: 2000,
      textTitle: 200,
      language: 40,
      learnerLevel: 40,
      explanation: 1600,
    };

    for (const [field, max] of Object.entries(limits)) {
      assert.equal(
        readerContextSchema.safeParse({ ...validReaderContext, [field]: "x".repeat(max) }).success,
        true,
        `${field} must accept exactly ${max} characters`,
      );
      assert.equal(
        readerContextSchema.safeParse({ ...validReaderContext, [field]: "x".repeat(max + 1) })
          .success,
        false,
        `${field} must reject ${max + 1} characters`,
      );
    }
  });
});

describe("R2: readerContext prompt assembly", () => {
  const promptFor = (readerContext) =>
    buildSystemPrompt(BodySchema.parse(body(readerContext)).context);

  test("emits every reader line for a fully-populated context", () => {
    const prompt = promptFor(validReaderContext);

    for (const line of [
      `- Reader-selected word: "prenotazione"`,
      `- Exact sentence: "Ho perso la prenotazione per il treno delle otto."`,
      `- Selection source: "Alla stazione"`,
      `- Existing Word Card explanation: A booking or reservation; feminine noun.`,
      `- Learner level when selected: Beginner`,
      `- Treat the selected sentence as the primary context for the learner's question.`,
    ]) {
      assert.ok(prompt.includes(line), `missing prompt line: ${line}`);
    }

    assert.ok(
      prompt.includes(`- Surrounding passage excerpt:\n"""\n${validReaderContext.passageExcerpt}\n"""`),
      "passage excerpt must be fenced",
    );
  });

  test("omits optional lines that were not supplied", () => {
    const prompt = promptFor({
      selectedWord: "treno",
      sentence: "Il treno parte alle otto.",
      language: "Italian",
    });

    assert.ok(prompt.includes(`- Reader-selected word: "treno"`));
    assert.ok(prompt.includes(`- Exact sentence: "Il treno parte alle otto."`));
    for (const absent of [
      "- Selection source:",
      "- Existing Word Card explanation:",
      "- Surrounding passage excerpt:",
      "- Learner level when selected:",
    ]) {
      assert.ok(!prompt.includes(absent), `unexpected prompt line: ${absent}`);
    }
    // The steering instruction is unconditional.
    assert.ok(
      prompt.includes("- Treat the selected sentence as the primary context"),
      "steering line must always be emitted",
    );
  });

  test("truncates an over-long passage excerpt to 1200 characters", () => {
    const excerpt = "a".repeat(2000);
    const prompt = promptFor({ ...validReaderContext, passageExcerpt: excerpt });

    assert.ok(prompt.includes(`"""\n${"a".repeat(1200)}\n"""`), "excerpt must be sliced to 1200");
    assert.ok(!prompt.includes("a".repeat(1201)), "no more than 1200 characters may reach the model");
  });

  test("emits no reader lines when readerContext is absent", () => {
    const prompt = promptFor(undefined);

    for (const absent of [
      "- Reader-selected word:",
      "- Exact sentence:",
      "- Treat the selected sentence as the primary context",
    ]) {
      assert.ok(!prompt.includes(absent), `unexpected prompt line: ${absent}`);
    }
  });
});
