import { usePracticeViewport } from "@/hooks/use-practice-viewport";
import { SpeakingPreparation } from "./SpeakingPreparation";
import { SPEAKING_STEPS, type SpeakingStep } from "@/lib/speaking-preparation";
import { recognitionConstructor, type SpeechRecognitionLike } from "@/lib/phone-dictation";
import {
  clearSpeakingAuthMission,
  rememberSpeakingAuthMission,
  speakingAuthMission,
} from "@/lib/speaking-auth-return";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStageCurriculaVersion } from "@/hooks/use-stage-curriculum";
import { loadStageCurriculum, stageModulesOfBase } from "@/data/core60-stages";
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
import {
  RELATIONSHIP_GROUPS,
  type RelationshipGroup,
  type CoreSpeakingSection,
} from "@/data/core-speaking";
import {
  getSpeakingMissions,
  getSpeakingModules,
  speakingCatalogMissionCount,
  speakingCatalogModuleId,
  speakingCatalogTitle,
  speakingStageName,
  SPEAKING_LANGUAGES,
  type SpeakingMission,
  type SpeakingMissionLanguage,
} from "@/data/speaking-missions";
import {
  getMissionTtsCapabilities,
  speakMissionTts,
  type MissionTtsCapabilities,
} from "@/lib/mission-tts";
import { pickVoice, subscribeVoices } from "@/lib/voices";
import {
  getSpeakingAgeAttestation,
  saveSpeakingAgeAttestation,
  SpeakingConsentSaveError,
  speakingRequestHeaders,
} from "@/lib/speaking-client";
import { speakRemote } from "@/lib/tts";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { useAiGate } from "@/state/ai-gate-state";
import { useApp } from "@/state/app-state";
import { useSpeech } from "@/state/speech-state";
import { useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { NextTripBanner } from "@/components/travel/NextTripBanner";
import { getTravelDestination } from "@/data/travel-destinations";
import { consumeCoreSpeakingEntry, consumeSpeakingMissionRequest } from "@/lib/speaking-navigation";
import { browserReturnStorage, lessonMissionPrefix, readLessonReturn } from "@/lib/lesson-return";
import { bestAvailableSpeechTranscript } from "@/lib/speaking-transcript";
import { speechRecognitionErrorMessage } from "@/lib/speech-recognition-errors";
import { LongPressWordText } from "./LongPressWordText";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { PinyinText } from "@/components/reader/PinyinText";
import { setSpeakingPrivacyMode } from "@/lib/speaking-privacy";
import { WatchTalkControl } from "./WatchTalkControl";
import { SpeakingConsentDialog } from "./SpeakingConsentDialog";
import { MicrophoneTestDialog } from "./MicrophoneTestDialog";

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
  "Relationships",
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

/** With text already available, recover promptly if the browser drops onend. */
const STOP_FALLBACK_MS = 1200;
/** Empty results may still be in transit after Stop; don't abort them after 1.2s. */
const TRANSCRIPT_WAIT_MS = 8000;

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

/** Catalog order within a base module: its own missions, then its Foundation's, then its Master's. */
function stageRank(moduleId: string): number {
  const stage = speakingStageName(moduleId);
  return stage === "Foundation" ? 1 : stage === "Master" ? 2 : 0;
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

export function SpeakingMissionsPreview({
  embeddedMissionPrefix,
  onEmbeddedClose,
  onFocusChange,
}: {
  embeddedMissionPrefix?: string;
  onEmbeddedClose?: () => void;
  onFocusChange?: (focused: boolean) => void;
} = {}) {
  useEffect(() => {
    if (!embeddedMissionPrefix) return;
    setSpeakingPrivacyMode(true);
    return () => setSpeakingPrivacyMode(false);
  }, [embeddedMissionPrefix]);
  const { gated } = useAiGate();
  const { state: appState, dispatch: appDispatch } = useApp();
  const {
    accent,
    accentsForLanguage = [],
    rate,
    setAccent,
    setRate,
    voiceURI,
    setVoiceURI,
  } = useSpeech();
  const { session, isCurrentUser } = useAuth();
  const [selectedMission, setSelectedMission] = useState<SpeakingMission | null>(null);
  const [started, setStarted] = useState(false);
  const [practiceStep, setPracticeStep] = useState<SpeakingStep>(
    embeddedMissionPrefix ? "conversation" : "hear",
  );
  const practiceViewport = usePracticeViewport(`${selectedMission?.id}:${started}:${practiceStep}`);
  useEffect(() => {
    onFocusChange?.(selectedMission !== null);
    return () => onFocusChange?.(false);
  }, [selectedMission, onFocusChange]);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageLoaded, setAgeLoaded] = useState(false);
  const [ageStatusActor, setAgeStatusActor] = useState<string | null>(null);
  const [ageSaving, setAgeSaving] = useState(false);
  const [ageUncertainActor, setAgeUncertainActor] = useState<string | null>(null);
  const ageUncertainRef = useRef<string | null>(null);
  const ageConfirmedActorRef = useRef<string | null>(null);
  const ageReadRevisionRef = useRef(0);
  const ageUnknown = Boolean(session && ageUncertainActor === session.user.id);
  const [consentOpen, setConsentOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [feedbackLanguage, setFeedbackLanguage] = useState<FeedbackLanguage>("Adaptive");
  const [spokenTurnFlow, setSpokenTurnFlow] = useState<SpokenTurnFlow>("quick");
  const [partnerVersion, setPartnerVersion] = useState<MissionPartnerVersion>("woman");
  const [partnerAudioSource, setPartnerAudioSource] = useState<PartnerAudioSource>("device");
  const [status, setStatus] = useState<MissionStatus>("ready");
  const [turns, setTurns] = useState<MissionTurn[]>([]);
  const [interim, setInterim] = useState("");
  const [finishingSpeech, setFinishingSpeech] = useState(false);
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
  const [relationshipGroup, setRelationshipGroup] = useState<RelationshipGroup | "All">("All");
  const [typedTurn, setTypedTurn] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"dictation" | "typed" | null>(null);
  const [partnerSpeaking, setPartnerSpeaking] = useState(false);
  const [skippedObjectiveIds, setSkippedObjectiveIds] = useState<string[]>([]);
  const [lastResponseTiming, setLastResponseTiming] = useState<ResponseTiming | null>(null);
  const [wordRequest, setWordRequest] = useState<WordCardRequest | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finishRecognitionRef = useRef<(() => void) | null>(null);
  const cancelRecognitionRef = useRef<(() => void) | null>(null);
  const stoppingRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionHasTextRef = useRef(false);
  const recognitionStopTimerRef = useRef<number | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const viewTopRef = useRef<HTMLElement | null>(null);
  const previousViewKeyRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const practiceRecordedRef = useRef(false);
  const ageSaveRef = useRef<AbortController | null>(null);
  const audioRef = useRef<AbortController | null>(null);
  const sessionOwnerRef = useRef<string | null>(null);
  const [coreEntryRequested] = useState(() =>
    embeddedMissionPrefix ? false : consumeCoreSpeakingEntry(),
  );
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
  // Core Speaking shows the same readings the Reader and Flashcards do —
  // without them a learner meets bare kanji/hanzi in the transcript and the
  // reference vocabulary with no way to sound it out. Japanese gets furigana,
  // Chinese gets pinyin; every other language renders unchanged.
  const readingScript: "japanese" | "chinese" | null =
    missionLanguage === "Japanese" ? "japanese" : missionLanguage === "Chinese" ? "chinese" : null;
  const showFurigana = missionLanguage === "Japanese";
  const showPinyin = missionLanguage === "Chinese";
  const tripPlan = missionLanguage ? appState.nextTrips[missionLanguage] : null;
  const tripDestination = getTravelDestination(tripPlan?.destinationId);
  const activeTravelDestination =
    selectedMission?.specialty === "Travel" && tripDestination?.language === missionLanguage
      ? tripDestination
      : null;
  const languageModules = useMemo(
    () => (missionLanguage ? getSpeakingModules(missionLanguage, appState.nativeLanguage) : []),
    [appState.nativeLanguage, missionLanguage],
  );
  // A Core 60 stage's lesson missions appear once its curriculum chunk has loaded: the hook
  // re-renders then, and getSpeakingMissions (cached per language) returns the rebuilt list.
  useStageCurriculaVersion();
  const allLanguageMissions = missionLanguage ? getSpeakingMissions(missionLanguage) : null;
  const languageMissions = useMemo(() => {
    if (!allLanguageMissions) return [];
    const availableModuleIds = new Set(languageModules.map((module) => module.id));
    // A Foundation or Master mission is available with its base module (it is listed under it).
    return allLanguageMissions.filter((mission) =>
      availableModuleIds.has(speakingCatalogModuleId(mission.moduleId)),
    );
  }, [languageModules, allLanguageMissions]);
  const missionLocale = accent ?? selectedMission?.locale;
  const partnerSpeed = isMissionTtsSpeed(rate) ? rate : 1;
  const {
    key: lifecycleKey,
    actor,
    capture,
    cancel,
  } = usePracticeLifecycle(
    JSON.stringify([
      appState.selectedLanguage,
      appState.activeModuleId,
      selectedMission?.id,
      embeddedMissionPrefix,
    ]),
  );
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
    setAgeSaving(false);
  }, [cancel]);
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
  const voiceRegionLabel =
    accentsForLanguage.find((option) => option.code === missionLocale)?.label ?? missionLocale;
  const accentControl = (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-foreground">Speaking accent</span>
      <select
        aria-label="Speaking accent"
        value={accent}
        onChange={(event) => setAccent(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground sm:max-w-sm"
      >
        {accentsForLanguage.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-xs leading-relaxed text-muted-foreground">
        Uses your app voice accent for playback and microphone language. Available voices vary by
        device.
      </span>
    </label>
  );
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
              speakingCatalogModuleId(mission.moduleId) === module.id &&
              `${speakingCatalogTitle(mission)} ${mission.summary} ${mission.vocabulary.join(" ")}`
                .toLocaleLowerCase()
                .includes(query),
          )),
    );
  }, [catalogCategory, catalogSearch, languageMissions, languageModules]);
  const catalogModule = languageModules.find((module) => module.id === catalogModuleId) ?? null;
  // Opening a module loads the lessons of its Foundation and Master (their chunks are lazy), so
  // their Say it missions are listed under it with the module's own.
  const openedCatalogModuleId = catalogModule?.id ?? null;
  useEffect(() => {
    if (openedCatalogModuleId)
      for (const stageId of stageModulesOfBase(openedCatalogModuleId))
        void loadStageCurriculum(stageId);
  }, [openedCatalogModuleId]);
  // The base module's own missions, then its Foundation's, then its Master's (the order of
  // languageMissions already; the stage name keeps it stable if that ever changes).
  const catalogMissions = catalogModule
    ? languageMissions
        .filter((mission) => speakingCatalogModuleId(mission.moduleId) === catalogModule.id)
        .map((mission, index) => ({ mission, index }))
        .sort(
          (a, b) =>
            stageRank(a.mission.moduleId) - stageRank(b.mission.moduleId) || a.index - b.index,
        )
        .map(({ mission }) => mission)
    : [];
  const visibleCatalogMissions =
    catalogModule?.id === "core-speaking"
      ? catalogMissions.filter(
          (mission) =>
            mission.coreSection === coreSection &&
            (coreSection !== "Relationships" ||
              relationshipGroup === "All" ||
              mission.relationshipGroup === relationshipGroup),
        )
      : catalogMissions;

  useEffect(() => {
    setRecognitionSupported(recognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshAvailability = () => {
      if (!active) return;
      setDeviceVoiceAvailable(Boolean(pickVoice(missionLocale, voiceURI)));
    };
    refreshAvailability();
    const unsubscribe = subscribeVoices(refreshAvailability);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [missionLocale, voiceURI]);

  useEffect(() => {
    if (!session) {
      setAgeConfirmed(false);
      ageConfirmedActorRef.current = null;
      setAgeStatusActor(null);
      setAgeLoaded(true);
      return;
    }
    const controller = new AbortController();
    const revision = ++ageReadRevisionRef.current;
    setAgeLoaded(false);
    getSpeakingAgeAttestation(controller.signal, {
      userId: session.user.id,
      isCurrent: () => isCurrentUser(session.user.id),
    })
      .then((confirmed) => {
        if (
          controller.signal.aborted ||
          !isCurrentUser(session.user.id) ||
          revision !== ageReadRevisionRef.current ||
          ageSaveRef.current
        )
          return;
        ageConfirmedActorRef.current = confirmed ? session.user.id : null;
        setAgeStatusActor(session.user.id);
        setAgeConfirmed(confirmed);
        setAgeLoaded(true);
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          !isCurrentUser(session.user.id) ||
          revision !== ageReadRevisionRef.current ||
          ageSaveRef.current
        )
          return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        ageConfirmedActorRef.current = null;
        setAgeStatusActor(session.user.id);
        setAgeConfirmed(false);
        setAgeLoaded(true);
        setErrorMessage("Speaking confirmation could not be loaded. Please try again.");
      });
    return () => controller.abort();
  }, [session, isCurrentUser]);

  useEffect(() => {
    const controller = new AbortController();
    setTtsStatus("checking");
    getMissionTtsCapabilities(missionLocale, controller.signal)
      .then((capabilities) => {
        if (controller.signal.aborted) return;
        setTtsCapabilities(capabilities);
        setTtsStatus(capabilities.ready ? "ready" : "unavailable");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
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
    audioRef.current?.abort();
    audioRef.current = null;
    setPartnerSpeaking(false);
  }, []);

  const stopActiveWork = useCallback(() => {
    cancelRef.current();
    setFinishingSpeech(false);
    stopAudio();
  }, [stopAudio]);

  const activeCatalogModuleId =
    !appState.activeModuleId || appState.activeModuleId === "core"
      ? "core-speaking"
      : speakingCatalogModuleId(appState.activeModuleId ?? "");

  useEffect(() => {
    sessionOwnerRef.current = null;
    setAgeSaving(false);
    setConsentOpen(false);
    setStarted(false);
    setTurns([]);
    setTypedTurn("");
    setInterim("");
    setFinishingSpeech(false);
    setObjectiveIds([]);
    setPartnerSpeaking(false);
    setStatus("ready");
    setWordRequest(null);
    setSelectedMission(null);
    // Carry the current lesson module into Speak once per context change. Keep this
    // independent of catalog hydration so All modules and Travel remain usable.
    // Unavailable modules naturally fall back to the full catalog below.
    setCatalogModuleId(
      coreEntryRequestedRef.current ? "core-speaking" : activeCatalogModuleId || null,
    );
    coreEntryRequestedRef.current = false;
    setCatalogCategory("All");
    setCatalogSearch("");
    setCoreSection("Essential verbs");
    setPartnerAudioSource("device");
  }, [
    appState.selectedLanguage,
    appState.nativeLanguage,
    appState.activeModuleId,
    activeCatalogModuleId,
    actor,
  ]);

  useEffect(() => {
    if (started) return;
    setPartnerAudioSource(decodeGoogleVoicePreference(voiceURI) ? "google" : "device");
  }, [appState.selectedLanguage, started, voiceURI]);

  useEffect(() => {
    if (embeddedMissionPrefix) return;
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
  }, [catalogModuleId, selectedMission, started, status, embeddedMissionPrefix]);

  useEffect(() => {
    if (!started || status === "complete" || sessionStartedAtRef.current === null) return;
    const elapsed = Date.now() - sessionStartedAtRef.current;
    const remaining = Math.max(0, 18 * 60 * 1000 - elapsed);
    const lease = capture();
    const hardCap = window.setTimeout(() => {
      if (!lease.isCurrent()) return;
      stopActiveWork();
      setCompletionReason("limit");
      setStatus("complete");
      setErrorMessage("This UX-preview mission reached its 18-minute limit.");
    }, remaining);
    return () => window.clearTimeout(hardCap);
  }, [started, status, stopActiveWork, capture]);

  useEffect(() => {
    const lease = capture();
    const stopOnBackground = () => {
      if (!lease.isCurrent()) return;
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
  }, [started, status, stopActiveWork, capture]);

  const audioScope = JSON.stringify([
    missionLocale,
    partnerAudioSource,
    partnerSpeed,
    partnerVoice?.name,
    voiceURI,
  ]);
  const activeAudioScope = useRef<string | null>(null);
  useEffect(() => {
    activeAudioScope.current = audioScope;
    stopAudio();
  }, [audioScope, stopAudio]);
  const speakPartnerText = useCallback(
    async (text: string, onPlaybackStart?: () => void) => {
      const lease = capture();
      if (!lease.isCurrent() || activeAudioScope.current !== audioScope) return;
      stopAudio();
      if (partnerAudioSource === "text") return;
      const controller = new AbortController();
      audioRef.current = controller;
      const release = lease.own(() => {
        controller.abort();
        if (audioRef.current === controller) audioRef.current = null;
      });
      const current = () =>
        lease.isCurrent() &&
        activeAudioScope.current === audioScope &&
        !controller.signal.aborted &&
        audioRef.current === controller;
      setPartnerSpeaking(true);
      try {
        if (partnerAudioSource === "device") {
          if (!pickVoice(missionLocale, voiceURI))
            throw new Error("A device voice is unavailable in this browser.");
          await speakRemote(text, missionLocale, {
            voiceURI,
            rate: partnerSpeed,
            deviceOnly: true,
            signal: controller.signal,
            owner: { userId: actor ?? "", isCurrent: current },
            onPlaybackStart: () => {
              if (current()) onPlaybackStart?.();
            },
            onerror: () => {
              if (current()) setErrorMessage("The device voice could not play.");
            },
          });
        } else {
          if (ttsStatus !== "ready")
            throw new Error("Google partner voices are unavailable for this deployment.");
          if (!partnerVoice) throw new Error(`No Google voice is available for ${missionLocale}.`);
          await speakMissionTts({
            text,
            voiceName: partnerVoice.name,
            languageCode: partnerVoice.languageCodes[0] ?? missionLocale,
            speakingRate: partnerSpeed,
            usage: "mission",
            signal: controller.signal,
            owner: { userId: actor ?? "", isCurrent: current },
            onPlaybackStart: () => {
              if (current()) onPlaybackStart?.();
            },
          });
        }
      } catch (error) {
        if (!current() || (error instanceof DOMException && error.name === "AbortError")) return;
        setErrorMessage(error instanceof Error ? error.message : "Partner voice playback failed.");
      } finally {
        if (current()) {
          setPartnerSpeaking(false);
          audioRef.current = null;
        }
        release();
      }
    },
    [
      capture,
      actor,
      audioScope,
      missionLocale,
      partnerAudioSource,
      partnerSpeed,
      partnerVoice,
      stopAudio,
      ttsStatus,
      voiceURI,
    ],
  );

  const startMissionSession = () => {
    if (!capture().isCurrent() || !selectedMission || !partnerAudioReady) return;
    clearSpeakingAuthMission();
    stopActiveWork();
    sessionOwnerRef.current = lifecycleKey;
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
    const lease = capture();
    if (!lease.isCurrent() || ageSaveRef.current) return;
    if (
      session &&
      (ageUncertainRef.current === session.user.id ||
        ageConfirmedActorRef.current === session.user.id)
    )
      return;
    if (!session) {
      setConsentOpen(false);
      setAuthOpen(true);
      return;
    }
    const controller = new AbortController();
    ageSaveRef.current = controller;
    ageReadRevisionRef.current++;
    const release = lease.own(() => {
      controller.abort();
      if (ageSaveRef.current === controller) ageSaveRef.current = null;
    });
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && ageSaveRef.current === controller;
    setAgeSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveSpeakingAgeAttestation(true, controller.signal, current, {
        userId: session.user.id,
        isCurrent: current,
      });
      if (!current()) return;
      if (!saved) throw new SpeakingConsentSaveError("unknown");
      ageReadRevisionRef.current++;
      ageConfirmedActorRef.current = session.user.id;
      setAgeStatusActor(session.user.id);
      setAgeConfirmed(true);
      setAgeLoaded(true);
      setConsentOpen(false);
      setAgeSaving(false);
      ageSaveRef.current = null;
      release();
      startMissionSession();
    } catch (error) {
      if (current()) {
        ageReadRevisionRef.current++;
        if (error instanceof SpeakingConsentSaveError && error.outcome === "unknown") {
          ageUncertainRef.current = session.user.id;
          setAgeUncertainActor(session.user.id);
          setAgeStatusActor(session.user.id);
          setAgeConfirmed(false);
          setAgeLoaded(true);
          setErrorMessage(
            "We could not confirm the saved status. Check it before sending another request.",
          );
        } else {
          setErrorMessage("The speaking confirmation could not be saved. Please try again.");
        }
      }
    } finally {
      if (current()) {
        setAgeSaving(false);
        ageSaveRef.current = null;
      }
      release();
    }
  };

  const checkSavedSpeakingConfirmation = async () => {
    const lease = capture();
    if (
      !lease.isCurrent() ||
      !session ||
      ageSaveRef.current ||
      ageUncertainRef.current !== session.user.id
    )
      return;
    const controller = new AbortController();
    ageSaveRef.current = controller;
    ageReadRevisionRef.current++;
    const release = lease.own(() => {
      controller.abort();
      if (ageSaveRef.current === controller) ageSaveRef.current = null;
    });
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && ageSaveRef.current === controller;
    setAgeSaving(true);
    setErrorMessage(null);
    try {
      const confirmed = await getSpeakingAgeAttestation(controller.signal, {
        userId: session.user.id,
        isCurrent: current,
      });
      if (!current()) return;
      ageReadRevisionRef.current++;
      ageConfirmedActorRef.current = confirmed ? session.user.id : null;
      setAgeStatusActor(session.user.id);
      setAgeLoaded(true);
      setAgeConfirmed(confirmed);
      if (confirmed) {
        ageUncertainRef.current = null;
        setAgeUncertainActor(null);
        setConsentOpen(false);
      } else {
        setErrorMessage(
          "A saved confirmation is not visible yet. The earlier request may still finish. Check again later.",
        );
      }
    } catch {
      if (current()) {
        ageReadRevisionRef.current++;
        setErrorMessage(
          "We could not check the saved status. The earlier request may still finish.",
        );
      }
    } finally {
      if (current()) {
        setAgeSaving(false);
        ageSaveRef.current = null;
      }
      release();
    }
  };

  const requestMissionStart = () => {
    if (!capture().isCurrent()) return;
    if (!selectedMission || !partnerAudioReady || ageSaving) return;
    if (!session) {
      if (!embeddedMissionPrefix)
        rememberSpeakingAuthMission(selectedMission.id, {
          moduleId: appState.activeModuleId,
          target: appState.selectedLanguage,
          native: appState.nativeLanguage,
        });
      setAuthOpen(true);
      return;
    }
    if (ageUncertainRef.current === session.user.id) {
      setConsentOpen(true);
      return;
    }
    if (!ageLoaded || ageStatusActor !== session.user.id) return;
    if (!ageConfirmed) {
      setConsentOpen(true);
      return;
    }
    startMissionSession();
  };

  const exitMission = () => {
    if (!capture().isCurrent()) return;
    clearSpeakingAuthMission();
    stopActiveWork();
    sessionOwnerRef.current = null;
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

  // A sign-in resets all private work. Reopen only the explicitly requested public setup.
  useEffect(() => {
    if (embeddedMissionPrefix) return;
    let id: string | null = null;
    try {
      id = speakingAuthMission(window.location.href, {
        moduleId: appState.activeModuleId,
        target: appState.selectedLanguage,
        native: appState.nativeLanguage,
      });
    } catch {
      return;
    }
    const mission = languageMissions.find((item) => item.id === id);
    if (!mission) return;
    setSelectedMission(mission);
    setPracticeStep("conversation");
    if (actor !== null) setAuthOpen(false);
  }, [
    actor,
    appState.activeModuleId,
    appState.selectedLanguage,
    appState.nativeLanguage,
    languageMissions,
    embeddedMissionPrefix,
  ]);

  const selectMission = (mission: SpeakingMission) => {
    if (!capture().isCurrent()) return;
    exitMission();
    setPracticeStep(embeddedMissionPrefix ? "conversation" : "hear");
    setSelectedMission(mission);
    appDispatch({
      type: "SET_SPEAKING_FOCUS",
      payload: { language: mission.language, missionId: mission.id, title: mission.title },
    });
  };

  // A Core 30 lesson can ask for its own mission (id prefix). Consume the request once on mount,
  // then select the first matching mission as soon as the catalog has it; otherwise drop it.
  const pendingMissionPrefixRef = useRef<string | null>(null);
  useEffect(() => {
    if (embeddedMissionPrefix) return;
    const prefix = consumeSpeakingMissionRequest();
    if (prefix) pendingMissionPrefixRef.current = prefix;
  }, [embeddedMissionPrefix]);
  useEffect(() => {
    const prefix = embeddedMissionPrefix ?? pendingMissionPrefixRef.current;
    if (!prefix) return;
    // Keep the request until the selection is visible in state: the language-reset effect above
    // can clear it once more (dev StrictMode re-runs effects), and this effect then re-applies it.
    const match = languageMissions.find((mission) => mission.id.startsWith(prefix));
    if (match && selectedMission?.id === match.id) {
      if (!embeddedMissionPrefix) pendingMissionPrefixRef.current = null;
      return;
    }
    if (!match) {
      pendingMissionPrefixRef.current = null;
      if (embeddedMissionPrefix && selectedMission) setSelectedMission(null);
      return;
    }
    // An embedded lesson can replace its mission while the previous one is active.
    stopActiveWork();
    sessionOwnerRef.current = null;
    setStarted(false);
    setTurns([]);
    setInterim("");
    setTypedTurn("");
    setObjectiveIds([]);
    setSkippedObjectiveIds([]);
    setStatus("ready");
    setSelectedMission(match);
    appDispatch({
      type: "SET_SPEAKING_FOCUS",
      payload: { language: match.language, missionId: match.id, title: match.title },
    });
  }, [languageMissions, selectedMission, appDispatch, embeddedMissionPrefix, stopActiveWork]);

  // A Core 30 lesson that sent the learner here leaves a return marker. Once that lesson's mission
  // has been on screen and is then left (back, closed after the debrief, or another mission
  // picked), send the learner back to the lesson. The marker stays for the lesson view to read.
  const lessonReturnArmedRef = useRef(false);
  useEffect(() => {
    if (embeddedMissionPrefix) return;
    const marker = readLessonReturn(browserReturnStorage(), Date.now());
    if (!marker || marker.section !== "say") {
      lessonReturnArmedRef.current = false;
      return;
    }
    if (selectedMission?.id.startsWith(lessonMissionPrefix(marker.moduleId, marker.lesson))) {
      lessonReturnArmedRef.current = true;
      return;
    }
    if (lessonReturnArmedRef.current) {
      lessonReturnArmedRef.current = false;
      appDispatch({ type: "SET_TAB", payload: "core30" });
    }
  }, [selectedMission, appDispatch, embeddedMissionPrefix]);

  const activeObjective = selectedMission?.objectives.find(
    (objective) =>
      !objectiveIds.includes(objective.id) && !skippedObjectiveIds.includes(objective.id),
  );

  const sendLearnerTurn = async (
    text: string,
    transcriptSourceOverride?: "dictation" | "typed",
  ) => {
    const lease = capture();
    if (
      !lease.isCurrent() ||
      !selectedMission ||
      requestRef.current ||
      sessionOwnerRef.current !== lifecycleKey
    )
      return;
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
    requestRef.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
    });
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && requestRef.current === controller;

    try {
      const history: Array<{ role: "user" | "assistant"; content: string }> = previousTurns
        .slice(-38)
        .map((turn) => ({
          role: turn.role === "learner" ? ("user" as const) : ("assistant" as const),
          content: turn.text,
        }));
      history.push({ role: "user", content: learnerText });
      const headers = await speakingRequestHeaders(
        { userId: actor ?? "", isCurrent: current },
        controller.signal,
      );
      if (!current()) return;
      const response = await fetch("/api/speak", {
        method: "POST",
        headers,
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

      if (!current()) {
        void response.body?.cancel().catch(() => {});
        return;
      }
      const payload = (await response.json()) as MissionTurnResponse | { error?: string };
      if (!current()) return;
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
      if (!current()) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setTurns((current) => current.filter((turn) => turn.id !== learnerTurn.id));
      setTypedTurn(learnerText);
      setTranscriptSource(learnerTranscriptSource ?? "typed");
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The mission partner could not respond.",
      );
    } finally {
      if (current()) requestRef.current = null;
      release();
    }
  };

  const startListening = () => {
    const lease = capture();
    if (
      !lease.isCurrent() ||
      recognitionRef.current ||
      requestRef.current ||
      sessionOwnerRef.current !== lifecycleKey
    )
      return;
    if (partnerSpeaking || status === "thinking") return;
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setErrorMessage(
        "Speech recognition is unavailable in this browser. Use keyboard dictation or type your answer, or open this website in Safari or Chrome.",
      );
      setStatus("error");
      return;
    }
    try {
      stopAudio();
      // iPhone can retain the device speech queue after its reply has ended.
      // Release it in this microphone tap before starting the next recognition.
      window.speechSynthesis?.cancel();
      const recognition = new Constructor();
      recognition.lang = missionLocale;
      recognition.continuous = false;
      recognition.interimResults = true;
      let ended = false;
      recognitionHasTextRef.current = false;
      const current = () => lease.isCurrent() && recognitionRef.current === recognition && !ended;
      const dispose = () => {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          stoppingRecognitionRef.current = null;
          cancelRecognitionRef.current = null;
          if (recognitionStopTimerRef.current !== null) {
            window.clearTimeout(recognitionStopTimerRef.current);
            recognitionStopTimerRef.current = null;
          }
        }
        if (finishRecognitionRef.current === finish) finishRecognitionRef.current = null;
        try {
          recognition.abort();
        } catch {
          /* Already stopped. */
        }
      };
      const release = lease.own(dispose);
      const finalResults = new Map<number, string>();
      let finalText = "";
      let latestInterimText = "";
      recognition.onresult = (event) => {
        if (!current()) return;
        let interimText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) finalResults.set(index, result[0].transcript);
          else interimText = `${interimText} ${result[0].transcript}`.trim();
        }
        finalText = [...finalResults]
          .sort(([a], [b]) => a - b)
          .map(([, value]) => value)
          .join(" ");
        if (interimText) latestInterimText = interimText;
        recognitionHasTextRef.current = Boolean(finalText.trim() || latestInterimText.trim());
        setInterim(interimText);
        if (stoppingRecognitionRef.current === recognition && finalText.trim()) finish();
      };
      recognition.onerror = (event) => {
        if (!current()) return;
        // Some browsers omit onend after an error. Release immediately so a new
        // user gesture can retry, and never auto-send a failed partial transcript.
        ended = true;
        release();
        dispose();
        setInterim("");
        setFinishingSpeech(false);
        const error = event?.error ?? "unknown";
        setStatus(error === "aborted" ? "ready" : "error");
        setErrorMessage(error === "aborted" ? null : speechRecognitionErrorMessage(error));
      };
      // iOS Safari can skip onend after partner audio played, so Stop also calls this directly.
      const finish = () => {
        if (!current()) return;
        ended = true;
        release();
        dispose();
        setInterim("");
        setFinishingSpeech(false);
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
        setStatus((current) => (current === "error" ? current : "ready"));
        setErrorMessage(
          "No transcript was returned. Use Test microphone to check the audio input, then retry, use keyboard dictation, or type your answer.",
        );
      };
      recognition.onend = finish;
      recognitionRef.current = recognition;
      finishRecognitionRef.current = finish;
      cancelRecognitionRef.current = () => {
        if (!current()) return;
        ended = true;
        release();
        dispose();
        setInterim("");
        setFinishingSpeech(false);
        setStatus("ready");
        setErrorMessage("Transcription cancelled. Your answer was not sent.");
      };
      try {
        recognition.start();
      } catch (error) {
        release();
        dispose();
        throw error;
      }
      setStatus("listening");
      setFinishingSpeech(false);
      setErrorMessage(null);
    } catch (error) {
      if (!lease.isCurrent()) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "The microphone could not start.");
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    const finish = finishRecognitionRef.current;
    if (!recognition || !finish) {
      setStatus((current) => (current === "listening" ? "ready" : current));
      return;
    }
    if (stoppingRecognitionRef.current === recognition) return;
    stoppingRecognitionRef.current = recognition;
    setFinishingSpeech(true);
    try {
      recognition.stop();
    } catch {
      finish();
      return;
    }
    if (recognitionRef.current !== recognition) return;
    recognitionStopTimerRef.current = window.setTimeout(
      () => {
        if (recognitionRef.current === recognition) finish();
      },
      recognitionHasTextRef.current ? STOP_FALLBACK_MS : TRANSCRIPT_WAIT_MS,
    );
  };

  const completedObjectiveCount =
    selectedMission?.objectives.filter((objective) => objectiveIds.includes(objective.id)).length ??
    0;
  const feedbackNotes = turns.flatMap((turn) => turn.feedback ?? []);
  const latestFeedback = feedbackNotes.at(-1) ?? null;

  useEffect(() => {
    if (
      !capture().isCurrent() ||
      sessionOwnerRef.current !== lifecycleKey ||
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
  }, [appDispatch, selectedMission, status, turns, capture, lifecycleKey]);

  const finishMission = () => {
    if (!capture().isCurrent()) return;
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

  const closeMission = () => {
    exitMission();
    if (embeddedMissionPrefix) onEmbeddedClose?.();
    else setSelectedMission(null);
  };

  if (!selectedMission && embeddedMissionPrefix) {
    return (
      <div role="status" className="mt-3 space-y-2 text-sm">
        <p>
          {languageMissions.some((mission) => mission.id.startsWith(embeddedMissionPrefix))
            ? "Preparing this lesson’s mission…"
            : "An AI mission is not available for this lesson and language pair yet. You can still rehearse the task and words here."}
        </p>
        <button type="button" className="min-h-11 underline" onClick={onEmbeddedClose}>
          Close practice
        </button>
      </div>
    );
  }
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
        <div className="mb-3">
          <h2 id="mission-preview-heading" className="font-serif text-xl">
            Your next speaking practice
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hear it. Try an answer. Have the conversation.
          </p>
        </div>
        {catalogModule &&
          (() => {
            const focusId = appState.speakingFocusByLanguage?.[missionLanguage]?.missionId;
            const next =
              catalogMissions.find((item) => item.id === focusId) ??
              visibleCatalogMissions.find((item) => item.sourceObjectiveId) ??
              visibleCatalogMissions[0];
            return next ? (
              <div
                role="group"
                aria-label="Recommended speaking practice"
                className="mb-3 rounded-2xl border border-gold/40 bg-gold/10 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {catalogModule.emoji} {catalogModule.name}
                </p>
                <h3 className="mt-2 line-clamp-2 font-serif text-xl">
                  {speakingCatalogTitle(next)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A short warm-up, then a focused conversation.
                </p>
                <button
                  type="button"
                  onClick={() => selectMission(next)}
                  className="mt-3 min-h-12 w-full rounded-xl bg-gold px-4 py-3 font-semibold text-black"
                >
                  {focusId === next.id ? "Continue practice" : "Start practice"}
                </button>
              </div>
            ) : null;
          })()}
        <details className="rounded-2xl border border-border p-3" open={!catalogModule}>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
            {catalogModule ? "Choose another mission or change settings" : "Choose your module"}
          </summary>
          <div className="mb-5">{accentControl}</div>
          {(catalogModule?.category === "Travel" ||
            (!catalogModule && catalogCategory === "Travel")) && (
            <div className="mb-5">
              <NextTripBanner
                compact
                onPracticeTravel={() => {
                  setCatalogModuleId(null);
                  setCatalogCategory("Travel");
                  setCatalogSearch("");
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Your destination adds local words and travel context. Choose your speaking accent
                separately above.
              </p>
            </div>
          )}
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
                  {catalogModule.id === "core-speaking" || !missionLanguage
                    ? catalogMissions.length
                    : speakingCatalogMissionCount(
                        languageMissions,
                        catalogModule.id,
                        missionLanguage,
                      )}{" "}
                  speaking missions
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
                        onClick={() => {
                          setCoreSection(section);
                          setRelationshipGroup("All");
                        }}
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
              {catalogModule.id === "core-speaking" && coreSection === "Relationships" && (
                <div
                  className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  role="group"
                  aria-label="Relationship conversations"
                >
                  {(["All", ...RELATIONSHIP_GROUPS] as const).map((group) => (
                    <button
                      key={group}
                      type="button"
                      aria-pressed={relationshipGroup === group}
                      onClick={() => setRelationshipGroup(group)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${relationshipGroup === group ? "border-gold bg-gold/15 text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {group === "All" ? "All relationships" : group}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleCatalogMissions.map((mission) => {
                  const specialty = specialtyStyle(mission.specialty);
                  return (
                    <button
                      key={mission.id}
                      data-testid="speaking-mission-card"
                      type="button"
                      onClick={() => selectMission(mission)}
                      className="rounded-2xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-gold/50 hover:bg-card"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span style={{ color: specialty.color }}>
                          {mission.relationshipGroup
                            ? `${specialty.label} · ${mission.relationshipGroup}`
                            : specialty.label}
                        </span>
                        <span className="text-muted-foreground">
                          {mission.level} · {mission.quickMinutes}–{mission.targetMinutes} min
                        </span>
                      </div>
                      <h3
                        className="mt-3 font-serif text-xl text-foreground"
                        data-testid={
                          speakingStageName(mission.moduleId)
                            ? "speak-catalog-stage-mission"
                            : undefined
                        }
                      >
                        {speakingCatalogTitle(mission)}
                      </h3>
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
                  const missionCount = missionLanguage
                    ? speakingCatalogMissionCount(languageMissions, module.id, missionLanguage)
                    : 0;
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
        </details>
      </section>
    );
  }

  if (!started) {
    const specialty = specialtyStyle(selectedMission.specialty);
    return (
      <section
        ref={(node) => {
          viewTopRef.current = node;
          practiceViewport.ref.current = node;
        }}
        style={practiceViewport.style}
        data-testid="focused-speaking-frame"
        className="scroll-mt-4 desktop:scroll-mt-24 flex min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4"
      >
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        <SpeakingConsentDialog
          open={consentOpen}
          saving={ageSaving}
          unknown={ageUnknown}
          onCheckSavedStatus={() => void checkSavedSpeakingConfirmation()}
          error={errorMessage}
          language={selectedMission.language}
          audioSource={partnerAudioSource}
          onOpenChange={setConsentOpen}
          onConfirm={() => void confirmAgeAndBegin()}
        />
        <button
          type="button"
          onClick={closeMission}
          className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />{" "}
          {embeddedMissionPrefix ? "Close practice" : "All missions"}
        </button>
        <div className="flex shrink-0 items-center justify-between gap-3 text-xs">
          <span style={{ color: specialty.color }}>
            {selectedMission.moduleEmoji} {selectedMission.moduleName} · {selectedMission.level}
          </span>
          <span className="text-muted-foreground">
            {selectedMission.quickMinutes}–{selectedMission.targetMinutes} min
          </span>
        </div>
        <h2 className="line-clamp-2 shrink-0 font-serif text-xl leading-tight text-foreground sm:text-2xl">
          {selectedMission.title}
        </h2>
        {practiceNotice && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-amber-400/45 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100"
          >
            {practiceNotice}
          </div>
        )}

        <div
          role="tablist"
          aria-label="Speaking practice steps"
          className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-background/60 p-1"
        >
          {SPEAKING_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={practiceStep === step.id}
              onClick={() => {
                stopAudio();
                setPracticeStep(step.id);
              }}
              className={`min-h-11 rounded-lg px-1 py-2 text-xs ${practiceStep === step.id ? "bg-gold text-black" : "text-muted-foreground"}`}
            >
              {step.label}
            </button>
          ))}
        </div>
        {practiceStep !== "conversation" ? (
          <SpeakingPreparation
            key={`${selectedMission.id}:${practiceStep}`}
            mission={selectedMission}
            step={practiceStep}
            audioReady={partnerAudioReady}
            play={(text) => void speakPartnerText(text)}
            stop={stopAudio}
            next={() => {
              stopAudio();
              setPracticeStep(practiceStep === "hear" ? "respond" : "conversation");
            }}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-3 text-sm text-muted-foreground">
              Use the words and goals you practiced in a short conversation. Start when you're
              ready.
            </p>
            <button
              type="button"
              onClick={requestMissionStart}
              disabled={!partnerAudioReady || ageSaving || Boolean(session && !ageLoaded)}
              className="min-h-12 w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-black shadow-lg shadow-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {!session
                ? "Sign in to start mission"
                : !ageLoaded
                  ? "Checking account…"
                  : "Start mission"}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              AI feedback and objective observations are advisory practice signals. They are not a
              proficiency score, certification, or saved mastery tier.
            </p>

            {!partnerAudioReady && (
              <button
                type="button"
                onClick={() => setPartnerAudioSource("text")}
                className="mt-2 min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                Continue with text only
              </button>
            )}
          </div>
        )}
        <details className="relative shrink-0 rounded-xl border border-border px-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm">
            Practice settings & reference
          </summary>
          <div className="absolute bottom-12 inset-x-0 z-30 max-h-[45dvh] overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl">
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {selectedMission.summary}
            </p>
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
              <details
                open={
                  !selectedMission.lessonTeaching ||
                  selectedMission.lessonTeaching.speaking.wordBank === "visible"
                }
              >
                <summary className="min-h-11 cursor-pointer py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Words you may use · reference
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedMission.vocabulary.map((word) => (
                    <span
                      key={word}
                      className="furigana-line rounded-md bg-muted/45 px-3 py-1 text-xs text-foreground/80"
                    >
                      {showFurigana ? (
                        <FuriganaText text={word} mode="above" script="hiragana" />
                      ) : showPinyin ? (
                        <PinyinText text={word} />
                      ) : (
                        word
                      )}
                    </span>
                  ))}
                </div>
              </details>
            </div>

            {selectedMission.specialty === "Travel" && (
              <div className="mt-4">
                <NextTripBanner compact />
              </div>
            )}

            <div className="mt-6 rounded-2xl border-2 border-gold/30 bg-background/50 p-4">
              <div className="mb-4 rounded-xl bg-gold/10 px-3 py-2 text-xs leading-relaxed text-foreground/85">
                <span className="font-semibold text-gold">Set your choices.</span> Tappable choices
                have strong borders; the selected choice is filled gold. The goals and words above
                are reference information, not buttons.
              </div>
              <div className="mb-4">{accentControl}</div>
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">
                  Choose partner audio
                </legend>
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
                  Phone voice uses a voice installed on this device. Google preselects a short list
                  for
                  {` ${voiceRegionLabel}`}. Text-only keeps every mission usable without playback.
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
                {ageUnknown ? (
                  <p role="status" className="text-muted-foreground">
                    Confirmation status is unconfirmed. Use Start to check its saved status.
                  </p>
                ) : session && (!ageLoaded || ageStatusActor !== session.user.id) ? (
                  <p className="text-muted-foreground">
                    Checking your saved speaking confirmation…
                  </p>
                ) : ageConfirmed ? (
                  <p className="flex items-center gap-2 text-emerald-300">
                    <Check className="h-4 w-4" aria-hidden="true" /> Speaking confirmation saved to
                    this account
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    The first time you tap Start, one large confirmation appears. Confirm once and
                    you will not be asked again.
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
                  Quick response feels more conversational. Review mode lets you correct what the
                  phone heard before the partner replies.
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
                    Matching {missionLocale} voices are shown when Google provides them. The app
                    preselects one for your partner choice; changing it is optional.
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
                    void speakPartnerText(
                      partnerVoiceSample(selectedMission.language, partnerVersion),
                    )
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
                  Start slower for comprehension, then repeat the same mission faster to train your
                  ear.
                </span>
              </label>
            </div>
          </div>
        </details>
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
          unknown={ageUnknown}
          onCheckSavedStatus={() => void checkSavedSpeakingConfirmation()}
          error={errorMessage}
          language={selectedMission.language}
          audioSource={partnerAudioSource}
          onOpenChange={setConsentOpen}
          onConfirm={() => void confirmAgeAndBegin()}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
          Mission recap
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
            onClick={closeMission}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />{" "}
            {embeddedMissionPrefix ? "Close practice" : "All missions"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={(node) => {
        viewTopRef.current = node;
        practiceViewport.ref.current = node;
      }}
      style={practiceViewport.style}
      data-testid="focused-speaking-frame"
      className="scroll-mt-4 desktop:scroll-mt-24 flex min-h-0 flex-col gap-2 overflow-hidden"
    >
      <div className="flex shrink-0 flex-nowrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Mission in progress
          </p>
          <h2 className="line-clamp-2 font-serif text-lg leading-tight text-foreground">
            {selectedMission.title}
          </h2>
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

      <div
        ref={transcriptRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/40 p-3"
        aria-label="Conversation"
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
                      reading={readingScript}
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

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div
        role="group"
        aria-label="Conversation microphone"
        className="flex shrink-0 flex-col items-center gap-1 text-center"
      >
        {partnerSpeaking && (
          <button
            type="button"
            onClick={stopAudio}
            className="min-h-11 rounded-full border border-gold/40 px-5 py-2 text-sm text-gold"
          >
            Stop reply — my turn
          </button>
        )}
        {recognitionSupported === false ? (
          <p className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
            Speech recognition is unavailable in this browser. Use the typed answer field below.
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
              disabled={status === "thinking" || partnerSpeaking || finishingSpeech}
              aria-label={
                finishingSpeech
                  ? "Finishing transcription"
                  : status === "listening"
                    ? "Stop listening"
                    : "Start listening"
              }
              className={
                "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40 " +
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
                ? finishingSpeech
                  ? "Finishing transcription…"
                  : "Listening… tap Stop when you finish"
                : partnerSpeaking
                  ? "Partner is speaking… your microphone will unlock afterward"
                  : status === "thinking"
                    ? "Partner is replying…"
                    : `Your turn — tap the microphone and answer in ${selectedMission.language}`}
            </p>
          </>
        )}
        {finishingSpeech && (
          <button
            type="button"
            onClick={() => cancelRecognitionRef.current?.()}
            className="min-h-11 rounded-full border px-4 py-2 text-sm"
          >
            Cancel transcription
          </button>
        )}
      </div>

      {transcriptSource === "dictation" && typedTurn.trim() && (
        <div
          role="status"
          className="shrink-0 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 py-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            Review what your phone heard
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            Edit below, then tap Send to approve.
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
        className="flex shrink-0 gap-2"
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

      <details className="relative shrink-0 rounded-xl border border-border px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm">
          Practice tools & coaching
        </summary>
        <div className="absolute bottom-12 inset-x-0 z-30 max-h-[45dvh] overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl">
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
                      current.includes(activeObjective.id)
                        ? current
                        : [...current, activeObjective.id],
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
              <details
                open={
                  !selectedMission.lessonTeaching ||
                  selectedMission.lessonTeaching.speaking.wordBank === "visible"
                }
                className="mt-2 text-xs leading-relaxed text-muted-foreground"
              >
                <summary className="min-h-11 cursor-pointer py-3">Useful words</summary>
                <p>{selectedMission.vocabulary.slice(0, 6).join(" · ")}</p>
              </details>
            )}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Press and hold any dialogue word for its definition.
          </p>{" "}
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {spokenTurnFlow === "quick"
              ? "Quick response sends when your phone detects that you finished speaking."
              : "Review mode waits for you to approve the transcript."}{" "}
            You can also use the iPhone keyboard microphone in this answer box.
          </p>{" "}
          {started &&
            session &&
            ageConfirmed &&
            ageStatusActor === session.user.id &&
            !ageUnknown &&
            sessionOwnerRef.current === lifecycleKey && (
              <WatchTalkControl
                key={`${lifecycleKey}:${missionLocale}`}
                locale={missionLocale ?? selectedMission.locale}
                title={selectedMission.title}
                ready={status === "ready" && !partnerSpeaking && !typedTurn.trim()}
                onTurn={(text) => {
                  const lease = capture();
                  if (
                    !lease.isCurrent() ||
                    sessionOwnerRef.current !== lifecycleKey ||
                    status !== "ready" ||
                    partnerSpeaking ||
                    typedTurn.trim()
                  )
                    return;
                  if (spokenTurnFlow === "quick")
                    gated(() => void sendLearnerTurn(text, "dictation"));
                  else {
                    setTypedTurn(text);
                    setTranscriptSource("dictation");
                  }
                }}
              />
            )}
          <MicrophoneTestDialog
            key={lifecycleKey}
            disabled={status === "listening" || status === "thinking" || partnerSpeaking}
          />
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
        </div>
      </details>

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
