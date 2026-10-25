import { useEffect, useRef, useState } from "react";

/** Fit practice between its real top edge, the keyboard, and the shared bottom navigation. */
export function usePracticeViewport(context: string) {
  const ref = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window.requestAnimationFrame !== "function") return;
    const measure = () => {
      const viewport = window.visualViewport;
      const bottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      const main = element.closest("main");
      const reserved = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 24;
      setHeight(
        Math.max(160, Math.floor(bottom - element.getBoundingClientRect().top - reserved - 12)),
      );
    };
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [context]);
  return {
    ref,
    style: { height: height ?? "calc(100dvh - 12rem - var(--lt-bottom-strip-budget, 0px))" },
  };
}
