import { useLayoutEffect, useState } from "react";
import { readerSidePanelPlacement, type ReaderPanelSide } from "@/lib/reader-side-panel";

export function useReaderSidePanel({
  enabled,
  side,
  width,
  avoidWordCard = false,
}: {
  enabled: boolean;
  side: ReaderPanelSide;
  width: number;
  avoidWordCard?: boolean;
}) {
  const [placement, setPlacement] = useState<ReturnType<typeof readerSidePanelPlacement>>(null);
  useLayoutEffect(() => {
    if (!enabled) {
      setPlacement(null);
      return;
    }
    const reader = document.querySelector<HTMLElement>(".reader-page");
    const workspace = document.getElementById("learning-space");
    const header = document.querySelector<HTMLElement>(".lt-main-column > header");
    if (!reader || !workspace) {
      setPlacement(null);
      return;
    }
    const measure = () => {
      const occupied = avoidWordCard
        ? document.querySelector<HTMLElement>('[data-reader-panel="word"]')?.dataset.readerPanelSide
        : undefined;
      const preferredSide = occupied === side ? (side === "left" ? "right" : "left") : side;
      const bounds = workspace.getBoundingClientRect();
      const next = readerSidePanelPlacement({
        reader: (reader.querySelector('[aria-label="Selected reading"]') ?? reader).getBoundingClientRect(),
        workspace: {
          left: Math.max(0, bounds.left),
          right: Math.min(window.innerWidth, bounds.right),
          top: Math.max(0, bounds.top, header?.getBoundingClientRect().bottom ?? 0),
          bottom: Math.min(window.innerHeight, bounds.bottom),
        },
        preferredSide,
        preferredWidth: width,
        minWidth: avoidWordCard ? 320 : 280,
      });
      setPlacement(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(reader);
    observer.observe(workspace);
    if (header) observer.observe(header);
    const reading = reader.querySelector('[aria-label="Selected reading"]');
    if (reading) observer.observe(reading);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("lt:word-card-state", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("lt:word-card-state", measure);
    };
  }, [enabled, side, width, avoidWordCard]);
  return enabled ? placement : null;
}
