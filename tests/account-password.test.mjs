import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule } from './helpers/bundle.mjs';
const m=await loadModule('src/lib/account-password.ts');
const password='QA-only-not-a-real-password';
test('password setup validates length and confirmation before contacting auth',async()=>{
 let calls=0;const client={auth:{getUser(){calls++;throw Error('unexpected')}}};
 assert.match(await m.setOwnAccountPassword(client,'a',()=>true,'short','short'),/12 and 128/);
 assert.match(await m.setOwnAccountPassword(client,'a',()=>true,password,'different'),/not match/);
 assert.equal(calls,0);
});
test('password setup requires the server-verified current account',async()=>{
 for(const [current,verified] of [[false,'a'],[true,'b']]){
  let writes=0;const c={auth:{getUser:async()=>({data:{user:{id:verified}},error:null}),updateUser:async()=>{writes++;}}};
  assert.match(await m.setOwnAccountPassword(c,'a',()=>current,password,password),/sign-in changed/);assert.equal(writes,0);
 }
});
test('identity loss during verification prevents a credential change',async()=>{
 let current=true,writes=0;const c={auth:{getUser:async()=>{current=false;return{data:{user:{id:'a'}},error:null}},updateUser:async()=>{writes++;}}};
 assert.match(await m.setOwnAccountPassword(c,'a',()=>current,password,password),/sign-in changed/);assert.equal(writes,0);
});
test('password setup sends only the password once and rejects unconfirmed or stale results',async()=>{
 let current=true,calls=[];const c={auth:{getUser:async()=>({data:{user:{id:'a'}},error:null}),updateUser:async value=>{calls.push(value);return{data:{user:{id:'a'}},error:null}}}};
 assert.equal(await m.setOwnAccountPassword(c,'a',()=>current,password,password),null);assert.deepEqual(calls,[{password}]);
 c.auth.updateUser=async()=>{throw Error('private provider diagnostic')};
 const error=await m.setOwnAccountPassword(c,'a',()=>current,password,password);assert.match(error,/could not confirm/);assert.doesNotMatch(error,/private provider/);
 c.auth.updateUser=async()=>{current=false;return{data:{user:{id:'a'}},error:null}};
 assert.match(await m.setOwnAccountPassword(c,'a',()=>current,password,password),/sign-in changed/);
});
