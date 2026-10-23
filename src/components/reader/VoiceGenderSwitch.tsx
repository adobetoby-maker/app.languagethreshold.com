// Built by TAC — 2026-10-22
// One-tap woman/man voice switch beside the Reader play controls. Hearing more
// than one voice trains the ear; the full voice list stays in the top-bar picker.

import { useEffect, useRef } from "react";
import {
  formatVoiceLabel,
  genderSwitchState,
  type VoiceGender,
  type VoiceIdentity,
} from "@/data/voice-identity";
import { useSiteVoice } from "@/hooks/use-site-voice";
import { useSpeech } from "@/state/speech-state";

function WomanFigure() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="4.2" r="2.4" />
      <path d="M9.6 7.6h4.8l3.2 8.6h-3.1V22h-1.8v-5.8h-1.4V22H9.5v-5.8H6.4z" />
    </svg>
  );
}

function ManFigure() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="4.2" r="2.4" />
      <path d="M8.6 7.6h6.8a1.6 1.6 0 0 1 1.6 1.6v6.2h-2.1V22h-2.1v-6.6h-1.6V22H9.1v-6.6H7V9.2a1.6 1.6 0 0 1 1.6-1.6z" />
    </svg>
  );
}

const SIDES: { gender: VoiceGender; noun: string; Icon: () => React.JSX.Element }[] = [
  { gender: "woman", noun: "Woman's voice", Icon: WomanFigure },
  { gender: "man", noun: "Man's voice", Icon: ManFigure },
];

export function VoiceGenderSwitch({
  className = "",
  label = "Reader voice",
  showUnavailable = false,
}: {
  className?: string;
  label?: string;
  showUnavailable?: boolean;
}) {
  const { playing, current: playback, setVoiceURI, stop, speakSentence, voiceURI } = useSpeech();
  const { mounted, candidates, current } = useSiteVoice();
  const pendingReplay = useRef<{ text: string; index: number } | null>(null);

  // Replay the interrupted sentence once the new voice is live in speech state.
  useEffect(() => {
    const replay = pendingReplay.current;
    if (!replay) return;
    pendingReplay.current = null;
    speakSentence(replay.text, replay.index);
  }, [voiceURI, speakSentence]);

  if (!mounted) return null;
  const state = genderSwitchState(candidates, current);
  if (!state.woman && !state.man && !showUnavailable) return null;

  const choose = (voice: VoiceIdentity | null, gender: VoiceGender) => {
    if (!voice || state.selected === gender || voice.id === voiceURI) return;
    if (playing && playback && playback.sentenceIndex >= 0) {
      pendingReplay.current = { text: playback.text, index: playback.sentenceIndex };
    }
    stop();
    setVoiceURI(voice.id);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center overflow-hidden rounded-full border border-border/70 bg-background/40 ${className}`}
    >
      {SIDES.map(({ gender, noun, Icon }) => {
        const voice = state[gender];
        const pressed = state.selected === gender;
        const label = voice ? formatVoiceLabel(voice) : null;
        const unavailable = `No ${gender === "woman" ? "woman's" : "man's"} voice for this language yet`;
        return (
          <button
            key={gender}
            type="button"
            data-testid={`voice-switch-${gender}`}
            aria-pressed={pressed}
            aria-disabled={!voice || undefined}
            aria-label={
              label ? `${noun} — ${label.name}, ${label.accent}` : `${noun} — ${unavailable}`
            }
            title={label ? `${noun}: ${label.long}` : unavailable}
            onClick={() => choose(voice, gender)}
            className={`relative inline-flex h-8 min-w-11 items-center justify-center transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground dark:focus-visible:ring-gold sm:h-7 sm:min-w-9 sm:before:hidden ${
              pressed
                ? "bg-gold text-midnight"
                : voice
                  ? "cursor-pointer text-muted-foreground hover:bg-gold/10 hover:text-gold-ink"
                  : "cursor-not-allowed text-muted-foreground opacity-40"
            }`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
