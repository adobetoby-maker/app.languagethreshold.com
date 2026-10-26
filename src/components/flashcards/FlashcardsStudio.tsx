import { playFlashcardSuccess } from "@/lib/sound-effects";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers, RotateCcw, Volume2, Sparkle, Trash2, BookOpen, Shuffle, Plus } from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  useFlashcards,
  FLASHCARD_CATEGORIES,
  CATEGORY_LABEL,
  type FlashcardEntry,
  type FlashcardCategory,
} from "@/state/flashcard-state";
import { nextSectionSelection } from "@/state/section-selection";
import { useSpeech } from "@/state/speech-state";
import { useServerFn } from "@tanstack/react-start";
import { getCategoryBlocks } from "@/lib/flashcard-blocks";
import { translatePhrases } from "@/fns/phrase-translate.functions";
import { getModule } from "@/data/modules";
import { getAvailableModuleLessons } from "@/data/module-starters";
import { useLibrary } from "@/state/library-state";
import { getCurriculum } from "@/data/curriculum";
import { getLessonDefinition, modulePracticeVersion } from "@/lib/lesson-definition";
import { flashcardWordGloss, hasDistinctFlashcardExample } from "@/lib/flashcard-glosses";
import { flashcardUsageExample } from "@/lib/flashcard-usage";
import { authoredModuleDeck } from "@/lib/authored-module-deck";
import { generateModuleDeck } from "@/fns/module-deck.functions";
import { getCuratedModulePairs } from "@/data/curated-module-pairs";
import { useOwnedSpeaker } from "@/hooks/use-owned-speaker";
import { FREQUENCY_CONJUGATIONS, type ConjugationSet } from "@/data/frequency-conjugations";
import { getJapaneseConjugation, type JapaneseConjugationSet } from "@/data/japanese-conjugations";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { JapaneseConjugationCard } from "./JapaneseConjugationCard";
import type { SrsGrade } from "@/lib/srs";

const FURIGANA_FC_KEY = "lt.flashcards.furigana.v1";

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
    cls: "border-rose-400 bg-rose-300 text-rose-950 enabled:hover:bg-rose-200",
  },
  {
    grade: "hard",
    label: "Hard",
    hint: "1d",
    cls: "border-amber-400 bg-amber-300 text-amber-950 enabled:hover:bg-amber-200",
  },
  {
    grade: "good",
    label: "Good",
    hint: "6d",
    cls: "border-emerald-400 bg-emerald-300 text-emerald-950 enabled:hover:bg-emerald-200",
  },
  {
    grade: "easy",
    label: "Easy",
    hint: "16d+",
    cls: "border-sky-400 bg-sky-300 text-sky-950 enabled:hover:bg-sky-200",
  },
];

