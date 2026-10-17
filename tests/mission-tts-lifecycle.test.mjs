import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise(r => setImmediate(r));
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a;reject=b; });return {promise,resolve,reject}; }

test("actual mission playback rejects stopped/late work without touching newer audio", async () => {
  const dir=mkdtempSync(resolve("node_modules/.cache/mission-playback-"));
  const saved={fetch:globalThis.fetch,Audio:globalThis.Audio,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
  const requests=[],plays=[],revoked=[];let audio;let nextUrl=0;
  globalThis.Audio=class { constructor(){audio=this;} pause(){} removeAttribute(){this.src="";} load(){} play(){const job=deferred();plays.push(job);return job.promise;} };
  globalThis.fetch=(url,options)=>{const job=deferred();requests.push({...job,url,options});return job.promise;};
  URL.createObjectURL=()=>`blob:qa-${++nextUrl}`;URL.revokeObjectURL=url=>revoked.push(url);
  try {
    const outfile=join(dir,"mission.mjs");
    await build({stdin:{contents:`export * from './src/lib/mission-tts';export {controls} from 'fixture';`,resolveDir:process.cwd()},outfile,bundle:true,format:"esm",platform:"node",logLevel:"silent",plugins:[{name:"headers",setup(b){b.onResolve({filter:/^(fixture|@\/lib\/speaking-client)$/},()=>({path:"headers",namespace:"fixture"}));b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:`export const controls={headers:()=>Promise.resolve({})};export const speakingRequestHeaders=()=>controls.headers();`}));}}]});
    const m=await import(outfile);
    const opts={text:"Synthetic playback fixture",voiceName:"fixture",languageCode:"es-CR",speakingRate:1};
    const response=blob=>({ok:true,headers:new Headers(),blob:()=>blob??Promise.resolve(new Blob(["qa"]))});
    const run=()=>m.speakMissionTts(opts).then(()=>"finished",e=>e.name);
    const headers=deferred();m.controls.headers=()=>headers.promise;
    const stoppedHeaders=run();m.stopMissionTts();headers.resolve({});
    assert.equal(await stoppedHeaders,"AbortError");assert.equal(requests.length,0,"no request after delayed credentials and stop");
    m.controls.headers=()=>Promise.resolve({});
    const lateBlob=deferred();const a=run();await tick();requests[0].resolve(response(lateBlob.promise));await tick();
    m.stopMissionTts();lateBlob.resolve(new Blob(["old"]));assert.equal(await a,"AbortError");assert.equal(plays.length,0);
    let starts=0;
    const first=m.speakMissionTts({...opts,onPlaybackStart:()=>starts++}).then(()=>"finished",e=>e.name);
    await tick();requests[1].resolve(response());await tick();assert.equal(audio.src,"blob:qa-1");
    const second=run();await tick();assert.equal(await first,"AbortError");
    requests[2].resolve(response());await tick();assert.equal(audio.src,"blob:qa-2");
    const currentEnd=audio.onended;
    plays[0].reject(new Error("late old play rejection"));await tick();
    assert.equal(audio.src,"blob:qa-2");assert.equal(audio.onended,currentEnd);assert.ok(!revoked.includes("blob:qa-2"));
    plays[1].resolve();await tick();audio.onended();assert.equal(await second,"finished");assert.equal(starts,0);
    const third=m.speakMissionTts({...opts,onPlaybackStart:()=>starts++}).then(()=>"finished",e=>e.name);
    await tick();requests[3].resolve(response());await tick();m.stopMissionTts();assert.equal(await third,"AbortError");
    plays[2].resolve();await tick();assert.equal(starts,0,"late play success cannot call prior owner callback");assert.equal(audio.src,"");
    const owner = new AbortController();
    const owned=m.speakMissionTts({...opts,signal:owner.signal}).then(()=>"finished",e=>e.name);
    await tick();requests[4].resolve(response());await tick();
    const newer=run();owner.abort();await tick();assert.equal(await owned,"AbortError");
    requests[5].resolve(response());await tick();assert.equal(audio.src,"blob:qa-5");
    const preAborted=new AbortController();preAborted.abort();
    await assert.rejects(m.speakMissionTts({...opts,signal:preAborted.signal}),{name:"AbortError"});
    assert.equal(requests.length,6);assert.equal(audio.src,"blob:qa-5");
    audio.onended();await newer;
    const liveOwner=new AbortController();
    const ownedStop=m.speakMissionTts({...opts,signal:liveOwner.signal}).then(()=>"finished",e=>e.name);
    await tick();requests[6].resolve(response());await tick();liveOwner.abort();
    assert.equal(await ownedStop,"AbortError");assert.equal(audio.src,"");
    assert.deepEqual(revoked,["blob:qa-1","blob:qa-2","blob:qa-3","blob:qa-4","blob:qa-5","blob:qa-6"]);
  } finally {globalThis.fetch=saved.fetch;globalThis.Audio=saved.Audio;URL.createObjectURL=saved.create;URL.revokeObjectURL=saved.revoke;rmSync(dir,{recursive:true,force:true});}
});

test("actual voice selection uses explicit preferences or public device defaults without legacy storage", async () => {
  const saved={window:globalThis.window,storage:Object.getOwnPropertyDescriptor(globalThis,"localStorage")};
  const defaults={voiceURI:"default",lang:"es-CR",name:"Google fixture"};const owned={voiceURI:"owned",lang:"es-CR",name:"Owned fixture"};let reads=0;
  globalThis.window={speechSynthesis:{getVoices:()=>[defaults,owned]}};
  Object.defineProperty(globalThis,"localStorage",{configurable:true,get(){reads++;throw new Error("legacy read forbidden");}});
  const dir=mkdtempSync(resolve("node_modules/.cache/voice-default-"));
  try {
    const outfile=join(dir,"voices.mjs");await build({entryPoints:[resolve("src/lib/voices.ts")],outfile,bundle:true,platform:"node",format:"esm",logLevel:"silent"});
    const m=await import(outfile);
    assert.equal(m.pickVoice("es-CR").voiceURI,"default");assert.equal(m.pickVoice("es-CR","owned").voiceURI,"owned");
    assert.equal(m.pickVoice("es-CR","unknown").voiceURI,"default");
    const utterance={};m.configureUtterance(utterance,"es-CR","owned");assert.equal(utterance.voice.voiceURI,"owned");assert.equal(utterance.lang,"es-CR");assert.equal(reads,0);
  } finally {globalThis.window=saved.window;if(saved.storage)Object.defineProperty(globalThis,"localStorage",saved.storage);else delete globalThis.localStorage;rmSync(dir,{recursive:true,force:true});}
});
