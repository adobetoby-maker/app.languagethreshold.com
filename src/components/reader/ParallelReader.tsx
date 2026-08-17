import { useEffect, useMemo, useRef, useState } from "react";
import {
  Library,
  Type,
  Languages,
  Maximize2,
  Minimize2,
  Search,
  X,
  Volume2,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/app-state";
import { useLibrary } from "@/state/library-state";
import { getModuleReadingId } from "@/data/curriculum";
import { useNotes } from "@/state/notes-state";
import { useSpeech } from "@/state/speech-state";
import { useTutor } from "@/state/tutor-state";
import { AnnotatedSentence } from "./AnnotatedSentence";
import { FuriganaText, type FuriganaScript } from "./FuriganaText";
import { HangulText } from "./HangulText";
import { PinyinText } from "./PinyinText";
import { WordCard, type WordCardRequest } from "./WordCard";
import { SelectionMenu, type SelectionInfo } from "./SelectionMenu";
import { NoteBubble } from "./NoteBubble";
import { NotesPanel } from "./NotesPanel";
import { MiniPlayer } from "./MiniPlayer";
import { LibraryDrawer } from "@/components/library/LibraryDrawer";
import { useCultureGenerator } from "@/components/library/useCultureGenerator";
import { ModuleMatchPanel } from "@/components/modules/ModuleMatchPanel";
import { ModuleStudyGuide } from "@/components/modules/ModuleStudyGuide";
import { getLessons } from "@/data/module-starters";
import { ActionHint } from "@/components/onboarding/AppTour";
import { recordPaneTap } from "@/lib/learning-guidance";

type TextSize = "S" | "M" | "L";

/**
 * Furigana display modes (also reused for Korean romaja):
 *  - "off"     : no readings shown
 *  - "above"   : tiny reading floats above the character (default; line height stays)
 *  - "inline"  : reading sits directly ON TOP of the character as a faint overlay,
 *                so the original sentence rhythm is preserved 1:1.
 */
type FuriganaMode = "off" | "above" | "inline";

const FURIGANA_KEY = "lt.reader.furigana.v1";
const FURIGANA_SCRIPT_KEY = "lt.reader.furigana.script.v1";
const ROMAJA_KEY = "lt.reader.romaja.v1";
const PINYIN_KEY = "lt.reader.pinyin.v1";
const TUTOR_PASSAGE_LIMIT = 2_000;

function buildCenteredPassage(sentences: { target: string }[], sentenceIndex: number): string {
  const candidateIndexes = [
    sentenceIndex,
    sentenceIndex - 1,
    sentenceIndex + 1,
    sentenceIndex - 2,
    sentenceIndex + 2,
  ];
  const selected: { index: number; text: string }[] = [];
  let length = 0;

  for (const index of candidateIndexes) {
    const text = sentences[index]?.target?.trim();
    if (!text) continue;
    const separatorLength = selected.length > 0 ? 1 : 0;
    if (length + separatorLength + text.length > TUTOR_PASSAGE_LIMIT) continue;
    selected.push({ index, text });
    length += separatorLength + text.length;
  }

  return selected
    .sort((a, b) => a.index - b.index)
    .map(({ text }) => text)
    .join(" ");
}

const SIZE_CLASS: Record<TextSize, string> = {
  S: "text-[15px] leading-[1.85]",
  M: "text-[17px] leading-[1.85]",
  L: "text-[20px] leading-[1.9]",
};

export function ParallelReader() {
  const { state, dispatch } = useApp();
  const { selected, state: lib, dispatch: libDispatch } = useLibrary();
  const { add: addAnnotation, forText } = useNotes();
  const { activeSentenceIndex, speakSentence, speakSentences, stop, playing } = useSpeech();
  const tutor = useTutor();
  const [size, setSize] = useState<TextSize>("M");
  const [syncScroll, setSyncScroll] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("above");
  const [furiganaScript, setFuriganaScript] = useState<FuriganaScript>("hiragana");
  const [romajaMode, setRomajaMode] = useState<FuriganaMode>("above");
  const [pinyinMode, setPinyinMode] = useState<"off" | "above">("above");

  // Lesson navigation for the active module
  const lessonIds = useMemo(
    () => (state.activeModuleId ? getLessons(state.activeModuleId, state.selectedLanguage) : []),
    [state.activeModuleId, state.selectedLanguage],
  );
  const currentLessonIndex = useMemo(
    () => (lessonIds.length > 0 ? lessonIds.indexOf(lib.selectedId) : -1),
    [lessonIds, lib.selectedId],
  );

  function goToLesson(idx: number) {
    const id = lessonIds[idx];
    if (!id) return;
    libDispatch({ type: "SELECT", payload: id });
  }

  // Auto-load module-relevant reading when active module changes
  const lastAutoModule = useRef<string | null>(null);
  useEffect(() => {
    const moduleId = state.activeModuleId;
    if (!moduleId) return;
    if (lastAutoModule.current === moduleId) return;
    lastAutoModule.current = moduleId;
    const readingId = getModuleReadingId(moduleId, state.selectedLanguage, lib.entries);
    if (readingId && readingId !== lib.selectedId) {
      libDispatch({ type: "SELECT", payload: readingId });
    }
  }, [state.activeModuleId, state.selectedLanguage, lib.entries, lib.selectedId, libDispatch]);

  // Hydrate + persist furigana / romaja preferences.
  //
  // Each persist effect MUST skip its first invocation. On mount it runs in the
  // same commit as the hydrate effect below, when state still holds its default
  // ("above") rather than the value just read from localStorage — so without
  // this it writes the default straight over the user's saved preference and
  // "off" silently resets to "above" on every reload.
  const skipFuriganaPersist = useRef(true);
  const skipScriptPersist = useRef(true);
  const skipRomajaPersist = useRef(true);
  const skipPinyinPersist = useRef(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURIGANA_KEY);
      if (raw === "off" || raw === "above") {
        setFuriganaMode(raw);
      } else if (raw === "inline") {
        setFuriganaMode("above");
      }
      const rawScript = localStorage.getItem(FURIGANA_SCRIPT_KEY);
      if (rawScript === "hiragana" || rawScript === "romaji") {
        setFuriganaScript(rawScript);
      }
      const rawRomaja = localStorage.getItem(ROMAJA_KEY);
      if (rawRomaja === "off" || rawRomaja === "above") {
        setRomajaMode(rawRomaja);
      } else if (rawRomaja === "inline") {
        setRomajaMode("above");
      }
      const rawPinyin = localStorage.getItem(PINYIN_KEY);
      if (rawPinyin === "off" || rawPinyin === "above") {
        setPinyinMode(rawPinyin);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (skipFuriganaPersist.current) {
      skipFuriganaPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(FURIGANA_KEY, furiganaMode);
    } catch {
      /* ignore */
    }
  }, [furiganaMode]);
  useEffect(() => {
    if (skipScriptPersist.current) {
      skipScriptPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(FURIGANA_SCRIPT_KEY, furiganaScript);
    } catch {
      /* ignore */
    }
  }, [furiganaScript]);
  useEffect(() => {
    if (skipRomajaPersist.current) {
      skipRomajaPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(ROMAJA_KEY, romajaMode);
    } catch {
      /* ignore */
    }
  }, [romajaMode]);
  useEffect(() => {
    if (skipPinyinPersist.current) {
      skipPinyinPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(PINYIN_KEY, pinyinMode);
    } catch {
      /* ignore */
    }
  }, [pinyinMode]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [noteBubble, setNoteBubble] = useState<SelectionInfo | null>(null);

  useCultureGenerator();

  // Track Culture Series exposure for the "Culture Buff 🌍" achievement
  useEffect(() => {
    if (selected.section === "culture" && selected.available) {
      dispatch({ type: "MARK_CULTURE_READ", payload: selected.id });
    }
  }, [selected.id, selected.section, selected.available, dispatch]);

  // Award Culture Buff once every culture entry for the active language has been opened
  useEffect(() => {
    const cultureForLang = lib.entries.filter(
      (e) => e.section === "culture" && e.available && e.language === state.selectedLanguage,
    );
    if (cultureForLang.length === 0) return;
    const allRead = cultureForLang.every((e) => state.cultureRead.includes(e.id));
    if (allRead && !state.achievements.includes("Culture Buff 🌍")) {
      dispatch({ type: "ADD_ACHIEVEMENT", payload: "Culture Buff 🌍" });
    }
  }, [lib.entries, state.cultureRead, state.achievements, state.selectedLanguage, dispatch]);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const onLeft = () => {
      if (!syncScroll || isSyncing.current) return;
      isSyncing.current = true;
      const ratio = left.scrollTop / Math.max(1, left.scrollHeight - left.clientHeight);
      right.scrollTop = ratio * (right.scrollHeight - right.clientHeight);
      requestAnimationFrame(() => (isSyncing.current = false));
    };
    const onRight = () => {
      if (!syncScroll || isSyncing.current) return;
      isSyncing.current = true;
      const ratio = right.scrollTop / Math.max(1, right.scrollHeight - right.clientHeight);
      left.scrollTop = ratio * (left.scrollHeight - left.clientHeight);
      requestAnimationFrame(() => (isSyncing.current = false));
    };

    left.addEventListener("scroll", onLeft, { passive: true });
    right.addEventListener("scroll", onRight, { passive: true });
    return () => {
      left.removeEventListener("scroll", onLeft);
      right.removeEventListener("scroll", onRight);
    };
  }, [syncScroll, selected.id]);

  // Capture selection from either pane (mouse + touch).
  useEffect(() => {
    let pendingTimer: number | null = null;

    function computeSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const node =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const paragraph = node?.closest("p[data-sentence-index]") as HTMLElement | null;
      if (!paragraph) {
        setSelection(null);
        return;
      }
      const pane = paragraph.dataset.pane as "left" | "right" | undefined;
      const idxStr = paragraph.dataset.sentenceIndex;
      if (!pane || idxStr === undefined) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({
        text,
        pane,
        sentenceIndex: Number(idxStr),
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }

    function scheduleCompute() {
      if (pendingTimer) window.clearTimeout(pendingTimer);
      // Wait a tick so iOS finishes settling the selection after touch release.
      pendingTimer = window.setTimeout(computeSelection, 60);
    }

    function handlePointerDown(e: PointerEvent) {
      // Don't dismiss when tapping the menu/bubble itself.
      const target = e.target as HTMLElement;
      if (target.closest("[data-selection-ui]")) return;
      setSelection(null);
    }

    document.addEventListener("mouseup", scheduleCompute);
    document.addEventListener("touchend", scheduleCompute);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      if (pendingTimer) window.clearTimeout(pendingTimer);
      document.removeEventListener("mouseup", scheduleCompute);
      document.removeEventListener("touchend", scheduleCompute);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const annotations = forText(selected.id);

  const handleHighlight = (s: SelectionInfo) => {
    addAnnotation({
      textId: selected.id,
      pane: s.pane,
      sentenceIndex: s.sentenceIndex,
      selectedText: s.text,
    });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast("🌟 Highlighted", { description: `“${truncate(s.text)}”` });
  };

  const openNoteBubble = (s: SelectionInfo) => {
    setNoteBubble(s);
    setSelection(null);
  };

  const handleSaveNote = (text: string) => {
    if (!noteBubble || !text) return;
    addAnnotation({
      textId: selected.id,
      pane: noteBubble.pane,
      sentenceIndex: noteBubble.sentenceIndex,
      selectedText: noteBubble.text,
      noteText: text,
    });
    dispatch({ type: "ADD_XP", payload: 5 });
    dispatch({ type: "INC_COUNTER", payload: "notesSaved" });
    toast("✦ Note saved", { description: "+5 XP" });
    setNoteBubble(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleGoTo = (pane: "left" | "right", sentenceIndex: number) => {
    const container = pane === "left" ? leftRef.current : rightRef.current;
    if (!container) return;
    const el = container.querySelector(
      `p[data-sentence-index="${sentenceIndex}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleWord = (
    word: string,
    sentence: string,
    pane: "left" | "right",
    sentenceIndex: number,
    x: number,
    y: number,
  ) => {
    // Counts per pane; the demo block clears only once BOTH sides have been
    // used 3 times, so the learner discovers that native-side lookup works too.
    recordPaneTap(pane, "lt.guide.reader.tap");
    const passage = buildCenteredPassage(activeSentences, sentenceIndex);
    if (pane === "right") {
      setWordReq({
        word,
        sentence,
        language: state.selectedLanguage,
        textId: selected.id,
        textTitle: selected.title,
        sentenceIndex,
        chapterIndex: safeChapterIndex,
        passage,
        x,
        y,
      });
    } else {
      // Left (native) pane: provide the paired target sentence so the AI can
      // identify the target-language equivalent of the clicked native word.
      const pair = activeSentences.find((s) => s.en === sentence);
      const context = pair
        ? `[${state.nativeLanguage}] "${sentence}" | [${selected.targetLabel}] "${pair.target}"`
        : sentence;
      setWordReq({
        word,
        sentence: context,
        language: state.selectedLanguage,
        textId: selected.id,
        textTitle: selected.title,
        sentenceIndex,
        chapterIndex: safeChapterIndex,
        passage,
        x,
        y,
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    setWordReq({
      word: query,
      sentence: query,
      language: state.selectedLanguage,
      x: vw / 2,
      y: vh / 4,
    });
  };

  // Find sentence index in the right pane closest to current scroll position
  const findNearestSentence = (): number => {
    const container = rightRef.current;
    if (!container) return 0;
    const paragraphs = Array.from(
      container.querySelectorAll<HTMLElement>("p[data-sentence-index]"),
    );
    if (paragraphs.length === 0) return 0;
    const containerTop = container.getBoundingClientRect().top;
    const targetY = containerTop + 80; // bias just below the sticky header
    let bestIdx = 0;
    let bestDist = Infinity;
    for (const p of paragraphs) {
      const rect = p.getBoundingClientRect();
      const dist = Math.abs(rect.top - targetY);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = Number(p.dataset.sentenceIndex);
      }
    }
    return bestIdx;
  };

  // All sentences currently visible in the right pane (for paragraph mode)
  const findVisibleSentences = (): number[] => {
    const container = rightRef.current;
    if (!container) return [];
    const cRect = container.getBoundingClientRect();
    const paragraphs = Array.from(
      container.querySelectorAll<HTMLElement>("p[data-sentence-index]"),
    );
    const visible: number[] = [];
    for (const p of paragraphs) {
      const r = p.getBoundingClientRect();
      const top = Math.max(r.top, cRect.top);
      const bottom = Math.min(r.bottom, cRect.bottom);
      if (bottom - top > 16) visible.push(Number(p.dataset.sentenceIndex));
    }
    return visible.length ? visible : [findNearestSentence()];
  };

  // Resolve which sentences are currently visible based on chapter (if multi-chapter)
  const chapters = selected.chapters;
  const safeChapterIndex =
    chapters && chapters.length > 0 ? Math.min(chapterIndex, chapters.length - 1) : 0;
  const activeSentences =
    chapters && chapters.length > 0 ? chapters[safeChapterIndex].sentences : selected.sentences;

  // Reset chapter to 0 whenever the user opens a different book
  useEffect(() => {
    setChapterIndex(0);
  }, [selected.id]);

  const readerLocationRef = useRef(`${selected.id}:${safeChapterIndex}`);
  const currentSourceContext = tutor.contextFor(selected.id);
  useEffect(() => {
    const nextLocation = `${selected.id}:${safeChapterIndex}`;
    const sourceIsFromAnotherChapter =
      currentSourceContext?.chapterIndex !== undefined &&
      currentSourceContext.chapterIndex !== safeChapterIndex;
    if (readerLocationRef.current !== nextLocation || sourceIsFromAnotherChapter) {
      tutor.clearSourceContext(selected.id);
      readerLocationRef.current = nextLocation;
    }
  }, [currentSourceContext?.chapterIndex, safeChapterIndex, selected.id, tutor]);

  const handleSpeakSentence = () => {
    const idx = findNearestSentence();
    const sentence = activeSentences[idx];
    if (!sentence) return;
    speakSentence(sentence.target, idx);
  };

  const handleSpeakParagraph = () => {
    const indices = findVisibleSentences();
    const queue = indices
      .map((i) => ({ text: activeSentences[i]?.target ?? "", index: i }))
      .filter((q) => q.text);
    if (queue.length === 0) return;
    speakSentences(queue);
  };

  // Auto-scroll BOTH panes to keep the active sentence in view (opt-in)
  useEffect(() => {
    if (!autoScroll) return;
    if (activeSentenceIndex < 0) return;
    [leftRef, rightRef].forEach((r) => {
      const c = r.current;
      if (!c) return;
      const el = c.querySelector(
        `p[data-sentence-index="${activeSentenceIndex}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      const cRect = c.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (eRect.top < cRect.top + 60 || eRect.bottom > cRect.bottom - 30) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [activeSentenceIndex, autoScroll]);

  return (
    <div className="fade-in mx-auto w-full max-w-6xl">
      <ModuleStudyGuide />
      <ModuleMatchPanel surface="Reader" className="mb-4" />
      <ActionHint storageKey="lt.guide.reader.tap" className="mb-4">
        <strong>Your training demo.</strong> Tap a word on either side — {state.nativeLanguage} or{" "}
        {state.selectedLanguage} — to see what it means in this sentence, ask the Tutor about it,
        then save it. This disappears once you have tried both sides.
      </ActionHint>

      {/* Lesson navigation — shown when the active module has multiple lessons */}
      {lessonIds.length > 1 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/50 bg-card/40 px-4 py-2.5">
          <button
            onClick={() => goToLesson(currentLessonIndex - 1)}
            disabled={currentLessonIndex <= 0}
            aria-label="Previous lesson"
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-3 w-3" /> Prev
          </button>

          <div className="flex flex-1 items-center justify-center gap-1.5">
            {lessonIds.map((id, idx) => (
              <button
                key={id}
                onClick={() => goToLesson(idx)}
                title={`Lesson ${idx + 1}`}
                aria-label={`Go to lesson ${idx + 1}`}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (idx === currentLessonIndex
                    ? "w-6 bg-gold"
                    : idx < currentLessonIndex
                      ? "w-1.5 bg-gold/40"
                      : "w-1.5 bg-border/60 hover:bg-gold/40")
                }
              />
            ))}
          </div>

          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {currentLessonIndex >= 0
              ? `${currentLessonIndex + 1} / ${lessonIds.length}`
              : `${lessonIds.length} lessons`}
          </span>

          <button
            onClick={() => goToLesson(currentLessonIndex < 0 ? 0 : currentLessonIndex + 1)}
            disabled={currentLessonIndex >= lessonIds.length - 1}
            aria-label="Next lesson"
            className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold/25 disabled:pointer-events-none disabled:opacity-30"
          >
            {currentLessonIndex < 0 ? "Start" : "Next"} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Library bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-5 py-3 backdrop-blur">
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-1.5 font-display text-sm italic text-foreground transition-colors hover:border-gold/60"
        >
          <Library className="h-3.5 w-3.5 text-gold" />
          <span className="text-gold">✦</span>
          {selected.title}
        </button>
        <div className="flex items-center gap-2">
          {lib.generating && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              ✦ Generating Culture Series…
            </span>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:bg-gold/15"
          >
            Open Library
          </button>
        </div>
      </div>

      {/* Chapter switcher (only for multi-chapter books) */}
      {chapters && chapters.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.04] px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <span>✦</span>
            <span>Chapter</span>
            <span className="text-foreground/80">
              {safeChapterIndex + 1} / {chapters.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
              disabled={safeChapterIndex === 0}
              className="rounded-full border border-border/70 bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <select
              value={safeChapterIndex}
              onChange={(e) => setChapterIndex(Number(e.target.value))}
              className="max-w-[16rem] truncate rounded-full border border-border/70 bg-background/60 px-3 py-1 font-display text-sm italic text-foreground focus:border-gold/60 focus:outline-none"
            >
              {chapters.map((c, i) => (
                <option key={i} value={i}>
                  {i + 1}. {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
              disabled={safeChapterIndex === chapters.length - 1}
              className="rounded-full border border-border/70 bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {activeSentences.length} sentences
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Size
            </span>
            <div className="flex overflow-hidden rounded-full border border-border/70">
              {(["S", "M", "L"] as TextSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  data-active={size === s}
                  className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Floating word search */}
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) handleSearch(searchQuery.trim());
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                placeholder={`Look up in ${state.selectedLanguage}…`}
                className="w-44 rounded-full border border-gold/40 bg-background/60 px-3 py-1 font-mono text-[11px] text-foreground/90 placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground hover:border-gold/60 hover:text-gold"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
            >
              <Search className="h-3 w-3" />
              Search
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {selected.language === "Japanese" && (
            <div className="flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Furigana
              </span>
              <div className="flex overflow-hidden rounded-full border border-border/70">
                {(
                  [
                    { v: "off", label: "Off" },
                    { v: "above", label: "Above" },
                  ] as { v: FuriganaMode; label: string }[]
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setFuriganaMode(v)}
                    data-active={furiganaMode === v}
                    title={v === "off" ? "Hide readings" : "Tiny hiragana above kanji"}
                    className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {furiganaMode !== "off" && (
                <div className="flex overflow-hidden rounded-full border border-border/70">
                  {(
                    [
                      { v: "hiragana", label: "あ" },
                      { v: "romaji", label: "A" },
                    ] as { v: FuriganaScript; label: string }[]
                  ).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setFuriganaScript(v)}
                      data-active={furiganaScript === v}
                      title={v === "hiragana" ? "Show kana readings" : "Show romaji (Hepburn)"}
                      className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {selected.language === "Korean" && (
            <div className="flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Romaja
              </span>
              <div className="flex overflow-hidden rounded-full border border-border/70">
                {(
                  [
                    { v: "off", label: "Off" },
                    { v: "above", label: "Above" },
                  ] as { v: FuriganaMode; label: string }[]
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setRomajaMode(v)}
                    data-active={romajaMode === v}
                    title={v === "off" ? "Hide readings" : "Tiny romaja above each syllable"}
                    className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selected.language === "Chinese" && (
            <div className="flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Pinyin
              </span>
              <div className="flex overflow-hidden rounded-full border border-border/70">
                {(
                  [
                    { v: "off", label: "Off" },
                    { v: "above", label: "Above" },
                  ] as { v: "off" | "above"; label: string }[]
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setPinyinMode(v)}
                    data-active={pinyinMode === v}
                    title={v === "off" ? "Hide readings" : "Tiny pinyin above hanzi"}
                    className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Auto-scroll
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoScroll}
              onClick={() => setAutoScroll((v) => !v)}
              className="relative h-5 w-10 rounded-full border border-border/70 bg-muted transition-colors data-[on=true]:bg-gold"
              data-on={autoScroll}
              title="When ON, the reader follows the spoken sentence. When OFF, the page stays where you scrolled."
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform"
                style={{ transform: autoScroll ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Sync Scroll
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={syncScroll}
              onClick={() => setSyncScroll((v) => !v)}
              className="relative h-5 w-10 rounded-full border border-border/70 bg-muted transition-colors data-[on=true]:bg-gold"
              data-on={syncScroll}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform"
                style={{ transform: syncScroll ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </label>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Exit fullscreen reader" : "Fullscreen target language only"}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/15"
          >
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {fullscreen ? "Exit" : "Focus"}
          </button>
        </div>
      </div>

      {/* Reader */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-luxe backdrop-blur ${fullscreen ? "fixed inset-2 z-40 md:inset-6" : ""}`}
      >
        <div className={fullscreen ? "grid grid-cols-1" : "grid grid-cols-2"}>
          {!fullscreen && (
            <div className="relative">
              {/* h-12 is fixed on BOTH pane headers. The target header carries an
                  h-7 audio button while this one is text-only, so padding-driven
                  heights diverge and the two header boxes stop lining up. */}
              <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border/50 bg-card/80 px-6 backdrop-blur">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {state.nativeLanguage}
                </span>
                <span className="font-display text-xs italic text-muted-foreground">native</span>
              </div>
              <div
                ref={leftRef}
                className="lt-scroll-safe custom-scroll h-[calc(100dvh-180px)] overflow-y-auto px-5 py-6 md:h-[62vh] md:px-7 md:py-8"
              >
                <Pane
                  pane="left"
                  sentences={activeSentences.map((s) => s.en)}
                  size={size}
                  annotations={annotations}
                  activeSentenceIndex={activeSentenceIndex}
                  onWordClick={handleWord}
                />
              </div>
            </div>
          )}

          {!fullscreen && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px">
              <div className="h-full w-full bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
            </div>
          )}

          <div className={`relative ${fullscreen ? "" : "border-l border-border/50"}`}>
            {/* Must stay h-12 in lock-step with the native pane header above. */}
            <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border/50 bg-card/80 px-6 backdrop-blur">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                {selected.language}
              </span>
              <div className="flex items-center gap-2">
                {playing ? (
                  <button
                    type="button"
                    onClick={stop}
                    title="Stop reading"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSpeakSentence}
                    title="Read current sentence aloud"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/40 text-muted-foreground hover:border-gold/50 hover:text-gold"
                  >
                    <Volume2 className="h-3 w-3" />
                  </button>
                )}
                <span className="font-display text-xs italic text-muted-foreground">target</span>
                {fullscreen && (
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    title="Exit fullscreen"
                    className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/15"
                  >
                    <Minimize2 className="h-3 w-3" /> Exit
                  </button>
                )}
              </div>
            </div>
            <div
              ref={rightRef}
              // Keep the touch affordance scoped to the target-language pane.
              data-pane="target"
              className={`lt-scroll-safe custom-scroll overflow-y-auto px-5 py-6 md:px-7 md:py-8 ${
                fullscreen
                  ? "h-[calc(100dvh-100px)] md:h-[calc(100dvh-120px)]"
                  : "h-[calc(100dvh-180px)] md:h-[62vh]"
              }`}
            >
              <Pane
                pane="right"
                sentences={activeSentences.map((s) => s.target)}
                size={size}
                annotations={annotations}
                activeSentenceIndex={activeSentenceIndex}
                onWordClick={handleWord}
                accent
                furiganaMode={selected.language === "Japanese" ? furiganaMode : "off"}
                furiganaScript={furiganaScript}
                romajaMode={selected.language === "Korean" ? romajaMode : "off"}
                pinyinMode={selected.language === "Chinese" ? pinyinMode : "off"}
              />
            </div>
          </div>
        </div>
      </div>

      <LibraryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <NotesPanel textId={selected.id} onGoTo={handleGoTo} />

      <div data-selection-ui>
        <SelectionMenu
          selection={selection}
          onHighlight={handleHighlight}
          onAddNote={openNoteBubble}
        />
      </div>

      {noteBubble && (
        <div data-selection-ui>
          <NoteBubble
            x={noteBubble.x}
            y={noteBubble.y}
            selectedText={noteBubble.text}
            onSave={handleSaveNote}
            onCancel={() => setNoteBubble(null)}
          />
        </div>
      )}

      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}

      <MiniPlayer />
    </div>
  );
}

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function Pane({
  pane,
  sentences,
  size,
  annotations,
  activeSentenceIndex,
  onWordClick,
  accent,
  furiganaMode = "off",
  furiganaScript = "hiragana",
  romajaMode = "off",
  pinyinMode = "off",
}: {
  pane: "left" | "right";
  sentences: string[];
  size: TextSize;
  annotations: ReturnType<typeof useNotes>["annotations"];
  activeSentenceIndex: number;
  onWordClick: (
    w: string,
    sentence: string,
    pane: "left" | "right",
    sentenceIndex: number,
    x: number,
    y: number,
  ) => void;
  accent?: boolean;
  furiganaMode?: FuriganaMode;
  furiganaScript?: FuriganaScript;
  romajaMode?: FuriganaMode;
  pinyinMode?: "off" | "above";
}) {
  const showFurigana = furiganaMode !== "off";
  const showRomaja = romajaMode !== "off";
  const showPinyin = pinyinMode !== "off";
  const lineNeedsExtraLeading = furiganaMode === "above" || romajaMode === "above" || pinyinMode === "above";
  // Inject pane identity into every word-click so the parent can route
  // left-pane (native) and right-pane (target) lookups differently.
  return (
    <div
      className={`font-display ${SIZE_CLASS[size]} ${accent ? "text-foreground" : "text-foreground/90"}`}
    >
      {sentences.map((s, i) => {
        const wrappedWordClick = (w: string, sentence: string, x: number, y: number) => {
          onWordClick(w, sentence, pane, i, x, y);
        };
        const sentenceAnns = annotations.filter((a) => a.pane === pane && a.sentenceIndex === i);
        const isActive = activeSentenceIndex === i;
        const useRubyRenderer =
          (showFurigana || showRomaja || showPinyin) && sentenceAnns.length === 0;
        return (
          <p
            key={i}
            data-sentence-index={i}
            data-pane={pane}
            data-speaking={isActive || undefined}
            className={`lt-reader-sentence mb-0 pb-5 pt-1 -mx-2 rounded-md border-l-2 border-b border-dashed border-border/35 px-2 transition-colors last:border-b-0 ${
              isActive ? "border-l-gold bg-gold/15" : "border-l-transparent hover:border-l-gold/40"
            } ${lineNeedsExtraLeading ? "furigana-line" : ""}`}
          >
            {useRubyRenderer ? (
              // Fast path: no annotations on this sentence — render with
              // furigana/romaja. Once the user adds notes/highlights we fall
              // back to the annotated renderer (without ruby) for that
              // sentence; readings stay cached.
              showFurigana ? (
                <FuriganaText
                  text={s}
                  fullSentence={s}
                  onWordClick={wrappedWordClick}
                  mode={furiganaMode === "inline" ? "inline" : "above"}
                  script={furiganaScript}
                />
              ) : showRomaja ? (
                <HangulText
                  text={s}
                  fullSentence={s}
                  onWordClick={wrappedWordClick}
                  mode={romajaMode === "inline" ? "inline" : "above"}
                />
              ) : (
                <PinyinText
                  text={s}
                  fullSentence={s}
                  onWordClick={wrappedWordClick}
                  mode="above"
                />
              )
            ) : (
              <AnnotatedSentence
                text={s}
                annotations={sentenceAnns}
                onWordClick={wrappedWordClick}
              />
            )}
          </p>
        );
      })}
    </div>
  );
}
