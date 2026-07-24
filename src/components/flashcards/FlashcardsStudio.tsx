import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, RotateCcw, Volume2, Sparkle, Trash2, BookOpen, Shuffle } from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  useFlashcards,
  FLASHCARD_CATEGORIES,
  CATEGORY_LABEL,
  type FlashcardEntry,
  type FlashcardCategory,
} from "@/state/flashcard-state";
import { useSpeech } from "@/state/speech-state";
import { useServerFn } from "@tanstack/react-start";
import { getCategoryBlocks } from "@/lib/flashcard-blocks";
import { translatePhrases } from "@/fns/phrase-translate.functions";
import { configureUtterance } from "@/lib/voices";
import { FREQUENCY_CONJUGATIONS, type ConjugationSet } from "@/data/frequency-conjugations";
import type { SrsGrade } from "@/lib/srs";

const PERSON_LABEL = {
  Italian: { s1: "io", s2: "tu", s3: "lui/lei", p1: "noi", p2: "voi", p3: "loro" },
  Spanish: { s1: "yo", s2: "tú", s3: "él/ella", p1: "nosotros", p2: "vosotros", p3: "ellos" },
  French: { s1: "je", s2: "tu", s3: "il/elle", p1: "nous", p2: "vous", p3: "ils" },
  German: { s1: "ich", s2: "du", s3: "er/sie", p1: "wir", p2: "ihr", p3: "sie" },
  Portuguese: { s1: "eu", s2: "tu", s3: "ele/ela", p1: "nós", p2: "vós", p3: "eles" },
} as const;

const GRADE_BUTTONS: { grade: SrsGrade; label: string; hint: string; cls: string }[] = [
  {
    grade: "again",
    label: "Again",
    hint: "< 1d",
    cls: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
  },
  {
    grade: "hard",
    label: "Hard",
    hint: "1d",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  },
  {
    grade: "good",
    label: "Good",
    hint: "6d",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
  },
  {
    grade: "easy",
    label: "Easy",
    hint: "16d+",
    cls: "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
  },
];

