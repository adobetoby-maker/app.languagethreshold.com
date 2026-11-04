import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, BookmarkPlus, X } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { useFlashcards } from "@/state/flashcard-state";
import { curriculumVocabulary } from "@/lib/curriculum-vocabulary";
import { speakingRequestHeaders } from "@/lib/speaking-client";
import {
  PocketTutorCardSchema,
  pocketWordKey,
  type PocketTutorCard,
} from "@/lib/speak-pocket-tutor";

export type SpeakTutorSelection = { word: string; sentence: string; id: number; scope: string };

/** Owns just the reply area. Hidden controls stay mounted, preserving the conversation draft. */
export function SpeakTutorDock(props: {
  scope: string;
  sentence: string;
  disabled?: boolean;
  canAsk: boolean;
  selection?: SpeakTutorSelection | null;
  children: ReactNode;
}) {
  const { user, isCurrentUser } = useAuth();
  const { state, dispatch } = useApp();
  const { addCard } = useFlashcards();
  const scope = JSON.stringify([
    user?.id,
    state.selectedLanguage,
    state.nativeLanguage,
    props.scope,
  ]);
  return (
    <Pocket
      key={scope}
      {...props}
      owner={user?.id}
      isCurrentUser={isCurrentUser}
      state={state}
      save={(word, card) => {
        dispatch({
          type: "ADD_VOCAB_ITEMS",
          lang: state.selectedLanguage,
          payload: [
            {
              word,
              translation: card.meaning,
              category: "saved",
              correctCount: 0,
              moduleId: state.activeModuleId ?? undefined,
            },
          ],
        });
        addCard({
          language: state.selectedLanguage,
          word,
          translation: card.meaning,
          example: card.example,
          exampleTranslation: card.exampleMeaning,
          moduleId: state.activeModuleId ?? undefined,
        });
      }}
    />
  );
}

