import {
  DEFAULT_STANDARD_VOICES,
  readStandardVoiceSettings,
  standardGoogleVoice,
  type StandardVoiceSettings,
} from "@/data/standard-voices";
import { encodeGoogleVoicePreference } from "@/data/mission-tts";
import { getMissionTtsCapabilities } from "@/lib/mission-tts";
import { useAuth } from "@/state/auth-state";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Language } from "./app-state";
import { decodeGoogleVoicePreference } from "@/data/mission-tts";
import { accentsFor, defaultAccentFor, type AccentOption } from "@/lib/speech-accents";
import { DEVICE_DEFAULT_VOICE } from "@/data/mobile-voice";
import { configureUtterance } from "@/lib/voices";
import { hasRecordedListeningAudio, needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";
import {
  listeningIssueCopy,
  listeningNoticeId,
  planListening,
  rememberedHdVoice,
  type ListeningIssueReason,
  type ListeningPlan,
  type ListeningPlaybackSource,
  type RememberedHdVoice,
} from "@/lib/listening-audio";

export type SpeechMode = "word" | "sentence" | "paragraph";

export type { AccentOption };
export { ACCENTS_BY_LANGUAGE } from "@/lib/speech-accents";

interface PlaybackInfo {
  mode: SpeechMode;
  sentenceIndex: number; // -1 for word mode
  text: string;
}

interface SpeechCtx {
  // Settings
  rate: number;
  setRate: (n: number) => void;
  accent: string;
  setAccent: (code: string) => void;
  accentsForLanguage: AccentOption[];
  voiceURI: string | null;
  setVoiceURI: (uri: string | null) => void;
  /**
   * Counts the learner's own voice picks. A voice that only finished resolving (the voice list
   * loaded, the connection came back) leaves it unchanged, so audio that is already playing is
   * not cut off for it.
   */
  voiceChoice: number;
  settingsHydrated: boolean;
  voiceSettings: StandardVoiceSettings;
  setVoiceSettings: (patch: Partial<StandardVoiceSettings>) => void;

  // Listening route: HD voice (recorded audio, then the HD cloud voice) or this device's voice.
  /** The route for the learner's accent, for labels. */
  listening: ListeningPlan;
  /** The route right now for a locale of the language being learned (defaults to the accent). */
  listeningPlan: (locale?: string) => ListeningPlan;
  /** True while the learner has let this device's voice fill in for unavailable HD audio. */
  listeningFallback: boolean;
  /**
   * HD audio could not play: say so, and offer a retry or this device's voice.
   * The notice belongs to the playback that failed. Its buttons work once, and only while
   * `isCurrent` holds and it is still the standing notice; after that neither the retry nor
   * the switch to this device's voice happens. Returns a function that withdraws the notice.
   */
  reportListeningIssue: (
    reason: ListeningIssueReason | undefined,
    retry: () => void,
    isCurrent: () => boolean,
  ) => () => void;
  /** Audio became audible: clear a standing notice; HD playing again ends the device fill-in. */
  noteListeningPlayed: (source?: ListeningPlaybackSource) => void;
  /**
   * Withdraws the standing notice about reading (word, sentence, passage) that could not play
   * in HD. For a surface that now shows something else; playback itself is not touched.
   */
  forgetReadingNotice: () => void;

  // Last clicked word (from WordCard)
  lastWord: string | null;
  setLastWord: (w: string) => void;

  // Bounded history of recently looked-up words, most recent first.
  recentWords: string[];

  // Live playback
  playing: boolean;
  current: PlaybackInfo | null;
  activeSentenceIndex: number; // -1 if none

  // Controls
  speakWord: (word?: string) => void;
  speakSentence: (text: string, sentenceIndex: number) => void;
  speakSentences: (
    sentences: { text: string; index: number }[],
    onMove?: (i: number) => void,
  ) => void;
  stop: () => void;

  listenedCount: number;
}

const Ctx = createContext<SpeechCtx | null>(null);

const ACHIEVEMENT_LISTENER = "Good Listener 👂";
interface SavedSpeech {
  rate?: number;
  listenedCount?: number;
  voiceByLang?: Record<string, string>;
  accentByLang?: Record<string, string>;
  standardVoicesByLang?: Record<string, StandardVoiceSettings>;
  hdVoiceByLang?: Record<string, RememberedHdVoice>;
}
const RECENT_WORDS_CAP = 20;

export function SpeechProvider({
  children,
  language,
  onXp,
  onAchievement,
  hasAchievement,
}: {
  children: ReactNode;
  language: Language;
  onXp: (n: number) => void;
  onAchievement: (name: string) => void;
  hasAchievement: (name: string) => boolean;
}) {
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const playbackActorRef = useRef(actor);
  playbackActorRef.current = actor;
  const mountedRef = useRef(false);
  const playbackEpochRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Array<{ text: string; index: number }>>([]);
  const cancelledRef = useRef(true);
  const listenedCountRef = useRef(0);
  const ownsPlayback = useCallback(
    () =>
      mountedRef.current &&
      playbackActorRef.current === actor &&
      (actor === null || isCurrentUser(actor)),
    [actor, isCurrentUser],
  );
  // The standing "HD voice could not play this" notice, by serial (0: none). A notice's buttons
  // work once, and only while it is still the standing notice for the playback that raised it.
  const noticeSerialRef = useRef(0);
  const standingNoticeRef = useRef(0);
  const dismissListeningNotice = useCallback(() => {
    const serial = standingNoticeRef.current;
    standingNoticeRef.current = 0;
    if (serial) toast.dismiss(listeningNoticeId(serial));
  }, []);
  // Withdraws the notice raised by this provider's own reading (word, sentence, passage).
  const readingNoticeRef = useRef<(() => void) | null>(null);
  const forgetReadingNotice = useCallback(() => {
    const withdraw = readingNoticeRef.current;
    readingNoticeRef.current = null;
    withdraw?.();
  }, []);
  const invalidatePlayback = useCallback(() => {
    playbackEpochRef.current += 1;
    cancelledRef.current = true;
    queueRef.current = [];
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    // Reading that was stopped or replaced has nothing left to retry.
    forgetReadingNotice();
  }, [forgetReadingNotice]);
  const device = useLearnerDeviceStore("speech");
  const recentDevice = useLearnerDeviceStore("heardWords");
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const accentsForLanguage = accentsFor(language);
  const defaultAccent = defaultAccentFor(language);
  const [rate, setRateState] = useState(1);
  const [accent, setAccentState] = useState(defaultAccent);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const voiceURIRef = useRef(voiceURI);
  voiceURIRef.current = voiceURI;
  const [voiceChoice, setVoiceChoice] = useState(0);
  const [voiceSettings, setVoiceSettingsState] = useState(DEFAULT_STANDARD_VOICES);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const voiceSettingsRef = useRef(voiceSettings);
  voiceSettingsRef.current = voiceSettings;
  // "Use device voice" on an HD notice: this device's voice fills in until HD audio plays
  // again. Never saved; a reload, another account, language or voice setting starts strict.
  const [listeningFallback, setListeningFallbackState] = useState(false);
  const listeningFallbackRef = useRef(false);
  const setListeningFallback = useCallback((allowed: boolean) => {
    listeningFallbackRef.current = allowed;
    setListeningFallbackState(allowed);
  }, []);
  const voiceLanguageRef = useRef(language);
  const [lastWord, setLastWordState] = useState<string | null>(null);
  const [recentWords, setRecentWords] = useState<string[]>([]);
  const [current, setCurrent] = useState<PlaybackInfo | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [listenedCount, setListenedCount] = useState(0);

  // Hydrate
  useEffect(() => {
    try {
      const raw = device.read();
      if (raw) {
        const parsed = raw as SavedSpeech;
        if (typeof parsed.rate === "number") setRateState(parsed.rate);
        if (Number.isSafeInteger(parsed.listenedCount) && (parsed.listenedCount ?? -1) >= 0) {
          listenedCountRef.current = parsed.listenedCount!;
          setListenedCount(parsed.listenedCount!);
        }
        if (parsed.voiceByLang && typeof parsed.voiceByLang === "object") {
          const v = parsed.voiceByLang[language];
          if (typeof v === "string") setVoiceURIState(v);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSettingsHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  // Persist
  useEffect(() => {
    if (!settingsHydrated || voiceLanguageRef.current !== language) return;
    try {
      const raw = device.read();
      const prev = (raw as SavedSpeech | null) ?? {};
      const voiceByLang = { ...(prev.voiceByLang ?? {}) };
      if (voiceURI) voiceByLang[language] = voiceURI;
      else delete voiceByLang[language];
      device.write({
        ...prev,
        rate,
        listenedCount,
        voiceByLang,
        standardVoicesByLang: { ...prev.standardVoicesByLang, [language]: voiceSettings },
      });
    } catch {
      /* ignore */
    }
  }, [device, rate, listenedCount, voiceURI, language, settingsHydrated, voiceSettings]);

  // The account-keyed provider remounts on identity change. Never hydrate another learner's history.
  useEffect(() => {
    const saved = recentDevice.read();
    setRecentWords(
      Array.isArray(saved)
        ? saved.filter((w): w is string => typeof w === "string").slice(0, RECENT_WORDS_CAP)
        : [],
    );
    setHistoryHydrated(true);
  }, [recentDevice]);

  useEffect(() => {
    if (historyHydrated) recentDevice.write(recentWords);
  }, [recentDevice, recentWords, historyHydrated]);

  // Reset accent + voice when language changes (load voice for new language)
  useEffect(() => {
    voiceLanguageRef.current = language;
    try {
      const raw = device.read();
      const parsed = (raw as SavedSpeech | null) ?? {};
      setVoiceSettingsState(readStandardVoiceSettings(parsed.standardVoicesByLang?.[language]));
      setVoiceURIState(null);
      const savedAccent = parsed.accentByLang?.[language];
      setAccentState(
        typeof savedAccent === "string" &&
          accentsForLanguage.some((option) => option.code === savedAccent)
          ? savedAccent
          : defaultAccent,
      );
    } catch {
      setVoiceURIState(null);
      setVoiceSettingsState(DEFAULT_STANDARD_VOICES);
      setAccentState(defaultAccent);
    }
    invalidatePlayback();
    // Stop any active speech
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopRemoteTTS();
    setListeningFallback(false);
    dismissListeningNotice();
    setPlaying(false);
    setCurrent(null);
    setActiveSentenceIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, device]);

  // Invalidate queued text and callbacks before releasing this account subtree.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidatePlayback();
      // A notice never outlives the account it was raised for.
      dismissListeningNotice();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopRemoteTTS();
    };
  }, [invalidatePlayback, dismissListeningNotice]);

  const stop = useCallback(() => {
    invalidatePlayback();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopRemoteTTS();
    setPlaying(false);
    setCurrent(null);
    setActiveSentenceIndex(-1);
  }, [invalidatePlayback]);

  const setVoiceSettings = useCallback(
    (patch: Partial<StandardVoiceSettings>) => {
      stop();
      // A new voice choice starts strict again: nothing fills in unless the learner says so.
      setListeningFallback(false);
      dismissListeningNotice();
      // A new listening gender drops the previous gender's voice at once, so a quick tap is
      // never read by it while the new voice resolves. Speaking-only changes keep the voice.
      if (
        patch.listeningGender !== undefined &&
        patch.listeningGender !== voiceSettingsRef.current.listeningGender
      )
        setVoiceURIState((current) => (decodeGoogleVoicePreference(current) ? null : current));
      setVoiceSettingsState((current) => readStandardVoiceSettings({ ...current, ...patch }));
    },
    [stop, setListeningFallback, dismissListeningNotice],
  );

  // Standard Google listening voice on every platform. Signed-out learners and an unavailable
  // provider get no cloud voice; what plays then is decided by planListening (recorded audio,
  // an honest notice, or the device voice the learner chose). The account subtree owns this request.
  useEffect(() => {
    if (!settingsHydrated) return;
    const controller = new AbortController();
    if (!actor) {
      setVoiceURIState(DEVICE_DEFAULT_VOICE);
      return () => controller.abort();
    }
    const gender = voiceSettings.listeningGender;
    // The voice resolved earlier for this accent and gender is usable at once, and offline:
    // recorded and saved clips keep playing while the voice list cannot be fetched.
    const remembered = rememberedHdVoice(device.read(), language, accent, gender);
    if (remembered) setVoiceURIState(remembered);
    const refresh = () => {
      getMissionTtsCapabilities(accent, controller.signal)
        .then((capabilities) => {
          if (controller.signal.aborted || !isCurrentUser(actor)) return;
          const voice = capabilities.ready
            ? standardGoogleVoice(capabilities.voices, accent, gender)
            : null;
          const resolved = voice ? encodeGoogleVoicePreference(voice) : null;
          setVoiceURIState(resolved ?? DEVICE_DEFAULT_VOICE);
          // Remember it for this language only while the accent really belongs to it (a
          // language switch can run this once more with the previous accent).
          if (!accentsForLanguage.some((option) => option.code === accent)) return;
          try {
            const prev = (device.read() as SavedSpeech | null) ?? {};
            const hdVoiceByLang = { ...(prev.hdVoiceByLang ?? {}) };
            if (resolved) hdVoiceByLang[language] = { accent, gender, voiceURI: resolved };
            else delete hdVoiceByLang[language];
            device.write({ ...prev, hdVoiceByLang });
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && isCurrentUser(actor))
            setVoiceURIState(remembered ?? DEVICE_DEFAULT_VOICE);
        });
    };
    refresh();
    if (typeof window !== "undefined" && window.addEventListener)
      window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      if (typeof window !== "undefined" && window.removeEventListener)
        window.removeEventListener("online", refresh);
    };
  }, [
    actor,
    accent,
    voiceSettings.listeningGender,
    settingsHydrated,
    isCurrentUser,
    device,
    language,
    accentsForLanguage,
  ]);

  const setRate = useCallback((n: number) => {
    setRateState(n);
  }, []);
  const setAccent = useCallback(
    (c: string) => {
      setAccentState(c);
      setListeningFallback(false);
      dismissListeningNotice();
      // A prior voice selection must not silently keep a Spain accent after
      // the learner switches to Costa Rica, Mexico, or another locale.
      setVoiceURIState((current) =>
        current && !decodeGoogleVoicePreference(current) ? DEVICE_DEFAULT_VOICE : null,
      );
      try {
        const raw = device.read();
        const prev = (raw as SavedSpeech | null) ?? {};
        const accentByLang = { ...(prev.accentByLang ?? {}), [language]: c };
        device.write({ ...prev, accentByLang });
      } catch {
        /* ignore */
      }
    },
    [language, device, setListeningFallback, dismissListeningNotice],
  );
  const setVoiceURI = useCallback((uri: string | null) => {
    // Replacing a settled voice is the learner's own pick. Filling in a voice that had not
    // resolved yet is not a different voice for audio that is already playing.
    if (voiceURIRef.current !== null && uri !== voiceURIRef.current)
      setVoiceChoice((count) => count + 1);
    setVoiceURIState(uri);
  }, []);
  const setLastWord = useCallback((w: string) => {
    setLastWordState(w);
    const trimmed = w.trim();
    if (!trimmed) return;
    setRecentWords((prev) => {
      const deduped = prev.filter((existing) => existing !== trimmed);
      return [trimmed, ...deduped].slice(0, RECENT_WORDS_CAP);
    });
  }, []);

  // Read at call time so a retry started from the notice uses the policy as it is now.
  const listeningInputsRef = useRef({
    locale: accent,
    source: voiceSettings.listeningAudioSource,
    gender: voiceSettings.listeningGender,
    voiceURI,
    signedIn: actor !== null,
  });
  listeningInputsRef.current = {
    locale: accent,
    source: voiceSettings.listeningAudioSource,
    gender: voiceSettings.listeningGender,
    voiceURI,
    signedIn: actor !== null,
  };
  const listeningPlan = useCallback(
    (locale?: string) =>
      planListening({
        ...listeningInputsRef.current,
        locale: locale ?? listeningInputsRef.current.locale,
        // The learner's real account state and choice apply to any requested locale; the HD
        // choice itself covers the language being learned.
        learningLocale: listeningInputsRef.current.locale,
        deviceFallback: listeningFallbackRef.current,
      }),
    [],
  );
  const listening = useMemo(
    () =>
      planListening({
        locale: accent,
        source: voiceSettings.listeningAudioSource,
        gender: voiceSettings.listeningGender,
        voiceURI,
        signedIn: actor !== null,
        deviceFallback: listeningFallback,
      }),
    [
      accent,
      voiceSettings.listeningAudioSource,
      voiceSettings.listeningGender,
      voiceURI,
      actor,
      listeningFallback,
    ],
  );

  const reportListeningIssue = useCallback(
    (reason: ListeningIssueReason | undefined, retry: () => void, isCurrent: () => boolean) => {
      // The playback that failed must still be this learner's, and still what its surface asked
      // for: not stopped, not replaced, not left behind for another card, text or page.
      const owned = () => ownsPlayback() && isCurrent();
      if (!owned()) return () => {};
      // One notice at a time: the newer miss takes the older one's place.
      dismissListeningNotice();
      const serial = ++noticeSerialRef.current;
      standingNoticeRef.current = serial;
      /** Takes the notice. True once, while it is still standing and still owned. */
      const claim = () => {
        if (standingNoticeRef.current !== serial) return false;
        standingNoticeRef.current = 0;
        return owned();
      };
      const issue = reason ?? "unavailable";
      const copy = listeningIssueCopy(issue);
      toast(copy.title, {
        id: listeningNoticeId(serial),
        description: copy.description,
        duration: 12000,
        // On a phone the practice controls sit at the bottom; keep the notice off them.
        ...(typeof window !== "undefined" && window.matchMedia?.("(max-width: 600px)").matches
          ? { position: "top-center" as const }
          : {}),
        action: {
          label: "Try again",
          onClick: () => {
            if (claim()) retry();
          },
        },
        // Nothing but the learner's own choice puts a device voice in place of HD audio, and
        // only for playback that is still theirs: a notice that has been withdrawn changes
        // nothing and plays nothing.
        ...(issue === "loading"
          ? {}
          : {
              cancel: {
                label: "Use device voice",
                onClick: () => {
                  if (!claim()) return;
                  setListeningFallback(true);
                  retry();
                },
              },
            }),
      });
      return () => {
        if (standingNoticeRef.current === serial) dismissListeningNotice();
      };
    },
    [ownsPlayback, setListeningFallback, dismissListeningNotice],
  );

  /** A notice for this provider's own reading: gone with the next stop, start or text. */
  const reportReadingIssue = useCallback(
    (reason: ListeningIssueReason, retry: () => void) => {
      const epoch = playbackEpochRef.current;
      forgetReadingNotice();
      readingNoticeRef.current = reportListeningIssue(
        reason,
        retry,
        () => epoch === playbackEpochRef.current,
      );
    },
    [reportListeningIssue, forgetReadingNotice],
  );

  const noteListeningPlayed = useCallback(
    (source?: ListeningPlaybackSource) => {
      if (!ownsPlayback()) return;
      dismissListeningNotice();
      // The HD voice is answering again: stop letting the device voice fill in.
      if (source === "hd" && listeningFallbackRef.current) setListeningFallback(false);
    },
    [ownsPlayback, setListeningFallback, dismissListeningNotice],
  );

  const incListened = useCallback(() => {
    if (!ownsPlayback()) return;
    const next = listenedCountRef.current + 1;
    listenedCountRef.current = next;
    setListenedCount(next);
    onXp(1);
    if (next === 10 && !hasAchievement(ACHIEVEMENT_LISTENER)) {
      onAchievement(ACHIEVEMENT_LISTENER);
      toast("👂 Achievement unlocked", {
        description: `${ACHIEVEMENT_LISTENER} — 10 sentences read aloud`,
      });
    }
  }, [hasAchievement, onAchievement, onXp, ownsPlayback]);

  const speakOne = useCallback(
    (
      text: string,
      sentenceIndex: number,
      mode: SpeechMode,
      onEnd?: () => void,
      /** HD audio could not play and nothing else was played: stop here and offer a retry. */
      onUnavailable?: (reason: ListeningIssueReason) => void,
    ) => {
      const epoch = playbackEpochRef.current;
      const valid = () =>
        ownsPlayback() && epoch === playbackEpochRef.current && !cancelledRef.current;
      if (typeof window === "undefined" || !valid()) return;
      let settled = false;
      const finish = (heard: boolean) => {
        if (settled || !valid()) return;
        settled = true;
        if (heard && sentenceIndex >= 0) incListened();
        onEnd?.();
      };
      const plan = listeningPlan(accent);
      // HD routes go through the shared router (recorded audio, then the HD voice), which also
      // reports an HD-only miss. Once a signed-out learner has allowed the device voice, the
      // device path is left only for a recording that really exists.
      const routed =
        plan.strict ||
        plan.mode === "hd" ||
        (plan.recordedGender !== null &&
          hasRecordedListeningAudio(text, accent, plan.recordedGender)) ||
        needsRemoteTTS(accent, plan.voiceURI);
      if (routed) {
        setPlaying(true);
        setCurrent({ mode, sentenceIndex, text });
        if (sentenceIndex >= 0) setActiveSentenceIndex(sentenceIndex);
        void speakRemote(text, accent, {
          rate,
          voiceURI: plan.voiceURI,
          cloudOnly: plan.strict,
          recordedGender: plan.recordedGender ?? undefined,
          unavailableReason: plan.pending ?? undefined,
          owner: { userId: actor ?? "", isCurrent: valid },
          onPlaybackStart: (source) => {
            if (valid()) noteListeningPlayed(source);
          },
          onend: () => finish(true),
          onerror: (reason) => {
            if (!plan.strict || !onUnavailable) {
              finish(false);
              return;
            }
            if (settled || !valid()) return;
            settled = true;
            onUnavailable(reason ?? "unavailable");
          },
        });
        return;
      }
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      configureUtterance(u, accent, plan.voiceURI);
      u.rate = rate;
      u.onstart = () => {
        if (!valid() || settled) return;
        setPlaying(true);
        setCurrent({ mode, sentenceIndex, text });
        if (sentenceIndex >= 0) setActiveSentenceIndex(sentenceIndex);
      };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      try {
        window.speechSynthesis.speak(u);
      } catch {
        finish(false);
      }
    },
    [accent, rate, incListened, ownsPlayback, actor, listeningPlan, noteListeningPlayed],
  );

  // Retries started from the notice call the newest controls, never a stale closure.
  const controlsRef = useRef<{
    speakWord: (word?: string) => void;
    speakSentence: (text: string, sentenceIndex: number) => void;
    speakSentences: (
      sentences: { text: string; index: number }[],
      onMove?: (i: number) => void,
    ) => void;
  } | null>(null);

  const speakWord = useCallback(
    (word?: string) => {
      if (!ownsPlayback()) return;
      const target = (word ?? lastWord ?? "").trim();
      if (!target) {
        toast("No word selected yet", {
          description: "Click a word in the reader first.",
        });
        return;
      }
      stop();
      cancelledRef.current = false;
      const epoch = playbackEpochRef.current;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!ownsPlayback() || epoch !== playbackEpochRef.current || cancelledRef.current) return;
        const reset = () => {
          setPlaying(false);
          setCurrent(null);
        };
        speakOne(target, -1, "word", reset, (reason) => {
          reset();
          reportReadingIssue(reason, () => controlsRef.current?.speakWord(target));
        });
      }, 30);
    },
    [lastWord, speakOne, stop, ownsPlayback, reportReadingIssue],
  );

  const speakSentence = useCallback(
    (text: string, sentenceIndex: number) => {
      if (!ownsPlayback()) return;
      stop();
      cancelledRef.current = false;
      const epoch = playbackEpochRef.current;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!ownsPlayback() || epoch !== playbackEpochRef.current || cancelledRef.current) return;
        const reset = () => {
          setPlaying(false);
          setCurrent(null);
          setActiveSentenceIndex(-1);
        };
        speakOne(text, sentenceIndex, "sentence", reset, (reason) => {
          reset();
          reportReadingIssue(reason, () => controlsRef.current?.speakSentence(text, sentenceIndex));
        });
      }, 30);
    },
    [speakOne, stop, ownsPlayback, reportReadingIssue],
  );

  const speakSentences = useCallback(
    (sentences: { text: string; index: number }[], onMove?: (i: number) => void) => {
      if (!ownsPlayback() || sentences.length === 0) return;
      stop();
      cancelledRef.current = false;
      queueRef.current = [...sentences];

      const epoch = playbackEpochRef.current;
      const valid = () =>
        ownsPlayback() && epoch === playbackEpochRef.current && !cancelledRef.current;
      const next = () => {
        if (!valid()) return;
        const item = queueRef.current.shift();
        if (!item) {
          setPlaying(false);
          setCurrent(null);
          setActiveSentenceIndex(-1);
          return;
        }
        onMove?.(item.index);
        if (!valid()) return;
        speakOne(item.text, item.index, "paragraph", next, (reason) => {
          // Do not run on through the passage in silence: stop at the sentence that could
          // not play in HD, and resume from it when the learner retries.
          const rest = [item, ...queueRef.current];
          stop();
          reportReadingIssue(reason, () => controlsRef.current?.speakSentences(rest, onMove));
        });
      };

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        next();
      }, 30);
    },
    [speakOne, stop, ownsPlayback, reportReadingIssue],
  );
  controlsRef.current = { speakWord, speakSentence, speakSentences };

  const value = useMemo(
    () => ({
      rate,
      setRate,
      accent,
      setAccent,
      accentsForLanguage,
      voiceURI,
      setVoiceURI,
      voiceChoice,
      settingsHydrated,
      voiceSettings,
      setVoiceSettings,
      listening,
      listeningPlan,
      listeningFallback,
      reportListeningIssue,
      noteListeningPlayed,
      forgetReadingNotice,
      lastWord,
      setLastWord,
      recentWords,
      playing,
      current,
      activeSentenceIndex,
      speakWord,
      speakSentence,
      speakSentences,
      stop,
      listenedCount,
    }),
    [
      rate,
      setRate,
      accent,
      setAccent,
      accentsForLanguage,
      voiceURI,
      setVoiceURI,
      voiceChoice,
      settingsHydrated,
      voiceSettings,
      setVoiceSettings,
      listening,
      listeningPlan,
      listeningFallback,
      reportListeningIssue,
      noteListeningPlayed,
      forgetReadingNotice,
      lastWord,
      setLastWord,
      recentWords,
      playing,
      current,
      activeSentenceIndex,
      speakWord,
      speakSentence,
      speakSentences,
      stop,
      listenedCount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeech() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpeech must be used inside SpeechProvider");
  return c;
}
