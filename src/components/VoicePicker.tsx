import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, AudioLines, ChevronDown, Cloud, Smartphone, X } from "lucide-react";
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
  type GoogleTtsVoice,
} from "@/data/mission-tts";
import {
  DEVICE_DEFAULT_VOICE,
  preferredMobileCloudVoice,
  shouldAutoSelectMobileVoice,
} from "@/data/mobile-voice";
import { speakMissionTts } from "@/lib/mission-tts";
import { isIosDevice } from "@/lib/pwa-install";
import { pickVoice } from "@/lib/voices";
import { useAuth } from "@/state/auth-state";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { useSiteVoice } from "@/hooks/use-site-voice";
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

export function VoicePicker({
  compact = false,
  showLabel = false,
}: {
  compact?: boolean;
  showLabel?: boolean;
}) {
  const { accent, setAccent, accentsForLanguage, rate, voiceURI, setVoiceURI, settingsHydrated } =
    useSpeech();
  const { session, user, isCurrentUser } = useAuth();
  const previewRef = useRef<AbortController | null>(null);
  const { speak: speakDevice, stop: stopDevice } = useOwnedPlayback(JSON.stringify([accent, rate]));
  const previewScope = JSON.stringify([accent, user?.id]);
  const mountedPreviewScope = useRef<string | null>(null);
  useEffect(() => {
    mountedPreviewScope.current = previewScope;
    return () => {
      mountedPreviewScope.current = null;
      previewRef.current?.abort();
      previewRef.current = null;
    };
  }, [previewScope]);
  const { mounted, deviceVoices, googleVoices, googleReady, label: voiceLabel } = useSiteVoice();
  const [voiceSearch, setVoiceSearch] = useState("");
  const [showAllVoices, setShowAllVoices] = useState(false);
  const ios =
    mounted && isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

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
  const mobileCloudVoice = useMemo(
    () => preferredMobileCloudVoice(googleVoices, accent),
    [googleVoices, accent],
  );
  const showMobileDeviceWarning = ios && !googlePreference;

  useEffect(() => {
    if (
      shouldAutoSelectMobileVoice({
        ios,
        signedIn: Boolean(session),
        providerReady: googleReady,
        settingsHydrated,
        preference: voiceURI,
      }) &&
      mobileCloudVoice
    ) {
      setVoiceURI(encodeGoogleVoicePreference(mobileCloudVoice));
    }
  }, [ios, session, googleReady, settingsHydrated, voiceURI, mobileCloudVoice, setVoiceURI]);

  if (!mounted) return null;

  const previewDevice = (voice: SpeechSynthesisVoice) => {
    previewRef.current?.abort();
    previewRef.current = null;
    speakDevice(sample, voice.lang, voice.voiceURI, rate);
  };

  const previewGoogle = async (voice: GoogleTtsVoice) => {
    if (mountedPreviewScope.current !== previewScope || !user || !isCurrentUser(user.id)) return;
    const languageCode = voice.languageCodes[0];
    if (!languageCode) return;
    previewRef.current?.abort();
    const controller = new AbortController();
    previewRef.current = controller;
    stopDevice();
    try {
      await speakMissionTts({
        text: sample,
        voiceName: voice.name,
        languageCode,
        speakingRate: rate,
        usage: "learning",
        signal: controller.signal,
        owner: {
          userId: user.id,
          isCurrent: () =>
            mountedPreviewScope.current === previewScope &&
            previewRef.current === controller &&
            isCurrentUser(user.id),
        },
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        !isCurrentUser(user.id) ||
        (error instanceof DOMException && error.name === "AbortError")
      )
        return;
      toast.error(error instanceof Error ? error.message : "Google voice preview failed.");
    } finally {
      if (previewRef.current === controller) previewRef.current = null;
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          previewRef.current?.abort();
          previewRef.current = null;
          stopDevice();
          setVoiceSearch("");
          setShowAllVoices(false);
        }
      }}
    >
      <DropdownMenuTrigger
        data-testid="site-voice-button"
        className={
          compact
            ? "relative inline-flex min-h-11 min-w-11 max-w-[4.5rem] cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border/60 bg-card/50 px-2 py-2.5 font-mono text-[10px] uppercase tracking-normal sm:gap-1.5 sm:px-3 sm:tracking-[0.12em] text-foreground/80 transition-colors duration-200 hover:border-gold/50 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:focus-visible:ring-gold before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-[''] sm:max-w-[15rem]"
            : "group inline-flex max-w-[17rem] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all duration-200 hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:focus-visible:ring-gold"
        }
        aria-label={
          voiceLabel
            ? `${voiceLabel.aria}${showMobileDeviceWarning ? ". iPhone device voice quality may vary" : ""}`
            : showMobileDeviceWarning
              ? "Choose site voice; iPhone device voice quality may vary"
              : "Choose site voice"
        }
        title={`${accentLabel} · ${voiceLabel?.long ?? "Choose voice"}${actualVoiceLocale ? ` (${actualVoiceLocale})` : ""}`}
      >
        <AudioLines
          className={`h-3.5 w-3.5 shrink-0 ${googlePreference ? "text-gold-ink" : "text-muted-foreground"}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        {showMobileDeviceWarning && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        )}
        {voiceLabel ? (
          <span
            data-testid="site-voice-label"
            className={
              compact
                ? showLabel
                  ? "absolute right-0 top-full mt-1 w-max max-w-[180px] truncate text-[10px] leading-tight tracking-normal text-muted-foreground"
                  : "sr-only"
                : "min-w-0 truncate text-gold-ink"
            }
          >
            <span className="hidden sm:inline">{voiceLabel.long}</span>
            {/* Phone strip: the module chip beside this one needs the width, so the
                region code drops (it stays in the aria-label and title). */}
            <span className="sm:hidden">{compact ? voiceLabel.name : voiceLabel.short}</span>
          </span>
        ) : (
          (!compact || showLabel) && (
            <span
              className={
                compact
                  ? "absolute right-0 top-full mt-1 text-[10px] leading-tight text-muted-foreground"
                  : "hidden sm:inline"
              }
            >
              {showLabel ? "Choose voice" : "Voice"}
            </span>
          )
        )}
        {!compact && (
          <ChevronDown
            className="h-3 w-3 shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={compact ? "top" : "bottom"}
        className="max-h-[70vh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto border-border/70 bg-popover/95 backdrop-blur-xl"
      >
        <div className="sticky -top-1 z-10 flex items-center justify-between border-b border-border bg-popover px-2 pb-2 pt-1">
          <DropdownMenuLabel className="text-sm font-semibold text-foreground">
            Accent and voice
          </DropdownMenuLabel>
          <DropdownMenuItem
            aria-label="Close voice selection"
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DropdownMenuItem>
        </div>
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
            previewRef.current?.abort();
            previewRef.current = null;
            stopDevice();
            setVoiceURI(DEVICE_DEFAULT_VOICE);
          }}
          className="font-mono text-xs"
        >
          <span
            className={
              voiceURI === null || voiceURI === DEVICE_DEFAULT_VOICE ? "text-gold" : "opacity-60"
            }
          >
            ◈
          </span>
          <span className="flex-1">Best device voice for {accentLabel}</span>
        </DropdownMenuItem>
        {preferredDevice && (voiceURI === null || voiceURI === DEVICE_DEFAULT_VOICE) && (
          <div className="px-2 pb-1 text-[11px] text-muted-foreground">
            Current device voice: {preferredDevice.name} · {voiceRegion(preferredDevice.lang)}
          </div>
        )}

        {showMobileDeviceWarning && (
          <div
            role="note"
            className="mx-2 my-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-foreground"
          >
            <p className="font-semibold">iPhone voice quality can vary.</p>
            <p className="mt-1 text-muted-foreground">
              This selection uses a voice installed on your phone. Preview it below before practice.
            </p>
            {session && googleReady && mobileCloudVoice ? (
              <button
                type="button"
                onClick={() => {
                  setVoiceURI(encodeGoogleVoicePreference(mobileCloudVoice));
                  void previewGoogle(mobileCloudVoice);
                }}
                className="mt-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 font-semibold text-gold"
              >
                Use clearer cloud voice · {voiceRegion(mobileCloudVoice.languageCodes[0] ?? accent)}
              </button>
            ) : !session ? (
              <p className="mt-2 text-muted-foreground">
                Sign in to use a clear cloud voice when available.
              </p>
            ) : null}
            <p className="mt-2 text-muted-foreground">
              For an offline option, open iPhone Settings → Accessibility → Read &amp; Speak →
              Voices → Spanish. Download an Enhanced voice over Wi-Fi if offered, then reopen this
              page and preview it.
            </p>
            <a
              href="https://support.apple.com/guide/iphone/iph96b214f0/ios"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-gold underline underline-offset-2"
            >
              Apple voice instructions
            </a>
            <p className="mt-2 text-muted-foreground">
              You can also try Chrome if Safari playback sounds poor. It may still use the same
              iPhone voices.
            </p>
            <a
              href="https://apps.apple.com/us/app/google-chrome/id535886823"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-gold underline underline-offset-2"
            >
              Get Chrome for iPhone
            </a>
          </div>
        )}
        {ios && googlePreference && (
          <div className="mx-2 my-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            A cloud voice is selected for clearer iPhone playback. It needs internet and sends only
            the text you play to Google.
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
