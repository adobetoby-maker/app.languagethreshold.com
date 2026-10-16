import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/state/app-state";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { LibraryProvider } from "@/state/library-state";
import { NotesProvider } from "@/state/notes-state";
import { GrammarProvider } from "@/state/grammar-state";
import { FlashcardProvider } from "@/state/flashcard-state";
import { SpeechProvider } from "@/state/speech-state";
import { SpeakProvider } from "@/state/speak-state";
import { TutorProvider } from "@/state/tutor-state";
import { MatchProvider } from "@/state/match-state";
import { LeaderboardProvider } from "@/state/leaderboard-state";
import { ConjugationProvider } from "@/state/conjugation-state";
import { SentenceBuildProvider } from "@/state/sentence-build-state";
import { ListeningDrillProvider } from "@/state/listening-drill-state";
import { WordMatchProvider } from "@/state/word-match-state";
import { IdiomMasterProvider } from "@/state/idiom-master-state";
import { FalseFriendsProvider } from "@/state/false-friends-state";
import { DailyChallengeProvider } from "@/state/daily-challenge-state";
import { DailyChallengeBridge } from "@/components/games/DailyChallengeBridge";
import { TopNav } from "@/components/TopNav";
import { AppSidebar } from "@/components/AppSidebar";
import { SaveProgressBanner } from "@/components/SaveProgressBanner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { SubscriptionProvider } from "@/state/subscription-state";
import { AiGateProvider } from "@/state/ai-gate-state";
import { TabShell } from "@/components/TabShell";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import { LevelUpOverlay } from "@/components/LevelUpOverlay";
import { CefrCompletionBridge } from "@/components/CefrCompletionBridge";
import { MatchmakingOverlay } from "@/components/match/MatchmakingOverlay";
import { MatchAchievementsBridge } from "@/components/match/MatchAchievementsBridge";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { FirstRunEntry } from "@/components/onboarding/FirstRunEntry";
import { PushReminderSync } from "@/components/PushReminderSync";
import { GlobalVocabCapture } from "@/components/vocab/GlobalVocabCapture";
import { TeamActivityBridge } from "@/components/team/TeamActivityBridge";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { learningLinkIdentity } from "@/lib/learning-link";
import { useLessonReturnGuard } from "@/lib/lesson-return";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Language Threshold — A Premium Language Learning Experience" },
      {
        name: "description",
        content:
          "Language Threshold is an editorial, immersive way to learn Spanish, French, German, Italian, Japanese, Korean and Portuguese.",
      },
    ],
  }),
});

function GatedTabShell() {
  const { state } = useApp();
  useLessonReturnGuard(state.currentTab);
  return (
    <SubscriptionGate currentTab={state.currentTab}>
      <TabShell />
    </SubscriptionGate>
  );
}

// Apply learning links after account restoration, so saved state cannot replace the assignment.
// This powers the "Start Free →" CTAs from the marketing site.
function UrlModuleBridge() {
  const { state, dispatch, profileReadyUserId } = useApp();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    const identity = learningLinkIdentity({
      hydrated: state.hydrated,
      authLoading,
      userId,
      profileReadyUserId,
      appliedFor: appliedFor.current,
    });
    if (identity === null) return;
    appliedFor.current = identity;
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get("module");
    const tab = params.get("tab");
    const linkedModule = getModule(moduleId);
    const targetLanguage =
      linkedModule?.learnDirection === "en-target" ? "English" : linkedModule?.languages?.[0];
    if (
      targetLanguage &&
      (linkedModule?.learnDirection === "en-target" ||
        !linkedModule?.languages?.includes(state.selectedLanguage)) &&
      state.selectedLanguage !== targetLanguage
    ) {
      dispatch({ type: "SET_LANGUAGE", payload: targetLanguage });
    }
    const requestedTarget = params.get("target") as Language,
      requestedNative = params.get("native") as NativeLanguage;
    if (
      linkedModule &&
      LANGUAGES.includes(requestedTarget) &&
      NATIVE_LANGUAGES.includes(requestedNative) &&
      moduleSupportsLearningPair(linkedModule, requestedTarget, requestedNative)
    ) {
      if (state.selectedLanguage !== requestedTarget)
        dispatch({ type: "SET_LANGUAGE", payload: requestedTarget });
      if (state.nativeLanguage !== requestedNative)
        dispatch({ type: "SET_NATIVE_LANGUAGE", payload: requestedNative });
    }
    if (linkedModule && linkedModule.id !== state.activeModuleId) {
      dispatch({ type: "PURCHASE_MODULE", payload: linkedModule.id });
      dispatch({ type: "SET_ACTIVE_MODULE", payload: linkedModule.id });
      if (moduleId === "lds-missionary") {
        dispatch({ type: "SET_TAB", payload: "discussions" });
      }
    }
    const allowedTabs = new Set([
      "reader",
      "grammar",
      "speak",
      "dashboard",
      "modules",
      "games",
      "flashcards",
      "guide",
      "core30",
      "exams",
    ]);
    if (tab && allowedTabs.has(tab)) {
      dispatch({
        type: "SET_TAB",
        payload: tab as
          | "reader"
          | "grammar"
          | "speak"
          | "dashboard"
          | "modules"
          | "games"
          | "flashcards"
          | "guide"
          | "core30"
          | "exams",
      });
    }
    // Apply the URL once per identity, after local and cloud state are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, authLoading, userId, profileReadyUserId]);

  return null;
}

