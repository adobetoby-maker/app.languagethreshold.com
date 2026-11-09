#!/usr/bin/env node
// Local review worksheet only; exported observations do not set curriculum release flags.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bytes = readFileSync(resolve(root, 'content/french-basics/private-form-runtime-preview-fr-en.json'));
const preview = JSON.parse(bytes);
if (preview.pairKey !== 'French:English' || preview.registered !== false ||
    preview.reviewed !== false || preview.lessonCount !== 60 || preview.promptCount !== 329 ||
    preview.sourceCounts?.['reader-linked'] !== 284 || preview.sourceCounts?.['authored-contrast'] !== 45)
  throw new Error('French 101 form preview is not the expected private candidate');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const rows = preview.lessons.flatMap(lesson => lesson.activities
  .filter(activity => activity.mode === 'produce-target')
  .map(activity => ({
    lesson: lesson.stableLessonKey,
    id: activity.sourcePromptId,
    english: activity.cue,
    french: activity.answer,
    variants: activity.knownFrenchVariants,
    focus: activity.focus,
    sourceKind: activity.sourceKind,
    sourceReaderTurn: activity.sourceReaderTurn,
  })));
if (rows.length !== 329 || new Set(rows.map(row => row.id)).size !== 329)
  throw new Error('French 101 review rows changed');
const embedded = JSON.stringify({ sha256, rows }).replaceAll('</', '<\\/');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>French 101 form review</title>
<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:1rem;color:#14212d;background:#f8fafc}header{position:sticky;top:0;background:#f8fafc;padding:.6rem 0;border-bottom:1px solid #ccd;z-index:1}button,input,textarea,select{font:inherit}button{padding:.55rem .8rem;min-height:44px;margin:.2rem}article{background:#fff;border:1px solid #ccd;border-radius:12px;padding:1rem;margin:1rem 0}article[data-decision="accept"]{border-color:#268653}article[data-decision="revise"]{border-color:#b45309}.fr{font-size:1.25rem}small{color:#445}textarea{width:100%;min-height:3rem}label{display:inline-block;margin:.3rem}select,input{padding:.4rem}</style>
<header><h1>French 101 contextual forms</h1><p>329 prompts · 60 lessons · 284 Reader-linked and 45 authored contrasts. This private worksheet records reviewer observations; it does not mark lessons reviewed or registered.</p><p><label>Reviewer <input id="reviewer" autocomplete="name"></label><label>Source <select id="source"><option value="all">All</option><option value="reader-linked">Reader-linked</option><option value="authored-contrast">Authored contrast</option></select></label><label>Decision <select id="filter"><option value="all">All</option><option value="open">Open</option><option value="accept">Accepted wording</option><option value="revise">Needs revision</option></select></label><button id="export">Export decisions JSON</button></p><small id="count"></small></header><main id="list"></main>
<script>const data=${embedded};const key='lt-french101-form-review-'+data.sha256;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const list=document.getElementById('list');const filter=document.getElementById('filter');const source=document.getElementById('source');const reviewer=document.getElementById('reviewer');reviewer.value=saved.reviewer||'';function persist(){saved.reviewer=reviewer.value;localStorage.setItem(key,JSON.stringify(saved))}reviewer.oninput=persist;filter.onchange=render;source.onchange=render;function render(){let shown=0;list.innerHTML='';for(const row of data.rows){const state=saved[row.id]||{};if(source.value!=='all'&&row.sourceKind!==source.value)continue;if(filter.value!=='all'&&(filter.value==='open'?!!state.decision:state.decision!==filter.value))continue;shown++;const card=document.createElement('article');card.dataset.decision=state.decision||'';card.innerHTML='<small>'+esc(row.lesson)+' · '+esc(row.sourceKind)+(row.sourceReaderTurn?' · turn '+row.sourceReaderTurn:'')+' · '+esc(row.id)+'</small><p><strong>English cue</strong><br>'+esc(row.english)+'</p><p class="fr" lang="fr"><strong>French answer</strong><br>'+esc(row.french)+'</p><p><small>Focus: '+esc(row.focus)+' · recorded variants: '+esc(row.variants.join(' / '))+'</small></p><label>Decision <select><option value="">Open</option><option value="accept">Accept wording</option><option value="revise">Needs revision</option></select></label><label>Notes<br><textarea></textarea></label>';const choice=card.querySelector('select');const notes=card.querySelector('textarea');choice.value=state.decision||'';notes.value=state.notes||'';choice.onchange=()=>{saved[row.id]={decision:choice.value,notes:notes.value};persist();render()};notes.oninput=()=>{saved[row.id]={decision:choice.value,notes:notes.value};persist()};list.append(card)}document.getElementById('count').textContent=shown+' shown / '+data.rows.length+' prompts';}document.getElementById('export').onclick=()=>{persist();const decisions=Object.fromEntries(data.rows.map(row=>[row.id,saved[row.id]||{decision:'',notes:''}]));const out={schema:1,pairKey:'French:English',sourceSha256:data.sha256,reviewer:reviewer.value,exportedAt:new Date().toISOString(),decisions};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='french101-form-review-'+data.sha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render();</script></html>`;
const output = resolve('/Users/drive/lt-audio/french-101/form-review-2026-11-09.html');
mkdirSync(resolve('/Users/drive/lt-audio/french-101'), { recursive: true });
writeFileSync(output, html);
console.log(`${rows.length} French form prompts in ${output}`);
