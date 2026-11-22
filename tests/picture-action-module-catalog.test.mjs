import { basePictureModule, sceneForModule } from "../src/lib/picture-action.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
const profiles = JSON.parse(readFileSync("content/picture-action/module-profiles.json"));
test("every current catalog module has one picture/action profile; stages reuse the base", async () => {
  const result = await build({
    stdin: {
      contents: 'export {MODULES} from "./src/data/modules.ts";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  const { MODULES } = await import(
    "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
  );
  // French and Italian modules (one per catalog module and stage) share their Spanish twin's profile.
  const catalogLanguage = (m) => ["French", "Italian"].includes(m.languages?.[0]) || /-(fr|it)$/.test(m.id);
  const base = MODULES.filter(
    (m) => !m.id.startsWith("foundation-") && !m.id.startsWith("master-") && !catalogLanguage(m),
  );
  assert.equal(base.length, 76);
  assert.equal(MODULES.filter((m) => !catalogLanguage(m)).length, 226);
  assert.equal(MODULES.filter(catalogLanguage).length, 2 * (2 * 34 + 14));
  const profileIds = new Set(profiles.modules.map((m) => m.id));
  for (const m of MODULES.filter(catalogLanguage))
    assert.ok(profileIds.has(basePictureModule(m.id)), `${m.id} has a picture profile`);
  assert.deepEqual(new Set(profiles.modules.map((m) => m.id)), new Set(base.map((m) => basePictureModule(m.id))));
  assert.equal(sceneForModule("foundation-or-cleaning"), "module-or-evs");
  for (const m of profiles.modules) {
    assert.equal(m.objects.length, 2);
    assert.ok(m.name && m.scene);
  }
});