function SpeechBridge({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();
  return (
    <SpeechProvider
      language={state.selectedLanguage}
      onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
      onAchievement={(name) => dispatch({ type: "ADD_ACHIEVEMENT", payload: name })}
      hasAchievement={(name) => state.achievements.includes(name)}
    >
      {children}
    </SpeechProvider>
  );
}

function SpeakBridge({ children }: { children: ReactNode }) {
  const { state } = useApp();
  return <SpeakProvider language={state.selectedLanguage}>{children}</SpeakProvider>;
}

function Index() {
  const [matchOpen, setMatchOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  // Lets non-prop-connected children (e.g. GamesHub tab) open the overlay.
  useEffect(() => {
    const handler = () => setMatchOpen(true);
    window.addEventListener("lt:open-match", handler);
    return () => window.removeEventListener("lt:open-match", handler);
  }, []);
  useEffect(() => {
    const handler = () => setPersonalizationOpen(true);
    window.addEventListener("lt:open-personalization", handler);
    return () => window.removeEventListener("lt:open-personalization", handler);
  }, []);
  return (
    <AuthProvider>
      <AppProvider>
        <SubscriptionProvider>
          <AiGateProvider>
            <MatchProvider>
              <LeaderboardProvider>
                <LibraryProvider>
                  <NotesProvider>
                    <GrammarProvider>
                      <FlashcardProvider>
                        <SpeechBridge>
                          <SpeakBridge>
                            <TutorProvider>
                              <ConjugationProvider>
                                <SentenceBuildProvider>
                                  <ListeningDrillProvider>
                                    <WordMatchProvider>
                                      <IdiomMasterProvider>
                                        <FalseFriendsProvider>
                                          <DailyChallengeProvider>
                                            <div className="flex min-h-screen bg-background text-foreground">
                                              {/* Left sidebar (desktop) + bottom nav (mobile) */}
                                              <AppSidebar onOpenMatch={() => setMatchOpen(true)} />

                                              {/* Main column */}
                                              <div className="flex min-w-0 flex-1 flex-col">
                                                <TopNav />
                                                <SaveProgressBanner />
                                                {/* Shared bottom-strip budget reserves the nav,
                                              Tutor action, and Reader mini-player together. */}
                                                <main className="lt-scroll-safe lt-safe-top-main flex-1 overflow-y-auto px-4 pb-6 sm:px-6 sm:pb-10">
                                                  <GatedTabShell />
                                                </main>
                                              </div>
                                            </div>

                                            <FirstRunEntry />
                                            {personalizationOpen && (
                                              <OnboardingWizard
                                                onClose={() => setPersonalizationOpen(false)}
                                              />
                                            )}
                                            <UrlModuleBridge />
                                            <TutorPanel />
                                            <LevelUpOverlay />
                                            <CefrCompletionBridge />
                                            <MatchmakingOverlay
                                              open={matchOpen}
                                              onClose={() => setMatchOpen(false)}
                                            />
                                            <MatchAchievementsBridge />
                                            <DailyChallengeBridge />
                                            <PushReminderSync />
                                            <GlobalVocabCapture />
                                            <TeamActivityBridge />
                                          </DailyChallengeProvider>
                                        </FalseFriendsProvider>
                                      </IdiomMasterProvider>
                                    </WordMatchProvider>
                                  </ListeningDrillProvider>
                                </SentenceBuildProvider>
                              </ConjugationProvider>
                            </TutorProvider>
                            <Toaster
                              theme="dark"
                              position="bottom-right"
                              toastOptions={{
                                style: {
                                  background: "var(--card)",
                                  color: "var(--foreground)",
                                  border:
                                    "1px solid color-mix(in oklab, var(--gold) 40%, transparent)",
                                },
                              }}
                            />
                          </SpeakBridge>
                        </SpeechBridge>
                      </FlashcardProvider>
                    </GrammarProvider>
                  </NotesProvider>
                </LibraryProvider>
              </LeaderboardProvider>
            </MatchProvider>
          </AiGateProvider>
        </SubscriptionProvider>
      </AppProvider>
    </AuthProvider>
  );
}
