// Review-only inert candidate. Pure ESM: no imports, no side effects at load, no registration, no routes, no audio, no progress writes.
const KIND = 'inert-master14-variant-bridge-fixture';
const MODULE_ID = 'master-japanese-basics';
const LESSON = 14;
const MAIN_SHA = '450c88455988b8738595ef08c4aeaa99cee323339ae7afe7bef37b38dba3c47a';
const PRIVATE_SHA = '29aa18064640ba1ed55514f61c25018e5407e7822d37e99ac68dd7015073c621';
const KANA_SOURCE = 'unchanged canonical kana answer';
const DEPS = ['source form identity', 'Reader turn mapping', 'accepted-answer variants', 'kana reading/group mapping', 'exact-text audio identity', 'saved-item/progress mapping'];
const HAN_CHAR = /[\u3005\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const HAN_ONLY = /^[\u3005\u3400-\u4DBF\u4E00-\u9FFF]+$/;
const KANA_ONLY = /^[\u3041-\u3096\u30FC]+$/;
const CANON_TEXT = /^[\u3041-\u3096\u30FC\u3001\u3002 ]+$/;
const SHA = /^[0-9a-f]{64}$/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const deepFreeze = (v) => {
  if (v !== null && typeof v === 'object') {
    Object.values(v).forEach(deepFreeze);
    Object.freeze(v);
  }
  return v;
};

const pinRow = (n, promptId, mainTurn, privateTurn, focus, ja, en, meaning, unspaced, mixed, mappings) => {
  const id = MODULE_ID + ':' + LESSON + ':orthography:' + n;
  return {
    id,
    sourcePromptId: promptId,
    mainDialogueTurnOneBased: mainTurn,
    privateRoutineDialogueTurnOneBased: privateTurn,
    canonicalJapanese: ja,
    canonicalEnglish: en,
    privateCanonicalPromptEvidence: {
      id: promptId,
      pairKey: 'Japanese:English',
      source: 'aligned-dialogue',
      sourceDialogueTurn: privateTurn,
      focus,
      japaneseAnswer: ja,
      englishPrompt: en,
      knownJapaneseVariants: [ja],
      practice: ['recognize-meaning', 'produce-target'],
      reviewed: false,
    },
    selectedJapanese: null,
    audioScript: null,
    reviewed: false,
    meaningPreservationEnglish: meaning,
    alternatives: [
      { id: id + ':kana-unspaced', kind: 'unspaced-kana', candidateJapanese: unspaced, selectedJapanese: null, audioScript: null, reviewed: false },
      {
        id: id + ':mixed-script',
        kind: 'mixed-script',
        candidateJapanese: mixed,
        readingMappings: mappings.map(([surface, readingKana]) => ({ surface, readingKana })),
        kanaReadingSource: KANA_SOURCE,
        selectedJapanese: null,
        audioScript: null,
        reviewed: false,
      },
    ],
    atomicDependencies: DEPS.slice(),
  };
};

// Pinned copy of the unreviewed SOURCE proposal payload. Module-private, frozen, never returned.
const PIN = deepFreeze({
  kind: KIND,
  pair: { target: 'Japanese', native: 'English' },
  moduleId: MODULE_ID,
  lessonNumber: LESSON,
  reviewed: false,
  registered: false,
  releaseEnabled: false,
  selectedJapanese: null,
  audioScript: null,
  contexts: {
    main: { sourceSha256: MAIN_SHA, turnKey: 'mainDialogueTurnOneBased' },
    privateRoutine: { sourceSha256: PRIVATE_SHA, turnKey: 'privateRoutineDialogueTurnOneBased' },
  },
  rows: [
    pinRow(
      1, 'form-ja-en-b281e81e401f273f', 4, 10, 'delay-result-state',
      'でも、でんしゃが おくれています。',
      'But the train is delayed.',
      'But the train is delayed. Resultative 〜ています is kept: the train is in a delayed state. No change to aspect or tense, and no duration is added.',
      'でも、でんしゃがおくれています。',
      'でも、電車が遅れています。',
      [['電車', 'でんしゃ'], ['遅', 'おく']],
    ),
    pinRow(
      2, 'form-ja-en-e2fe935c347bd01c', 9, 14, 'past-progressive-matteimashita',
      'そのあと えきに つきました。ともだちは まっていました。',
      'After that, I arrived at the station. My friend was waiting.',
      'After that, I arrived at the station. My friend was waiting. The past progressive (〜ていました) is kept as-is; the waiting state is not changed and no duration is added.',
      'そのあとえきにつきました。ともだちはまっていました。',
      'そのあと駅に着きました。友達は待っていました。',
      [['駅', 'えき'], ['着', 'つ'], ['友達', 'ともだち'], ['待', 'ま']],
    ),
  ],
});

// Returns null when a and b are structurally identical (own keys, strict equality), else the path of the first difference.
const diff = (a, b, path) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return path;
    for (let i = 0; i < a.length; i += 1) {
      const d = diff(a[i], b[i], path + '[' + i + ']');
      if (d !== null) return d;
    }
    return null;
  }
  if (isObj(a) || isObj(b)) {
    if (!isObj(a) || !isObj(b)) return path;
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length) return path;
    for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return path;
    for (const k of kb) {
      const d = diff(a[k], b[k], path + '.' + k);
      if (d !== null) return d;
    }
    return null;
  }
  return a === b ? null : path;
};

