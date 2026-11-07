import { BuyerFaq, PublicProof, ProductFooter } from "@/components/marketing/BuyerInformation";
import { faqSchema, productCapture } from "@/data/buyer-information";
import { TutorSiteGuide } from "@/components/tutor/TutorSiteGuide";
import { SpeakingPrivacyPrompt } from "@/components/speak/SpeakingPrivacyPrompt";
import { consumeSpeakingAuthNavigation } from "@/lib/speaking-auth-return";
import { legacyExamsLocation } from "@/lib/exam-navigation";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
import { DailyChallengeProvider } from "@/state/daily-challenge-state";
import { MatchChallengeBridge } from "@/components/games/MatchChallengeBridge";
import { DeferredGameProviders } from "@/components/games/DeferredGameProviders";
import { TopNav } from "@/components/TopNav";
import { AppDemo } from "@/components/onboarding/AppTour";
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
import { appNavigationLocation, appTab } from "@/lib/app-navigation";
import { useLessonReturnGuard } from "@/lib/lesson-return";

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    const destination = legacyExamsLocation(location.href);
    if (destination)
      throw redirect({
        href: destination,
        reloadDocument: true,
        replace: true,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
  },
  component: Index,
  head: () => ({
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqSchema) }],
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com" }],
    meta: [
      { property: "og:title", content: "Language Threshold — Language Training for Work" },
      {
        property: "og:description",
        content: "Practice medical intakes, morning briefs and other job-specific conversations.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/" },
      { name: "twitter:title", content: "Language Threshold — Language Training for Work" },
      {
        name: "twitter:description",
        content: "Practice medical intakes, morning briefs and other job-specific conversations.",
      },
      { title: "Language Threshold — Language Training for Work" },
      {
        name: "description",
        content:
          "Role-specific AI language training: medical, construction and mission Spanish plus 7 more languages. Bilingual reading, AI conversation practice, Field Prep roleplay.",
      },
    ],
  }),
});

function GatedTabShell() {
  const { state, profileReadyUserId } = useApp();
  const { user, loading } = useAuth();
  useLessonReturnGuard(state.currentTab);
  if (loading || (user && profileReadyUserId !== user.id))
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        Opening your learning space…
      </p>
    );
  return (
    <>
      {!user && state.currentTab === "reader" && <ProductIntro />}
      <SpeakingPrivacyPrompt
        startup
        ready={state.hydrated && state.onboardingComplete}
        skipStartup={
          state.currentTab === "core30" ||
          (typeof window !== "undefined" &&
            (new URLSearchParams(window.location.search).has("lesson") ||
              ["settings", "add-word"].includes(
                new URLSearchParams(window.location.search).get("panel") ?? "",
              )))
        }
      />
      <div id="free-lessons" className="scroll-mt-4" />
      <SubscriptionGate currentTab={state.currentTab}>
        <DeferredGameProviders>
          <TabShell />
        </DeferredGameProviders>
      </SubscriptionGate>
    </>
  );
}

