import { useState } from "react";
import { Church, Volume2, Wheat, Droplet } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import { useMissionarySpeech } from "@/components/missionary/useMissionarySpeech";
import { SpeedButton } from "@/components/missionary/SpeedButton";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";

// Official sacrament prayers as recorded in Doctrine and Covenants 20:77, 79
// (also Moroni 4:3 and 5:2). Public scripture text — freely available from
// churchofjesuschrist.org. Used by the priest officiating each Sunday.
const PRAYER_BREAD =
  "O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this bread to the souls of all those who partake of it, that they may eat in remembrance of the body of thy Son, and witness unto thee, O God, the Eternal Father, that they are willing to take upon them the name of thy Son, and always remember him and keep his commandments which he has given them; that they may always have his Spirit to be with them. Amen.";

const PRAYER_WATER =
  "O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this water to the souls of all those who drink of it, that they may do it in remembrance of the blood of thy Son, which was shed for them; that they may witness unto thee, O God, the Eternal Father, that they do always remember him, that they may have his Spirit to be with them. Amen.";

interface PrayerSpec {
  id: "bread" | "water";
  title: string;
  reference: string;
  icon: typeof Wheat;
  text: string;
}

const PRAYERS: PrayerSpec[] = [
  {
    id: "bread",
    title: "Blessing on the Bread",
    reference: "D&C 20:77 · Moroni 4:3",
    icon: Wheat,
    text: PRAYER_BREAD,
  },
  {
    id: "water",
    title: "Blessing on the Water",
    reference: "D&C 20:79 · Moroni 5:2",
    icon: Droplet,
    text: PRAYER_WATER,
  },
];

/**
 * Sunday-services reference panel for the LDS Missionary module: the two
 * sacrament prayers, fully clickable (tap any word to look it up in the
 * selected target language), with read-aloud and an "Teach me how to follow
 * along in {language}" tutor handoff.
 */
export function SacramentPrayersPanel() {
  const { state, dispatch } = useApp();
  const tutor = useTutor();
  const { rate, cycleRate, speak, speaking } = useMissionarySpeech(state.selectedLanguage);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);

  const onWord = (word: string, sentence: string, x: number, y: number) =>
    setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
  const onXp = (n: number) => dispatch({ type: "ADD_XP", payload: n });

  const askTutor = (p: PrayerSpec) => {
    tutor.prefill(
      `Teach me the ${p.title.toLowerCase()} (${p.reference}) in ${state.selectedLanguage}. Give me: (1) the official wording used in LDS sacrament meetings in that language, (2) phonetic pronunciation tips for a missionary following along, (3) the key gospel terms (sanctify, witness, remember, Spirit) translated and briefly explained. Source text:\n\n"${p.text}"`,
    );
    tutor.setOpen(true);
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/8 via-card/60 to-card/40">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/20 px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <Church className="h-3.5 w-3.5" />
            Sunday Services · Sacrament Prayers
          </div>
          <h2 className="mt-1 font-display text-xl text-foreground">
            Follow along at the sacrament table — in {state.selectedLanguage}.
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            The exact words spoken by the priest each Sunday, from{" "}
            <em>Doctrine and Covenants 20:77, 79</em> (also Moroni 4–5). Tap any word to translate
            it into your target language.
          </p>
        </div>
        <SpeedButton rate={rate} onCycle={cycleRate} size="md" />
      </header>

      <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
        {PRAYERS.map((p) => {
          const Icon = p.icon;
          const speakId = `sacrament-${p.id}`;
          const isSpeaking = speaking?.id === speakId;
          return (
            <article key={p.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                  <Icon className="h-3 w-3" />
                  {p.title}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {p.reference}
                </span>
              </div>
              <p className="font-display text-[13px] italic leading-relaxed text-foreground/90">
                <ClickableText text={p.text} onWordClick={onWord} />
                <button
                  type="button"
                  aria-label={`Read ${p.title} aloud`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(speakId, p.text, "English");
                  }}
                  className={`ml-1.5 inline-flex h-6 w-6 -translate-y-0.5 items-center justify-center rounded-full border border-gold/40 align-middle transition-colors ${
                    isSpeaking ? "bg-gold/25 text-gold" : "bg-gold/10 text-gold hover:bg-gold/20"
                  }`}
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => askTutor(p)}
                  className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/20"
                >
                  ✦ Teach me in {state.selectedLanguage}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {wordReq && <WordCard request={wordReq} onClose={() => setWordReq(null)} onXp={onXp} />}
    </section>
  );
}
