import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { OWNER_TABS, type OwnerTab } from "@/lib/owner-tabs";

/** WAI-ARIA tablist; arrow keys, Home and End move between tabs. Scrolls sideways on phones. */
export function OwnerTabBar({
  tab,
  onChange,
}: {
  tab: OwnerTab;
  onChange: (tab: OwnerTab) => void;
}) {
  const move = (index: number) => {
    const next = OWNER_TABS[(index + OWNER_TABS.length) % OWNER_TABS.length].id;
    onChange(next);
    document.getElementById(`owner-tab-${next}`)?.focus();
  };
  const strip = useRef<HTMLDivElement>(null);
  // Edge fades tell phone users that more tabs sit off-screen in that direction.
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);
  // On a phone the strip scrolls sideways; keep the selected tab in view.
  useEffect(() => {
    document
      .getElementById(`owner-tab-${tab}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
  }, [tab, measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return (
    <div className="relative z-20 -mx-4 mb-5 border-b border-border/60 bg-background/95 px-4 backdrop-blur sm:sticky sm:top-0 sm:-mx-8 sm:px-8">
      <div
        aria-hidden="true"
        data-testid="owner-tabs-fade-left"
        className={
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-150 " +
          (edges.left ? "opacity-100" : "opacity-0")
        }
      />
      <div
        aria-hidden="true"
        data-testid="owner-tabs-fade-right"
        className={
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-150 " +
          (edges.right ? "opacity-100" : "opacity-0")
        }
      />
      <div
        ref={strip}
        role="tablist"
        aria-label="Owner sections"
        onScroll={measure}
        className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 [scrollbar-width:none]"
        onKeyDown={(e) => {
          const index = OWNER_TABS.findIndex((t) => t.id === tab);
          if (e.key === "ArrowRight") move(index + 1);
          else if (e.key === "ArrowLeft") move(index - 1);
          else if (e.key === "Home") move(0);
          else if (e.key === "End") move(OWNER_TABS.length - 1);
          else return;
          e.preventDefault();
        }}
      >
        {OWNER_TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              id={`owner-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`owner-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={
                "shrink-0 cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
                (selected
                  ? "bg-gold text-midnight"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
              onClick={() => onChange(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders its children only while active, so each tab loads its own data on demand. */
export function OwnerTabPanel({
  id,
  active,
  children,
}: {
  id: OwnerTab;
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`owner-panel-${id}`}
      aria-labelledby={`owner-tab-${id}`}
      className="space-y-6"
    >
      {children}
    </div>
  );
}
