import { useEffect, useState, type ReactNode } from "react";
import { ConjugationProvider } from "@/state/conjugation-state";
import { SentenceBuildProvider } from "@/state/sentence-build-state";
import { ListeningDrillProvider } from "@/state/listening-drill-state";
import { WordMatchProvider } from "@/state/word-match-state";
import { IdiomMasterProvider } from "@/state/idiom-master-state";
import { FalseFriendsProvider } from "@/state/false-friends-state";
import { DailyChallengeBridge } from "./DailyChallengeBridge";

export default function GameProviders({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false);
  // Provider hydration uses synchronous device reads in mount effects. Mount
  // the completion observer afterward so restored history is only a baseline.
  useEffect(() => setRestored(true), []);
  return (
    <ConjugationProvider>
      <SentenceBuildProvider>
        <ListeningDrillProvider>
          <WordMatchProvider>
            <IdiomMasterProvider>
              <FalseFriendsProvider>
                {children}
                {restored && <DailyChallengeBridge />}
              </FalseFriendsProvider>
            </IdiomMasterProvider>
          </WordMatchProvider>
        </ListeningDrillProvider>
      </SentenceBuildProvider>
    </ConjugationProvider>
  );
}
