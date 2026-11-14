import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  BookOpen,
  ChevronDown,
  Eye,
  Headphones,
  Info,
  Keyboard,
  Layers,
  Menu,
  Mic,
  PenLine,
  Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type LessonModeId = "see" | "recall" | "hear" | "type" | "say" | "write";

export const LESSON_MODES = [
  { id: "see", label: "See it", Icon: Eye, why: "Start with this lesson's reading or word list." },
  {
    id: "recall",
    label: "Recall it",
    Icon: Layers,
    why: "Pull each word back from memory with cards and matching.",
  },
  {
    id: "hear",
    label: "Hear it",
    Icon: Headphones,
    why: "Train your ear on how the words really sound.",
  },
  { id: "type", label: "Type it", Icon: Keyboard, why: "Spell the words from memory." },
  { id: "say", label: "Say it", Icon: Mic, why: "Use the words out loud in a short role-play." },
  {
    id: "write",
    label: "Write it",
    Icon: PenLine,
    why: "Copy the words, recall their spelling, then write a response.",
  },
] as const;

/** Shared by real lessons and the public layout preview. No curriculum or progress writes. */
export function LessonWorkspaceHeader({
  courseTitle,
  lessonTitle,
  lessonLabel,
  goal,
  active,
  opened,
  onExit,
  onMore,
  navigation,
}: {
  courseTitle: string;
  lessonTitle: string;
  lessonLabel: string;
  goal: string;
  active: LessonModeId;
  opened: readonly LessonModeId[];
  onExit: () => void;
  onMore?: () => void;
  navigation?: ReactNode;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const infoButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const header = headerRef.current;
    const scroller = header?.closest("main");
    if (!header || !scroller) return;
    const previous = scroller.style.getPropertyValue("--lt-lesson-header-height");
    const measure = () => {
      const height =
        getComputedStyle(header).position === "sticky"
          ? Math.ceil(header.getBoundingClientRect().height)
          : 0;
      scroller.style.setProperty("--lt-lesson-header-height", `${height}px`);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previous) scroller.style.setProperty("--lt-lesson-header-height", previous);
      else scroller.style.removeProperty("--lt-lesson-header-height");
    };
  }, []);

  return (
    <header ref={headerRef} className="lt-lesson-workspace-header">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-left text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Course lessons: ${courseTitle}`}
        >
          <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-ink" />
          <span className="truncate">{courseTitle}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-ink" />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {onMore && (
            <button
              type="button"
              onClick={onMore}
              aria-label="App navigation and settings"
              data-lesson-workspace-menu
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground"
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg px-2 text-sm text-muted-foreground"
          >
            ✕ Exit
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{lessonLabel}</p>
          <h3 className="mt-1 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            {lessonTitle}
          </h3>
        </div>
        <button
          type="button"
          ref={infoButtonRef}
          onClick={() => setDetailsOpen(true)}
          aria-label="Lesson details and goal"
          aria-haspopup="dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-gold-ink"
        >
          <Info aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1.5" role="group" aria-label="Opened lesson modes">
        {LESSON_MODES.map(({ id, label }) => (
          <span
            key={id}
            title={`${label}: ${opened.includes(id) ? "opened" : "not opened"}`}
            aria-label={`${label}: ${opened.includes(id) ? "opened" : "not opened"}`}
            className={cn(
              "h-1 rounded-full bg-border",
              opened.includes(id) && "bg-gold-ink/50",
              active === id && "bg-gold-ink",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{opened.length} of 6 modes opened</p>
      {navigation && <div className="mt-2">{navigation}</div>}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="bottom"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            infoButtonRef.current?.focus();
          }}
          scrollBody
          className="mx-auto max-h-[85dvh] max-w-2xl rounded-t-3xl"
        >
          <SheetTitle className="font-serif text-2xl text-foreground">{lessonTitle}</SheetTitle>
          <SheetDescription>
            {courseTitle} · {lessonLabel}
          </SheetDescription>
          <div className="mt-4 space-y-3 pb-6 text-foreground">
            <h4 className="text-sm font-semibold text-gold-ink">Your lesson goal</h4>
            <p className="leading-relaxed">{goal}</p>
            <p className="text-sm text-muted-foreground">
              Switch between the six practice modes below. Opening a mode records a visit; it does
              not mark the lesson mastered.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function LessonModeBar({
  active,
  opened,
  onSelect,
  navRef,
  children,
}: {
  active: LessonModeId;
  opened: readonly LessonModeId[];
  onSelect: (id: LessonModeId) => void;
  navRef?: Ref<HTMLElement>;
  children?: ReactNode;
}) {
  return (
    <nav
      ref={navRef}
      aria-label="Ways of learning this lesson"
      data-testid="lesson-section-nav"
      className="lt-core60-section-nav lt-lesson-mode-bar"
    >
      {LESSON_MODES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          data-testid={`lesson-nav-${id}`}
          aria-label={label}
          aria-current={active === id ? "step" : undefined}
          onClick={() => onSelect(id)}
          className="relative flex min-w-0 flex-col items-center justify-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
          <span>{label.replace(" it", "")}</span>
          {opened.includes(id) && (
            <Check aria-hidden="true" className="absolute right-1 top-1 h-3 w-3" />
          )}
        </button>
      ))}
      {children}
    </nav>
  );
}
