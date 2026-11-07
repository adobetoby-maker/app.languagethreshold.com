import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CORE60_MANIFEST } from '../src/data/core60/manifest.ts';
import { findStageEntry, parseStageFile, stageCurriculumFromFile, stageFileRelativePath, stageModuleId } from '../src/lib/core60-stage-core.ts';
import { validateStageFile } from '../src/lib/core60-validate.ts';

const pilot=JSON.parse(readFileSync(new URL('../content/french-basics/private-runtime-foundation-1-10.json',import.meta.url),'utf8'));
const source={lessons:['foundation-1-3-draft.json','foundation-4-6-draft.json','foundation-7-8-draft.json','foundation-9-10-draft.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../content/french-basics/${name}`,import.meta.url),'utf8')).lessons)};
const sha=path=>createHash('sha256').update(readFileSync(new URL(`../${path}`,import.meta.url))).digest('hex');
const plan=JSON.parse(readFileSync(new URL('../content/french-basics/foundation-1-10-curation-plan.json',import.meta.url),'utf8'));

test('private French 1–10 pilot is pair-safe and absent from live stage registry',()=>{
 assert.equal(pilot.privatePilot,true);
 assert.equal(pilot.registered,false);
 assert.equal(pilot.reviewed,false);
 assert.equal(pilot.stageFile.module,'foundation-french-basics');
 assert.equal(pilot.stageFile.language,'French');
 assert.equal(pilot.stageFile.nativeLanguage,'English');
 for(const src of pilot.sources){
   assert.equal(src.draftSha256,sha(src.draftPath));
   assert.equal(src.spanishSourceSha256,sha(src.spanishSourcePath));
   assert.ok(src.spanishSourceSubsetSha256);
 }
 assert.equal(pilot.curationPlanSha256,sha(pilot.curationPlanPath));
 assert.equal(stageFileRelativePath('French',pilot.stageFile.module),'fr/foundation-french-basics.json');
 assert.equal(stageModuleId('foundation','spanish-basics'),'foundation-spanish-basics');
 assert.equal(stageModuleId('foundation','japanese-basics'),'foundation-japanese-basics');
 assert.notEqual(pilot.stageFile.module,stageModuleId('foundation','spanish-basics'));
 assert.notEqual(pilot.stageFile.module,stageModuleId('foundation','japanese-basics'));
 assert.equal(findStageEntry(CORE60_MANIFEST,pilot.stageFile.module),null);
});

test('private French stage converts to lessons without changing the live curriculum',()=>{
 const file=parseStageFile(pilot.stageFile,{moduleId:'foundation-french-basics',stage:'foundation',language:'French'});
 assert.ok(file);
 const curriculum=stageCurriculumFromFile(file);
 assert.equal(curriculum.moduleId,'foundation-french-basics');
 assert.deepEqual(curriculum.lessons.map(l=>l.n),[1,2,3,4,5,6,7,8,9,10]);
 for(const lesson of curriculum.lessons){
   assert.equal(lesson.steps.length,3);
   assert.deepEqual(lesson.words,pilot.stageFile.lessons[lesson.n-1].words);
   assert.equal(lesson.steps[2].instruction,source.lessons[lesson.n-1].speaking);
 }
});

test('full private Foundation stage file passes structural validator',()=>{
 const errors=validateStageFile(pilot.stageFile,{moduleId:'foundation-french-basics',stage:'foundation',language:'French'});
 assert.deepEqual(errors,[]);
});

test('all six mode inputs, Reader, cards, dictionary, speaking and checks retain exact pairs',()=>{
 assert.deepEqual(pilot.support.map(x=>x.stableLessonKey),[1,2,3,4,5,6,7,8,9,10].map(n=>`foundation-french-basics:${n}`));
 for(const [i,s] of pilot.support.entries()){
   const draft=source.lessons[i];
   assert.deepEqual(Object.keys(s.modes).sort(),['see','recall','hear','type','say','write'].sort());
   assert.deepEqual(s.cards,draft.words.map(w=>({target:w.fr,native:w.en,kind:w.kind})));
   assert.deepEqual(s.stageCardIndexes,plan.lessons[i].selectedWordIndexes);
   assert.deepEqual(pilot.stageFile.lessons[i].words,s.stageCardIndexes.map(index=>({es:s.cards[index].target,en:s.cards[index].native,kind:s.cards[index].kind})));
   assert.deepEqual(s.backlogCards,s.cards.filter((_,index)=>!s.stageCardIndexes.includes(index)));
   assert.equal(s.stageCardIndexes.length+s.backlogCards.length,s.cards.length);
   assert.deepEqual(s.dictionaryEntries,draft.words.filter(w=>w.kind==='term').map(w=>({target:w.fr,native:w.en})));
   assert.deepEqual(s.reader.sentences,draft.dialogue.map(line=>{
     const [target,native]=line.split('|');return {target:target.trim(),native:native.trim()};
   }));
   assert.deepEqual(s.checks,draft.checks);
   assert.equal(s.speaking.brief,draft.speaking);
   assert.equal(s.speaking.recordedAudio,false);
   assert.equal(s.modes.hear.recordedAudio,false);
   assert.equal(s.modes.say.recordedAudio,false);
   assert.equal(s.modes.see.readerLineCount,s.reader.sentences.length);
   assert.equal(s.modes.recall.cardCount,s.stageCardIndexes.length);
   assert.equal(s.modes.type.cardCount,s.stageCardIndexes.length);
   assert.equal(s.modes.write.cardCount,s.stageCardIndexes.length);
 }
});
