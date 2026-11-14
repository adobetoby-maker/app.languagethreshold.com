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
type CoreCandidate = { target: string; native: string; reviewed: boolean; registered: boolean;
  sourceFile: string; sourceSha256: string; draftFile: string; draftSha256: string;
  englishSourceFile: string; englishSourceSha256: string; sourceFileSha256: Record<string, string>;
  lessons: { n: number; title: string; objective: string; focus: string; scene: string;
    speaking: string; words: { fr: string; en: string; kind: string }[];
    reader: { fr: string; en: string }[] }[] };
type CoreForms = { pairKey: string; registered: boolean; reviewed: boolean; courseId: string;
  sourceFile: string; sourceSha256: string; lessons: { lesson: number; stableLessonKey: string;
    prompts: { id: string; source?: string; sourceReaderTurn?: number; frenchAnswer: string;
      englishPrompt: string; reviewed: boolean }[] }[] };
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

async function ownerCoreDrafts() {
  const [candidateModule, modesModule, formsModule] = await Promise.all([
    import("../../content/french-basics/private-core-1-3-owner-candidate-fr-en.json"),
    import("../../content/french-basics/private-core-1-3-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-core-1-3-fr-en.json"),
  ]);
  const candidate = candidateModule.default as CoreCandidate;
  const modes = modesModule.default as Modes;
  const forms = formsModule.default as CoreForms;
  const sourceFile = "content/french-basics/private-runtime-core-1-30.json";
  const sourceSha256 = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
  if (candidate.target !== "French" || candidate.native !== "English" || candidate.reviewed !== false ||
    candidate.registered !== false || candidate.sourceFile !== sourceFile || candidate.sourceSha256 !== sourceSha256 ||
    candidate.draftFile !== "content/french-basics/core-1-3-draft.json" ||
    candidate.draftSha256 !== "59ab2196d68220e329b5572c0433aa51abe0842921215afef326b533a7fd0157" ||
    candidate.englishSourceFile !== "content/french-basics/source-english-core-1-3.json" ||
    candidate.englishSourceSha256 !== "d635545c6ff0cf7be717f97a62d3f16023199645c72d7d1664c78ea0cceceddc" ||
    candidate.sourceFileSha256["src/data/spanish-basics-core.json"] !== "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38" ||
    candidate.sourceFileSha256["src/data/spanish-basics-practice.json"] !== "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe" ||
    modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
    modes.sourceFile !== sourceFile || modes.sourceSha256 !== sourceSha256 ||
    forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "french-basics:fr-en" || forms.sourceFile !== sourceFile ||
    forms.sourceSha256 !== sourceSha256 ||
    candidate.lessons.map((lesson) => lesson.n).join() !== "1,2,3" ||
    modes.lessons.map((lesson) => lesson.lesson).join() !== "1,2,3" ||
    forms.lessons.map((lesson) => lesson.lesson).join() !== "1,2,3")
    throw new Error("French 101 Core candidate source or release gate changed");
  return candidate.lessons.map((lesson, index) => {
    const stableKey = `french-basics:${lesson.n}`;
    const mode = modes.lessons[index];
    const form = forms.lessons[index];
    if (mode.stableLessonKey !== stableKey || form.stableLessonKey !== stableKey ||
      !lesson.words.length || lesson.reader.length !== 6 || !lesson.speaking.trim() || !form.prompts.length ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.reader.some((line) => !line.fr?.trim() || !line.en?.trim()) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false || !prompt.frenchAnswer?.trim() ||
        !prompt.englishPrompt?.trim() || (prompt.source === "aligned-reader" &&
          lesson.reader[prompt.sourceReaderTurn! - 1]?.fr !== prompt.frenchAnswer)))
      throw new Error("French 101 Core candidate lesson alignment changed");
    return { stage: "core" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words, reader: lesson.reader,
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText, recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
    };
  });
}

