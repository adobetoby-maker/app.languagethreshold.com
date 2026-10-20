// Built by TAC — 2026-10-20
// The shipped Core 60 pilot stages (electrician, nursing) really load and really expose their Say
// it missions. Both stages are Opus-generated (the Sonnet pilot Masters were archived and
// replaced). The counts are hard-coded on purpose: the catalog-wide tests compute their
// expectations from CORE60_MANIFEST and getCurriculum, so a stage that silently failed to load
// (0 lessons) would move both sides of those assertions together and hide behind them.
import assert from "node:assert/strict";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getModule } from "../src/data/modules.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";

const PILOT = ["electrician", "nursing"];
const LESSONS = { foundation: 10, master: 20 };
const CHALLENGES = { foundation: [4, 5], master: [4, 6] };

for (const base of PILOT) {
  for (const stage of ["foundation", "master"]) {
    const id = `${stage}-${base}`;
    test(`${id}: loads ${LESSONS[stage]} lessons and exposes one Say it mission per lesson plus its own challenges`, () => {
      const entry = CORE60_MANIFEST.find((e) => e.base === base);
      assert.ok(entry?.[stage], `${id} is listed in the manifest`);
      const curriculum = getCurriculum(id);
      assert.ok(curriculum, `${id} curriculum loads`);
      assert.equal(curriculum.lessons.length, LESSONS[stage]);

      // The stage's own challenges (manifest override), not the Core 30's six repeated (D1).
      const own = entry[stage].challengePrompts;
      assert.ok(Array.isArray(own), `${id} has its own challengePrompts in the manifest`);
      const [min, max] = CHALLENGES[stage];
      assert.ok(own.length >= min && own.length <= max, `${id}: ${own.length} challenges`);
      const baseChallenges = new Set(getModule(base).challengePrompts);
      assert.ok(own.every((prompt) => !baseChallenges.has(prompt)), `${id} does not copy the Core 30 challenges`);
      const module = getModule(id);
      assert.deepEqual(module.challengePrompts, own);
      assert.equal(module.blurb, entry[stage].blurb);
      assert.equal(module.userRole, entry[stage].userRole);
      assert.notEqual(module.userRole, getModule(base).userRole);

      const missions = getSpeakingMissions("Spanish").filter((mission) => mission.moduleId === id);
      const lessonMissions = missions.filter((mission) => !mission.id.includes("_challenge_"));
      const challengeMissions = missions.filter((mission) => mission.id.includes("_challenge_"));
      assert.equal(lessonMissions.length, LESSONS[stage], `${id}: lesson missions`);
      assert.equal(challengeMissions.length, own.length, `${id}: challenge missions`);
      assert.equal(missions.length, LESSONS[stage] + own.length);
      for (const lesson of curriculum.lessons) {
        assert.ok(
          lessonMissions.some((mission) => mission.title === `Lesson ${lesson.n}: ${lesson.title}`),
          `${id}: a mission for lesson ${lesson.n}`,
        );
      }
    });
  }
}
