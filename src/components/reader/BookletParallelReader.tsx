import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ImageOff, Library } from "lucide-react";
import type { BookletContent, BookletSentence } from "@/data/booklets";
import { useApp } from "@/state/app-state";
import { useLibrary } from "@/state/library-state";
import { WordCard, type WordCardRequest } from "./WordCard";

const WORD_PATTERN = /\p{L}+(?:['’]\p{L}+)*/gu;

function surroundingPairedText(content: BookletContent, pageIndex: number): string {
  return content.pages
    .slice(Math.max(0, pageIndex - 1), Math.min(content.pages.length, pageIndex + 2))
    .flatMap((page) =>
      page.sentences.map((sentence) => `[English] ${sentence.en}\n[Español] ${sentence.target}`),
    )
    .join("\n\n");
}

function InteractiveSentence({
  book,
  pageId,
  sentence,
  side,
  sentenceIndex,
  passage,
  onRequest,
}: {
  book: BookletContent;
  pageId: string;
  sentence: BookletSentence;
  side: "source" | "target";
  sentenceIndex: number;
  passage: string;
  onRequest: (request: WordCardRequest, trigger: HTMLButtonElement) => void;
}) {
  const displayed = side === "source" ? sentence.en : sentence.target;
  const matches = [...displayed.matchAll(WORD_PATTERN)];
  const occurrenceByWord = new Map<string, number>();
  const parts: Array<string | { word: string; occurrenceIndex: number }> = [];
  let cursor = 0;

  for (const match of matches) {
    const word = match[0];
    const index = match.index ?? 0;
    if (index > cursor) parts.push(displayed.slice(cursor, index));
    const key = word.normalize("NFC").toLocaleLowerCase("und");
    const occurrenceIndex = occurrenceByWord.get(key) ?? 0;
    occurrenceByWord.set(key, occurrenceIndex + 1);
    parts.push({ word, occurrenceIndex });
    cursor = index + word.length;
  }
  if (cursor < displayed.length) parts.push(displayed.slice(cursor));

  return (
    <p
      lang={side === "source" ? "en" : "es"}
      data-page-id={pageId}
      data-sentence-id={sentence.sentenceId}
      className={
        side === "source"
          ? "font-display text-lg leading-relaxed text-foreground/80"
          : "font-display text-xl leading-relaxed text-foreground"
      }
    >
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={`${index}:${part}`}>{part}</span>
        ) : (
          <button
            key={`${index}:${part.word}`}
            type="button"
            data-sentence-id={sentence.sentenceId}
            data-occurrence-index={part.occurrenceIndex}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onRequest(
                {
                  bookId: book.bookId,
                  editionId: book.editionId,
                  pageId,
                  sentenceId: sentence.sentenceId,
                  occurrenceIndex: part.occurrenceIndex,
                  word: part.word,
                  sentence: displayed,
                  language: "Spanish",
                  textId: book.editionId,
                  textTitle: book.title,
                  sentenceIndex,
                  chapterIndex: book.pages.findIndex((page) => page.pageId === pageId),
                  passage,
                  x: rect.left + rect.width / 2,
                  y: rect.bottom,
                },
                event.currentTarget,
              );
            }}
            className="lt-word inline-flex min-h-11 items-center rounded px-0.5 align-baseline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label={`Open word details for ${part.word}, occurrence ${part.occurrenceIndex + 1}`}
          >
            {part.word}
          </button>
        ),
      )}
    </p>
  );
}

