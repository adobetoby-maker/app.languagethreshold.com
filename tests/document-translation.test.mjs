import test from 'node:test';
import assert from 'node:assert/strict';
import { documentPassages, validateDocumentTranslations } from '../src/lib/document-translation.ts';
test('document original preserves numbers, negation, units, form blanks and punctuation', () => {
  assert.deepEqual(documentPassages('  SAFETY\r\nDo NOT lift over 15 kg.\r\n\r\nName: ______  Date: ______  '), ['SAFETY','Do NOT lift over 15 kg.','Name: ______  Date: ______']);
});
test('rejects incomplete or empty translations instead of silently dropping instructions', () => {
  assert.throws(() => validateDocumentTranslations(['Only one'],2));
  assert.throws(() => validateDocumentTranslations(['Okay',' '],2));
  assert.deepEqual(validateDocumentTranslations(['Uno','Dos'],2),['Uno','Dos']);
});
test('rejects oversized documents instead of truncating', () => {
  assert.throws(() => documentPassages('x'.repeat(8001)));
  assert.throws(() => documentPassages('short'));
});
