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
  const base = MODULES.filter(
    (m) => !m.id.startsWith("foundation-") && !m.id.startsWith("master-"),
  );
  assert.equal(base.length, 73);
  assert.equal(MODULES.length, 217);
  assert.deepEqual(new Set(profiles.modules.map((m) => m.id)), new Set(base.map((m) => m.id)));
  for (const m of profiles.modules) {
    assert.equal(m.objects.length, 2);
    assert.ok(m.name && m.scene);
  }
});
