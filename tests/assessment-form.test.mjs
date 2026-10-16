import assert from "node:assert/strict";
import test from "node:test";
import {
  publicAssessmentItem,
  initialItemEvidence,
  validateFormDefinition,
} from "../src/lib/assessments/form.ts";
const roofingAssessmentForm = (checkpoint) => ({
  status: "draft",
  items: ["recognition", "recall", "listening", "reading", "writing", "speaking"].flatMap((skill) =>
    [1, 2, 3].map((n) => ({
      id: `fixture-${skill}-${n}`,
      objectiveId: `fixture.lesson.${n}`,
      comparisonGroup: `fixture-${skill}-${n}`,
      skill,
      type: ["recognition", "listening", "reading"].includes(skill)
        ? "choice"
        : skill === "recall"
          ? "recall"
          : "production",
      prompt: "Synthetic fixture question; never a published exam item.",
      coverage: checkpoint === "day45" ? "studied" : "module",
      inputMethods: ["typed"],
      maximum: ["writing", "speaking"].includes(skill) ? 6 : 1,
      options: [
        { id: "test-a", text: "Fixture A" },
        { id: "test-b", text: "Fixture B" },
        { id: "test-c", text: "Fixture C" },
      ],
      correctOptionId: "test-a",
      accepted: ["fixture-answer"],
      policy: { caseSensitive: false, accents: "ignore", punctuation: "ignore" },
      rubric: {
        id: "fixture-rubric",
        dimensions: [{ id: "fixture", label: "Fixture", description: "Test only", maximum: 6 }],
      },
      rationale: "Test only",
    })),
  ),
});
for (const checkpoint of ["entrance", "day45", "day90"])
  test(`${checkpoint}: synthetic form validates six skills and three distinct objectives`, () => {
    const form = roofingAssessmentForm(checkpoint);
    assert.deepEqual(validateFormDefinition(form), []);
    assert.equal(form.status, "draft");
    assert.equal(new Set(form.items.map((i) => i.id)).size, form.items.length);
    if (checkpoint === "day45")
      for (const skill of ["recognition", "recall", "listening", "reading", "writing", "speaking"])
        assert.equal(
          new Set(
            form.items
              .filter((i) => i.skill === skill && i.coverage === "studied")
              .map((i) => i.objectiveId),
          ).size,
          3,
        );
  });
test("public exam projection cannot leak answer keys, listening transcripts or rubric internals", () => {
  const form = roofingAssessmentForm("entrance");
  for (const item of form.items) {
    const exposed = publicAssessmentItem({ ...item, unexpectedKey: "do not expose" });
    for (const field of [
      "accepted",
      "policy",
      "correctOptionId",
      "audioText",
      "rubric",
      "rationale",
      "comparisonGroup",
      "unexpectedKey",
    ])
      assert.equal(field in exposed, false, field);
  }
});
test("scoring separates wrong answers, unavailable evidence and unresolved recognition", () => {
  const form = roofingAssessmentForm("entrance");
  const choice = form.items.find((i) => i.type === "choice");
  const wrong = choice.options.find((o) => o.id !== choice.correctOptionId);
  assert.equal(
    initialItemEvidence(choice, { inputMethod: "choice", choiceId: wrong.id }).points,
    0,
  );
  assert.equal(
    initialItemEvidence(choice, {
      inputMethod: "unavailable",
      missingReason: "Audio could not play",
    }).points,
    null,
  );
  const recall = form.items.find((i) => i.type === "recall");
  assert.equal(
    initialItemEvidence(recall, {
      inputMethod: "handwriting",
      originalTranscript: "techo",
      recognitionIssue: true,
    }).state,
    "needs_review",
  );
  assert.equal(
    initialItemEvidence(recall, {
      inputMethod: "handwriting",
      originalTranscript: "tcho",
      correctedTranscript: recall.accepted[0],
    }).points,
    1,
  );
  const writing = form.items.find((i) => i.skill === "writing");
  assert.equal(
    initialItemEvidence(writing, { inputMethod: "typed", text: "Necesito una teja." }).state,
    "pending",
  );
  const speaking = form.items.find((i) => i.skill === "speaking");
  assert.equal(
    initialItemEvidence(speaking, { inputMethod: "typed", text: "Typed alternative" }).state,
    "not_assessed",
  );
  assert.equal(
    initialItemEvidence(speaking, {
      inputMethod: "speech_transcript",
      text: "Unverified transcript",
    }).state,
    "not_assessed",
  );
});
test("listening requires confirmed playback and keeps missing audio separate from an incorrect response", () => {
  const item = {
    ...roofingAssessmentForm("entrance").items.find((item) => item.skill === "listening"),
    audioRequired: true,
  };
  assert.equal(
    initialItemEvidence(item, { inputMethod: "choice", choiceId: item.correctOptionId }).state,
    "not_assessed",
  );
  assert.equal(
    initialItemEvidence(item, {
      inputMethod: "choice",
      choiceId: item.correctOptionId,
      listeningHeard: true,
    }).points,
    1,
  );
  assert.equal(
    initialItemEvidence(item, { inputMethod: "choice", choiceId: "test-b", listeningHeard: true })
      .points,
    0,
  );
});

test("speaking IDs alone never become assessed evidence; a server-verified exact recording stays pending human review", () => {
  const item = roofingAssessmentForm("entrance").items.find((i) => i.skill === "speaking");
  const answer = { inputMethod: "speech_transcript", mediaEvidenceId: "fixture-recording" };
  assert.equal(initialItemEvidence(item, answer).state, "not_assessed");
  assert.equal(initialItemEvidence(item, answer, "another-recording").state, "not_assessed");
  const verified = initialItemEvidence(item, answer, "fixture-recording");
  assert.equal(verified.state, "needs_review");
  assert.equal(verified.points, null);
  assert.equal(
    initialItemEvidence(
      item,
      { ...answer, inputMethod: "typed", text: "cannot replace speech" },
      "fixture-recording",
    ).state,
    "not_assessed",
  );
});
