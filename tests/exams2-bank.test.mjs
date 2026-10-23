// Built by TAC — 2026-10-23
// Exams v2: bank validator (every rule, pass and fail), bank hash, fixed-form scoring and the
// public-item whitelist. Synthetic content only.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { bankContent, bankSha256, formItems, validateBank } from "../src/lib/exams2/bank.ts";
import { canonicalJson, seededShuffle, sha256Hex } from "../src/lib/exams2/hash.ts";
import {
  completedItemReview,
  matchRightOrder,
  publicItem,
  publicOptionId,
} from "../src/lib/exams2/public-item.ts";
import { scoreFixedForm, scoreItem } from "../src/lib/exams2/scoring.ts";
import {
  buildSyntheticBank,
  clone,
  POOL_PLAN_5,
  signReviews,
} from "./fixtures/exams2-synthetic-bank.mjs";

const BASE = buildSyntheticBank();
const fresh = () => clone(BASE);
const item = (bank, id) => bank.items.find((entry) => entry.id === id);
const firstOfType = (bank, ids, type) =>
  ids.map((id) => item(bank, id)).find((entry) => entry.type === type);
/** Validate after a mutation; reviews are re-signed so only the mutated rule can fail. */
function check(mutate, options = {}) {
  const bank = fresh();
  mutate(bank);
  return validateBank(signReviews(bank), options);
}
const codes = (result) => result.errors.map((issue) => issue.code);
function fails(result, rule, code) {
  assert.equal(result.ok, false, `expected ${code} to fail`);
  assert.ok(
    result.errors.some((issue) => issue.rule === rule && issue.code === code),
    `expected rule ${rule} ${code}, got ${JSON.stringify(codes(result))}`,
  );
}
const toTyped = (entry) => {
  delete entry.options;
  delete entry.correctOptionId;
  entry.type = "typed";
  entry.accepted = [`synconverted${entry.id.replace(/\W/g, "")}`];
};

test("the synthetic bank passes every rule, with counts only", () => {
  const result = validateBank(BASE);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.counts.forms, { A: 30, B: 30, C: 60 });
  assert.equal(result.counts.diagnosticPool, 180);
  assert.equal(result.counts.lessons, 30);
  assert.equal(result.counts.reviews, 2);
  assert.equal(validateBank(buildSyntheticBank({ poolPlan: POOL_PLAN_5 })).ok, true);
});

test("rule 1: structure, ids, lessons, enums, explanation and sourceRefs", () => {
  fails(validateBank(null), 1, "bank.not_object");
  fails(
    check((b) => (b.schema = 2)),
    1,
    "bank.schema",
  );
  fails(
    check((b) => (b.moduleId = "Roofing!")),
    1,
    "bank.module_id",
  );
  fails(
    check((b) => (b.version = "1")),
    1,
    "bank.version",
  );
  fails(
    check((b) => b.lessons.pop()),
    1,
    "bank.lessons_count",
  );
  fails(
    check((b) => (b.lessons[3].sourceHash = "nothex")),
    1,
    "lesson.invalid",
  );
  fails(
    check((b) => (b.items[0].id = "roofing.L1.i1")),
    1,
    "item.id_pattern",
  );
  fails(
    check((b) => (b.items[1].id = b.items[0].id)),
    1,
    "item.id_duplicate",
  );
  fails(
    check((b) => (b.items[0].lesson = 31)),
    1,
    "item.lesson",
  );
  fails(
    check((b) => (b.items[0].lesson = 2)),
    1,
    "item.id_lesson_mismatch",
  );
  fails(
    check((b) => (b.items[0].skill = "speak")),
    1,
    "item.skill",
  );
  fails(
    check((b) => (b.items[0].difficulty = 4)),
    1,
    "item.difficulty",
  );
  fails(
    check((b) => (b.items[0].type = "essay")),
    1,
    "item.type",
  );
  fails(
    check((b) => (b.items[0].rev = 0)),
    1,
    "item.rev",
  );
  fails(
    check((b) => (b.items[0].prompt = "x".repeat(301))),
    1,
    "item.prompt",
  );
  fails(
    check((b) => (b.items[0].context = "y".repeat(301))),
    1,
    "item.context",
  );
  fails(
    check((b) => (b.items[0].explanation = "too short")),
    1,
    "item.explanation",
  );
  fails(
    check((b) => (b.items[0].sourceRefs = [])),
    1,
    "item.source_refs",
  );
  fails(
    check((b) => (b.items[0].author = "")),
    1,
    "item.author",
  );
  fails(
    check((b) => (firstOfType(b, b.forms.A, "mc").accepted = ["x"])),
    1,
    "item.foreign_fields",
  );
  fails(
    check(
      (b) =>
        (firstOfType(b, b.forms.A, "typed").policy = {
          accents: "maybe",
          caseSensitive: false,
          punctuation: "ignore",
        }),
    ),
    1,
    "typed.policy",
  );
});

