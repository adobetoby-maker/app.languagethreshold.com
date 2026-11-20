import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const code=transformSync(readFileSync(new URL('../src/lib/speech-word-similarity.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code;
const {speechWordSimilarity:score}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
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
test('non-Spanish scripts never receive Spanish phonetic allowances',()=>{
 assert.deepEqual(score('hola','ola','French'),{score:0,exact:false});
 assert.equal(score('日本','日','Japanese').score,50);
 assert.equal(score('猫','犬','Japanese').exact,false);
 assert.equal(score('école','école','French').score,100);
});