async function ownerCoreFourToSixDrafts() {
  const [candidateModule, modesModule, formsModule] = await Promise.all([
    import("../../content/french-basics/private-core-4-6-owner-candidate-fr-en.json"),
    import("../../content/french-basics/private-core-4-6-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-core-4-6-fr-en.json"),
  ]);
  const candidate = candidateModule.default as CoreCandidate;
  const modes = modesModule.default as Modes;
  const forms = formsModule.default as CoreForms;
  const sourceFile = "content/french-basics/private-runtime-core-1-30.json";
  const sourceSha256 = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
  if (candidate.target !== "French" || candidate.native !== "English" || candidate.reviewed !== false ||
    candidate.registered !== false || candidate.sourceFile !== sourceFile || candidate.sourceSha256 !== sourceSha256 ||
    candidate.draftFile !== "content/french-basics/core-4-6-draft.json" ||
    candidate.draftSha256 !== "38ff5172764f4658a27aa929e213a3797a37fda87b12c09696c198bee74b45dd" ||
    candidate.englishSourceFile !== "content/french-basics/source-english-core-4-6.json" ||
    candidate.englishSourceSha256 !== "d05e9608a7ba35606e81c6c6fad01ea787bd35056a097317a7893dc59d53a917" ||
    candidate.sourceFileSha256["src/data/spanish-basics-core.json"] !== "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38" ||
    candidate.sourceFileSha256["src/data/spanish-basics-practice.json"] !== "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe" ||
    modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
    modes.sourceFile !== sourceFile || modes.sourceSha256 !== sourceSha256 ||
    forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "french-basics:fr-en" || forms.sourceFile !== sourceFile ||
    forms.sourceSha256 !== sourceSha256 ||
    candidate.lessons.map((lesson) => lesson.n).join() !== "4,5,6" ||
    modes.lessons.map((lesson) => lesson.lesson).join() !== "4,5,6" ||
    forms.lessons.map((lesson) => lesson.lesson).join() !== "4,5,6")
    throw new Error("French 101 Core 4–6 candidate source or release gate changed");
  return candidate.lessons.map((lesson, index) => {
    const stableKey = `french-basics:${lesson.n}`;
    const mode = modes.lessons[index];
    const form = forms.lessons[index];
    if (mode.stableLessonKey !== stableKey || form.stableLessonKey !== stableKey ||
      lesson.words.length !== 14 || lesson.reader.length !== 6 || !lesson.speaking.trim() ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.reader.some((line) => !line.fr?.trim() || !line.en?.trim()) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false || !prompt.frenchAnswer?.trim() ||
        !prompt.englishPrompt?.trim() || (prompt.source === "aligned-reader" &&
          (lesson.reader[prompt.sourceReaderTurn! - 1]?.fr !== prompt.frenchAnswer ||
           lesson.reader[prompt.sourceReaderTurn! - 1]?.en !== prompt.englishPrompt))))
      throw new Error("French 101 Core 4–6 candidate lesson alignment changed");
    return { stage: "core" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words, reader: lesson.reader,
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText, recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
    };
  });
}

async function ownerCoreSevenToNineDrafts() {
  const [candidateModule, modesModule, formsModule] = await Promise.all([
    import("../../content/french-basics/private-core-7-9-owner-candidate-fr-en.json"),
    import("../../content/french-basics/private-core-7-9-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-core-7-9-fr-en.json"),
  ]);
  const candidate = candidateModule.default as CoreCandidate;
  const modes = modesModule.default as Modes;
  const forms = formsModule.default as CoreForms;
  const sourceFile = "content/french-basics/private-runtime-core-1-30.json";
  const sourceSha256 = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
  if (candidate.target !== "French" || candidate.native !== "English" || candidate.reviewed !== false ||
    candidate.registered !== false || candidate.sourceFile !== sourceFile || candidate.sourceSha256 !== sourceSha256 ||
    candidate.draftFile !== "content/french-basics/core-7-9-draft.json" ||
    candidate.draftSha256 !== "6849334969a6ad29bafa457bc5cecba35f008c07d26544bf01af6730a9e69efc" ||
    candidate.englishSourceFile !== "content/french-basics/source-english-core-7-9.json" ||
    candidate.englishSourceSha256 !== "15aee39b0ef523d56b544326eec160dc134642dca625238cfeb7688f3aa622e9" ||
    candidate.sourceFileSha256["src/data/spanish-basics-core.json"] !== "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38" ||
    candidate.sourceFileSha256["src/data/spanish-basics-practice.json"] !== "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe" ||
    modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
    modes.sourceFile !== sourceFile || modes.sourceSha256 !== sourceSha256 ||
    forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "french-basics:fr-en" || forms.sourceFile !== sourceFile ||
    forms.sourceSha256 !== sourceSha256 ||
    candidate.lessons.map((lesson) => lesson.n).join() !== "7,8,9" ||
    modes.lessons.map((lesson) => lesson.lesson).join() !== "7,8,9" ||
    forms.lessons.map((lesson) => lesson.lesson).join() !== "7,8,9")
    throw new Error("French 101 Core 7–9 candidate source or release gate changed");
  return candidate.lessons.map((lesson, index) => {
    const stableKey = `french-basics:${lesson.n}`;
    const mode = modes.lessons[index];
    const form = forms.lessons[index];
    if (mode.stableLessonKey !== stableKey || form.stableLessonKey !== stableKey ||
      lesson.words.length !== 14 || lesson.reader.length !== 6 || !lesson.speaking.trim() ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.reader.some((line) => !line.fr?.trim() || !line.en?.trim()) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false || !prompt.frenchAnswer?.trim() ||
        !prompt.englishPrompt?.trim() || (prompt.source === "aligned-reader" &&
          (lesson.reader[prompt.sourceReaderTurn! - 1]?.fr !== prompt.frenchAnswer ||
           lesson.reader[prompt.sourceReaderTurn! - 1]?.en !== prompt.englishPrompt))))
      throw new Error("French 101 Core 7–9 candidate lesson alignment changed");
    return { stage: "core" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words, reader: lesson.reader,
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText, recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
    };
  });
}