function daysUntil(dueDate: number): string {
  const diff = dueDate - Date.now();
  if (diff <= 0) return "now";
  const days = Math.round(diff / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

export function FlashcardsStudio() {
  const { state: appState, dispatch: appDispatch } = useApp();
  const {
    state,
    seedStarter,
    seedDeck,
    syncVocab,
    addCard,
    addBlockCards,
    addModuleCards,
    reviewCard,
    removeCard,
    cardsForCategories,
    dueCardsForCategories,
    hasModuleDeck,
  } = useFlashcards();
  const library = useLibrary();
  const { accent, voiceURI } = useSpeech();
  const language = appState.selectedLanguage;
  const moduleId = appState.activeModuleId;
  const moduleName = getModule(moduleId)?.name ?? "Module";
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);

  // Persist furigana preference (default ON for Japanese cards)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURIGANA_FC_KEY);
      if (raw === "off") setShowFurigana(false);
      else if (raw === "on") setShowFurigana(true);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FURIGANA_FC_KEY, showFurigana ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [showFurigana]);

  const moduleAvailable = moduleId ? hasModuleDeck(moduleId) : false;
  const moduleSection = moduleAvailable && moduleId ? `module:${moduleId}` : null;
  const generateFieldDeck = useServerFn(generateModuleDeck);
  const generatedAttempts = useRef(new Set<string>());
  const [generatingFieldDeck, setGeneratingFieldDeck] = useState(false);
  const [fieldDeckError, setFieldDeckError] = useState<string | null>(null);
  const lessonDeck = useMemo(
    () => authoredModuleDeck(moduleId, language, appState.nativeLanguage),
    [moduleId, language, appState.nativeLanguage],
  );
  const generatedCount = moduleId
    ? Object.values(state.cards).filter((card) =>
        card.id.startsWith(`module-generated:${language}:${moduleId}:`),
      ).length
    : 0;

  const readingIds = useMemo(
    () => (moduleId ? getAvailableModuleLessons(moduleId, language, library.state.entries) : []),
    [moduleId, language, library.state.entries],
  );
  const readingPairs = useMemo(() => {
    if (lessonDeck || moduleId === "roofing") return []; // The authored deck includes both learning directions.
    const selected = new Set(readingIds);
    return library.state.entries
      .filter((entry) => selected.has(entry.id))
      .flatMap((entry) => entry.sentences)
      .filter((pair) => pair.en.trim() && pair.target.trim() && pair.en.length <= 180)
      .map((pair) => ({ english: pair.en, translation: pair.target, kind: "phrase" as const }));
  }, [moduleId, readingIds, library.state.entries, lessonDeck]);

  useEffect(() => {
    if (!state.hydrated || !moduleId || !readingPairs.length) return;
    addModuleCards(language, moduleId, "reading", readingPairs);
  }, [state.hydrated, moduleId, language, readingPairs, addModuleCards]);

  useEffect(() => {
    if (!state.hydrated || (moduleId !== "rock-climbing" && moduleId !== "sport-fishing")) return;
    let active = true;
    void getCuratedModulePairs(moduleId, language).then((pairs) => {
      if (active && pairs.length) addModuleCards(language, moduleId, "curated", pairs);
    });
    return () => {
      active = false;
    };
  }, [state.hydrated, moduleId, language, addModuleCards]);

  const loadFieldDeck = useCallback(
    async (force = false) => {
      const climbingHasCuratedLanguage =
        moduleId === "rock-climbing" &&
        [
          "Spanish",
          "English",
          "French",
          "German",
          "Italian",
          "Japanese",
          "Korean",
          "Portuguese",
        ].includes(language);
      if (
        !moduleId ||
        lessonDeck ||
        moduleId === "roofing" ||
        climbingHasCuratedLanguage ||
        !state.hydrated ||
        generatedCount >= 32
      )
        return;
      const key = `${language}:${moduleId}`;
      if (!force && generatedAttempts.current.has(key)) return;
      generatedAttempts.current.add(key);
      setGeneratingFieldDeck(true);
      setFieldDeckError(null);
      try {
        const result = await generateFieldDeck({
          data: { moduleId, language, nativeLanguage: appState.nativeLanguage },
        });
        if (result.error || !result.pairs?.length)
          throw new Error(result.error ?? "No cards returned");
        addModuleCards(language, moduleId, "generated", result.pairs);
      } catch (error) {
        setFieldDeckError(
          error instanceof Error
            ? error.message
            : `Couldn't prepare ${moduleName} practice cards. Try again.`,
        );
      } finally {
        setGeneratingFieldDeck(false);
      }
    },
    [
      moduleId,
      language,
      appState.nativeLanguage,
      moduleName,
      state.hydrated,
      generatedCount,
      lessonDeck,
      generateFieldDeck,
      addModuleCards,
    ],
  );

  useEffect(() => {
    void loadFieldDeck();
  }, [loadFieldDeck]);
  const availableCategories = useMemo(
    () => [
      ...FLASHCARD_CATEGORIES.filter((c) => c !== "module"),
      ...(moduleSection ? [moduleSection] : []),
    ],
    [moduleSection],
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    moduleSection ? [moduleSection] : [...availableCategories],
  );
  const [newEnglish, setNewEnglish] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");

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
        cardsForCategories(language, [`block:${blockId}`]).map((c) =>
          (language === "English" && appState.nativeLanguage === "Spanish"
            ? c.word
            : c.translation
          ).toLowerCase(),
        ),
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
              targetLanguage:
                language === "English" && appState.nativeLanguage === "Spanish"
                  ? "Spanish"
                  : language,
              context: `${block.label} vocabulary`,
            },
          });
          if (res.error || !res.phrases) throw new Error(res.error ?? "translation failed");
          pairs.push(
            ...(language === "English" && appState.nativeLanguage === "Spanish"
              ? res.phrases.map((pair) => ({
                  english: pair.translation,
                  translation: pair.english,
                }))
              : res.phrases),
          );
        }
        addBlockCards(language, blockId, pairs);
      } catch {
        setBlockError(`Couldn't translate the ${block.label} deck right now — try again.`);
      } finally {
        setIntroducing(null);
      }
    },
    [
      blocks,
      introducing,
      cardsForCategories,
      language,
      appState.nativeLanguage,
      translate,
      addBlockCards,
    ],
  );

  useEffect(() => {
    if (!state.hydrated) return;
    seedStarter(language, appState.nativeLanguage);
    for (const category of FLASHCARD_CATEGORIES) {
      if (category === "vocab" || category === "verbs") continue;
      if (category === "module") {
        if (moduleAvailable && moduleId)
          seedDeck(language, "module", moduleId, appState.nativeLanguage);
        continue;
      }
      seedDeck(language, category, undefined, appState.nativeLanguage);
    }
  }, [
    state.hydrated,
    language,
    appState.nativeLanguage,
    moduleId,
    moduleAvailable,
    seedStarter,
    seedDeck,
  ]);

  useEffect(() => {
    if (!state.hydrated || !moduleId || !lessonDeck) return;
    addModuleCards(language, moduleId, "lesson", lessonDeck.pairs);
  }, [state.hydrated, moduleId, language, lessonDeck, addModuleCards]);

  useEffect(() => {
    if (!state.hydrated) return;
    if (appState.vocabLang !== language || appState.userVocab.length === 0) return;
    syncVocab(
      language,
      appState.userVocab.map((v) => ({
        word: v.word,
        translation: v.translation,
        moduleId: v.moduleId,
      })),
    );
  }, [state.hydrated, language, appState.vocabLang, appState.userVocab, syncVocab]);

  useEffect(() => {
    setSelectedCategories(moduleSection ? [moduleSection] : [...availableCategories]);
    setFlipped(false);
    setReviewedCount(0);
  }, [moduleSection, availableCategories, language, appState.nativeLanguage]);

  function saveCards(pairs: { english: string; translation: string }[]) {
    const valid = pairs.filter((pair) => pair.english.trim() && pair.translation.trim());
    if (!valid.length) return;
    for (const pair of valid) {
      addCard({
        language,
        word: pair.translation.trim(),
        translation: pair.english.trim(),
        example: "",
        exampleTranslation: "",
        moduleId: moduleId ?? undefined,
      });
    }
    appDispatch({
      type: "ADD_VOCAB_ITEMS",
      lang: language,
      payload: valid.map((pair) => ({
        word: pair.translation.trim(),
        translation: pair.english.trim(),
        category: "saved",
        correctCount: 0,
        moduleId: moduleId ?? undefined,
      })),
    });
    setAddMessage(`${valid.length} card${valid.length === 1 ? "" : "s"} added to your study flow.`);
    setNewEnglish("");
    setNewTranslation("");
    setSelectedCategories(moduleSection ? [moduleSection] : ["vocab"]);
  }

  async function handleAddCards() {
    const items = newEnglish
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.length || items.length > 8 || items.some((item) => item.length > 80)) {
      setAddMessage("Enter 1–8 English words or short phrases, each under 80 characters.");
      return;
    }
    if (newTranslation.trim()) {
      if (items.length !== 1) {
        setAddMessage(
          "For several cards, leave the translation blank and use automatic translation.",
        );
        return;
      }
      saveCards(
        language === "English" && appState.nativeLanguage === "Spanish"
          ? [{ english: newTranslation.trim(), translation: items[0] }]
          : [{ english: items[0], translation: newTranslation.trim() }],
      );
      return;
    }
    setAdding(true);
    setAddMessage("");
    try {
      const result = await translate({
        data: {
          phrases: items,
          targetLanguage:
            language === "English" && appState.nativeLanguage === "Spanish" ? "Spanish" : language,
          context: `${moduleName} learner flashcards`,
        },
      });
      if (result.error || !result.phrases?.length)
        throw new Error(result.error ?? "Translation failed");
      saveCards(
        language === "English" && appState.nativeLanguage === "Spanish"
          ? result.phrases.map((pair) => ({ english: pair.translation, translation: pair.english }))
          : result.phrases,
      );
    } catch {
      setAddMessage("Translation is unavailable. Enter a translation for one card and try again.");
    } finally {
      setAdding(false);
    }
  }

  function toggleCategory(section: string) {
    setSelectedCategories((prev) => nextSectionSelection(prev, section, availableCategories));
    if (section.startsWith("block:")) {
      const blockId = section.slice("block:".length);
      if (introducedCount(blockId) === 0) void introduceBatch(blockId);
    }
  }

  const allSelected = availableCategories.every((c) => selectedCategories.includes(c));
  const moduleFocused =
    moduleSection !== null &&
    selectedCategories.length === 1 &&
    selectedCategories[0] === moduleSection;

  const allCards = useMemo(
    () => cardsForCategories(language, selectedCategories),
    [cardsForCategories, language, selectedCategories],
  );
  const dueCards = useMemo(
    () => dueCardsForCategories(language, selectedCategories),
    [dueCardsForCategories, language, selectedCategories],
  );
  const current = dueCards[0];
  useEffect(() => setFlipped(false), [current?.id]);
  const speakOwned = useOwnedSpeaker(
    JSON.stringify([language, moduleId, current?.id, accent, voiceURI]),
  );

  const nextUp = useMemo(() => {
    if (dueCards.length > 0) return null;
    const upcoming = allCards
      .filter((c) => c.srs.dueDate > Date.now())
      .sort((a, b) => a.srs.dueDate - b.srs.dueDate)[0];
    return upcoming ?? null;
  }, [allCards, dueCards]);

  const activeCard = current ?? nextUp ?? allCards[0];
  // Resolve strictly from the active card — never reuse a previous verb's table
  const conjugation: ConjugationSet | undefined =
    activeCard?.frequencyId && FREQUENCY_CONJUGATIONS[activeCard.frequencyId]
      ? FREQUENCY_CONJUGATIONS[activeCard.frequencyId][language]
      : Object.values(FREQUENCY_CONJUGATIONS)
          .map((entry) => entry[language])
          .find(
            (entry) =>
              entry?.infinitive.toLocaleLowerCase() === activeCard?.word.trim().toLocaleLowerCase(),
          );
  const exampleModuleId = activeCard?.moduleId ?? moduleId;
  const lessonSentences = useMemo(() => {
    if (!exampleModuleId) return [];
    const curriculum = getCurriculum(exampleModuleId);
    return (
      curriculum?.lessons.flatMap(
        (lesson) =>
          getLessonDefinition({
            moduleId: exampleModuleId,
            lessonNumber: lesson.n,
            targetLanguage: language,
            instructionLanguage: appState.nativeLanguage,
            contentVersion: modulePracticeVersion(
              exampleModuleId,
              language,
              appState.nativeLanguage,
            ),
          })?.reading?.sentences ?? [],
      ) ?? []
    );
  }, [exampleModuleId, language, appState.nativeLanguage]);
  const wordGloss = current ? flashcardWordGloss(current, appState.nativeLanguage) : null;
  const usageExample = activeCard ? flashcardUsageExample(activeCard, lessonSentences) : null;
  const personLabels =
    language in PERSON_LABEL ? PERSON_LABEL[language as keyof typeof PERSON_LABEL] : null;

  // Japanese verb structure (bases + te/ta + register×tense) — separate catalog
  const japaneseConjugation: JapaneseConjugationSet | undefined =
    language === "Japanese" && activeCard
      ? (getJapaneseConjugation(activeCard.word) ??
        (activeCard.romanization ? getJapaneseConjugation(activeCard.romanization) : undefined))
      : undefined;

  const grade = useCallback(
    (g: SrsGrade) => {
      if (!current || !flipped) return;
      reviewCard(current.id, g);
      if (g === "good" || g === "easy") void playFlashcardSuccess();
      setFlipped(false);
      setReviewedCount((n) => n + 1);
    },
    [current, flipped, reviewCard],
  );

  useEffect(() => {
    if (!current) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, summary, a, [contenteditable='true']")) return;
      if (target?.closest("button") && !target.closest('[data-testid="flashcards-study-card"]'))
        return;

      if (e.repeat) {
        if (["Enter", " ", "1", "2", "3", "4"].includes(e.key)) e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setFlipped((value) => !value);
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
    speakOwned(word, accent, voiceURI);
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
            {moduleFocused ? `${moduleName} cards` : `${language} flashcards`}
          </h1>
          <p className="font-sans text-sm not-italic text-muted-foreground">
            {moduleSection
              ? `Your selected module · ${language}`
              : "Choose a card set with Add cards below"}
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

      {moduleSection && (generatingFieldDeck || fieldDeckError) && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-border p-3 text-sm text-muted-foreground"
        >
          {generatingFieldDeck ? `Preparing ${moduleName} cards…` : fieldDeckError}
          {fieldDeckError && !generatingFieldDeck && (
            <button
              type="button"
              onClick={() => void loadFieldDeck(true)}
              className="ml-2 min-h-11 text-gold underline"
            >
              Retry field cards
            </button>
          )}
        </div>
      )}
      {current ? (
        <div className="flex flex-col items-center gap-5">
          <button
            data-testid="flashcards-study-card"
            aria-label="Flip flashcard"
            aria-describedby="flashcards-shortcuts"
            onClick={() => setFlipped((f) => !f)}
            className="grid font-sans not-italic min-h-[260px] w-full max-w-xl items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-8 text-center shadow-luxe backdrop-blur transition-colors hover:border-gold/40"
          >
            <div
              aria-hidden={flipped}
              className={`col-start-1 row-start-1 flex flex-col items-center ${flipped ? "invisible" : ""}`}
            >
              {language === "Japanese" && showFurigana ? (
                <span className="font-sans text-4xl text-foreground leading-tight">
                  <FuriganaText text={current.word} mode="above" script="hiragana" />
                </span>
              ) : (
                <span className="font-sans text-4xl text-foreground">{current.word}</span>
              )}
              {current.romanization && (
                <span className="mt-2 font-sans text-sm text-gold/80">{current.romanization}</span>
              )}
            </div>
            <div
              aria-hidden={!flipped}
              className={`col-start-1 row-start-1 flex flex-col items-center ${flipped ? "" : "invisible"}`}
            >
              <span className="font-sans text-3xl text-foreground">{current.translation}</span>
              {wordGloss ? (
                <span
                  data-testid="flashcards-word-gloss"
                  aria-label="Word-by-word meaning"
                  className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3"
                >
                  {wordGloss.map((part, index) => (
                    <span key={index} className="flex flex-col items-center gap-1">
                      <span className="font-sans text-xl text-foreground">{part.word}</span>
                      <span className="text-sm text-muted-foreground">{part.meaning}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="mt-4 font-sans text-xl text-muted-foreground">{current.word}</span>
              )}

              {/* Japanese verb structure: te / ta + example (mirrors Romance gerund / participle) */}
              {japaneseConjugation && (
                <div className="mt-4 w-full max-w-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                      て{" "}
                      <span className="text-foreground">
                        {japaneseConjugation.teForm ?? japaneseConjugation.bases.te}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                      た{" "}
                      <span className="text-foreground">
                        {japaneseConjugation.taForm ?? japaneseConjugation.forms.plain.past}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                      -masu{" "}
                      <span className="text-foreground">
                        {japaneseConjugation.forms.polite.present}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(["a", "i", "u", "e", "te"] as const).map((b) => (
                      <span
                        key={b}
                        className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        <span className="opacity-60 uppercase">{b}</span>{" "}
                        <span className="text-foreground">{japaneseConjugation.bases[b]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasDistinctFlashcardExample(current) && (
                <div className="mt-5 rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <p className="font-sans text-base not-italic text-foreground">
                    {language === "Japanese" && showFurigana ? (
                      <FuriganaText text={current.example} mode="above" script="hiragana" />
                    ) : (
                      `"${current.example}"`
                    )}
                  </p>
                  <p className="mt-1 font-sans text-sm text-muted-foreground">
                    {current.exampleTranslation}
                  </p>
                </div>
              )}
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(current.word);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
            >
              <Volume2 className="h-3 w-3" /> Pronounce
            </button>
            {language === "Japanese" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFurigana((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  showFurigana
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border/70 bg-background/40 text-muted-foreground hover:border-gold/40"
                }`}
                title={showFurigana ? "Hide furigana" : "Show furigana on cards"}
              >
                あ Furigana {showFurigana ? "ON" : "OFF"}
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {reviewedCount} reviewed this session
            </span>
          </div>

          <div
            id="flashcards-shortcuts"
            data-testid="flashcards-shortcuts"
            className="grid w-full max-w-xl text-center text-xs leading-relaxed text-muted-foreground"
          >
            <span
              aria-hidden={flipped}
              className={`col-start-1 row-start-1 ${flipped ? "invisible" : ""}`}
            >
              Tap the card, Enter or Space to reveal translation
            </span>
            <span
              aria-hidden={!flipped}
              className={`col-start-1 row-start-1 ${flipped ? "" : "invisible"}`}
            >
              Tap the card or Enter: flip back · Space: accept (Good) · 1–4: grade
            </span>
          </div>

          <p
            className="min-h-12 max-w-xl text-center text-sm font-medium text-foreground"
            aria-live="polite"
          >
            {flipped
              ? "Choose how well you remembered it."
              : "Reveal the answer to enable grading."}
          </p>
          <div data-testid="flashcards-grading" className="grid w-full max-w-xl grid-cols-4 gap-2">
            {GRADE_BUTTONS.map((b, i) => (
              <button
                key={b.grade}
                onClick={() => grade(b.grade)}
                disabled={!flipped}
                title={!flipped ? "Flip the card before grading" : b.label}
                className={`flex flex-col items-center rounded-xl border-2 px-2 py-3 font-sans text-sm font-bold tracking-normal shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-dashed ${b.cls}`}
              >
                {b.label}
                <span className="mt-0.5 text-xs font-medium">{b.hint}</span>
                <span className="mt-1 rounded border border-current/50 px-1.5 text-xs font-semibold">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 p-14 text-center backdrop-blur">
          <Sparkle className="h-6 w-6 text-gold" />
          <p className="font-sans text-lg not-italic text-foreground">
            {allCards.length ? "All caught up" : "No cards in this set yet"}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {nextUp
              ? `Next review in ${daysUntil(nextUp.srs.dueDate)}`
              : "Add words from the Reader to build your deck"}
          </p>
        </div>
      )}

      <details
        key={`${language}:${moduleId}`}
        data-testid="flashcards-add-cards"
        className="mt-5 rounded-xl border border-border/60 bg-card/30"
      >
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3 font-semibold text-gold">
          <Plus className="h-5 w-5" aria-hidden="true" /> Add cards
        </summary>
        <div className="p-4">
          <CategorySelector
            language={language}
            moduleName={moduleName}
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

          <section className="mb-6 rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="mb-3 flex items-center gap-2 text-gold">
              <Plus className="h-4 w-4" />
              <h2 className="font-display text-lg">Make your own flashcards</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Add a word or request up to eight translations, one English item per line. Saved cards
              join My Vocab{moduleSection ? ` and your ${moduleName} deck` : ""}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                English word or phrase
                <textarea
                  value={newEnglish}
                  onChange={(event) => setNewEnglish(event.target.value)}
                  rows={3}
                  maxLength={650}
                  placeholder="roof anchor"
                  className="mt-1 w-full rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                {language === "English" && appState.nativeLanguage === "Spanish"
                  ? "Spanish meaning (optional for one card)"
                  : `${language} translation (optional for one card)`}
                <input
                  value={newTranslation}
                  onChange={(event) => setNewTranslation(event.target.value)}
                  maxLength={160}
                  placeholder="Leave blank to translate automatically"
                  className="mt-1 w-full rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleAddCards()}
                disabled={adding}
                className="rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm font-semibold text-gold disabled:opacity-60"
              >
                {adding ? "Translating…" : "Add to study cards"}
              </button>
              {addMessage && (
                <p role="status" className="text-xs text-muted-foreground">
                  {addMessage}
                </p>
              )}
            </div>
          </section>
        </div>
      </details>

      <div className="mt-4 space-y-5">
        <details
          key={`${language}:${moduleId}`}
          data-testid="flashcards-your-deck"
          className="rounded-xl border border-border/60"
        >
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3">
            <RotateCcw className="h-3.5 w-3.5 text-gold" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Your deck · {allCards.length} cards
            </span>
            <span className="ml-auto text-xs text-muted-foreground">View cards ▾</span>
          </summary>
          {moduleSection && (
            <section className="mb-5 rounded-2xl border border-gold/40 bg-gold/[0.08] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    Your field focus
                  </p>
                  <h2 className="font-display text-xl text-foreground">{moduleName} flashcards</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cardsForCategories(language, [moduleSection]).length} field terms and phrases ·
                    study this specialty without mixing other subjects.
                  </p>
                  {lessonDeck && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Includes vocabulary from all {lessonDeck.lessonCount} Core 30 lessons. Draft
                      practice content.
                    </p>
                  )}
                  {generatedCount > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Includes {generatedCount} AI-generated practice cards.
                    </p>
                  )}
                  {generatingFieldDeck && (
                    <p className="mt-1 text-xs text-gold">Preparing field cards…</p>
                  )}
                  {fieldDeckError && (
                    <button
                      type="button"
                      onClick={() => void loadFieldDeck(true)}
                      className="mt-2 text-xs text-rose-700 dark:text-rose-300 underline underline-offset-2"
                    >
                      {fieldDeckError}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([moduleSection])}
                    className="rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/25"
                  >
                    Study {moduleName} only
                  </button>
                  <button
                    type="button"
                    onClick={() => appDispatch({ type: "SET_TAB", payload: "core30" })}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-gold/60"
                  >
                    Open lesson plan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (readingIds[0])
                        library.dispatch({ type: "SELECT", payload: readingIds[0] });
                      appDispatch({
                        type: "SET_TAB",
                        payload: readingIds.length ? "reader" : "story",
                      });
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-gold/60"
                  >
                    {readingIds.length ? "Read field passage" : "Generate field story"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <div className="overflow-hidden rounded-xl border border-border/60">
            <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
              {allCards
                .slice()
                .sort((a, b) => a.srs.dueDate - b.srs.dueDate)
                .map((c) => (
                  <DeckRow
                    key={c.id}
                    card={c}
                    onRemove={() => {
                      removeCard(c.id);
                      appDispatch({
                        type: "REMOVE_VOCAB_ITEM",
                        payload: { language, word: c.word },
                      });
                    }}
                  />
                ))}
            </div>
          </div>
        </details>

        {conjugation && personLabels && activeCard && (
          <div key={activeCard.id} className="space-y-3">
            <div className="mb-3 flex items-center gap-2 px-1">
              <BookOpen className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Conjugation · {conjugation.infinitive}
              </span>
            </div>
            <ConjugationCard
              key={conjugation.infinitive}
              conjugation={conjugation}
              personLabels={personLabels}
              onSpeak={speak}
              showTranslation={flipped}
            />
          </div>
        )}

        {japaneseConjugation && activeCard && (
          <div key={`ja-${activeCard.id}`} className="mt-4 w-full">
            <div className="mb-3 flex items-center gap-2 px-1">
              <BookOpen className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Verb structure · {japaneseConjugation.infinitive}
                <span aria-hidden={!flipped} className={flipped ? "" : "invisible"}>
                  {" "}
                  · {japaneseConjugation.english}
                </span>
              </span>
            </div>
            <JapaneseConjugationCard
              set={japaneseConjugation}
              onSpeak={speak}
              showTranslation={flipped}
            />
          </div>
        )}
        {!conjugation && !japaneseConjugation && activeCard && (
          <section
            aria-label="Card usage"
            className="rounded-xl border border-border/60 bg-card/40 p-4"
          >
            <h2 className="font-display text-lg text-foreground">
              {activeCard.partOfSpeech?.includes("noun") ||
              activeCard.partOfSpeech === "roofing term"
                ? "Noun usage"
                : "Word usage"}{" "}
              · {activeCard.word}
            </h2>
            <p
              data-testid="usage-meaning"
              aria-hidden={!flipped}
              className={`mt-1 text-sm text-muted-foreground ${flipped ? "" : "invisible"}`}
            >
              {activeCard.translation}
            </p>
            {usageExample ? (
              <div className="mt-3 rounded-lg bg-background/40 p-3">
                <p className="mb-1 text-xs font-semibold text-gold">Example</p>
                <p className="font-sans text-lg not-italic text-foreground">
                  {usageExample.target}
                </p>
                <p
                  data-testid="usage-translation"
                  aria-hidden={!flipped}
                  className={`mt-1 text-sm text-muted-foreground ${flipped ? "" : "invisible"}`}
                >
                  {usageExample.native}
                </p>
                <button
                  type="button"
                  onClick={() => speak(usageExample.target)}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-gold"
                >
                  <Volume2 className="h-4 w-4" /> Hear example
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No usage example is available for this card yet.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function CategorySelector({
  language,
  moduleName,
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
  moduleName: string;
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
              {category.startsWith("module:")
                ? `${moduleName} cards`
                : CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
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
  showTranslation,
}: {
  showTranslation: boolean;
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
                        <span className="font-sans text-[15px] text-foreground group-hover:text-gold">
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
          <div className="mt-0.5 font-sans text-[15px] text-foreground">{conjugation.gerund}</div>
        </div>
        <div className="bg-card/40 px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Past participle
          </div>
          <div className="mt-0.5 font-sans text-[15px] text-foreground">
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
              <span className="font-sans text-[13px] not-italic text-foreground">"{u.phrase}"</span>
              <span
                aria-hidden={!showTranslation}
                className={`font-mono text-[10px] text-muted-foreground ${showTranslation ? "" : "invisible"}`}
              >
                — {u.translation}
              </span>
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
        <span className="font-sans text-[15px] text-foreground">{card.word}</span>
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
            className={`text-muted-foreground/60 transition-colors hover:text-destructive`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
