import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/state/app-state";
import { AuthProvider } from "@/state/auth-state";
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
  return (
    <SubscriptionGate currentTab={state.currentTab}>
      <TabShell />
    </SubscriptionGate>
  );
}

// Reads ?module= URL param once on mount and activates the module.
// This powers the "Start Free →" CTAs from the marketing site.
function UrlModuleBridge() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (!state.hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get("module");
    if (moduleId && moduleId !== state.activeModuleId) {
      dispatch({ type: "PURCHASE_MODULE", payload: moduleId });
      dispatch({ type: "SET_ACTIVE_MODULE", payload: moduleId });
      if (moduleId === "lds-missionary") {
        dispatch({ type: "SET_TAB", payload: "discussions" });
      }
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated]);

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
    <AppProvider>
      <AuthProvider>
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
                                                <main className="lt-scroll-safe flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
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
      </AuthProvider>
    </AppProvider>
  );
}