function daysUntil(dueDate: number): string {
  const diff = dueDate - Date.now();
  if (diff <= 0) return "now";
  const days = Math.round(diff / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

export function FlashcardsStudio() {
  const { state: appState } = useApp();
  const {
    state,
    seedStarter,
    seedDeck,
    syncVocab,
    addBlockCards,
    reviewCard,
    removeCard,
    cardsForCategories,
    dueCardsForCategories,
    hasModuleDeck,
  } = useFlashcards();
  const { accent, voiceURI } = useSpeech();
  const language = appState.selectedLanguage;
  const moduleId = appState.activeModuleId;
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const moduleAvailable = moduleId ? hasModuleDeck(moduleId) : false;
  const availableCategories = useMemo(
    () => FLASHCARD_CATEGORIES.filter((c) => c !== "module" || moduleAvailable),
    [moduleAvailable],
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...availableCategories]);

  // Dynamic topic decks (Faith/Medical/Trades/...) — English headword pools
  // translated into the target language on first use, 24 words per batch,
  // persisted as ordinary cards so translation happens once per word ever.
  const translate = useServerFn(translatePhrases);
  const blocks = useMemo(() => getCategoryBlocks(), []);
  const [introducing, setIntroducing] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  const introducedCount = useCallback(
    (blockId: string) => cardsForCategories(language, [`block:${blockId}`]).length,
    [cardsForCategories, language],
  );

  const introduceBatch = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block || introducing) return;
      const have = new Set(
        cardsForCategories(language, [`block:${blockId}`]).map((c) => c.translation.toLowerCase()),
      );
      const next = block.words.filter((w) => !have.has(w.toLowerCase())).slice(0, 24);
      if (next.length === 0) return;
      setIntroducing(blockId);
      setBlockError(null);
      try {
        const pairs: { english: string; translation: string }[] = [];
        for (let i = 0; i < next.length; i += 8) {
          const res = await translate({
            data: {
              phrases: next.slice(i, i + 8),
              targetLanguage: language,
              context: `${block.label} vocabulary`,
            },
          });
          if (res.error || !res.phrases) throw new Error(res.error ?? "translation failed");
          pairs.push(...res.phrases);
        }
        addBlockCards(language, blockId, pairs);
      } catch {
        setBlockError(`Couldn't translate the ${block.label} deck right now — try again.`);
      } finally {
        setIntroducing(null);
      }
    },
    [blocks, introducing, cardsForCategories, language, translate, addBlockCards],
  );

  // Seed every deck category once per language (verbs already had its own
  // dedicated seeder from before this multi-category system existed — kept
  // separate since it also carries the frequencyId conjugation lookup).
  useEffect(() => {
    if (!state.hydrated) return;
    seedStarter(language);
    for (const category of FLASHCARD_CATEGORIES) {
      if (category === "vocab" || category === "verbs") continue;
      if (category === "module") {
        if (moduleAvailable && moduleId) seedDeck(language, "module", moduleId);
        continue;
      }
      seedDeck(language, category);
    }
  }, [state.hydrated, language, moduleId, moduleAvailable, seedStarter, seedDeck]);

  // Mirror the user's saved "My Vocab" words (Reader save button + guided
  // Q&A) into the Vocab category, so WordCard's "Study your saved words →"
  // lands on a deck that actually contains them.
  useEffect(() => {
    if (!state.hydrated) return;
    if (appState.vocabLang !== language || appState.userVocab.length === 0) return;
    syncVocab(
      language,
      appState.userVocab.map((v) => ({ word: v.word, translation: v.translation })),
    );
  }, [state.hydrated, language, appState.vocabLang, appState.userVocab, syncVocab]);

  // Selection defaults to "everything available" and re-syncs when the
  // language/module changes what's available (e.g. switching to a language
  // with no module deck yet drops "module" from the selectable set).
  useEffect(() => {
    setSelectedCategories((prev) => {
      const stillValid = prev.filter(
        (c) => c.startsWith("block:") || (availableCategories as string[]).includes(c),
      );
      return stillValid.length > 0 ? stillValid : [...availableCategories];
    });
  }, [availableCategories]);

  function toggleCategory(section: string) {
    setSelectedCategories((prev) =>
      prev.includes(section) ? prev.filter((c) => c !== section) : [...prev, section],
    );
    // First enable of an empty topic deck kicks off its first translated batch.
    if (section.startsWith("block:")) {
      const blockId = section.slice("block:".length);
      if (introducedCount(blockId) === 0) void introduceBatch(blockId);
    }
  }

  const allSelected = availableCategories.every((c) => selectedCategories.includes(c));

  const allCards = useMemo(
    () => cardsForCategories(language, selectedCategories),
    [cardsForCategories, language, selectedCategories],
  );
  const dueCards = useMemo(
    () => dueCardsForCategories(language, selectedCategories),
    [dueCardsForCategories, language, selectedCategories],
  );
  const current = dueCards[0];

  const nextUp = useMemo(() => {
    if (dueCards.length > 0) return null;
    const upcoming = allCards
      .filter((c) => c.srs.dueDate > Date.now())
      .sort((a, b) => a.srs.dueDate - b.srs.dueDate)[0];
    return upcoming ?? null;
  }, [allCards, dueCards]);

  const activeCard = current ?? nextUp ?? allCards[0];
  const conjugation: ConjugationSet | undefined = activeCard?.frequencyId
    ? FREQUENCY_CONJUGATIONS[activeCard.frequencyId]?.[language]
    : undefined;
  const personLabels =
    language in PERSON_LABEL ? PERSON_LABEL[language as keyof typeof PERSON_LABEL] : null;

  const grade = useCallback(
    (g: SrsGrade) => {
      if (!current) return;
      reviewCard(current.id, g);
      setFlipped(false);
      setReviewedCount((n) => n + 1);
    },
    [current, reviewCard],
  );

  // Keyboard review flow: Enter flips the card; Space flips it if still
  // hidden, or advances with a "Good" grade if already flipped (matches the
  // Anki convention this was modeled on); 1-4 grade Again/Hard/Good/Easy
  // directly once the translation is showing, mirroring GRADE_BUTTONS order.
  useEffect(() => {
    if (!current) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
        else grade("good");
        return;
      }
      if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        grade(GRADE_BUTTONS[Number(e.key) - 1].grade);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, flipped, grade]);

  function speak(word: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(word);
    // Was previously missing lang/voice entirely, so the browser fell back to
    // whatever default system voice was active (often English) — that's the
    // actual cause of wrong-accent pronunciation, not just a display issue.
    configureUtterance(utter, accent, voiceURI);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <div className="fade-in mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <Layers className="h-3.5 w-3.5" />
            Flashcards
          </div>
          <h1 className="font-display text-3xl text-foreground">
            Spaced repetition for {language}
          </h1>
          <p className="font-display text-sm italic text-muted-foreground">
            High-frequency words, reviewed right before you'd forget them
          </p>
        </div>
        <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-gold">
            {dueCards.length} due
          </span>
          <span className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-muted-foreground">
            {allCards.length} total
          </span>
        </div>
      </div>

      <CategorySelector
        language={language}
        available={availableCategories}
        selected={selectedCategories}
        allSelected={allSelected}
        onToggle={toggleCategory}
        onSelectAll={() =>
          setSelectedCategories([
            ...availableCategories,
            ...blocks.filter((b) => introducedCount(b.id) > 0).map((b) => `block:${b.id}`),
          ])
        }
        cardsForCategories={cardsForCategories}
        dueCardsForCategories={dueCardsForCategories}
        blocks={blocks}
        introducing={introducing}
        introducedCount={introducedCount}
        onIntroduceMore={introduceBatch}
      />
      {blockError && (
        <p className="mb-4 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-400">
          {blockError}
        </p>
      )}

      {current ? (
        <div className="flex flex-col items-center gap-5">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-[260px] w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-8 text-center shadow-luxe backdrop-blur transition-colors hover:border-gold/40"
          >
            {!flipped ? (
              <>
                <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {current.partOfSpeech ?? "word"} · tap to flip
                </span>
                <span className="font-display text-4xl text-foreground">{current.word}</span>
                {current.romanization && (
                  <span className="mt-2 font-mono text-sm text-gold/80">
                    {current.romanization}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                  ✦ translation
                </span>
                <span className="font-display text-3xl text-foreground">{current.translation}</span>
                {current.example && (
                  <div className="mt-5 rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                    <p className="font-display text-base italic text-foreground">
                      "{current.example}"
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {current.exampleTranslation}
                    </p>
                  </div>
                )}
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(current.word);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
            >
              <Volume2 className="h-3 w-3" /> Pronounce
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {reviewedCount} reviewed this session
            </span>
          </div>

          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
            {flipped ? "space next · 1-4 grade" : "enter / space to flip"}
          </div>

          {flipped && (
            <div className="grid w-full max-w-xl grid-cols-4 gap-2">
              {GRADE_BUTTONS.map((b, i) => (
                <button
                  key={b.grade}
                  onClick={() => grade(b.grade)}
                  className={`flex flex-col items-center rounded-xl border px-2 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${b.cls}`}
                >
                  {b.label}
                  <span className="mt-0.5 text-[9px] opacity-70">{b.hint}</span>
                  <span className="mt-1 rounded border border-current/30 px-1 text-[8px] opacity-60">
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 p-14 text-center backdrop-blur">
          <Sparkle className="h-6 w-6 text-gold" />
          <p className="font-display text-lg italic text-foreground">All caught up</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {nextUp
              ? `Next review in ${daysUntil(nextUp.srs.dueDate)}`
              : "Add words from the Reader to build your deck"}
          </p>
        </div>
      )}

      {allCards.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2 px-1">
              <RotateCcw className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Your deck · {allCards.length} cards
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {allCards
                  .slice()
                  .sort((a, b) => a.srs.dueDate - b.srs.dueDate)
                  .map((c) => (
                    <DeckRow key={c.id} card={c} onRemove={() => removeCard(c.id)} />
                  ))}
              </div>
            </div>
          </div>

          {conjugation && personLabels && (
            <div>
              <div className="mb-3 flex items-center gap-2 px-1">
                <BookOpen className="h-3.5 w-3.5 text-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Conjugation · {conjugation.infinitive}
                </span>
              </div>
              <ConjugationCard
                conjugation={conjugation}
                personLabels={personLabels}
                onSpeak={speak}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySelector({
  language,
  available,
  selected,
  allSelected,
  onToggle,
  onSelectAll,
  cardsForCategories,
  dueCardsForCategories,
  blocks,
  introducing,
  introducedCount,
  onIntroduceMore,
}: {
  language: FlashcardEntry["language"];
  available: readonly string[];
  selected: string[];
  allSelected: boolean;
  onToggle: (section: string) => void;
  onSelectAll: () => void;
  cardsForCategories: (
    language: FlashcardEntry["language"],
    sections: string[],
  ) => FlashcardEntry[];
  dueCardsForCategories: (
    language: FlashcardEntry["language"],
    sections: string[],
  ) => FlashcardEntry[];
  blocks: { id: string; label: string; words: string[] }[];
  introducing: string | null;
  introducedCount: (blockId: string) => number;
  onIntroduceMore: (blockId: string) => void;
}) {
  return (
    <div className="mb-8">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <Shuffle className="h-3.5 w-3.5 text-gold" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Study sections · tap to mix
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-1">
        <button
          onClick={onSelectAll}
          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
            allSelected
              ? "border-gold bg-gold/15 text-gold"
              : "border-border/60 bg-card/30 text-muted-foreground hover:border-gold/40"
          }`}
        >
          All
        </button>
        {available.map((category) => {
          const total = cardsForCategories(language, [category]).length;
          const due = dueCardsForCategories(language, [category]).length;
          const active = selected.includes(category);
          return (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border/60 bg-card/30 text-muted-foreground hover:border-gold/40"
              }`}
            >
              {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
              <span className={active ? "text-gold/70" : "text-muted-foreground/60"}>
                {due > 0 ? `${due}/${total}` : total}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mb-2.5 mt-4 flex items-center gap-2 px-1">
        <BookOpen className="h-3.5 w-3.5 text-gold" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Topic decks · translated as you go
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-1">
        {blocks.map((b) => {
          const token = `block:${b.id}`;
          const introduced = introducedCount(b.id);
          const due = introduced > 0 ? dueCardsForCategories(language, [token]).length : 0;
          const active = selected.includes(token);
          const busy = introducing === b.id;
          return (
            <span key={b.id} className="inline-flex items-center">
              <button
                onClick={() => onToggle(token)}
                disabled={busy}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border/60 bg-card/30 text-muted-foreground hover:border-gold/40"
                } ${busy ? "opacity-60" : ""}`}
              >
                {b.label}
                <span className={active ? "text-gold/70" : "text-muted-foreground/60"}>
                  {busy
                    ? "translating…"
                    : due > 0
                      ? `${due} due · ${introduced}/${b.words.length}`
                      : `${introduced}/${b.words.length}`}
                </span>
              </button>
              {active && !busy && introduced > 0 && introduced < b.words.length && (
                <button
                  onClick={() => onIntroduceMore(b.id)}
                  title={`Translate the next ${Math.min(24, b.words.length - introduced)} words`}
                  className="ml-1 rounded-full border border-gold/40 bg-gold/[0.08] px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold/15"
                >
                  +24
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ConjugationCard({
  conjugation,
  personLabels,
  onSpeak,
}: {
  conjugation: ConjugationSet;
  personLabels: { s1: string; s2: string; s3: string; p1: string; p2: string; p3: string };
  onSpeak: (word: string) => void;
}) {
  const rows: { singular: [string, string]; plural: [string, string] }[] = [
    {
      singular: [personLabels.s1, conjugation.presentTense.firstSingular],
      plural: [personLabels.p1, conjugation.presentTense.firstPlural],
    },
    {
      singular: [personLabels.s2, conjugation.presentTense.secondSingular],
      plural: [personLabels.p2, conjugation.presentTense.secondPlural],
    },
    {
      singular: [personLabels.s3, conjugation.presentTense.thirdSingular],
      plural: [personLabels.p3, conjugation.presentTense.thirdPlural],
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/50 bg-card/60 px-4 py-3">
        <span className="font-display text-lg text-foreground">{conjugation.infinitive}</span>
        <button
          onClick={() => onSpeak(conjugation.infinitive)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
        >
          <Volume2 className="h-3 w-3" /> Pronounce
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-gold">
          Present tense
        </div>
        <table className="w-full border-collapse text-left">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border/30 first:border-t-0">
                {(["singular", "plural"] as const).map((col) => {
                  const [person, form] = row[col];
                  return (
                    <td key={col} className="py-1.5 pr-3">
                      <button
                        onClick={() => onSpeak(form)}
                        className="group flex w-full items-baseline gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-gold/10"
                      >
                        <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {person}
                        </span>
                        <span className="font-display text-[15px] text-foreground group-hover:text-gold">
                          {form}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border/50 bg-border/30">
        <div className="bg-card/40 px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Gerund
          </div>
          <div className="mt-0.5 font-display text-[15px] text-foreground">
            {conjugation.gerund}
          </div>
        </div>
        <div className="bg-card/40 px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Past participle
          </div>
          <div className="mt-0.5 font-display text-[15px] text-foreground">
            {conjugation.pastParticiple}
          </div>
          <div className="mt-1 font-mono text-[10px] text-gold/80">
            {conjugation.perfectExample}
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Common uses
        </div>
        <div className="space-y-1.5">
          {conjugation.commonUses.map((u, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="font-display text-[13px] italic text-foreground">"{u.phrase}"</span>
              <span className="font-mono text-[10px] text-muted-foreground">— {u.translation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeckRow({ card, onRemove }: { card: FlashcardEntry; onRemove: () => void }) {
  const due = card.srs.dueDate <= Date.now();
  return (
    <div className="flex items-center justify-between gap-3 bg-card/20 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display text-[15px] text-foreground">{card.word}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {card.translation}
        </span>
        {card.source === "starter" && (
          <span className="shrink-0 rounded-full border border-gold/30 bg-gold/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.14em] text-gold/80">
            core
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.14em] ${due ? "text-gold" : "text-muted-foreground"}`}
        >
          {due ? "due now" : `in ${daysUntil(card.srs.dueDate)}`}
        </span>
        {card.source === "user" && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${card.word}`}
            className="text-muted-foreground/60 transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
