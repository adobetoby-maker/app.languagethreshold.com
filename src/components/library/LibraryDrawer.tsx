import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  NotebookPen,
  Plus,
  Sparkle,
  Swords,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useLibrary, wordCount, type LibraryEntry, type ReadStatus } from "@/state/library-state";
import { useMatch, type SavedVocabWord } from "@/state/match-state";
import { useApp, type Language } from "@/state/app-state";
import { getModule } from "@/data/modules";
import { partitionByFocus } from "@/lib/module-filter";
import { AddTextModal } from "./AddTextModal";
import type { CefrLevel } from "@/fns/grammar.functions";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";

const LEVEL_TONE: Record<CefrLevel, string> = {
  A1: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  A2: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  B1: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  B2: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  C1: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  C2: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

function LevelBadge({ level }: { level: CefrLevel }) {
  return (
    <span
      title={`CEFR ${level} reading level`}
      className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${LEVEL_TONE[level]}`}
    >
      {level}
    </span>
  );
}

const READ_STATUS_CYCLE: ReadStatus[] = ["never", "partial", "complete"];
const READ_DOT: Record<ReadStatus, { label: string; cls: string }> = {
  never: { label: "Not started", cls: "text-muted-foreground/50 hover:text-muted-foreground" },
  partial: { label: "In progress", cls: "text-amber-400 hover:text-amber-300" },
  complete: { label: "Completed", cls: "text-emerald-400 hover:text-emerald-300" },
};
const READ_GLYPH: Record<ReadStatus, string> = {
  never: "○",
  partial: "◐",
  complete: "●",
};

function ReadDot({
  entryId,
  status,
  onCycle,
}: {
  entryId: string;
  status: ReadStatus;
  onCycle: (id: string, next: ReadStatus) => void;
}) {
  const { cls, label } = READ_DOT[status];
  const next = READ_STATUS_CYCLE[(READ_STATUS_CYCLE.indexOf(status) + 1) % 3];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCycle(entryId, next);
      }}
      title={label}
      aria-label={`Reading status: ${label}. Click to cycle.`}
      className={`absolute right-2 top-2 text-sm leading-none transition-colors ${cls}`}
    >
      {READ_GLYPH[status]}
    </button>
  );
}

const SPEECH_LOCALE: Record<Language, string> = {
  Spanish: "es-CR",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Portuguese: "pt-BR",
  Pashto: "ps-AF",
  English: "en-US",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function entryHaystack(e: LibraryEntry): string {
  const titleBlob = `${e.title} ${e.subtitle ?? ""}`;
  const sentenceBlob = (e.chapters ? e.chapters.flatMap((c) => c.sentences) : e.sentences)
    .slice(0, 6)
    .map((s) => `${s.en} ${s.target}`)
    .join(" ");
  return `${titleBlob} ${sentenceBlob}`;
}

// Category display order + icons
const CATEGORY_ORDER = [
  "Medical",
  "Trades",
  "Sports",
  "Nutrition",
  "Food & Hospitality",
  "Transport & Agriculture",
  "Service & Education",
  "Technology",
  "Finance",
  "Faith",
  "Classics",
  "Culture",
  "Korean",
  "English",
  "Other",
] as const;

const CATEGORY_ICON: Record<string, string> = {
  Medical: "🩺",
  Trades: "🔧",
  Sports: "⚽",
  Nutrition: "🥗",
  "Food & Hospitality": "🍽️",
  "Transport & Agriculture": "🚛",
  "Service & Education": "🎓",
  Technology: "💻",
  Finance: "💰",
  Faith: "✝️",
  Classics: "📚",
  Culture: "🌍",
  Korean: "🇰🇷",
  English: "🇬🇧",
  Other: "📂",
};

const QUICK_CATEGORIES = ["Faith", "Medical", "Trades", "Sports", "Culture"] as const;
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type QuickCat = (typeof QUICK_CATEGORIES)[number] | "All";
type LevelFilter = (typeof CEFR_LEVELS)[number] | "All";

export function LibraryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, removeCustomEntry, setReadStatus, setLanguageFilter } = useLibrary();
  const { state: appState } = useApp();
  const activeModule = getModule(appState.activeModuleId);
  const focus = activeModule?.vocabFocus ?? null;
  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [catFilter, setCatFilter] = useState<QuickCat>("All");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("All");

  const toggleCollapse = (cat: string) => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Available languages across all non-custom entries
  const availableLanguages = useMemo(() => {
    const langs = new Set<Language>();
    state.entries
      .filter((e) => e.section !== "custom")
      .forEach((e) => langs.add(e.language as Language));
    return [...langs].sort();
  }, [state.entries]);

  const langFilter = state.languageFilter;

  const toggleLang = (lang: Language) => {
    const next = langFilter.includes(lang)
      ? langFilter.filter((l) => l !== lang)
      : [...langFilter, lang];
    setLanguageFilter(next);
  };

  const selectAll = () => setLanguageFilter([]);

  // Module-pinned texts
  const moduleTexts = useMemo(() => {
    if (!activeModule || !focus) return [];
    const { inModule } = partitionByFocus(state.entries, focus, entryHaystack);
    return inModule.filter((e) => e.language === appState.selectedLanguage && e.available);
  }, [activeModule, focus, state.entries, appState.selectedLanguage]);

  // My Texts (custom) — always pinned, no language filter
  const customEntries = state.entries.filter((e) => e.section === "custom");

  // Non-custom entries filtered by language, category, and level
  const filteredSeeds = useMemo(() => {
    let seeds = state.entries.filter((e) => e.section !== "custom");
    if (langFilter.length > 0)
      seeds = seeds.filter((e) => langFilter.includes(e.language as Language));
    if (catFilter !== "All") seeds = seeds.filter((e) => e.category === catFilter);
    if (levelFilter !== "All")
      seeds = seeds.filter((e) => (e as { level?: string }).level === levelFilter);
    return seeds;
  }, [state.entries, langFilter, catFilter, levelFilter]);

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, LibraryEntry[]>();
    for (const e of filteredSeeds) {
      const cat = e.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(e);
    }
    return map;
  }, [filteredSeeds]);

  // Ordered category list (known order first, then any unknown)
  const orderedCategories = useMemo(() => {
    const known = CATEGORY_ORDER.filter((c) => byCategory.has(c));
    const unknown = [...byCategory.keys()].filter(
      (c) => !(CATEGORY_ORDER as readonly string[]).includes(c),
    );
    return [...known, ...unknown];
  }, [byCategory]);

  const select = (e: LibraryEntry) => {
    if (!e.available) return;
    dispatch({ type: "SELECT", payload: e.id });
    onClose();
  };

  const cycleReadStatus = (id: string, next: ReadStatus) => {
    setReadStatus(id, next);
  };

  const now = Date.now();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-midnight/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-r border-gold/30 bg-card/95 shadow-luxe backdrop-blur-2xl transition-transform duration-400 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          // Top-anchored full-height drawer: without this its header sits
          // under the Dynamic Island / status bar. Uses the same scaled
          // --lt-safe-top the rest of the app was tuned to on-device.
          paddingTop: "var(--lt-safe-top)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
              ✦ Your Bookshelf
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold">Library</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close library"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground/80 hover:border-gold/60 hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats + Add button */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-3">
          {state.generating ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              <Sparkle className="h-3 w-3 animate-pulse" fill="currentColor" />
              Generating Culture Series…
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {state.entries.filter((e) => e.available).length} texts ready
            </span>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold hover:bg-gold/15"
          >
            <Plus className="h-3 w-3" /> Add Text
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* My Texts — always first */}
          <section className="mb-7">
            <div className="mb-3 flex items-center gap-2 px-1 text-gold">
              <NotebookPen className="h-3.5 w-3.5" />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.28em]">My Texts</h3>
              <div className="ml-2 h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
              {customEntries.length > 0 && (
                <span className="font-mono text-[9px] text-muted-foreground">
                  {customEntries.length}
                </span>
              )}
            </div>
            {customEntries.length === 0 ? (
              <p className="px-1 font-mono text-[11px] text-muted-foreground">
                Paste any passage to begin.
              </p>
            ) : (
              <div className="space-y-2">
                {customEntries.map((e) => (
                  <BookCard
                    key={e.id}
                    entry={e}
                    active={e.id === state.selectedId}
                    readStatus={state.readStatus[e.id] ?? "never"}
                    isNew={!!e.createdAt && now - e.createdAt < SEVEN_DAYS_MS}
                    onSelect={() => select(e)}
                    onCycleStatus={cycleReadStatus}
                    onDelete={() => {
                      if (window.confirm("Remove this book from your library?")) {
                        void removeCustomEntry(e.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Filter rows ───────────────────────────── */}
          <div className="mb-5 space-y-2.5">
            {/* Language */}
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
                Language
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground self-center" />
                <FilterChip active={langFilter.length === 0} onClick={selectAll} label="All" />
                {availableLanguages.map((lang) => (
                  <FilterChip
                    key={lang}
                    active={langFilter.includes(lang)}
                    onClick={() => toggleLang(lang)}
                    label={lang}
                  />
                ))}
              </div>
            </div>

            {/* Module / Category */}
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
                Module
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={catFilter === "All"}
                  onClick={() => setCatFilter("All")}
                  label="All"
                />
                {QUICK_CATEGORIES.map((c) => (
                  <FilterChip
                    key={c}
                    active={catFilter === c}
                    onClick={() => setCatFilter(catFilter === c ? "All" : c)}
                    label={c}
                  />
                ))}
              </div>
            </div>

            {/* Skill level */}
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
                Level
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={levelFilter === "All"}
                  onClick={() => setLevelFilter("All")}
                  label="All"
                />
                {CEFR_LEVELS.map((l) => (
                  <FilterChip
                    key={l}
                    active={levelFilter === l}
                    onClick={() => setLevelFilter(levelFilter === l ? "All" : l)}
                    label={l}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Module-pinned texts */}
          {activeModule && moduleTexts.length > 0 && (
            <section className="mb-7">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Sparkle className="h-3.5 w-3.5 text-gold" fill="currentColor" />
                <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                  {activeModule.emoji} {activeModule.name}
                </h3>
                <div className="ml-2 h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {appState.selectedLanguage}
                </span>
              </div>
              <div className="space-y-2">
                {moduleTexts.map((e) => (
                  <BookCard
                    key={e.id}
                    entry={e}
                    active={e.id === state.selectedId}
                    readStatus={state.readStatus[e.id] ?? "never"}
                    isNew={!!e.createdAt && now - e.createdAt < SEVEN_DAYS_MS}
                    onSelect={() => select(e)}
                    onCycleStatus={cycleReadStatus}
                  />
                ))}
              </div>
            </section>
          )}
          {activeModule && moduleTexts.length === 0 && focus && (
            <div className="mb-4 rounded-lg border border-gold/20 bg-gold/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/70">
              {activeModule.emoji} {activeModule.name} · no {appState.selectedLanguage} texts
              matched yet
            </div>
          )}

          {/* Category sections */}
          {orderedCategories.map((cat) => {
            const entries = byCategory.get(cat) ?? [];
            const availCount = entries.filter((e) => e.available).length;
            if (entries.length === 0) return null;
            const isOpen = collapsed[cat] !== true;
            return (
              <section key={cat} className="mb-5">
                <button
                  onClick={() => toggleCollapse(cat)}
                  className="mb-2 flex w-full items-center gap-2 px-1 text-gold hover:text-gold/80"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="text-sm">{CATEGORY_ICON[cat] ?? "📂"}</span>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.28em]">{cat}</h3>
                  <div className="ml-2 h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {availCount}/{entries.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <BookCard
                        key={e.id}
                        entry={e}
                        active={e.id === state.selectedId}
                        readStatus={state.readStatus[e.id] ?? "never"}
                        isNew={!!e.createdAt && now - e.createdAt < SEVEN_DAYS_MS}
                        onSelect={() => select(e)}
                        onCycleStatus={cycleReadStatus}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Battle Vocabulary */}
          <BattleVocabularySection focus={focus} moduleName={activeModule?.name ?? null} />
        </div>
      </aside>

      <AddTextModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? "border-gold/60 bg-gold/15 text-gold"
          : "border-border/50 text-muted-foreground hover:border-gold/40 hover:text-gold/80"
      }`}
    >
      {label}
    </button>
  );
}