const allNfc = (v) => {
  if (typeof v === 'string') return v === v.normalize('NFC');
  if (v !== null && typeof v === 'object') return Object.entries(v).every(([k, x]) => k === k.normalize('NFC') && allNfc(x));
  return true;
};

// Positional, non-cascading reading: mappings are consumed left to right, each exactly once, in listed order.
// Any Han character not consumed by the next mapping makes the reading invalid (null).
const positionalReading = (text, mappings) => {
  let out = '';
  let i = 0;
  let mi = 0;
  while (i < text.length) {
    const m = mi < mappings.length ? mappings[mi] : null;
    if (m !== null && text.startsWith(m.surface, i)) {
      out += m.readingKana;
      i += m.surface.length;
      mi += 1;
    } else {
      const ch = text[i];
      if (HAN_CHAR.test(ch)) return null;
      out += ch;
      i += 1;
    }
  }
  return mi === mappings.length ? out : null;
};

const assertRowInvariants = (row) => {
  const ja = row.canonicalJapanese;
  if (typeof ja !== 'string' || !CANON_TEXT.test(ja) || ja !== ja.trim() || ja.includes('  ')) throw new Error('bad canonical text: ' + row.id);
  if (typeof row.canonicalEnglish !== 'string' || row.canonicalEnglish === '') throw new Error('bad canonical English: ' + row.id);
  if (!Number.isInteger(row.mainDialogueTurnOneBased) || row.mainDialogueTurnOneBased < 1) throw new Error('bad main turn: ' + row.id);
  if (!Number.isInteger(row.privateRoutineDialogueTurnOneBased) || row.privateRoutineDialogueTurnOneBased < 1) throw new Error('bad private turn: ' + row.id);
  if (!Array.isArray(row.alternatives) || row.alternatives.length !== 2) throw new Error('need exactly 2 variants: ' + row.id);
  const kana = row.alternatives[0];
  const mixed = row.alternatives[1];
  if (kana.kind !== 'unspaced-kana' || kana.id !== row.id + ':kana-unspaced') throw new Error('bad unspaced-kana identity: ' + row.id);
  if (mixed.kind !== 'mixed-script' || mixed.id !== row.id + ':mixed-script') throw new Error('bad mixed-script identity: ' + row.id);
  if (Object.keys(kana).includes('readingMappings')) throw new Error('stray mappings on unspaced-kana: ' + row.id);
  // Only listed normalization: U+0020 removed from the canonical side. Candidates are never stripped.
  const stripped = ja.split(' ').join('');
  if (kana.candidateJapanese !== stripped) throw new Error('unspaced-kana is not the canonical minus U+0020: ' + row.id);
  const text = mixed.candidateJapanese;
  if (typeof text !== 'string' || text.includes(' ') || !HAN_CHAR.test(text)) throw new Error('bad mixed-script text: ' + row.id);
  if (mixed.kanaReadingSource !== KANA_SOURCE) throw new Error('bad kanaReadingSource: ' + row.id);
  if (!Array.isArray(mixed.readingMappings) || mixed.readingMappings.length === 0) throw new Error('missing mappings: ' + row.id);
  for (const m of mixed.readingMappings) {
    if (!isObj(m) || typeof m.surface !== 'string' || !HAN_ONLY.test(m.surface)) throw new Error('mapping surface must be Han only: ' + row.id);
    if (typeof m.readingKana !== 'string' || !KANA_ONLY.test(m.readingKana)) throw new Error('mapping reading must be hiragana only: ' + row.id);
  }
  if (positionalReading(text, mixed.readingMappings) !== stripped) throw new Error('reading mismatch: ' + row.id);
  if (new Set([ja, kana.candidateJapanese, text]).size !== 3) throw new Error('canonical and variants must be pairwise distinct: ' + row.id);
};

const REJECT = Object.freeze({
  fixtureAccepted: false,
  releaseEnabled: false,
  scoreable: false,
  progressWritable: false,
  canonicalKanaReading: null,
  rowId: null,
  matchedVariantId: null,
});

const NUMBER_FIELDS = new Set(['lessonNumber', 'sourceDialogueTurn']);

// Reads every request field exactly once inside try/catch and returns primitives only, or null.
const readRequest = (req) => {
  try {
    if (!isObj(req)) return null;
    const pair = req.pair;
    if (!isObj(pair)) return null;
    const snap = {
      target: pair.target,
      native: pair.native,
      moduleId: req.moduleId,
      lessonNumber: req.lessonNumber,
      contextKey: req.contextKey,
      sourcePromptId: req.sourcePromptId,
      sourceSha256: req.sourceSha256,
      sourceDialogueTurn: req.sourceDialogueTurn,
      canonicalJapanese: req.canonicalJapanese,
      canonicalEnglish: req.canonicalEnglish,
      input: req.input,
    };
    for (const [k, v] of Object.entries(snap)) {
      if (typeof v !== (NUMBER_FIELDS.has(k) ? 'number' : 'string')) return null;
    }
    return snap;
  } catch {
    return null;
  }
};

