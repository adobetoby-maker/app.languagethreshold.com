import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";

/** Local preview only. The recording remains in its owned memory store. */
export function LocalExamTakeAudio({ blob }: { blob: Blob }) {
  const { user } = useAuth();
  const actor = user?.id ?? null;
  const [source, setSource] = useState<{ actor: string | null; blob: Blob; url: string } | null>(
    null,
  );
  const element = useRef<HTMLAudioElement | null>(null);
  const attach = useCallback((next: HTMLAudioElement | null) => {
    const previous = element.current;
    if (previous && previous !== next) {
      previous.pause();
      previous.removeAttribute("src");
      previous.load();
    }
    element.current = next;
  }, []);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSource({ actor, blob, url });
    return () => URL.revokeObjectURL(url);
  }, [actor, blob]);
  const url = source?.actor === actor && source.blob === blob ? source.url : undefined;
  return (
    <audio
      key={url ?? "pending"}
      ref={attach}
      className="max-w-full"
      aria-label="Listen to your unsaved answer"
      controls
      preload="metadata"
      src={url}
    />
  );
}
