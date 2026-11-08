import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  PICTURE_SCENES,
  SHARED_PICTURE_SCENES,
  PICTURE_MODULES,
  pictureScenesForModule,
  PICTURE_OBJECTS,
  pictureScene,
  sceneForModule,
  supportsPicturePair,
  acceptsPictureTarget,
  cleaningDistance,
  CLEANING_DISTANCE,
  canFinishAction,
  picturePreferences,
} from "../src/lib/picture-action.ts";
test("shared scenes and module sets have authored object/action language, valid targets, and distinct starting points", () => {
  assert.equal(SHARED_PICTURE_SCENES.length, 8);
  assert.equal(PICTURE_MODULES.length, 73);
  assert.equal(PICTURE_SCENES.length, 81);
  let n = 0;
  for (const s of PICTURE_SCENES) {
    assert.ok(statSync(`public${s.image}-hq.webp`).size > 0);
    assert.ok(statSync(`public${s.image}-mobile.webp`).size > 0);
    for (const c of s.challenges) {
      n++;
      const target = s.targets.find((t) => t.id === c.target);
      assert.ok(target, c.id);
      assert.ok(PICTURE_OBJECTS[c.object], c.id);
      assert.ok(c.es && c.en);
      assert.ok(acceptsPictureTarget(s, c.target, target.point), c.id);
      assert.equal(acceptsPictureTarget(s, c.target, c.start), false, c.id);
      assert.equal(
        canFinishAction(s, c, target.point, true, true, 1),
        false,
        "demonstration cannot pass",
      );
      assert.ok(canFinishAction(s, c, target.point, true, false, 1));
      if (c.pickup) assert.equal(canFinishAction(s, c, target.point, false, false, 1), false);
      for (const p of [
        { x: NaN, y: 0.5 },
        { x: 0.5, y: Infinity },
        { x: 1.1, y: 0.5 },
      ])
        assert.equal(acceptsPictureTarget(s, c.target, p), false);
    }
  }
  assert.equal(n, 492);
});
test("cleaning requires repeated movement within the region, not placing a brush or a jump from outside", () => {
  const s = pictureScene("bedroom"),
    c = s.challenges[0],
    p = s.targets[0].point;
  assert.equal(canFinishAction(s, c, p, true, false, 0), false);
  assert.equal(cleaningDistance(s, c.target, c.start, p), 0);
  assert.equal(cleaningDistance(s, c.target, p, p), 0);
  const d = cleaningDistance(s, c.target, p, { x: p.x + 0.02, y: p.y });
  assert.ok(d > 0);
  assert.equal(canFinishAction(s, c, p, true, false, CLEANING_DISTANCE), true);
});
test("module defaults are thematic and authored pairs never leak into unrelated languages", () => {
  for (const [id, scene] of [
    ["nursing", "module-nursing"],
    ["or-evs", "module-or-evs"],
    ["construction-logistics", "truck"],
    ["housekeeping", "bedroom"],
    ["roofing", "module-roofing"],
    ["spanish-basics", "module-spanish-basics"],
  ])
    assert.equal(sceneForModule(id), scene);
  assert.ok(supportsPicturePair("Spanish", "English"));
  assert.ok(supportsPicturePair("English", "Spanish"));
  assert.equal(supportsPicturePair("Japanese", "English"), false);
  assert.equal(supportsPicturePair("Spanish", "French"), false);
});
test("preference parsing bounds voice speed and scene identities and rejects arbitrary object properties", () => {
  assert.deepEqual(picturePreferences({ mode: "bad", rate: 99, scenes: { nursing: "bad" } }), {
    mode: "voice-text",
    rate: 0.85,
    scenes: {},
  });
  assert.deepEqual(
    picturePreferences({ mode: "voice", rate: 0.65, scenes: { nursing: "clinic" } }),
    { mode: "voice", rate: 0.65, scenes: { nursing: "clinic" } },
  );
  assert.equal(
    Object.hasOwn(
      picturePreferences(JSON.parse('{"scenes":{"__proto__":"clinic"}}')).scenes,
      "__proto__",
    ),
    false,
  );
});
test("native asset pack is bounded, all shared scenes and module sets have 960px app assets and hashes", () => {
  const m = JSON.parse(readFileSync("public/images/picture-action/app/manifest.json"));
  assert.equal(m.scenes.length, 11);
  for (const s of m.scenes) {
    assert.equal(s.appPixels, 960);
    assert.equal(s.sha256.length, 64);
    assert.ok(statSync("public/images/picture-action/app/" + s.app).size < 450000);
  }
  assert.ok(statSync("public/downloads/picture-action-app-assets.zip").size < 4000000);
});

test("each module and its stages get their own objects and all shared variety scenes", () => {
  for (const m of PICTURE_MODULES) {
    const own = pictureScene(`module-${m.id}`);
    assert.equal(own.challenges.length, 6);
    assert.deepEqual(new Set(own.challenges.map((c) => c.object)), new Set(m.objects));
    for (const id of [m.id, `foundation-${m.id}`, `master-${m.id}`]) {
      const choices = pictureScenesForModule(id);
      assert.equal(choices.length, 9);
      assert.equal(choices[0].id, own.id);
      assert.ok(choices.some((s) => s.id === "truck"));
      assert.ok(choices.some((s) => s.id === "bedroom"));
    }
  }
});
