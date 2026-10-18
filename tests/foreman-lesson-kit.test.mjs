import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const {getLessonDefinition,modulePracticeVersion} = await loadModule("src/lib/lesson-definition.ts");
const {getCurriculum} = await loadModule("src/data/curriculum.ts");
const {findSpeakingMission} = await loadModule("src/data/speaking-missions.ts");
const {lessonSourceCoverage} = await loadModule("src/lib/lesson-source-coverage.ts");
const {publicLessonOfflinePack} = await loadModule("src/lib/lesson-offline-pack.ts");
const definition = (n, targetLanguage="Spanish", instructionLanguage="English") => getLessonDefinition({moduleId:"construction-foreman",lessonNumber:n,targetLanguage,instructionLanguage,contentVersion:modulePracticeVersion("construction-foreman",targetLanguage,instructionLanguage)});

test("all30 Foreman drafts have their own vocabulary and bilingual reading, without claiming review", () => {
  const titles = new Set(), passages = new Set();
  for(let n=1;n<=30;n++) {
    const d=definition(n);
    assert.equal(d.readiness,"draft");
    assert.equal(d.words.filter(w=>w.kind==="term").length,10);
    assert.equal(d.words.filter(w=>w.kind==="phrase").length,5);
    assert.equal(new Set(d.words.map(w=>w.es)).size,15);
    assert.equal(d.source.readingTemplate,undefined);
    assert.equal(d.expectedMinutes,20);
    assert.ok(d.reading.sentences.every(s=>s.target.trim() && s.native.trim()));
    const text=d.reading.sentences.map(s=>s.target).join(" ").toLocaleLowerCase("es");
    for(const w of d.words) assert.ok(text.includes(w.es.toLocaleLowerCase("es").replace(/[.!?]+$/, "")),`lesson${n}: ${w.es}`);
    assert.deepEqual(d.modes,["see","recall","hear","type","say","write"]);
    assert.ok(d.gaps.some(g=>/review.*pending/.test(g)));
    titles.add(d.reading.title); passages.add(text);
  }
  assert.equal(titles.size,30); assert.equal(passages.size,30);
  assert.equal(lessonSourceCoverage("construction-foreman","Spanish","English").structurallyComplete,true);
});

test("Foreman level drives listening, response length, writing and the exact speaking mission", () => {
  for(const [n,stage,batch,sentences,bank] of [[1,"supported",4,1,"visible"],[15,"connected",6,2,"collapsed"],[30,"independent",8,3,"on-request"]]) {
    const d=definition(n),t=d.teaching;
    assert.equal(t.stage,stage); assert.equal(t.matchingBatchSize,batch);
    assert.equal(t.response.suggestedSentences,sentences);
    assert.equal(t.writing.copyFirst,true); assert.equal(t.writing.prompt,d.objective);
    assert.equal(t.speaking.wordBank,bank);
    const mission=findSpeakingMission(`scenario_version_construction-foreman_lesson_${n}_es_v1`);
    assert.equal(mission.sourceObjectiveId,d.objectiveId);
    assert.deepEqual(mission.lessonTeaching,{stage,speaking:t.speaking});
    if(n===1) assert.deepEqual(d.listeningItems,d.words);
    else assert.equal(d.listeningItems[0].es,d.reading.sentences.slice(0,n===30?2:1).map(s=>s.target).join(" "));
  }
});

test("Foreman changes do not rewrite Framer or cross translation pairs", () => {
  const framing=getCurriculum("framer");
  assert.equal(framing.lessons[0].readingTemplate,"seed-{lang}-framer-layout");
  assert.equal(framing.lessons[0].words,undefined);
  assert.match(framing.lessons[7].steps.map(s=>s.instruction).join(" "),/7 días/);
  assert.equal(definition(8).source.steps.some(s=>/7 días/.test(s.instruction)),false);
  for(const [target,native] of [["French","English"],["Spanish","French"],["English","Spanish"]]) {
    const d=definition(15,target,native);
    assert.deepEqual(d.words,[]); assert.equal(d.reading,null); assert.equal(d.teaching,null);
  }
  assert.equal(definition(31),null);
});

test("Foreman download includes its exact30 public practice lessons, not private exams or audio files", () => {
  const pack=publicLessonOfflinePack("construction-foreman-es-en");
  assert.equal(pack.moduleId,"construction-foreman"); assert.equal(pack.lessons.length,30);
  assert.equal(pack.contentStatus,"draft"); assert.equal(pack.officialAssessmentsIncluded,false);
  assert.equal(pack.audioFilesIncluded,false);
  assert.match(pack.capabilities.write,/recognition-requires-connection/);
  assert.equal(pack.lessons[14].objective,definition(15).objective);
  assert.throws(()=>publicLessonOfflinePack("construction-foreman-es-en",Array.from({length:30},(_,i)=>getLessonDefinition({moduleId:"roofing",lessonNumber:i+1,targetLanguage:"Spanish",instructionLanguage:"English",contentVersion:"draft"}))),/complete/);
});
