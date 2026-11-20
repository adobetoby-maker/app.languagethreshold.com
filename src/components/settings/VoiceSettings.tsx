import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useSpeech } from "@/state/speech-state";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { useSiteVoice } from "@/hooks/use-site-voice";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { DEVICE_DEFAULT_VOICE } from "@/data/mobile-voice";
import { encodeGoogleVoicePreference, MISSION_TTS_SPEEDS } from "@/data/mission-tts";
import {
  DEFAULT_STANDARD_VOICES,
  standardGoogleVoice,
  type ListeningAudioSource,
} from "@/data/standard-voices";
import {
  hdListeningSupported,
  listeningIssueCopy,
  listeningNowUsing,
  listeningStatus,
} from "@/lib/listening-audio";

const SAMPLES: Record<string, string> = {
  es: "Hola. Vamos a practicar juntos. Escucha con calma y repite cuando estés listo.",
  en: "Hello. Let's practice together. Listen carefully and repeat when you are ready.",
  fr: "Bonjour. Écoutez et répétez à votre rythme.",
  de: "Hallo. Hören Sie zu und wiederholen Sie in Ihrem Tempo.",
  it: "Ciao. Ascolta e ripeti con calma.",
  pt: "Olá. Ouça e repita com calma.",
  ja: "こんにちは。よく聞いて、ゆっくり繰り返してください。",
  ko: "안녕하세요. 잘 듣고 천천히 따라 하세요.",
};

