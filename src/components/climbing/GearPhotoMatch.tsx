import { useState, useCallback } from "react";
import { useApp } from "@/state/app-state";

interface GearItem {
  id: string;
  emoji: string;
  imgUrl: string;
  names: Record<string, string>; // lang → name
}

const GEAR_ITEMS: GearItem[] = [
  {
    id: "harness",
    emoji: "🔗",
    imgUrl: "/images/gear/harness.jpg",
    names: {
      Spanish: "Arnés",
      Portuguese: "Arnês",
      French: "Baudrier",
      German: "Klettergurt",
      Italian: "Imbrago",
      Japanese: "ハーネス",
      Korean: "하네스",
      English: "Harness",
    },
  },
  {
    id: "carabiner",
    emoji: "🔒",
    imgUrl: "/images/gear/carabiner.jpg",
    names: {
      Spanish: "Mosquetón",
      Portuguese: "Mosquetão",
      French: "Mousqueton",
      German: "Karabiner",
      Italian: "Moschettone",
      Japanese: "カラビナ",
      Korean: "카라비너",
      English: "Carabiner",
    },
  },
  {
    id: "rope",
    emoji: "🪢",
    imgUrl: "/images/gear/rope.jpg",
    names: {
      Spanish: "Cuerda",
      Portuguese: "Corda",
      French: "Corde",
      German: "Seil",
      Italian: "Corda",
      Japanese: "ロープ",
      Korean: "로프",
      English: "Rope",
    },
  },
  {
    id: "quickdraw",
    emoji: "⛓️",
    imgUrl: "/images/gear/quickdraw.jpg",
    names: {
      Spanish: "Exprés",
      Portuguese: "Expresso",
      French: "Dégaine",
      German: "Express-Schlinge",
      Italian: "Rinvio",
      Japanese: "ヌンチャク",
      Korean: "퀵드로우",
      English: "Quickdraw",
    },
  },
  {
    id: "chalk-bag",
    emoji: "🎒",
    imgUrl: "/images/gear/chalk-bag.jpg",
    names: {
      Spanish: "Bolsa de Magnesio",
      Portuguese: "Saco de Magnésio",
      French: "Sac à Magnésie",
      German: "Magnesiabeutel",
      Italian: "Sacchetto di Magnesio",
      Japanese: "チョークバッグ",
      Korean: "초크백",
      English: "Chalk Bag",
    },
  },
  {
    id: "shoes",
    emoji: "👟",
    imgUrl: "/images/gear/climbing-shoes.jpg",
    names: {
      Spanish: "Pies de Gato",
      Portuguese: "Sapatilha de Escalada",
      French: "Chaussons d'Escalade",
      German: "Kletterschuhe",
      Italian: "Scarpette da Arrampicata",
      Japanese: "クライミングシューズ",
      Korean: "클라이밍 슈즈",
      English: "Climbing Shoes",
    },
  },
  {
    id: "helmet",
    emoji: "⛑️",
    imgUrl: "/images/gear/helmet.jpg",
    names: {
      Spanish: "Casco",
      Portuguese: "Capacete",
      French: "Casque",
      German: "Kletterhelm",
      Italian: "Casco",
      Japanese: "ヘルメット",
      Korean: "헬멧",
      English: "Helmet",
    },
  },
  {
    id: "belay-device",
    emoji: "⚙️",
    imgUrl: "/images/gear/belay-device.jpg",
    names: {
      Spanish: "Dispositivo de Aseguramiento",
      Portuguese: "Freio",
      French: "Assureur",
      German: "Sicherungsgerät",
      Italian: "Assicuratore",
      Japanese: "ビレイデバイス",
      Korean: "빌레이 장치",
      English: "Belay Device",
    },
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildRound(correct: GearItem, all: GearItem[], lang: string) {
  const distractors = shuffle(all.filter((g) => g.id !== correct.id)).slice(0, 3);
  const choices = shuffle([correct, ...distractors]);
  return { correct, choices, lang };
}

export function GearPhotoMatch() {
  const { state } = useApp();
  const lang = state.selectedLanguage;

  const [items] = useState(() => shuffle(GEAR_ITEMS));
  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const totalRounds = Math.min(8, items.length);

  const round = buildRound(items[roundIdx], GEAR_ITEMS, lang);

  const handlePick = useCallback(
    (id: string) => {
      if (selected) return;
      setSelected(id);
      if (id === round.correct.id) setScore((s) => s + 1);
      setTimeout(() => {
        if (roundIdx + 1 >= totalRounds) {
          setDone(true);
        } else {
          setRoundIdx((r) => r + 1);
          setSelected(null);
        }
      }, 900);
    },
    [selected, round.correct.id, roundIdx, totalRounds],
  );

  const restart = () => {
    setRoundIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="text-5xl">{score >= 7 ? "🏆" : score >= 5 ? "✅" : "🎯"}</div>
        <div>
          <p className="text-2xl font-bold text-white">
            {score} / {totalRounds}
          </p>
          <p className="text-white/50 text-sm mt-1">
            {score === totalRounds
              ? "Perfect — you know your gear."
              : score >= 6
                ? "Strong result — keep going."
                : "Good start — repeat to lock it in."}
          </p>
        </div>
        <button
          onClick={restart}
          className="bg-[#E8A020] text-[#0D0D1A] font-bold px-6 py-2.5 rounded-xl hover:bg-[#E8A020]/90 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  const item = round.correct;
  const gearName = item.names[lang] ?? item.names["English"];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          Round {roundIdx + 1} of {totalRounds}
        </span>
        <span>{score} correct</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E8A020] transition-all"
          style={{ width: `${(roundIdx / totalRounds) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-white/30 mb-2">
          Which photo shows this?
        </p>
        <p className="text-2xl font-bold text-white">{gearName}</p>
        {lang !== "English" && (
          <p className="text-white/30 text-sm mt-1">{item.names["English"]}</p>
        )}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 gap-3">
        {round.choices.map((choice) => {
          const isCorrect = choice.id === round.correct.id;
          const isSelected = selected === choice.id;
          const showResult = !!selected;

          let borderClass = "border-white/[0.08] hover:border-white/20";
          if (showResult && isCorrect) borderClass = "border-emerald-400";
          else if (showResult && isSelected && !isCorrect) borderClass = "border-red-400";

          return (
            <button
              key={choice.id}
              onClick={() => handlePick(choice.id)}
              disabled={!!selected}
              className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/3] ${borderClass}`}
            >
              <img
                src={choice.imgUrl}
                alt={choice.names["English"]}
                className="w-full h-full object-cover"
              />
              {showResult && isCorrect && (
                <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
              )}
              {showResult && isSelected && !isCorrect && (
                <div className="absolute inset-0 bg-red-400/20 flex items-center justify-center">
                  <span className="text-3xl">✗</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium text-center ${selected === round.correct.id ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-red-400/10 text-red-400 border border-red-400/20"}`}
        >
          {selected === round.correct.id
            ? `✓ Correct — ${gearName}`
            : `✗ That was the ${GEAR_ITEMS.find((g) => g.id === selected)?.names["English"] ?? "wrong one"}. The correct answer is: ${gearName}`}
        </div>
      )}
    </div>
  );
}
