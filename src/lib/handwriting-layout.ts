/** Ink coordinates stay in one writing space across responsive layout changes. */
export interface InkPoint { x: number; y: number; w: number }
export interface WritingSize { w: number; h: number }
export interface WritingFrame extends WritingSize { x: number; y: number }
export interface WritingView { scale: number; x: number; y: number }

export function writingFrame(size: WritingSize, strokes: readonly (readonly InkPoint[])[]): WritingFrame {
  let left = 0;
  let top = 0;
  let right = size.w;
  let bottom = size.h;
  for (const stroke of strokes) {
    for (const point of stroke) {
      left = Math.min(left, point.x - point.w);
      top = Math.min(top, point.y - point.w);
      right = Math.max(right, point.x + point.w);
      bottom = Math.max(bottom, point.y + point.w);
    }
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function fitWriting(frame: WritingFrame, viewport: WritingSize): WritingView {
  const scale = Math.min(viewport.w / frame.w, viewport.h / frame.h);
  return {
    scale,
    x: (viewport.w - frame.w * scale) / 2 - frame.x * scale,
    y: (viewport.h - frame.h * scale) / 2 - frame.y * scale,
  };
}

/** Translate the visible pointer and pen width back into the retained ink space. */
export function writingPoint(point: InkPoint, view: WritingView): InkPoint {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale, w: point.w / view.scale };
}
