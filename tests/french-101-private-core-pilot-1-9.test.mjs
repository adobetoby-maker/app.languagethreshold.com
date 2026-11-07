import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCurriculum } from '../src/data/curriculum.ts';
import { validateLessonContent } from '../src/lib/lesson-content-core.ts';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const fixture = load('content/french-basics/private-runtime-core-1-9.json');
const drafts = ['core-1-3-draft.json','core-4-6-draft.json','core-7-9-draft.json'].map(name => load(`content/french-basics/${name}`));
const sourceLessons = drafts.flatMap(d => d.lessons);

test('French Core pilot pins sources and cannot affect registered language progress', () => {
  assert.equal(fixture.privatePilot, true);
  assert.equal(fixture.registered, false);
  assert.equal(fixture.reviewed, false);
  assert.equal(fixture.audioStatus, 'script-only; no recorded audio');
  assert.equal(fixture.target, 'French');
  assert.equal(fixture.native, 'English');
  assert.equal(fixture.coreCurriculum.moduleId, 'french-basics');
  for (const source of fixture.sources) {
    assert.equal(source.draftSha256, sha(source.draftPath));
    assert.equal(source.englishSourceSha256, sha(source.englishSourcePath));
    for (const [path, hash] of Object.entries(source.sourceFileSha256)) assert.equal(sha(path), hash);
  }
  assert.equal(getCurriculum('french-basics'), null);
  assert.equal(getCurriculum('spanish-basics')?.lessons.length, 30);
  assert.notEqual(fixture.coreCurriculum.moduleId, 'spanish-basics');
  assert.notEqual(fixture.coreCurriculum.moduleId, 'japanese-basics');
});

test('all nine private Core lessons pass stage-sized word rules and preserve every authored pair', () => {
  assert.deepEqual(fixture.coreCurriculum.lessons.map(l => l.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(fixture.support.map(s => s.stableLessonKey), [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `french-basics:${n}`));
  for (const [i, lesson] of fixture.coreCurriculum.lessons.entries()) {
    const source = sourceLessons[i];
    const support = fixture.support[i];
    const selectedSource = support.stageCardIndexes.map(index => source.words[index]);
    const expectedWords = [
      ...selectedSource.filter(w => w.kind === 'term').map(w => ({es:w.fr, en:w.en, kind:w.kind})),
      ...support.supplementalCards.map(w => ({es:w.target, en:w.native, kind:w.kind})),
      ...selectedSource.filter(w => w.kind === 'phrase').map(w => ({es:w.fr, en:w.en, kind:w.kind})),
    ];
    assert.deepEqual(lesson.words, expectedWords);
    assert.deepEqual(support.cards, source.words.map(w => ({target:w.fr, native:w.en, kind:w.kind})));
    assert.deepEqual(support.backlogCards, support.cards.filter((_, index) => !support.stageCardIndexes.includes(index)));
    assert.equal(support.stageCardIndexes.length + support.backlogCards.length, source.words.length);
    assert.deepEqual(support.dictionaryEntries, [
      ...source.words.filter(w => w.kind === 'term').map(w => ({target:w.fr, native:w.en})),
      ...support.supplementalCards.filter(w => w.kind === 'term').map(w => ({target:w.target, native:w.native})),
    ]);
    if (lesson.n === 7) {
      assert.deepEqual(support.stageCardIndexes, source.words.map((_, index) => index).filter(index => index !== 3));
      assert.deepEqual(support.supplementalCards, [{target:'parc',native:'park',kind:'term'}]);
    } else {
      assert.deepEqual(support.stageCardIndexes, source.words.map((_, index) => index));
      assert.deepEqual(support.supplementalCards, []);
    }
    assert.deepEqual(support.reader.target, source.reading.target);
    assert.deepEqual(support.reader.native, source.reading.native);
    assert.deepEqual(support.reader.target, lesson.words.filter(w => w.kind === 'phrase').map(w => w.es));
    assert.deepEqual(support.reader.native, lesson.words.filter(w => w.kind === 'phrase').map(w => w.en));
    assert.deepEqual(support.dialogue, source.dialogue.map(line => { const [target, native] = line.split('|'); return {target:target.trim(), native:native.trim()}; }));
    assert.deepEqual(support.checks, source.checks);
    assert.equal(support.speaking.brief, source.speaking);
    assert.equal(support.speaking.recordedAudio, false);
    assert.deepEqual(Object.keys(support.modes).sort(), ['see','recall','hear','type','say','write'].sort());
    assert.deepEqual(lesson.steps.map(step => step.tab), ['reader','wordMatch','speak']);
    assert.deepEqual(validateLessonContent({words:lesson.words}, {language:'French', nativeLanguage:'English', parts:{words:true, passage:false, verbs:false}}), []);
  }
});
