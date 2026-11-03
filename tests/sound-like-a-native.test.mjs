import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getLessonDefinition, modulePracticeVersion } from "../src/lib/lesson-definition.ts";
import { validateLessonContent, contentLimitsFor } from "../src/lib/lesson-content-core.ts";
import { SOUND_FAMILIES, soundLesson } from "../src/data/sound-like-a-native.ts";
import {
  buildSoundPattern,
  readSoundPracticeRecord,
  selfTimedRate,
  soundSpellingMatches,
} from "../src/lib/sound-practice-core.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { getLessons } from "../src/data/module-starters.ts";
import { SOUND_READER_SEEDS } from "../src/data/sound-like-a-native-readers.ts";
import { authoredModuleDeck } from "../src/lib/authored-module-deck.ts";
import { offlineLessonPackId } from "../src/lib/offline-lesson-tracks.ts";
import { publicLessonOfflinePack } from "../src/lib/lesson-offline-pack.ts";
const stages = [
  ["foundation-sound-like-a-native", 10],
  ["sound-like-a-native", 30],
  ["master-sound-like-a-native", 20],
];
const definition = (id, n, target = "Spanish", native = "English") =>
  getLessonDefinition({
    moduleId: id,
    lessonNumber: n,
    targetLanguage: target,
    instructionLanguage: native,
    contentVersion: modulePracticeVersion(id, target, native),
  });
