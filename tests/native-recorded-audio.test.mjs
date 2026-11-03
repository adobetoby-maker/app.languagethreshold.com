import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeSpanishRecordingPath } from '../src/lib/recorded-spanish.ts';
const m={version:1,entries:{'el techo':{female:'v3-e9025492f9d4aa80d96e-female',male:'v3-e9025492f9d4aa80d96e-male'},'la niña':{female:'trade-framer-16-female'},'unsafe':{female:'../../bad'},'wrong':{female:'v3-e9025492f9d4aa80d96e-male'}}};
test('native recordings preserve original filenames and selected gender',()=>{
 assert.equal(nativeSpanishRecordingPath(m,' EL  TECHO. ','female','es-US'),'/audio/native-v3/v3-e9025492f9d4aa80d96e-female.mp3');
 assert.equal(nativeSpanishRecordingPath(m,'el techo','male','es-CR'),'/audio/native-v3/v3-e9025492f9d4aa80d96e-male.mp3');
 assert.equal(nativeSpanishRecordingPath(m,'la niña','female','es-419'),'/audio/native-v3/trade-framer-16-female.mp3');
});
test('native resolver rejects altered accents, other languages, Spain, unsafe names and mismatched gender',()=>{
 for(const [text,g,locale] of [['la nina','female','es-US'],['el techo','female','fr'],['el techo','female','es-ES'],['unsafe','female','es-US'],['wrong','female','es-US'],['la niña','male','es-US']])assert.equal(nativeSpanishRecordingPath(m,text,g,locale),null);
});
