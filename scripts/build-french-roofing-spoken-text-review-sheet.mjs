#!/usr/bin/env node
// Private, source-pinned review worksheet. Exported decisions never enable synthesis.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const path = resolve(repo, 'content/french-roofing/private-spoken-text-plan-fr-en.json');
const bytes = readFileSync(path);
const plan = JSON.parse(bytes);
const digest = value => createHash('sha256').update(value).digest('hex');
if (plan.pairKey !== 'French:English' || plan.locale !== 'fr-FR' ||
    plan.reviewed !== false || plan.registered !== false || plan.rows.length !== 264 ||
    plan.counts.dialogueSpeakerLabels !== 193 || plan.counts.headingsOrNarrationForReview !== 71)
  throw new Error('French Roofing spoken-text plan or review gate changed');
const source = readFileSync(resolve(repo, plan.sourceInventoryPath));
if (digest(source) !== plan.sourceInventoryFileSha256)
  throw new Error('French Roofing spoken-text source inventory changed');
const sourceRows = new Map(JSON.parse(source).texts.map(row => [row.sha256, row]));
for (const row of plan.rows) {
  if (row.textReviewed !== false || row.listeningReviewed !== false ||
      digest(row.displayText) !== row.displayTextSha256 ||
      sourceRows.get(row.displayTextSha256)?.text !== row.displayText ||
      !row.proposedSpokenText.trim())
    throw new Error(`Unreviewed spoken-text row changed: ${row.displayTextSha256}`);
}
const sourceSha256 = digest(bytes);
const payload = JSON.stringify({ sourceSha256, exactDisplayTextSha256: plan.exactDisplayTextSha256,
  rows: plan.rows.map(row => ({ id: row.displayTextSha256, kind: row.kind, reviewCategory: row.reviewCategory,
    display: row.displayText, proposed: row.proposedSpokenText,
    occurrences: row.sourceOccurrences.map(item => `${item.draftLessonKey} · ${item.field}`) })) }).replaceAll('</', '<\\/');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>French Roofing spoken-text review</title>
<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:1rem;color:#14212d;background:#f8fafc}header{position:sticky;top:0;background:#f8fafc;padding:.6rem 0;border-bottom:1px solid #ccd;z-index:1}article{background:#fff;border:1px solid #ccd;border-radius:12px;padding:1rem;margin:1rem 0}article[data-kind="heading-or-narration-review"]{border-left:4px solid #b45309}label{display:block;margin:.5rem 0}button,select,input,textarea{font:inherit;padding:.45rem}button{min-height:44px}textarea{width:min(96%,780px);min-height:3rem}small{color:#445}.fr{font-size:1.08rem;overflow-wrap:anywhere}</style>
<header><h1>French Roofing spoken-text review</h1><p>264 colon-prefixed exact display strings: 193 speaker-label proposals and 71 full-display decisions (53 quoted prefixes, 13 report headings, 5 narration or instruction lines). Source text stays intact. These decisions do not approve audio or release lessons.</p><label>Reviewer <input id="reviewer"></label><label>Show <select id="filter"><option value="all">All</option><option value="speaker-label">193 speaker proposals</option><option value="quoted-prefix-review">53 quoted prefixes</option><option value="report-heading-review">13 report headings</option><option value="narration-or-instruction-review">5 narration or instructions</option></select></label><button id="export">Export decisions JSON</button><small id="count"></small></header><main id="list"></main>
<script>const data=${payload};const key='lt-fr-roofing-spoken-'+data.exactDisplayTextSha256;const legacyKey='lt-fr-roofing-spoken-6ea2875ae3930ba1e1baf891ee96c3f279faf9efdf1f419f574feccfc0ce9ef3';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem(legacyKey)||'{}')}catch{};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const reviewer=document.getElementById('reviewer');reviewer.value=saved.reviewer||'';const filter=document.getElementById('filter');const list=document.getElementById('list');function persist(){saved.reviewer=reviewer.value;localStorage.setItem(key,JSON.stringify(saved))}reviewer.oninput=persist;filter.onchange=render;function render(){list.innerHTML='';let shown=0;for(const row of data.rows){if(filter.value!=='all'&&filter.value!==row.reviewCategory)continue;shown++;const state=saved[row.id]||{};const card=document.createElement('article');card.dataset.kind=row.kind;card.innerHTML='<small>'+esc(row.reviewCategory)+' · '+esc(row.occurrences.join(' / '))+'</small><p class="fr" lang="fr"><strong>Exact display</strong><br>'+esc(row.display)+'</p><p class="fr" lang="fr"><strong>Proposed speech</strong><br>'+esc(row.proposed)+'</p><label>Decision <select><option value="">Open</option><option value="proposal">Speak proposal</option><option value="display">Speak full display</option><option value="revise">Needs different speech text</option></select></label><label>Custom spoken text, if revising<textarea class="custom"></textarea></label><label>Notes<textarea class="notes"></textarea></label>';const select=card.querySelector('select');const custom=card.querySelector('.custom');const notes=card.querySelector('.notes');select.value=state.decision||'';custom.value=state.custom||'';notes.value=state.notes||'';const save=()=>{saved[row.id]={decision:select.value,custom:custom.value,notes:notes.value};persist()};select.onchange=save;custom.oninput=save;notes.oninput=save;list.append(card)}document.getElementById('count').textContent=shown+' shown / '+data.rows.length+' source strings'}document.getElementById('export').onclick=()=>{persist();const decisions=Object.fromEntries(data.rows.map(row=>[row.id,saved[row.id]||{decision:'',custom:'',notes:''}]));const out={schema:1,pairKey:'French:English',sourceSha256:data.sourceSha256,exactDisplayTextSha256:data.exactDisplayTextSha256,reviewer:reviewer.value,exportedAt:new Date().toISOString(),decisions};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='french-roofing-spoken-review-'+data.sourceSha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render();</script></html>`;
const outDir = '/Users/drive/lt-audio/french-roofing';
const output = resolve(outDir, 'spoken-text-review-2026-11-09.html');
mkdirSync(outDir, { recursive: true });
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== html) throw new Error('French Roofing spoken-text worksheet needs regeneration');
} else {
  writeFileSync(output, html);
}
console.log(`French Roofing spoken-text review: ${plan.rows.length} source-pinned decisions`);
