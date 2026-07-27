import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Sparkles, Send, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/app-state";
import { useLibrary, flagFor } from "@/state/library-state";
import { useSpeech } from "@/state/speech-state";
import { useTutor, type TutorMessage } from "@/state/tutor-state";
import { getModule } from "@/data/modules";
import { getMissionArea } from "@/data/missionary-content";
import { getOrthoArea } from "@/data/orthopedics-content";
import { getModuleAreaContext } from "@/data/module-content-registry";
import { getPatternsForLanguage } from "@/data/grammar-patterns";
import { VOCAB_MASTERY_THRESHOLD } from "@/state/app-state";
import { useAiGate } from "@/state/ai-gate-state";

const LEVEL_TO_CEFR: Record<string, string> = {
  Beginner: "A1–A2",
  Intermediate: "B1–B2",
  Advanced: "C1",
  Fluent: "C2",
};

const QUICK_PROMPTS = [
  {
    label: "Explain last word clicked 🔍",
    value: (w?: string) =>
      w
        ? `Can you explain the word "${w}" in more depth — its nuances, common collocations, and a vivid example?`
        : `Pick a useful word from the current passage and explain its nuances and usage.`,
  },
  {
    label: "Grammar question ✏️",
    value: () => `I have a grammar question about the current passage: `,
  },
  {
    label: "Tell me about the culture 🌍",
    value: () =>
      `Tell me a vivid cultural insight related to this passage — something a native speaker would just know.`,
  },
  {
    label: "Quiz me on this passage 🎯",
    value: () =>
      `Quiz me with 3 short comprehension questions about the current passage. Wait for my answers between questions.`,
  },
];

