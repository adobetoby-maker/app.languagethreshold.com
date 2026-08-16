import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Lightbulb,
  Mic,
  RotateCcw,
  Search,
  Send,
  Square,
  X,
} from "lucide-react";
import {
  decodeGoogleVoicePreference,
  defaultGoogleVoice,
  encodeGoogleVoicePreference,
  isMissionTtsSpeed,
  MISSION_TTS_SPEEDS,
  recommendedGoogleVoices,
  type MissionPartnerVersion,
} from "@/data/mission-tts";
import type { CoreSpeakingSection } from "@/data/core-speaking";
import {
  getSpeakingMissions,
  getSpeakingModules,
  SPEAKING_LANGUAGES,
  type SpeakingMission,
  type SpeakingMissionLanguage,
} from "@/data/speaking-missions";
import {
  getMissionTtsCapabilities,
  speakMissionTts,
  stopMissionTts,
  type MissionTtsCapabilities,
} from "@/lib/mission-tts";
import { configureUtterance, pickVoice, subscribeVoices } from "@/lib/voices";
import {
  getSpeakingAgeAttestation,
  saveSpeakingAgeAttestation,
  speakingRequestHeaders,
} from "@/lib/speaking-client";
import { useAiGate } from "@/state/ai-gate-state";
import { useApp } from "@/state/app-state";
import { useSpeech } from "@/state/speech-state";
import { useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { NextTripBanner } from "@/components/travel/NextTripBanner";
import { getTravelDestination } from "@/data/travel-destinations";
import { consumeCoreSpeakingEntry } from "@/lib/speaking-navigation";
import { bestAvailableSpeechTranscript } from "@/lib/speaking-transcript";
import { LongPressWordText } from "./LongPressWordText";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { SpeakingConsentDialog } from "./SpeakingConsentDialog";

type MissionStatus = "ready" | "listening" | "thinking" | "complete" | "error";
type FeedbackLanguage = "Native language" | "Target language" | "Adaptive";
type CompletionReason = "learner" | "natural" | "limit";
type PartnerAudioSource = "device" | "google" | "text";
type SpokenTurnFlow = "quick" | "review";

interface ResponseTiming {
  replyReadyMs: number;
  voiceStartedMs?: number;
}

const CORE_SECTIONS: CoreSpeakingSection[] = [
  "Essential verbs",
  "Grammar patterns",
  "Daily living",
  "Relationships & intimacy",
];

interface MissionTurn {
  id: string;
  role: "learner" | "partner";
  text: string;
  opening?: boolean;
  feedback?: string[];
}

interface MissionTurnResponse {
  assistantText: string;
  deferredFeedback: string[];
  provisionalObjectiveIds: string[];
  shouldEnd: boolean;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEventLike = { error?: string };

function recognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function specialtyStyle(specialty: SpeakingMission["specialty"]) {
  const styles: Record<SpeakingMission["specialty"], { color: string }> = {
    Core: { color: "#f0c96a" },
    Faith: { color: "#c9a84c" },
    Medical: { color: "#4fb6d3" },
    Trades: { color: "#ff7a4a" },
    Service: { color: "#ba8cff" },
    Education: { color: "#7cb6ff" },
    Agriculture: { color: "#7fc66a" },
    Sports: { color: "#55c79f" },
    Travel: { color: "#e9a85d" },
    "English for Work": { color: "#77c7b7" },
  };
  return { label: specialty, ...styles[specialty] };
}

function missionTurnId() {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function partnerVoiceSample(
  language: SpeakingMissionLanguage,
  partnerVersion: MissionPartnerVersion,
) {
  if (language === "Italian") {
    return partnerVersion === "woman"
      ? "Ciao, sono la tua compagna di conversazione. Cominciamo?"
      : "Ciao, sono il tuo compagno di conversazione. Cominciamo?";
  }
  if (language === "Japanese") {
    return "こんにちは。会話練習のパートナーです。始めましょうか。";
  }
  if (language === "English") {
    return partnerVersion === "woman"
      ? "Hello, I'm your conversation partner. Shall we begin?"
      : "Hello, I'm your conversation partner. Shall we get started?";
  }
  return partnerVersion === "woman"
    ? "Hola, soy su compañera de práctica. ¿Empezamos?"
    : "Hola, soy su compañero de práctica. ¿Empezamos?";
}

function clarificationPhrase(language: SpeakingMissionLanguage) {
  if (language === "Spanish") {
    return "No entiendo todavía. ¿Puede repetir más despacio y darme un ejemplo?";
  }
  if (language === "Italian") {
    return "Non capisco ancora. Può ripetere più lentamente e farmi un esempio?";
  }
  if (language === "Japanese") {
    return "まだ分かりません。もう少しゆっくり、例を使って説明していただけますか。";
  }
  return "I don't understand yet. Could you repeat more slowly and give me an example?";
}

function highStakesNotice(mission: SpeakingMission) {
  if (mission.riskClass === "emergency") {
    return "Language practice only — this is not an emergency service. For real danger, contact local emergency services now.";
  }
  if (mission.specialty === "Medical" || mission.riskClass === "medical") {
    return "Language practice only — not medical advice, diagnosis, or dosing guidance. Contact a qualified clinician for real care.";
  }
  if (mission.riskClass === "financial") {
    return "Language practice only — not financial advice. Use fictional account and payment details.";
  }
  if (mission.riskClass === "legal") {
    return "Language practice only — not legal or immigration advice. Use fictional identifying details.";
  }
  if (mission.riskClass === "minor-data") {
    return "Use fictional child and family details only. Do not enter real school, pickup, or contact records.";
  }
  if (mission.riskClass === "intimacy") {
    return "Respectful communication practice only — no erotic roleplay. Use fictional details, honor consent and boundaries immediately, and ask a qualified clinician about personal sexual health.";
  }
  return null;
}

export function SpeakingMissionsPreview() {
  const { gated } = useAiGate();
  const { state: appState, dispatch: appDispatch } = useApp();
  const { accent, rate, setAccent, setRate, voiceURI, setVoiceURI } = useSpeech();
  const { session } = useAuth();
  const [selectedMission, setSelectedMission] = useState<SpeakingMission | null>(null);
  const [started, setStarted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageLoaded, setAgeLoaded] = useState(false);
  const [ageSaving, setAgeSaving] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [feedbackLanguage, setFeedbackLanguage] = useState<FeedbackLanguage>("Adaptive");
  const [spokenTurnFlow, setSpokenTurnFlow] = useState<SpokenTurnFlow>("quick");
  const [partnerVersion, setPartnerVersion] = useState<MissionPartnerVersion>("woman");
  const [partnerAudioSource, setPartnerAudioSource] = useState<PartnerAudioSource>("device");
  const [status, setStatus] = useState<MissionStatus>("ready");
  const [turns, setTurns] = useState<MissionTurn[]>([]);
  const [interim, setInterim] = useState("");
  const [objectiveIds, setObjectiveIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const [completionReason, setCompletionReason] = useState<CompletionReason | null>(null);
  const [ttsCapabilities, setTtsCapabilities] = useState<MissionTtsCapabilities | null>(null);
  const [ttsStatus, setTtsStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const [selectedGoogleVoiceName, setSelectedGoogleVoiceName] = useState<string | null>(null);
  const [deviceVoiceAvailable, setDeviceVoiceAvailable] = useState(false);
  const [catalogModuleId, setCatalogModuleId] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<SpeakingMission["specialty"] | "All">(
    "All",
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [coreSection, setCoreSection] = useState<CoreSpeakingSection>("Essential verbs");
  const [typedTurn, setTypedTurn] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"dictation" | "typed" | null>(null);
  const [partnerSpeaking, setPartnerSpeaking] = useState(false);
  const [skippedObjectiveIds, setSkippedObjectiveIds] = useState<string[]>([]);
  const [lastResponseTiming, setLastResponseTiming] = useState<ResponseTiming | null>(null);
  const [wordRequest, setWordRequest] = useState<WordCardRequest | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const viewTopRef = useRef<HTMLElement | null>(null);
  const previousViewKeyRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const practiceRecordedRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const finishDevicePlaybackRef = useRef<(() => void) | null>(null);
  const [coreEntryRequested] = useState(() => consumeCoreSpeakingEntry());
  const coreEntryRequestedRef = useRef(coreEntryRequested);
  const japaneseSpeakingReviewed = import.meta.env.VITE_JAPANESE_SPEAKING_REVIEWED === "true";
  const hasValidLanguagePair =
    appState.selectedLanguage !== "English" || appState.nativeLanguage !== "English";
  const missionLanguage =
    SPEAKING_LANGUAGES.some((entry) => entry.language === appState.selectedLanguage) &&
    (appState.selectedLanguage !== "Japanese" || japaneseSpeakingReviewed) &&
    hasValidLanguagePair
      ? (appState.selectedLanguage as SpeakingMissionLanguage)
      : null;
  // Japanese Core Speaking shows the same kanji readings the Reader and
  // Flashcards do — without them a learner meets bare kanji in the transcript
  // and the reference vocabulary with no way to sound it out.
  const showFurigana = missionLanguage === "Japanese";
  const tripPlan = missionLanguage ? appState.nextTrips[missionLanguage] : null;
  const tripDestination = getTravelDestination(tripPlan?.destinationId);
  const activeTravelDestination =
    tripDestination?.language === missionLanguage ? tripDestination : null;
  const languageModules = useMemo(
    () => (missionLanguage ? getSpeakingModules(missionLanguage, appState.nativeLanguage) : []),
    [appState.nativeLanguage, missionLanguage],
  );
  const languageMissions = useMemo(() => {
    if (!missionLanguage) return [];
    const availableModuleIds = new Set(languageModules.map((module) => module.id));
    return getSpeakingMissions(missionLanguage).filter((mission) =>
      availableModuleIds.has(mission.moduleId),
    );
  }, [languageModules, missionLanguage]);
  const missionLocale = activeTravelDestination?.ttsLocale ?? accent ?? selectedMission?.locale;
  const partnerSpeed = isMissionTtsSpeed(rate) ? rate : 1;
  const availableGoogleVoices = useMemo(
    () => recommendedGoogleVoices(ttsCapabilities?.voices ?? [], missionLocale, partnerVersion),
    [missionLocale, partnerVersion, ttsCapabilities?.voices],
  );
  const globalGooglePreference = decodeGoogleVoicePreference(voiceURI);
  const targetGoogleGender = partnerVersion === "woman" ? "FEMALE" : "MALE";
  const globalGoogleVoice = availableGoogleVoices.find(
    (voice) =>
      voice.name === globalGooglePreference?.voiceName &&
      (voice.ssmlGender === targetGoogleGender ||
        voice.ssmlGender === "NEUTRAL" ||
        voice.ssmlGender === "SSML_VOICE_GENDER_UNSPECIFIED"),
  );
  const selectedGoogleVoice = availableGoogleVoices.find(
    (voice) =>
      voice.name === selectedGoogleVoiceName &&
      (voice.ssmlGender === targetGoogleGender ||
        voice.ssmlGender === "NEUTRAL" ||
        voice.ssmlGender === "SSML_VOICE_GENDER_UNSPECIFIED"),
  );
  const partnerVoice =
    selectedGoogleVoice ??
    globalGoogleVoice ??
    defaultGoogleVoice(availableGoogleVoices, missionLocale, partnerVersion);
  const partnerAudioReady =
    partnerAudioSource === "device"
      ? deviceVoiceAvailable
      : partnerAudioSource === "text"
        ? true
        : ttsStatus === "ready" && partnerVoice !== null;
  const voiceRegionLabel = activeTravelDestination
    ? `${activeTravelDestination.flag} ${activeTravelDestination.country}`
    : missionLocale === "es-CR"
      ? "Neutral Costa Rica"
      : missionLocale === "en-US"
        ? "Neutral United States"
        : missionLocale;
  const practiceNotice = selectedMission ? highStakesNotice(selectedMission) : null;
  const catalogCategories = useMemo(
    () => [...new Set(languageModules.map((module) => module.category))],
    [languageModules],
  );
  const filteredCatalogModules = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase();
    return languageModules.filter(
      (module) =>
        (catalogCategory === "All" || module.category === catalogCategory) &&
        (!query ||
          `${module.name} ${module.category} ${module.blurb}`.toLocaleLowerCase().includes(query) ||
          languageMissions.some(
            (mission) =>
              mission.moduleId === module.id &&
              `${mission.title} ${mission.summary} ${mission.vocabulary.join(" ")}`
                .toLocaleLowerCase()
                .includes(query),
          )),
    );
  }, [catalogCategory, catalogSearch, languageMissions, languageModules]);
  const catalogModule = languageModules.find((module) => module.id === catalogModuleId) ?? null;
  const catalogMissions = catalogModule
    ? languageMissions.filter((mission) => mission.moduleId === catalogModule.id)
    : [];
  const visibleCatalogMissions =
    catalogModule?.id === "core-speaking"
      ? catalogMissions.filter((mission) => mission.coreSection === coreSection)
      : catalogMissions;

  useEffect(() => {
    setRecognitionSupported(recognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    if (!activeTravelDestination || accent === activeTravelDestination.ttsLocale) return;
    setAccent(activeTravelDestination.ttsLocale);
  }, [accent, activeTravelDestination, setAccent]);

  useEffect(() => {
    const refreshAvailability = () => {
      setDeviceVoiceAvailable(Boolean(pickVoice(missionLocale, voiceURI)));
    };
    refreshAvailability();
    return subscribeVoices(refreshAvailability);
  }, [missionLocale, voiceURI]);

  useEffect(() => {
    if (!session) {
      setAgeConfirmed(false);
      setAgeLoaded(true);
      return;
    }
    const controller = new AbortController();
    setAgeLoaded(false);
    getSpeakingAgeAttestation(controller.signal)
      .then((confirmed) => {
        setAgeConfirmed(confirmed);
        setAgeLoaded(true);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAgeConfirmed(false);
        setAgeLoaded(true);
        setErrorMessage("Speaking confirmation could not be loaded. Please try again.");
      });
    return () => controller.abort();
  }, [session]);

  useEffect(() => {
    const controller = new AbortController();
    setTtsStatus("checking");
    getMissionTtsCapabilities(missionLocale, controller.signal)
      .then((capabilities) => {
        setTtsCapabilities(capabilities);
        setTtsStatus(capabilities.ready ? "ready" : "unavailable");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTtsStatus("unavailable");
      });
    return () => controller.abort();
  }, [missionLocale]);

  useEffect(() => {
    setSelectedGoogleVoiceName(null);
  }, [missionLocale]);

  useEffect(() => {
    if (partnerAudioSource !== "google" || !partnerVoice) return;
    setVoiceURI(encodeGoogleVoicePreference(partnerVoice));
  }, [partnerAudioSource, partnerVoice, setVoiceURI]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, interim, status]);

  const stopAudio = useCallback(() => {
    playbackGenerationRef.current += 1;
    stopMissionTts();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    finishDevicePlaybackRef.current?.();
    finishDevicePlaybackRef.current = null;
    setPartnerSpeaking(false);
  }, []);

  const stopActiveWork = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
    stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    stopActiveWork();
    setWordRequest(null);
    setSelectedMission(null);
    setCatalogModuleId(coreEntryRequestedRef.current ? "core-speaking" : null);
    coreEntryRequestedRef.current = false;
    setCatalogCategory("All");
    setCatalogSearch("");
    setCoreSection("Essential verbs");
    setPartnerAudioSource("device");
  }, [appState.selectedLanguage, stopActiveWork]);

  useEffect(() => {
    if (started) return;
    setPartnerAudioSource(decodeGoogleVoicePreference(voiceURI) ? "google" : "device");
  }, [appState.selectedLanguage, started, voiceURI]);

  useEffect(() => {
    return () => stopActiveWork();
  }, [stopActiveWork]);

  useEffect(() => {
    const viewKey = !selectedMission
      ? `catalog:${catalogModuleId ?? "all"}`
      : !started
        ? `setup:${selectedMission.id}`
        : status === "complete"
          ? `recap:${selectedMission.id}`
          : `mission:${selectedMission.id}`;
    if (previousViewKeyRef.current === viewKey) return;
    previousViewKeyRef.current = viewKey;
    const frame = window.requestAnimationFrame(() => {
      viewTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalogModuleId, selectedMission, started, status]);

  useEffect(() => {
    if (!started || status === "complete" || sessionStartedAtRef.current === null) return;
    const elapsed = Date.now() - sessionStartedAtRef.current;
    const remaining = Math.max(0, 18 * 60 * 1000 - elapsed);
    const hardCap = window.setTimeout(() => {
      stopActiveWork();
      setCompletionReason("limit");
      setStatus("complete");
      setErrorMessage("This UX-preview mission reached its 18-minute limit.");
    }, remaining);
    return () => window.clearTimeout(hardCap);
  }, [started, status, stopActiveWork]);

  useEffect(() => {
    const stopOnBackground = () => {
      if (document.visibilityState !== "hidden" || !started || status === "complete") return;
      stopActiveWork();
      setInterim("");
      setStatus("error");
      setErrorMessage(
        "The mission paused when this tab moved to the background. Tap Resume to continue.",
      );
    };
    document.addEventListener("visibilitychange", stopOnBackground);
    return () => document.removeEventListener("visibilitychange", stopOnBackground);
  }, [started, status, stopActiveWork]);

  const speakPartnerText = useCallback(
    async (text: string, onPlaybackStart?: () => void) => {
      stopAudio();
      if (partnerAudioSource === "text") return;
      const playbackGeneration = ++playbackGenerationRef.current;
      setPartnerSpeaking(true);
      try {
        if (partnerAudioSource === "device") {
          if (typeof window === "undefined" || !window.speechSynthesis) {
            setErrorMessage("A device voice is unavailable in this browser.");
            return;
          }
          const utterance = new SpeechSynthesisUtterance(text);
          configureUtterance(utterance, missionLocale, voiceURI);
          utterance.rate = partnerSpeed;
          utterance.onstart = () => onPlaybackStart?.();
          await new Promise<void>((resolve, reject) => {
            const finish = () => {
              finishDevicePlaybackRef.current = null;
              resolve();
            };
            finishDevicePlaybackRef.current = finish;
            utterance.onend = finish;
            utterance.onerror = (event) => {
              finishDevicePlaybackRef.current = null;
              reject(new Error(event.error || "The device voice could not play."));
            };
            window.speechSynthesis.speak(utterance);
          });
          return;
        }
        if (ttsStatus !== "ready") {
          setErrorMessage("Google partner voices are unavailable for this deployment.");
          return;
        }
        if (!partnerVoice) {
          setErrorMessage(`No Google voice is available for ${missionLocale}.`);
          return;
        }
        await speakMissionTts({
          text,
          voiceName: partnerVoice.name,
          languageCode: partnerVoice.languageCodes[0] ?? missionLocale,
          speakingRate: partnerSpeed,
          usage: "mission",
          onPlaybackStart,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "Partner voice playback failed.");
      } finally {
        if (playbackGenerationRef.current === playbackGeneration) setPartnerSpeaking(false);
      }
    },
    [missionLocale, partnerAudioSource, partnerSpeed, partnerVoice, stopAudio, ttsStatus, voiceURI],
  );

  const startMissionSession = () => {
    if (!selectedMission || !partnerAudioReady) return;
    stopActiveWork();
    practiceRecordedRef.current = false;
    setWordRequest(null);
    const opening: MissionTurn = {
      id: missionTurnId(),
      role: "partner",
      text: selectedMission.openingLine,
      opening: true,
    };
    setTurns([opening]);
    setObjectiveIds([]);
    setSkippedObjectiveIds([]);
    setErrorMessage(null);
    setInterim("");
    setCompletionReason(null);
    setTypedTurn("");
    setTranscriptSource(null);
    setLastResponseTiming(null);
    setStatus("ready");
    sessionStartedAtRef.current = Date.now();
    setStarted(true);
    void speakPartnerText(opening.text);
  };

  const confirmAgeAndBegin = async () => {
    if (!session) {
      setConsentOpen(false);
      setAuthOpen(true);
      return;
    }
    setAgeSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveSpeakingAgeAttestation(true);
      if (!saved) throw new Error("Speaking confirmation was not saved.");
      setAgeConfirmed(true);
      setAgeLoaded(true);
      setConsentOpen(false);
      startMissionSession();
    } catch {
      setErrorMessage("The one-time speaking confirmation could not be saved. Please try again.");
    } finally {
      setAgeSaving(false);
    }
  };

  const requestMissionStart = () => {
    if (!selectedMission || !partnerAudioReady || ageSaving) return;
    if (!session) {
      setAuthOpen(true);
      return;
    }
    if (!ageLoaded) return;
    if (!ageConfirmed) {
      setConsentOpen(true);
      return;
    }
    startMissionSession();
  };

  const exitMission = () => {
    stopActiveWork();
    setWordRequest(null);
    setStarted(false);
    setTurns([]);
    setInterim("");
    setObjectiveIds([]);
    setSkippedObjectiveIds([]);
    setErrorMessage(null);
    setCompletionReason(null);
    setTypedTurn("");
    setTranscriptSource(null);
    setLastResponseTiming(null);
    setStatus("ready");
    sessionStartedAtRef.current = null;
    practiceRecordedRef.current = false;
  };

  const selectMission = (mission: SpeakingMission) => {
    exitMission();
    setSelectedMission(mission);
    appDispatch({
      type: "SET_SPEAKING_FOCUS",
      payload: { language: mission.language, missionId: mission.id, title: mission.title },
    });
  };

  const activeObjective = selectedMission?.objectives.find(
    (objective) =>
      !objectiveIds.includes(objective.id) && !skippedObjectiveIds.includes(objective.id),
  );

  const sendLearnerTurn = async (
    text: string,
    transcriptSourceOverride?: "dictation" | "typed",
  ) => {
    if (!selectedMission) return;
    const learnerText = text.trim();
    if (!learnerText) {
      setStatus("ready");
      return;
    }

    const learnerTurn: MissionTurn = {
      id: missionTurnId(),
      role: "learner",
      text: learnerText,
    };
    const learnerTranscriptSource = transcriptSourceOverride ?? transcriptSource;
    const turnSubmittedAt = performance.now();
    const previousTurns = turns;
    setTurns((current) => [...current, learnerTurn]);
    setTypedTurn("");
    setTranscriptSource(null);
    setStatus("thinking");
    setErrorMessage(null);
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;

    try {
      const history: Array<{ role: "user" | "assistant"; content: string }> = previousTurns
        .slice(-38)
        .map((turn) => ({
          role: turn.role === "learner" ? ("user" as const) : ("assistant" as const),
          content: turn.text,
        }));
      history.push({ role: "user", content: learnerText });
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: await speakingRequestHeaders(),
        body: JSON.stringify({
          mode: "mission",
          language: selectedMission.language,
          level: selectedMission.level,
          messages: history,
          scenarioVersionId: selectedMission.id,
          feedbackLanguage,
          nativeLanguage: appState.nativeLanguage,
          partnerVersion,
          activeObjectiveId: activeObjective?.id,
          completedObjectiveIds: objectiveIds,
          skippedObjectiveIds,
          destinationCountryId:
            selectedMission.specialty === "Travel" ? activeTravelDestination?.id : undefined,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as MissionTurnResponse | { error?: string };
      if (!response.ok || !("assistantText" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The mission partner could not respond.",
        );
      }

      const replyReadyMs = Math.round(performance.now() - turnSubmittedAt);
      setLastResponseTiming({ replyReadyMs });

      setTurns((current) => [
        ...current.map((turn) =>
          turn.id === learnerTurn.id ? { ...turn, feedback: payload.deferredFeedback } : turn,
        ),
        { id: missionTurnId(), role: "partner", text: payload.assistantText },
      ]);
      setObjectiveIds((current) => [...new Set([...current, ...payload.provisionalObjectiveIds])]);
      setTypedTurn("");
      setTranscriptSource(null);
      requestRef.current = null;
      if (payload.shouldEnd) setCompletionReason("natural");
      setStatus(payload.shouldEnd ? "complete" : "ready");
      void speakPartnerText(payload.assistantText, () => {
        setLastResponseTiming({
          replyReadyMs,
          voiceStartedMs: Math.round(performance.now() - turnSubmittedAt),
        });
      });
    } catch (error) {
      requestRef.current = null;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setTurns((current) => current.filter((turn) => turn.id !== learnerTurn.id));
      setTypedTurn(learnerText);
      setTranscriptSource(learnerTranscriptSource ?? "typed");
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The mission partner could not respond.",
      );
    }
  };

  const startListening = () => {
    if (partnerSpeaking || status === "thinking") return;
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setErrorMessage(
        "Speech recognition is unavailable in this browser. Use a supported browser for this UX preview.",
      );
      setStatus("error");
      return;
    }
    try {
      stopAudio();
      const recognition = new Constructor();
      recognition.lang = missionLocale;
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalText = "";
      let latestInterimText = "";
      let recognitionError: string | null = null;
      recognition.onresult = (event) => {
        let interimText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) finalText = `${finalText} ${result[0].transcript}`.trim();
          else interimText = `${interimText} ${result[0].transcript}`.trim();
        }
        if (interimText) latestInterimText = interimText;
        setInterim(interimText);
      };
      recognition.onerror = (event) => {
        recognitionError = event?.error ?? "unknown";
        if (recognitionError !== "no-speech" && recognitionError !== "aborted") {
          setErrorMessage(`Microphone error: ${recognitionError}. Try again or type your answer.`);
          setStatus("error");
        }
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setInterim("");
        const capturedText = bestAvailableSpeechTranscript(finalText, latestInterimText);
        if (capturedText) {
          setTypedTurn(capturedText);
          setTranscriptSource("dictation");
          setErrorMessage(null);
          setStatus("ready");
          if (spokenTurnFlow === "quick") {
            gated(() => void sendLearnerTurn(capturedText, "dictation"));
          }
          return;
        }
        if (recognitionError === "aborted") return;
        setStatus((current) => (current === "error" ? current : "ready"));
        setErrorMessage(
          recognitionError === "no-speech"
            ? "I did not hear speech. Tap Retry, or use the keyboard microphone in the answer box."
            : "No transcript was returned. Tap Retry, or use the keyboard microphone in the answer box.",
        );
      };
      recognitionRef.current = recognition;
      recognition.start();
      setStatus("listening");
      setErrorMessage(null);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "The microphone could not start.");
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const completedObjectiveCount =
    selectedMission?.objectives.filter((objective) => objectiveIds.includes(objective.id)).length ??
    0;
  const feedbackNotes = turns.flatMap((turn) => turn.feedback ?? []);
  const latestFeedback = feedbackNotes.at(-1) ?? null;

  useEffect(() => {
    if (
      status !== "complete" ||
      !selectedMission ||
      practiceRecordedRef.current ||
      !turns.some((turn) => turn.role === "learner")
    ) {
      return;
    }
    practiceRecordedRef.current = true;
    appDispatch({
      type: "MARK_PRACTICE",
      payload: { language: selectedMission.language },
    });
  }, [appDispatch, selectedMission, status, turns]);

  const finishMission = () => {
    stopActiveWork();
    setWordRequest(null);
    setInterim("");
    setErrorMessage(null);
    setCompletionReason("learner");
    setStatus("complete");
  };

  const openWordDefinition = useCallback(
    (word: string, sentence: string, x: number, y: number) => {
      if (!selectedMission) return;
      setWordRequest({
        word,
        sentence,
        language: selectedMission.language,
        textId: selectedMission.id,
        textTitle: selectedMission.title,
        x,
        y,
      });
    },
    [selectedMission],
  );

  if (!selectedMission) {
    if (!missionLanguage) {
      const japaneseAwaitingReview =
        appState.selectedLanguage === "Japanese" && !japaneseSpeakingReviewed;
      const sameLanguagePair =
        appState.selectedLanguage === "English" && appState.nativeLanguage === "English";
      return (
        <section
          ref={viewTopRef}
          className="scroll-mt-4 mt-5 rounded-3xl border border-border/70 bg-card/40 p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Scenario missions
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            {japaneseAwaitingReview
              ? "Japanese missions are awaiting curriculum review"
              : sameLanguagePair
                ? "Choose your native language to study English"
                : `${appState.selectedLanguage} missions are next in the rollout`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {japaneseAwaitingReview
              ? "The Japanese catalog is built but remains hidden until its curriculum review flag is approved. Spanish, Italian, and English missions can be used now."
              : sameLanguagePair
                ? "English cannot also be your native coaching language. Choose your actual native language from the native-language menu, then return here for the complete English catalog."
                : "The complete topic catalog is currently available for Spanish, Italian, and English. Choose one of those languages from the language menu to practice its full set."}
          </p>
        </section>
      );
    }
    return (
      <section
        ref={viewTopRef}
        aria-labelledby="mission-preview-heading"
        className="scroll-mt-4 mt-5"
      >
        <div className="mb-5 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            UX preview · {missionLanguage}
          </p>
          <h2 id="mission-preview-heading" className="mt-1 font-serif text-2xl text-foreground">
            Practice a real situation
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose from {languageMissions.length} missions across {languageModules.length}{" "}
            {missionLanguage} modules. Start with Core Speaking for essential verbs, grammar, and
            daily living—including relationships and intimacy—then move into specialty practice.
            Every mission supports woman and man partner versions and does not yet count toward
            durable mastery.
          </p>
        </div>
        <div className="mb-5">
          <NextTripBanner
            onPracticeTravel={() => {
              setCatalogModuleId(null);
              setCatalogCategory("Travel");
              setCatalogSearch("");
            }}
          />
        </div>
        {catalogModule ? (
          <>
            <button
              type="button"
              onClick={() => setCatalogModuleId(null)}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> All {missionLanguage} modules
            </button>
            <div className="mb-4 rounded-2xl border border-border/70 bg-card/40 p-4">
              <p className="text-sm text-muted-foreground">{catalogModule.category}</p>
              <h3 className="mt-1 font-serif text-2xl text-foreground">
                {catalogModule.emoji} {catalogModule.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {catalogModule.blurb}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gold/80">
                {catalogMissions.length} speaking missions
              </p>
            </div>
            {catalogModule.id === "core-speaking" && (
              <div
                className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
                aria-label="Core speaking sections"
              >
                {CORE_SECTIONS.map((section) => {
                  const count = catalogMissions.filter(
                    (mission) => mission.coreSection === section,
                  ).length;
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setCoreSection(section)}
                      aria-pressed={coreSection === section}
                      className={
                        "rounded-xl border px-2 py-2.5 text-xs transition-colors " +
                        (coreSection === section
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border text-muted-foreground hover:text-foreground")
                      }
                    >
                      <span className="block">{section}</span>
                      <span className="mt-0.5 block font-mono text-[9px] opacity-75">
                        {count} missions
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleCatalogMissions.map((mission) => {
                const specialty = specialtyStyle(mission.specialty);
                return (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => selectMission(mission)}
                    className="rounded-2xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-gold/50 hover:bg-card"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span style={{ color: specialty.color }}>{specialty.label}</span>
                      <span className="text-muted-foreground">
                        {mission.level} · {mission.quickMinutes}–{mission.targetMinutes} min
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-xl text-foreground">{mission.title}</h3>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gold/80">
                      Woman + man partner versions
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <span className="sr-only">Search {missionLanguage} modules</span>
              <input
                type="search"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Search core, specialties, or mission topics…"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground"
              />
            </label>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {(["All", ...catalogCategories] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCatalogCategory(category)}
                  className={
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors " +
                    (catalogCategory === category
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCatalogModules.map((module) => {
                const missionCount = languageMissions.filter(
                  (mission) => mission.moduleId === module.id,
                ).length;
                const specialty = specialtyStyle(module.category);
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => {
                      setCatalogModuleId(module.id);
                      if (module.id === "core-speaking") setCoreSection("Essential verbs");
                    }}
                    className="rounded-2xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-gold/50 hover:bg-card"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span style={{ color: specialty.color }}>{specialty.label}</span>
                      <span className="text-muted-foreground">{missionCount} missions</span>
                    </div>
                    <h3 className="mt-3 font-serif text-xl text-foreground">
                      {module.emoji} {module.name}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {module.blurb}
                    </p>
                  </button>
                );
              })}
            </div>
            {filteredCatalogModules.length === 0 && (
              <p className="rounded-2xl border border-border/70 p-5 text-sm text-muted-foreground">
                No {missionLanguage} module matches that search.
              </p>
            )}
          </>
        )}
      </section>
    );
  }

  if (!started) {
    const specialty = specialtyStyle(selectedMission.specialty);
    return (
      <section
        ref={viewTopRef}
        className="scroll-mt-4 mt-5 rounded-3xl border border-border/70 bg-card/40 p-5"
      >
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        <SpeakingConsentDialog
          open={consentOpen}
          saving={ageSaving}
          language={selectedMission.language}
          audioSource={partnerAudioSource}
          onOpenChange={setConsentOpen}
          onConfirm={() => void confirmAgeAndBegin()}
        />
        <button
          type="button"
          onClick={() => setSelectedMission(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All missions
        </button>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs">
          <span style={{ color: specialty.color }}>
            {selectedMission.moduleEmoji} {selectedMission.moduleName} · {selectedMission.level}
          </span>
          <span className="text-muted-foreground">
            {selectedMission.quickMinutes}–{selectedMission.targetMinutes} min
          </span>
        </div>
        <h2 className="mt-2 font-serif text-3xl text-foreground">{selectedMission.title}</h2>
        {selectedMission.specialty === "Travel" && (
          <div className="mt-4">
            <NextTripBanner compact />
          </div>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {selectedMission.summary}
        </p>
        {practiceNotice && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-amber-400/45 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100"
          >
            {practiceNotice}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Goals for this mission · reference
            </p>
            <ul className="mt-2 space-y-2 text-sm text-foreground/85">
              {selectedMission.objectives.map((objective) => (
                <li key={objective.id} className="flex gap-2">
                  <span className="text-gold">○</span>
                  <span>
                    {objective.description}
                    {objective.critical ? " *" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Words you may use · reference
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMission.vocabulary.map((word) => (
                <span
                  key={word}
                  className="furigana-line rounded-md bg-muted/45 px-3 py-1 text-xs text-foreground/80"
                >
                  {showFurigana ? <FuriganaText text={word} mode="above" script="hiragana" /> : word}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border-2 border-gold/30 bg-background/50 p-4">
          <div className="mb-4 rounded-xl bg-gold/10 px-3 py-2 text-xs leading-relaxed text-foreground/85">
            <span className="font-semibold text-gold">Set your choices.</span> Tappable choices have
            strong borders; the selected choice is filled gold. The goals and words above are
            reference information, not buttons.
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Choose partner audio</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["device", "google", "text"] as const).map((source) => {
                const selected = partnerAudioSource === source;
                const available = source !== "google" || ttsStatus !== "unavailable";
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => available && setPartnerAudioSource(source)}
                    disabled={!available}
                    aria-pressed={selected}
                    className={
                      "min-h-14 rounded-xl border-2 px-2 py-2.5 text-sm font-medium transition-colors " +
                      (selected
                        ? "border-gold bg-gold text-black shadow-md shadow-gold/10"
                        : available
                          ? "border-border bg-card text-foreground hover:border-gold/60"
                          : "cursor-not-allowed border-border bg-card text-muted-foreground opacity-40")
                    }
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      {source === "device"
                        ? "Phone voice"
                        : source === "text"
                          ? "Text only"
                          : "Google voice"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Phone voice uses a voice installed on this device. Google preselects a short list for
              {activeTravelDestination
                ? ` ${activeTravelDestination.country}`
                : ` ${selectedMission.language}`}
              . Text-only keeps every mission usable without playback.
            </p>
          </fieldset>
          <fieldset className="mt-4 border-t border-border/60 pt-4">
            <legend className="text-sm font-semibold text-foreground">
              Choose conversation partner
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["woman", "man"] as const).map((version) => {
                const selected = partnerVersion === version;
                return (
                  <button
                    key={version}
                    type="button"
                    onClick={() => {
                      setPartnerVersion(version);
                      setSelectedGoogleVoiceName(null);
                    }}
                    aria-pressed={selected}
                    className={
                      "min-h-14 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors " +
                      (selected
                        ? "border-gold bg-gold text-black shadow-md shadow-gold/10"
                        : "border-border bg-card text-foreground hover:border-gold/60")
                    }
                  >
                    <span className="flex items-center justify-center gap-2">
                      {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                      {version === "woman" ? "Woman partner" : "Man partner"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Same objectives, with the partner&apos;s natural self-reference, phrasing, and
              response rhythm adapted for this version.
            </p>
          </fieldset>
          <div className="mt-4 border-t border-border/60 pt-4 text-sm">
            {session && !ageLoaded ? (
              <p className="text-muted-foreground">Checking your saved speaking confirmation…</p>
            ) : ageConfirmed ? (
              <p className="flex items-center gap-2 text-emerald-300">
                <Check className="h-4 w-4" aria-hidden="true" /> Speaking confirmation saved to this
                account
              </p>
            ) : (
              <p className="text-muted-foreground">
                The first time you tap Start, one large confirmation appears. Confirm once and you
                will not be asked again.
              </p>
            )}
          </div>
          <label className="mt-4 grid gap-1 border-t border-border/60 pt-4 text-sm">
            <span className="font-semibold text-foreground">Choose coaching language</span>
            <select
              value={feedbackLanguage}
              onChange={(event) => setFeedbackLanguage(event.target.value as FeedbackLanguage)}
              className="min-h-12 rounded-xl border-2 border-gold/35 bg-card px-3 py-2 text-foreground"
            >
              <option value="Native language">{appState.nativeLanguage}</option>
              <option value="Target language">{selectedMission.language}</option>
              <option value="Adaptive">Adaptive</option>
            </select>
          </label>
          <label className="mt-4 grid gap-1 border-t border-border/60 pt-4 text-sm">
            <span className="font-semibold text-foreground">Choose spoken turn flow</span>
            <select
              value={spokenTurnFlow}
              onChange={(event) => setSpokenTurnFlow(event.target.value as SpokenTurnFlow)}
              className="min-h-12 rounded-xl border-2 border-gold/35 bg-card px-3 py-2 text-foreground"
            >
              <option value="quick">Quick response · send after silence</option>
              <option value="review">Review transcript before sending</option>
            </select>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Quick response feels more conversational. Review mode lets you correct what the phone
              heard before the partner replies.
            </span>
          </label>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {partnerAudioSource === "device"
                  ? "Current app voice"
                  : partnerAudioSource === "text"
                    ? "Text-only partner"
                    : `${partnerVersion === "woman" ? "Woman" : "Man"} partner voice`}
              </p>
              <p className="mt-0.5 text-xs text-foreground/80">
                {partnerAudioSource === "device"
                  ? `Best available ${selectedMission.language} voice from this phone or browser`
                  : partnerAudioSource === "text"
                    ? "Read each partner line without generated playback"
                    : partnerVoice
                      ? `${partnerVoice.label} · ${partnerVoice.name}`
                      : `No Google ${selectedMission.language} voice available`}
              </p>
            </div>
            <span className="rounded-full border border-gold/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
              {partnerAudioSource === "device"
                ? "Device voice"
                : partnerAudioSource === "text"
                  ? "No audio"
                  : "Server voice"}
            </span>
          </div>
          {partnerAudioSource === "text" ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Partner lines remain visible and replay is disabled in text-only mode.
            </p>
          ) : partnerAudioSource === "google" && partnerVoice ? (
            <label className="mt-3 grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Choose Google voice · {voiceRegionLabel}
              </span>
              <select
                value={partnerVoice.name}
                onChange={(event) => {
                  const voice = availableGoogleVoices.find(
                    (candidate) => candidate.name === event.target.value,
                  );
                  if (!voice) return;
                  setSelectedGoogleVoiceName(voice.name);
                  setVoiceURI(encodeGoogleVoicePreference(voice));
                  if (voice.ssmlGender === "FEMALE") setPartnerVersion("woman");
                  if (voice.ssmlGender === "MALE") setPartnerVersion("man");
                }}
                className="min-h-12 rounded-xl border-2 border-gold/35 bg-card px-3 py-2 text-foreground"
              >
                {availableGoogleVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.label} · {voice.languageCodes[0] ?? selectedMission.locale}
                  </option>
                ))}
              </select>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {activeTravelDestination
                  ? `${activeTravelDestination.country} is selected for your trip, so only matching ${missionLocale} voices are shown when Google provides them.`
                  : `No trip country is selected, so ${voiceRegionLabel} is the preselected textbook-style default.`}{" "}
                The app preselects one for your partner choice; changing it is optional.
              </span>
              <button
                type="button"
                onClick={() =>
                  void speakPartnerText(
                    partnerVoiceSample(selectedMission.language, partnerVersion),
                  )
                }
                className="mt-2 min-h-12 w-full rounded-xl border-2 border-gold/60 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold"
              >
                ▶ Play voice sample · {partnerSpeed}×
              </button>
            </label>
          ) : partnerAudioReady ? (
            <button
              type="button"
              onClick={() =>
                void speakPartnerText(partnerVoiceSample(selectedMission.language, partnerVersion))
              }
              className="mt-3 min-h-12 w-full rounded-xl border-2 border-gold/60 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold"
            >
              ▶ Play {partnerAudioSource === "device" ? "phone" : partnerVersion} voice sample ·{" "}
              {partnerSpeed}×
            </button>
          ) : (
            <p role="alert" className="mt-3 text-xs leading-relaxed text-destructive">
              {partnerAudioSource === "device"
                ? `A ${selectedMission.language} device voice is unavailable in this browser.`
                : ttsStatus === "checking"
                  ? "Checking Google partner voice availability…"
                  : `Google Cloud voices are unavailable for ${selectedMission.language}.`}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {partnerAudioSource === "device"
              ? "Device voice quality may be better on this phone, but browsers do not expose reliable gender metadata. The partner's dialogue still follows the selected woman/man version."
              : partnerAudioSource === "google"
                ? "Google server voices are independent of voices installed on this phone. The selected voice follows this mission and the site-wide voice setting."
                : "Text-only mode does not generate audio."}
          </p>
          <label className="mt-4 grid gap-1 border-t border-border/60 pt-4 text-sm">
            <span className="flex items-center justify-between gap-3 text-muted-foreground">
              <span className="font-semibold text-foreground">Choose partner speed</span>
              <span className="font-mono text-gold">{partnerSpeed}×</span>
            </span>
            <select
              value={partnerSpeed}
              onChange={(event) => setRate(Number(event.target.value))}
              disabled={partnerAudioSource === "text"}
              className="min-h-12 rounded-xl border-2 border-gold/35 bg-card px-3 py-2 text-foreground"
            >
              {MISSION_TTS_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}×
                  {speed === 0.5
                    ? " · very slow"
                    : speed === 0.75
                      ? " · careful"
                      : speed === 1
                        ? " · natural"
                        : speed === 1.5
                          ? " · challenge"
                          : ""}
                </option>
              ))}
            </select>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Start slower for comprehension, then repeat the same mission faster to train your ear.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={requestMissionStart}
          disabled={!partnerAudioReady || ageSaving || Boolean(session && !ageLoaded)}
          className="mt-5 min-h-14 w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-black shadow-lg shadow-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!session
            ? "Sign in to start mission"
            : !ageLoaded
              ? "Checking account…"
              : "Start mission"}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI feedback and objective observations are advisory practice signals. They are not a
          proficiency score, certification, or saved mastery tier.
        </p>
      </section>
    );
  }

  if (status === "complete") {
    const completionTitle =
      completionReason === "limit"
        ? "Time limit reached"
        : completionReason === "natural"
          ? "Mission reached a natural close"
          : "Mission ended";
    return (
      <section
        ref={viewTopRef}
        className="scroll-mt-4 mt-5 rounded-3xl border border-emerald-400/30 bg-card/50 p-5"
      >
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        <SpeakingConsentDialog
          open={consentOpen}
          saving={ageSaving}
          language={selectedMission.language}
          audioSource={partnerAudioSource}
          onOpenChange={setConsentOpen}
          onConfirm={() => void confirmAgeAndBegin()}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
          Mission recap · UX preview
        </p>
        <h2 className="mt-2 font-serif text-3xl text-foreground">{completionTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {selectedMission.title} · {partnerVersion === "woman" ? "Woman" : "Man"} partner
        </p>

        <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-4">
          <div className="flex items-center gap-2 text-gold">
            <Lightbulb className="h-4 w-4" />
            <h3 className="font-mono text-xs uppercase tracking-[0.18em]">Coaching feedback</h3>
          </div>
          {feedbackNotes.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
              {feedbackNotes.slice(-3).map((feedback, index) => (
                <li key={`recap-feedback-${index}`} className="flex gap-2">
                  <span className="text-gold">•</span>
                  <span>{feedback}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              No coaching was generated before this mission ended. Complete at least one learner
              turn to receive feedback.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4">
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Objectives observed · provisional
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {selectedMission.objectives.map((objective) => {
              const completed = objectiveIds.includes(objective.id);
              const skipped = skippedObjectiveIds.includes(objective.id);
              return (
                <li key={objective.id} className="flex gap-2">
                  <span className={completed ? "text-emerald-300" : "text-muted-foreground"}>
                    {completed ? "✓" : skipped ? "—" : "○"}
                  </span>
                  <span
                    className={
                      completed
                        ? "text-foreground"
                        : skipped
                          ? "text-muted-foreground line-through"
                          : "text-muted-foreground"
                    }
                  >
                    {objective.description}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {completedObjectiveCount} of {selectedMission.objectives.length} observed. No mastery
            tier was saved. {skippedObjectiveIds.length} skipped.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={requestMissionStart}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 px-4 py-3 text-sm text-emerald-200"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <button
            type="button"
            onClick={() => {
              exitMission();
              setSelectedMission(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> All missions
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={viewTopRef} className="scroll-mt-4 mt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Mission in progress · UX preview
          </p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">{selectedMission.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedObjectiveCount}/{selectedMission.objectives.length} provisional objectives
            {` · ${partnerVersion === "woman" ? "Woman" : "Man"} partner`}
          </p>
        </div>
        <button
          type="button"
          onClick={finishMission}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> End
        </button>
      </div>

      {practiceNotice && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-amber-400/45 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100"
        >
          {practiceNotice}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Mission objectives">
        {selectedMission.objectives.map((objective) => {
          const completed = objectiveIds.includes(objective.id);
          const skipped = skippedObjectiveIds.includes(objective.id);
          return (
            <span
              key={objective.id}
              className={
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs " +
                (completed
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                  : skipped
                    ? "border-border/60 bg-background/30 text-muted-foreground line-through"
                    : "border-border text-muted-foreground")
              }
              title={objective.description}
            >
              {completed ? <Check className="h-3 w-3" /> : skipped ? "—" : "○"}{" "}
              {objective.description}
            </span>
          );
        })}
      </div>

      <div className="mb-4 rounded-2xl border border-sky-400/35 bg-sky-400/10 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300">
          {activeObjective ? "Your next goal" : "Practice goals addressed"}
        </p>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          {activeObjective
            ? activeObjective.description
            : "Continue naturally or end the mission when the practical exchange feels complete."}
        </p>
        {activeObjective && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTypedTurn(clarificationPhrase(selectedMission.language));
                setTranscriptSource("typed");
              }}
              disabled={status === "thinking" || status === "listening" || partnerSpeaking}
              className="rounded-full border border-sky-300/40 px-3 py-1.5 text-xs text-sky-200 disabled:opacity-40"
            >
              Help me ask for an example
            </button>
            <button
              type="button"
              onClick={() =>
                setSkippedObjectiveIds((current) =>
                  current.includes(activeObjective.id) ? current : [...current, activeObjective.id],
                )
              }
              disabled={status === "thinking" || status === "listening" || partnerSpeaking}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
            >
              Skip this goal
            </button>
          </div>
        )}
        {selectedMission.vocabulary.length > 0 && activeObjective && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Useful words: {selectedMission.vocabulary.slice(0, 6).join(" · ")}
          </p>
        )}
      </div>

      <div
        ref={transcriptRef}
        className="h-[390px] overflow-y-auto rounded-3xl border border-border/60 bg-card/40 p-4"
        aria-live="polite"
      >
        <ul className="flex flex-col gap-3">
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={turn.role === "learner" ? "flex justify-end" : "flex justify-start"}
            >
              <div className="max-w-[88%]">
                <div
                  className={
                    turn.role === "learner"
                      ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                      : "rounded-2xl rounded-bl-sm border border-gold/30 bg-background/70 px-4 py-2.5 text-sm text-foreground"
                  }
                >
                  {turn.role === "partner" && partnerAudioSource !== "text" && (
                    <button
                      type="button"
                      onClick={() => void speakPartnerText(turn.text)}
                      className="mr-2 text-gold"
                      aria-label="Replay partner speech"
                    >
                      🔊
                    </button>
                  )}
                  <span className="furigana-line leading-relaxed">
                    <LongPressWordText
                      text={turn.text}
                      onWordLookup={openWordDefinition}
                      furigana={showFurigana}
                    />
                  </span>
                </div>
                {turn.feedback?.map((feedback, index) => (
                  <p
                    key={`${turn.id}-feedback-${index}`}
                    className="mt-1 rounded-xl bg-gold/10 px-3 py-1.5 text-xs text-gold"
                  >
                    💡 {feedback}
                  </p>
                ))}
              </div>
            </li>
          ))}
          {interim && (
            <li className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl border border-dashed border-primary/50 bg-primary/10 px-4 py-2.5 text-sm italic">
                {interim}
              </div>
            </li>
          )}
          {status === "thinking" && (
            <li className="flex justify-start">
              <div className="rounded-2xl border border-gold/20 px-4 py-2 text-xs text-muted-foreground">
                Partner is responding…
              </div>
            </li>
          )}
        </ul>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        Press and hold any dialogue word for its definition.
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-gold">
          <Lightbulb className="h-4 w-4" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">Latest coaching</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {latestFeedback ?? "Your first coaching note will appear here after you answer."}
        </p>
      </div>

      {lastResponseTiming && (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Last response · reply ready {(lastResponseTiming.replyReadyMs / 1000).toFixed(1)}s
          {lastResponseTiming.voiceStartedMs !== undefined
            ? ` · voice started ${(lastResponseTiming.voiceStartedMs / 1000).toFixed(1)}s`
            : ""}
        </p>
      )}

      {transcriptSource === "dictation" && typedTurn.trim() && (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            Review what your phone heard
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            Edit the transcript below if needed, then tap Send. It will not be submitted until you
            approve it.
          </p>
          <button
            type="button"
            onClick={startListening}
            disabled={status === "thinking" || status === "listening" || partnerSpeaking}
            className="mt-2 rounded-full border border-emerald-300/40 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-40"
          >
            Retry microphone
          </button>
        </div>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = typedTurn.trim();
          if (!text || status === "thinking" || partnerSpeaking) return;
          gated(() => void sendLearnerTurn(text));
        }}
      >
        <label className="sr-only" htmlFor="mission-typed-turn">
          Type your answer in {selectedMission.language}
        </label>
        <input
          id="mission-typed-turn"
          value={typedTurn}
          onChange={(event) => {
            setTypedTurn(event.target.value);
            setTranscriptSource("typed");
          }}
          disabled={status === "thinking" || status === "listening"}
          maxLength={2000}
          placeholder={`Type an answer in ${selectedMission.language}…`}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
        />
        <button
          type="submit"
          disabled={
            !typedTurn.trim() || status === "thinking" || status === "listening" || partnerSpeaking
          }
          aria-label="Send typed answer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {spokenTurnFlow === "quick"
          ? "Quick response sends when your phone detects that you finished speaking."
          : "Review mode waits for you to approve the transcript."}{" "}
        You can also use the iPhone keyboard microphone in this answer box.
      </p>

      <div className="mt-5 flex flex-col items-center gap-3">
        {recognitionSupported === false ? (
          <p className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
            Speech recognition is unavailable in this browser. Use the typed answer field above.
          </p>
        ) : status === "error" ? (
          <button
            type="button"
            onClick={() => {
              setStatus("ready");
              setErrorMessage(null);
            }}
            className="rounded-full border border-gold/40 px-5 py-2 text-sm text-gold"
          >
            Resume mission
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={status === "listening" ? stopListening : startListening}
              disabled={status === "thinking" || partnerSpeaking}
              aria-label={status === "listening" ? "Stop listening" : "Start listening"}
              className={
                "flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40 " +
                (status === "listening" ? "bg-gold listening-rings" : "bg-primary")
              }
            >
              {status === "listening" ? (
                <Square className="h-7 w-7" fill="currentColor" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
            <p className="text-sm text-muted-foreground">
              {status === "listening"
                ? "Listening… tap Stop when you finish"
                : partnerSpeaking
                  ? "Partner is speaking… your microphone will unlock afterward"
                  : status === "thinking"
                    ? "Partner is replying…"
                    : `Your turn — tap the microphone and answer in ${selectedMission.language}`}
            </p>
          </>
        )}
      </div>

      {wordRequest && (
        <WordCard
          request={wordRequest}
          onClose={() => setWordRequest(null)}
          onXp={(amount) => appDispatch({ type: "ADD_XP", payload: amount })}
        />
      )}
    </section>
  );
}
