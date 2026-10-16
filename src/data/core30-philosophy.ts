// Built by TAC — 2026-10-15
// Copy for the "How Core 30 works" page. Examples come from the Roofing Foreman course
// (roofing-lesson-words.ts); tests/core30-philosophy.test.mjs checks every example exists there.
// The base copy is module- and language-neutral and uses {language}, {native}, {threshold} and
// {headline} placeholders. buildCore30Philosophy() fills them for the learner's current module
// and language and adds the roofing-only lines when the module is roofing.
// Kept as plain data so the App Guide or any other surface can reuse it.

export type PhilosophyWayId = "see" | "recall" | "hear" | "type" | "say" | "write";

export type PhilosophyStage = "Recognize" | "Retrieve" | "Produce" | "Use";

export interface PhilosophyExample {
  /** Spanish exactly as it appears in the roofing lesson words (a term or a full phrase). */
  es: string;
  /** English meaning, shown beside it. */
  en: string;
  /** Roofing lesson number where this appears. */
  lesson: number;
}

export interface PhilosophyWay {
  id: PhilosophyWayId;
  /** Heading, in the user's order and wording: "See it", "Recall it", ... */
  label: string;
  /** Short mono tag: what kind of memory work this is. */
  stage: PhilosophyStage;
  /** What you do in the app. */
  doIt: string;
  /** Why it helps memory. One or two plain sentences, no statistics. */
  why: string;
  example: PhilosophyExample;
  /** Label above the example. Set by buildCore30Philosophy(): it names the course the example is from. */
  exampleLabel?: string;
  /** Optional second line under the example (used by Write it, which has two passes). */
  exampleNote?: string;
}

export interface PhilosophyStageStep {
  stage: PhilosophyStage;
  ways: PhilosophyWayId[];
  text: string;
}

export interface PhilosophyPoint {
  heading: string;
  text: string;
}

export interface PhilosophyRoutine {
  label: string;
  length: string;
  steps: string[];
}

export interface Core30Philosophy {
  opening: {
    eyebrow: string;
    title: string;
    /** The current module's real end goal (its curriculum threshold), or generic copy without one. */
    promise: string;
    body: string[];
  };
  ways: { title: string; intro: string; items: PhilosophyWay[] };
  together: {
    title: string;
    intro: string;
    stages: PhilosophyStageStep[];
    mastery: string;
  };
  mastery: {
    title: string;
    intro: string;
    you: { heading: string; items: string[] };
    app: { heading: string; items: string[] };
    rhythm: { heading: string; items: PhilosophyPoint[] };
  };
  routine: {
    title: string;
    intro: string;
    days: PhilosophyRoutine[];
    tipsHeading: string;
    tips: PhilosophyPoint[];
  };
  teamLeads: { title: string; text: string };
}

