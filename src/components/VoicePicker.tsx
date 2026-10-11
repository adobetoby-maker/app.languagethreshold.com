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

const SPANISH_REGION_NAMES: Record<string, string> = {
  "es-CR": "Costa Rica",
  "es-MX": "México",
  "es-GT": "Guatemala",
  "es-CO": "Colombia",
  "es-PE": "Perú",
  "es-CL": "Chile",
  "es-AR": "Argentina",
  "es-419": "Latin America",
  "es-US": "US Spanish",
  "es-ES": "Spain",
};

function voiceRegion(locale: string): string {
  return SPANISH_REGION_NAMES[locale] ?? locale;
}

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const { accent, setAccent, accentsForLanguage, rate, voiceURI, setVoiceURI } = useSpeech();
  const { session } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [googleVoices, setGoogleVoices] = useState<GoogleTtsVoice[]>([]);
  const [googleReady, setGoogleReady] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [showAllVoices, setShowAllVoices] = useState(false);

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
  const normalizedSearch = voiceSearch.trim().toLocaleLowerCase();
  const visibleGoogleVoices = useMemo(
    () =>
      normalizedSearch
        ? googleVoices.filter((voice) =>
            `${voice.label} ${voice.name} ${voice.languageCodes.join(" ")}`
              .toLocaleLowerCase()
              .includes(normalizedSearch),
          )
        : googleVoices,
    [googleVoices, normalizedSearch],
  );
  const visibleDeviceVoices = useMemo(
    () =>
      normalizedSearch
        ? deviceVoices.filter((voice) =>
            `${voice.name} ${voice.lang}`.toLocaleLowerCase().includes(normalizedSearch),
          )
        : deviceVoices,
    [deviceVoices, normalizedSearch],
  );
  const shownGoogleVoices =
    normalizedSearch || showAllVoices ? visibleGoogleVoices : visibleGoogleVoices.slice(0, 6);
  const shownDeviceVoices =
    normalizedSearch || showAllVoices ? visibleDeviceVoices : visibleDeviceVoices.slice(0, 8);
  const preferredDevice = pickVoice(accent, null);
  const accentLabel = accentsForLanguage.find((option) => option.code === accent)?.label ?? accent;
  const actualVoiceLocale = activeGoogle?.languageCodes[0] ?? activeDevice?.lang ?? null;

  if (!mounted) return null;

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
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setVoiceSearch("");
          setShowAllVoices(false);
        }
      }}
    >
      <DropdownMenuTrigger
        className={
          compact
            ? "inline-flex items-center justify-center rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 text-foreground/80 transition-colors hover:border-gold/50 hover:text-gold focus:outline-none"
            : "group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
        aria-label={compact ? "Choose site voice" : undefined}
        title={`${accentLabel} · ${activeGoogle?.label ?? activeDevice?.name ?? "Choose voice"}`}
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
          Accent and voice
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <label
            htmlFor="site-voice-accent"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {family === "es" ? "Spanish accent / region" : "Accent / region"}
          </label>
          <select
            id="site-voice-accent"
            value={accent}
            onChange={(event) => {
              setAccent(event.target.value);
              setVoiceSearch("");
            }}
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-gold/60 focus:outline-none"
          >
            {accentsForLanguage.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {actualVoiceLocale && actualVoiceLocale.toLowerCase() !== accent.toLowerCase() && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Playback uses {voiceRegion(actualVoiceLocale)} ({actualVoiceLocale}). Exact {accent}{" "}
              voices are shown when available.
            </p>
          )}
        </div>
        <div className="px-2 pb-2">
          <input
            type="search"
            value={voiceSearch}
            onChange={(event) => setVoiceSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={`Search ${googleVoices.length + deviceVoices.length} voices`}
            aria-label="Search voices"
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/60"
          />
        </div>
        <DropdownMenuItem
          onSelect={() => {
            stopMissionTts();
            window.speechSynthesis?.cancel();
            setVoiceURI(null);
          }}
          className="font-mono text-xs"
        >
          <span className={voiceURI === null ? "text-gold" : "opacity-60"}>◈</span>
          <span className="flex-1">Best available for {accentLabel}</span>
        </DropdownMenuItem>
        {preferredDevice && voiceURI === null && (
          <div className="px-2 pb-1 text-[11px] text-muted-foreground">
            Current device voice: {preferredDevice.name} · {voiceRegion(preferredDevice.lang)}
          </div>
        )}

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
            {shownGoogleVoices.map((voice) => {
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
                      {voiceRegion(languageCode)} ({languageCode}) · {voice.name}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
            {visibleGoogleVoices.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No Google voice matches “{voiceSearch}”.
              </div>
            )}
            {!normalizedSearch && visibleGoogleVoices.length > shownGoogleVoices.length && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setShowAllVoices(true);
                }}
                className="w-full px-3 py-2 text-left font-mono text-[11px] text-gold hover:bg-accent"
              >
                Show all {googleVoices.length} Google voices
              </button>
            )}
          </>
        )}

        {deviceVoices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> This device · {deviceVoices.length} voices
            </DropdownMenuLabel>
            {shownDeviceVoices.map((voice) => {
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
                      {voiceRegion(voice.lang)} ({voice.lang})
                      {voice.localService ? <span className="ml-2">offline</span> : null}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
            {!normalizedSearch && visibleDeviceVoices.length > shownDeviceVoices.length && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setShowAllVoices(true);
                }}
                className="w-full px-3 py-2 text-left font-mono text-[11px] text-gold hover:bg-accent"
              >
                Show all {deviceVoices.length} device voices
              </button>
            )}
          </>
        )}

        {deviceVoices.length === 0 && googleVoices.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No voices are available in this browser yet. The accent choice will apply when voices
            load.
          </div>
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
