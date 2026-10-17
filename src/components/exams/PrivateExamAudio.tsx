import { useEffect, useRef, useState } from "react";
import { examAudioRequest, ExamRequestError } from "@/lib/assessments/client";
type Playback = { abort: AbortController; audio?: HTMLAudioElement; url?: string };

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
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const playback = useRef<Playback | null>(null);
  useEffect(
    () => () => {
      const current = playback.current;
      current?.abort.abort();
      current?.audio?.pause();
      if (current?.url) URL.revokeObjectURL(current.url);
      playback.current = null;
    },
    [path],
  );
  const stop = () => {
    const current = playback.current;
    playback.current = null;
    current?.abort.abort();
    current?.audio?.pause();
    if (current?.url) URL.revokeObjectURL(current.url);
    setPlaying(false);
  };
  const play = async () => {
    if (playback.current) return;
    const current: Playback = { abort: new AbortController() };
    playback.current = current;
    setPlaying(true);
    setError("");
    const finish = (message = "") => {
      if (playback.current !== current) return;
      current.audio?.pause();
      if (current.url) URL.revokeObjectURL(current.url);
      playback.current = null;
      setPlaying(false);
      setError(message);
    };
    try {
      const input = await examAudioRequest(path, current.abort.signal);
      if (playback.current !== current) return;
      if (input.mode !== "private_clip")
        throw new Error("This review requires a versioned audio clip.");
      current.url = URL.createObjectURL(input.blob);
      current.audio = new Audio(current.url);
      current.audio.onended = () => {
        if (playback.current !== current) return;
        finish();
        onEnded?.();
      };
      current.audio.onerror = () =>
        finish("This device could not play the clip. Record that issue in your review.");
      await current.audio.play();
    } catch (err) {
      if (playback.current !== current) return;
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
