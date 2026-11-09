import { Backpack, Hammer, BookOpen, Package, HardHat, RectangleHorizontal } from "lucide-react";
import { PICTURE_OBJECTS } from "@/lib/picture-action";
export function ObjectIcon({ id }: { id: string }) {
  const icons: Record<string, typeof Hammer> = {
    hammer: Hammer,
    backpack: Backpack,
    helmet: HardHat,
    book: BookOpen,
    box: Package,
    tray: RectangleHorizontal,
  };
  const Icon = icons[id];
  if (id === "net")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <ellipse cx="19" cy="11" rx="10" ry="7" />
        <path d="M9 11l4 11h12l4-11M13 8l10 12M23 7L13 20M17 5v17M9 15L2 30" />
      </svg>
    );
  if (["lure", "reel", "float", "pliers", "line"].includes(id)) {
    const shapes: Record<string, string> = {
      lure: "M5 12c7-8 16-8 22 0-6 8-15 8-22 0Zm0 0L1 7v10Zm14 7v7c0 5 8 5 8 0l-3 2M22 10h.1",
      reel: "M17 4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM8 21l-4 7M26 15h4v8h-4M13 25v5h9",
      float: "M16 1v5M16 26v5M7 16a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM7 16h18M16 7v9",
      pliers: "M7 2l6 9-5 15c-2 5-7 3-5-2l7-12M25 2l-6 9 5 15c2 5 7 3 5-2l-7-12M10 12h12M13 8h6",
      line: "M6 5h16v4H6Zm0 18h16v4H6ZM9 9v14m10-14v14M9 11h10M9 15h10M9 19h10M22 25c10 0 10-10 4-10",
    };
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={shapes[id]} />
      </svg>
    );
  }
  const emoji = PICTURE_OBJECTS[id]?.icon;
  if (emoji)
    return (
      <span className="text-3xl leading-none" aria-hidden="true">
        {emoji}
      </span>
    );
  if (Icon) return <Icon className="size-8" />;
  if (id === "towel")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="6" y="3" width="20" height="26" rx="3" />
        <path d="M10 3v26M6 22h20M6 25h20" />
      </svg>
    );
  if (id === "brush")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M11 14V9a5 5 0 0 1 10 0v5" />
        <rect x="4" y="14" width="24" height="8" rx="3" />
        <path d="M6 22v6m4-6v6m4-6v6m4-6v6m4-6v6m4-6v6" />
      </svg>
    );
  if (id === "cap")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M5 22C0 14 5 5 16 5s16 9 11 17zM6 22h20v5H6zM11 6l-2 13m12-13 2 13" />
      </svg>
    );
  if (id === "hat")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M7 20v-6a9 9 0 0 1 18 0v6M3 20c6-4 20-4 26 0v4H3z" />
        <path d="M12 7v11" />
      </svg>
    );
  if (id === "shoes")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M3 5h7l2 5 9 4c6 0 8 3 8 6H3zm0 15h26v4H3zM8 25h20v4H8zM15 10l-3 3m7-1-3 3" />
      </svg>
    );
  return (
    <svg
      className="size-8"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <g transform="rotate(40 16 16)">
        <rect x="12" y="2" width="8" height="13" rx="3" fill="currentColor" />
        <path d="M16 15v11m-2 0h4l-1 4h-2z" />
      </g>
    </svg>
  );
}