export function VoiceSettings() {
  const {
    voiceSettings = DEFAULT_STANDARD_VOICES,
    setVoiceSettings,
    accent,
    accentsForLanguage,
    setAccent,
    rate,
    setRate,
    stop,
    listening,
    listeningPlan,
  } = useSpeech();
  const { state } = useApp();
  const { session } = useAuth();
  const { googleVoices, googleReady, mounted } = useSiteVoice();
  const scope = JSON.stringify([accent, voiceSettings, rate]);
  const preview = useOwnedPlayback(scope);
  const [error, setError] = useState("");
  const cloud = Boolean(session && googleReady);
  const hdSupported = hdListeningSupported(accent);
  const listen = standardGoogleVoice(googleVoices, accent, voiceSettings.listeningGender);
  const speaking = standardGoogleVoice(googleVoices, accent, voiceSettings.speakingGender);
  const sample = SAMPLES[accent.split("-")[0]] ?? "Hello";
  const deviceError =
    "The voice could not play. Check your connection and audio output, then try again.";
  /** Plays what lessons play. With the HD voice chosen, a device voice never stands in. */
  function testListening() {
    setError("");
    stop();
    const plan = listeningPlan(accent);
    // Signed in or not: while HD is the choice, the test plays HD audio or says why it cannot.
    const hdOnly = plan.mode !== "device";
    // The voice for the gender shown as selected right now, straight from the voice list.
    const voiceURI =
      hdOnly && cloud && listen ? encodeGoogleVoicePreference(listen) : plan.voiceURI;
    preview.speak(sample, accent, voiceURI, rate, {
      cloudOnly: hdOnly,
      recordedGender: plan.recordedGender ?? undefined,
      unavailableReason: plan.pending ?? undefined,
      onerror: (reason) => {
        const copy = listeningIssueCopy(reason ?? "unavailable");
        setError(hdOnly ? `${copy.title}. ${copy.description}` : deviceError);
      },
    });
  }
  function testSpeaking() {
    setError("");
    stop();
    const device = voiceSettings.speakingAudioSource === "device";
    const hd = cloud && speaking && !device;
    preview.speak(
      sample,
      accent,
      hd ? encodeGoogleVoicePreference(speaking) : DEVICE_DEFAULT_VOICE,
      rate,
      {
        // Conversation replies never fall back to a device voice, so neither does their test.
        cloudOnly: Boolean(hd),
        onerror: (reason) => {
          const copy = listeningIssueCopy(reason ?? "unavailable");
          setError(hd ? `${copy.title}. ${copy.description}` : deviceError);
        },
      },
    );
  }
  // What is in effect, so a device voice is never shown as the HD choice.
  const listeningSource: ListeningAudioSource = listening.mode === "device" ? "device" : "hd";
  const selectClass =
    "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground";
  return (
    <section
      aria-label="Voice settings"
      data-testid="voice-settings"
      className="space-y-4 rounded-xl border border-border bg-card p-4 text-foreground"
    >
      <div>
        <h3 className="text-lg font-semibold">Voices & audio</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          HD voices are the standard, and Female is selected by default. Change voices here; lessons
          keep these choices.
        </p>
      </div>
      <p
        role="status"
        className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed"
      >
        {listeningStatus({
          mounted,
          signedIn: Boolean(session),
          cloudReady: googleReady,
          hdSupported,
          language: state.selectedLanguage,
        })}
      </p>
      {(
        [
          [
            "listeningGender",
            "Listening voice",
            "Reader, word definitions, cards, matching, verb forms, games and listening activities.",
          ],
          [
            "speakingGender",
            "Speaking partner voice",
            "Conversation practice and mission replies. The partner’s self-reference follows this choice. Your microphone and recognition language are unchanged.",
          ],
        ] as const
      ).map(([key, label, description]) => (
        <fieldset key={key}>
          <legend className="text-sm font-semibold">{label}</legend>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {key === "listeningGender" && (
            <>
              <div
                role="group"
                aria-label="Listening audio"
                data-testid="listening-audio-source"
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {(
                  [
                    ["hd", "HD voice", "Recommended"],
                    ["device", "Device voice", "Works offline"],
                  ] as const
                ).map(([source, name, note]) => (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={listeningSource === source}
                    disabled={source === "hd" && !hdSupported}
                    onClick={() => {
                      preview.stop();
                      setError("");
                      setVoiceSettings({ listeningAudioSource: source });
                    }}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${listeningSource === source ? "border-gold bg-gold text-midnight" : "border-border bg-background text-foreground hover:border-gold"}`}
                  >
                    <span>{name}</span> <span className="text-xs font-medium">{note}</span>
                  </button>
                ))}
              </div>
              <p
                data-testid="listening-now-using"
                className="mt-2 text-sm leading-relaxed text-foreground"
              >
                {listeningNowUsing(listening, voiceSettings.listeningGender)}
              </p>
            </>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["woman", "man"] as const).map((gender) => (
              <button
                key={gender}
                type="button"
                aria-pressed={voiceSettings[key] === gender}
                onClick={() => {
                  preview.stop();
                  setError("");
                  setVoiceSettings({ [key]: gender });
                }}
                className={`min-h-11 rounded-lg border-2 px-3 text-sm font-semibold ${voiceSettings[key] === gender ? "border-gold bg-gold text-midnight" : "border-border bg-background text-foreground hover:border-gold"}`}
              >
                {gender === "woman" ? "Female" : "Male"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={key === "speakingGender" ? testSpeaking : testListening}
            disabled={
              key === "speakingGender" &&
              (voiceSettings.speakingAudioSource === "text" ||
                (voiceSettings.speakingAudioSource === "google" && (!cloud || !speaking)))
            }
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Test {key === "listeningGender" ? "listening" : "speaking"} voice
          </button>
        </fieldset>
      ))}
      <label className="grid gap-1 text-sm font-semibold">
        Accent & microphone language
        <select
          aria-label="Accent and microphone language"
          className={selectClass}
          value={accent}
          onChange={(e) => {
            stop();
            preview.stop();
            setAccent(e.target.value);
          }}
        >
          {accentsForLanguage.map((a) => (
            <option key={a.code} value={a.code}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm leading-relaxed text-muted-foreground">
        The microphone uses your selected accent. If an exact regional voice is unavailable,
        playback uses the closest supported accent.{" "}
        {listen?.languageCodes[0] && listen.languageCodes[0] !== accent
          ? `Listening audio currently uses ${listen.languageCodes[0]}.`
          : ""}{" "}
        {speaking?.languageCodes[0] && speaking.languageCodes[0] !== accent
          ? `Speaking audio currently uses ${speaking.languageCodes[0]}.`
          : ""}
      </p>
      <label className="grid gap-1 text-sm font-semibold">
        Playback speed
        <select
          aria-label="Voice playback speed"
          className={selectClass}
          value={rate}
          onChange={(e) => {
            stop();
            preview.stop();
            setRate(Number(e.target.value));
          }}
        >
          {MISSION_TTS_SPEEDS.map((n) => (
            <option key={n} value={n}>
              {n}×{n === 1 ? " · Natural" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        Speed applies to both listening and speaking playback.
      </p>
      <label className="grid gap-1 text-sm font-semibold">
        Speaking audio
        <select
          aria-label="Speaking audio"
          className={selectClass}
          value={voiceSettings.speakingAudioSource}
          onChange={(e) =>
            setVoiceSettings({
              speakingAudioSource: e.target.value as "google" | "device" | "text",
            })
          }
        >
          <option value="google">HD voice · Standard</option>
          <option value="device">Device voice · Offline fallback</option>
          <option value="text">Text only · No spoken replies</option>
        </select>
      </label>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Saved for this learner and language on this device. Prerecorded clips, videos and existing
        audio files keep their original voices. A device voice cannot guarantee the selected male or
        female voice.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
