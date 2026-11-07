/** Contextual Japanese form practice is private until language and trade review. */
export const JAPANESE_FOREMAN_FORMS_RELEASED = false as boolean;

export interface PrivateJapaneseForm {
  id: string;
  sourceOrdinal: number;
  target: string;
  english: string;
  practice: readonly ["recognize-meaning", "produce-target"];
  reviewed: false;
}

export interface PrivateJapaneseFormLesson {
  stage: "foundation" | "core" | "master";
  courseId: string;
  lesson: number;
  sourceLessonId: string;
  sourceFile: string;
  focus: string;
  forms: PrivateJapaneseForm[];
  reviewed: false;
}

export interface PrivateJapaneseFormInventory {
  schema: 1;
  state: "private-form-practice-draft";
  reviewed: false;
  registered: false;
  pairKey: "Japanese:English";
  targetLanguage: "Japanese";
  supportLanguage: "English";
  practiceModel: "contextual-japanese-form";
  counts: { lessons: number; forms: number };
  lessons: PrivateJapaneseFormLesson[];
}

export type PrivateJapaneseFormLookup = (
  stage: PrivateJapaneseFormLesson["stage"],
  lesson: number,
  targetLanguage: string,
  supportLanguage: string,
) => readonly PrivateJapaneseForm[];

const courseIds = {
  foundation: "foundation-construction-foreman-ja-en",
  core: "construction-foreman-ja-en",
  master: "master-construction-foreman-ja-en",
} as const;

/** Uses full authored sentence forms; Japanese has no Spanish person/endings table here. */
export function buildPrivateJapaneseFormPractice(data: PrivateJapaneseFormInventory): PrivateJapaneseFormLookup {
  if (
    data.schema !== 1 || data.state !== "private-form-practice-draft" ||
    data.reviewed !== false || data.registered !== false || data.pairKey !== "Japanese:English" ||
    data.targetLanguage !== "Japanese" || data.supportLanguage !== "English" ||
    data.practiceModel !== "contextual-japanese-form" || data.counts.lessons !== data.lessons.length
  ) throw new Error("Invalid private Japanese form inventory");
  const byLesson = new Map<string, readonly PrivateJapaneseForm[]>();
  const formIds = new Set<string>();
  let formCount = 0;
  for (const entry of data.lessons) {
    if (
      entry.courseId !== courseIds[entry.stage] || entry.reviewed !== false ||
      !Number.isInteger(entry.lesson) || entry.lesson < 1 || entry.forms.length !== 2
    ) throw new Error("Invalid private Japanese form lesson");
    const key = `${entry.stage}:${entry.lesson}`;
    if (byLesson.has(key)) throw new Error(`Duplicate private Japanese form lesson ${key}`);
    for (const form of entry.forms) {
      if (
        !form.id.startsWith("form-ja-en-") || formIds.has(form.id) ||
        !form.target.trim() || !form.english.trim() || form.reviewed !== false ||
        form.practice[0] !== "recognize-meaning" || form.practice[1] !== "produce-target"
      ) throw new Error(`Invalid private Japanese form ${form.id}`);
      formIds.add(form.id);
      formCount += 1;
    }
    byLesson.set(key, entry.forms);
  }
  if (formCount !== data.counts.forms) throw new Error("Private Japanese form count mismatch");
  return (stage, lesson, targetLanguage, supportLanguage) =>
    targetLanguage === "Japanese" && supportLanguage === "English"
      ? byLesson.get(`${stage}:${lesson}`) ?? []
      : [];
}

/** Exact response check; no invented conjugation variants or Spanish suffix rules. */
export function matchesPrivateJapaneseForm(
  form: PrivateJapaneseForm,
  task: "recognize-meaning" | "produce-target",
  response: string,
): boolean {
  return response.normalize("NFC").trim() ===
    (task === "produce-target" ? form.target : form.english).normalize("NFC").trim();
}

/** Release gate remains closed; source fixtures never enter live practice. */
export function privateJapaneseFormPractice(
  lookup: PrivateJapaneseFormLookup,
  stage: PrivateJapaneseFormLesson["stage"],
  lesson: number,
  targetLanguage: string,
  supportLanguage: string,
): readonly PrivateJapaneseForm[] {
  if (!JAPANESE_FOREMAN_FORMS_RELEASED) return [];
  return lookup(stage, lesson, targetLanguage, supportLanguage);
}
