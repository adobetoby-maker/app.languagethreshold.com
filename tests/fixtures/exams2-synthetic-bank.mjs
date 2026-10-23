// Built by TAC — 2026-10-23
// Synthetic exams v2 bank for tests. Every string is placeholder text ("syn ..."); there is no
// real exam content here and none may be added. Real banks live outside the repository.
import { bankSha256 } from "../../src/lib/exams2/bank.ts";
import { sha256Hex } from "../../src/lib/exams2/hash.ts";

const pad = (n) => String(n).padStart(2, "0");
const WORDS = [
  "alder",
  "birch",
  "cedar",
  "dogwood",
  "elm",
  "fir",
  "ginkgo",
  "hazel",
  "ironwood",
  "juniper",
];
const token = (lesson, index, suffix = "") =>
  `syn${pad(lesson)}${WORDS[index % WORDS.length]}${index}${suffix}`;

function makeItem(moduleId, lesson, index, type, difficulty, author = "author-agent-1") {
  const id = `${moduleId}.L${pad(lesson)}.i${pad(index)}`;
  const base = {
    id,
    rev: 1,
    lesson,
    skill: ["recognize", "recall", "use", "understand"][index % 4],
    difficulty,
    type,
    prompt: `Synthetic ${type} prompt for lesson ${lesson} item ${index}.`,
    explanation: `Synthetic explanation for lesson ${lesson} item ${index}.`,
    sourceRefs: [`syn-ref-${lesson}`],
    author,
  };
  if (type === "mc")
    return {
      ...base,
      options: ["a", "b", "c", "d"].map((option) => ({
        id: option,
        text: token(lesson, index, option),
        ...(option === "a" ? {} : { distractorRationale: `Synthetic rationale ${option}.` }),
      })),
      correctOptionId: "a",
    };
  if (type === "typed")
    return { ...base, accepted: [token(lesson, index, "ans"), token(lesson, index, "alt")] };
  return {
    ...base,
    pairs: [1, 2, 3, 4].map((n) => ({
      left: `${token(lesson, index)} left ${n}`,
      right: `${token(lesson, index)} right ${n}`,
    })),
  };
}

// Per-form type plans (index = lesson - 1). A/B: 18 mc, 8 typed, 4 match of 30.
const planA = (lesson) =>
  lesson % 15 === 0 || lesson % 15 === 7 ? "match" : lesson % 4 === 1 ? "typed" : "mc";

/** Diagnostic pool plans: (type, difficulty) of each item in every lesson. */
export const POOL_PLAN_5 = [
  ["mc", 2],
  ["typed", 1],
  ["mc", 3],
  ["typed", 2],
  ["match", 2],
];
export const POOL_PLAN_6 = [...POOL_PLAN_5, ["mc", 1]];

/**
 * Build a valid synthetic bank. `poolPlan` lists the (type, difficulty) of each diagnostic item in
 * a lesson; the default has 6 items per lesson covering all difficulties and two typed items.
 */
export function buildSyntheticBank({
  moduleId = "roofing",
  poolPlan = POOL_PLAN_6,
  reviewers = ["reviewer-agent-1", "reviewer-agent-2"],
} = {}) {
  const items = [];
  const forms = { A: [], B: [], C: [] };
  const diagnosticPool = [];
  for (let lesson = 1; lesson <= 30; lesson++) {
    let index = 1;
    const difficulty = ((lesson - 1) % 3) + 1;
    const typeA = planA(lesson);
    const a = makeItem(moduleId, lesson, index++, typeA, difficulty);
    items.push(a);
    forms.A.push(a.id);
    // C mirrors A's blueprint: same type mix, same difficulty per lesson, two items each.
    for (let k = 0; k < 2; k++) {
      const c = makeItem(moduleId, lesson, index++, typeA, difficulty);
      items.push(c);
      forms.C.push(c.id);
    }
    if (lesson <= 15) {
      for (let k = 0; k < 2; k++) {
        const type = k === 0 ? planA(lesson * 2 - 1) : planA(lesson * 2);
        const b = makeItem(moduleId, lesson, index++, type, ((lesson + k) % 3) + 1);
        items.push(b);
        forms.B.push(b.id);
      }
    }
    for (const [type, d] of poolPlan) {
      const p = makeItem(moduleId, lesson, index++, type, d);
      items.push(p);
      diagnosticPool.push(p.id);
    }
    items.push(makeItem(moduleId, lesson, index++, "mc", 2)); // spare
  }
  const bank = {
    schema: 1,
    moduleId,
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    version: "v1",
    lessons: Array.from({ length: 30 }, (_, i) => ({
      lesson: i + 1,
      title: `Synthetic lesson ${i + 1}`,
      sourceHash: sha256Hex(`synthetic lesson ${i + 1}`),
    })),
    items,
    forms,
    diagnosticPool,
    reviews: [],
  };
  return signReviews(bank, reviewers);
}

/** Replace the reviews with all-accept blind reviews signed against the bank's current hash. */
export function signReviews(bank, reviewers = ["reviewer-agent-1", "reviewer-agent-2"]) {
  const sha = bankSha256(bank);
  return {
    ...bank,
    reviews: reviewers.map((reviewer) => ({
      reviewer,
      independentOfAuthor: true,
      at: "2026-10-23T12:00:00.000Z",
      bankSha256: sha,
      verdicts: Object.fromEntries(bank.items.map((item) => [item.id, "accept"])),
      notes: {},
    })),
  };
}

export const clone = (value) => structuredClone(value);
