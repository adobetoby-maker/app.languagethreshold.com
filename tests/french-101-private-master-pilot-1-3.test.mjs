import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCurriculum } from '../src/data/curriculum.ts';
import { validateStageFile } from '../src/lib/core60-validate.ts';
import { contentLimitsFor, validateLessonContent } from '../src/lib/lesson-content-core.ts';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const fixture = load('content/french-basics/private-runtime-master-1-3.json');
const draft = load(fixture.draftPath);
const overlay = load(fixture.supportOverlayPath);

test('Master 1–3 is a private, source-pinned French/English fragment with stable IDs', () => {
  assert.equal(fixture.privatePilot, true);
  assert.equal(fixture.registered, false);
  assert.equal(fixture.reviewed, false);
  assert.equal(fixture.audioStatus, 'script-only; no recorded audio');
  assert.equal(fixture.target, 'French');
  assert.equal(fixture.native, 'English');
  assert.equal(fixture.draftSha256, sha(fixture.draftPath));
  assert.equal(fixture.supportOverlaySha256, sha(fixture.supportOverlayPath));
  for (const [pathKey, hashKey] of [['curriculumMap','curriculumMapSha256'], ['legacySpanishEnglishSource','legacySpanishEnglishSourceSha256'], ['legacyFrenchDraft','legacyFrenchDraftSha256']]) {
    assert.equal(fixture.source[hashKey], sha(fixture.source[pathKey]));
  }
  assert.equal(fixture.masterStageFragment.module, 'master-french-basics');
  assert.equal(getCurriculum('french-basics'), null);
  assert.equal(getCurriculum('spanish-basics')?.lessons.length, 30);
  assert.deepEqual(fixture.support.map(x => x.stableLessonKey), ['master-french-basics:1','master-french-basics:2','master-french-basics:3']);
  const errors = validateStageFile(fixture.masterStageFragment, { moduleId:'master-french-basics', stage:'master', language:'French' });
  assert.deepEqual(errors, ['a master has 20 lessons, found 3']);
});

test('all new Master cards, Reader lines, dialogue, checks and six modes retain bilingual pairs', () => {
  assert.equal(fixture.support.length, 3);
  for (let i = 0; i < 3; i++) {
    const source = draft.lessons[i];
    const lesson = fixture.masterStageFragment.lessons[i];
    const support = fixture.support[i];
    assert.equal(lesson.n, i + 1);
    const selection = overlay.stageSelection[i];
    const expectedStage = [...source.words.slice(0,8).map(w => ({es:w.fr,en:w.en,kind:w.kind})),...selection.supplementalTerms.map(w => ({es:w.target,en:w.native,kind:'term'})),...selection.readerLineIndexes.map(index => ({es:source.reading.target[index],en:source.reading.native[index],kind:'phrase'}))];
    assert.deepEqual(lesson.words, expectedStage);
    assert.deepEqual(support.stageCards, expectedStage.map(w => ({target:w.es,native:w.en,kind:w.kind})));
    assert.deepEqual(support.backlogCards, source.words.slice(8).filter((_, index) => !selection.readerLineIndexes.includes(index)).map(w => ({target:w.fr,native:w.en,kind:w.kind})));
    assert.deepEqual(support.cards, source.words.map(w => ({target:w.fr, native:w.en, kind:w.kind})));
    assert.deepEqual(support.reader, source.reading);
    assert.deepEqual(support.dialogue, source.dialogue.map(line => { const [target, native] = line.split('|'); return {target:target.trim(), native:native.trim()}; }));
    assert.deepEqual(support.checks, source.checks);
    assert.deepEqual(support.speaking, source.speaking);
    assert.deepEqual(support.sourceGrammarNotes, source.grammar);
    assert.equal(support.grammarNotes.caution, overlay.cautionOverrides[i].to);
    assert.equal(overlay.cautionOverrides[i].from, source.grammar.caution);
    assert.deepEqual(Object.keys(support.modes).sort(), ['see','recall','hear','type','say','write'].sort());
    assert.equal(support.recordedAudio, false);
    assert.equal(support.cards.length, 20);
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
