import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(
  await readFile("src/data/generated/hello-little-one.booklet.json", "utf8"),
);
const { content } = snapshot;

assert.equal(snapshot.sourceRepository, "adobetoby-maker/language-threshold-readers");
assert.match(snapshot.generatedAtSourceCommit, /^[0-9a-f]{40}$/);
assert.match(snapshot.sourceFixtureSha256, /^[0-9a-f]{64}$/);
assert.equal(content.consumer, "language-threshold-reader");
assert.equal(content.bookId, "book_hello_little_one");
assert.equal(content.editionId, "edition_hello_little_one_en_es_v1");
assert.equal(content.sourceLanguage, "en");
assert.equal(content.targetLanguage, "es");
assert.equal(content.contentStatus, "needs-native-review");
assert.equal(content.pages.length, 13);
assert.equal(content.sentences.length, 15);

const pageIds = new Set();
const sentenceIds = new Set();
const assetIds = new Set();
for (const [pageIndex, page] of content.pages.entries()) {
  assert.equal(page.order, pageIndex);
  assert.match(page.sourceLabel, /^(cover|p\d{2})$/);
  assert.ok(!pageIds.has(page.pageId), `duplicate page ${page.pageId}`);
  assert.ok(!assetIds.has(page.image.assetId), `duplicate image ${page.image.assetId}`);
  pageIds.add(page.pageId);
  assetIds.add(page.image.assetId);
  assert.match(page.image.sha256, /^[0-9a-f]{64}$/);
  assert.ok(page.image.altText.source.trim());
  assert.ok(page.image.altText.target.trim());
  for (const [sentenceIndex, sentence] of page.sentences.entries()) {
    assert.equal(sentence.order, sentenceIndex);
    assert.ok(!sentenceIds.has(sentence.sentenceId), `duplicate sentence ${sentence.sentenceId}`);
    sentenceIds.add(sentence.sentenceId);
    assert.ok(sentence.en.trim());
    assert.ok(sentence.target.trim());
  }
}

assert.deepEqual(
  content.sentences.map(({ sentenceId }) => sentenceId),
  content.pages.flatMap((page) => page.sentences.map(({ sentenceId }) => sentenceId)),
);
console.log("Language Threshold booklet snapshot is valid: 13 pages, 15 paired sentences.");
