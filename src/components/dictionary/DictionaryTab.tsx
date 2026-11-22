import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, BookOpen, Loader2, BookmarkPlus } from "lucide-react";
import { dictWords } from "./wordData";
import { verbProfiles } from "./verbProfiles";
import { italianDictWords } from "./italianWordData";
import { italianVerbProfiles } from "./italianVerbProfiles";
import { coreItalianWords } from "./coreItalian";
import japaneseWordData from "./japaneseWordData.json";
import {
  verbProfilesFromAuthored,
  type DictWord,
  type VerbFormSlot,
  type VerbProfile,
  type VerbProfilePhase,
  type WordCategory,
} from "./types";
import { appData } from "@/data/language-packs/app-data";
import { useCatalogDictionary } from "./use-catalog-dictionary";
import { MorphDisplay } from "./MorphDisplay";
import { useApp, type Language } from "@/state/app-state";
import { PACKS, packFor, type LanguagePack } from "@/data/language-packs/registry";
import { followsPackRules } from "@/data/language-packs/pack-rules";
import { foldMarks, normalizeKey } from "@/lib/language-pack-text";
import { useFlashcards } from "@/state/flashcard-state";
import { MODULE_DECKS } from "@/data/deck-modules";
import { toast } from "sonner";

/** Roofing-crew entries for a language, from the roofing deck's translation of that language. */
function roofingWordsFor(language: string): DictWord[] {
  return MODULE_DECKS.roofing.flatMap((entry) => {
    const word = entry.translations[language as Language]?.word;
    if (!word) return [];
    return [
      {
        id: entry.id,
        word,
        english: entry.english,
        pronunciation: "",
        partOfSpeech:
          entry.partOfSpeech === "roofing term" ? ("noun" as const) : ("phrase" as const),
        category: "roofing" as const,
        context: "Roofing crew language",
        examples: [],
      },
    ];
  });
}

// ─── Dictionary datasets ─────────────────────────────────────────────────────

interface DictionaryDataset {
  words: DictWord[];
  profiles: Record<string, VerbProfile>;
  /** Sample sentence for the AI phrase lookup box; a dataset without one has no phrase lookup. */
  phraseExample?: string;
  /** Set when the dataset is glossed in one native language only; it is offered only with that native. */
  glossOnly?: string;
  /** Label of each profile slot in this dataset's language. */
  slotLabels: Partial<Record<VerbFormSlot, string>>;
}

// The Spanish dataset's labels are the ones its learners have always seen (from the generated field
// names); the Italian dataset names its own tenses.
const MEDICAL_TRADES_SLOT_LABELS: Partial<Record<VerbFormSlot, string>> = {
  "imperative.formal": "Imperative Formal",
  "imperative.informal": "Imperative Informal",
  "present.1s": "Present Yo",
  "present.2s": "Present Tu",
  "present.3s": "Present El",
  gerund: "Gerund",
  "past-participle": "Past Participle",
  "present.1p": "Present Nosotros",
  "present.3p": "Present Ellos",
  "subjunctive.3s": "Subjunctive El",
  "subjunctive.2s": "Subjunctive Tu",
  "past.1s": "Preterite Yo",
  "past.3s": "Preterite El",
};

const ITALIAN_SLOT_LABELS: Partial<Record<VerbFormSlot, string>> = {
  "imperative.formal": "Imperativo formale (Lei)",
  "imperative.informal": "Imperativo informale (tu)",
  "present.1s": "Presente (io)",
  "present.2s": "Presente (tu)",
  "present.3s": "Presente (lui/lei)",
  gerund: "Gerundio",
  "past-participle": "Participio passato",
  "present.1p": "Presente (noi)",
  "present.3p": "Presente (loro)",
  "subjunctive.3s": "Congiuntivo (lui/lei)",
  "subjunctive.2s": "Congiuntivo (tu)",
  "past.1s": "Passato remoto (io)",
  "past.3s": "Passato remoto (lui/lei)",
};

/**
 * Bundled datasets, by the id a language's app file names (app/<code>.json dictionary). Each
 * dataset is built on first use. A language with none and a catalog gets its catalog dictionary;
 * any other language shows "not yet available".
 */
const DICTIONARY_DATASETS: Record<string, () => DictionaryDataset> = {
  "spanish-medical-trades": () => ({
    words: dictWords,
    profiles: verbProfilesFromAuthored(verbProfiles),
    phraseExample: "El médico examina al paciente...",
    slotLabels: MEDICAL_TRADES_SLOT_LABELS,
  }),
  "italian-core": () => ({
    words: mergeWithCore(italianDictWords, coreItalianWords),
    profiles: verbProfilesFromAuthored(italianVerbProfiles),
    phraseExample: "Il medico esamina il paziente...",
    slotLabels: ITALIAN_SLOT_LABELS,
  }),
  "japanese-core": () => ({
    words: japaneseWordData as DictWord[],
    profiles: {},
    glossOnly: "English",
    slotLabels: {},
  }),
};

