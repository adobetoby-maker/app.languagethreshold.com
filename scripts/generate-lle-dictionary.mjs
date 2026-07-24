#!/usr/bin/env node
/**
 * generate-lle-dictionary.mjs
 *
 * Generates 500+ verb entries across 8 categories using Claude Haiku.
 * Writes output to:
 *   scripts/lle-verb-profiles.json   — VerbProfile keyed by infinitive
 *   scripts/lle-word-data.json       — DictWord[] array
 *
 * After generation, run the inject step:
 *   node scripts/generate-lle-dictionary.mjs --inject-only
 *
 * Or run full pipeline:
 *   node scripts/generate-lle-dictionary.mjs
 *
 * Requires ANTHROPIC_API_KEY in env (or .env file in project root).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load .env if present ──────────────────────────────────────────────────────
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set.')
  process.exit(1)
}

// ── Output paths ──────────────────────────────────────────────────────────────
const PROFILES_OUT = join(__dirname, 'lle-verb-profiles.json')
const WORDS_OUT = join(__dirname, 'lle-word-data.json')
const PROFILES_TS = join(ROOT, 'src/components/dictionary/verbProfiles.ts')
const WORDS_TS = join(ROOT, 'src/components/dictionary/wordData.ts')

// ── Verb list by category ─────────────────────────────────────────────────────
// 500+ total across 8 categories
const VERBS_BY_CATEGORY = {
  medical: [
    'examinar', 'inyectar', 'prescribir', 'diagnosticar', 'suturar',
    'hidratar', 'monitorear', 'evaluar', 'reanimar', 'tratar',
    'operar', 'ingresar', 'drenar', 'referir', 'auscultar',
    'palpar', 'radiografiar', 'analizar', 'medicar', 'recetar',
    'hospitalizar', 'transfundir', 'intubar', 'ventilar', 'cateterizar',
    'desinfectar', 'esterilizar', 'amputar', 'rehabilitar', 'fisioterapear',
    'vacunar', 'inmunizar', 'biopsiar', 'endoscopiar', 'ecografiar',
    'extraer', 'incisionar', 'irrigar', 'comprimir', 'inmovilizar',
    'resecar', 'trasplantar', 'dializar', 'oxigenar', 'sediar',
    'anestesiar', 'desfilar', 'sangrar', 'vomitar', 'agonizar',
    'reinfundir', 'dilatar', 'hipertensar', 'estabilizar', 'monitorizar',
    'infiltrar', 'aspirar', 'laparoscopiar', 'tomar', 'controlar',
    'administrar', 'canalizar', 'curar', 'vendarar', 'enfermar',
  ],
  construction: [
    'instalar', 'soldar', 'demoler', 'nivelar', 'excavar',
    'rellenar', 'amarrar', 'impermeabilizar', 'inspeccionar', 'cementar',
    'engrasar', 'tornillar', 'atornillar', 'taladrar', 'cortar',
    'lijar', 'pintar', 'sellar', 'impermeabilizar', 'aislar',
    'encofrar', 'verter', 'vibrar', 'compactar', 'nivelar',
    'medir', 'marcar', 'trazar', 'replantear', 'reforzar',
    'soldar', 'esmerilar', 'doblar', 'cortar', 'izar',
    'descender', 'anclar', 'fijar', 'sujetar', 'asegurar',
    'verificar', 'aprobar', 'certificar', 'demoler', 'derribar',
    'construir', 'edificar', 'estructurar', 'armar', 'desarmar',
    'impermeabilizar', 'revestir', 'acabar', 'pulir', 'ensamblar',
    'montar', 'desmontar', 'reparar', 'mantener', 'renovar',
    'restaurar', 'reformar', 'ampliar', 'reconstruir', 'terraplanar',
  ],
  daily: [
    'hablar', 'comer', 'beber', 'dormir', 'caminar',
    'correr', 'trabajar', 'estudiar', 'comprar', 'vender',
    'vivir', 'morir', 'nacer', 'crecer', 'llegar',
    'salir', 'entrar', 'volver', 'ir', 'venir',
    'tener', 'ser', 'estar', 'hacer', 'poder',
    'querer', 'saber', 'conocer', 'ver', 'oír',
    'dar', 'decir', 'poner', 'traer', 'caer',
    'seguir', 'jugar', 'perder', 'ganar', 'abrir',
    'cerrar', 'escribir', 'leer', 'escuchar', 'mirar',
    'tocar', 'sentir', 'pensar', 'creer', 'recordar',
    'olvidar', 'aprender', 'enseñar', 'explicar', 'preguntar',
    'responder', 'llamar', 'esperar', 'buscar', 'encontrar',
    'usar', 'necesitar', 'querer', 'gustar', 'amar',
    'odiar', 'temer', 'reír', 'llorar', 'gritar',
    'cantar', 'bailar', 'nadar', 'cocinar', 'limpiar',
    'lavar', 'secar', 'planchar', 'conducir', 'manejar',
    'viajar', 'pasar', 'empezar', 'terminar', 'continuar',
    'parar', 'ayudar', 'pedir', 'ofrecer', 'recibir',
    'enviar', 'llevar', 'traer', 'dejar', 'tomar',
    'probar', 'intentar', 'conseguir', 'lograr', 'fallar',
  ],
  mission: [
    'enseñar', 'predicar', 'bautizar', 'orar', 'confesar',
    'bendecir', 'servir', 'ayudar', 'compartir', 'testificar',
    'amar', 'perdonar', 'consagrar', 'ungir', 'santificar',
    'convertir', 'arrepentirse', 'reconciliar', 'discipular', 'evangelizar',
    'invitar', 'visitar', 'anunciar', 'proclamar', 'glorificar',
    'alabar', 'adorar', 'agradecer', 'interceder', 'ministrar',
    'restaurar', 'sanar', 'liberar', 'transformar', 'aconsejar',
    'orientar', 'guiar', 'liderar', 'dirigir', 'inspirar',
  ],
  hospitality: [
    'servir', 'cocinar', 'limpiar', 'preparar', 'reservar',
    'recomendar', 'cobrar', 'pagar', 'atender', 'llevar',
    'traer', 'ofrecer', 'pedir', 'ordenar', 'cancelar',
    'confirmar', 'registrar', 'alojar', 'desalojar', 'recibir',
    'despedir', 'bienventar', 'asistir', 'acompañar', 'guiar',
    'orientar', 'explicar', 'mostrar', 'presentar', 'incluir',
    'excluir', 'separar', 'juntar', 'organizar', 'decorar',
    'arreglar', 'lavar', 'planchar', 'doblar', 'tender',
    'desinfectar', 'sanitizar', 'perfumar', 'climatizar', 'iluminar',
  ],
  sports: [
    'entrenar', 'jugar', 'correr', 'saltar', 'lanzar',
    'atrapar', 'defender', 'atacar', 'marcar', 'ganar',
    'perder', 'competir', 'practicar', 'mejorar', 'lesionarse',
    'recuperar', 'estirar', 'calentar', 'enfriar', 'fortalecer',
    'resistir', 'aguantar', 'superar', 'vencer', 'arbitrar',
    'sancionar', 'expulsar', 'sustituir', 'rotar', 'descansar',
    'cronometrar', 'marcar', 'patear', 'golpear', 'bloquear',
    'esquivar', 'driblar', 'pasar', 'asistir', 'celebrar',
    'protestar', 'motivar', 'animar', 'apoyar', 'concentrarse',
  ],
  business: [
    'vender', 'comprar', 'negociar', 'firmar', 'contratar',
    'presentar', 'reportar', 'facturar', 'cobrar', 'pagar',
    'organizar', 'planificar', 'dirigir', 'supervisar', 'delegar',
    'evaluar', 'auditar', 'revisar', 'aprobar', 'rechazar',
    'invertir', 'financiar', 'presupuestar', 'cotizar', 'licitar',
    'importar', 'exportar', 'distribuir', 'comercializar', 'promover',
    'publicitar', 'promocionar', 'expandir', 'crecer', 'fusionar',
    'adquirir', 'liquidar', 'disolver', 'registrar', 'incorporar',
    'capitalizar', 'apalancar', 'diversificar', 'rentabilizar', 'optimizar',
    'automatizar', 'digitalizar', 'externalizar', 'tercerizar', 'innovar',
  ],
  academic: [
    'estudiar', 'aprender', 'enseñar', 'leer', 'escribir',
    'investigar', 'analizar', 'presentar', 'evaluar', 'calificar',
    'explicar', 'comprender', 'memorizar', 'practicar', 'repasar',
    'resumir', 'redactar', 'citar', 'referir', 'argumentar',
    'debatir', 'discutir', 'comparar', 'contrastar', 'sintetizar',
    'formular', 'hipotizar', 'demostrar', 'probar', 'refutar',
    'publicar', 'investigar', 'experimentar', 'observar', 'medir',
    'calcular', 'clasificar', 'categorizar', 'organizar', 'sistematizar',
    'documentar', 'registrar', 'archivar', 'recuperar', 'actualizar',
    'revisar', 'corregir', 'mejorar', 'perfeccionar', 'dominar',
  ],
}

// ── Claude Haiku API call ─────────────────────────────────────────────────────
async function generateVerbProfile(verb, category) {
  const prompt = `You are a Spanish linguistics expert. Generate a complete verb profile for the Spanish verb "${verb}" used in a ${category} context.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "stem": "habl",
  "infinitiveEnding": "-ar",
  "irregularType": null,
  "phase1": {
    "label": "Phase 1 — Commands & Present",
    "hint": "Commands + yo/tú/él forms",
    "imperativeFormal": { "full": "hable", "stem": "habl", "ending": "e", "irregular": false },
    "imperativeInformal": { "full": "habla", "stem": "habl", "ending": "a", "irregular": false },
    "presentYo": { "full": "hablo", "stem": "habl", "ending": "o", "irregular": false },
    "presentTu": { "full": "hablas", "stem": "habl", "ending": "as", "irregular": false },
    "presentEl": { "full": "habla", "stem": "habl", "ending": "a", "irregular": false }
  },
  "phase2": {
    "label": "Phase 2 — Gerund & We Forms",
    "hint": "Progressive + nosotros/ellos",
    "gerund": { "full": "hablando", "stem": "habl", "ending": "ando", "irregular": false },
    "pastParticiple": { "full": "hablado", "stem": "habl", "ending": "ado", "irregular": false },
    "presentNosotros": { "full": "hablamos", "stem": "habl", "ending": "amos", "irregular": false },
    "presentEllos": { "full": "hablan", "stem": "habl", "ending": "an", "irregular": false }
  },
  "phase3": {
    "label": "Phase 3 — Subjunctive & Preterite",
    "hint": "Key tenses for fluency",
    "subjunctiveEl": { "full": "hable", "stem": "habl", "ending": "e", "irregular": false },
    "subjunctiveTu": { "full": "hables", "stem": "habl", "ending": "es", "irregular": false },
    "preteriteYo": { "full": "hablé", "stem": "habl", "ending": "é", "irregular": false },
    "preteriteEl": { "full": "habló", "stem": "habl", "ending": "ó", "irregular": false }
  },
  "englishParallel": "to speak",
  "clinicalNote": "Common in professional settings for direct communication."
}

Rules:
- stem + ending must concatenate to equal full (e.g. "habl" + "o" = "hablo")
- Mark irregular: true and add irregularNote for any irregular forms
- irregularType: one of null, "stem-change", "go-verb", "irregular", "reflexive-change"
- clinicalNote: one practical sentence about using this verb in ${category} contexts
- englishParallel: the English infinitive`

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

  // Extract JSON from response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response for "${verb}": ${text.slice(0, 200)}`)

  return JSON.parse(match[0])
}

async function generateWordEntry(verb, category, profile) {
  const prompt = `Generate 2 example sentences for the Spanish verb "${verb}" in a ${category} context.
Return ONLY a JSON array with this exact structure:
[
  { "spanish": "El médico examina al paciente.", "english": "The doctor examines the patient." },
  { "spanish": "Necesito examinar esta herida.", "english": "I need to examine this wound." }
]
No markdown, no explanation. Just the JSON array.`

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

// Auto-generated by scripts/generate-lle-dictionary.mjs
// Do not edit manually — re-run the generation script instead.
export const verbProfiles: Record<string, VerbProfile> = ${JSON.stringify(profilesJson, null, 2)}
`

  const wordsContent = `import type { DictWord } from './types'

// Auto-generated by scripts/generate-lle-dictionary.mjs
// Do not edit manually — re-run the generation script instead.
export const dictWords: DictWord[] = ${JSON.stringify(wordsJson, null, 2)}
`

  writeFileSync(PROFILES_TS, profilesContent, 'utf8')
  console.log(`  verbProfiles.ts written (${Object.keys(profilesJson).length} profiles)`)

  writeFileSync(WORDS_TS, wordsContent, 'utf8')
  console.log(`  wordData.ts written (${wordsJson.length} words)`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--inject-only')) {
  // Just inject from existing JSON files
  if (!existsSync(PROFILES_OUT) || !existsSync(WORDS_OUT)) {
    console.error('ERROR: Run generation first (without --inject-only).')
    process.exit(1)
  }
  const profiles = JSON.parse(readFileSync(PROFILES_OUT, 'utf8'))
  const words = JSON.parse(readFileSync(WORDS_OUT, 'utf8'))
  injectIntoTs(profiles, words)
  process.exit(0)
}

// ── Full generation pipeline ──────────────────────────────────────────────────

// Load any existing profiles to allow resuming
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
const processedVerbs = new Set(allWords.map((w) => w.spanish))

let totalGenerated = 0
let totalSkipped = 0
let totalErrors = 0

for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
  console.log(`\n── Category: ${category} (${verbs.length} verbs) ──`)

  // Deduplicate within category
  const uniqueVerbs = [...new Set(verbs)]

  for (const verb of uniqueVerbs) {
    if (processedVerbs.has(verb)) {
      totalSkipped++
      continue
    }

    process.stdout.write(`  ${verb}... `)

    try {
      const profile = await generateVerbProfile(verb, category)
      const examples = await generateWordEntry(verb, category, profile)

      allProfiles[verb] = profile

      const wordEntry = {
        id: `${category}-${verb}`,
        spanish: verb,
        english: profile.englishParallel,
        pronunciation: verb, // simplified — could add IPA generation
        partOfSpeech: 'verb',
        category,
        context: profile.clinicalNote,
        verbProfileId: verb,
        examples,
      }

      allWords.push(wordEntry)
      processedVerbs.add(verb)
      totalGenerated++

      // Save progress every 10 verbs
      if (totalGenerated % 10 === 0) {
        writeFileSync(PROFILES_OUT, JSON.stringify(allProfiles, null, 2), 'utf8')
        writeFileSync(WORDS_OUT, JSON.stringify(allWords, null, 2), 'utf8')
        process.stdout.write(`[saved] `)
      }

      console.log(`✓`)

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      console.log(`✗ ${err.message}`)
      totalErrors++
    }
  }
}

// Final save
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

// Auto-inject
injectIntoTs(allProfiles, allWords)

console.log('\nDone. Run `npm run build` to verify TypeScript.')
