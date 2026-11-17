import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './helpers/bundle.mjs';
const mod=await loadModule('src/lib/owner-marketing-server.ts');
const message={id:'11111111-1111-4111-8111-111111111111',from:'Junior Linguist <hello@languagethreshold.com>',to:['parent@example.com'],subject:"Your child's first Spanish lesson — free",created_at:'2026-11-17T12:00:00Z',last_event:'delivered',html:'PRIVATE CONTENT',bcc:['private@example.com']};
test('owner marketing page reads only sender metadata, preserves provider cursor, and excludes other businesses',async()=>{
 const old=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='private-test-only-key';
 try{
  const calls=[];
  const page=await mod.ownerMarketingStream(null,new AbortController().signal,async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({has_more:true,data:[message,{...message,id:'22222222-2222-4222-8222-222222222222',from:'Other <other@unrelated.example>'}]}),{headers:{'Content-Type':'application/json'}});});
  assert.equal(page.messages.length,1);assert.equal(page.messages[0].category,'Kids / parents');assert.equal(page.messages[0].html,undefined);assert.equal(page.messages[0].bcc,undefined);
  assert.equal(page.nextCursor,'22222222-2222-4222-8222-222222222222');assert.equal(calls[0].url.origin,'https://api.resend.com');assert.equal(calls[0].options.redirect,'error');assert.ok(!JSON.stringify(page).includes('private-test-only-key'));
  await assert.rejects(()=>mod.ownerMarketingStream('https://attacker.example',new AbortController().signal),error=>error.status===400);
 }finally{if(old===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=old;}
});