test("rule 2: multiple choice shape, rationales, all/none, and the longest-answer cue", () => {
  const mc = (b) => firstOfType(b, b.forms.A, "mc");
  fails(
    check((b) => mc(b).options.pop()),
    2,
    "mc.option_count",
  );
  fails(
    check((b) => (mc(b).options[1].text = mc(b).options[0].text.toUpperCase() + "!")),
    2,
    "mc.option_text_duplicate",
  );
  fails(
    check((b) => (mc(b).options[1].id = mc(b).options[0].id)),
    2,
    "mc.option_id_duplicate",
  );
  fails(
    check((b) => (mc(b).correctOptionId = "z")),
    2,
    "mc.correct_count",
  );
  fails(
    check((b) => delete mc(b).options[2].distractorRationale),
    2,
    "mc.distractor_rationale_missing",
  );
  fails(
    check((b) => (mc(b).options[3].text = "All of the above")),
    2,
    "mc.all_none_of_above",
  );
  fails(
    check((b) => (mc(b).options[3].text = "Ninguna de las anteriores")),
    2,
    "mc.all_none_of_above",
  );
  // Correct answer strictly longest in more than 40% of mc items.
  fails(
    check((b) => {
      for (const entry of b.items) if (entry.type === "mc") entry.options[0].text += " longer";
    }),
    2,
    "mc.correct_longest_share",
  );
  // ...but at or under 40% is allowed.
  const ok = check((b) => {
    const mcs = b.items.filter((entry) => entry.type === "mc");
    mcs
      .slice(0, Math.floor(mcs.length * 0.4))
      .forEach((entry) => (entry.options[0].text += " longer"));
  });
  assert.equal(ok.ok, true, JSON.stringify(codes(ok)));
});

test("rule 3: typed answers, normalized variants, prompt leaks and accent policy", () => {
  const typed = (b) => firstOfType(b, b.forms.A, "typed");
  fails(
    check((b) => (typed(b).accepted = [])),
    3,
    "typed.accepted_missing",
  );
  fails(
    check((b) => (typed(b).accepted = ["Año", "ano"])),
    3,
    "typed.accepted_duplicate",
  );
  fails(
    check((b) => (typed(b).prompt = `Type it: ${typed(b).accepted[0].toUpperCase()}.`)),
    3,
    "typed.answer_in_prompt",
  );
  fails(
    check((b) => (typed(b).context = `Crew: "${typed(b).accepted[1]}"`)),
    3,
    "typed.answer_in_prompt",
  );
  fails(
    check(
      (b) =>
        (typed(b).policy = { accents: "require", caseSensitive: false, punctuation: "ignore" }),
    ),
    3,
    "typed.require_without_accent",
  );
  // With accents required, "año" and "ano" are different accepted answers and both may be listed.
  const required = check((b) => {
    typed(b).accepted = ["año", "ano"];
    typed(b).policy = { accents: "require", caseSensitive: false, punctuation: "ignore" };
  });
  assert.equal(required.ok, true, JSON.stringify(codes(required)));
});