export const CORE30_PHILOSOPHY: Core30Philosophy = {
  opening: {
    eyebrow: "How Core 30 works",
    title: "Thirty lessons. Six ways to learn each one.",
    promise: "{threshold}",
    body: [
      "Core 30 courses follow the same six-way pattern. Each lesson covers one real moment from the module and teaches its words in {language}.",
      "A word you only read is easy to lose. So every lesson makes you meet the same words in six different ways. The examples on this page come from the Roofing Foreman course (Spanish), but every Core 30 works the same way.",
    ],
  },
  ways: {
    title: "The six ways",
    intro: "Each lesson is one page with these six parts, in this order.",
    items: [
      {
        id: "see",
        label: "See it",
        stage: "Recognize",
        doIt: "Read the lesson passage, then look through the lesson words. The passage has a {native} toggle, so you can check the meaning without leaving the page.",
        why: "Seeing a word in a real sentence gives your memory something to attach it to. This is where a word starts. It is not where it ends, because reading alone feels like learning more than it is.",
        example: { es: "Tapajuntas / Flashing", en: "flashing", lesson: 3 },
      },
      {
        id: "recall",
        label: "Recall it",
        stage: "Retrieve",
        doIt: "Use the flashcards and memory match. Look at a card, try to bring up the answer yourself, then flip it to check.",
        why: "Pulling a word out of your own memory strengthens it more than reading it again. A miss helps too. It shows you which words are not yours yet.",
        example: { es: "Limahoya / Valle", en: "valley", lesson: 3 },
      },
      {
        id: "hear",
        label: "Hear it",
        stage: "Recognize",
        doIt: "Play the audio for a word or phrase and listen before you read it. The listening check plays a word or phrase and asks you to pick what it means.",
        why: "On the job you will hear {language}, not read it. Matching the sound to the meaning trains your ear for real speech, and it helps your own pronunciation.",
        example: {
          es: "Barran la cubierta antes de la sub-capa.",
          en: "Sweep the deck before underlayment.",
          lesson: 2,
        },
      },
      {
        id: "type",
        label: "Type it",
        stage: "Produce",
        doIt: "In typing practice you type the {language} yourself instead of just recognizing it on the screen. After each answer the app shows which letters to fix and any missing accents.",
        why: "Typing makes you produce the exact spelling instead of just recognizing the word. You find out fast which words you only half know.",
        example: { es: "Goterón / Vierteaguas", en: "drip edge", lesson: 2 },
      },
      {
        id: "say",
        label: "Say it",
        stage: "Use",
        doIt: "Say each phrase out loud, then do the lesson's speaking mission as if the other person is standing in front of you.",
        why: "The job is spoken, so your mouth needs the reps. Saying a phrase out loud is the closest practice to saying it for real.",
        example: {
          es: "Quiten todo hasta llegar a la cubierta.",
          en: "Tear off everything down to the deck.",
          lesson: 7,
        },
      },
      {
        id: "write",
        label: "Write it",
        stage: "Produce",
        doIt: "Handwriting has two passes. First copy the word by hand while you look at it. Then cover it and write the answers from memory. The app reads your handwriting and points out letters to fix. With no signal, it shows the answer so you can compare.",
        why: "Handwriting is slow on purpose. It ties the shape of the word to the movement of your hand, which gives the word another way to stick. Copying first gives you a model before you test yourself.",
        example: {
          es: "Revisen la pendiente del techo antes de empezar.",
          en: "Check the roof pitch before we start.",
          lesson: 1,
        },
        exampleNote:
          "Copy pendiente del techo first. Then write the full sentence without looking.",
      },
    ],
  },
  together: {
    title: "How they work together",
    intro:
      "The six parts are not six copies of the same drill. Each lesson takes a word from something you recognize to something you can say under pressure.",
    stages: [
      {
        stage: "Recognize",
        ways: ["see", "hear"],
        text: "You see the word and hear it. You know it when it shows up.",
      },
      {
        stage: "Retrieve",
        ways: ["recall"],
        text: "You pull it out of memory with nothing in front of you.",
      },
      {
        stage: "Produce",
        ways: ["type", "write"],
        text: "You spell it exactly, on a keyboard and by hand.",
      },
      {
        stage: "Use",
        ways: ["say"],
        text: "You say it live, the way you would to a colleague.",
      },
    ],
    mastery:
      "Mastery means you can do all six without help. If one part still needs a peek at the answer, the word is not mastered yet.",
  },
  mastery: {
    title: "Mastery and review",
    intro:
      "You and the app each have a job. The app keeps the record and the schedule. You decide what you know.",
    you: {
      heading: "Your job",
      items: [
        "Do the six parts. Skipping one leaves a gap you will find later, on the job.",
        "Tap I've mastered this lesson only when you can say the lesson's words and phrases without looking.",
        "Be honest on review days. Marking a lesson Needs practice is normal, not a failure.",
      ],
    },
    app: {
      heading: "The app's job",
      items: [
        "Records which parts of each lesson you opened.",
        "Counts your mastered lessons and shows where you are in the plan.",
        "Tells you when a review is due and what is in it.",
      ],
    },
    rhythm: {
      heading: "The 90-day rhythm",
      items: [
        {
          heading: "A new lesson every 3 days",
          text: "You pick the start date. Lesson 1 opens on day 1, Lesson 2 on day 4, and Lesson 30 on day 88.",
        },
        {
          heading: "A review every 4 days",
          text: "Every fourth day you get a short check on words from every lesson you have mastered so far. For each lesson you mark Still mastered or Needs practice.",
        },
        {
          heading: "Needs practice sends a lesson back",
          text: "That lesson goes back for another pass, and the plan keeps moving.",
        },
        {
          heading: "On track and catch up",
          text: "On track means you have mastered every lesson that was due by today. If a lesson is overdue, the plan says how many lessons to catch up. Open the oldest one first.",
        },
      ],
    },
  },
  routine: {
    title: "How to get the most from the app",
    intro: "Two kinds of days. Keep them short and keep showing up.",
    days: [
      {
        label: "Lesson day",
        length: "15 to 20 minutes",
        steps: [
          "Read the lesson passage and look through the lesson words.",
          "Play the audio for the new words. Say them back.",
          "Do the flashcards and memory match until you stop peeking.",
          "Type the words, then copy and write them by hand.",
          "Do the speaking mission out loud, twice.",
          "Tap I've mastered this lesson only if you can say it without looking. If not, leave it for the next pass.",
        ],
      },
      {
        label: "Review day",
        length: "5 minutes",
        steps: [
          "Open the review from the plan card.",
          "Say each word out loud before you tap it to check.",
          "Mark each lesson Still mastered or Needs practice.",
        ],
      },
    ],
    tipsHeading: "Tips from the field",
    tips: [
      {
        heading: "Use the audio on the drive in",
        text: "Listening to the lesson words on the way to the job is real practice time.",
      },
      {
        heading: "Say phrases out loud with real people",
        text: "Try one phrase on someone at work or at home. Real answers teach you more than a screen does.",
      },
      {
        heading: "Add words you hear on the job",
        text: "If someone uses a word the lesson does not have, use Add word so it joins your practice.",
      },
      {
        heading: "Open a lesson once, then practice offline",
        text: "After you open a lesson, its words and practice work without a connection: study, flashcards, memory match, typing, the handwriting self-check, and listening audio you have already played. The speaking mission, word lookup, and having the app read your handwriting need a connection.",
      },
    ],
  },
  teamLeads: {
    title: "For team leads",
    text: "If you manage a team, the admin view shows each learner's mastered count, how many lessons they have opened, their plan status, and the date of their last review. It shows what they did in the app. It does not show how well they speak. Ask them to say a phrase on the job.",
  },
};