const datasetCache = new Map<string, DictionaryDataset>();

/** The dataset a language's app file names, built once. */
function datasetFor(pack: LanguagePack | null): DictionaryDataset | null {
  const id = pack ? appData(pack).dictionary : null;
  const build = id ? DICTIONARY_DATASETS[id] : undefined;
  if (!id || !build) return null;
  let dataset = datasetCache.get(id);
  if (!dataset) datasetCache.set(id, (dataset = build()));
  return dataset;
}

/** A neutral label for a slot a dataset does not name ("Present · 1st singular"). */
function neutralSlotLabel(slot: VerbFormSlot): string {
  const [tense, person] = slot.split(".");
  const title = tense.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  if (!person) return title;
  const ordinal = { "1": "1st", "2": "2nd", "3": "3rd" }[person[0]] ?? person[0];
  const number = person[1] === "p" ? "plural" : person[1] === "s" ? "singular" : person.slice(1);
  return /^\d/.test(person) ? `${title} · ${ordinal} ${number}` : `${title} · ${person}`;
}

/** Merge module dictionary with Core frequency set. Core entries win on
 *  headword collision so the statistical foundation always surfaces under
 *  the Core filter. */
function mergeWithCore(moduleWords: DictWord[], coreWords: DictWord[]): DictWord[] {
  const byLemma = new Map<string, DictWord>();
  for (const w of moduleWords) {
    byLemma.set(w.word.toLowerCase(), w);
  }
  for (const w of coreWords) {
    byLemma.set(w.word.toLowerCase(), w);
  }
  return Array.from(byLemma.values());
}

/** "A and B" for the languages whose dataset carries verb profiles. */
function conjugationLanguageNames(): string {
  const names = PACKS.filter((pack) => {
    const dataset = datasetFor(pack);
    return Boolean(dataset && Object.keys(dataset.profiles).length > 0);
  }).map((pack) => pack.name);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
    : names.join("");
}

// ─── Category chip data ───────────────────────────────────────────────────────

type CategoryFilter = "all" | WordCategory;

/** All → Core (frequency foundation) → specialty modules A–Z. */
const CATEGORY_CHIPS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "core", label: "Core" },
  { key: "academic", label: "Academic" },
  { key: "business", label: "Business" },
  { key: "mission", label: "Church / Mission" },
  { key: "construction", label: "Construction" },
  { key: "roofing", label: "Roofing" },
  { key: "daily", label: "Daily Life" },
  { key: "hospitality", label: "Hospitality" },
  { key: "medical", label: "Medical" },
  { key: "sports", label: "Sports" },
];

// ─── Verb phase section ───────────────────────────────────────────────────────

