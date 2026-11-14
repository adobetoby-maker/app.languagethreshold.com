import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { authenticatedTeamUser, json, requirePlatformOwner, scopedTeamError, teamAdminClient } from "@/lib/team-server";

type SourceLesson = { n: number; title: string; objective: string; focus: string; scene: string;
  words: { fr: string; en: string; kind: string }[]; dialogue: string[]; speaking: string; locale: string };
type Source = { target: string; native: string; moduleId: string; stage: string; reviewed: boolean;
  source: { path: string; sourceSha256: string }; lessons: SourceLesson[] };
type Mode = { prompt: string; targetText: string; recordedAudio?: boolean };
type ModeLesson = { lesson: number; stableLessonKey: string; modes: Record<string, Mode> };
type Modes = { pairKey: string; sourceFile: string; sourceSha256: string; reviewed: boolean; registered: boolean;
  lessons: ModeLesson[] };
type Form = { id: string; sourceReaderTurn: number; englishPrompt: string; frenchAnswer: string;
  sourceReaderTarget: string; reviewed: boolean };
type Forms = { pairKey: string; registered: boolean; reviewed: boolean; courseId: string;
  sourceFile: string; sourceSha256: string; lessons: { lesson: number; stableLessonKey: string; prompts: Form[]; reviewed: boolean }[] };
const modeNames = ["see", "recall", "hear", "type", "say", "write"] as const;

async function ownerDrafts() {
  // Import private candidate assets only after the owner check. No learner registry or progress write uses them.
  const [firstSourceModule, firstModeModule, nextSourceModule, nextModeModule, finalSourceModule, finalModeModule, capSourceModule, capModeModule, formModule] = await Promise.all([
    import("../../content/french-basics/foundation-1-3-draft.json"),
    import("../../content/french-basics/private-foundation-1-3-mode-prompts-fr-en.json"),
    import("../../content/french-basics/foundation-4-6-draft.json"),
    import("../../content/french-basics/private-foundation-4-6-mode-prompts-fr-en.json"),
    import("../../content/french-basics/foundation-7-8-draft.json"),
    import("../../content/french-basics/private-foundation-7-8-mode-prompts-fr-en.json"),
    import("../../content/french-basics/foundation-9-10-draft.json"),
    import("../../content/french-basics/private-foundation-9-10-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-foundation-1-10-fr-en.json"),
  ]);
  const forms = formModule.default as Forms;
  if (forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "foundation-french-basics:fr-en" ||
    forms.sourceFile !== "private-runtime-foundation-1-10.json" ||
    forms.sourceSha256 !== "6eca43a19dc9ed6090eef417d58be728e90ff91a26798555c14422b59f5261d3")
    throw new Error("French 101 Foundation form source or release gate changed");
  const batches = [
    { source: firstSourceModule.default as Source, modes: firstModeModule.default as Modes,
      range: [1, 2, 3], sourceFile: "content/french-basics/foundation-1-3-draft.json",
      sha256: "bb7c6a6bce9ec3447aead1750e650ef207610acade4d1b87f0fd1255c4cdf524" },
    { source: nextSourceModule.default as Source, modes: nextModeModule.default as Modes,
      range: [4, 5, 6], sourceFile: "content/french-basics/foundation-4-6-draft.json",
      sha256: "8f502483ff970e4c6324e5f54b29b80f4a81822f2abb3b6948cbb4a995f7fa12" },
    { source: finalSourceModule.default as Source, modes: finalModeModule.default as Modes,
      range: [7, 8], sourceFile: "content/french-basics/foundation-7-8-draft.json",
      sha256: "2e6061a52d81394e005efec1703ae652617b4f8396c1ae336d1047a76dbb5a62" },
    { source: capSourceModule.default as Source, modes: capModeModule.default as Modes,
      range: [9, 10], sourceFile: "content/french-basics/foundation-9-10-draft.json",
      sha256: "b04b3b3d66731da13a9422d921a517791a006df5024cf94d9cb9eff3627a8cca" },
  ];
  return batches.flatMap(({ source, modes, range, sourceFile, sha256 }) => {
    if (source.target !== "French" || source.native !== "English" || source.moduleId !== "french-basics" ||
      source.stage !== "foundation" || source.reviewed !== false ||
      source.source.path !== "src/data/core60/es/foundation-spanish-basics.json" ||
      source.source.sourceSha256 !== "820ed6fcd726180c3794027f4578de051666d973eb2e23373e086c94c6211eb0" ||
      modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
      modes.sourceFile !== sourceFile || modes.sourceSha256 !== sha256 ||
      source.lessons.map((lesson) => lesson.n).join() !== range.join() ||
      modes.lessons.map((lesson) => lesson.lesson).join() !== range.join())
      throw new Error("French 101 Foundation candidate source or release gate changed");
    return source.lessons.map((lesson, index) => {
      const stableKey = `foundation-french-basics:${lesson.n}`;
      const mode = modes.lessons[index];
      const form = forms.lessons[lesson.n - 1];
      if (lesson.locale !== "fr-FR" ||
      mode.lesson !== lesson.n || mode.stableLessonKey !== stableKey ||
      form.lesson !== lesson.n || form.stableLessonKey !== stableKey || form.reviewed !== false ||
      !lesson.words.length || !lesson.dialogue.length || !form.prompts.length ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.dialogue.some((line) => line.split("|").length !== 2) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false ||
        prompt.sourceReaderTarget !== lesson.dialogue[prompt.sourceReaderTurn - 1]?.split("|")[0] ||
        !prompt.sourceReaderTarget.includes(prompt.frenchAnswer)))
        throw new Error("French 101 Foundation candidate lesson alignment changed");
      return { stage: "foundation" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words.map(({ fr, en, kind }) => ({ fr, en, kind })),
      reader: lesson.dialogue.map((line) => { const [fr, en] = line.split("|"); return { fr, en }; }),
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText,
        recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
      };
    });
  });
}

export const Route = createFileRoute("/api/owner-french101-drafts")({
  server: { handlers: { GET: async ({ request }) => {
    try {
      const db = teamAdminClient(ownerServiceFetch(request.signal), request);
      const actor = await authenticatedTeamUser(request, db);
      await requirePlatformOwner(db, actor);
      return json({ pairKey: "French:English", courseId: "french-basics", status: "owner-review-draft",
        reviewed: false, registered: false, audioRegistered: false, lessons: await ownerDrafts() });
    } catch (error) { return scopedTeamError(error); }
  } } },
});
