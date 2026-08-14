import { useMemo, useState } from "react";
import {
  Sparkles,
  BookOpen,
  Compass,
  Gamepad2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
  Play,
} from "lucide-react";
import { useApp, type Language, type TabKey } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import { useLibrary } from "@/state/library-state";
import { MODULES, type AppModule, moduleSupportsLearningPair } from "@/data/modules";
import { getLessons, getStarterSeedId } from "@/data/module-starters";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";

/**
 * ModuleStudyGuide
 *
 * "How to begin" panel that renders at the top of every language module's
 * landing surface (Reader, Missionary, Orthopedics, ...). Gives the learner:
 *   1. Reading material to start studying the topic immediately.
 *   2. Fastest-path-to-fluency roadmap for this module.
 *   3. Suggested games to play after reading.
 *   4. Short stories / interactions / roleplay prompts.
 *
 * Content is derived from the active module + selected language so it works
 * uniformly across every module in every supported language.
 *
 * Dismissible per (module, language). When the learner switches modules or
 * languages, the panel re-opens automatically so they always see the
 * "first lesson" entry point for the new context.
 */
export function ModuleStudyGuide({ className = "" }: { className?: string }) {
  const { state, dispatch } = useApp();
  const tutor = useTutor();
  const library = useLibrary();

  const moduleId = state.activeModuleId;
  const language = state.selectedLanguage;
  const module = useMemo(() => MODULES.find((m) => m.id === moduleId) ?? null, [moduleId]);

  const dismissKey = moduleId ? `lt.studyguide.dismissed.${moduleId}.${language}` : null;
  const [open, setOpen] = useState(() => {
    if (!moduleId) return true;
    try {
      return localStorage.getItem(`lt.studyguide.dismissed.${moduleId}.${language}`) !== "1";
    } catch {
      return true;
    }
  });
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);

  // Pull the first 4 sentence pairs from the pre-built starter seed — no API call.
  const starterPairs = useMemo(() => {
    if (!moduleId || language === "English") return null;
    const seedId = getStarterSeedId(moduleId, language);
    if (!seedId) return null;
    const entry = library.state.entries.find((e) => e.id === seedId);
    if (!entry) return null;
    return entry.sentences.slice(0, 4);
  }, [moduleId, language, library.state.entries]);

  // All ordered lessons for this module × language.
  const lessons = useMemo(() => {
    if (!moduleId) return [];
    const ids = getLessons(moduleId, language);
    return ids.map((id, idx) => {
      const entry = library.state.entries.find((e) => e.id === id);
      return { id, idx, title: entry?.title ?? `Lesson ${idx + 1}`, subtitle: entry?.subtitle };
    });
  }, [moduleId, language, library.state.entries]);

  function dismiss() {
    setOpen(false);
    try {
      if (dismissKey) localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
  }

  function reopen() {
    setOpen(true);
    try {
      if (dismissKey) localStorage.removeItem(dismissKey);
    } catch {
      /* ignore */
    }
  }

  if (!module) return null;
  if (!moduleSupportsLearningPair(module, language, state.nativeLanguage)) return null;

  const guide = buildGuide(module, language);

  function go(tab: TabKey, seedId?: string) {
    dispatch({ type: "SET_TAB", payload: tab });
    if (tab === "reader") {
      const targetId = seedId ?? (moduleId ? getStarterSeedId(moduleId, language) : null);
      const match =
        (targetId && library.state.entries.find((e) => e.id === targetId)) ??
        library.state.entries.find((e) => e.language === language && !e.id.startsWith("custom-"));
      if (match) library.dispatch({ type: "SELECT", payload: match.id });
    }
  }

  function startRoleplay(prompt: string) {
    tutor.prefill(
      `Roleplay — ${module!.userRole} (${module!.name}). In ${language}, ` +
        `with a short ${state.nativeLanguage} gloss in parentheses for each line. ` +
        `Begin the scene now: ${prompt}`,
    );
    tutor.setOpen(true);
  }

  if (!open) {
    return (
      <div className={`mb-4 flex justify-end ${className}`}>
        <button
          onClick={reopen}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/20"
        >
          <Sparkles className="h-3 w-3" /> Show study guide
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={`How to begin: ${module.name} in ${language}`}
      className={
        "relative mb-5 overflow-hidden rounded-2xl border border-gold/30 " +
        "bg-gradient-to-br from-gold/10 via-card/90 to-card/90 p-5 shadow-luxe " +
        className
      }
    >
      {/* Header */}
      <header className="mb-4 flex items-start gap-3">
        <div className="text-3xl leading-none">{module.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            ✦ How to begin · First lesson
          </p>
          <h2 className="font-display text-lg italic leading-snug text-foreground">
            {module.name} <span className="text-muted-foreground">— in {language}</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-foreground/75">{module.blurb}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss study guide"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* 4 quadrants */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Reading material */}
        <Card icon={<BookOpen className="h-3.5 w-3.5" />} title="Reading material">
          <ul className="space-y-1.5">
            {guide.readings.map((r, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground/80">
                <span className="mr-1.5 font-mono text-[10px] text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {r}
              </li>
            ))}
          </ul>
          <ActionRow>
            <Pill onClick={() => go("reader")}>Open Reader</Pill>
          </ActionRow>
        </Card>

        {/* Fastest path */}
        <Card icon={<Compass className="h-3.5 w-3.5" />} title="Fastest path to fluency">
          <ol className="space-y-1.5">
            {guide.fastestPath.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/15 font-mono text-[9px] text-gold">
                  {i + 1}
                </span>
                <span className="leading-relaxed">
                  {step.label}
                  {step.tab && (
                    <button
                      onClick={() => go(step.tab as TabKey)}
                      className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gold underline-offset-4 hover:underline"
                    >
                      open →
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Games */}
        <Card icon={<Gamepad2 className="h-3.5 w-3.5" />} title="Games to play after reading">
          <div className="flex flex-wrap gap-1.5">
            {guide.games.map((g) => (
              <button
                key={g.tab}
                onClick={() => go(g.tab as TabKey)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] text-foreground/85 transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
              >
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Pick one game per session — short loops beat long ones for retention.
          </p>
        </Card>

        {/* Stories / interactions */}
        <Card icon={<MessageCircle className="h-3.5 w-3.5" />} title="Short stories & interactions">
          {starterPairs ? (
            <ul className="space-y-2">
              {starterPairs.map((pair, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-2"
                >
                  <div className="mb-1.5 rounded-md border border-gold/20 bg-gold/5 px-2 py-1">
                    <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gold/70">
                      {language}
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground cursor-text">
                      <ClickableText
                        text={pair.target}
                        onWordClick={(word, sentence, x, y) =>
                          setWordReq({ word, sentence, language, x, y })
                        }
                      />
                    </p>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      {pair.en}
                    </span>
                    <button
                      onClick={() => startRoleplay(pair.en)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold/25"
                    >
                      <Play className="h-2.5 w-2.5" /> Start
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {guide.interactions.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] leading-relaxed text-muted-foreground">{p}</span>
                    <button
                      onClick={() => startRoleplay(p)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold/25"
                    >
                      <Play className="h-2.5 w-2.5" /> Start
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Lesson progression */}
      <div className="mt-4 border-t border-border/40 pt-3">
        {lessons.length > 0 ? (
          <>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lessons — tap any to open in Reader
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => go("reader", lesson.id)}
                  title={lesson.subtitle}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors " +
                    (lesson.idx === 0
                      ? "border border-gold/60 bg-gold/25 text-gold hover:bg-gold/35"
                      : "border border-border/60 bg-background/40 text-foreground/75 hover:border-gold/50 hover:bg-gold/10 hover:text-gold")
                  }
                >
                  <span className="text-[9px] opacity-70">{lesson.idx + 1}</span>
                  <span className="max-w-[120px] truncate">{lesson.title}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Pill onClick={() => go("reader")} primary>
              Start first lesson
            </Pill>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill onClick={() => startRoleplay(starterPairs?.[0]?.en ?? guide.interactions[0])}>
            Talk with the AI tutor
          </Pill>
        </div>
      </div>

      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}
    </section>
  );
}

/* -------------------------- internals -------------------------- */

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <span className="text-gold">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">
          {title}
        </span>
        <span className="ml-auto text-muted-foreground">
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </span>
      </button>
      {!collapsed && children}
    </div>
  );
}

function Pill({
  onClick,
  children,
  primary = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors " +
        (primary
          ? "border border-gold/60 bg-gold/25 text-gold hover:bg-gold/35"
          : "border border-border/60 bg-background/40 text-foreground/85 hover:border-gold/50 hover:bg-gold/10 hover:text-gold")
      }
    >
      {children}
    </button>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>;
}

interface Guide {
  readings: string[];
  fastestPath: { label: string; tab?: TabKey }[];
  games: { tab: TabKey; label: string; emoji: string }[];
  interactions: string[];
  firstLessonTab: TabKey;
}

function buildGuide(module: AppModule, language: Language): Guide {
  const focus = module.vocabFocus;
  const top = focus.slice(0, 6).join(", ");
  const role = module.userRole;

  // First-lesson destination per module type.
  let firstLessonTab: TabKey = "reader";
  if (module.id === "lds-missionary") firstLessonTab = "missionary";
  else if (module.id === "orthopedics") firstLessonTab = "orthopedics";

  const readings = [
    `Skim a one-page primer in ${language} on ${module.category.toLowerCase()} ` +
      `vocabulary you'll meet today: ${top}. Read it twice — once for gist, once aloud.`,
    `Open the Reader and load a short ${module.category.toLowerCase()} passage in ${language}. ` +
      `Click any unknown word to save it as a flashcard.`,
    `Read 5 example sentences using "${focus[0] ?? "key terms"}" and "${focus[1] ?? "core verbs"}" ` +
      `out loud. Mimic the rhythm — don't translate word-for-word.`,
  ];

  const fastestPath: Guide["fastestPath"] = [
    {
      label: `Anchor 10 core ${role.toLowerCase()} words today (${focus.slice(0, 3).join(", ")}…).`,
      tab: "wordMatch",
    },
    { label: "Read a short passage in the Reader and tap to save unknown words.", tab: "reader" },
    {
      label: "Drill the patterns in Sentence Builder so word order becomes muscle memory.",
      tab: "sentenceBuild",
    },
    {
      label: "Train your ear with a Listening Drill on this topic.",
      tab: "listeningDrill",
    },
    {
      label: `Roleplay one scene out loud with the AI tutor as a ${role.toLowerCase()}.`,
      tab: "speak",
    },
  ];

  const games: Guide["games"] = [
    { tab: "wordMatch", label: "Word Match", emoji: "🎯" },
    { tab: "sentenceBuild", label: "Sentence Builder", emoji: "🧱" },
    { tab: "listeningDrill", label: "Listening Drill", emoji: "🎧" },
    { tab: "conjugation", label: "Conjugation", emoji: "🔁" },
    { tab: "idiomMaster", label: "Idiom Master", emoji: "💡" },
    { tab: "falseFriends", label: "False Friends", emoji: "🪤" },
    { tab: "games", label: "More Games", emoji: "🎮" },
  ];

  // Use first 4 challenge prompts as starter "short stories / interactions".
  const interactions = (
    module.challengePrompts.length
      ? module.challengePrompts
      : [
          `Introduce yourself as a ${role.toLowerCase()} in ${language}.`,
          `Describe your typical workday using ${focus.slice(0, 3).join(", ")}.`,
          `Ask three follow-up questions to keep a conversation going.`,
        ]
  ).slice(0, 4);

  return { readings, fastestPath, games, interactions, firstLessonTab };
}