export function createDraftVariantBridge(fixtures) {
  let f;
  try {
    f = JSON.parse(JSON.stringify(fixtures));
  } catch {
    throw new Error('fixtures must be JSON-cloneable');
  }
  if (!isObj(f)) throw new Error('fixtures must be a plain object');

  // Own-key allowlist: exactly the pinned keys plus gates. Nothing is read through the prototype chain.
  const expectedKeys = [...Object.keys(PIN), 'gates'].sort();
  const keys = Object.keys(f).sort();
  if (keys.length !== expectedKeys.length || keys.some((k, i) => k !== expectedKeys[i])) throw new Error('fixture top-level keys differ from allowlist');

  // Exact-fixture guard: every pinned field must be structurally identical to the pinned SOURCE copy.
  for (const k of Object.keys(PIN)) {
    const d = diff(f[k], PIN[k], k);
    if (d !== null) throw new Error('fixture differs from pinned source at: ' + d);
  }

  if (!isObj(f.gates)) throw new Error('missing gates');
  const gateNames = Object.keys(f.gates).sort();
  const requiredGates = ["acceptedAnswerVariants", "audioRegistered", "browser", "learnerRuntime", "listeningReviewed", "offline", "qualifiedDictionary", "qualifiedJapanese", "savedProgress", "scoring", "v4"];
  if (gateNames.length !== requiredGates.length || gateNames.some((g, i) => g !== requiredGates[i])) throw new Error('gate identity differs from fixture contract');
  for (const g of gateNames) if (f.gates[g] !== false) throw new Error('nonfalse gate: ' + g);

  if (!allNfc(f)) throw new Error('fixture text is not NFC');

  const mainSha = f.contexts.main.sourceSha256;
  const privateSha = f.contexts.privateRoutine.sourceSha256;
  if (!SHA.test(mainSha) || !SHA.test(privateSha) || mainSha === privateSha) throw new Error('bad context sha');
  const shas = new Map([['main', mainSha], ['privateRoutine', privateSha]]);

  if (f.rows.length !== 2) throw new Error('row count must be 2');
  const rowIds = new Set();
  const promptIds = new Set();
  const variantIds = new Set();
  const mainTurns = new Set();
  const privateTurns = new Set();
  const entries = new Map();
  for (let i = 0; i < f.rows.length; i += 1) {
    const row = f.rows[i];
    if (row.id !== MODULE_ID + ':' + LESSON + ':orthography:' + (i + 1)) throw new Error('bad row id or order at index ' + i);
    assertRowInvariants(row);
    rowIds.add(row.id);
    promptIds.add(row.sourcePromptId);
    mainTurns.add(row.mainDialogueTurnOneBased);
    privateTurns.add(row.privateRoutineDialogueTurnOneBased);
    const accepted = new Map([[row.canonicalJapanese, null]]);
    for (const alt of row.alternatives) {
      variantIds.add(alt.id);
      accepted.set(alt.candidateJapanese, alt.id);
    }
    if (accepted.size !== 3) throw new Error('accepted set must be canonical plus 2 variants: ' + row.id);
    entries.set(row.sourcePromptId, {
      rowId: row.id,
      canonicalJapanese: row.canonicalJapanese,
      canonicalEnglish: row.canonicalEnglish,
      turns: new Map([['main', row.mainDialogueTurnOneBased], ['privateRoutine', row.privateRoutineDialogueTurnOneBased]]),
      accepted,
    });
  }
  if (rowIds.size !== 2 || promptIds.size !== 2 || entries.size !== 2) throw new Error('duplicate row identity');
  if (mainTurns.size !== 2 || privateTurns.size !== 2) throw new Error('duplicate turn');
  if (variantIds.size !== 4) throw new Error('variant count must be 4 with unique ids');

  return Object.freeze({
    releaseEnabled: false,
    registered: false,
    reviewed: false,
    evaluate(request) {
      const s = readRequest(request);
      if (s === null) return REJECT;
      if (s.target !== 'Japanese' || s.native !== 'English') return REJECT;
      if (s.moduleId !== MODULE_ID || s.lessonNumber !== LESSON) return REJECT;
      if (!shas.has(s.contextKey) || s.sourceSha256 !== shas.get(s.contextKey)) return REJECT;
      const e = entries.get(s.sourcePromptId);
      if (e === undefined) return REJECT;
      if (s.sourceDialogueTurn !== e.turns.get(s.contextKey)) return REJECT;
      if (s.canonicalJapanese !== e.canonicalJapanese || s.canonicalEnglish !== e.canonicalEnglish) return REJECT;
      if (!e.accepted.has(s.input)) return REJECT;
      return Object.freeze({
        fixtureAccepted: true,
        releaseEnabled: false,
        scoreable: false,
        progressWritable: false,
        canonicalKanaReading: e.canonicalJapanese,
        rowId: e.rowId,
        matchedVariantId: e.accepted.get(s.input),
      });
    },
  });
}