test("all 60 sound lessons have authored content, coaching, six modes, and lesson-linked speaking", () => {
  const openings = new Set(),
    missions = getSpeakingMissions("Spanish");
  for (const [id, count] of stages) {
    const content = JSON.parse(readFileSync(`public/lesson-content/es/${id}.json`));
    assert.equal(getCurriculum(id).lessons.length, count);
    for (let n = 1; n <= count; n++) {
      const d = definition(id, n),
        p = soundLesson(id, n);
      assert.equal(d.modes.length, 6);
      assert.ok(d.teaching);
      assert.equal(d.readiness, "draft");
      assert.ok(d.soundPractice);
      assert.equal(d.words.filter((w) => w.kind === "term").length, 6);
      assert.equal(d.words.filter((w) => w.kind === "phrase").length, 4);
      assert.deepEqual(
        validateLessonContent(content.lessons[n], {
          language: "Spanish",
          nativeLanguage: "English",
          parts: { words: true, passage: true, verbs: true },
          limits: contentLimitsFor(id),
        }),
        [],
        `${id} ${n}`,
      );
      assert.ok(SOUND_FAMILIES.some((f) => f.id === p.familyId));
      assert.ok(p.coachingFocus.length > 50);
      assert.deepEqual(
        d.reading.sentences.map((s) => s.target),
        p.reading.target,
      );
      const m = missions.find((m) => m.sourceObjectiveId === `${id}.lesson.${n}`);
      assert.ok(m);
      assert.equal(m.openingLine, p.openingLine);
      assert.equal(m.partnerRole, p.partnerRole);
      assert.ok(m.lessonTeaching);
      assert.equal(m.vocabulary[0], d.words[0].es);
      assert.equal(
        m.level,
        id.startsWith("foundation-") ? "A1" : id.startsWith("master-") ? "B1" : "A2",
      );
      assert.equal(!!m.surpriseComplication, id.startsWith("master-"));
      openings.add(m.openingLine);
    }
  }
  assert.equal(openings.size, 60);
  assert.equal(definition(stages[0][0], 10).teaching.stage, "supported");
  assert.equal(definition(stages[2][0], 1).teaching.speaking.wordBank, "on-request");
});
test("the new course never advertises or borrows an unsupported language pair", () => {
  for (const [id] of stages) {
    const m = getModule(id);
    assert.equal(moduleSupportsLearningPair(m, "Spanish", "English"), true);
    for (const [target, native] of [
      ["English", "Spanish"],
      ["Spanish", "French"],
      ["Japanese", "English"],
    ]) {
      assert.equal(moduleSupportsLearningPair(m, target, native), false);
      const d = definition(id, 1, target, native);
      assert.deepEqual(d.words, []);
      assert.equal(d.reading, null);
      assert.equal(d.teaching, null);
      assert.equal(d.soundPractice, undefined);
      assert.equal(soundLesson(id, 1, target, native), null);
      assert.equal(authoredModuleDeck(id, target, native), null);
      assert.equal(offlineLessonPackId(id, target, native), null);
    }
  }
});
test("every stage has matching Reader passages, an authored deck, and sound coaching in the text download", () => {
  assert.equal(SOUND_READER_SEEDS.length, 60);
  for (const [id, count] of stages) {
    const ids = getLessons(id, "Spanish");
    assert.equal(ids.length, count);
    assert.deepEqual(getLessons(id, "English"), []);
    const deck = authoredModuleDeck(id, "Spanish", "English");
    assert.ok(deck);
    assert.equal(deck.lessonCount, count);
    const pack = publicLessonOfflinePack(offlineLessonPackId(id, "Spanish", "English"));
    assert.equal(pack.lessons.length, count);
    assert.equal(pack.audioFilesIncluded, false);
    for (let n = 1; n <= count; n++) {
      const reader = SOUND_READER_SEEDS.find((r) => r.id === ids[n - 1]);
      assert.ok(reader);
      assert.deepEqual(
        reader.sentences.map((s) => s.target),
        definition(id, n).reading.sentences.map((s) => s.target),
      );
      assert.equal(pack.lessons[n - 1].soundPractice.familyId, soundLesson(id, n).familyId);
    }
  }
});
test("patter uses consonant-linked units with sound cues separate from Spanish spelling", () => {
  assert.equal(SOUND_FAMILIES.length, 17);
  assert.ok(SOUND_FAMILIES.every((f) => f.id !== "vowels"));
  const k = SOUND_FAMILIES.find((f) => f.id === "k");
  assert.deepEqual(
    buildSoundPattern(k, "patter").map((u) => u.cue),
    ["ka", "ki", "ku", "ke", "ko"],
  );
  assert.deepEqual(
    buildSoundPattern(k, "patter").map((u) => u.text),
    ["ca", "qui", "cu", "que", "co"],
  );
  assert.deepEqual(
    buildSoundPattern(k, "example").map((u) => u.cue),
    ["ka", "ki", "ki", "ke", "ko"],
  );
  const shuffled = buildSoundPattern(k, "shuffle", () => 0.2);
  assert.equal(new Set(shuffled.map((u) => u.text)).size, 5);
  assert.match(
    SOUND_FAMILIES.find((f) => f.id === "tap").coaching.selfCheck,
    /word beginning with r/,
  );
});
test("timing and stored self-checks cannot become a pronunciation score", () => {
  assert.equal(selfTimedRate(15, 10000), 90);
  assert.equal(selfTimedRate(15, 100), null);
  assert.equal(selfTimedRate(0, 10000), null);
  assert.equal(selfTimedRate(15, NaN), null);
  assert.deepEqual(readSoundPracticeRecord({ completedRuns: 1, selfCheckedRuns: 2, best: {} }), {
    completedRuns: 0,
    selfCheckedRuns: 0,
    best: {},
  });
  const r = readSoundPracticeRecord({
    completedRuns: 2,
    selfCheckedRuns: 1,
    best: { ok: 90, bad: Infinity },
  });
  assert.deepEqual(r.best, { ok: 90 });
});
test("accent-mark contrasts remain distinct word cards in the stress lesson", () => {
  const d = definition("sound-like-a-native", 24);
  assert.ok(d.words.some((w) => w.es === "público"));
  assert.ok(d.words.some((w) => w.es === "publico"));
  assert.ok(d.words.some((w) => w.es === "publicó"));
});

test("written stress contrasts require the intended accent marks", () => {
  assert.equal(soundSpellingMatches("publico", "público"), false);
  assert.equal(soundSpellingMatches("publicó", "publico"), false);
  assert.equal(soundSpellingMatches("PÚBLICO.", "público"), true);
  assert.equal(soundSpellingMatches("nino", "niño"), false);
});

test("new lesson verb cards do not alter the separately signed global verb-game pool", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const input = await readCompileInput(process.cwd());
  assert.equal(
    input.lessonFiles.some((f) => f.module.includes("sound-like-a-native")),
    false,
  );
  const own = JSON.parse(readFileSync("public/lesson-content/es/sound-like-a-native.json"));
  assert.equal(own.lessons["1"].verbs.length, 3);
});
