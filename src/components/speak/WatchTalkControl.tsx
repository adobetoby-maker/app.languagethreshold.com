import { useEffect, useRef, useState } from "react";
import { WatchTalk, watchTalkAvailable } from "@/lib/watch-talk";
import { claimWatchTranscript } from "@/lib/watch-talk-protocol";

/** Mounted only inside a started, consented mission; key by the practice lifecycle. */
export function WatchTalkControl({
  locale,
  title,
  ready,
  onTurn,
}: {
  locale: string;
  title: string;
  ready: boolean;
  onTurn: (text: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const [connecting, setConnecting] = useState(false);
  const contextId = useRef(crypto.randomUUID());
  const received = useRef(new Set<string>());
  const current = useRef({ ready, onTurn });
  current.current = { ready, onTurn };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (watchTalkAvailable()) void WatchTalk.stop().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const listeners: Array<{ remove(): Promise<void> }> = [];
    const listen = async () => {
      const transcript = await WatchTalk.addListener("transcript", (event) => {
        if (disposed || document.visibilityState !== "visible" || !current.current.ready) return;
        const text = claimWatchTranscript(event, contextId.current, Date.now(), received.current);
        if (text === null) return;
        setNotice("Watch turn received. Your reply plays on this iPhone.");
        current.current.onTurn(text);
        void WatchTalk.acknowledge({ requestId: event.requestId, state: "received" }).catch(
          () => {},
        );
      });
      if (disposed) {
        await transcript.remove();
        return;
      }
      listeners.push(transcript);
      const failure = await WatchTalk.addListener("failure", (event) => {
        if (!disposed) setNotice(event.message);
      });
      if (disposed) await failure.remove();
      else listeners.push(failure);
      if (!disposed) publish();
    };
    const publish = () => {
      if (document.visibilityState !== "visible") {
        setEnabled(false);
        return;
      }
      void WatchTalk.setContext({
        contextId: contextId.current,
        locale,
        title: title.slice(0, 100),
        ready: current.current.ready && document.visibilityState === "visible",
        expiresAt: Date.now() + 45000,
      }).catch(() => {
        if (!disposed) setNotice("Watch connection unavailable. Turn it off and reconnect.");
      });
    };
    void listen().catch(() => {
      if (!disposed) setNotice("Could not connect to your Watch.");
    });
    const timer = window.setInterval(publish, 10000);
    document.addEventListener("visibilitychange", publish);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", publish);
      for (const listener of listeners) void listener.remove();
      void WatchTalk.stop().catch(() => {});
    };
  }, [enabled, locale, title]);
  useEffect(() => {
    if (enabled)
      void WatchTalk.setContext({
        contextId: contextId.current,
        locale,
        title: title.slice(0, 100),
        ready: ready && document.visibilityState === "visible",
        expiresAt: Date.now() + 45000,
      }).catch(() => {});
  }, [enabled, ready, locale, title]);
  if (!watchTalkAvailable()) return null;
  return (
    <section
      aria-label="Apple Watch push to talk"
      className="mt-4 rounded-2xl border border-border p-4"
    >
      <h3 className="font-semibold">Apple Watch microphone</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap Talk on your Watch, then Stop & send (up to 30 seconds). Keep this mission open on your
        iPhone; replies play here. Quick response sends the transcript automatically; Review mode
        lets you approve it first.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your iPhone transcribes on-device. Temporary audio is removed after processing. The normal
        speaking consent and AI access checks apply.
      </p>
      <button
        type="button"
        disabled={connecting}
        aria-pressed={enabled}
        className="mt-3 min-h-11 rounded-xl border border-gold/40 px-4 text-sm disabled:opacity-50"
        onClick={async () => {
          if (enabled) {
            setEnabled(false);
            setNotice("");
            return;
          }
          setConnecting(true);
          try {
            const result = await WatchTalk.start();
            if (!mounted.current) {
              await WatchTalk.stop();
              return;
            }
            if (!result.paired || !result.installed) {
              await WatchTalk.stop();
              setNotice(
                "Pair your Apple Watch and install Language Threshold on it, then try again.",
              );
            } else {
              setEnabled(true);
              setNotice("Connected. Tap Talk on your Watch when your partner finishes.");
            }
          } catch (error) {
            if (mounted.current)
              setNotice(
                error instanceof Error ? error.message : "Could not enable Watch microphone.",
              );
          } finally {
            if (mounted.current) setConnecting(false);
          }
        }}
      >
        {connecting
          ? "Connecting…"
          : enabled
            ? "Turn off Watch microphone"
            : "Enable Watch microphone"}
      </button>
      {enabled && (
        <p className="mt-2 text-sm">
          {ready
            ? "Ready for your Watch turn."
            : "Wait for your partner, or finish the current turn."}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </section>
  );
}
