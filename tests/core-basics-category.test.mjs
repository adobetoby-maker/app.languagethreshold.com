import test from "node:test";
import assert from "node:assert/strict";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { moduleLearningPaths } from "../src/lib/module-order.ts";
import { moduleMatchesSearch } from "../src/lib/module-search.ts";
const ids = [
  "place-directions",
  "sound-like-a-native",
  "spanish-cognates",
  "spanish-basics",
  "spanish-102",
  "spanish-frequent-verbs",
  "spanish-conjugation-patterns",
  "spanish-usage-verbs",
  "spanish-common-patterns",
];
test("Core Basics groups nine courses and retains exact authored language/stage ownership", () => {
  const available = MODULES.filter((m) => moduleSupportsLearningPair(m, "Spanish", "English"));
  const courses = moduleLearningPaths(available, MODULES).filter(
    (p) => p.module.category === "Core Basics",
  );
  assert.deepEqual(courses.map((p) => p.module.id).sort(), [...ids].sort());
  for (const p of courses) {
    assert.equal(p.stages.length, 3);
    for (const s of p.stages) {
      assert.equal(s.module.category, "Core Basics");
      assert.equal(moduleSupportsLearningPair(s.module, "Spanish", "French"), false);
    }
  }
});
test("course search finds common learner terms and keeps unrelated matches out", () => {
  for (const [id, query] of [
    ["spanish-basics", "101"],
    ["spanish-102", "102"],
    ["spanish-frequent-verbs", "high-frequency verbs"],
    ["spanish-usage-verbs", "high use verbs"],
    ["spanish-common-patterns", "high use grammar"],
    ["spanish-conjugation-patterns", "conjugation verbs"],
  ]) {
    const m = MODULES.find((m) => m.id === id);
    assert.ok(moduleMatchesSearch(m, query));
    assert.ok(moduleMatchesSearch(m, "core basics"));
    assert.ok(!moduleMatchesSearch(m, "airports luggage"));
  }
});
