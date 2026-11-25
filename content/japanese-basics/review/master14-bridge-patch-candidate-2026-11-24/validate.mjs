import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDraftVariantBridge} from './bridge-candidate.mjs';
const here=dirname(fileURLToPath(import.meta.url)), root=resolve(here,'../../../..');
const read=(p)=>JSON.parse(readFileSync(resolve(here,p),'utf8'));
const fixtures=read('fixtures.json'), meta=read('ai-assistance-metadata.json');
for(const pin of Object.values(meta.source)) assert.equal(createHash('sha256').update(readFileSync(resolve(root,pin.path))).digest('hex'),pin.sha256);
const prior=JSON.parse(readFileSync(resolve(root,meta.source.priorAlternatives.path),'utf8'));
assert.deepEqual(fixtures.rows,prior.rows);
const source=JSON.parse(readFileSync(resolve(root,meta.source.mainMaster.path),'utf8')).lessons[13];
for(const row of fixtures.rows) assert.equal(source.dialogue[row.mainDialogueTurnOneBased-1],row.canonicalJapanese+'|'+row.canonicalEnglish);
const clone=x=>JSON.parse(JSON.stringify(x));
const bridge=createDraftVariantBridge(fixtures);
assert.equal(bridge.releaseEnabled,false);assert.equal(bridge.registered,false);assert.equal(bridge.reviewed,false);
const request=(row,contextKey,input)=>({pair:{target:'Japanese',native:'English'},moduleId:'master-japanese-basics',lessonNumber:14,sourcePromptId:row.sourcePromptId,contextKey,sourceSha256:fixtures.contexts[contextKey].sourceSha256,sourceDialogueTurn:row[fixtures.contexts[contextKey].turnKey],canonicalJapanese:row.canonicalJapanese,canonicalEnglish:row.canonicalEnglish,input});
let positive=0,negative=0,invalidFixtures=0;
const inert=r=>{assert.equal(r.releaseEnabled,false);assert.equal(r.scoreable,false);assert.equal(r.progressWritable,false);};
for(const row of fixtures.rows) for(const context of ['main','privateRoutine']) {
 for(const input of [row.canonicalJapanese,...row.alternatives.map(a=>a.candidateJapanese)]) {
  const result=bridge.evaluate(request(row,context,input));assert.equal(result.fixtureAccepted,true);inert(result);assert.equal(result.canonicalKanaReading,row.canonicalJapanese);assert.equal(result.rowId,row.id);assert.equal(result.matchedVariantId,input===row.canonicalJapanese?null:row.alternatives.find(a=>a.candidateJapanese===input).id);positive++;
 }
}
const base=request(fixtures.rows[0],'main',fixtures.rows[0].alternatives[1].candidateJapanese);
const mutations=[
 r=>r.pair={target:'English',native:'Japanese'},
 r=>r.pair.native='Spanish',r=>r.pair.target='Spanish',
 r=>r.moduleId='japanese-basics',r=>r.lessonNumber=15,r=>r.lessonNumber='14',
 r=>r.sourcePromptId=fixtures.rows[1].sourcePromptId,r=>r.sourcePromptId='form-ja-en-unknown',
 r=>r.contextKey='runtime',r=>r.sourceSha256='0'.repeat(64),
 r=>r.sourceDialogueTurn=10,r=>r.sourceDialogueTurn='4',
 r=>r.canonicalJapanese='でも、でんしゃは おくれていました。',
 r=>r.canonicalEnglish='But the train was delayed.',
 r=>r.input=fixtures.rows[1].canonicalJapanese,
 r=>r.input='でも、電車が遅れていました。',
 r=>r.input='でも、電車が遅延しています。',
 r=>r.input='でも、 電車が遅れています。',
 r=>r.input='でも、でんしゃがおくれています',
 r=>r.input=' でも、電車が遅れています。',
 r=>r.input='でも、電車が遅れています。 ',
 r=>r.input='でも，電車が遅れています。',
 r=>r.input='',r=>delete r.input,
];
for(const change of mutations){const r=clone(base);change(r);const result=bridge.evaluate(r);assert.equal(result.fixtureAccepted,false);assert.equal(result.canonicalKanaReading,null);inert(result);negative++;}
for(const invalid of [null,undefined,{},[],{get pair(){throw Error('test getter');}}]){const result=bridge.evaluate(invalid);assert.equal(result.fixtureAccepted,false);inert(result);negative++;}
const revocable=Proxy.revocable({},{});revocable.revoke();assert.equal(bridge.evaluate(revocable.proxy).fixtureAccepted,false);negative++;
const fixtureMutations=[
 f=>f.pair.native='Spanish',f=>f.lessonNumber=15,f=>f.registered=true,
 f=>f.reviewed=true,f=>f.releaseEnabled=true,f=>f.gates.scoring=true,
 f=>f.gates={placeholder:false},f=>f.gates.extra=false,
 f=>f.contexts.main.sourceSha256='0'.repeat(64),
 f=>f.contexts.privateRoutine.turnKey='mainDialogueTurnOneBased',
 f=>f.rows[0].sourcePromptId=f.rows[1].sourcePromptId,
 f=>f.rows[0].canonicalEnglish='But the train was delayed.',
 f=>f.rows[0].mainDialogueTurnOneBased=0,
 f=>f.rows[0].alternatives[1].readingMappings[0].readingKana='でんしや',
 f=>f.rows[1].alternatives[1].readingMappings[3].readingKana='まつ',
 f=>f.rows[0].alternatives[1].candidateJapanese='でも、電車が遅れていました。',
 f=>f.rows.push(clone(f.rows[0])),f=>f.rows.reverse(),
];
for(const change of fixtureMutations){const f=clone(fixtures);change(f);assert.throws(()=>createDraftVariantBridge(f));invalidFixtures++;}
const mutable=clone(fixtures), frozenBridge=createDraftVariantBridge(mutable);mutable.rows[0].canonicalJapanese='changed';mutable.gates.scoring=true;assert.equal(frozenBridge.evaluate(base).fixtureAccepted,true);inert(frozenBridge.evaluate(base));
assert.ok(bridge.evaluate(base).canonicalKanaReading.includes('しゃ'));
assert.ok(bridge.evaluate(request(fixtures.rows[1],'main',fixtures.rows[1].alternatives[1].candidateJapanese)).canonicalKanaReading.includes('まって'));
assert.equal(meta.qualifiedApproval,false);
for(const [role,model] of [['haiku','claude-haiku-5-5'],['opus','claude-opus-5-5'],['fable','claude-fable-5-2']]) {assert.equal(meta[role].safeMode,true);assert.ok(meta[role].actualModelUsage[model]);assert.equal(meta[role].isError,false);}
console.log(JSON.stringify({status:'PASS',positiveFixtureCases:positive,rejectedRequestCases:negative,rejectedAlteredFixtures:invalidFixtures,externalMutationIsolated:true,sourceAndReadingMappings:true,releaseEnabled:false,scoreable:false,progressWritable:false}));
