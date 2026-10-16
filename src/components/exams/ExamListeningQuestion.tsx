import { useEffect, useRef, useState } from "react";
import { examAudioRequest } from "@/lib/assessments/client";
import type { AssessmentAnswer, PublicAssessmentItem } from "@/lib/assessments/form";
import { ACCENTS_BY_LANGUAGE } from "@/state/speech-state";
import type { Language } from "@/data/languages";
import { getVoicesForLocale } from "@/lib/voices";
export function ExamListeningQuestion({
  attemptId,
  item,
  answer,
  onAnswer,
}: {
  attemptId: string;
  item: PublicAssessmentItem;
  answer?: AssessmentAnswer;
  onAnswer: (answer: AssessmentAnswer) => void;
}) {
  const [playing, setPlaying] = useState(false),
    [heard, setHeard] = useState(answer?.listeningHeard === true),
    [error, setError] = useState("");
  const mounted = useRef(true);
  const clip = useRef<HTMLAudioElement | null>(null),
    clipUrl = useRef<string | null>(null),
    pending = useRef<AbortController | null>(null);
  const releaseClip = () => {
    clip.current?.pause();
    clip.current = null;
    if (clipUrl.current) URL.revokeObjectURL(clipUrl.current);
    clipUrl.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      releaseClip();
      window.speechSynthesis?.cancel();
    };
  }, []);
  const play = async () => {
    if (playing) return;
    setPlaying(true);
    setError("");
    try {
      pending.current = new AbortController();
      const audio = await examAudioRequest(
        `/api/exams?action=listening&attempt=${encodeURIComponent(attemptId)}&item=${encodeURIComponent(item.id)}`,
        pending.current.signal,
      );
      if (!mounted.current) return;
      if (audio.mode === "private_clip") {
        releaseClip();
        clipUrl.current = URL.createObjectURL(audio.blob);
        clip.current = new Audio(clipUrl.current);
        clip.current.onended = () => {
          releaseClip();
          if (mounted.current) {
            setHeard(true);
            setPlaying(false);
          }
        };
        clip.current.onerror = () => {
          releaseClip();
          if (mounted.current) {
            setPlaying(false);
            setError("The clip could not play. Try again or mark this input not assessed.");
          }
        };
        await clip.current.play();
        return;
      }
      if (!window.speechSynthesis) throw new Error("This device cannot play the listening clip.");
      const locale = ACCENTS_BY_LANGUAGE[audio.language as Language]?.[0]?.code;
      const voice = locale ? getVoicesForLocale(locale)[0] : undefined;
      if (!voice)
        throw new Error(
          "A voice for this language is unavailable on this device. This input can stay not assessed.",
        );
      const utterance = new SpeechSynthesisUtterance(audio.text);
      utterance.lang = locale!;
      utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.onend = () => {
        if (mounted.current) {
          setHeard(true);
          setPlaying(false);
        }
      };
      utterance.onerror = () => {
        if (mounted.current) {
          setPlaying(false);
          setError("Audio did not finish. Try again or mark this input not assessed.");
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      releaseClip();
      if (mounted.current) {
        setPlaying(false);
        setError(err instanceof Error ? err.message : "Listening playback unavailable.");
      }
    }
  };
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Play the complete message before answering. Official exams use the clip saved with this exam
        version; QA drafts may use this device’s voice. Playback requires a connection.
      </p>
      <button
        type="button"
        className="min-h-11 rounded-xl border border-gold/40 px-4 text-sm disabled:opacity-50"
        disabled={playing}
        onClick={() => void play()}
      >
        {playing ? "Playing…" : heard ? "Replay message" : "Play listening message"}
      </button>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <div className="grid gap-3">
        {item.options?.map((option) => (
          <label
            key={option.id}
            className="flex min-h-12 items-start gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <input
              type="radio"
              name={item.id}
              className="mt-1"
              disabled={!heard}
              checked={answer?.choiceId === option.id}
              onChange={() =>
                onAnswer({ inputMethod: "choice", choiceId: option.id, listeningHeard: true })
              }
            />
            {option.text}
          </label>
        ))}
      </div>
      {!heard && (
        <p className="text-xs">
          Play the message before choosing. If it cannot be heard, mark the input not assessed.
        </p>
      )}
    </div>
  );
}
