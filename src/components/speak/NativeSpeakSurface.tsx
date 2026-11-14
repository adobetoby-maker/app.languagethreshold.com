import { type ReactNode, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Ellipsis, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

/** Matches the owner's native speaking reference; existing web state owns every action. */
export function NativeSpeakSurface({
  language,
  transcript,
  partner,
  controls,
  composer,
  microphone,
  status,
  onReset,
  onScenarios,
  onPartnerStart,
  partnerStartDisabled,
  partnerTitle,
}: {
  lesson: string;
  language: string;
  transcript: ReactNode;
  partner: ReactNode;
  controls: ReactNode;
  composer: ReactNode;
  microphone: ReactNode;
  voice: boolean;
  onVoice: () => void;
  status: string;
  onLatest: () => void;
  onReset: () => void;
  onScenarios: () => void;
  onPartnerStart: () => void;
  partnerStartDisabled: boolean;
  partnerTitle: string;
}) {
  const [viewportHeight, setViewportHeight] = useState<number>();
  useEffect(() => {
    const measure = () => setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
    measure();
    window.visualViewport?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    return () => {
      window.visualViewport?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const partnerTrigger = useRef<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState(false);
  const [partners, setPartners] = useState(false);
  return (
    <section
      inert={!ready}
      data-compact={viewportHeight !== undefined && viewportHeight < 450}
      style={{ height: viewportHeight ?? "100dvh" }}
      className="lt-native-speak"
      aria-label="Free conversation practice"
    >
      <header className="lt-native-speak-header">
        <button
          aria-label="Back to Study"
          onClick={() => window.dispatchEvent(new Event("lt:v6-open-study"))}
        >
          <ArrowLeft size={24} />
        </button>
        <h1>Speak</h1>
        <button
          aria-label="Speaking menu"
          onClick={(event) => {
            menuTrigger.current = event.currentTarget;
            setMenu(true);
          }}
        >
          <Ellipsis size={26} />
        </button>
      </header>
      <div className="lt-native-setup">
        <button
          ref={partnerTrigger}
          className="lt-native-partner"
          onClick={() => setPartners(true)}
        >
          <GraduationCap size={23} />
          {partnerTitle}
        </button>
        <button
          className="lt-native-topic"
          onClick={(event) => {
            menuTrigger.current = event.currentTarget;
            setMenu(true);
          }}
        >
          Open conversation <ChevronDown size={14} aria-hidden />
        </button>
        <p>Your role: a language learner.</p>
        <p>Changing partner starts a new conversation.</p>
        <button
          className="lt-native-opening"
          disabled={partnerStartDisabled}
          onClick={onPartnerStart}
        >
          Let partner start
        </button>
      </div>
      {transcript}
      <div role="group" className="lt-native-reply-dock" aria-label={`${language} reply controls`}>
        {composer}
        {microphone}
        <p className="lt-native-status" role="status">
          {status === "Ready" ? "" : status}
        </p>
        {controls}
      </div>
      <Sheet open={partners} onOpenChange={setPartners}>
        <SheetContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            partnerTrigger.current?.focus();
          }}
          side="bottom"
          scrollBody
          className="max-h-[85dvh] rounded-t-3xl"
        >
          <SheetTitle>Choose speaking partner</SheetTitle>
          <SheetDescription>
            The current partner is ready. Changing partner starts a new conversation.
          </SheetDescription>
          {partner}
          <button className="lt-v6-primary mt-4 w-full" onClick={() => setPartners(false)}>
            Done
          </button>
        </SheetContent>
      </Sheet>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuTrigger.current?.focus();
          }}
          side="bottom"
          scrollBody
          className="max-h-[85dvh] space-y-4 rounded-t-3xl"
        >
          <SheetTitle>Speaking options</SheetTitle>
          <SheetDescription>
            Your defaults are ready. Change these whenever you want.
          </SheetDescription>
          <button
            className="min-h-11 w-full text-left"
            onClick={() => {
              setMenu(false);
              setPartners(true);
            }}
          >
            Choose speaking partner
          </button>
          <button
            className="min-h-11 w-full text-left"
            onClick={() => {
              onReset();
              setMenu(false);
            }}
          >
            Reset conversation
          </button>
          <button
            className="min-h-11 w-full text-left"
            onClick={() => {
              onScenarios();
              setMenu(false);
            }}
          >
            Scenario missions
          </button>
          <button
            className="min-h-11 w-full text-left"
            onClick={() => {
              setMenu(false);
              window.dispatchEvent(new Event("lt:lesson-workspace-navigation"));
            }}
          >
            Courses, account & settings
          </button>
        </SheetContent>
      </Sheet>
    </section>
  );
}
