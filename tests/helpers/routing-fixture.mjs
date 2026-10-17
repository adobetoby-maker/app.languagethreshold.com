/** Fictional routing cutoffs are test data, never a published policy or inserted form. */
export function routingFixture() {
  const make = (id, skill, objectiveId) => ({
    id,
    skill,
    objectiveId,
    type:
      skill === "recall"
        ? "recall"
        : ["writing", "speaking"].includes(skill)
          ? "production"
          : "choice",
    prompt: "Synthetic routing fixture question.",
    coverage: "module",
    inputMethods: skill === "speaking" ? ["speech"] : ["typed"],
    maximum: 1,
    comparisonGroup: id,
    rationale: "Fixture only.",
    options: [
      { id: "a", text: "Choice A" },
      { id: "b", text: "Choice B" },
      { id: "c", text: "Choice C" },
    ],
    correctOptionId: "a",
    accepted: ["private-fixture-answer"],
    policy: { caseSensitive: false, accents: "ignore", punctuation: "ignore" },
    rubric: {
      id: "fixture-rubric",
      dimensions: [{ id: "task", label: "Task", description: "Fixture only", maximum: 1 }],
    },
    ...(skill === "listening"
      ? { audioRequired: true, audioText: "Private fixture listening text." }
      : {}),
  });
  const core = ["recognition", "recall", "listening", "reading", "writing", "speaking"].flatMap(
    (skill) => [1, 2, 3].map((n) => make(`core-${skill}-${n}`, skill, `fixture.lesson.${n}`)),
  );
  const branchIds = ["band-a", "band-b", "more-evidence"];
  const items = [
    ...core,
    ...branchIds.map((id) => make(`branch-${id}`, "recognition", `fixture.${id}`)),
  ];
  const form = {
    id: "fixture-form",
    version: "fixture-v1",
    rubricVersion: "fixture-rubric-v1",
    checkpoint: "entrance",
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    estimatedMinutes: 20,
    status: "draft",
    items,
    routing: {
      schema: 1,
      version: "fixture-routing-v1",
      coreItemIds: core.map((i) => i.id),
      minimumEvidence: 12,
      minimumObjectives: 3,
      branches: branchIds.map((id) => ({ id, itemIds: [`branch-${id}`] })),
      bands: [
        { minimumPercent: 0, maximumPercent: 50, branchId: "band-a" },
        { minimumPercent: 50, maximumPercent: 100, branchId: "band-b" },
      ],
      insufficientEvidenceBranchId: "more-evidence",
    },
  };
  const answers = core.map((item) => ({
    itemId: item.id,
    answer:
      item.skill === "speaking"
        ? { inputMethod: "unavailable", missingReason: "Fixture microphone unavailable" }
        : item.type === "choice"
          ? {
              inputMethod: "choice",
              choiceId: "a",
              ...(item.audioRequired ? { listeningHeard: true } : {}),
            }
          : {
              inputMethod: "typed",
              text: item.type === "recall" ? "private-fixture-answer" : "Fixture written response",
            },
  }));
  return { form, answers, core };
}
