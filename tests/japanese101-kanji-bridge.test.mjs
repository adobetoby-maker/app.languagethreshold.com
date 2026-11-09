import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const bridge = JSON.parse(read('content/japanese-basics/private-kanji-bridge-ja-en.json'));

test('private Japanese kanji bridge keeps exact kana, meanings, lesson IDs, and source hashes', () => {
  assert.equal(bridge.pairKey, 'Japanese:English');
  assert.equal(bridge.registered, false);
  assert.equal(bridge.reviewed, false);
  assert.equal(bridge.entryCount, 15);
  assert.equal(new Set(bridge.entries.map(entry => entry.id)).size, 15);
  const sources = Object.fromEntries(Object.entries(bridge.sourceFiles).map(([stage, file]) => {
    const raw = read(file.path);
    assert.equal(createHash('sha256').update(raw).digest('hex'), file.sha256);
    return [stage, JSON.parse(raw)];
  }));
  for (const entry of bridge.entries) {
    const lesson = sources[entry.stage].lessons[entry.lesson - 1];
    const [kana, english] = lesson.terms[entry.sourceTermIndex].split('|', 2);
    const prefix = entry.stage === 'core' ? '' : `${entry.stage}-`;
    assert.equal(entry.sourceLessonKey, `${prefix}japanese-basics:${entry.lesson}`);
    assert.equal(entry.kana, kana, entry.id);
    assert.equal(entry.english, english, entry.id);
    assert.equal(entry.ruby.map(part => part.text).join(''), entry.written, entry.id);
    assert.equal(entry.ruby.map(part => part.reading ?? part.text).join(''), entry.kana, entry.id);
    assert.ok(entry.contextNote.trim(), entry.id);
    assert.equal(entry.reviewed, false);
  }
  const go = bridge.entries.find(entry => entry.stage === 'master' && entry.lesson === 15 && entry.kana === 'いってください');
  const say = bridge.entries.find(entry => entry.stage === 'master' && entry.lesson === 20 && entry.kana === 'いってください');
  assert.equal(go.written, '行ってください');
  assert.equal(say.written, '言ってください');
  assert.notEqual(go.english, say.english);
});
