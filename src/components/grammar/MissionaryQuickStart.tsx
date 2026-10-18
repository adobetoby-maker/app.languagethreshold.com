import { useMemo, useState } from "react";
import {
  BookOpen,
  MapPin,
  Sparkles,
  ExternalLink,
  Languages,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import { useMissionarySpeech } from "@/components/missionary/useMissionarySpeech";
import { SpeedButton } from "@/components/missionary/SpeedButton";
import { MissionMap } from "@/components/missionary/MissionMap";
import { FamilyPackagePanel } from "@/components/missionary/FamilyPackagePanel";
import { SacramentPrayersPanel } from "@/components/missionary/SacramentPrayersPanel";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import {
  COMMITMENT_INVITATIONS,
  MISSIONARY_VOCAB,
  MISSION_AREAS,
  FREE_RESOURCES,
  getMissionArea,
  type CommitmentInvitation,
} from "@/data/missionary-content";

/**
 * Quick-start panel surfaced inside Grammar Studio when the LDS Missionary
 * module is active. Lets the missionary pick the mission they served / are
 * serving in (which tailors the AI tutor and the suggested phrases) and
 * launches commitment-invitation drills with one click.
 */
export function MissionaryQuickStart() {
  const { state, dispatch } = useApp();
  const tutor = useTutor();

  const [category, setCategory] = useState<CommitmentInvitation["category"] | "All">("All");
  const [showAreas, setShowAreas] = useState(false);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);

  const onWord = (word: string, sentence: string, x: number, y: number) => {
    setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
  };
  const onXp = (n: number) => dispatch({ type: "ADD_XP", payload: n });

  const {
    rate,
    cycleRate,
    speak: speakPhrase,
    speaking,
  } = useMissionarySpeech(JSON.stringify([category, state.selectedLanguage]));

  const assignedAreaId = state.moduleAssignments["lds-missionary"] ?? null;
  const area = getMissionArea(assignedAreaId);

  const filtered = useMemo(
    () =>
      category === "All"
        ? COMMITMENT_INVITATIONS
        : COMMITMENT_INVITATIONS.filter((i) => i.category === category),
    [category],
  );

  const categories: (CommitmentInvitation["category"] | "All")[] = [
    "All",
    "Restoration",
    "Plan of Salvation",
    "Gospel of Jesus Christ",
    "Commandments",
    "Ordinances",
    "Daily Practice",
  ];

  const groupedAreas = useMemo(() => {
    const groups: Record<string, typeof MISSION_AREAS> = {};
    for (const a of MISSION_AREAS) {
      (groups[a.region] ||= []).push(a);
    }
    return groups;
  }, []);

  const askTutor = (prompt: string) => {
    tutor.prefill(prompt);
    tutor.setOpen(true);
  };

  return (
    <div>
      <FamilyPackagePanel />
      <SacramentPrayersPanel />
      <div className="isolate">
        <MissionMap />
      </div>
      <section className="mb-6 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/8 via-card/60 to-card/40">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/20 px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Missionary Quick Start
            </div>
            <h2 className="mt-1 font-display text-xl text-foreground">
              Invite. Teach. Testify — in {state.selectedLanguage}.
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Curated commitment invitations and key vocabulary from <em>Preach My Gospel</em> and
              the General Handbook — both freely available from The Church of Jesus Christ of
              Latter-day Saints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SpeedButton rate={rate} onCycle={cycleRate} size="md" />
            <a
              href="https://www.churchofjesuschrist.org/study/manual/preach-my-gospel-2023"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground"
            >
              <BookOpen className="h-3 w-3" />
              Preach My Gospel
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </header>

        {/* Mission picker */}
        <div className="border-b border-gold/15 px-5 py-4">
          <button
            onClick={() => setShowAreas((s) => !s)}
            className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left transition-colors hover:border-gold/50"
          >
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-gold" strokeWidth={1.6} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Where will you serve / did you serve?
                </div>
                <div className="mt-0.5 font-display text-base italic text-foreground">
                  {area ? area.name : "Choose your mission area"}
                </div>
                {area && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Languages className="h-3 w-3" />
                    <span>{area.languages.join(" · ")}</span>
                    <span className="opacity-60">— {area.cultureNote}</span>
                  </div>
                )}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showAreas ? "rotate-180" : ""
              }`}
            />
          </button>

          {showAreas && (
            <div className="mt-3 grid gap-3 rounded-xl border border-border/40 bg-background/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groupedAreas).map(([region, areas]) => (
                <div key={region}>
                  <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-gold/70">
                    {region}
                  </div>
                  <ul className="space-y-1">
                    {areas.map((a) => {
                      const active = a.id === assignedAreaId;
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => {
                              dispatch({
                                type: "SET_MODULE_ASSIGNMENT",
                                payload: {
                                  moduleId: "lds-missionary",
                                  assignmentId: active ? null : a.id,
                                },
                              });
                              setShowAreas(false);
                            }}
                            className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                              active
                                ? "bg-gold/15 text-gold"
                                : "text-foreground/80 hover:bg-card/60 hover:text-foreground"
                            }`}
                          >
                            <span className={active ? "" : "opacity-60 mr-1.5"}>
                              {active ? "◈" : "·"}
                            </span>
                            {a.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 px-5 pt-4">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Commitment invitations */}
        <div className="grid gap-3 px-5 py-4">
          {filtered.map((inv) => (
            <article
              key={inv.id}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/50 p-4 transition-colors hover:border-gold/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                  {inv.category}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {inv.reference}
                </span>
              </div>
              <p className="mt-2 font-display text-base italic leading-snug text-foreground">
                “
                {speaking && speaking.id === inv.id ? (
                  <SpokenText
                    text={inv.prompt}
                    activeIndex={speaking.index}
                    fading={speaking.fading}
                  />
                ) : (
                  <ClickableText text={inv.prompt} onWordClick={onWord} />
                )}
                ”
                <button
                  type="button"
                  aria-label={`Read aloud in ${state.selectedLanguage}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speakPhrase(inv.id, inv.prompt, state.selectedLanguage);
                  }}
                  className="ml-1.5 inline-flex h-6 w-6 -translate-y-0.5 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold align-middle transition-colors hover:bg-gold/20"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <ClickableText text={inv.context} onWordClick={onWord} />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    askTutor(
                      `Translate this missionary commitment invitation into ${state.selectedLanguage} the way a native missionary would actually say it. Then break it into 3 short practice sentences I can drill, give pronunciation tips${
                        area ? ` for the ${area.name} mission area` : ""
                      }, and one cultural note.\n\n"${inv.prompt}"`,
                    )
                  }
                  className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/20"
                >
                  ✦ Teach me in {state.selectedLanguage}
                </button>
                <button
                  onClick={() =>
                    askTutor(
                      `Roleplay: I'm a missionary${
                        area ? ` serving in ${area.name}` : ""
                      } and you are an investigator I'm meeting with. Respond naturally in ${state.selectedLanguage} (with English in parentheses) when I extend this invitation: "${inv.prompt}". Stay in character.`,
                    )
                  }
                  className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
                >
                  Roleplay with tutor
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Vocabulary tiles */}
        <div className="border-t border-gold/15 px-5 py-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Key Vocabulary
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MISSIONARY_VOCAB.map((v) => (
              <div
                key={v.category}
                className="rounded-xl border border-border/60 bg-background/50 p-3"
              >
                <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
                  <span aria-hidden>{v.emoji}</span>
                  {v.category}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.words.map((w) => (
                    <button
                      key={w}
                      onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onWord(w, w, r.left + r.width / 2, r.bottom);
                      }}
                      className="rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-foreground"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Free resources */}
        <div className="border-t border-gold/15 bg-background/30 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/80">
              Free study resources:
            </span>
            {FREE_RESOURCES.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                title={r.note}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2.5 py-1 transition-colors hover:border-gold/50 hover:text-foreground"
              >
                {r.label}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ))}
          </div>
        </div>
      </section>
      {wordReq && <WordCard request={wordReq} onClose={() => setWordReq(null)} onXp={onXp} />}
    </div>
  );
}

/**
 * Renders a phrase split into word tokens, highlighting the currently spoken
 * word with a subtle gold underline + glow. When `fading` is true, the entire
 * highlight smoothly fades out as speech ends.
 */
function SpokenText({
  text,
  activeIndex,
  fading,
}: {
  text: string;
  activeIndex: number;
  fading: boolean;
}) {
  const tokens = text.split(/(\s+)/);
  let wordIdx = -1;
  return (
    <span>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
        wordIdx += 1;
        const isActive = wordIdx === activeIndex;
        return (
          <span
            key={i}
            className={`transition-all duration-300 ${
              isActive && !fading
                ? "text-gold [text-shadow:0_0_12px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                : ""
            } ${fading ? "opacity-90" : ""}`}
            style={
              isActive
                ? {
                    borderBottom: "1px solid color-mix(in oklab, var(--gold) 70%, transparent)",
                    opacity: fading ? 0 : 1,
                    transition:
                      "opacity 400ms ease, border-color 400ms ease, text-shadow 400ms ease",
                  }
                : undefined
            }
          >
            {tok}
          </span>
        );
      })}
    </span>
  );
}