test("rule 4: match items have four pairs with unique sides", () => {
  const match = (b) => firstOfType(b, b.forms.A, "match");
  fails(
    check((b) => match(b).pairs.pop()),
    4,
    "match.pair_count",
  );
  fails(
    check((b) => (match(b).pairs[1].left = match(b).pairs[0].left)),
    4,
    "match.left_duplicate",
  );
  fails(
    check((b) => (match(b).pairs[2].right = ` ${match(b).pairs[0].right.toUpperCase()} `)),
    4,
    "match.right_duplicate",
  );
  fails(
    check((b) => (match(b).pairs[0].right = "")),
    4,
    "match.pair_shape",
  );
});

test("rule 5: blueprints, disjoint forms, A/C difficulty, type mix and cueing", () => {
  fails(
    check((b) => b.forms.A.pop()),
    5,
    "form.blueprint",
  );
  fails(
    check((b) => (b.forms.B[0] = b.forms.B[2])),
    5,
    "form.duplicate_id",
  );
  fails(
    check((b) => (b.forms.C[0] = "roofing.L01.i99")),
    5,
    "form.unknown_item",
  );
  fails(
    check((b) => (b.forms.A[0] = b.diagnosticPool[0])),
    5,
    "forms.overlap",
  );
  fails(
    check((b) => (b.forms.B[0] = b.forms.C[0])),
    5,
    "forms.overlap",
  );
  fails(
    check((b) => {
      for (const id of b.forms.C) item(b, id).difficulty = 3;
      for (const id of b.forms.A) item(b, id).difficulty = 1;
    }),
    5,
    "forms.ac_difficulty",
  );
  fails(
    check((b) => {
      b.forms.A.map((id) => item(b, id))
        .filter((e) => e.type === "mc")
        .slice(0, 5)
        .forEach(toTyped);
    }),
    5,
    "form.mix_typed",
  );
  fails(
    check((b) => {
      b.forms.A.map((id) => item(b, id))
        .filter((e) => e.type === "typed")
        .slice(0, 3)
        .forEach((e) => {
          delete e.accepted;
          e.type = "mc";
          e.options = ["a", "b", "c", "d"].map((o) => ({
            id: o,
            text: `${e.id}-${o}`,
            ...(o === "a" ? {} : { distractorRationale: "Synthetic." }),
          }));
          e.correctOptionId = "a";
        });
    }),
    5,
    "form.mix_typed",
  );
  fails(
    check((b) => {
      const answer = firstOfType(b, b.forms.A, "typed").accepted[0];
      const other = firstOfType(b, b.forms.A.slice(5), "mc");
      other.prompt = `Which word goes with ${answer}?`;
    }),
    5,
    "form.cueing",
  );
  // Cueing across different forms is allowed: forms are never shown together.
  const across = check((b) => {
    const answer = firstOfType(b, b.forms.A, "typed").accepted[0];
    firstOfType(b, b.forms.C, "mc").prompt = `Which word goes with ${answer}?`;
  });
  assert.equal(across.ok, true, JSON.stringify(codes(across)));
});

test("rule 6: diagnostic pool size, difficulty spread and typed coverage per lesson", () => {
  const poolIn = (b, lesson) =>
    b.diagnosticPool.map((id) => item(b, id)).filter((e) => e.lesson === lesson);
  fails(
    check((b) => {
      const drop = poolIn(b, 4)
        .slice(0, 2)
        .map((e) => e.id);
      b.diagnosticPool = b.diagnosticPool.filter((id) => !drop.includes(id));
    }),
    6,
    "pool.lesson_count",
  );
  fails(
    check((b) => poolIn(b, 7).forEach((e) => e.difficulty === 3 && (e.difficulty = 2))),
    6,
    "pool.difficulty_missing",
  );
  fails(
    check((b) =>
      poolIn(b, 9)
        .filter((e) => e.type === "typed")
        .forEach(toMc),
    ),
    6,
    "pool.typed_missing",
  );
  function toMc(e) {
    delete e.accepted;
    e.type = "mc";
    e.options = ["a", "b", "c", "d"].map((o) => ({
      id: o,
      text: `${e.id}-${o}`,
      ...(o === "a" ? {} : { distractorRationale: "Synthetic." }),
    }));
    e.correctOptionId = "a";
  }
  // Cueing inside the pool is only a warning.
  const warned = check((b) => {
    const pool = b.diagnosticPool.map((id) => item(b, id));
    const answer = pool.find((e) => e.type === "typed").accepted[0];
    pool.find((e) => e.type === "mc" && e.lesson === 20).prompt = `Pick the partner of ${answer}.`;
  });
  assert.equal(warned.ok, true);
  assert.ok(warned.warnings.some((w) => w.code === "form.cueing" && w.form === "diagnostic"));
});

