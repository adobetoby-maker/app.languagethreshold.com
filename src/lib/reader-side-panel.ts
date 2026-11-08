export type ReaderPanelSide = "left" | "right";

/** Fit inside the Reader's unused margin, never over the text or navigation. */
export function readerSidePanelPlacement({
  reader,
  workspace,
  preferredSide,
  preferredWidth,
  minWidth = 280,
}: {
  reader: { left: number; right: number };
  workspace: { left: number; right: number; top: number; bottom: number };
  preferredSide: ReaderPanelSide;
  preferredWidth: number;
  minWidth?: number;
}) {
  const gap = 16;
  const available = preferredSide === "left"
    ? reader.left - workspace.left - gap * 2
    : workspace.right - reader.right - gap * 2;
  if (available < minWidth || workspace.bottom - workspace.top < 320) return null;
  const width = Math.min(preferredWidth, available);
  return {
    side: preferredSide,
    left: preferredSide === "left" ? reader.left - gap - width : reader.right + gap,
    top: workspace.top + gap,
    width,
    maxHeight: workspace.bottom - workspace.top - gap * 2,
  };
}
