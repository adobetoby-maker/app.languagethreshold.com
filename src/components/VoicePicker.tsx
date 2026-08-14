import { useEffect, useMemo, useState } from "react";
import { AudioLines, ChevronDown, Cloud, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  decodeGoogleVoicePreference,
  encodeGoogleVoicePreference,
  googleVoicesForLocale,
  type GoogleTtsVoice,
} from "@/data/mission-tts";
import { getMissionTtsCapabilities, speakMissionTts, stopMissionTts } from "@/lib/mission-tts";
import { getVoicesForLocale, pickVoice, subscribeVoices } from "@/lib/voices";
import { useAuth } from "@/state/auth-state";
import { useSpeech } from "@/state/speech-state";

const SAMPLES: Record<string, string> = {
  es: "Hola, ¿cómo estás?",
  fr: "Bonjour, comment ça va ?",
  de: "Hallo, wie geht es dir?",
  it: "Ciao, come stai?",
  ja: "こんにちは、お元気ですか。",
  ko: "안녕하세요, 어떻게 지내세요?",
  pt: "Olá, como vai?",
  ps: "سلام، تاسو څنګه یاست؟",
  en: "Hello, how are you?",
};

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const { accent, rate, voiceURI, setVoiceURI } = useSpeech();
  const { session } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [googleVoices, setGoogleVoices] = useState<GoogleTtsVoice[]>([]);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDeviceVoices(getVoicesForLocale(accent));
    return subscribeVoices(() => setDeviceVoices(getVoicesForLocale(accent)));
  }, [accent]);

  useEffect(() => {
    const controller = new AbortController();
    getMissionTtsCapabilities(accent, controller.signal)
      .then((capabilities) => {
        setGoogleReady(capabilities.ready);
        setGoogleVoices(googleVoicesForLocale(capabilities.voices, accent));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGoogleReady(false);
        setGoogleVoices([]);
      });
    return () => controller.abort();
  }, [accent]);

  const googlePreference = decodeGoogleVoicePreference(voiceURI);
  const activeDevice = googlePreference ? null : pickVoice(accent, voiceURI);
  const activeGoogle = useMemo(
    () => googleVoices.find((voice) => voice.name === googlePreference?.voiceName) ?? null,
    [googlePreference?.voiceName, googleVoices],
  );
  const family = accent.split("-")[0].toLowerCase();
  const sample = SAMPLES[family] ?? "Hello";

  if (!mounted || (deviceVoices.length === 0 && googleVoices.length === 0)) return null;

  const previewDevice = (voice: SpeechSynthesisVoice) => {
    stopMissionTts();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sample);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const previewGoogle = async (voice: GoogleTtsVoice) => {
    const languageCode = voice.languageCodes[0];
    if (!languageCode) return;
    try {
      await speakMissionTts({
        text: sample,
        voiceName: voice.name,
        languageCode,
        speakingRate: rate,
        usage: "learning",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google voice preview failed.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          compact
            ? "inline-flex items-center justify-center rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold focus:outline-none"
            : "group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
        aria-label={compact ? "Choose site voice" : undefined}
        title={activeGoogle?.label ?? activeDevice?.name ?? "Choose voice"}
      >
        <AudioLines
          className={`h-3.5 w-3.5 ${googlePreference ? "text-gold" : "text-muted-foreground"}`}
          strokeWidth={1.8}
        />
        {!compact && <span className="hidden sm:inline">Voice</span>}
        {!compact && (
          <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={compact ? "top" : "bottom"}
        className="max-h-[70vh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto border-border/70 bg-popover/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Voice for {accent}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => {
            stopMissionTts();
            window.speechSynthesis?.cancel();
            setVoiceURI(null);
          }}
          className="font-mono text-xs"
        >
          <span className={voiceURI === null ? "text-gold" : "opacity-60"}>◈</span>
          <span className="flex-1">System default</span>
        </DropdownMenuItem>

        {googleVoices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              <Cloud className="h-3.5 w-3.5" /> Google Cloud · {googleVoices.length} voices
            </DropdownMenuLabel>
            {!session && (
              <div className="px-2 pb-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                Sign in to use server voices. Device voices remain available without an account.
              </div>
            )}
            {googleVoices.map((voice) => {
              const selected = activeGoogle?.name === voice.name;
              const languageCode = voice.languageCodes[0] ?? accent;
              return (
                <DropdownMenuItem
                  key={voice.name}
                  disabled={!session || !googleReady}
                  onSelect={(event) => {
                    event.preventDefault();
                    setVoiceURI(encodeGoogleVoicePreference(voice));
                    void previewGoogle(voice);
                  }}
                  className="flex items-start gap-2 font-mono text-xs"
                >
                  <span className={selected ? "text-gold" : "opacity-60"}>◈</span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="leading-tight">{voice.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {languageCode} · {voice.name}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {deviceVoices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> This device · {deviceVoices.length} voices
            </DropdownMenuLabel>
            {deviceVoices.map((voice) => {
              const selected = activeDevice?.voiceURI === voice.voiceURI;
              return (
                <DropdownMenuItem
                  key={voice.voiceURI}
                  onSelect={(event) => {
                    event.preventDefault();
                    setVoiceURI(voice.voiceURI);
                    previewDevice(voice);
                  }}
                  className="flex items-start gap-2 font-mono text-xs"
                >
                  <span className={selected ? "text-gold" : "opacity-60"}>◈</span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="leading-tight">{voice.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {voice.lang}
                      {voice.localService ? <span className="ml-2">offline</span> : null}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Your choice follows Reader, Cards, Listening, Games, Speak, and specialty practice. Google
          receives only text selected for playback, never microphone audio.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