test("rule 7: duplicate prompts across the bank (after normalizing)", () => {
  fails(
    check((b) => (b.items[5].prompt = ` ${b.items[0].prompt.toUpperCase()}!! `)),
    7,
    "item.prompt_duplicate",
  );
  // Same generic instruction on two match items with different pairs is fine.
  const ok = check((b) => {
    const matches = b.items.filter((e) => e.type === "match");
    matches[0].prompt = matches[1].prompt = "Match each term to its meaning.";
  });
  assert.equal(ok.ok, true, JSON.stringify(codes(ok)));
});

test("rule 8: two independent blind reviews of every item on the current hash", () => {
  const raw = (mutate) => {
    const bank = fresh();
    mutate(bank);
    return validateBank(bank);
  };
  fails(
    raw((b) => (b.reviews = [])),
    8,
    "reviews.too_few",
  );
  fails(
    raw((b) => delete b.reviews),
    8,
    "reviews.missing",
  );
  fails(
    raw((b) => (b.reviews[1].reviewer = b.reviews[0].reviewer)),
    8,
    "reviews.too_few",
  );
  fails(
    raw((b) => (b.items[0].explanation += " Edited after review.")),
    8,
    "review.stale_sha",
  );
  fails(
    raw((b) => (b.reviews[0].verdicts[b.items[3].id] = "reject")),
    8,
    "review.rejected",
  );
  fails(
    raw((b) => (b.reviews[1].verdicts[b.items[4].id] = "revise")),
    8,
    "review.revise_pending",
  );
  fails(
    raw((b) => (b.reviews[0].verdicts[b.items[4].id] = "maybe")),
    8,
    "review.verdict_invalid",
  );
  fails(
    raw((b) => delete b.reviews[0].verdicts[b.items[2].id]),
    8,
    "review.coverage",
  );
  fails(
    raw((b) => (b.reviews[0].verdicts["roofing.L01.i99"] = "accept")),
    8,
    "review.unknown_items",
  );
  fails(
    raw((b) => (b.reviews[0].independentOfAuthor = false)),
    8,
    "review.not_independent",
  );
  fails(
    raw((b) => (b.reviews[0].at = "yesterday")),
    8,
    "review.at",
  );
  fails(
    check((b) => (b.items[0].author = "reviewer-agent-1")),
    8,
    "review.reviewer_is_author",
  );
  // A revised item (new rev) re-reviewed on the new hash passes again.
  const revised = fresh();
  revised.items[4].rev = 2;
  revised.items[4].explanation = "Synthetic explanation, revised after review.";
  assert.equal(validateBank(revised).ok, false);
  assert.equal(validateBank(signReviews(revised)).ok, true);
  // Drafts can be validated before review.
  const draft = fresh();
  draft.reviews = [];
  assert.equal(validateBank(draft, { reviews: "skip" }).ok, true);
});

test("rule 9: lesson drift is a warning, never an error", () => {
  const current = Object.fromEntries(BASE.lessons.map((l) => [l.lesson, l.sourceHash]));
  assert.deepEqual(validateBank(BASE, { currentSourceHashes: current }).warnings, []);
  const changed = { ...current, 12: sha256Hex("changed lesson 12") };
  delete changed[30];
  const result = validateBank(BASE, { currentSourceHashes: changed });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.warnings.map((w) => [w.rule, w.code, w.lesson]),
    [
      [9, "drift.source_changed", 12],
      [9, "drift.lesson_missing", 30],
    ],
  );
});