function BattleVocabularySection({
  focus,
  moduleName,
}: {
  focus: string[] | null;
  moduleName: string | null;
}) {
  const { savedVocab, removeVocabWord } = useMatch();
  const speak = (word: SavedVocabWord) => {
    try {
      const locale = SPEECH_LOCALE[word.language];
      if (needsRemoteTTS(locale)) {
        void speakRemote(word.word, locale, { rate: 0.9 });
        return;
      }
      const u = new SpeechSynthesisUtterance(word.word);
      configureUtterance(u, locale);
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  const { inModule, core } = partitionByFocus(
    savedVocab,
    focus,
    (w) => `${w.word} ${w.definition}`,
  );

  const renderCard = (w: SavedVocabWord) => (
    <div key={w.id} className="rounded-xl border border-gold/30 bg-gold/[0.04] p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base italic text-gold">{w.word}</span>
            <button
              onClick={() => speak(w)}
              aria-label={`Pronounce ${w.word}`}
              className="shrink-0 rounded-full border border-gold/40 bg-card/60 p-1 text-gold hover:bg-gold/15"
            >
              <Volume2 className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/80">
            {w.definition}
          </p>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>{w.language}</span>
            <span>·</span>
            <span>{w.cefr}</span>
          </div>
        </div>
        <button
          onClick={() => removeVocabWord(w.id)}
          aria-label={`Remove ${w.word}`}
          className="shrink-0 rounded-full border border-border/60 p-1.5 text-muted-foreground hover:border-red-500/50 hover:text-red-300"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center gap-2 px-1 text-gold">
        <Swords className="h-3.5 w-3.5" />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.28em]">Battle Vocabulary</h3>
        <div className="ml-2 h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        {savedVocab.length > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {savedVocab.length}
          </span>
        )}
      </div>
      {savedVocab.length === 0 ? (
        <p className="px-1 font-mono text-[11px] text-muted-foreground">
          Save words from Language Match battles to collect them here.
        </p>
      ) : focus && moduleName ? (
        <div className="space-y-4">
          <div>
            <div className="mb-2 px-1 font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">
              ◈ In {moduleName} ({inModule.length})
            </div>
            {inModule.length === 0 ? (
              <p className="px-1 font-mono text-[11px] text-muted-foreground">
                No saved words match this module yet.
              </p>
            ) : (
              <div className="space-y-2">{inModule.map(renderCard)}</div>
            )}
          </div>
          {core.length > 0 && (
            <div>
              <div className="mb-2 px-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                Core ({core.length})
              </div>
              <div className="space-y-2">{core.map(renderCard)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">{savedVocab.map(renderCard)}</div>
      )}
    </section>
  );
}

function BookCard({
  entry,
  active,
  readStatus,
  isNew,
  onSelect,
  onDelete,
  onCycleStatus,
}: {
  entry: LibraryEntry;
  active: boolean;
  readStatus: ReadStatus;
  isNew: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onCycleStatus: (id: string, next: ReadStatus) => void;
}) {
  const totalSentences =
    entry.chapters?.reduce((n, c) => n + c.sentences.length, 0) ?? entry.sentences.length;
  const allPairs = entry.chapters ? entry.chapters.flatMap((c) => c.sentences) : entry.sentences;
  const wc = wordCount(allPairs);
  const chapterCount = entry.chapters?.length ?? 0;

  const READ_STATUS_CYCLE: ReadStatus[] = ["never", "partial", "complete"];
  const nextStatus = READ_STATUS_CYCLE[(READ_STATUS_CYCLE.indexOf(readStatus) + 1) % 3];

  return (
    <div
      data-active={active}
      className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-all hover:border-gold/50 data-[active=true]:border-gold/70 data-[active=true]:bg-gold/[0.06]"
    >
      {/* Flag tile */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card/60 text-2xl">
        {entry.flag}
        {isNew && (
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-gold px-1 font-mono text-[7px] font-bold uppercase tracking-wide text-midnight">
            NEW
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 pr-6">
        <div className="flex items-center gap-2">
          <div className="truncate font-display text-base font-semibold">{entry.title}</div>
          {entry.level && <LevelBadge level={entry.level} />}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{entry.language}</span>
          {entry.available ? (
            <>
              <span>·</span>
              <span>{wc} words</span>
              {chapterCount > 1 && (
                <>
                  <span>·</span>
                  <span className="text-gold">
                    {chapterCount} ch · {totalSentences} sent.
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span>·</span>
              <span className="text-gold">
                {entry.subtitle === "Generating…" ? "generating…" : "coming soon"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Read status dot */}
      <ReadDot
        entryId={entry.id}
        status={readStatus}
        onCycle={(id) => onCycleStatus(id, nextStatus)}
      />

      <button
        onClick={onSelect}
        disabled={!entry.available}
        className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Read
      </button>

      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Delete ${entry.title}`}
          title="Remove from library"
          className="shrink-0 rounded-full border border-border/60 p-1.5 text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-300"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
