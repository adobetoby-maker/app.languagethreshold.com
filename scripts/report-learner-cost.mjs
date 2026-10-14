import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { monthlySessionCost, RATE_DATE, RATE_SOURCE } from "../src/lib/usage-cost.ts";
const args = Object.fromEntries(
  process.argv.slice(2).map((x) => {
    const [k, ...v] = x.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const output = resolve(args.output || "artifacts/learner-cost-test");
await mkdir(output, { recursive: true });
const measured = JSON.parse(
  await readFile(resolve(args.input || output + "/session-measurements.json"), "utf8"),
);
const rows = measured.records;
const profiles = [
  {
    id: "light",
    name: "Light",
    sessionsPerWeek: 2,
    minutes: 15,
    lookups: 3,
    repeats: 1,
    stories: 0.5,
    batches: 0.25,
    grammar: 0.5,
    turns: 2,
    voiceCharacters: 1200,
  },
  {
    id: "regular",
    name: "Regular",
    sessionsPerWeek: 5,
    minutes: 30,
    lookups: 5,
    repeats: 2,
    stories: 1,
    batches: 1,
    grammar: 1,
    turns: 5,
    voiceCharacters: 4000,
  },
  {
    id: "heavy",
    name: "Heavy",
    sessionsPerWeek: 7,
    minutes: 60,
    lookups: 10,
    repeats: 4,
    stories: 2,
    batches: 1,
    grammar: 2,
    turns: 15,
    voiceCharacters: 12000,
  },
];
function mean(feature) {
  const r = rows.filter((x) => x.feature === feature);
  if (!r.length || r.some((x) => x.status !== "PASS" || x.costUsd == null)) return null;
  return r.reduce((s, x) => s + x.costUsd, 0) / r.length;
}
function chat(feature, n) {
  const r = rows.filter((x) => x.feature === feature && x.turn <= n);
  if (r.length !== n || r.some((x) => x.status !== "PASS" || x.costUsd == null)) return null;
  return r.reduce((s, x) => s + x.costUsd, 0);
}
function session(p) {
  const parts = [
    ["word-lookup", p.lookups],
    ["repeat-lookup", p.repeats],
    ["story", p.stories],
    ["custom-cards", p.batches],
    ["grammar", p.grammar],
  ].map(([feature, count]) => {
    const unit = mean(feature);
    return { feature, count, costUsd: unit == null ? null : unit * count };
  });
  for (const f of ["tutor", "speaking"])
    parts.push({ feature: f, count: p.turns, costUsd: chat(f, p.turns) });
  return {
    ...p,
    parts,
    sessionTextUsd: parts.some((x) => x.costUsd == null)
      ? null
      : parts.reduce((s, x) => s + x.costUsd, 0),
  };
}
const scenarios = profiles.map(session);
const models = [
  ...new Set(rows.flatMap((r) => (r.metering?.providerCalls ? [r.metering.model] : []))),
];
const data = {
  measuredAt: measured.measuredAt,
  rateDate: RATE_DATE,
  models,
  scenarios,
  records: rows,
  voiceCapability: rows.find((r) => r.feature === "cloud-voice-capability"),
  notes: [
    "Workload estimates are not observed customer averages.",
    "Only successful measured provider receipts are priced; failures/missing measurements remain unknown.",
    "Voice characters are modeled per session; a sample synthesis is measured only if cloud voices are configured.",
    "Rates exclude free-tier credits, discounts, tax and invoice-only retries.",
    "Shared hosting, database, email, monitoring, storage and processing fees need actual invoices.",
    "Spanish benchmark excludes the separate Pashto/ElevenLabs path.",
  ],
};
await writeFile(resolve(output, "monthly-cost-model.json"), JSON.stringify(data, null, 2));
const csv = [
  "profile,sessions_per_week,sessions_per_month,text_api_per_session_usd,monthly_device_voice_usd,monthly_neural2_usd,monthly_chirp3_hd_usd",
];
for (const p of scenarios) {
  const m = (52 / 12) * p.sessionsPerWeek;
  csv.push(
    [
      p.name,
      p.sessionsPerWeek,
      m,
      p.sessionTextUsd ?? "",
      ...[0, 16, 30].map((rate) =>
        p.sessionTextUsd == null
          ? ""
          : monthlySessionCost(
              p.sessionTextUsd + (p.voiceCharacters * rate) / 1e6,
              p.sessionsPerWeek,
            ),
      ),
    ].join(","),
  );
}
await writeFile(resolve(output, "monthly-cost-scenarios.csv"), csv.join("\n") + "\n");
const json = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Language Threshold · learner cost test</title><style>body{background:#0c1729;color:#edf2fa;font:16px/1.5 system-ui;margin:32px auto;max-width:1100px;padding:0 20px}h1,h2{color:#e5c671}section{background:#16243c;border:1px solid #34435c;padding:22px;border-radius:16px;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}label{display:block}input,select{display:block;width:95%;padding:9px;margin:6px 0;background:#0d182a;color:white;border:1px solid #68768e;border-radius:6px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;border-bottom:1px solid #46516a;text-align:left}.scroll{overflow:auto}small,.muted{color:#b4c0d4}a{color:#8ad4ed}.money{font-size:32px;font-weight:700;color:#e5c671}.unknown{color:#ffc49b}@media print{body{background:white;color:black}section{background:white}input,select{color:black;background:white}h1,h2,.money{color:#203650}}</style><h1>What does a monthly learner cost?</h1><p>Measured text API usage, with editable monthly activity and cloud voice assumptions. This is a usage estimate, not a provider invoice.</p><p id="summary"></p><section><h2>Monthly planning calculator</h2><div class="grid"><label>Learning pattern<select id="profile"><option value="light">Light</option><option value="regular" selected>Regular</option><option value="heavy">Heavy</option></select></label><label>Sessions each week<input id="sessions" type="number" min="0" max="50" step="0.5" value="5"></label><label>Voice provider scenario<select id="voice"><option value="0">Device voice · no cloud TTS</option><option value="16">Google Neural2 · $16 / million characters</option><option value="30">Google Chirp 3 HD · $30 / million characters</option></select></label><label>Cloud voice characters / session<input id="characters" type="number" min="0" max="1000000" value="4000"></label><label>Planning buffer (%)<input id="buffer" type="number" min="0" max="200" value="25"></label><label>Monthly active users<input id="users" type="number" min="1" value="100"></label><label>Shared monthly invoice costs ($)<input id="shared" type="number" min="0" step="0.01" placeholder="Enter actual hosting, database, email…"></label></div><p class="money" id="variable"></p><p id="breakdown"></p><p id="loaded"></p><small>The buffer is a planning assumption. No free-tier credits are applied. Unentered shared costs remain unknown.</small></section><section><h2>Example monthly usage scenarios</h2><p>Gross API costs before the planning buffer or shared expenses. The Heavy case uses 15 measured turns per conversation; it is unavailable if only five turns were tested.</p><div class="scroll"><table><thead><tr><th>Pattern</th><th>Sessions / week</th><th>Device voice</th><th>Neural2 voice</th><th>Chirp 3 HD voice</th></tr></thead><tbody id="scenarios"></tbody></table></div></section><section><h2>Measured session activity</h2><p>Existing flashcard reviews need no new model call. Repeated lookups use their observed receipt, which may or may not be an application-cache hit.</p><div class="scroll"><table><thead><tr><th>Action</th><th>Turn</th><th>Result</th><th>Model</th><th>Input</th><th>Output</th><th>Cache read</th><th>Cost USD</th></tr></thead><tbody id="receipts"></tbody></table></div></section><section><h2>What remains outside this estimate?</h2><ul id="notes"></ul><p>Rate sources, checked ${RATE_DATE}: <a href="${RATE_SOURCE}">Anthropic API pricing</a>; <a href="https://cloud.google.com/text-to-speech/pricing">Google voice pricing</a>.</p><p>Tutor routes currently measured on Sonnet 4.6 must not be costed as Sonnet 5.5. A future model change needs a fresh run because output length and tokenizer behavior can change.</p></section><script type="application/json" id="data">${json}</script><script>
const d=JSON.parse(document.getElementById('data').textContent),el=id=>document.getElementById(id),money=n=>n==null?'Unmeasured':'$'+n.toFixed(n<0.01?4:2),monthly=(s,w)=>s*w*52/12;
el('summary').textContent='Measured '+d.measuredAt+' · Models: '+d.models.join(', ')+'. Cloud voice configured: '+(d.voiceCapability?.ready?'yes':'not verified/available in this run')+'.';
for(const p of d.scenarios){const tr=document.createElement('tr');for(const v of[p.name,p.sessionsPerWeek,...[0,16,30].map(rate=>p.sessionTextUsd==null?'Unmeasured':money(monthly(p.sessionTextUsd+p.voiceCharacters*rate/1e6,p.sessionsPerWeek)))]){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}el('scenarios').appendChild(tr)}
for(const r of d.records){const tr=document.createElement('tr');for(const v of[r.feature,r.turn??'',r.status,r.metering?.model??r.voice??'',r.metering?.inputTokens??'',r.metering?.outputTokens??'',r.metering?.cacheReadTokens??'',money(r.costUsd)]){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}el('receipts').appendChild(tr)}for(const n of d.notes){const li=document.createElement('li');li.textContent=n;el('notes').appendChild(li)}
function update(){const p=d.scenarios.find(x=>x.id===el('profile').value);const w=Math.max(0,Number(el('sessions').value)),chars=Math.max(0,Number(el('characters').value)),rate=Number(el('voice').value),buffer=Math.max(0,Number(el('buffer').value));if(p.sessionTextUsd==null){el('variable').textContent='This pattern needs complete measurements';el('breakdown').textContent='';el('loaded').textContent='';return}const ai=monthly(p.sessionTextUsd,w),tts=monthly(chars*rate/1e6,w),variable=(ai+tts)*(1+buffer/100);el('variable').textContent=money(variable)+' / active learner / month';el('breakdown').textContent='Text AI '+money(ai)+' + voice '+money(tts)+' + '+buffer+'% planning buffer. '+(w*52/12).toFixed(1)+' sessions/month.';const shared=el('shared').value;el('loaded').textContent=shared===''?'Enter shared invoice totals to estimate the allocated monthly cost.':'With shared expenses: '+money(variable+Number(shared)/Math.max(1,Number(el('users').value)))+' / active learner / month; excludes any expenses not entered.';}
for(const id of['sessions','voice','characters','buffer','users','shared'])el(id).addEventListener('input',update);el('profile').addEventListener('change',()=>{const p=d.scenarios.find(x=>x.id===el('profile').value);el('sessions').value=p.sessionsPerWeek;el('characters').value=p.voiceCharacters;update()});update();</script></html>`;
await writeFile(resolve(output, "Learner_Cost_Calculator.html"), html);
console.log(
  JSON.stringify(
    {
      models,
      scenarios: scenarios.map((p) => ({
        profile: p.name,
        textPerSession: p.sessionTextUsd,
        monthlyDevice:
          p.sessionTextUsd == null ? null : monthlySessionCost(p.sessionTextUsd, p.sessionsPerWeek),
      })),
    },
    null,
    2,
  ),
);
