import { useMemo, useState } from "react";
import { Sparkles, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Language } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import { speakingRequestHeaders } from "@/lib/speaking-client";

export interface SpeakChallenge {
  target: string;
  english: string;
  hint: string;
  keyword: string;
  kind: "grammar" | "reach";
}

const LEVEL_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface Props {
  language: Language;
  level: string;
  active: SpeakChallenge | null;
  onStart: (c: SpeakChallenge) => void;
  onSpeakAloud: (text: string) => void;
}

export function ChallengePanel({ language, level, active, onStart, onSpeakAloud }: Props) {
  const { state } = useGrammar();
  const [loading, setLoading] = useState<"grammar" | "reach" | null>(null);

  // Collect concept titles from completed lessons across ALL CEFR levels
  // for the current language.
  const completedConcepts = useMemo(() => {
    const langStore = state.store[language];
    if (!langStore) return [] as string[];
    const out: string[] = [];
    for (const lvl of LEVEL_ORDER) {
      const ls = langStore[lvl];
      if (!ls) continue;
      for (const stub of ls.lessons) {
        if (ls.completed[stub.id]) out.push(stub.concept || stub.title);
      }
    }
    return out;
  }, [state.store, language]);

  const fetchChallenge = async (kind: "grammar" | "reach") => {
    if (kind === "grammar" && completedConcepts.length === 0) {
      toast("Finish a Grammar Studio lesson first", {
        description: "Complete any lesson and we'll turn it into a spoken challenge.",
      });
      return;
    }
    setLoading(kind);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: await speakingRequestHeaders(),
        body: JSON.stringify({
          mode: "challenge",
          language,
          level,
          kind,
          concepts: kind === "grammar" ? completedConcepts.slice(-12) : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast("Couldn't load challenge", {
          description: j.error || "Try again in a moment.",
        });
        return;
      }
      const data = (await res.json()) as Omit<SpeakChallenge, "kind">;
      const challenge: SpeakChallenge = { ...data, kind };
      onStart(challenge);
      onSpeakAloud(challenge.target);
    } catch {
      toast("Network error", { description: "Couldn't reach the challenge generator." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-gold/30 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="font-serif text-lg text-foreground">Spoken Challenges</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedConcepts.length} grammar{" "}
          {completedConcepts.length === 1 ? "concept" : "concepts"} unlocked
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => fetchChallenge("grammar")}
          disabled={loading !== null}
          className="group flex items-center justify-between rounded-2xl border border-gold/30 bg-background/60 px-4 py-3 text-left transition-all hover:border-gold/60 hover:bg-gold/10 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Target className="h-3.5 w-3.5 text-gold" />
              Grammar challenge
            </div>
            <div className="text-xs text-muted-foreground">Use a concept from Grammar Studio</div>
          </div>
          <span className="text-xs text-gold">{loading === "grammar" ? "…" : "→"}</span>
        </button>
        <button
          onClick={() => fetchChallenge("reach")}
          disabled={loading !== null}
          className="group flex items-center justify-between rounded-2xl border border-gold/30 bg-background/60 px-4 py-3 text-left transition-all hover:border-gold/60 hover:bg-gold/10 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Zap className="h-3.5 w-3.5 text-gold" />
              Reach word
            </div>
            <div className="text-xs text-muted-foreground">
              Stretch into a slightly harder vocabulary
            </div>
          </div>
          <span className="text-xs text-gold">{loading === "reach" ? "…" : "→"}</span>
        </button>
      </div>

      {active && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gold">
              {active.kind === "grammar" ? "Grammar mission" : "Reach mission"}
            </span>
            <button
              onClick={() => onSpeakAloud(active.target)}
              className="text-xs text-gold hover:opacity-80"
              aria-label="Replay target"
            >
              🔊 replay
            </button>
          </div>
          <p className="mt-2 font-serif text-xl text-foreground">{active.target}</p>
          <p className="mt-1 text-sm text-muted-foreground">{active.english}</p>
          <p className="mt-2 text-xs text-gold/90">💡 {active.hint}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Say it out loud — confetti when you nail it.
          </p>
        </div>
      )}
    </section>
  );
}
