import { useRef, useState } from "react";
import { examAudioRequest } from "@/lib/assessments/client";
import type { AssessmentAnswer, PublicAssessmentItem } from "@/lib/assessments/form";
import { ACCENTS_BY_LANGUAGE } from "@/state/speech-state";
import type { Language } from "@/data/languages";
import { getVoicesForLocale } from "@/lib/voices";
import { speakRemote } from "@/lib/tts";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
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
  const { key, capture } = usePracticeLifecycle(JSON.stringify([attemptId, item.id]));
  const [playback, setPlayback] = useState({
    key,
    playing: false,
    heard: answer?.listeningHeard === true,
    error: "",
  });
  const { playing, heard, error } =
    playback.key === key
      ? playback
      : {
          playing: false,
          heard: answer?.listeningHeard === true,
          error: "",
        };
  const pending = useRef<AbortController | null>(null);
  const play = async () => {
    const lease = capture();
    if (!lease.isCurrent() || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setPlayback({ key, playing: true, heard, error: "" });
    let clip: HTMLAudioElement | null = null;
    let clipUrl: string | null = null;
    const releaseClip = () => {
      if (clip) {
        clip.onended = null;
        clip.onerror = null;
        clip.pause();
        clip.removeAttribute("src");
        clip.load();
        clip = null;
      }
      if (clipUrl) URL.revokeObjectURL(clipUrl);
      clipUrl = null;
    };
    const release = lease.own(() => {
      controller.abort();
      releaseClip();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && pending.current === controller;
    let settled = false;
    const finish = (success: boolean, message = "") => {
      if (settled || !current()) return;
      settled = true;
      release();
      releaseClip();
      pending.current = null;
      setPlayback({ key, playing: false, heard: heard || success, error: message });
    };
    const unavailable = "Audio did not finish. Try again or mark this input not assessed.";
    try {
      const audio = await examAudioRequest(
        `/api/exams?action=listening&attempt=${encodeURIComponent(attemptId)}&item=${encodeURIComponent(item.id)}`,
        controller.signal,
      );
      if (!current()) return;
      if (audio.mode === "private_clip") {
        clipUrl = URL.createObjectURL(audio.blob);
        clip = new Audio(clipUrl);
        clip.onended = () => finish(true);
        clip.onerror = () =>
          finish(false, "The clip could not play. Try again or mark this input not assessed.");
        await clip.play();
        return;
      }
      const locale = ACCENTS_BY_LANGUAGE[audio.language as Language]?.[0]?.code;
      const voice = locale ? getVoicesForLocale(locale)[0] : undefined;
      if (!voice)
        throw new Error(
          "A voice for this language is unavailable on this device. This input can stay not assessed.",
        );
      await speakRemote(audio.text, locale!, {
        voiceURI: voice.voiceURI,
        rate: 0.9,
        deviceOnly: true,
        signal: controller.signal,
        onend: () => finish(true),
        onerror: () => finish(false, unavailable),
      });
      // Another surface can replace native speech without a success/error callback.
      if (current() && !settled) finish(false, unavailable);
    } catch (err) {
      finish(false, err instanceof Error ? err.message : "Listening playback unavailable.");
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
              onChange={() => {
                if (heard && capture().isCurrent()) {
                  onAnswer({ inputMethod: "choice", choiceId: option.id, listeningHeard: true });
                }
              }}
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
