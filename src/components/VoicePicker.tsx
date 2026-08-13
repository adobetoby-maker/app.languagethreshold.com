import { useEffect, useState } from "react";
import { ChevronDown, AudioLines } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpeech } from "@/state/speech-state";
import { getVoicesForLocale, subscribeVoices, pickVoice } from "@/lib/voices";

export function VoicePicker() {
  const { accent, rate, voiceURI, setVoiceURI } = useSpeech();
  const [mounted, setMounted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setMounted(true);
    setVoices(getVoicesForLocale(accent));
    return subscribeVoices(() => setVoices(getVoicesForLocale(accent)));
  }, [accent]);

  const active = pickVoice(accent, voiceURI);
  const isGoogle = active?.name.includes("Google") ?? false;

  // Avoid SSR/CSR mismatch — speechSynthesis only exists in the browser.
  if (!mounted || voices.length === 0) return null;

  // Sample sentence per locale for the preview
  const SAMPLES: Record<string, string> = {
    es: "Hola, ¿cómo estás?",
    fr: "Bonjour, comment ça va?",
    de: "Hallo, wie geht es dir?",
    it: "Ciao, come stai?",
    ja: "こんにちは、お元気ですか?",
    pt: "Olá, como vai?",
  };
  const family = accent.split("-")[0].toLowerCase();
  const sample = SAMPLES[family] ?? "Hello";

  const preview = (v: SpeechSynthesisVoice) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sample);
    u.voice = v;
    u.lang = v.lang;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Choose voice"
      >
        <AudioLines
          className={`h-3.5 w-3.5 ${isGoogle ? "text-gold" : "text-muted-foreground"}`}
          strokeWidth={1.8}
        />
        <span className="hidden sm:inline">Voice</span>
        <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[60vh] w-[320px] overflow-y-auto border-border/70 bg-popover/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          ✦ Voice for {accent}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setVoiceURI(null)} className="font-mono text-xs">
          <span className={voiceURI === null ? "text-gold" : "opacity-60"}>◈</span>
          <span className="flex-1">System default</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {voices.map((v) => {
          const selected = active?.voiceURI === v.voiceURI;
          const google = v.name.includes("Google");
          return (
            <DropdownMenuItem
              key={v.voiceURI}
              onSelect={(e) => {
                e.preventDefault();
                setVoiceURI(v.voiceURI);
                preview(v);
              }}
              className="flex items-start gap-2 font-mono text-xs"
            >
              <span className={selected ? "text-gold" : "opacity-60"}>◈</span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="leading-tight">{v.name}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {v.lang}
                  {google && <span className="ml-2 text-gold">Google</span>}
                  {v.localService && <span className="ml-2">offline</span>}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Tip: For higher-quality "Google" voices, use Chrome or Edge while online.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