// ─── Module- and language-aware copy ─────────────────────────────────────────

/** The module whose lessons the examples come from. */
export const EXAMPLE_MODULE_ID = "roofing";

export interface PhilosophyContext {
  /** The learner's active module id, or null when none is chosen. */
  moduleId: string | null;
  /** The language being learned, for example "French". */
  language: string;
  /** The learner's native language. Defaults to English. */
  nativeLanguage?: string;
  /** The module's curriculum headline, for example "The Clinical Core 30". */
  headline?: string | null;
  /** The module's curriculum threshold: what the learner can do by the last lesson. */
  threshold?: string | null;
}

const FALLBACK_PROMISE =
  "By the end of this course, you can use {language} in the real situations this module is built around.";

const ROOFING_BODY: [string, string] = [
  "Core 30 is built from the Roofing Foreman course. Each lesson covers one real moment on the job, such as naming the roof system, stopping a worker before they cover a soft deck, or tying off before access.",
  "A word you only read is easy to lose. So every lesson makes you meet the same words in six different ways. The examples on this page are roofing words, but every Core 30 works the same way.",
];

/** Replaces {name} placeholders. Unknown names are left as written. */
export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}

function fillDeep<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") return fillPlaceholders(value, vars) as T;
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, vars)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = fillDeep(item, vars);
    return out as T;
  }
  return value;
}

/**
 * The page copy for one module and language. The opening promise is the module's own threshold,
 * every {language} is the language being learned, and the roofing-only lines appear only for the
 * roofing module. Other modules say Core 30 courses follow the same six-way pattern and label
 * the roofing examples as such.
 */
export function buildCore30Philosophy(ctx: PhilosophyContext): Core30Philosophy {
  const isRoofing = ctx.moduleId === EXAMPLE_MODULE_ID;
  const vars: Record<string, string> = {
    language: ctx.language,
    native: ctx.nativeLanguage || "English",
    headline: ctx.headline?.trim() || "this course",
    threshold: ctx.threshold?.trim() || FALLBACK_PROMISE,
  };
  const copy = fillDeep(CORE30_PHILOSOPHY, vars);
  // The threshold itself can hold a {language} placeholder only through FALLBACK_PROMISE.
  copy.opening.promise = fillPlaceholders(copy.opening.promise, vars);

  if (isRoofing) {
    copy.opening.body = [...ROOFING_BODY];
  } else if (ctx.headline?.trim()) {
    copy.opening.body[0] = `Core 30 courses follow the same six-way pattern. Each lesson in ${ctx.headline.trim()} covers one real moment from the module and teaches its words in ${ctx.language}.`;
  }

  const exampleSource = isRoofing ? "Example" : "Example from the Roofing Foreman course";
  const spanishTag = ctx.language === "Spanish" ? "" : " (Spanish)";
  copy.ways.items = copy.ways.items.map((way) => ({
    ...way,
    exampleLabel: `${exampleSource}${spanishTag} \u00b7 Lesson ${way.example.lesson}`,
  }));
  return copy;
}
