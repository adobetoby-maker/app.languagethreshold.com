import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

test("preparation uses authored translations and never reads English planning labels in another voice", async () => {
  const dir=mkdtempSync(resolve("node_modules/.cache/speaking-preparation-"));
  try {
    await build({stdin:{contents:"export {speakingPreparationPhrases} from './src/lib/speaking-preparation';export {getSpeakingMissions} from './src/data/speaking-missions';",resolveDir:process.cwd()},outfile:join(dir,"test.mjs"),bundle:true,format:"esm",platform:"node",logLevel:"silent"});
    const {speakingPreparationPhrases: phrases,getSpeakingMissions}=await import(join(dir,"test.mjs"));
    const lesson=getSpeakingMissions("Spanish").find(m=>m.moduleId==="roofing" && m.sourceObjectiveId);
    assert.ok(lesson);
    const translated=phrases({...lesson,vocabulary:["WRONG_ENGLISH_PLANNING_LABEL"]});
    assert.ok(translated.length>0);
    assert.ok(translated.every(p=>p.target && p.meaning && !p.target.includes("WRONG_")));
    const generic={...lesson,sourceObjectiveId:undefined,vocabulary:["shingle"],openingLine:"Buenos días. ¿Qué hacemos hoy?"};
    assert.deepEqual(phrases(generic),[{target:generic.openingLine,meaning:""}]);
    assert.deepEqual(phrases({...lesson,language:"Italian",openingLine:"Buongiorno."}),[{target:"Buongiorno.",meaning:""}]);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
