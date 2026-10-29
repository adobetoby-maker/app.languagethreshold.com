import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import { useLibrary } from "@/state/library-state";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import { gettingStartedReply } from "@/lib/site-guide";
import {
  canOfferSiteGuide,
  SITE_GUIDE_OFFER_DELAY,
  SITE_SETTINGS_EVENT,
} from "@/lib/site-guide-events";
import { ADD_WORD_EVENT } from "@/components/vocab/GlobalVocabCapture";

/** A single, non-modal offer. It never steals focus or interrupts an activity. */
export function TutorSiteGuide() {
  const { state } = useApp();
  const tutor = useTutor();
  const { selected } = useLibrary();
  const device = useLearnerDeviceStore("tutor-site-guide");
  const [visible, setVisible] = useState(false);
  const offered = useRef(false);
  const panelHandled = useRef(false);
  const search = typeof window === "undefined" ? "" : window.location.search;
  const params = new URLSearchParams(search);
  const panel = params.get("panel");
  const ready = state.hydrated && state.onboardingComplete && tutor.state.hydrated;
  useEffect(() => {
    if (!ready || panelHandled.current || !["settings", "add-word"].includes(panel ?? "")) return;
    panelHandled.current = true;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(panel === "settings" ? SITE_SETTINGS_EVENT : ADD_WORD_EVENT),
      );
      const url = new URL(window.location.href);
      url.searchParams.delete("panel");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [ready, panel]);
  const eligible = canOfferSiteGuide({
    hydrated: ready,
    onboardingComplete: state.onboardingComplete,
    tutorOpen: tutor.state.open,
    currentTab: state.currentTab,
    hasLessonLink: params.has("lesson") || Boolean(panel),
  });
  useEffect(() => {
    if (!eligible) setVisible(false);
    if (!eligible || offered.current) return;
    const saved = device.read();
    if (saved && typeof saved === "object" && "offeredAt" in saved) {
      offered.current = true;
      return;
    }
    let timer: number;
    const stop = () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", scheduleOffer, true);
      document.removeEventListener("keydown", scheduleOffer, true);
      document.removeEventListener("scroll", scheduleOffer, true);
    };
    function scheduleOffer() {
      if (offered.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (
          document.activeElement?.matches("input, textarea, [contenteditable=true]") ||
          document.querySelector('[role="dialog"], [aria-modal="true"]') ||
          [...document.querySelectorAll("audio,video")].some(
            (el) => !(el as HTMLMediaElement).paused,
          )
        )
          return;
        offered.current = true;
        stop();
        device.write({ offeredAt: Date.now() });
        setVisible(true);
      }, SITE_GUIDE_OFFER_DELAY);
    }
    // A short idle pause, rather than an interruption while the learner clicks, types or scrolls.
    document.addEventListener("pointerdown", scheduleOffer, { capture: true, passive: true });
    document.addEventListener("keydown", scheduleOffer, true);
    document.addEventListener("scroll", scheduleOffer, { capture: true, passive: true });
    scheduleOffer();
    return stop;
  }, [eligible, tutor.state.open, device]);
  if (!visible || !eligible) return null;
  return (
    <aside
      aria-label="Getting started help"
      data-testid="tutor-site-guide-offer"
      className="lt-tutor-guide-offer fixed right-4 z-[45] w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-gold/60 bg-card p-4 text-foreground shadow-luxe desktop:right-6"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-gold-ink" /> Need a hand getting started?
        </h2>
        <button
          type="button"
          aria-label="Dismiss getting-started help"
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell your tutor what you want to do. I can explain the tools and bring up the right link.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl bg-gold px-4 text-sm font-semibold text-midnight"
          onClick={() => {
            setVisible(false);
            tutor.addMessage(selected.id, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: gettingStartedReply({
                moduleId: state.activeModuleId,
                language: state.selectedLanguage,
                nativeLanguage: state.nativeLanguage,
                currentTab: state.currentTab,
              }),
              createdAt: Date.now(),
            });
            tutor.setOpen(true);
          }}
        >
          Help me get started
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-border px-3 text-sm"
          onClick={() => setVisible(false)}
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
