#!/usr/bin/env node
// Generate a local, source-pinned worksheet. Reviewer observations never set release flags.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'content/japanese-basics/private-form-runtime-preview-ja-en.json');
const source = readFileSync(sourcePath);
const preview = JSON.parse(source);
if (preview.pairKey !== 'Japanese:English' || preview.registered !== false ||
    preview.reviewed !== false || preview.lessonCount !== 60 || preview.promptCount !== 235)
  throw new Error('Japanese 101 form preview is not the expected private candidate');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const rows = preview.lessons.flatMap(lesson => lesson.activities
  .filter(activity => activity.mode === 'produce-target')
  .map(activity => ({
    lesson: `${lesson.moduleId} ${lesson.lessonNumber}`,
    lessonDefinitionId: lesson.lessonDefinitionId,
    id: activity.sourcePromptId,
    english: activity.cue,
    japanese: activity.answer,
    variants: activity.knownJapaneseVariants,
    focus: activity.focus,
    sourceTurn: activity.sourceDialogueTurn,
  })));
if (rows.length !== 235 || new Set(rows.map(row => row.id)).size !== 235)
  throw new Error('Japanese 101 review rows changed');
const payload = JSON.stringify({ sourceSha256, rows }).replaceAll('</', '<\\/');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Japanese 101 form review</title>
<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:1rem;color:#14212d;background:#f8fafc}header{position:sticky;top:0;background:#f8fafc;padding:.6rem 0;border-bottom:1px solid #ccd;z-index:1}button,input,textarea,select{font:inherit}button{padding:.55rem .8rem;min-height:44px;margin:.2rem}article{background:#fff;border:1px solid #ccd;border-radius:12px;padding:1rem;margin:1rem 0}article[data-decision="accept"]{border-color:#268653}article[data-decision="revise"]{border-color:#b45309}.jp{font-size:1.35rem}small{color:#445}textarea{width:100%;min-height:3rem}label{display:inline-block;margin:.3rem}select,input{padding:.4rem}#list{margin-top:1rem}</style>
<header><h1>Japanese 101 contextual forms</h1><p>235 source-linked prompts · 60 lessons · private review worksheet. Decisions here are observations only; they do not set reviewed or registered flags.</p><p><label>Reviewer <input id="reviewer" autocomplete="name"></label><label>Filter <select id="filter"><option value="all">All</option><option value="open">Open</option><option value="accept">Accepted wording</option><option value="revise">Needs revision</option></select></label><button id="export">Export decisions JSON</button></p><small id="count"></small></header><main id="list"></main>
<script>const data=${payload};const key='lt-japanese101-form-review-'+data.sourceSha256;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const list=document.getElementById('list');const filter=document.getElementById('filter');const reviewer=document.getElementById('reviewer');reviewer.value=saved.reviewer||'';function persist(){saved.reviewer=reviewer.value;localStorage.setItem(key,JSON.stringify(saved))}reviewer.oninput=persist;filter.onchange=render;function render(){let shown=0;list.innerHTML='';for(const row of data.rows){const state=saved[row.id]||{};if(filter.value!=='all'&&(filter.value==='open'?!!state.decision:state.decision!==filter.value))continue;shown++;const card=document.createElement('article');card.dataset.decision=state.decision||'';card.innerHTML='<small>'+esc(row.lesson)+' · turn '+row.sourceTurn+' · '+esc(row.id)+'</small><p><strong>English cue</strong><br>'+esc(row.english)+'</p><p class="jp" lang="ja"><strong>Japanese answer</strong><br>'+esc(row.japanese)+'</p><p><small>Focus: '+esc(row.focus)+' · recorded variants: '+esc(row.variants.join(' / '))+'</small></p><label>Decision <select><option value="">Open</option><option value="accept">Accept wording</option><option value="revise">Needs revision</option></select></label><label>Notes<br><textarea></textarea></label>';card.innerHTML+='<div class="tryout"><label>Try the Japanese form<br><input class="try-answer" lang="ja" autocomplete="off" spellcheck="false"></label><button type="button" class="try-check">Check this answer</button><small class="try-result" role="status"></small></div>';const choice=card.querySelector('select');const notes=card.querySelector('textarea');choice.value=state.decision||'';notes.value=state.notes||'';const tryInput=card.querySelector('.try-answer');const tryResult=card.querySelector('.try-result');card.querySelector('.try-check').onclick=()=>{const typed=tryInput.value.normalize('NFC').replace(/\\s+/gu,'');const models=[row.japanese,...row.variants].map(value=>value.normalize('NFC').replace(/\\s+/gu,''));tryResult.textContent=!typed?'Enter a Japanese answer first.':models.includes(typed)?'Matches an authored source form. Review the wording yourself.':'Does not match the authored source forms; compare the model above.'};choice.onchange=()=>{saved[row.id]={decision:choice.value,notes:notes.value};persist();render()};notes.oninput=()=>{saved[row.id]={decision:choice.value,notes:notes.value};persist()};list.append(card)}document.getElementById('count').textContent=shown+' shown / '+data.rows.length+' prompts';}document.getElementById('export').onclick=()=>{persist();const decisions=Object.fromEntries(data.rows.map(row=>[row.id,saved[row.id]||{decision:'',notes:''}]));const out={schema:1,pairKey:'Japanese:English',sourceSha256:data.sourceSha256,reviewer:reviewer.value,exportedAt:new Date().toISOString(),decisions};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='japanese101-form-review-'+data.sourceSha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render();</script></html>`;
const output = resolve('/Users/drive/lt-audio/japanese-101/form-review-2026-11-09.html');
mkdirSync(resolve('/Users/drive/lt-audio/japanese-101'), { recursive: true });
writeFileSync(output, html);
console.log(`${rows.length} Japanese form prompts in ${output}`);
