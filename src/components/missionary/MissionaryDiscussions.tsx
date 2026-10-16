import { recentConversationMessages } from "@/lib/conversation-history";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Trash2,
  Gauge,
  Footprints,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/app-state";
import { getModule } from "@/data/modules";
import { getMissionArea } from "@/data/missionary-content";
import {
  INVESTIGATORS,
  MISSIONARY_LESSONS,
  getInvestigator,
  getLesson,
  type InvestigatorType,
  type MissionaryLesson,
} from "@/data/discussion-content";
import { useAiGate } from "@/state/ai-gate-state";

interface Turn {
  id: string;
  role: "user" | "ai";
  text: string;
  conceptsHit?: string[];
}

interface DState {
  investigatorType: InvestigatorType;
  lessonId: string;
  topicIdx: number;
  turns: Turn[];
  // concepts hit per topic (lessonId|topicIdx -> Set of concepts)
  conceptHits: Record<string, string[]>;
  questionsByTopic: Record<string, number>;
  startedAt: number | null;
  topicsCompleted: number;
  bonusPoints: number;
  companionTip: string | null;
}

type DAction =
  | { type: "RESET" }
  | { type: "SET_INVESTIGATOR"; payload: InvestigatorType }
  | { type: "SET_LESSON"; payload: string }
  | { type: "ADD_TURN"; payload: Turn }
  | { type: "APPEND_DELTA"; payload: { id: string; delta: string } }
  | { type: "RECORD_HITS"; payload: { topicKey: string; hits: string[] } }
  | { type: "INC_TOPIC_QUESTIONS"; payload: string }
  | { type: "ADVANCE_TOPIC"; payload: { bonus: number } }
  | { type: "SET_TIP"; payload: string | null };

const initial: DState = {
  investigatorType: "golden",
  lessonId: MISSIONARY_LESSONS[0].id,
  topicIdx: 0,
  turns: [],
  conceptHits: {},
  questionsByTopic: {},
  startedAt: null,
  topicsCompleted: 0,
  bonusPoints: 0,
  companionTip: null,
};

function reducer(s: DState, a: DAction): DState {
  switch (a.type) {
    case "RESET":
      return { ...initial, investigatorType: s.investigatorType, lessonId: s.lessonId };
    case "SET_INVESTIGATOR":
      return { ...initial, investigatorType: a.payload, lessonId: s.lessonId };
    case "SET_LESSON":
      return { ...initial, investigatorType: s.investigatorType, lessonId: a.payload };
    case "ADD_TURN":
      return {
        ...s,
        turns: [...s.turns, a.payload],
        startedAt: s.startedAt ?? Date.now(),
      };
    case "APPEND_DELTA":
      return {
        ...s,
        turns: s.turns.map((t) =>
          t.id === a.payload.id ? { ...t, text: t.text + a.payload.delta } : t,
        ),
      };
    case "RECORD_HITS": {
      const cur = new Set(s.conceptHits[a.payload.topicKey] ?? []);
      a.payload.hits.forEach((h) => cur.add(h));
      return {
        ...s,
        conceptHits: { ...s.conceptHits, [a.payload.topicKey]: Array.from(cur) },
      };
    }
    case "INC_TOPIC_QUESTIONS":
      return {
        ...s,
        questionsByTopic: {
          ...s.questionsByTopic,
          [a.payload]: (s.questionsByTopic[a.payload] ?? 0) + 1,
        },
      };
    case "ADVANCE_TOPIC":
      return {
        ...s,
        topicIdx: s.topicIdx + 1,
        topicsCompleted: s.topicsCompleted + 1,
        bonusPoints: s.bonusPoints + a.payload.bonus,
        companionTip: null,
      };
    case "SET_TIP":
      return { ...s, companionTip: a.payload };
    default:
      return s;
  }
}

// Fuzzy concept match — case-insensitive substring, word-boundary tolerant.
function findConceptHits(text: string, concepts: string[]): string[] {
  const t = text.toLowerCase();
  return concepts.filter((c) => {
    const k = c.toLowerCase();
    if (k.length < 4) return new RegExp(`\\b${k}\\b`).test(t);
    return t.includes(k);
  });
}