async function ownerCoreTenToTwelveDrafts() {
  const [candidateModule, modesModule, formsModule] = await Promise.all([
    import("../../content/french-basics/private-core-10-12-owner-candidate-fr-en.json"),
    import("../../content/french-basics/private-core-10-12-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-core-10-12-fr-en.json"),
  ]);
  const candidate = candidateModule.default as CoreCandidate;
  const modes = modesModule.default as Modes;
  const forms = formsModule.default as CoreForms;
  const sourceFile = "content/french-basics/private-runtime-core-1-30.json";
  const sourceSha256 = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
  if (candidate.target !== "French" || candidate.native !== "English" || candidate.reviewed !== false ||
    candidate.registered !== false || candidate.sourceFile !== sourceFile || candidate.sourceSha256 !== sourceSha256 ||
    candidate.draftFile !== "content/french-basics/core-10-12-draft.json" ||
    candidate.draftSha256 !== "ce1f6aa6a1c23fe610e9ae433914b9a41f5e8af33d84a6014b57bc9394d860aa" ||
    candidate.englishSourceFile !== "content/french-basics/source-english-core-10-12.json" ||
    candidate.englishSourceSha256 !== "bd1b311dd81b9da2bbe5349166d1e61bfbe7b293b99db1bf67389a517ff4afa8" ||
    candidate.sourceFileSha256["src/data/spanish-basics-core.json"] !== "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38" ||
    candidate.sourceFileSha256["src/data/spanish-basics-practice.json"] !== "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe" ||
    modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
    modes.sourceFile !== sourceFile || modes.sourceSha256 !== sourceSha256 ||
    forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "french-basics:fr-en" || forms.sourceFile !== sourceFile ||
    forms.sourceSha256 !== sourceSha256 ||
    candidate.lessons.map((lesson) => lesson.n).join() !== "10,11,12" ||
    modes.lessons.map((lesson) => lesson.lesson).join() !== "10,11,12" ||
    forms.lessons.map((lesson) => lesson.lesson).join() !== "10,11,12")
    throw new Error("French 101 Core 10–12 candidate source or release gate changed");
  return candidate.lessons.map((lesson, index) => {
    const stableKey = `french-basics:${lesson.n}`;
    const mode = modes.lessons[index];
    const form = forms.lessons[index];
    if (mode.stableLessonKey !== stableKey || form.stableLessonKey !== stableKey ||
      lesson.words.length !== 14 || lesson.reader.length !== 6 || !lesson.speaking.trim() ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.reader.some((line) => !line.fr?.trim() || !line.en?.trim()) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false || !prompt.frenchAnswer?.trim() ||
        !prompt.englishPrompt?.trim() || (prompt.source === "aligned-reader" &&
          (lesson.reader[prompt.sourceReaderTurn! - 1]?.fr !== prompt.frenchAnswer ||
           lesson.reader[prompt.sourceReaderTurn! - 1]?.en !== prompt.englishPrompt))))
      throw new Error("French 101 Core 10–12 candidate lesson alignment changed");
    return { stage: "core" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words, reader: lesson.reader,
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText, recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
    };
  });
}

