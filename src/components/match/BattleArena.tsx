import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { RANK_BADGE, RANK_COLOR, RANK_TITLE, type RankTier } from "@/state/match-state";
import { celebrate } from "@/lib/confetti";
import { generateBattleWord, type BattleWord } from "@/fns/battle.functions";
import { RankBadge } from "./RankBadge";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";

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

function cefrForRound(round: number): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (round <= 2) return "A1";
  if (round <= 4) return "A2";
  if (round <= 6) return "B1";
  if (round <= 8) return "B2";
  return Math.random() < 0.5 ? "C1" : "C2";
}

function timerForRound(round: number): number {
  // 15s base, -1s per 3 rounds, min 8s
  const cuts = Math.floor((round - 1) / 3);
  return Math.max(8, 15 - cuts);
}

interface BattleArenaProps {
  playerName: string;
  playerTier: RankTier;
  opponentName: string;
  opponentTier: RankTier;
  language: Language;
  onComplete: (result: BattleResult) => void;
}

export interface ReviewedWord {
  word: string;
  correctDefinition: string;
  round: number;
  cefr: string;
  playerCorrect: boolean;
  language: Language;
}

export interface BattleResult {
  outcome: "victory" | "defeat" | "tie";
  rounds: number;
  /** The word + correct definition from the round that ENDED the match. */
  finalWord: string;
  finalCorrectDefinition: string;
  /** Every word seen across the match, oldest first. */
  wordHistory: ReviewedWord[];
}

type Phase = "loading" | "playing" | "waiting" | "revealing" | "between" | "ended";

interface RoundData {
  word: BattleWord;
  options: string[]; // shuffled definitions
  correctIndex: number;
}

