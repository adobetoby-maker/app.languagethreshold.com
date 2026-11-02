import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useSpeech } from "@/state/speech-state";
import { useAuth } from "@/state/auth-state";
import { useSiteVoice } from "@/hooks/use-site-voice";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { DEVICE_DEFAULT_VOICE } from "@/data/mobile-voice";
import {
  encodeGoogleVoicePreference,
  MISSION_TTS_SPEEDS,
  type MissionPartnerVersion,
} from "@/data/mission-tts";
import { DEFAULT_STANDARD_VOICES, standardGoogleVoice } from "@/data/standard-voices";

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
  } = useSpeech();
  const { session } = useAuth();
  const { googleVoices, googleReady, mounted } = useSiteVoice();
  const scope = JSON.stringify([accent, voiceSettings, rate]);
  const preview = useOwnedPlayback(scope);
  const [error, setError] = useState("");
  const cloud = Boolean(session && googleReady);
  const listen = standardGoogleVoice(googleVoices, accent, voiceSettings.listeningGender);
  const speaking = standardGoogleVoice(googleVoices, accent, voiceSettings.speakingGender);
  function testVoice(gender: MissionPartnerVersion, speakingPreview = false) {
    setError("");
    stop();
    const voice = standardGoogleVoice(googleVoices, accent, gender);
    const device = speakingPreview && voiceSettings.speakingAudioSource === "device";
    preview.speak(
      SAMPLES[accent.split("-")[0]] ?? "Hello",
      accent,
      cloud && voice && !device ? encodeGoogleVoicePreference(voice) : DEVICE_DEFAULT_VOICE,
      rate,
      {
        onerror: () =>
          setError(
            "The voice could not play. Check your connection and audio output, then try again.",
          ),
      },
    );
  }
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
          Clear Google voices are the standard. Female is selected by default. Change voices here;
          lessons keep these choices.
        </p>
      </div>
      <p
        role="status"
        className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed"
      >
        {!mounted
          ? "Checking audio…"
          : !session
            ? "Sign in to hear the standard Google voices. Until then, listening and voice tests use this device’s voice, which may sound different."
            : !googleReady
              ? "Google audio is temporarily unavailable. Listening uses a device voice when possible; choose Device voice under Speaking audio for conversation playback."
              : "Google voices are ready. Internet access is required for new Google audio; supported cached listening clips can replay offline."}
      </p>
      {(
        [
          [
            "listeningGender",
            "Listening voice",
            "Reader, word definitions, cards, games and listening activities.",
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
            onClick={() => testVoice(voiceSettings[key], key === "speakingGender")}
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
          <option value="google">Google voice · Standard</option>
          <option value="device">Device voice · Offline fallback</option>
          <option value="text">Text only · No spoken replies</option>
        </select>
      </label>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Saved for this learner and language on this device. Prerecorded clips, videos and existing
        audio files keep their original voices. Device fallback cannot guarantee the selected male
        or female voice.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
