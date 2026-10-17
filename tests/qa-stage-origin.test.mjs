import assert from "node:assert/strict";
import test from "node:test";
import { assertQaStage, validateCompanionStage } from "../scripts/qa/stage-origin.mjs";
test("companion QA refuses a production, foreign or unavailable deployment even on the approved hostname", () => {
 const alias={alias:'exams.languagethreshold.com',projectId:'prj_at1LY9ncmWfGUecndikWrEUccuqo',deploymentId:'dpl_test'};
 const deployment={id:'dpl_test',projectId:alias.projectId,target:null,readyState:'READY'};
 validateCompanionStage(alias,deployment);
 for(const change of [{target:'production'},{projectId:'foreign'},{readyState:'ERROR'},{id:'dpl_else'}])
   assert.throws(()=>validateCompanionStage(alias,{...deployment,...change}));
 assert.throws(()=>validateCompanionStage({...alias,alias:'app.languagethreshold.com'},deployment));
 assert.throws(()=>assertQaStage('https://app.languagethreshold.com'));
 assert.throws(()=>assertQaStage('https://exams.languagethreshold.com.evil.example'));
});