test("rule 10: validator output carries ids and counts, never prompts or answers", () => {
  const bank = fresh();
  const secrets = [];
  for (const entry of bank.items.slice(0, 40)) {
    entry.prompt = `SECRET-PROMPT-${entry.id} ${"z".repeat(400)}`;
    entry.explanation = "SECRET-EXPLANATION";
    if (entry.options) entry.options.forEach((o) => (o.text = "SECRET-OPTION"));
    if (entry.accepted) entry.accepted = ["SECRET-ANSWER", "secret answer"];
    if (entry.pairs) entry.pairs.forEach((p) => (p.left = "SECRET-PAIR"));
    secrets.push("SECRET");
  }
  bank.items[41].id = "SECRET-BAD-ID with spaces";
  const output = JSON.stringify(validateBank(bank));
  assert.equal(validateBank(bank).ok, false);
  assert.ok(!/SECRET/i.test(output), "validator output leaked content");
});

test("sha256Hex matches node:crypto, canonical JSON is key-order independent", () => {
  const samples = [
    "",
    "a",
    "año ñ 🙂",
    "x".repeat(55),
    "y".repeat(56),
    "z".repeat(64),
    "w".repeat(1000),
  ];
  for (const sample of samples)
    assert.equal(sha256Hex(sample), createHash("sha256").update(sample, "utf8").digest("hex"));
  assert.equal(canonicalJson({ b: 1, a: [1, { d: 2, c: undefined }] }), '{"a":[1,{"d":2}],"b":1}');
  assert.throws(() => canonicalJson({ a: Infinity }));
  const reordered = Object.fromEntries(Object.entries(BASE).reverse());
  assert.equal(bankSha256(reordered), bankSha256(BASE));
  // Reviews are not part of the signed content.
  assert.equal(bankSha256({ ...BASE, reviews: [] }), bankSha256(BASE));
  assert.equal(bankSha256(BASE), sha256Hex(canonicalJson(bankContent(BASE))));
  assert.equal("reviews" in bankContent(BASE), false);
  assert.deepEqual(seededShuffle([1, 2, 3, 4, 5], "s"), seededShuffle([1, 2, 3, 4, 5], "s"));
});

test("scoreItem: opaque mc ids, typed normalization, partial match credit, don't know", () => {
  const seed = "session-seed-1";
  const mc = firstOfType(BASE, BASE.forms.A, "mc");
  const pub = publicItem(mc, { seed });
  const right = publicOptionId(seed, mc.id, mc.correctOptionId);
  assert.ok(pub.options.some((o) => o.id === right));
  assert.equal(scoreItem(mc, { type: "mc", optionId: right }, seed).points, 1);
  assert.equal(
    scoreItem(mc, { type: "mc", optionId: mc.correctOptionId }, seed).points,
    0,
    "authored id is not accepted",
  );
  assert.equal(scoreItem(mc, { type: "mc", optionId: right }, "other-seed").points, 0);
  const wrong = pub.options.find((o) => o.id !== right).id;
  assert.equal(scoreItem(mc, { type: "mc", optionId: wrong }, seed).points, 0);

  const typed = {
    ...firstOfType(BASE, BASE.forms.A, "typed"),
    accepted: ["Año nuevo", "nuevo año"],
  };
  assert.equal(scoreItem(typed, { type: "typed", text: "  ano   NUEVO!! " }, seed).points, 1);
  assert.equal(scoreItem(typed, { type: "typed", text: "nuevo ano" }, seed).points, 1);
  assert.equal(scoreItem(typed, { type: "typed", text: "año" }, seed).points, 0);
  assert.equal(scoreItem(typed, { type: "typed", text: "" }, seed).points, 0);
  const strict = {
    ...typed,
    policy: { accents: "require", caseSensitive: false, punctuation: "ignore" },
  };
  assert.equal(scoreItem(strict, { type: "typed", text: "año nuevo" }, seed).points, 1);
  assert.equal(scoreItem(strict, { type: "typed", text: "ano nuevo" }, seed).points, 0);

  const match = firstOfType(BASE, BASE.forms.A, "match");
  const all = Object.fromEntries(match.pairs.map((p) => [p.left, p.right]));
  assert.equal(scoreItem(match, { type: "match", matches: all }, seed).points, 1);
  const two = {
    ...all,
    [match.pairs[0].left]: match.pairs[1].right,
    [match.pairs[1].left]: match.pairs[0].right,
  };
  assert.equal(scoreItem(match, { type: "match", matches: two }, seed).points, 0.5);
  const reused = Object.fromEntries(match.pairs.map((p) => [p.left, match.pairs[0].right]));
  assert.equal(scoreItem(match, { type: "match", matches: reused }, seed).points, 0.25);
  assert.equal(
    scoreItem(
      match,
      { type: "match", matches: { [match.pairs[2].left]: match.pairs[2].right } },
      seed,
    ).points,
    0.25,
  );

  assert.deepEqual(scoreItem(mc, { type: "dont_know" }, seed), {
    points: 0,
    max: 1,
    dontKnow: true,
  });
  assert.equal(
    scoreItem(mc, { type: "typed", text: "x" }, seed).points,
    0,
    "type mismatch scores 0",
  );
  assert.equal(scoreItem(mc, null, seed).points, 0);
});