async function ownerCoreThirteenToFifteenDrafts() {
  const [candidateModule, modesModule, formsModule] = await Promise.all([
    import("../../content/french-basics/private-core-13-15-owner-candidate-fr-en.json"),
    import("../../content/french-basics/private-core-13-15-mode-prompts-fr-en.json"),
    import("../../content/french-basics/private-form-practice-core-13-15-fr-en.json"),
  ]);
  const candidate = candidateModule.default as CoreCandidate;
  const modes = modesModule.default as Modes;
  const forms = formsModule.default as CoreForms;
  const sourceFile = "content/french-basics/private-runtime-core-1-30.json";
  const sourceSha256 = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
  if (candidate.target !== "French" || candidate.native !== "English" || candidate.reviewed !== false ||
    candidate.registered !== false || candidate.sourceFile !== sourceFile || candidate.sourceSha256 !== sourceSha256 ||
    candidate.draftFile !== "content/french-basics/core-13-15-draft.json" ||
    candidate.draftSha256 !== "062cb5d98e06b2df56d1f7c5fc8f4c6d180a6e2ea0ad026aff6b76c1558a1476" ||
    candidate.englishSourceFile !== "content/french-basics/source-english-core-13-15.json" ||
    candidate.englishSourceSha256 !== "b468ebbd9924c0e29f4a52fa3f0684dde0eea6dcb1a209fbcbe4376c9ddfd348" ||
    candidate.sourceFileSha256["src/data/spanish-basics-core.json"] !== "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38" ||
    candidate.sourceFileSha256["src/data/spanish-basics-practice.json"] !== "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe" ||
    modes.pairKey !== "French:English" || modes.reviewed !== false || modes.registered !== false ||
    modes.sourceFile !== sourceFile || modes.sourceSha256 !== sourceSha256 ||
    forms.pairKey !== "French:English" || forms.reviewed !== false || forms.registered !== false ||
    forms.courseId !== "french-basics:fr-en" || forms.sourceFile !== sourceFile ||
    forms.sourceSha256 !== sourceSha256 ||
    candidate.lessons.map((lesson) => lesson.n).join() !== "13,14,15" ||
    modes.lessons.map((lesson) => lesson.lesson).join() !== "13,14,15" ||
    forms.lessons.map((lesson) => lesson.lesson).join() !== "13,14,15")
    throw new Error("French 101 Core 13–15 candidate source or release gate changed");
  return candidate.lessons.map((lesson, index) => {
    const stableKey = `french-basics:${lesson.n}`;
    const mode = modes.lessons[index];
    const form = forms.lessons[index];
    if (mode.stableLessonKey !== stableKey || form.stableLessonKey !== stableKey ||
      lesson.words.length !== 14 || lesson.reader.length !== 6 || !lesson.speaking.trim() ||
      lesson.words.some((word) => !word.fr?.trim() || !word.en?.trim() || !word.kind?.trim()) ||
      lesson.reader.some((line) => !line.fr?.trim() || !line.en?.trim()) ||
      modeNames.some((name) => !mode.modes[name]?.prompt?.trim() || !mode.modes[name]?.targetText?.trim()) ||
      form.prompts.some((prompt) => prompt.reviewed !== false || !prompt.frenchAnswer?.trim() ||
        !prompt.englishPrompt?.trim() || (prompt.source === "aligned-reader" &&
          (lesson.reader[prompt.sourceReaderTurn! - 1]?.fr !== prompt.frenchAnswer ||
           lesson.reader[prompt.sourceReaderTurn! - 1]?.en !== prompt.englishPrompt))))
      throw new Error("French 101 Core 13–15 candidate lesson alignment changed");
    return { stage: "core" as const, n: lesson.n, stableId: `${stableKey}:fr-en`,
      title: lesson.title, objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
      reviewed: false as const, cards: lesson.words, reader: lesson.reader,
      modes: Object.fromEntries(modeNames.map((name) => [name, {
        prompt: mode.modes[name].prompt, targetText: mode.modes[name].targetText, recordedAudio: false,
      }])),
      speaking: lesson.speaking,
      forms: form.prompts.map(({ id, englishPrompt, frenchAnswer }) => ({ id, englishPrompt, frenchAnswer })),
      reviewGaps: ["Qualified French and dictionary review pending", "Recorded audio and learner runtime pending"],
    };
  });
}

export const Route = createFileRoute("/api/owner-french101-drafts")({
  server: { handlers: { GET: async ({ request }) => {
    try {
      const db = teamAdminClient(ownerServiceFetch(request.signal), request);
      const actor = await authenticatedTeamUser(request, db);
      await requirePlatformOwner(db, actor);
      return json({ pairKey: "French:English", courseId: "french-basics", status: "owner-review-draft",
        reviewed: false, registered: false, audioRegistered: false,
        lessons: [...await ownerDrafts(), ...await ownerCoreDrafts(), ...await ownerCoreFourToSixDrafts(), ...await ownerCoreSevenToNineDrafts(), ...await ownerCoreTenToTwelveDrafts(), ...await ownerCoreThirteenToFifteenDrafts()] });
    } catch (error) { return scopedTeamError(error); }
  } } },
});
