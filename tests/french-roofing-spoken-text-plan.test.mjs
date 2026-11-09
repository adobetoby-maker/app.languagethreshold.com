import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const plan = JSON.parse(read('content/french-roofing/private-spoken-text-plan-fr-en.json'));
const sourceRaw = read(plan.sourceInventoryPath);
const source = JSON.parse(sourceRaw);
const hash = value => createHash('sha256').update(value).digest('hex');

test('French Roofing proposed spoken text preserves every exact lesson display string', () => {
  assert.equal(plan.pairKey, 'French:English');
  assert.equal(plan.locale, 'fr-FR');
  assert.equal(plan.registered, false);
  assert.equal(plan.reviewed, false);
  assert.equal(plan.sourceInventoryFileSha256, hash(sourceRaw));
  assert.equal(plan.exactDisplayTextSha256, source.exactTextSha256);
  assert.equal(plan.counts.exactDisplayTexts, source.counts.uniqueExactTexts);
  assert.equal(Object.values(plan.counts).slice(1).reduce((a, b) => a + b, 0), source.texts.length);
  assert.equal(plan.rows.length, plan.counts.dialogueSpeakerLabels + plan.counts.headingsOrNarrationForReview);
  const originals = new Map(source.texts.map(row => [row.sha256, row]));
  assert.equal(originals.size, source.texts.length);
  const colonPrefixed = source.texts.filter(row => /^[^:：]{1,50}\s*[:：]\s*.+$/.test(row.text));
  assert.deepEqual(plan.rows.map(row => row.displayTextSha256), colonPrefixed.map(row => row.sha256));
  for (const row of plan.rows) {
    const original = originals.get(row.displayTextSha256);
    assert.ok(original);
    assert.equal(row.displayText, original.text);
    assert.equal(row.displayTextSha256, original.sha256);
    assert.equal(hash(Buffer.from(row.displayText)), original.sha256);
    assert.deepEqual(row.sourceOccurrences, original.occurrences);
    assert.equal(row.textReviewed, false);
    assert.equal(row.listeningReviewed, false);
    if (row.kind === 'dialogue-speaker-label') {
      assert.ok(row.prefix && row.displayText.endsWith(row.proposedSpokenText));
      assert.ok(row.proposedSpokenText.length < row.displayText.length);
    } else {
      assert.equal(row.kind, 'heading-or-narration-review');
      assert.equal(row.proposedSpokenText, row.displayText);
    }
  }
  assert.equal(new Set(plan.rows.map(row => row.displayTextSha256)).size, plan.rows.length);
});

test('full-course synthesis rejects an unreviewed inventory before requesting audio', () => {
  const run = spawnSync('python3', [
    'scripts/generate-private-course-hd-audio.py',
    '--inventory', plan.sourceInventoryPath,
    '--output', '/tmp/french-roofing-unreviewed-audio-guard',
    '--project', 'unused-test-project',
    '--approved-sha256', plan.exactDisplayTextSha256,
    '--generate', '--limit', '1',
  ], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /requires a reviewed inventory/);
});
