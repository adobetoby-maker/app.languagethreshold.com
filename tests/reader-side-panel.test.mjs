import assert from "node:assert/strict";
import { test } from "node:test";
import { readerSidePanelPlacement } from "../src/lib/reader-side-panel.ts";

const workspace = { left: 224, right: 2560, top: 80, bottom: 1000 };
const reader = { left: 816, right: 1968 };

test("both language panes have a margin without covering navigation or reading", () => {
  for (const preferredSide of ["left", "right"]) {
    const box = readerSidePanelPlacement({ reader, workspace, preferredSide, preferredWidth: 380 });
    assert.ok(box);
    assert.equal(box.side, preferredSide);
    assert.ok(box.left >= workspace.left + 16);
    assert.ok(box.left + box.width <= workspace.right - 16);
    assert.ok(preferredSide === "left" ? box.left + box.width <= reader.left - 16 : box.left >= reader.right + 16);
    assert.ok(box.top + box.maxHeight <= workspace.bottom - 16);
  }
});

test("smaller margins shrink to a usable panel then fall back, including fullscreen", () => {
  const fit = readerSidePanelPlacement({ reader: { left: 560, right: 1712 }, workspace: { ...workspace, right: 2048 }, preferredSide: "right", preferredWidth: 440 });
  assert.equal(fit.width, 304);
  assert.equal(readerSidePanelPlacement({ reader: { left: 224, right: 1376 }, workspace: { ...workspace, right: 1440 }, preferredSide: "right", preferredWidth: 380 }), null);
  assert.equal(readerSidePanelPlacement({ reader: { left: 8, right: 2552 }, workspace, preferredSide: "left", preferredWidth: 380 }), null);
});

test("a narrow preferred margin does not silently swap the language side", () => {
  assert.equal(readerSidePanelPlacement({ reader: { left: 300, right: 1452 }, workspace, preferredSide: "left", preferredWidth: 380 }), null);
  assert.ok(readerSidePanelPlacement({ reader: { left: 300, right: 1452 }, workspace, preferredSide: "right", preferredWidth: 440 }));
});
