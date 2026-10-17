import assert from "node:assert/strict";
import { test } from "node:test";
import { readerSelectionScope, moduleReaderSelection } from "../src/lib/reader-selection.ts";
import { createLibraryDevice, readLibraryPreferences } from "../src/lib/library-device.ts";
const scope = readerSelectionScope("roofing", "Spanish", "English");
const base = {
  ready: true,
  scope,
  savedScope: scope,
  selectedId: "own-book",
  selected: { available: true, language: "Spanish", section: "custom" },
  target: "Spanish",
  firstLessonId: "roofing-first",
  lessonPassageId: null,
};
test("the saved custom text and later module passages survive Reader remounts", () => {
  assert.equal(moduleReaderSelection(base), null);
  assert.equal(
    moduleReaderSelection({
      ...base,
      selectedId: "roofing-lesson-12",
      selected: { ...base.selected, section: "culture" },
    }),
    null,
  );
});
test("deliberate module, target or native-language changes select relevant reading", () => {
  for (const next of [
    readerSelectionScope("landscaper", "Spanish", "English"),
    readerSelectionScope("roofing", "English", "Spanish"),
    readerSelectionScope("roofing", "Spanish", "French"),
  ]) {
    assert.equal(
      moduleReaderSelection({ ...base, scope: next, firstLessonId: "next-context-first" }),
      "next-context-first",
    );
  }
});
test("a missing saved book is not replaced before initial library/profile restoration settles", () => {
  assert.equal(moduleReaderSelection({ ...base, ready: false, selected: undefined }), null);
  assert.equal(moduleReaderSelection({ ...base, selected: undefined }), "roofing-first");
});
test("an explicit Core 30 passage return takes priority over automatic module selection", () => {
  assert.equal(
    moduleReaderSelection({ ...base, savedScope: "other", lessonPassageId: "own-book" }),
    null,
  );
});
test("owned custom choices from older preferences resume while unselected defaults choose the module", () => {
  assert.equal(moduleReaderSelection({ ...base, savedScope: null }), null);
  assert.equal(
    moduleReaderSelection({
      ...base,
      savedScope: null,
      selected: { ...base.selected, section: "classic" },
    }),
    "roofing-first",
  );
  assert.equal(
    moduleReaderSelection({ ...base, selected: { ...base.selected, language: "French" } }),
    "roofing-first",
  );
});
test("unloaded module passages and an already selected first passage require no replacement", () => {
  assert.equal(moduleReaderSelection({ ...base, firstLessonId: undefined }), null);
  assert.equal(
    moduleReaderSelection({ ...base, selectedId: "roofing-first", savedScope: null }),
    null,
  );
});
test("selection context persists with the owned preferences and is not read for another learner", () => {
  const entries = new Map();
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const device = createLibraryDevice({ actor: "a", storage, remote: null, isCurrent: () => true });
  assert.equal(device.savePreferences({ selectedId: "own-book", selectionScope: scope }), true);
  assert.deepEqual(readLibraryPreferences(storage, "a"), {
    selectedId: "own-book",
    selectionScope: scope,
  });
  assert.equal(readLibraryPreferences(storage, "b"), null);
  assert.equal(readLibraryPreferences(storage, null), null);
});