function Pocket({
  scope,
  children,
  selection,
  sentence,
  disabled,
  canAsk,
  owner,
  isCurrentUser,
  state,
  save,
}: Parameters<typeof SpeakTutorDock>[0] & {
  owner?: string;
  isCurrentUser: (id: string) => boolean;
  state: ReturnType<typeof useApp>["state"];
  save: (word: string, card: PocketTutorCard) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const [word, setWord] = useState("");
  const [context, setContext] = useState(sentence);
  const [card, setCard] = useState<PocketTutorCard | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = () => {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
  };
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!canAsk) {
      pending.current?.abort();
      setBusy(false);
    }
  }, [canAsk]);
  useEffect(() => {
    const leave = () => {
      if (document.hidden) {
        pending.current?.abort();
        setBusy(false);
      }
    };
    document.addEventListener("visibilitychange", leave);
    return () => document.removeEventListener("visibilitychange", leave);
  }, []);
  useEffect(() => {
    if (!selection || selection.scope !== scope) return;
    pending.current?.abort();
    setBusy(false);
    setCard(null);
    setError("");
    setSaved(false);
    setWord(selection.word);
    setContext(selection.sentence);
    setPage(0);
    setOpen(true);
  }, [selection, scope]);
  const pages = card
    ? [
        { title: "Meaning", text: card.meaning },
        { title: "Use", text: card.usage },
        { title: "Example", text: [card.example, card.exampleMeaning].filter(Boolean).join("\n") },
      ].flatMap((item) => {
        const chunks = item.text.match(/.{1,170}(?:\s|$)|\S{1,170}/gu) ?? [item.text];
        return chunks.map((text, i) => ({
          title: item.title + (chunks.length > 1 ? ` ${i + 1}/${chunks.length}` : ""),
          text,
        }));
      })
    : [];
  const current = pages[Math.min(page, pages.length - 1)];
  const alreadySaved =
    saved || state.userVocab.some((v) => pocketWordKey(v.word) === pocketWordKey(word));
  async function lookup(expand = false) {
    const term = word.trim();
    if (!term || term.length > 80 || busy) return;
    cancel();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setSaved(false);
    setPage(0);
    try {
      if (!expand) {
        const matches = await curriculumVocabulary(
          term,
          state.selectedLanguage,
          state.nativeLanguage,
          state.activeModuleId ?? undefined,
        );
        if (controller.signal.aborted) return;
        if (matches.length) {
          setCard({
            meaning: [...new Set(matches.map((m) => m.meaning))].slice(0, 2).join("; "),
            usage: "From your app lessons. Ask the tutor for usage in this conversation.",
            example: "",
            exampleMeaning: "",
          });
          return;
        }
      }
      if (!canAsk || !owner) {
        setError("Sign in and enable AI speaking to ask the tutor. Lesson words remain available.");
        return;
      }
      const headers = await speakingRequestHeaders(
        { userId: owner, isCurrent: () => isCurrentUser(owner) },
        controller.signal,
      );
      const response = await fetch("/api/speak", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          mode: "lookup",
          word: term,
          sentence: context || sentence,
          language: state.selectedLanguage,
          nativeLanguage: state.nativeLanguage,
          level: state.level,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Word lookup is unavailable.");
      const next = PocketTutorCardSchema.parse(result.card);
      if (!controller.signal.aborted && isCurrentUser(owner)) setCard(next);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Word lookup is unavailable. Try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="contents" data-testid="speak-tutor-dock">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled && !open}
        onClick={() => {
          cancel();
          setOpen(!open);
          input.current?.blur();
          if (!open) setContext(sentence);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
      >
        <span>
          Tutor <span className="font-normal text-muted-foreground">· word help</span>
        </span>
        {open ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <section
          id={panelId}
          aria-label="Speaking word tutor"
          className="flex h-[min(calc(33dvh-2.75rem),16rem)] min-h-44 flex-col gap-1 overflow-hidden rounded-xl border border-border bg-card p-2"
          data-testid="speak-tutor-panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              cancel();
              setOpen(false);
            }
          }}
        >
          <form
            className="flex shrink-0 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              input.current?.blur();
              void lookup();
            }}
          >
            <input
              ref={input}
              value={word}
              maxLength={80}
              aria-label="Tutor word or phrase"
              placeholder="Word or short phrase"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-base"
              onChange={(e) => {
                cancel();
                setWord(e.target.value);
                setCard(null);
                setSaved(false);
                setError("");
                setPage(0);
              }}
            />
            <button
              type="submit"
              disabled={busy || !word.trim()}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              {busy ? "Looking…" : "Look up"}
            </button>
          </form>
          <div
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col justify-center px-2"
            onTouchStart={(e) => {
              touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const start = touch.current;
              touch.current = null;
              if (!start) return;
              const dx = e.changedTouches[0].clientX - start.x,
                dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5)
                setPage((p) => Math.max(0, Math.min(pages.length - 1, p + (dx < 0 ? 1 : -1))));
            }}
          >
            {error ? (
              <p role="alert" className="text-sm">
                {error}
              </p>
            ) : current ? (
              <>
                <p className="text-sm font-semibold text-gold">{current.title}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed">{current.text}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Look up a word without leaving your conversation. Your reply stays where you left
                it.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-1 pl-14 desktop:pl-0">
            <button
              aria-label="Previous tutor card"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
              className="h-11 w-11 rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronLeft className="mx-auto h-4 w-4" />
            </button>
            <button
              disabled={!card || busy || !canAsk}
              onClick={() => void lookup(true)}
              className="min-h-11 px-2 text-sm"
            >
              More info
            </button>
            <button
              disabled={!card || alreadySaved || busy}
              onClick={() => {
                if (card) {
                  save(word.trim(), card);
                  setSaved(true);
                }
              }}
              className="flex min-h-11 items-center gap-1 px-2 text-sm text-gold"
            >
              <BookmarkPlus className="h-4 w-4" />
              {alreadySaved ? "Saved" : "Save word"}
            </button>
            <button
              aria-label="Next tutor card"
              disabled={page >= pages.length - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-11 w-11 rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronRight className="mx-auto h-4 w-4" />
            </button>
          </div>
        </section>
      )}
      <div hidden={open} className={open ? "hidden" : "contents"}>
        {children}
      </div>
    </div>
  );
}
