import test from 'node:test';import assert from 'node:assert/strict';
import {examDraftKey,saveExamDraft,readExamDraft,clearExamDraftsForUser} from '../src/lib/assessments/drafts.ts';
import {examInkKey,saveExamInk} from '../src/lib/assessments/ink.ts';
const draft=revision=>({formId:'fixture',revision,index:0,sequence:1,pending:{item:{answer:{inputMethod:'typed',text:'latest answer'},edit:1}},flight:null,savedAt:'2026-10-16T08:00:00Z'});
test('tab-level warning survives panel unmounts and clears only when all unsaved account work is gone',()=>{
 const handlers=new Map();globalThis.window={addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);}};
 try{const key=examDraftKey('warning-user','attempt');saveExamDraft(null,key,draft(0));assert.equal(handlers.has('beforeunload'),true);let prevented=false;const event={preventDefault:()=>prevented=true,returnValue:undefined};handlers.get('beforeunload')(event);assert.equal(prevented,true);assert.equal(event.returnValue,'');saveExamInk(null,examInkKey('warning-user','attempt','ink'),{ink:'abc=',transcript:'L',confirmed:true});clearExamDraftsForUser(null,'warning-user');assert.equal(handlers.has('beforeunload'),false);}finally{delete globalThis.window;}
});
test('a failed storage write cannot resurrect an older disk answer, and later server/tab copies remain visible',()=>{
 const key=examDraftKey('quota-user','attempt'),values=new Map([[key,JSON.stringify(draft(0))]]);let blocked=true;
 const storage={get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('quota');values.set(key,value);},removeItem:key=>values.delete(key)};
 assert.equal(saveExamDraft(storage,key,draft(1)),false);assert.equal(readExamDraft(storage,key).revision,1);blocked=false;assert.equal(saveExamDraft(storage,key,draft(2)),true);values.set(key,JSON.stringify(draft(3)));assert.equal(readExamDraft(storage,key).revision,3);clearExamDraftsForUser(storage,'quota-user');
});
