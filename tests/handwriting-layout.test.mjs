import assert from "node:assert/strict";
import test from "node:test";
import { fitWriting, writingFrame, writingPoint } from "../src/lib/handwriting-layout.ts";

const desktop = { w: 602, h: 206 };
const phone = { w: 288, h: 174 };
const ink = [[{ x: 70, y: 40, w: 3.4 }, { x: 370, y: 180, w: 3.4 }]];
const project = (point, view) => ({ x: point.x * view.scale + view.x, y: point.y * view.scale + view.y });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("desktop ink fits phone width without clipping the final letter or changing its shape", () => {
  const view = fitWriting(writingFrame(desktop, ink), phone);
  const start = project(ink[0][0], view);
  const end = project(ink[0][1], view);
  assert.ok(end.x + ink[0][1].w * view.scale <= phone.w);
  assert.ok(start.x >= 0 && start.y >= 0 && end.y <= phone.h);
  close((end.x - start.x) / (end.y - start.y), 300 / 140);
});

test("repeated phone/desktop rotations preserve original coordinates, widths and layout", () => {
  const before = structuredClone(ink);
  const first = fitWriting(writingFrame(desktop, ink), desktop);
  for (let i = 0; i < 100; i++) {
    fitWriting(writingFrame(desktop, ink), phone);
    assert.deepEqual(fitWriting(writingFrame(desktop, ink), desktop), first);
  }
  assert.deepEqual(ink, before);
  assert.deepEqual(first, { scale: 1, x: 0, y: 0 });
});

test("new pointer input after resizing lands at its visible location with the same pen width", () => {
  const view = fitWriting(writingFrame(desktop, ink), phone);
  const visible = { x: 240, y: 130, w: 4 };
  const stored = writingPoint(visible, view);
  const rendered = project(stored, view);
  close(rendered.x, visible.x);
  close(rendered.y, visible.y);
  close(stored.w * view.scale, visible.w);
});

test("ink added in the wider writing area's margins is retained on the next resize", () => {
  const original = { w: 288, h: 174 };
  const view = fitWriting(writingFrame(original, []), desktop);
  const newInk = [[writingPoint({ x: 590, y: 100, w: 3.4 }, view)]];
  const frame = writingFrame(original, newInk);
  const next = fitWriting(frame, original);
  const point = project(newInk[0][0], next);
  assert.ok(point.x + newInk[0][0].w * next.scale <= original.w + 1e-9);
  assert.ok(point.x - newInk[0][0].w * next.scale >= 0);
  const final = fitWriting(writingFrame(original, newInk), desktop);
  assert.ok(project(newInk[0][0], final).x <= desktop.w);
});