function VerbPhaseSection({
  phase: forms,
  open,
  onToggle,
  slotLabels,
}: {
  phase: VerbProfilePhase;
  open: boolean;
  onToggle: () => void;
  slotLabels: Partial<Record<VerbFormSlot, string>>;
}) {
  return (
    <div className="border-t border-border/30 last:rounded-b-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-card/60"
      >
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold">
            {forms.label}
          </span>
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">{forms.hint}</span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-1 sm:grid-cols-3">
          {forms.forms.map(({ slot: key, form }) => {
            const label = slotLabels[key] ?? neutralSlotLabel(key);
            return (
              <div
                key={key}
                className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5"
              >
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  {label}
                </p>
                <MorphDisplay form={form} size="sm" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Word card ────────────────────────────────────────────────────────────────

function WordCard({
  word,
  profiles,
  slotLabels,
}: {
  word: DictWord;
  profiles: Record<string, VerbProfile>;
  slotLabels: Partial<Record<VerbFormSlot, string>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openPhase, setOpenPhase] = useState<number | null>(null);
  const { state, dispatch } = useApp();
  const { addCard, hasCard } = useFlashcards();
  const saved = hasCard(state.selectedLanguage, word.word);

  function saveToCards() {
    addCard({
      language: state.selectedLanguage,
      word: word.word,
      translation: word.english,
      example: word.examples[0]?.target ?? "",
      exampleTranslation: word.examples[0]?.english ?? "",
      moduleId: word.moduleId ?? state.activeModuleId ?? undefined,
    });
    dispatch({
      type: "ADD_VOCAB_ITEMS",
      lang: state.selectedLanguage,
      payload: [
        {
          word: word.word,
          translation: word.english,
          category: "saved",
          correctCount: 0,
          moduleId: word.moduleId ?? state.activeModuleId ?? undefined,
        },
      ],
    });
    toast.success(saved ? "Card already in your study flow" : "Added to your study cards");
  }

  const profile: VerbProfile | undefined =
    word.verbProfile ?? (word.verbProfileId ? profiles[word.verbProfileId] : undefined);

  function togglePhase(p: number) {
    setOpenPhase((prev) => (prev === p ? null : p));
  }

  return (
    <article className="flex flex-col rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-lg hover:border-gold/20">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display text-xl leading-tight" style={{ color: "var(--foreground)" }}>
            {word.word}
          </h3>
          <span
            className="shrink-0 rounded-full border border-border/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            {word.partOfSpeech}
            {word.gender ? ` · ${word.gender === "masculine" ? "m." : "f."}` : ""}
          </span>
        </div>

        {word.pronunciation && (
          <p
            className="font-mono text-[10px] tracking-wide mb-1"
            style={{ color: "var(--gold)", opacity: 0.8 }}
          >
            /{word.pronunciation}/
          </p>
        )}

        <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {word.english}
        </p>

        {word.context && (
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.75 }}>
            {word.context}
          </p>
        )}
        {word.lessonHref && (
          <a
            href={word.lessonHref}
            className="mt-2 block text-xs font-semibold text-gold underline underline-offset-2"
          >
            Open source lesson
          </a>
        )}
        <button
          type="button"
          onClick={saveToCards}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20"
        >
          <BookmarkPlus className="h-3.5 w-3.5" /> {saved ? "Saved to cards" : "Add to cards"}
        </button>
      </div>

      {/* Expand toggle */}
      {(word.examples.length > 0 || profile) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 border-t border-border/30 px-4 py-2 text-left transition-colors hover:bg-card/80"
        >
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--gold)" }}
          >
            {expanded ? "Less" : "More"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3" style={{ color: "var(--gold)" }} />
          ) : (
            <ChevronDown className="h-3 w-3" style={{ color: "var(--gold)" }} />
          )}
        </button>
      )}

      {expanded && (
        <div>
          {/* Examples */}
          {word.examples.length > 0 && (
            <div className="px-4 py-3 space-y-2 border-t border-border/20">
              {word.examples.map((ex, i) => (
                <div key={i}>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>
                    {ex.target}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {ex.english}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Verb profile phases */}
          {profile && (
            <div className="border-t border-border/30">
              <div className="px-4 py-2 flex items-center gap-2">
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Verb profile
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--gold)" }}>
                  -{profile.infinitiveEnding}
                  {profile.irregularType ? ` · ${profile.irregularType}` : ""}
                </span>
              </div>
              {profile.phases.map((phase, p) => (
                <VerbPhaseSection
                  key={p}
                  phase={phase}
                  open={openPhase === p}
                  onToggle={() => togglePhase(p)}
                  slotLabels={slotLabels}
                />
              ))}
              {profile.clinicalNote && (
                <div className="px-4 py-2 border-t border-border/20">
                  <p className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>
                    Note: {profile.clinicalNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Phrase engine ────────────────────────────────────────────────────────────

function PhraseEngine({ noun, example }: { noun: string; example: string }) {
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!phrase.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("https://lt-dictionary.vercel.app/api/phrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: phrase.trim(), targetLanguage: noun }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = (await res.json()) as { result?: string; analysis?: string };
      setResult(data.result ?? data.analysis ?? JSON.stringify(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-5">
      <h2 className="font-display text-lg mb-1" style={{ color: "var(--foreground)" }}>
        Phrase Engine
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        Paste a phrase in {noun} to get morphological analysis and translation.
      </p>

      <textarea
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void analyze();
        }}
        placeholder={`e.g. ${example}`}
        rows={3}
        className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-muted-foreground/50"
        style={{ color: "var(--foreground)" }}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => void analyze()}
          disabled={loading || !phrase.trim()}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40"
          style={{
            background: "var(--gold)",
            color: "var(--background)",
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Analyze
        </button>
        <span className="font-mono text-[10px] text-muted-foreground">⌘ + Enter to run</span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className="mt-3 rounded-lg border border-border/40 bg-background/40 px-4 py-3 text-sm whitespace-pre-wrap"
          style={{ color: "var(--foreground)" }}
        >
          {result}
        </div>
      )}
    </section>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function DictionaryTab() {
  const { state } = useApp();
  const pack = packFor(state.selectedLanguage);
  const catalogDictionary = useCatalogDictionary(pack);
  const rawConfig = datasetFor(pack) ?? catalogDictionary;
  // A dataset glossed in one native language only is not offered with another native.
  const config =
    rawConfig && (!rawConfig.glossOnly || rawConfig.glossOnly === state.nativeLanguage)
      ? rawConfig
      : null;
  // The Roofing chip is offered whenever the language has roofing entries, so they must not
  // depend on the active module (they were empty unless the Roofing module was selected).
  // Learners outside the released course packs keep the base dataset: roofing entries only for
  // Spanish (owner decisions 2 and 3).
  const packRules = followsPackRules(pack);
  const roofingWords = useMemo(
    () =>
      config && (packRules || state.selectedLanguage === "Spanish")
        ? roofingWordsFor(state.selectedLanguage)
        : [],
    [config, packRules, state.selectedLanguage],
  );
  const words = useMemo(() => [...(config?.words ?? []), ...roofingWords], [config, roofingWords]);
  const startCategory: CategoryFilter =
    state.activeModuleId === "roofing" && roofingWords.length > 0 ? "roofing" : "all";
  const [category, setCategory] = useState<CategoryFilter>(startCategory);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCategory(startCategory);
  }, [startCategory, state.selectedLanguage]);
  // Every language shows the full chip row, as the base app did for Spanish.
  const chips = CATEGORY_CHIPS;
  const profiles = config?.profiles ?? {};

  const filtered = useMemo(() => {
    // French and Italian fold both sides with the language's own marks (être / etre, œuf / oeuf);
    // every other learner keeps the base lower-case match and default sort.
    const key = (text: string) =>
      packRules && pack ? foldMarks(normalizeKey(text, pack), pack) : text.toLowerCase();
    const q = key(query.trim());
    return words
      .filter((w) => {
        const catMatch = category === "all" || w.category === category;
        const searchMatch =
          !q ||
          key(w.word).includes(q) ||
          key(w.english).includes(q) ||
          key(w.pronunciation).includes(q);
        return catMatch && searchMatch;
      })
      .sort((a, b) =>
        a.word.localeCompare(b.word, packRules ? pack?.script.segmenterLocale : undefined, {
          sensitivity: "base",
        }),
      );
  }, [words, category, query, pack, packRules]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 shrink-0" style={{ color: "var(--gold)" }} strokeWidth={1.6} />
        <div>
          <h1
            className="font-display text-2xl leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            Dictionary
          </h1>
          <p
            className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            {words.length > 0
              ? `${words.length} entries · ${state.selectedLanguage}`
              : `Not yet available for ${state.selectedLanguage}`}
          </p>
        </div>
      </div>

      {config && (
        <>
          {state.selectedLanguage === "Japanese" && (
            <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-foreground">
              Japanese 101 lesson glossary · draft wording. Entries link to their source lesson;
              full dictionary and form guidance are still in progress.
            </p>
          )}
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--muted-foreground)" }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${pack?.name ?? "the language"} or English…`}
              className="w-full rounded-xl border border-border/50 bg-card/50 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-muted-foreground/50"
              style={{ color: "var(--foreground)" }}
            />
          </div>

          {/* Category chips — All → Core → modules A–Z */}
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const active = category === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setCategory(chip.key)}
                  className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-all"
                  style={{
                    borderColor: active ? "var(--gold)" : "var(--border)",
                    background: active
                      ? "color-mix(in oklab, var(--gold) 15%, transparent)"
                      : "transparent",
                    color: active ? "var(--gold)" : "var(--muted-foreground)",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Results count */}
          {query || category !== "all" ? (
            <p
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          ) : null}

          {/* Word grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  profiles={profiles}
                  slotLabels={config.slotLabels}
                />
              ))}
            </div>
          )}

          {/* No search results */}
          {words.length > 0 && filtered.length === 0 && (
            <div className="rounded-xl border border-border/30 bg-card/20 px-6 py-8 text-center">
              <p className="font-display text-base" style={{ color: "var(--muted-foreground)" }}>
                No words match "{query}"
              </p>
            </div>
          )}

          {/* Phrase Engine */}
          {config.phraseExample && pack && (
            <PhraseEngine noun={pack.name} example={config.phraseExample} />
          )}
        </>
      )}

      {/* Language not yet supported */}
      {!config && (
        <div className="rounded-xl border border-border/40 bg-card/30 px-6 py-10 text-center">
          <BookOpen
            className="mx-auto mb-3 h-10 w-10 opacity-30"
            style={{ color: "var(--gold)" }}
            strokeWidth={1.2}
          />
          <p className="font-display text-lg mb-1" style={{ color: "var(--foreground)" }}>
            Dictionary not yet available for {state.selectedLanguage}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {/* Learners outside the released course packs keep the base note (owner decision 3). */}
            {!followsPackRules(packFor(state.selectedLanguage))
              ? "Verb-conjugation lookup is live for Spanish and Italian so far — more languages are on the way."
              : conjugationLanguageNames()
                ? `Verb-conjugation lookup is live for ${conjugationLanguageNames()} so far — more languages are on the way.`
                : "More languages are on the way."}
          </p>
        </div>
      )}
    </div>
  );
}