export function BookletParallelReader({
  content,
  onOpenLibrary,
}: {
  content: BookletContent;
  onOpenLibrary: () => void;
}) {
  const { dispatch } = useApp();
  const { state: libraryState, setReadStatus } = useLibrary();
  const [pageIndex, setPageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [wordRequest, setWordRequest] = useState<WordCardRequest | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const page = content.pages[pageIndex];
  const isLastPage = pageIndex === content.pages.length - 1;
  const passage = useMemo(() => surroundingPairedText(content, pageIndex), [content, pageIndex]);

  const closeWordCard = useCallback(() => {
    setWordRequest(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, content.pages.length - 1));
      setPageIndex(clamped);
      setImageFailed(false);
      setWordRequest(null);
      if (
        clamped === content.pages.length - 1 &&
        libraryState.readStatus[content.editionId] !== "complete"
      ) {
        setReadStatus(content.editionId, "complete");
        dispatch({ type: "ADD_XP", payload: 10 });
      }
    },
    [content.editionId, content.pages.length, dispatch, libraryState.readStatus, setReadStatus],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (wordRequest) return;
      if (event.key === "ArrowLeft") goTo(pageIndex - 1);
      if (event.key === "ArrowRight") goTo(pageIndex + 1);
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(content.pages.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [content.pages.length, goTo, pageIndex, wordRequest]);

  return (
    <article
      className="fade-in mx-auto w-full max-w-6xl"
      data-book-id={content.bookId}
      data-edition-id={content.editionId}
      data-page-id={page.pageId}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold">
            Readers · English / Español
          </div>
          <h1 className="font-display text-3xl font-semibold">{content.title}</h1>
          <p lang="es" className="mt-1 text-sm text-muted-foreground">
            {content.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-gold"
        >
          <Library className="h-4 w-4" /> Library
        </button>
      </header>

      <div className="overflow-hidden rounded-3xl border border-gold/30 bg-card/70 shadow-luxe">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <div className="relative min-h-72 bg-background/50 lg:min-h-[34rem]">
            {!imageFailed ? (
              <img
                src={page.image.url}
                alt={page.image.altText.source}
                data-asset-id={page.image.assetId}
                data-sha256={page.image.sha256}
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={page.image.altText.source}
                className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"
              >
                <ImageOff className="h-8 w-8" />
                <span className="max-w-sm text-sm">
                  Illustration unavailable. The paired text remains ready to read.
                </span>
              </div>
            )}
            <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white">
              {page.sourceLabel}
            </span>
          </div>

          <div className="flex min-h-[28rem] flex-col p-5 sm:p-8">
            <div className="flex-1 space-y-8">
              <section aria-labelledby="booklet-english-heading">
                <h2
                  id="booklet-english-heading"
                  className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
                >
                  English
                </h2>
                <div className="space-y-3">
                  {page.sentences.map((sentence, sentenceIndex) => (
                    <InteractiveSentence
                      key={`en:${sentence.sentenceId}`}
                      book={content}
                      pageId={page.pageId}
                      sentence={sentence}
                      side="source"
                      sentenceIndex={sentenceIndex}
                      passage={passage}
                      onRequest={(request, trigger) => {
                        triggerRef.current = trigger;
                        setWordRequest(request);
                      }}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="booklet-spanish-heading">
                <h2
                  id="booklet-spanish-heading"
                  className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-gold"
                >
                  Español
                </h2>
                <div className="space-y-3">
                  {page.sentences.map((sentence, sentenceIndex) => (
                    <InteractiveSentence
                      key={`es:${sentence.sentenceId}`}
                      book={content}
                      pageId={page.pageId}
                      sentence={sentence}
                      side="target"
                      sentenceIndex={sentenceIndex}
                      passage={passage}
                      onRequest={(request, trigger) => {
                        triggerRef.current = trigger;
                        setWordRequest(request);
                      }}
                    />
                  ))}
                </div>
              </section>

              {page.sentences.length === 0 && (
                <p className="font-display text-xl italic text-muted-foreground">
                  A quiet beginning. Use the arrows to turn the page.
                </p>
              )}
            </div>

            {isLastPage && (
              <div
                role="status"
                className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
              >
                <BookOpen className="h-4 w-4" /> Reader complete · +10 XP
              </div>
            )}

            <nav
              aria-label="Booklet pages"
              className="mt-6 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => goTo(pageIndex - 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border/70 px-4 text-sm disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span aria-live="polite" className="font-mono text-xs text-muted-foreground">
                {pageIndex + 1} / {content.pages.length}
              </span>
              <button
                type="button"
                disabled={isLastPage}
                onClick={() => goTo(pageIndex + 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-4 text-sm text-gold disabled:opacity-35"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Pilot content · {content.level} · exact source edition {content.editionVersion}
      </p>

      {wordRequest && (
        <WordCard
          request={wordRequest}
          onClose={closeWordCard}
          onXp={(amount) => dispatch({ type: "ADD_XP", payload: amount })}
        />
      )}
    </article>
  );
}
