import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Check, Sparkles, Loader2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import { getModule } from "@/data/modules";
import { matchesFocus } from "@/lib/module-filter";
import { CEFR_LEVELS, generateLessonTitles, type LessonStub } from "@/fns/grammar.functions";

const LEVEL_LABEL: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

export function LevelSidebar({
  activeLevel,
  activeLessonId,
  onSelect,
}: {
  activeLevel: CefrLevel | null;
  activeLessonId: string | null;
  onSelect: (level: CefrLevel, lesson: LessonStub) => void;
}) {
  const { state } = useApp();
  const { getLevel, setLessons, state: gState } = useGrammar();
  const [expanded, setExpanded] = useState<CefrLevel | null>("A1");
  const [loadingLevel, setLoadingLevel] = useState<CefrLevel | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [errorByLevel, setErrorByLevel] = useState<Partial<Record<CefrLevel, string>>>({});
  const genTitles = useServerFn(generateLessonTitles);
  const loadingCopy = ["Preparing your lesson…", "Building useful examples…", "Almost ready…"];

  useEffect(() => {
    if (!loadingLevel) {
      setLoadingStage(0);
      return;
    }
    const started = window.setTimeout(() => setLoadingStage(1), 3500);
    const continuing = window.setTimeout(() => setLoadingStage(2), 8000);
    return () => {
      window.clearTimeout(started);
      window.clearTimeout(continuing);
    };
  }, [loadingLevel]);

  // Auto-load A1 once hydrated
  useEffect(() => {
    if (!gState.hydrated) return;
    void ensureLessons("A1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gState.hydrated, state.selectedLanguage]);

  async function ensureLessons(level: CefrLevel) {
    const existing = getLevel(state.selectedLanguage, level);
    if (existing && existing.lessons.length > 0) return;
    setLoadingLevel(level);
    setErrorByLevel((p) => ({ ...p, [level]: undefined }));
    try {
      const res = await Promise.race([
        genTitles({
          data: { language: state.selectedLanguage, level },
        }),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("This lesson is taking longer than expected.")),
            25000,
          ),
        ),
      ]);
      if (res.data?.lessons) {
        setLessons(state.selectedLanguage, level, res.data.lessons);
      } else if (res.error) {
        setErrorByLevel((p) => ({ ...p, [level]: res.error ?? "Failed to load" }));
      }
    } catch (error) {
      setErrorByLevel((p) => ({
        ...p,
        [level]:
          error instanceof Error
            ? error.message
            : "We couldn't prepare this lesson. Your saved work is safe.",
      }));
    } finally {
      setLoadingLevel(null);
    }
  }

  const handleToggle = async (level: CefrLevel) => {
    const next = expanded === level ? null : level;
    setExpanded(next);
    if (next) await ensureLessons(next);
  };

  return (
    <aside className="w-full md:w-[280px] md:shrink-0">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 px-2 pt-1">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CEFR Curriculum · {state.selectedLanguage}
          </h3>
        </div>
        <ul className="space-y-1">
          {CEFR_LEVELS.map((level) => {
            const data = getLevel(state.selectedLanguage, level);
            const lessons = data?.lessons ?? [];
            const completed = data?.completed ?? {};
            const completedCount = lessons.filter((l) => completed[l.id]).length;
            const isOpen = expanded === level;
            const isLoading = loadingLevel === level;
            const err = errorByLevel[level];
            const activeMod = getModule(state.activeModuleId);
            const focus = activeMod?.vocabFocus ?? null;
            const sortedLessons = focus
              ? [...lessons].sort((a, b) => {
                  const am = matchesFocus(`${a.title} ${a.concept ?? ""}`, focus) ? 1 : 0;
                  const bm = matchesFocus(`${b.title} ${b.concept ?? ""}`, focus) ? 1 : 0;
                  return bm - am;
                })
              : lessons;
            return (
              <li key={level}>
                <button
                  onClick={() => handleToggle(level)}
                  className="group flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
                  data-active={isOpen}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-display text-base font-semibold text-gold">{level}</span>
                    <span className="truncate font-mono text-[11px] uppercase tracking-wider text-foreground/80">
                      {LEVEL_LABEL[level]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lessons.length > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {completedCount}/{lessons.length}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="ml-2 mt-1 border-l border-border/60 pl-3">
                    {isLoading && lessons.length === 0 && (
                      <div
                        className="px-2 py-3 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                          <Loader2 className="h-3 w-3 animate-spin text-gold" />
                          {loadingCopy[loadingStage]}
                        </div>
                        <p className="mt-1 pl-5 text-[11px] leading-relaxed">
                          This may take a short period. You can keep exploring other tools while it
                          continues.
                        </p>
                      </div>
                    )}
                    {err && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-2 text-[11px] text-destructive">
                        <p>{err}</p>
                        <button
                          onClick={() => ensureLessons(level)}
                          className="mt-2 min-h-11 rounded-lg border border-destructive/40 px-3 font-semibold underline-offset-2 hover:bg-destructive/10"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    <ul className="space-y-0.5 py-1">
                      {sortedLessons.map((lesson, i) => {
                        const done = !!completed[lesson.id];
                        const active = activeLevel === level && activeLessonId === lesson.id;
                        const inMod =
                          !!focus && matchesFocus(`${lesson.title} ${lesson.concept ?? ""}`, focus);
                        return (
                          <li key={lesson.id}>
                            <button
                              onClick={() => onSelect(level, lesson)}
                              data-active={active}
                              className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gold/10 data-[active=true]:bg-gold/15"
                            >
                              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border/60 font-mono text-[9px] text-muted-foreground group-data-[active=true]:border-gold group-data-[active=true]:text-gold">
                                {done ? <Check className="h-3 w-3 text-gold" /> : i + 1}
                              </span>
                              <span className="flex-1 font-display text-[13px] leading-snug text-foreground/90 group-data-[active=true]:text-foreground">
                                {lesson.title}
                              </span>
                              {inMod && (
                                <span
                                  title="Matches active module"
                                  className="mt-0.5 shrink-0 font-mono text-[10px] text-gold"
                                >
                                  ◈
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