export function MissionaryDiscussions() {
  const { state, dispatch: appDispatch } = useApp();
  const { gated } = useAiGate();
  const [s, dispatch] = useReducer(reducer, initial);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const investigator = getInvestigator(s.investigatorType);
  const lesson = getLesson(s.lessonId) ?? MISSIONARY_LESSONS[0];
  const topic = lesson.topics[s.topicIdx] ?? null;
  const topicKey = `${lesson.id}|${s.topicIdx}`;
  const topicHits = s.conceptHits[topicKey] ?? [];
  const topicQuestions = s.questionsByTopic[topicKey] ?? 0;
  const lessonComplete = topic == null;

  const mod = getModule(state.activeModuleId);
  const area = getMissionArea(mod ? (state.moduleAssignments[mod.id] ?? null) : null);

  // Auto-advance when concept threshold hit AND investigator has asked enough questions
  useEffect(() => {
    if (!topic) return;
    const required = Math.ceil(topic.keyConcepts.length * investigator.conceptThreshold);
    if (topicHits.length >= required && topicQuestions >= investigator.questionsPerTopic) {
      const bonus = topic.keyConcepts.length * 5 * investigator.pointMultiplier;
      dispatch({ type: "ADVANCE_TOPIC", payload: { bonus } });
      appDispatch({ type: "ADD_XP", payload: bonus });
      toast(`✓ Topic cleared: ${topic.title}`, {
        description: `+${bonus} XP — ${investigator.shortLabel} satisfied.`,
      });
    }
  }, [topicHits.length, topicQuestions, topic, investigator, appDispatch]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [s.turns.length, thinking]);

  // ----- Stats -----
  const elapsedMin = s.startedAt ? Math.max(0.05, (Date.now() - s.startedAt) / 60000) : 0;
  const distancePct = (s.topicsCompleted / Math.max(1, lesson.topics.length)) * 100;
  const speed = s.startedAt ? (s.topicsCompleted / Math.max(0.05, elapsedMin)).toFixed(2) : "0.00";

  // ----- Send a missionary turn -----
  const sendTurn = (raw: string) => {
    const text = raw.trim();
    if (!text || !topic || thinking) return;
    gated(() => doSendTurn(text));
  };

  const doSendTurn = async (text: string) => {
    if (!topic) return;
    setInput("");

    // Record concept hits before adding the turn so they show on the bubble.
    const hits = findConceptHits(text, topic.keyConcepts);
    if (hits.length) {
      dispatch({ type: "RECORD_HITS", payload: { topicKey, hits } });
      const earned = hits.length * 5 * investigator.pointMultiplier;
      appDispatch({ type: "ADD_XP", payload: earned });
    }
    const userTurn: Turn = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      conceptsHit: hits,
    };
    dispatch({ type: "ADD_TURN", payload: userTurn });

    // Begin streaming investigator reply
    setThinking(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const aiTurn: Turn = { id: `a-${Date.now()}`, role: "ai", text: "" };
    dispatch({ type: "ADD_TURN", payload: aiTurn });

    try {
      const history = recentConversationMessages(
        [...s.turns, userTurn].map((t) => ({
          role: t.role === "user" ? ("user" as const) : ("assistant" as const),
          content: t.text,
        })),
      );

      const res = await fetch("/api/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          mode: "investigator",
          language: state.selectedLanguage,
          investigator: {
            type: investigator.id,
            name: investigator.name,
            tone: investigator.tone,
            questionsPerTopic: investigator.questionsPerTopic,
          },
          lesson: {
            lessonNumber: lesson.number,
            lessonTitle: lesson.title,
            topicTitle: topic.title,
            topicKeyConcepts: topic.keyConcepts,
            questionsAskedOnTopic: topicQuestions,
          },
          missionArea: area ? { name: area.name, cultureNote: area.cultureNote } : undefined,
          messages: history,
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (delta) dispatch({ type: "APPEND_DELTA", payload: { id: aiTurn.id, delta } });
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      dispatch({ type: "INC_TOPIC_QUESTIONS", payload: topicKey });
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        toast("Discussion paused", {
          description: e instanceof Error ? e.message : "AI request failed.",
        });
      }
    } finally {
      setThinking(false);
    }

    // Companion tip — fire and forget
    void (async () => {
      try {
        const res = await fetch("/api/discussion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "companion",
            language: state.selectedLanguage,
            investigator: {
              type: investigator.id,
              name: investigator.name,
              tone: investigator.tone,
              questionsPerTopic: investigator.questionsPerTopic,
            },
            lesson: {
              lessonNumber: lesson.number,
              lessonTitle: lesson.title,
              topicTitle: topic.title,
              topicKeyConcepts: topic.keyConcepts,
              questionsAskedOnTopic: topicQuestions,
            },
            userText: text,
            messages: [{ role: "user", content: text }],
          }),
        });
        if (!res.ok) return;
        const j = (await res.json()) as { tip?: string | null };
        if (j.tip) dispatch({ type: "SET_TIP", payload: j.tip });
      } catch {
        /* soft fail */
      }
    })();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendTurn(input);
  };

  const renderInvestigatorPicker = () => (
    <div className="grid gap-2 sm:grid-cols-3">
      {INVESTIGATORS.map((inv) => {
        const active = inv.id === s.investigatorType;
        return (
          <button
            key={inv.id}
            onClick={() => dispatch({ type: "SET_INVESTIGATOR", payload: inv.id })}
            className={`rounded-xl border p-3 text-left transition-all ${
              active
                ? "border-gold/60 bg-gold/10 shadow-gold"
                : "border-border/60 bg-background/40 hover:border-gold/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                {inv.emoji}
              </span>
              <div>
                <div className="font-display text-sm italic text-foreground">{inv.shortLabel}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {inv.questionsPerTopic} Qs · ×{inv.pointMultiplier} pts
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{inv.description}</p>
          </button>
        );
      })}
    </div>
  );

  const renderLessonPicker = (l: MissionaryLesson) => (
    <button
      key={l.id}
      onClick={() => dispatch({ type: "SET_LESSON", payload: l.id })}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
        l.id === s.lessonId
          ? "border-gold/60 bg-gold/15 text-gold"
          : "border-border/60 bg-background/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
      }`}
    >
      <span>{l.emoji}</span>
      Lesson {l.number} · {l.title}
    </button>
  );

  return (
    <div className="fade-in mx-auto max-w-7xl">
      <header className="mb-5">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          <Sparkles className="h-3.5 w-3.5" />
          Missionary Discussions
        </div>
        <h1 className="mt-1 font-display text-3xl text-foreground">
          Roleplay a discussion in {state.selectedLanguage}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your investigator, pick a lesson, and teach. Hit the key gospel concepts to advance
          — your companion is listening with tips.
          {area && <span className="ml-1 text-gold">· {area.name}</span>}
        </p>
      </header>

      <div className="mb-4">{renderInvestigatorPicker()}</div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {MISSIONARY_LESSONS.map(renderLessonPicker)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Transcript + composer */}
        <section className="rounded-3xl border border-border/60 bg-card/40 p-4 backdrop-blur">
          {/* Speedometer + distance */}
          <div className="mb-3 grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 sm:grid-cols-4">
            <Stat
              icon={<Footprints className="h-3.5 w-3.5" />}
              label="Distance"
              value={`${s.topicsCompleted}/${lesson.topics.length}`}
              accent
            />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Topics / min" value={speed} />
            <Stat
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Bonus pts"
              value={`+${s.bonusPoints}`}
              accent
            />
            <Stat
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Concepts hit"
              value={`${topicHits.length}/${topic?.keyConcepts.length ?? 0}`}
            />
          </div>

          {/* Distance bar */}
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold/40 via-gold to-gold-soft transition-all duration-500"
              style={{ width: `${Math.min(100, distancePct)}%` }}
            />
          </div>

          <div
            ref={transcriptRef}
            className="h-[420px] overflow-y-auto rounded-2xl border border-border/40 bg-background/40 p-4"
          >
            {s.turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="font-display text-lg italic text-foreground/70">
                  Begin the discussion
                </p>
                <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                  Greet {investigator.name.split(" — ")[0]} and start teaching{" "}
                  <span className="text-gold">{topic?.title}</span> in {state.selectedLanguage}.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {s.turns.map((t) => (
                  <li
                    key={t.id}
                    className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div className="max-w-[85%]">
                      <div
                        className={
                          t.role === "user"
                            ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm"
                            : "rounded-2xl rounded-bl-sm border border-gold/30 bg-background/60 px-4 py-2.5 text-sm text-foreground shadow-sm"
                        }
                      >
                        <span className="leading-relaxed whitespace-pre-wrap">
                          {t.text || (t.role === "ai" ? "…" : "")}
                        </span>
                      </div>
                      {t.conceptsHit && t.conceptsHit.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                          {t.conceptsHit.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gold"
                            >
                              ✦ {c} +{5 * investigator.pointMultiplier}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {thinking && (
                  <li className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-gold/20 bg-background/40 px-4 py-2 text-xs text-muted-foreground">
                      {investigator.name.split(" — ")[0]} is thinking…
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Companion strip */}
          {s.companionTip && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold/80">
                  Companion
                </div>
                <p className="mt-0.5 leading-relaxed">{s.companionTip}</p>
              </div>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lessonComplete
                  ? `Lesson complete! Pick another above.`
                  : `Say something to ${investigator.name.split(" — ")[0]} in ${state.selectedLanguage}…`
              }
              disabled={lessonComplete || thinking}
              className="flex-1 rounded-full border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || lessonComplete || thinking}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/25 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "RESET" })}
              className="rounded-full border border-border/60 bg-background/60 p-2.5 text-muted-foreground transition-colors hover:text-foreground"
              title="Reset discussion"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>

        {/* Side: keys to lesson */}
        <aside className="rounded-3xl border border-border/60 bg-card/40 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              Keys to the lesson
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              ×{investigator.pointMultiplier}
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold/80">
              Now teaching
            </div>
            <div className="mt-0.5 font-display text-sm italic text-foreground">
              {topic ? topic.title : "Lesson complete ✦"}
            </div>
            {topic && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sample question: <em>"{topic.sampleQuestion}"</em>
              </p>
            )}
          </div>

          {topic && (
            <ul className="space-y-1.5">
              {topic.keyConcepts.map((c) => {
                const hit = topicHits.includes(c);
                return (
                  <li
                    key={c}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                      hit
                        ? "border-gold/50 bg-gold/10 text-foreground"
                        : "border-border/60 bg-background/40 text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {hit ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-border/60" />
                      )}
                      {c}
                    </span>
                    <span className="font-mono text-[9px] text-gold">
                      +{5 * investigator.pointMultiplier}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Topic roadmap */}
          <div className="mt-4">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Lesson roadmap
            </div>
            <ol className="space-y-1">
              {lesson.topics.map((t, i) => {
                const done = i < s.topicIdx;
                const current = i === s.topicIdx;
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ${
                      current
                        ? "bg-gold/10 text-foreground"
                        : done
                          ? "text-foreground/70"
                          : "text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3 w-3 text-gold" />
                    ) : current ? (
                      <ArrowRight className="h-3 w-3 text-gold" />
                    ) : (
                      <span className="h-3 w-3 rounded-full border border-border/60" />
                    )}
                    {t.title}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Investigator threshold
            </div>
            <p className="mt-0.5 text-[11px] text-foreground/80">
              Mention{" "}
              <strong>
                {Math.ceil((topic?.keyConcepts.length ?? 0) * investigator.conceptThreshold)}
              </strong>{" "}
              of {topic?.keyConcepts.length ?? 0} key concepts AND let{" "}
              {investigator.shortLabel.toLowerCase()} ask{" "}
              <strong>{investigator.questionsPerTopic}</strong> question
              {investigator.questionsPerTopic === 1 ? "" : "s"} to advance.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={accent ? "text-gold" : "text-muted-foreground"}>{icon}</span>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </div>
        <div className={`font-display text-base ${accent ? "text-gold" : "text-foreground"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