export function TutorPanel() {
  const { state: appState, dispatch } = useApp();
  const { selected } = useLibrary();
  const { lastWord } = useSpeech();
  const tutor = useTutor();
  const { gated } = useAiGate();

  const threadId = selected.id;
  const messages = tutor.messagesFor(threadId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Pull in pending prefill from Word Card / external triggers
  useEffect(() => {
    if (!tutor.state.open) return;
    const pending = tutor.consumePrefill();
    if (pending) setInput(pending.text);
  }, [tutor.state.open, tutor]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const cefr = useMemo(() => LEVEL_TO_CEFR[appState.level] ?? "A1", [appState.level]);
  const passage = useMemo(
    () =>
      selected.sentences
        .slice(0, 4)
        .map((s) => s.target)
        .join(" "),
    [selected],
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    gated(() => doSend(trimmed));
  };

  const doSend = async (trimmed: string) => {
    setError(null);
    // Reader context belongs to the first contextual turn only. Later free-form
    // questions in the same thread should not be steered by a stale word card.
    const readerContext = tutor.takeReaderContext(selected.title);
    const userMsg: TutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    tutor.addMessage(threadId, userMsg);
    dispatch({ type: "ADD_XP", payload: 10 });
    dispatch({ type: "INC_COUNTER", payload: "tutorMessages" });

    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    tutor.addMessage(threadId, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            language: appState.selectedLanguage,
            level: cefr,
            nativeLanguage: appState.nativeLanguage,
            textTitle: selected.title,
            passage,
            lastWord: lastWord ?? undefined,
            readerContext,
            module: (() => {
              const mod = getModule(appState.activeModuleId);
              if (!mod) return undefined;
              const assignment = appState.moduleAssignments[mod.id] ?? null;
              const area = getMissionArea(assignment);
              const ortho = mod.id === "orthopedics" ? getOrthoArea(assignment) : null;
              const moduleArea =
                mod.id !== "lds-missionary" && mod.id !== "orthopedics"
                  ? getModuleAreaContext(mod.id, assignment)
                  : null;
              return {
                id: mod.id,
                name: mod.name,
                learnDirection: mod.learnDirection,
                userRole: ortho?.learnerRole ?? moduleArea?.learnerRole ?? mod.userRole,
                aiPersona: mod.aiPersona,
                missionArea: area
                  ? {
                      name: area.name,
                      region: area.region,
                      languages: area.languages,
                      cultureNote: area.cultureNote,
                    }
                  : undefined,
                orthoArea: ortho
                  ? {
                      name: ortho.name,
                      counterpart: ortho.counterpart,
                      learnerRole: ortho.learnerRole,
                      toneNote: ortho.toneNote,
                      vocab: ortho.vocab.slice(0, 20),
                    }
                  : undefined,
                moduleArea: moduleArea
                  ? {
                      name: moduleArea.name,
                      counterpart: moduleArea.counterpart,
                      learnerRole: moduleArea.learnerRole,
                      toneNote: moduleArea.toneNote,
                      vocab: moduleArea.vocab,
                      phrases: moduleArea.phrases,
                      sampleExchange: moduleArea.sampleExchange,
                    }
                  : undefined,
              };
            })(),
            userVocabWords:
              appState.vocabLang === appState.selectedLanguage && appState.userVocab.length
                ? appState.userVocab.slice(0, 15).map((v) => v.word)
                : undefined,
            activePatterns: (() => {
              const patterns = getPatternsForLanguage(appState.selectedLanguage);
              return patterns
                .filter((p) => (appState.patternProgress[p.id] ?? 0) < VOCAB_MASTERY_THRESHOLD)
                .slice(0, 8)
                .map((p) => ({ name: p.name, pattern: p.pattern }));
            })(),
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(j.error ?? `Request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) tutor.appendDelta(threadId, assistantId, delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      tutor.appendDelta(threadId, assistantId, `\n\n_⚠ ${msg}_`);
      toast.error("Tutor error", { description: msg });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  if (!tutor.state.open) {
    return (
      <button
        onClick={() => tutor.setOpen(true)}
        className="tutor-pulse fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/60 bg-gradient-to-br from-gold/30 via-card/90 to-card/90 px-5 py-3 font-display text-sm italic text-foreground shadow-luxe backdrop-blur transition-transform hover:scale-[1.03] lg:bottom-20 lg:right-6"
        aria-label="Open AI Tutor"
      >
        <Sparkles className="h-4 w-4 text-gold" />
        <span className="text-gold">✦</span> Ask Tutor
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-2 top-[calc(0.5rem+env(safe-area-inset-top))] z-40 flex w-[380px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-gold/40 bg-card/95 shadow-luxe backdrop-blur-xl lg:bottom-20 lg:right-4 lg:top-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="font-display text-sm italic">
            <span className="text-gold">✦</span> Language Threshold Tutor
          </span>
          <span className="text-base">{flagFor(appState.selectedLanguage)}</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => tutor.clearThread(threadId)}
              aria-label="Clear conversation"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background/50 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => tutor.setOpen(false)}
            aria-label="Minimize tutor"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="custom-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-center">
            <div className="mx-auto mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/50 text-gold">
              ✦
            </div>
            <p className="font-display text-sm italic text-foreground/90">
              I'm your tutor for {appState.selectedLanguage}.
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Ask me anything about the text
            </p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {streaming &&
          messages[messages.length - 1]?.role === "assistant" &&
          !messages[messages.length - 1]?.content && (
            <div className="flex gap-2 text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold [animation-delay:240ms]" />
            </div>
          )}
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => setInput(q.value(lastWord ?? undefined))}
            className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 font-mono text-[10px] tracking-wide text-foreground/80 transition-colors hover:border-gold/60 hover:text-gold"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-border/60 bg-background/30 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask your tutor…"
          rows={1}
          className="custom-scroll max-h-32 flex-1 resize-none rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-destructive/60 hover:text-destructive"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-midnight transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>

      {error && (
        <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: TutorMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-midnight px-3.5 py-2 text-sm text-ivory shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[11px] text-gold">
        ✦
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gold/30 bg-gold/[0.06] px-3.5 py-2 text-sm text-foreground/95">
        <div className="prose prose-sm prose-invert max-w-none [&_code]:font-mono [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-gold">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{message.content || " "}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