function shuffleDefs(w: BattleWord): RoundData {
  const all = [w.correctDefinition, ...w.wrongDefinitions];
  const indexed = all.map((text, i) => ({ text, isCorrect: i === 0 }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    word: w,
    options: indexed.map((o) => o.text),
    correctIndex: indexed.findIndex((o) => o.isCorrect),
  };
}

export function BattleArena({
  playerName,
  playerTier,
  opponentName,
  opponentTier,
  language,
  onComplete,
}: BattleArenaProps) {
  const { dispatch } = useApp();
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<RoundData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [playerPick, setPlayerPick] = useState<number | null>(null);
  const [opponentPick, setOpponentPick] = useState<number | null>(null);
  const [playerWins, setPlayerWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [resultLine, setResultLine] = useState<string | null>(null);
  const [resultKind, setResultKind] = useState<"both" | "victory" | "defeat" | "tie" | null>(null);
  const [betweenLabel, setBetweenLabel] = useState<string | null>(null);

  const seenWordsRef = useRef<string[]>([]);
  const wordHistoryRef = useRef<ReviewedWord[]>([]);
  const timersRef = useRef<number[]>([]);
  const remainingMsRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const [timerPct, setTimerPct] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(15);

  // Guards against race conditions:
  //  - lockedRef: prevents handleLockIn from firing twice (double-click, or
  //    near-simultaneous click + timer expiry).
  //  - revealedRef: prevents revealRound running twice for the same round.
  //  - completedRef: prevents onComplete being invoked more than once.
  //  - loadGenRef: monotonic counter for in-flight fetches; stale results are
  //    discarded (handles React StrictMode double-mount and overlapping fetches).
  //  - mountedRef: false after unmount; suppresses post-unmount setStates.
  const lockedRef = useRef(false);
  const revealedRef = useRef(false);
  const completedRef = useRef(false);
  const loadGenRef = useRef(0);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      // Cancel any pending speech we might have started.
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch {
        /* ignore */
      }
    };
  }, [clearTimers]);

  const cefr = cefrForRound(round);
  const totalMs = timerForRound(round) * 1000;

  /** Fetch the next word for the current round. */
  const loadRound = useCallback(async () => {
    // Bump generation; any earlier in-flight call becomes stale and is ignored.
    const myGen = ++loadGenRef.current;
    // Reset per-round guards before fetching.
    lockedRef.current = false;
    revealedRef.current = false;
    setPhase("loading");
    setData(null);
    setError(null);
    setPlayerPick(null);
    setOpponentPick(null);
    setResultLine(null);
    setResultKind(null);
    let res: Awaited<ReturnType<typeof generateBattleWord>>;
    try {
      res = await generateBattleWord({
        data: {
          language,
          round,
          cefr,
          avoid: seenWordsRef.current.slice(-10),
        },
      });
    } catch (e) {
      if (myGen !== loadGenRef.current || !mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load word.");
      return;
    }
    // Discard stale or post-unmount results.
    if (myGen !== loadGenRef.current || !mountedRef.current) return;
    if (!res.data) {
      setError(res.error ?? "Could not load word.");
      return;
    }
    // Avoid pushing duplicates to the seen list (defensive — if the model
    // ignored `avoid`, at least we don't accumulate the same string forever).
    const w = res.data.word;
    if (!seenWordsRef.current.includes(w)) seenWordsRef.current.push(w);
    const rd = shuffleDefs(res.data);
    setData(rd);
    setPhase("playing");
    startClock(totalMs);
  }, [language, round, cefr, totalMs]);

  useEffect(() => {
    void loadRound();
    // loadRound is stable per-round (depends on round, cefr, totalMs which all
    // derive from `round`). We intentionally only rerun when `round` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const startClock = (ms: number) => {
    clearTimers();
    remainingMsRef.current = ms;
    startTsRef.current = performance.now();
    setTimerPct(100);
    setSecondsLeft(Math.ceil(ms / 1000));
    tickRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTsRef.current;
      const left = Math.max(0, ms - elapsed);
      remainingMsRef.current = left;
      setTimerPct((left / ms) * 100);
      setSecondsLeft(Math.ceil(left / 1000));
      if (left <= 0) {
        if (tickRef.current) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        // timeout: treat as no-pick
        handleLockIn(null, true);
      }
    }, 80);
  };

  const stopClock = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  /** Call after player picks (or timer expires). */
  const handleLockIn = (idx: number | null, fromTimeout = false) => {
    // Ref guard handles three races the phase check alone misses:
    //   1. double-click on the same answer card → two onClicks
    //   2. user click + timer expiry firing in the same tick
    //   3. setInterval body holds a stale `phase` closure (created when
    //      startClock ran inside loadRound — phase was "loading" at that
    //      render) so the phase check would wrongly reject the timeout call.
    // The ref is reset to false at the start of each loadRound.
    if (lockedRef.current) return;
    // Only the timer is allowed to bypass the phase guard, since its closure
    // can be stale. User clicks come from buttons that are `disabled` outside
    // of "playing", so the phase check is safe for them.
    if (!fromTimeout && phase !== "playing") return;
    lockedRef.current = true;
    stopClock();
    setPlayerPick(idx);
    setPhase("waiting");
    if (!fromTimeout && idx !== null) {
      // small haptic-ish flash
    }
    // Simulated opponent answer 1-3s
    const opponentDelay = 800 + Math.random() * 2200;
    const t = window.setTimeout(() => {
      revealRound(idx);
    }, opponentDelay);
    timersRef.current.push(t);
  };

  const revealRound = (pIdx: number | null) => {
    if (!data) return;
    if (revealedRef.current) return;
    revealedRef.current = true;
    const correct = data.correctIndex;

    // Opponent skill scales with their tier — but cap so it stays beatable.
    // Higher CEFR = harder for opponent too.
    const opp = simulateOpponent(opponentTier, cefr, correct, data.options.length);
    setOpponentPick(opp);

    const playerRight = pIdx === correct;
    const oppRight = opp === correct;
    setPhase("revealing");

    let line = "";
    let kind: "both" | "victory" | "defeat" | "tie";
    if (playerRight && oppRight) {
      line = `🔥 Both Correct! Loading Round ${round + 1}...`;
      kind = "both";
      setPlayerWins((n) => n + 1);
      setOpponentWins((n) => n + 1);
    } else if (playerRight && !oppRight) {
      line = "🏆 You won the duel!";
      kind = "victory";
      setPlayerWins((n) => n + 1);
    } else if (!playerRight && oppRight) {
      line = "💀 Defeat — they outsmarted you.";
      kind = "defeat";
      setOpponentWins((n) => n + 1);
    } else {
      line = "🤝 Both wrong. It's a tie.";
      kind = "tie";
    }
    setResultLine(line);
    setResultKind(kind);

    // Record this round's word in the review history
    wordHistoryRef.current.push({
      word: data.word.word,
      correctDefinition: data.word.correctDefinition,
      round,
      cefr,
      playerCorrect: playerRight,
      language,
    });

    if (kind === "both") {
      const t = window.setTimeout(() => advanceRound(), 1700);
      timersRef.current.push(t);
    } else {
      // Match end
      const outcome: BattleResult["outcome"] =
        kind === "victory" ? "victory" : kind === "defeat" ? "defeat" : "tie";
      if (outcome === "victory") celebrate();
      const finalWord = data.word.word;
      const finalCorrectDefinition = data.word.correctDefinition;
      const t = window.setTimeout(() => {
        if (completedRef.current || !mountedRef.current) return;
        completedRef.current = true;
        setPhase("ended");
        onComplete({
          outcome,
          rounds: round,
          finalWord,
          finalCorrectDefinition,
          wordHistory: [...wordHistoryRef.current],
        });
      }, 2200);
      timersRef.current.push(t);
    }

    // +3 XP per correct answer (per spec). Effort-only XP comes from match outcome in MatchmakingOverlay.
    if (playerRight) dispatch({ type: "ADD_XP", payload: 3 });
  };

  const advanceRound = () => {
    setBetweenLabel(`Round ${round + 1} · Difficulty: ${cefrForRound(round + 1)} ↑`);
    setPhase("between");
    const t = window.setTimeout(() => {
      setBetweenLabel(null);
      setRound((n) => n + 1);
    }, 900);
    timersRef.current.push(t);
  };

  const speak = () => {
    if (!data) return;
    try {
      if (
        typeof window === "undefined" ||
        !window.speechSynthesis ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        return;
      }
      // Cancel any in-flight utterance before starting a new one (Safari is
      // particularly stateful here — back-to-back speak() calls can deadlock
      // the queue without a cancel first).
      if (needsRemoteTTS(SPEECH_LOCALE[language])) {
        void speakRemote(data.word.word, SPEECH_LOCALE[language], { rate: 0.9 });
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(data.word.word);
      configureUtterance(u, SPEECH_LOCALE[language]);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  // Background gets slightly darker each round
  const darken = Math.min(0.35, round * 0.025);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{
        background: `linear-gradient(180deg, rgba(0,0,0,${0.15 + darken}) 0%, rgba(0,0,0,${0.45 + darken}) 100%)`,
      }}
    >
      {/* Top bar */}
      <div className="relative px-6 pt-6">
        <div className="flex items-center justify-between gap-6">
          <PlayerStrip name={playerName} tier={playerTier} wins={playerWins} side="left" />
          <div className="text-center">
            <div
              className="font-display italic text-white drop-shadow-[0_0_18px_rgba(201,168,76,0.5)] transition-all"
              style={{ fontSize: `${Math.min(2.5, 1.6 + round * 0.08)}rem` }}
            >
              Round {round}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
              CEFR {cefr} · {Math.ceil(totalMs / 1000)}s
            </div>
          </div>
          <PlayerStrip name={opponentName} tier={opponentTier} wins={opponentWins} side="right" />
        </div>

        {/* Timer bar */}
        <TimerBar pct={timerPct} secondsLeft={secondsLeft} />
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-8">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
              Drawing the next word…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-6 py-4 text-center font-mono text-xs text-red-200">
            {error}
            <button
              onClick={() => void loadRound()}
              className="mt-3 block w-full rounded-lg border border-gold/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold hover:bg-gold/10"
            >
              Retry round
            </button>
          </div>
        )}

        {data && phase !== "loading" && (
          <>
            <div className="flex flex-col items-center text-center">
              <div key={`word-${round}`} className="word-drop flex items-center gap-3">
                <h2
                  className="font-display italic text-gold drop-shadow-[0_0_24px_rgba(201,168,76,0.55)]"
                  style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)" }}
                >
                  {data.word.word}
                </h2>
                <button
                  onClick={speak}
                  aria-label="Pronounce word"
                  className="rounded-full border border-gold/40 bg-white/5 p-2 text-gold transition-colors hover:bg-gold/15"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
                {language} — Round {round}
              </div>
            </div>

            {/* 4 cards */}
            <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
              {data.options.map((text, i) => {
                const letter = ["A", "B", "C", "D"][i];
                const locked = playerPick !== null;
                const isPlayerPick = playerPick === i;
                const isOppPick = opponentPick === i;
                const isCorrect = data.correctIndex === i;
                const revealing = phase === "revealing";

                let stateClass =
                  "border-white/15 bg-[#0e1726] hover:border-gold/60 hover:-translate-y-0.5";
                if (revealing && isCorrect) {
                  stateClass = "border-emerald-400 bg-emerald-500/15 card-correct-pulse";
                } else if (revealing && !isCorrect && (isPlayerPick || isOppPick)) {
                  stateClass = "border-red-500 bg-red-500/15 card-wrong-flash";
                } else if (locked && isPlayerPick) {
                  stateClass = "border-gold/70 bg-gold/10 opacity-90";
                } else if (locked) {
                  stateClass = "border-white/10 bg-[#0a111d] opacity-50";
                }

                return (
                  <button
                    key={i}
                    disabled={locked || phase !== "playing"}
                    onClick={() => handleLockIn(i)}
                    className={`group relative rounded-2xl border p-4 text-left transition-all ${stateClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-[#a48330] font-display text-base italic text-[#1a1208] shadow">
                        {letter}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-snug text-white/90">{text}</p>
                        {locked && isPlayerPick && phase === "waiting" && (
                          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                            <span className="inline-block h-2 w-2 animate-spin rounded-full border border-gold border-t-transparent" />
                            Answer locked ✓
                          </div>
                        )}
                      </div>
                      {/* Tags */}
                      <div className="flex flex-col items-end gap-1">
                        {revealing && isPlayerPick && (
                          <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white">
                            You
                          </span>
                        )}
                        {revealing && isOppPick && (
                          <span className="rounded-full bg-red-500/30 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-red-100">
                            Opp
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status line */}
            <div className="mt-8 min-h-[40px] text-center">
              {phase === "waiting" && (
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-white/70">
                  Waiting for {opponentName}
                  <span className="searching-dots ml-1" />
                </div>
              )}
              {phase === "revealing" && resultLine && (
                <div
                  className={`font-display text-2xl italic ${
                    resultKind === "victory" || resultKind === "both"
                      ? "text-emerald-300"
                      : resultKind === "defeat"
                        ? "text-red-300"
                        : "text-gold"
                  } drop-shadow`}
                >
                  {resultLine}
                </div>
              )}
            </div>
          </>
        )}

        {/* Between-rounds slam */}
        {phase === "between" && betweenLabel && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <div className="round-slam font-display text-5xl italic text-gold drop-shadow-[0_0_30px_rgba(201,168,76,0.7)]">
              {betweenLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerStrip({
  name,
  tier,
  wins,
  side,
}: {
  name: string;
  tier: RankTier;
  wins: number;
  side: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <RankBadge tier={tier} badge={RANK_BADGE[tier]} size="sm" />
      <div className={side === "right" ? "text-right" : "text-left"}>
        <div className="font-display text-base italic text-white">{name}</div>
        <div
          className="font-mono text-[9px] uppercase tracking-[0.25em]"
          style={{ color: RANK_COLOR[tier] }}
        >
          {tier} · {RANK_TITLE[tier]}
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/60">
          Rounds Won: {wins}
        </div>
      </div>
    </div>
  );
}

function TimerBar({ pct, secondsLeft }: { pct: number; secondsLeft: number }) {
  const color = secondsLeft <= 3 ? "#ef4444" : secondsLeft <= 7 ? "#f97316" : "#c9a84c";
  const urgent = secondsLeft <= 3;
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-[width] duration-100 ${urgent ? "timer-urgent" : ""}`}
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 14px ${color}aa`,
        }}
      />
    </div>
  );
}

/** Simulate opponent's pick. Higher tier → more likely correct. Harder CEFR → less likely. */
function simulateOpponent(
  tier: RankTier,
  cefr: string,
  correctIdx: number,
  optionCount: number,
): number {
  const tierBoost: Record<RankTier, number> = {
    Bronze: 0.45,
    Silver: 0.55,
    Gold: 0.65,
    Platinum: 0.72,
    Diamond: 0.8,
    Champion: 0.86,
    Unreal: 0.92,
  };
  const cefrPenalty: Record<string, number> = {
    A1: 0,
    A2: 0.03,
    B1: 0.08,
    B2: 0.13,
    C1: 0.18,
    C2: 0.22,
  };
  const acc = Math.max(0.25, tierBoost[tier] - (cefrPenalty[cefr] ?? 0));
  if (Math.random() < acc) return correctIdx;
  // pick a random wrong
  const wrong = [...Array(optionCount).keys()].filter((i) => i !== correctIdx);
  return wrong[Math.floor(Math.random() * wrong.length)];
}