/** Answers for a fixed form: correct for the first `n` items, "don't know" for the rest. */
function answersFor(bank, kind, seed, correctCount, partialMatch = false) {
  return formItems(bank, kind).map((entry, index) => {
    if (index >= correctCount) return { itemId: entry.id, answer: { type: "dont_know" } };
    if (entry.type === "mc")
      return {
        itemId: entry.id,
        answer: { type: "mc", optionId: publicOptionId(seed, entry.id, entry.correctOptionId) },
      };
    if (entry.type === "typed")
      return { itemId: entry.id, answer: { type: "typed", text: entry.accepted[0] } };
    const pairs = partialMatch ? entry.pairs.slice(0, 3) : entry.pairs;
    return {
      itemId: entry.id,
      answer: { type: "match", matches: Object.fromEntries(pairs.map((p) => [p.left, p.right])) },
    };
  });
}

test("scoreFixedForm: totals, per-lesson table, links, C pass and B on-track boundaries", () => {
  const seed = "fixed-seed";
  const link = { target: "Spanish", native: "English" };
  const perfect = scoreFixedForm(BASE, "C", answersFor(BASE, "C", seed, 60), seed, link);
  assert.equal(perfect.score, 60);
  assert.equal(perfect.total, 60);
  assert.equal(perfect.pct, 100);
  assert.equal(perfect.passed, true);
  assert.deepEqual(perfect.missedLessons, []);
  assert.equal(perfect.lessons.length, 30);
  assert.equal(
    perfect.lessons[6].href,
    "/?module=roofing&tab=core30&target=Spanish&native=English&lesson=7&way=recall",
  );

  const exactly80 = scoreFixedForm(BASE, "C", answersFor(BASE, "C", seed, 48), seed, link);
  assert.equal(exactly80.score, 48);
  assert.equal(exactly80.pct, 80);
  assert.equal(exactly80.passed, true);
  assert.deepEqual(exactly80.missedLessons, [25, 26, 27, 28, 29, 30]);
  const below = scoreFixedForm(BASE, "C", answersFor(BASE, "C", seed, 47), seed, link);
  assert.equal(below.passed, false);

  // A match item answered 3/4 earns 0.75.
  const partial = scoreFixedForm(BASE, "A", answersFor(BASE, "A", seed, 30, true), seed, link);
  const matchCount = formItems(BASE, "A").filter((e) => e.type === "match").length;
  assert.equal(partial.score, 30 - matchCount * 0.25);
  assert.equal(partial.passed, undefined);
  assert.equal(partial.onTrack, undefined);

  assert.equal(
    scoreFixedForm(BASE, "B", answersFor(BASE, "B", seed, 21), seed, link).onTrack,
    true,
  );
  assert.equal(
    scoreFixedForm(BASE, "B", answersFor(BASE, "B", seed, 20), seed, link).onTrack,
    false,
  );
  const empty = scoreFixedForm(BASE, "B", [], seed, link);
  assert.equal(empty.score, 0);
  assert.equal(empty.lessons.length, 15);

  assert.throws(() =>
    scoreFixedForm(BASE, "A", [{ itemId: BASE.forms.C[0], answer: null }], seed, link),
  );
  assert.throws(() =>
    scoreFixedForm(
      BASE,
      "A",
      [
        { itemId: BASE.forms.A[0], answer: null },
        { itemId: BASE.forms.A[0], answer: null },
      ],
      seed,
      link,
    ),
  );
});

