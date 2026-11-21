import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const code=transformSync(readFileSync(new URL('../src/lib/speech-word-similarity.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code;
const {speechWordSimilarity}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const pack=(code)=>JSON.parse(readFileSync(new URL(`../src/data/language-packs/${code}.json`,import.meta.url),'utf8'));
const es=pack('es'), ja=pack('ja'), fr=pack('fr'), it=pack('it');
const score=(a,b,p=es)=>speechWordSimilarity(a,b,p);
test('speech scoring matches native exact, missing-word, near-word and sound-alike examples',()=>{
 assert.deepEqual(score('manguito rotador','manguito rotador'),{score:100,exact:true});
 assert.deepEqual(score('manguito rotador','rotador'),{score:50,exact:false});
 assert.deepEqual(score('manguito rotador','mangito rotador'),{score:83,exact:false});
 assert.deepEqual(score('hola','ola'),{score:85,exact:false});
});
test('word order, insertions, repeats and ñ remain meaningful; a close match never passes',()=>{
 for(const [a,b] of [['no toque','toque no'],['no toque','no toque toque'],['no no toque','no toque'],['pero','perro']]){const result=score(a,b);assert.equal(result.exact,false);assert.ok(result.score<100);}
 assert.deepEqual(score('año','ano'),{score:0,exact:false});
 assert.deepEqual(score('manguito','zapatos'),{score:0,exact:false});
 assert.deepEqual(score('manguito',''),{score:0,exact:false});
 assert.deepEqual(score('','hola'),{score:0,exact:false});
 assert.equal(score('¡Buenos días!','buenos dias').score,100);
});
test('other packs never receive Spanish phonetic allowances; their own rules apply',()=>{
 // Spanish v = b is not a French rule.
 assert.equal(score('vaca','baca').score,85);
 assert.ok(score('vaca','baca',fr).score<85);
 assert.equal(score('日本','日',ja).score,50);
 assert.equal(score('猫','犬',ja).exact,false);
 assert.equal(score('école','école',fr).score,100);
 // French folds marks in speech and credits its own homophones and spelling equivalences.
 assert.equal(score('où','ou',fr).exact,true);
 assert.equal(score('il est là','il et là',fr).exact,false);
 assert.ok(score('il est là','il et là',fr).score>=95);
 assert.ok(score('parlez','parlé',fr).score>=85);
 // Italian keeps protected pairs apart in speech unless they are homophones.
 assert.equal(score('papà','papa',it).exact,false);
 assert.equal(score('è','e',it).exact,true);
});
test('the pack is required: no default language',()=>{
 assert.throws(()=>speechWordSimilarity('hola','hola'));
});
