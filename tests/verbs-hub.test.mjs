import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DAILY_VERBS,
  SPEAKING_PATTERNS,
  SPEAKING_VERBS,
  speakingAnswer,
  speakingNativeExample,
} from "../src/lib/verb-speaking-practice.ts";
import { lessonGameBank, gameAnswer } from "../src/lib/lesson-verb-games.ts";
import { readVerbHabit, verbReminderDue } from "../src/lib/verb-habit.ts";
import { appNavigationLocation, appTab } from "../src/lib/app-navigation.ts";
import { needsGameProviders } from "../src/lib/game-provider-activation.ts";
test("new Verbs tab is refreshable, keeps its games and drops its subview when leaving", () => {
  assert.equal(appTab("verbs"), "verbs");
  assert.equal(needsGameProviders("verbs"), true);
  const ctx = {
    ready: true,
    moduleId: "soccer",
    target: "Spanish",
    native: "English",
    tab: "verbs",
  };
  const u = appNavigationLocation(
    "/?module=soccer&target=Spanish&native=English&tab=verbs&verbArea=games&verbs=unit&vfamily=go-yo",
    ctx,
  );
  assert.match(u, /vfamily=go-yo/);
  const left = appNavigationLocation(u, { ...ctx, tab: "reader" });
  assert.ok(!left.includes("verbArea"));
  assert.ok(!left.includes("vfamily"));
});
test("ten common verbs supply five present forms and optional subjects keep the correct person", () => {
  const bank = lessonGameBank(DAILY_VERBS, "Spanish");
  assert.equal(bank.meanings.length, 10);
  assert.equal(bank.forms.length, 50);
  assert.equal(gameAnswer("soy", "yo soy", ["yo"]), true);
  assert.equal(gameAnswer("soy", "tú soy", ["yo"]), false);
  assert.equal(gameAnswer("estás", "tu estas", ["tú"]), false);
  assert.equal(gameAnswer("am", "I am", ["I"]), true);
  assert.equal(gameAnswer("soy", "yo soy"), false);
});
test("twelve local speaking frames practice ten verbs including irregular gerunds and participles", () => {
  assert.equal(SPEAKING_PATTERNS.length, 12);
  assert.equal(SPEAKING_VERBS.length, 10);
  for (const p of SPEAKING_PATTERNS)
    for (const v of SPEAKING_VERBS) {
      assert.ok(v[p.form] && v.tail);
      assert.ok(speakingNativeExample(p, v).length > 8);
    }
  assert.equal(SPEAKING_VERBS.find((v) => v.infinitive === "ir").gerund, "yendo");
  assert.equal(SPEAKING_VERBS.find((v) => v.infinitive === "hacer").participle, "hecho");
  assert.equal(speakingAnswer("leído", "leido"), false);
});
test("28 workshop families are exact copies of existing authored course material", () => {
  const derived = JSON.parse(readFileSync("src/data/verbs-practice-patterns.json"));
  const source = JSON.parse(readFileSync("src/data/spanish-next-practice.json"));
  const originals = new Map();
  for (const prefix of ["foundation-", "", "master-"])
    for (const l of Object.values(source[prefix + "spanish-conjugation-patterns"]))
      if (l.pattern && !originals.has(l.pattern.id)) originals.set(l.pattern.id, l.pattern);
  assert.equal(derived.patterns.length, 28);
  for (const p of derived.patterns) {
    assert.deepEqual(p, originals.get(p.id));
    assert.equal(p.verbs.length, 10);
  }
});
test("habit data resets per local day, bounds malformed data and suppresses the exit reminder at ten minutes", () => {
  const d = readVerbHabit(
    JSON.stringify({
      day: "2026-11-08",
      seconds: 599,
      answers: 2,
      missed: ["estar-gerund", "estar-gerund", "<script>"],
      pending: true,
    }),
    "2026-11-08",
  );
  assert.equal(verbReminderDue(true, d), true);
  assert.deepEqual(d.missed, ["estar-gerund"]);
  assert.equal(verbReminderDue(false, d), false);
  assert.equal(verbReminderDue(true, { ...d, seconds: 600 }), false);
  assert.equal(verbReminderDue(true, { ...d, dismissed: true }), false);
  const next = readVerbHabit(JSON.stringify(d), "2026-11-09");
  assert.equal(next.seconds, 0);
  assert.equal(next.pending, true);
  assert.equal(readVerbHabit("bad").seconds, 0);
});
