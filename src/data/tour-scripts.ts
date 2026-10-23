import type { TabKey } from "@/state/app-state";
import { getCurriculum } from "@/data/curriculum";

export interface TourStep {
  title: string;
  body: string;
  tabKey: TabKey;
}

/** Show the learning loop, with honest empty states and no automatic practice submissions. */
export function getTourScript(moduleId: string | null): TourStep[] {
  const steps: TourStep[] = [];
  if (getCurriculum(moduleId ?? ""))
    steps.push({
      tabKey: "core30",
      title: "Choose your next lesson",
      body: "Your selected module has a lesson path. Open a lesson to read, listen and practice it; viewing this demo does not mark lessons complete. Sign-in and plan requirements still apply.",
    });
  steps.push(
    {
      tabKey: "reader",
      title: "Read in context",
      body: "Read the two language panes. Tap a word for its meaning and examples, then save words you want to practice. Open Library to choose a different text.",
    },
    {
      tabKey: "flashcards",
      title: "Remember useful words",
      body: "Flashcards reviews your saved vocabulary and topic decks. If My Vocab is empty, save a word from Reader first. Word Match is a separate matching game.",
    },
    {
      tabKey: "games",
      title: "Practice with games",
      body: "Choose a short challenge. The Verbs card opens pattern practice with Bubble Pop and Verb Crush. Listening Drill trains you to match audio to the right transcript.",
    },
    {
      tabKey: "speak",
      title: "Use it in conversation",
      body: "Choose Core Speaking or an available scenario. Start a conversation when you are ready; this demo does not activate your microphone or begin an AI session.",
    },
    {
      tabKey: "dashboard",
      title: "See your progress",
      body: "Review your own learning activity and return to your next lesson. These are your actual records; you can explore without submitting practice or completing a lesson.",
    },
  );
  return steps;
}
