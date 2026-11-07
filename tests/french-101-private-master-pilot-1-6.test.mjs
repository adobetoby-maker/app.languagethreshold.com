import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCurriculum } from '../src/data/curriculum.ts';
import { validateStageFile } from '../src/lib/core60-validate.ts';
import { contentLimitsFor, validateLessonContent } from '../src/lib/lesson-content-core.ts';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const fixture = load('content/french-basics/private-runtime-master-1-6.json');
const drafts = fixture.sources.map(x => load(x.draftPath));
const sourceLessons = drafts.flatMap(x => x.lessons);
const overlays = fixture.supportOverlays.map(x => load(x.path));
const cautionOverrides = overlays.flatMap(x => x.cautionOverrides);
const stageSelections = overlays.flatMap(x => x.stageSelection);

test('Master 1–6 is a private, source-pinned French/English fragment with stable IDs', () => {
  assert.equal(fixture.privatePilot, true);
  assert.equal(fixture.registered, false);
  assert.equal(fixture.reviewed, false);
  assert.equal(fixture.audioStatus, 'script-only; no recorded audio');
  assert.equal(fixture.target, 'French');
  assert.equal(fixture.native, 'English');
  assert.equal(fixture.sources[0].draftSha256, sha(fixture.sources[0].draftPath));
  for (const source of fixture.sources) {
    assert.equal(source.draftSha256, sha(source.draftPath));
    for (const [key, expected] of Object.entries(source.source)) if (key.endsWith('Sha256')) assert.equal(expected, sha(source.source[key.slice(0,-6)]));
  }
  for (const overlay of fixture.supportOverlays) assert.equal(overlay.sha256, sha(overlay.path));
  assert.equal(fixture.masterStageFragment.module, 'master-french-basics');
  assert.equal(getCurriculum('french-basics'), null);
  assert.equal(getCurriculum('spanish-basics')?.lessons.length, 30);
  assert.deepEqual(fixture.support.map(x => x.stableLessonKey), [1,2,3,4,5,6].map(n => `master-french-basics:${n}`));
  const errors = validateStageFile(fixture.masterStageFragment, { moduleId:'master-french-basics', stage:'master', language:'French' });
  assert.deepEqual(errors, ['a master has 20 lessons, found 6']);
});

test('all new Master cards, Reader lines, dialogue, checks and six modes retain bilingual pairs', () => {
  assert.equal(fixture.support.length, 6);
  for (let i = 0; i < 6; i++) {
    const source = sourceLessons[i];
    const lesson = fixture.masterStageFragment.lessons[i];
    const support = fixture.support[i];
    assert.equal(lesson.n, i + 1);
    const selection = stageSelections[i];
    const termIndexes = selection.termIndexes ?? [0,1,2,3,4,5,6,7];
    const expectedStage = [...termIndexes.map(index => ({es:source.words[index].fr,en:source.words[index].en,kind:source.words[index].kind})),...selection.supplementalTerms.map(w => ({es:w.target,en:w.native,kind:'term'})),...selection.readerLineIndexes.map(index => ({es:source.reading.target[index],en:source.reading.native[index],kind:'phrase'}))];
    assert.deepEqual(lesson.words, expectedStage);
    assert.deepEqual(support.stageCards, expectedStage.map(w => ({target:w.es,native:w.en,kind:w.kind})));
    assert.deepEqual(support.backlogCards, source.words.filter((_, index) => ![...termIndexes,...selection.readerLineIndexes.map(x => x + 8)].includes(index)).map(w => ({target:w.fr,native:w.en,kind:w.kind})));
    assert.deepEqual(support.cards, source.words.map(w => ({target:w.fr, native:w.en, kind:w.kind})));
    assert.deepEqual(support.reader, source.reading);
    assert.deepEqual(support.dialogue, source.dialogue.map(line => { const [target, native] = line.split('|'); return {target:target.trim(), native:native.trim()}; }));
    assert.deepEqual(support.checks, source.checks);
    assert.deepEqual(support.speaking, source.speaking);
    assert.deepEqual(support.sourceGrammarNotes, source.grammar);
    assert.equal(support.grammarNotes.caution, cautionOverrides[i].to);
    assert.equal(cautionOverrides[i].from, source.grammar.caution);
    const explanationOverride = overlays.flatMap(x => x.explanationOverrides ?? []).find(x => x.lesson === i + 1);
    assert.equal(support.grammarNotes.explanation, explanationOverride?.to ?? source.grammar.explanation);
    if (explanationOverride) assert.equal(explanationOverride.from, source.grammar.explanation);
    assert.deepEqual(Object.keys(support.modes).sort(), ['see','recall','hear','type','say','write'].sort());
    assert.equal(support.recordedAudio, false);
    assert.equal(support.cards.length, 20);
    assert.equal(support.stageCards.length, 20);
    assert.equal(support.reader.target.length, 12);
    assert.equal(support.reader.native.length, 12);
    assert.deepEqual(support.cards.slice(8).map(w => w.target), support.reader.target);
    assert.deepEqual(support.cards.slice(8).map(w => w.native), support.reader.native);
    assert.deepEqual(validateLessonContent({words:lesson.words}, {limits:contentLimitsFor('master-french-basics'), language:'French', nativeLanguage:'English', parts:{words:true, passage:false, verbs:false}}), []);
    for (const value of [lesson, support.cards, support.reader, support.dialogue, support.grammarNotes, support.checks, support.speaking]) {
      assert.doesNotMatch(JSON.stringify(value), /Spanish|espagnol|español/i);
    }
  }
});
