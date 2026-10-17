import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/bundle.mjs';

test('content reviewer scopes match complete module/language tuples, never their cross-product', async () => {
 const {contentTrackAllowed}=await loadModule('src/lib/assessments/content-server.ts',{stubs:[/^@tanstack\/react-start\/server-only$/]});
 const scopes={owner:false,grants:[{module_id:'roofing',target_language:'Spanish',instruction_language:'English',kind:'domain'},{module_id:'framer',target_language:'French',instruction_language:'Spanish',kind:'curriculum'}]};
 const track=(module_id,target_language,instruction_language)=>({module_id,target_language,instruction_language});
 assert.equal(contentTrackAllowed(scopes,track('roofing','Spanish','English')),true);
 assert.equal(contentTrackAllowed(scopes,track('framer','French','Spanish')),true);
 for(const denied of [track('roofing','French','English'),track('roofing','Spanish','Spanish'),track('framer','Spanish','English'),track('orthopedics','Spanish','English')])assert.equal(contentTrackAllowed(scopes,denied),false);
 assert.equal(contentTrackAllowed({owner:false,grants:[]},track('roofing','Spanish','English')),false);
 assert.equal(contentTrackAllowed({owner:true,grants:[]},track('roofing','Spanish','English')),true);
});