function ProductIntro() {
  return (
    <section className="mx-auto mb-8 mt-4 max-w-5xl rounded-3xl border border-gold/25 bg-card/60 px-6 py-10 sm:px-10">
      <p className="mb-3 text-sm font-semibold text-gold-ink">
        Job-specific language training for nurses and foremen
      </p>
      <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
        Practice the conversations your work actually needs.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        Build enough confidence to hold a basic conversation, then use it while you are learning it.
        Choose role-specific lessons, practice with an AI speaking partner, and rehearse real
        situations in Field Prep. Listen, replay and practice understanding spoken phrases, so you
        can do more than point and gesture when a conversation matters.
      </p>
      {productCapture && (
        <img
          src={productCapture.src}
          alt={productCapture.alt}
          width={productCapture.width}
          height={productCapture.height}
          className="mt-6 h-auto w-full rounded-xl border border-border"
        />
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          to="/pricing"
          className="rounded-xl bg-gold px-5 py-3 font-semibold text-background hover:opacity-90"
        >
          Start the 7-day free trial
        </Link>
        <a
          href="#free-lessons"
          className="inline-flex min-h-11 items-center px-3 py-3 text-foreground underline"
        >
          Try the free lessons
        </a>
        <a
          href="/?tab=core30&module=foundation-spanish-basics&target=Spanish&native=English"
          className="inline-flex min-h-11 items-center px-3 py-3 text-foreground underline"
        >
          New to Spanish? Start Spanish 101
        </a>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        For work conversation practice. Does not replace qualified interpreters or certify clinical
        proficiency.
      </p>
      <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
        {[
          ["Medical", "Rehearse an intake, explain care, and check understanding."],
          ["Construction", "Run a morning brief, give directions, and reinforce safety."],
          ["Mission & teams", "Prepare for the conversations your assignment calls for."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-xl border border-border/70 bg-background/50 p-4">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
      <PublicProof />
      <section className="mt-10" aria-labelledby="practice-steps">
        <h2 id="practice-steps" className="text-2xl font-semibold">
          From a lesson to your next conversation
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          <li>
            <h3 className="font-semibold">1. Choose your situation</h3>
            <p>
              Start with an intake, a morning brief or a conversation your assignment calls for.
            </p>
          </li>
          <li>
            <h3 className="font-semibold">2. Listen and repeat</h3>
            <p>Read in both languages, replay the audio and practice the phrases you need.</p>
          </li>
          <li>
            <h3 className="font-semibold">3. Rehearse in Field Prep</h3>
            <p>
              Practice your responses with the AI speaking partner before the real conversation.
            </p>
          </li>
        </ol>
      </section>
      <BuyerFaq />
      <section className="rounded-xl border border-border p-5" aria-label="Plan overview">
        <h2 className="text-2xl font-semibold">Choose the practice that fits</h2>
        <p className="mt-3">
          Individual: $19/month or $149/year. Family: $35/month or $249/year for up to 6 profiles.
          Teams: from $99/month for five learner seats.
        </p>
        <a
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
        >
          Compare plans →
        </a>
      </section>
      <ProductFooter />
    </section>
  );
}

// Apply learning links after account restoration, so saved state cannot replace the assignment.
// This powers the "Start Free →" CTAs from the marketing site.
function UrlModuleBridge() {
  const { state, dispatch, profileReadyUserId } = useApp();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const appliedFor = useRef<string | null>(null);
  const [navigationReadyFor, setNavigationReadyFor] = useState<string | null>(null);

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
    const speakingReturn = userId ? consumeSpeakingAuthNavigation() : null;
    if (speakingReturn) window.history.replaceState(window.history.state, "", speakingReturn);
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get("module");
    const coreLink = moduleId === "core";
    const tab = appTab(params.get("tab"));
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
      LANGUAGES.includes(requestedTarget) &&
      NATIVE_LANGUAGES.includes(requestedNative) &&
      (coreLink ||
        (linkedModule &&
          moduleSupportsLearningPair(linkedModule, requestedTarget, requestedNative)))
    ) {
      if (state.selectedLanguage !== requestedTarget)
        dispatch({ type: "SET_LANGUAGE", payload: requestedTarget });
      if (state.nativeLanguage !== requestedNative)
        dispatch({ type: "SET_NATIVE_LANGUAGE", payload: requestedNative });
    }
    if (coreLink && state.activeModuleId !== null)
      dispatch({ type: "SET_ACTIVE_MODULE", payload: null });
    if (linkedModule && linkedModule.id !== state.activeModuleId) {
      dispatch({ type: "PURCHASE_MODULE", payload: linkedModule.id });
      dispatch({ type: "SET_ACTIVE_MODULE", payload: linkedModule.id });
      if (moduleId === "lds-missionary") {
        dispatch({ type: "SET_TAB", payload: "discussions" });
      }
    }
    if (tab) dispatch({ type: "SET_TAB", payload: tab });
    // This state update is batched with the URL's app-state actions. A ref alone would
    // let the writer below run against the previous render and erase the incoming link.
    setNavigationReadyFor(identity);
    // Apply the URL once per identity, after local and cloud state are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, authLoading, userId, profileReadyUserId]);

  useEffect(() => {
    const identity = userId ?? "guest";
    const next = appNavigationLocation(window.location.href, {
      ready:
        navigationReadyFor === identity &&
        state.hydrated &&
        !authLoading &&
        (!userId || profileReadyUserId === userId),
      moduleId: state.activeModuleId,
      target: state.selectedLanguage,
      native: state.nativeLanguage,
      tab: state.currentTab,
    });
    if (next && next !== window.location.pathname + window.location.search + window.location.hash)
      window.history.replaceState(window.history.state, "", next);
  }, [
    navigationReadyFor,
    userId,
    authLoading,
    profileReadyUserId,
    state.hydrated,
    state.activeModuleId,
    state.selectedLanguage,
    state.nativeLanguage,
    state.currentTab,
  ]);

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

function VisitorNavigation({ onOpenMatch }: { onOpenMatch: () => void }) {
  const { user } = useAuth();
  const { state } = useApp();
  const [expanded, setExpanded] = useState(false);
  const directLearningLink =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tab");
  if (user || directLearningLink || state.currentTab !== "reader" || expanded)
    return <AppSidebar onOpenMatch={onOpenMatch} />;
  return (
    <>
      <div className="contents desktop:hidden">
        <AppSidebar onOpenMatch={onOpenMatch} />
      </div>
      <div className="hidden desktop:block shrink-0 border-r border-border p-3">
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className="min-h-11 rounded-lg border border-border px-4 py-3 font-semibold"
        >
          Learning tools
        </button>
      </div>
    </>
  );
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
                              <DailyChallengeProvider>
                                <div className="lt-app-shell bg-background text-foreground">
                                  {/* Left sidebar (desktop) + bottom nav (mobile) */}
                                  <VisitorNavigation onOpenMatch={() => setMatchOpen(true)} />

                                  {/* Main column */}
                                  <div className="lt-main-column flex min-h-0 min-w-0 flex-1 flex-col">
                                    <TopNav />
                                    <SaveProgressBanner />
                                    {/* Shared bottom-strip budget reserves the nav,
                                              Tutor action, and Reader mini-player together. */}
                                    <main
                                      id="learning-space"
                                      className="lt-scroll-safe lt-safe-top-main min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6 sm:pb-10"
                                    >
                                      <AppDemo />
                                      <GatedTabShell />
                                    </main>
                                  </div>
                                </div>

                                <FirstRunEntry />
                                {personalizationOpen && (
                                  <OnboardingWizard onClose={() => setPersonalizationOpen(false)} />
                                )}
                                <UrlModuleBridge />
                                <TutorSiteGuide />
                                <TutorPanel />
                                <LevelUpOverlay />
                                <CefrCompletionBridge />
                                <MatchmakingOverlay
                                  open={matchOpen}
                                  onClose={() => setMatchOpen(false)}
                                />
                                <MatchAchievementsBridge />
                                <MatchChallengeBridge />
                                <PushReminderSync />
                                <GlobalVocabCapture />
                                <TeamActivityBridge />
                              </DailyChallengeProvider>
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