const FORBIDDEN_KEYS = [
  "correctOptionId",
  "accepted",
  "distractorRationale",
  "explanation",
  "sourceRefs",
  "author",
  "difficulty",
  "pairs",
  "policy",
  "rev",
  "skill",
];
function allKeys(value, keys = new Set()) {
  if (Array.isArray(value)) value.forEach((entry) => allKeys(entry, keys));
  else if (value && typeof value === "object")
    for (const [key, entry] of Object.entries(value)) {
      keys.add(key);
      allKeys(entry, keys);
    }
  return keys;
}

test("publicItem: whitelist only, no answer material before completion", () => {
  const seed = "public-seed";
  for (const entry of BASE.items) {
    const pub = publicItem(entry, { seed });
    const keys = allKeys(pub);
    for (const key of FORBIDDEN_KEYS) assert.ok(!keys.has(key), `${key} leaked for ${entry.id}`);
    const text = JSON.stringify(pub);
    assert.ok(!text.includes(entry.explanation));
    for (const answer of entry.accepted ?? [])
      assert.ok(!text.includes(answer), "typed answer leaked");
    for (const option of entry.options ?? []) {
      if (option.distractorRationale) assert.ok(!text.includes(option.distractorRationale));
      assert.ok(!pub.options.some((o) => o.id === option.id), "authored option id leaked");
    }
    if (entry.type === "match") {
      assert.deepEqual(
        pub.left,
        entry.pairs.map((p) => p.left),
      );
      assert.deepEqual([...pub.right].sort(), entry.pairs.map((p) => p.right).sort());
      assert.notDeepEqual(
        pub.right,
        entry.pairs.map((p) => p.right),
        "right column must not be in answer order",
      );
    }
  }
  const mc = firstOfType(BASE, BASE.forms.A, "mc");
  assert.deepEqual(publicItem(mc, { seed }), publicItem(mc, { seed }), "deterministic per seed");
  assert.notDeepEqual(
    publicItem(mc, { seed }).options.map((o) => o.id),
    publicItem(mc, { seed: "another" }).options.map((o) => o.id),
  );
  const unshuffled = publicItem(mc, { seed, shuffleOptions: false });
  assert.deepEqual(
    unshuffled.options.map((o) => o.text),
    mc.options.map((o) => o.text),
  );
  const strict = {
    ...firstOfType(BASE, BASE.forms.A, "typed"),
    policy: { accents: "require", caseSensitive: false, punctuation: "ignore" },
  };
  assert.equal(publicItem(strict, { seed }).accentsRequired, true);
  assert.equal(matchRightOrder(firstOfType(BASE, BASE.forms.A, "match"), seed).length, 4);
});

test("completedItemReview: answers and explanations for A, B and diagnostic; never for C", () => {
  const seed = "review-seed";
  const mc = firstOfType(BASE, BASE.forms.A, "mc");
  assert.equal(completedItemReview(mc, "C", { seed }), null);
  const review = completedItemReview(mc, "A", { seed });
  assert.equal(review.correctOptionId, publicOptionId(seed, mc.id, mc.correctOptionId));
  assert.equal(review.explanation, mc.explanation);
  assert.ok(!allKeys(review).has("distractorRationale"));
  const typed = firstOfType(BASE, BASE.diagnosticPool, "typed");
  assert.equal(completedItemReview(typed, "diagnostic", { seed }).answer, typed.accepted[0]);
  const match = firstOfType(BASE, BASE.forms.B, "match");
  assert.deepEqual(completedItemReview(match, "B", { seed }).pairs, match.pairs);
});
