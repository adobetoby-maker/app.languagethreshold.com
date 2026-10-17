import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';

test('actual default-off analytics hook performs no SDK/storage/transport work across effect cleanup and setup',async()=>{
 const dir=mkdtempSync(resolve('node_modules/.cache/analytics-disabled-'));
 try{
 const outfile=join(dir,'hook.mjs');await build({stdin:{contents:`export {useFieldPrepAnalytics} from './src/hooks/use-field-prep-analytics';export {FIELD_PREP_ANALYTICS_ENABLED} from './src/lib/lt-analytics';export {controls} from 'fixture';`,resolveDir:process.cwd()},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'disabled-hook',setup(b){b.onResolve({filter:/^(fixture|react|@\/state\/auth-state|@\/integrations\/supabase\/client)$/},()=>({path:'host',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const controls={slots:[],cursor:0,effects:[],actor:'a',sdkReads:0,begin(){this.cursor=0;},commit(){for(const f of this.effects.splice(0))f();},unmount(){for(const s of this.slots)s?.cleanup?.();this.slots=[];this.effects=[];}};export function useRef(value){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]={current:value};return controls.slots[i];}export function useMemo(fn){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=fn();return controls.slots[i];}export function useEffect(fn){const i=controls.cursor++;if(!(i in controls.slots))controls.effects.push(()=>controls.slots[i]={cleanup:fn()});}export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser:id=>id===controls.actor});export const supabase=new Proxy({},{get(){controls.sdkReads++;throw new Error('disabled feature must not read SDK');}});`}));}}]});
 const {useFieldPrepAnalytics,FIELD_PREP_ANALYTICS_ENABLED,controls:c}=await import(outfile);assert.equal(FIELD_PREP_ANALYTICS_ENABLED,false);
 const render=()=>{c.begin();const api=useFieldPrepAnalytics();c.commit();return api;};
 for(const actor of ['a',null,'b']){c.actor=actor;const api=render();assert.equal(await api.appEvent('field_prep_start',{language:'Spanish',metadata:{scenario_id:'fixture'}}),false);assert.equal(await api.submitFeedback({feedbackType:'field_prep_session',rating:4,scenarioId:'fixture',language:'Spanish'}),false);api.dispose();c.unmount();}
 assert.equal(c.sdkReads,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
