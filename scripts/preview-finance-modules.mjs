// Refresh the curriculum explorer's embedded outline and example cards.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = 'docs/finance-modules';
const blueprint = JSON.parse(readFileSync(`${dir}/blueprint.json`, 'utf8'));
const speakingExamples = JSON.parse(readFileSync(`${dir}/sample-speaking-cards.json`, 'utf8'));
const data = JSON.stringify({ ...blueprint, speakingExamples }).replaceAll('<', '\\u003c');
const path = `${dir}/preview.html`;
const html = readFileSync(path, 'utf8');
if (!html.includes('<script id="data" type="application/json">')) throw new Error('Proposal data tag missing');
writeFileSync(path, html.replace(/(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/, (_, start, end) => start + data + end));
console.log('Updated curriculum explorer. Runtime lesson assets are built separately.');
