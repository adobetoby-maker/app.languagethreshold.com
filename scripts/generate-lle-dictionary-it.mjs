#!/usr/bin/env node
/**
 * generate-lle-dictionary-it.mjs
 *
 * Italian counterpart to generate-lle-dictionary.mjs. Generates verb entries
 * across the same 8 categories used by the Spanish dictionary, using Claude
 * Haiku, and writes:
 *   scripts/lle-verb-profiles-it.json   — VerbProfile keyed by infinitive
 *   scripts/lle-word-data-it.json       — DictWord[] array
 *
 * After generation, run the inject step:
 *   node scripts/generate-lle-dictionary-it.mjs --inject-only
 *
 * Or run full pipeline:
 *   node scripts/generate-lle-dictionary-it.mjs
 *
 * Requires ANTHROPIC_API_KEY in env (or .env / .env.local in project root).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load .env / .env.local if present ─────────────────────────────────────────
for (const envFile of ['.env', '.env.local']) {
  const envPath = join(ROOT, envFile)
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set.')
  process.exit(1)
}

// ── Output paths ──────────────────────────────────────────────────────────────
const PROFILES_OUT = join(__dirname, 'lle-verb-profiles-it.json')
const WORDS_OUT = join(__dirname, 'lle-word-data-it.json')
const PROFILES_TS = join(ROOT, 'src/components/dictionary/italianVerbProfiles.ts')
const WORDS_TS = join(ROOT, 'src/components/dictionary/italianWordData.ts')

// ── Verb list by category — Italian equivalents of the Spanish set ───────────
const VERBS_BY_CATEGORY = {
  medical: [
    'esaminare', 'iniettare', 'prescrivere', 'diagnosticare', 'suturare',
    'idratare', 'monitorare', 'valutare', 'rianimare', 'trattare',
    'operare', 'ricoverare', 'drenare', 'riferire', 'auscultare',
    'palpare', 'radiografare', 'analizzare', 'medicare', 'ospedalizzare',
    'trasfondere', 'intubare', 'ventilare', 'incannulare', 'disinfettare',
    'sterilizzare', 'amputare', 'riabilitare', 'vaccinare', 'immunizzare',
    'biopsiare', 'estrarre', 'incidere', 'irrigare', 'comprimere',
    'immobilizzare', 'resecare', 'trapiantare', 'dializzare', 'ossigenare',
    'sedare', 'anestetizzare', 'defibrillare', 'sanguinare', 'vomitare',
    'dilatare', 'stabilizzare', 'infiltrare', 'aspirare', 'somministrare',
    'curare', 'bendare', 'ammalarsi', 'guarire', 'peggiorare',
    'migliorare', 'respirare', 'tossire', 'starnutire', 'controllare',
  ],
  construction: [
    'installare', 'saldare', 'demolire', 'livellare', 'scavare',
    'riempire', 'legare', 'impermeabilizzare', 'ispezionare', 'cementare',
    'ingrassare', 'avvitare', 'trapanare', 'tagliare', 'levigare',
    'verniciare', 'sigillare', 'isolare', 'casserare', 'versare',
    'vibrare', 'compattare', 'misurare', 'marcare', 'tracciare',
    'rinforzare', 'smerigliare', 'piegare', 'sollevare', 'scendere',
    'ancorare', 'fissare', 'assicurare', 'verificare', 'approvare',
    'certificare', 'abbattere', 'costruire', 'edificare', 'strutturare',
    'montare', 'smontare', 'riparare', 'mantenere', 'rinnovare',
    'restaurare', 'ristrutturare', 'ampliare', 'ricostruire', 'rivestire',
    'rifinire', 'lucidare', 'assemblare', 'murare', 'intonacare',
    'piastrellare',
  ],
  daily: [
    'parlare', 'mangiare', 'bere', 'dormire', 'camminare',
    'correre', 'lavorare', 'studiare', 'comprare', 'vendere',
    'vivere', 'morire', 'nascere', 'crescere', 'arrivare',
    'uscire', 'entrare', 'tornare', 'andare', 'venire',
    'avere', 'essere', 'stare', 'fare', 'potere',
    'volere', 'sapere', 'conoscere', 'vedere', 'sentire',
    'dare', 'dire', 'mettere', 'portare', 'cadere',
    'seguire', 'giocare', 'perdere', 'vincere', 'aprire',
    'chiudere', 'scrivere', 'leggere', 'ascoltare', 'guardare',
    'toccare', 'pensare', 'credere', 'ricordare', 'dimenticare',
    'imparare', 'insegnare', 'spiegare', 'domandare', 'rispondere',
    'chiamare', 'aspettare', 'cercare', 'trovare', 'usare',
    'necessitare', 'amare', 'odiare', 'temere', 'ridere',
    'piangere', 'gridare', 'cantare', 'ballare', 'nuotare',
    'cucinare', 'pulire', 'lavare', 'asciugare', 'stirare',
    'guidare', 'viaggiare', 'passare', 'cominciare', 'finire',
    'continuare', 'fermare', 'aiutare', 'chiedere', 'offrire',
    'ricevere', 'inviare', 'lasciare', 'prendere', 'provare',
    'tentare', 'ottenere', 'riuscire', 'fallire',
  ],
  mission: [
    'insegnare', 'predicare', 'battezzare', 'pregare', 'confessare',
    'benedire', 'servire', 'aiutare', 'condividere', 'testimoniare',
    'amare', 'perdonare', 'consacrare', 'ungere', 'santificare',
    'convertire', 'pentirsi', 'riconciliare', 'evangelizzare', 'invitare',
    'visitare', 'annunciare', 'proclamare', 'glorificare', 'lodare',
    'adorare', 'ringraziare', 'intercedere', 'ministrare', 'restaurare',
    'guarire', 'liberare', 'trasformare', 'consigliare', 'orientare',
    'guidare', 'condurre', 'ispirare',
  ],
  hospitality: [
    'servire', 'cucinare', 'pulire', 'preparare', 'prenotare',
    'raccomandare', 'addebitare', 'pagare', 'assistere', 'portare',
    'offrire', 'ordinare', 'cancellare', 'confermare', 'registrare',
    'alloggiare', 'sloggiare', 'ricevere', 'congedare', 'accogliere',
    'accompagnare', 'guidare', 'orientare', 'spiegare', 'mostrare',
    'presentare', 'includere', 'escludere', 'separare', 'riunire',
    'organizzare', 'decorare', 'sistemare', 'lavare', 'stirare',
    'piegare', 'stendere', 'disinfettare', 'sanificare', 'profumare',
    'climatizzare', 'illuminare',
  ],
  sports: [
    'allenare', 'giocare', 'correre', 'saltare', 'lanciare',
    'afferrare', 'difendere', 'attaccare', 'segnare', 'vincere',
    'perdere', 'competere', 'praticare', 'migliorare', 'infortunarsi',
    'recuperare', 'allungare', 'riscaldare', 'raffreddare', 'rafforzare',
    'resistere', 'sopportare', 'superare', 'battere', 'arbitrare',
    'sanzionare', 'espellere', 'sostituire', 'ruotare', 'riposare',
    'cronometrare', 'calciare', 'colpire', 'bloccare', 'schivare',
    'dribblare', 'passare', 'assistere', 'festeggiare', 'protestare',
    'motivare', 'incoraggiare', 'sostenere', 'concentrarsi',
  ],
  business: [
    'vendere', 'comprare', 'negoziare', 'firmare', 'assumere',
    'presentare', 'riportare', 'fatturare', 'addebitare', 'pagare',
    'organizzare', 'pianificare', 'dirigere', 'supervisionare', 'delegare',
    'valutare', 'verificare', 'revisionare', 'approvare', 'rifiutare',
    'investire', 'finanziare', 'preventivare', 'quotare', 'appaltare',
    'importare', 'esportare', 'distribuire', 'commercializzare', 'promuovere',
    'pubblicizzare', 'espandere', 'crescere', 'fondere', 'acquisire',
    'liquidare', 'sciogliere', 'registrare', 'incorporare', 'capitalizzare',
    'diversificare', 'ottimizzare', 'automatizzare', 'digitalizzare', 'esternalizzare',
    'innovare',
  ],
  academic: [
    'studiare', 'imparare', 'insegnare', 'leggere', 'scrivere',
    'ricercare', 'analizzare', 'presentare', 'valutare', 'giudicare',
    'spiegare', 'comprendere', 'memorizzare', 'praticare', 'ripassare',
    'riassumere', 'redigere', 'citare', 'argomentare', 'dibattere',
    'discutere', 'paragonare', 'sintetizzare', 'formulare', 'ipotizzare',
    'dimostrare', 'provare', 'confutare', 'pubblicare', 'sperimentare',
    'osservare', 'misurare', 'calcolare', 'classificare', 'categorizzare',
    'organizzare', 'sistematizzare', 'documentare', 'registrare', 'archiviare',
    'recuperare', 'aggiornare', 'revisionare', 'correggere', 'migliorare',
    'perfezionare', 'padroneggiare',
  ],
}

// ── Claude Haiku API call ─────────────────────────────────────────────────────
async function generateVerbProfile(verb, category) {
  const prompt = `You are an Italian linguistics expert. Generate a complete verb profile for the Italian verb "${verb}" used in a ${category} context.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "stem": "parl",
  "infinitiveEnding": "-are",
  "irregularType": null,
  "phase1": {
    "label": "Phase 1 — Comandi e presente",
    "hint": "Comandi + forme io/tu/lui",
    "imperativeFormal": { "full": "parli", "stem": "parl", "ending": "i", "irregular": false },
    "imperativeInformal": { "full": "parla", "stem": "parl", "ending": "a", "irregular": false },
    "presentYo": { "full": "parlo", "stem": "parl", "ending": "o", "irregular": false },
    "presentTu": { "full": "parli", "stem": "parl", "ending": "i", "irregular": false },
    "presentEl": { "full": "parla", "stem": "parl", "ending": "a", "irregular": false }
  },
  "phase2": {
    "label": "Phase 2 — Gerundio e forme noi/loro",
    "hint": "Progressivo + forme noi/loro",
    "gerund": { "full": "parlando", "stem": "parl", "ending": "ando", "irregular": false },
    "pastParticiple": { "full": "parlato", "stem": "parl", "ending": "ato", "irregular": false },
    "presentNosotros": { "full": "parliamo", "stem": "parl", "ending": "iamo", "irregular": false },
    "presentEllos": { "full": "parlano", "stem": "parl", "ending": "ano", "irregular": false }
  },
  "phase3": {
    "label": "Phase 3 — Congiuntivo e passato remoto",
    "hint": "Tempi chiave per la fluidità",
    "subjunctiveEl": { "full": "parli", "stem": "parl", "ending": "i", "irregular": false },
    "subjunctiveTu": { "full": "parli", "stem": "parl", "ending": "i", "irregular": false },
    "preteriteYo": { "full": "parlai", "stem": "parl", "ending": "ai", "irregular": false },
    "preteriteEl": { "full": "parlò", "stem": "parl", "ending": "ò", "irregular": false }
  },
  "englishParallel": "to speak",
  "clinicalNote": "Common in professional settings for direct communication."
}

Field meanings (Italian grammar, mapped onto this shared schema):
- imperativeFormal: formal imperative (Lei form)
- imperativeInformal: informal imperative (tu form)
- presentYo/presentTu/presentEl: present tense io / tu / lui-lei
- presentNosotros/presentEllos: present tense noi / loro
- gerund: gerundio; pastParticiple: participio passato
- subjunctiveEl/subjunctiveTu: congiuntivo presente lui-lei / tu (note: in most regular verbs these are identical — capture that accurately, don't force them apart)
- preteriteYo/preteriteEl: passato remoto io / lui-lei

Rules:
- stem + ending must concatenate to equal full (e.g. "parl" + "o" = "parlo")
- infinitiveEnding must be exactly one of "-are", "-ere", "-ire" matching this verb's actual conjugation class
- Mark irregular: true and add irregularNote for any irregular forms (essere, avere, and other common irregulars have many — be accurate, don't flatten them into false regularity)
- irregularType: one of null, "stem-change", "irregular", "reflexive", "essere-avere-irregular"
- clinicalNote: one practical sentence about using this verb in ${category} contexts, written in English
- englishParallel: the English infinitive ("to " + verb)`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response for "${verb}": ${text.slice(0, 200)}`)

  return JSON.parse(match[0])
}

async function generateWordEntry(verb, category) {
  const prompt = `Generate 2 example sentences for the Italian verb "${verb}" in a ${category} context.
Return ONLY a JSON array with this exact structure:
[
  { "target": "Il medico esamina il paziente.", "english": "The doctor examines the patient." },
  { "target": "Devo esaminare questa ferita.", "english": "I need to examine this wound." }
]
No markdown, no explanation. Just the JSON array. "target" must be natural Italian.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

// ── Inject into TypeScript source ────────────────────────────────────────────
function injectIntoTs(profilesJson, wordsJson) {
  console.log('\n── Injecting into TypeScript source files ──')

  const profilesContent = `import type { VerbProfile } from './types'

// Auto-generated by scripts/generate-lle-dictionary-it.mjs
// Do not edit manually — re-run the generation script instead.
export const italianVerbProfiles: Record<string, VerbProfile> = ${JSON.stringify(profilesJson, null, 2)}
`

  const wordsContent = `import type { DictWord } from './types'

// Auto-generated by scripts/generate-lle-dictionary-it.mjs
// Do not edit manually — re-run the generation script instead.
export const italianDictWords: DictWord[] = ${JSON.stringify(wordsJson, null, 2)}
`

  writeFileSync(PROFILES_TS, profilesContent, 'utf8')
  console.log(`  italianVerbProfiles.ts written (${Object.keys(profilesJson).length} profiles)`)

  writeFileSync(WORDS_TS, wordsContent, 'utf8')
  console.log(`  italianWordData.ts written (${wordsJson.length} words)`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--inject-only')) {
  if (!existsSync(PROFILES_OUT) || !existsSync(WORDS_OUT)) {
    console.error('ERROR: Run generation first (without --inject-only).')
    process.exit(1)
  }
  const profiles = JSON.parse(readFileSync(PROFILES_OUT, 'utf8'))
  const words = JSON.parse(readFileSync(WORDS_OUT, 'utf8'))
  injectIntoTs(profiles, words)
  process.exit(0)
}

let allProfiles = {}
let allWords = []
if (existsSync(PROFILES_OUT)) {
  try {
    allProfiles = JSON.parse(readFileSync(PROFILES_OUT, 'utf8'))
    console.log(`Resuming: ${Object.keys(allProfiles).length} profiles already generated.`)
  } catch { allProfiles = {} }
}
if (existsSync(WORDS_OUT)) {
  try {
    allWords = JSON.parse(readFileSync(WORDS_OUT, 'utf8'))
  } catch { allWords = [] }
}
const processedVerbs = new Set(allWords.map((w) => w.word))

let totalGenerated = 0
let totalSkipped = 0
let totalErrors = 0

for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
  console.log(`\n── Category: ${category} (${verbs.length} verbs) ──`)

  const uniqueVerbs = [...new Set(verbs)]

  for (const verb of uniqueVerbs) {
    if (processedVerbs.has(verb)) {
      totalSkipped++
      continue
    }

    process.stdout.write(`  ${verb}... `)

    try {
      const profile = await generateVerbProfile(verb, category)
      const examples = await generateWordEntry(verb, category)

      allProfiles[verb] = profile

      const wordEntry = {
        id: `${category}-${verb}`,
        word: verb,
        english: profile.englishParallel,
        pronunciation: verb,
        partOfSpeech: 'verb',
        category,
        context: profile.clinicalNote,
        verbProfileId: verb,
        examples,
      }

      allWords.push(wordEntry)
      processedVerbs.add(verb)
      totalGenerated++

      if (totalGenerated % 10 === 0) {
        writeFileSync(PROFILES_OUT, JSON.stringify(allProfiles, null, 2), 'utf8')
        writeFileSync(WORDS_OUT, JSON.stringify(allWords, null, 2), 'utf8')
        process.stdout.write(`[saved] `)
      }

      console.log(`✓`)

      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      console.log(`✗ ${err.message}`)
      totalErrors++
    }
  }
}

writeFileSync(PROFILES_OUT, JSON.stringify(allProfiles, null, 2), 'utf8')
writeFileSync(WORDS_OUT, JSON.stringify(allWords, null, 2), 'utf8')

console.log(`\n── Generation complete ──`)
console.log(`  Generated: ${totalGenerated}`)
console.log(`  Skipped (already done): ${totalSkipped}`)
console.log(`  Errors: ${totalErrors}`)
console.log(`  Total entries: ${allWords.length}`)
console.log(`\nOutput files:`)
console.log(`  ${PROFILES_OUT}`)
console.log(`  ${WORDS_OUT}`)

injectIntoTs(allProfiles, allWords)

console.log('\nDone. Run `npm run build` to verify TypeScript.')
