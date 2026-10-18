import { useRef, useState } from "react";
import { examAudioRequest, ExamRequestError } from "@/lib/assessments/client";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
type Playback = { abort: AbortController; dispose: () => void };

/** Each replay reauthorizes. Blobs live in memory only and are revoked on completion/unmount. */
export function PrivateExamAudio({
  path,
  onAccessLost,
  label = "Play attached listening clip",
  onEnded,
}: {
  path: string;
  onAccessLost: () => void;
  label?: string;
  onEnded?: () => void;
}) {
  const { actor, key, capture } = usePracticeLifecycle(path);
  const [state, setState] = useState({ key, playing: false, error: "" });
  const { playing, error } = state.key === key ? state : { playing: false, error: "" };
  const playback = useRef<Playback | null>(null);
  const stop = () => {
    if (!capture().isCurrent()) return;
    playback.current?.dispose();
    setState({ key, playing: false, error: "" });
  };
  const play = async () => {
    const lease = capture();
    if (!actor || !lease.isCurrent() || playback.current) return;
    let audio: HTMLAudioElement | undefined, url: string | undefined;
    let release = () => {};
    const current: Playback = {
      abort: new AbortController(),
      dispose: () => {
        release();
        current.abort.abort();
        if (audio) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          audio = undefined;
        }
        if (url) URL.revokeObjectURL(url);
        url = undefined;
        if (playback.current === current) playback.current = null;
      },
    };
    playback.current = current;
    release = lease.own(current.dispose);
    const isCurrent = () =>
      lease.isCurrent() && playback.current === current && !current.abort.signal.aborted;
    setState({ key, playing: true, error: "" });
    const finish = (message = "") => {
      if (!isCurrent()) return false;
      current.dispose();
      setState({ key, playing: false, error: message });
      return true;
    };
    try {
      const input = await examAudioRequest(path, current.abort.signal, {
        userId: actor,
        isCurrent,
      });
      if (!isCurrent()) return;
      if (input.mode !== "private_clip")
        throw new Error("This review requires a versioned audio clip.");
      url = URL.createObjectURL(input.blob);
      audio = new Audio(url);
      audio.onended = () => {
        if (finish()) onEnded?.();
      };
      audio.onerror = () =>
        finish("This device could not play the clip. Record that issue in your review.");
      await audio.play();
    } catch (err) {
      if (!isCurrent()) return;
      finish(err instanceof Error ? err.message : "The clip is unavailable.");
      if (err instanceof ExamRequestError && [401, 403].includes(err.status)) onAccessLost();
    }
  };
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50"
        onClick={() => (playing ? stop() : void play())}
      >
        {playing ? "Stop playback" : label}
      </button>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
