// Built by TAC — 2026-10-20
// Verb Games: pure pattern compiler. Lesson verbs + dictionary profiles + core list in,
// PatternData + review items + review report markdown out. No file writes, no runtime AI.

import { createHash } from "node:crypto";
import type { VerbProfile } from "../../components/dictionary/types.ts";
import type { LessonVerb } from "../lesson-content-core.ts";
import { explainIrregular, formFamilies, formIssues, splitForm } from "./classify.ts";
import { englishForm, primaryGloss } from "./english.ts";
import { FAMILIES } from "./families.ts";
import { PERSONS } from "./types.ts";
import type { CrushLevel, FamilyId, PatternData, Person, VerbEntry, VerbForm, VerbSource } from "./types.ts";

export interface LessonFile {
  module: string;
  lessons: Record<string, { verbs?: LessonVerb[] }>;
}

/**
 * Reviewed corrections (docs/verb-patterns/es-overrides.json). They win over every other source and
 * are printed in the review report, so the sign-off hash covers them.
 */
export interface Overrides {
  /** Display gloss per infinitive (stored as `english`; per-form English uses its first sense). */
  gloss?: Record<string, string>;
  /** Per-form English, replacing the generated sentence for that person. */
  formEnglish?: Record<string, Partial<Record<Person, string>>>;
  /** Verbs never shipped, with the reason shown in the report. */
  exclude?: Record<string, string>;
  /** Persons that never get a sentence frame. */
  dropFrames?: Record<string, Person[]>;
  /** Corrected forms; replace both the profile and every lesson form for that person. */
  forms?: Record<string, Partial<Record<Person, string>>>;
}

const OVERRIDE_SECTIONS = ["gloss", "formEnglish", "exclude", "dropFrames", "forms"] as const;

export interface CompileInput {
  lessonFiles: LessonFile[];
  profiles: Record<string, VerbProfile>;
  core: { infinitive: string; english: string }[];
  crushLevels: CrushLevel[];
  signoff: { reportSha256: string; signedBy: string; signedAt: string } | null;
  overrides?: Overrides;
}

export type ReviewKind = "classified" | "excluded" | "profile-conflict" | "lesson-conflict" | "gloss-variants";

export interface ReviewItem {
  infinitive: string;
  kind: ReviewKind;
  detail: string;
}

export interface CompileOutput {
  data: PatternData;
  report: ReviewItem[];
  reportMarkdown: string;
}

const KIND_ORDER: ReviewKind[] = ["classified", "excluded", "profile-conflict", "lesson-conflict", "gloss-variants"];

function norm(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function isReflexive(key: string): boolean {
  return key.length > 3 && key.endsWith("se");
}

interface LessonRef {
  moduleId: string;
  verb: LessonVerb;
  /** NFC-normalized, lower-cased forms by person; "" when absent. */
  forms: Record<Person, string>;
}

function lessonForms(verb: LessonVerb): Record<Person, string> {
  const byKey = new Map<string, string>();
  for (const [key, value] of Object.entries(verb.forms ?? {})) {
    byKey.set(key.normalize("NFC"), typeof value === "string" ? norm(value) : "");
  }
  const out = {} as Record<Person, string>;
  for (const person of PERSONS) out[person] = byKey.get(person.normalize("NFC")) ?? "";
  return out;
}

/** The five profile forms in PERSONS order. Only `full` is read; labels and notes are ignored. */
function profileForms(profile: VerbProfile): Record<Person, string> {
  const full = (form: { full?: string } | undefined): string => norm(form?.full ?? "");
  return {
    yo: full(profile.phase1?.presentYo),
    tú: full(profile.phase1?.presentTu),
    él_ella_usted: full(profile.phase1?.presentEl),
    nosotros: full(profile.phase2?.presentNosotros),
    ellos_ustedes: full(profile.phase2?.presentEllos),
  };
}

/** The example with its single matching form token replaced by "___", or null. */
function frameSentence(
  example: { target: string; native: string },
  forms: Record<Person, string>,
): { person: Person; sentence: { target: string; native: string } } | null {
  const text = (example.target ?? "").normalize("NFC");
  const tokens = [...text.matchAll(/[\p{L}\p{M}]+/gu)];
  const formSet = new Set(PERSONS.map((p) => forms[p]));
  const hits = tokens.filter((t) => formSet.has(norm(t[0])));
  if (hits.length !== 1) return null;
  const hit = hits[0]!;
  const matched = PERSONS.filter((p) => forms[p] === norm(hit[0]));
  if (matched.length !== 1) return null;
  const at = hit.index ?? 0;
  return {
    person: matched[0]!,
    sentence: { target: `${text.slice(0, at)}___${text.slice(at + hit[0].length)}`, native: example.native },
  };
}

/** Every sense of a gloss, parentheticals removed: "to attend to, to look after" -> both. */
function senses(gloss: string): string[] {
  return gloss
    .replace(/\([^)]*\)/g, " ")
    .split(/[,/;]/)
    .map((sense) => sense.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * R4: most frequent lesson native; ties go to the variant whose first sense appears (as any sense) in
 * the most distinct variants, then the longer (more qualified) variant, then code-unit order. The
 * full variant is kept.
 */
function pickGloss(natives: string[]): { gloss: string; variants: string[] } {
  const counts = new Map<string, number>();
  for (const native of natives) counts.set(native, (counts.get(native) ?? 0) + 1);
  const distinct = [...counts.keys()].sort(byCodeUnit);
  const spread = (gloss: string): number => {
    const first = primaryGloss(gloss);
    return distinct.filter((variant) => senses(variant).includes(first)).length;
  };
  const ranked = [...distinct].sort(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      spread(b) - spread(a) ||
      b.length - a.length ||
      byCodeUnit(a, b),
  );
  const variants = distinct.length > 1 ? distinct.map((g) => `"${g}" (${counts.get(g)})`) : [];
  return { gloss: ranked[0] ?? "", variants };
}

const LEADING_ADVERBS = new Set(["first", "then", "now", "next", "always", "never", "just", "also", "again", "finally", "today"]);
const COMMAND_CUES = new Set(["please", "don't", "let's"]);

/** The bare head verb of every sense of these glosses: "to release, to let go" -> release, let. */
function headVerbs(glosses: string[]): Set<string> {
  const heads = new Set<string>();
  for (const gloss of glosses) {
    for (const sense of senses(gloss)) {
      const head = sense.replace(/^to /, "").split(" ")[0]?.toLowerCase() ?? "";
      if (head) heads.add(head);
    }
  }
  return heads;
}

/** An auxiliary followed by a subject pronoun opens a question ("Do you ...", "Can you ..."), not a command. */
const AUXILIARIES = new Set(["do", "does", "can", "could", "may", "might", "must", "shall", "should", "will", "would", "have", "has", "is", "are", "am"]);
const PRONOUNS = new Set(["i", "you", "he", "she", "it", "we", "they"]);

/**
 * R6: the English of a frame reads as a command (no subject), so the Spanish form is an imperative,
 * not a present-tense statement. Detected when the first word, after an optional vocative
 * ("Marcos, ...") and leading adverbs ("First ..."), is the head verb of any sense of the verb's
 * glosses ("let" for "to release, to let go"), or "please", "don't", "let's", "do not". An
 * auxiliary followed by a pronoun is a question and is kept.
 */
function isCommand(native: string, heads: Set<string>): boolean {
  const clean = (word: string): string =>
    word.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}']/gu, "");
  let words = native.normalize("NFC").trim().split(/\s+/);
  if (words.length > 1 && /^\p{Lu}[\p{L}'’-]*,$/u.test(words[0]!) && /^\p{Ll}/u.test(words[1]!)) words = words.slice(1);
  let at = 0;
  while (at < words.length - 1 && LEADING_ADVERBS.has(clean(words[at]!))) at++;
  const first = clean(words[at] ?? "");
  const second = clean(words[at + 1] ?? "");
  if (first === "do" && second === "not") return true;
  if (AUXILIARIES.has(first) && PRONOUNS.has(second)) return false;
  return first !== "" && (heads.has(first) || COMMAND_CUES.has(first));
}

/** Throws on an unknown section, person or infinitive so a stale override can never pass silently. */
function checkOverrides(overrides: Overrides, known: Set<string>): void {
  for (const section of Object.keys(overrides)) {
    if (!(OVERRIDE_SECTIONS as readonly string[]).includes(section)) {
      throw new Error(`es-overrides: unknown section "${section}"`);
    }
  }
  for (const section of OVERRIDE_SECTIONS) {
    for (const [infinitive, value] of Object.entries(overrides[section] ?? {})) {
      if (!known.has(norm(infinitive))) throw new Error(`es-overrides: ${section} names unknown verb "${infinitive}"`);
      const persons = Array.isArray(value) ? value : typeof value === "object" && value ? Object.keys(value) : [];
      for (const person of persons) {
        if (!(PERSONS as readonly string[]).includes(person)) {
          throw new Error(`es-overrides: ${section} ${infinitive} names unknown person "${person}"`);
        }
      }
    }
  }
}

/** The overrides for one verb, keys NFC lower-cased. */
interface VerbOverrides {
  gloss?: string;
  formEnglish: Partial<Record<Person, string>>;
  exclude?: string;
  dropFrames: Person[];
  forms: Partial<Record<Person, string>>;
}

function overridesFor(overrides: Overrides, key: string): VerbOverrides {
  const pick = <T>(table: Record<string, T> | undefined): T | undefined => {
    for (const [infinitive, value] of Object.entries(table ?? {})) if (norm(infinitive) === key) return value;
    return undefined;
  };
  const forms: Partial<Record<Person, string>> = {};
  for (const [person, form] of Object.entries(pick(overrides.forms) ?? {})) forms[person as Person] = norm(form ?? "");
  return {
    gloss: pick(overrides.gloss)?.trim(),
    formEnglish: pick(overrides.formEnglish) ?? {},
    exclude: pick(overrides.exclude),
    dropFrames: pick(overrides.dropFrames) ?? [],
    forms,
  };
}

/** Stable JSON for the report: object keys sorted by code unit, two-space indent. */
function canonicalJson(value: unknown): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort(byCodeUnit)
          .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sortKeys(value), null, 2);
}

interface Candidate {
  coreRank: number | null;
  coreEnglish: string;
  modules: Set<string>;
}

export function compilePatterns(input: CompileInput): CompileOutput {
  const report: ReviewItem[] = [];

  const profiles = new Map<string, VerbProfile>();
  for (const [key, profile] of Object.entries(input.profiles)) profiles.set(norm(key), profile);

  // Index lesson entries. Reflexive (-se) entries never carry forms into the output.
  const plain = new Map<string, LessonRef[]>();
  const reflexive: { key: string; base: string; moduleId: string | null }[] = [];
  for (const file of input.lessonFiles) {
    for (const lessonKey of Object.keys(file.lessons).sort(byCodeUnit)) {
      for (const verb of file.lessons[lessonKey]?.verbs ?? []) {
        const key = norm(verb.infinitive);
        if (!key) continue;
        if (isReflexive(key)) {
          reflexive.push({ key, base: key.slice(0, -2), moduleId: file.module });
          continue;
        }
        const refs = plain.get(key) ?? [];
        refs.push({ moduleId: file.module, verb, forms: lessonForms(verb) });
        plain.set(key, refs);
      }
    }
  }

  const candidates = new Map<string, Candidate>();
  const candidate = (key: string): Candidate => {
    let c = candidates.get(key);
    if (!c) {
      c = { coreRank: null, coreEnglish: "", modules: new Set() };
      candidates.set(key, c);
    }
    return c;
  };

  input.core.forEach((entry, index) => {
    const key = norm(entry.infinitive);
    if (!key) return;
    if (isReflexive(key)) {
      reflexive.push({ key, base: key.slice(0, -2), moduleId: null });
      return;
    }
    const c = candidate(key);
    if (c.coreRank === null) {
      c.coreRank = index + 1;
      c.coreEnglish = (entry.english ?? "").trim();
    }
  });
  for (const [key, refs] of plain) for (const ref of refs) candidate(key).modules.add(ref.moduleId);

  const reflexiveExcluded = new Set<string>();
  for (const entry of reflexive) {
    if (plain.has(entry.base) || profiles.has(entry.base)) {
      if (entry.moduleId !== null) candidate(entry.base).modules.add(entry.moduleId);
    } else if (!reflexiveExcluded.has(entry.key)) {
      reflexiveExcluded.add(entry.key);
      report.push({ infinitive: entry.key, kind: "excluded", detail: "reflexive-only" });
    }
  }

  const overrides = input.overrides ?? {};
  checkOverrides(overrides, new Set(candidates.keys()));

  const verbs: VerbEntry[] = [];
  for (const key of [...candidates.keys()].sort(byCodeUnit)) {
    const cand = candidates.get(key)!;
    const entry = compileVerb(key, cand, plain.get(key) ?? [], profiles.get(key), overridesFor(overrides, key), report);
    if (entry) verbs.push(entry);
  }

  report.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      byCodeUnit(a.infinitive, b.infinitive) ||
      byCodeUnit(a.detail, b.detail),
  );
  const reportMarkdown = renderReport(report, overrides);
  const reportSha256 = sha256(reportMarkdown);
  const signedOff = input.signoff?.reportSha256 === reportSha256;
  const shipped = verbs
    .filter((v) => v.status === "verified" || signedOff)
    .sort((a, b) => byCodeUnit(a.infinitive, b.infinitive));
  const families = [...FAMILIES];
  const dataHash = sha256(JSON.stringify({ families, crushLevels: input.crushLevels, verbs: shipped })).slice(0, 16);

  const data: PatternData = {
    version: 1,
    language: "es",
    tense: "present",
    dataHash,
    reportSha256,
    signedOff,
    families,
    crushLevels: input.crushLevels,
    verbs: shipped,
  };
  return { data, report, reportMarkdown };
}

function compileVerb(
  key: string,
  cand: Candidate,
  refs: LessonRef[],
  profile: VerbProfile | undefined,
  ov: VerbOverrides,
  report: ReviewItem[],
): VerbEntry | null {
  const exclude = (detail: string): null => {
    report.push({ infinitive: key, kind: "excluded", detail });
    return null;
  };
  if (ov.exclude !== undefined) return exclude(`override: ${ov.exclude}`);

  // Reviewed form corrections replace the profile form and every lesson form for that person.
  const lessonFormsOf = (ref: LessonRef): Record<Person, string> => ({ ...ref.forms, ...ov.forms });

  // 1. Forms. With a profile, a disagreeing lesson is resolved per person (R2); otherwise lesson
  // forms must agree across modules.
  let full: Record<Person, string>;
  let status: VerbEntry["status"];
  if (profile) {
    const prof: Record<Person, string> = { ...profileForms(profile), ...ov.forms };
    const missing = PERSONS.find((p) => !prof[p]);
    if (missing) return exclude(`missing ${missing}`);
    const lessonValues = {} as Record<Person, string[]>;
    for (const person of PERSONS) {
      lessonValues[person] = [...new Set(refs.map((r) => lessonFormsOf(r)[person]).filter(Boolean))];
    }
    const conflicts = PERSONS.filter((p) => lessonValues[p].some((v) => v !== prof[p]));
    full = { ...prof };
    if (conflicts.length > 0) {
      const lessonSet = { ...prof };
      for (const p of conflicts) if (lessonValues[p].length === 1) lessonSet[p] = lessonValues[p][0]!;
      const profileBad = formIssues(key, prof);
      const lessonBad = formIssues(key, lessonSet);
      let unresolved = false;
      const parts = conflicts.map((p) => {
        const lessonOk = lessonValues[p].length === 1 && !lessonBad.includes(p);
        const profileOk = !profileBad.includes(p);
        let side = "unresolved";
        if (lessonOk && !profileOk) {
          full[p] = lessonSet[p];
          side = "lesson used";
        } else if (profileOk && !lessonOk) {
          side = "profile used";
        } else {
          unresolved = true;
        }
        const others = lessonValues[p].filter((v) => v !== prof[p]).map((v) => `"${v}"`);
        return `${p} profile "${prof[p]}" vs lesson ${others.join(" vs ")}; ${side}`;
      });
      report.push({ infinitive: key, kind: "profile-conflict", detail: parts.join("; ") });
      if (unresolved) return exclude("profile-conflict unresolved");
    }
    status = "verified";
  } else {
    const values = {} as Record<Person, string[]>;
    for (const person of PERSONS) {
      values[person] = [...new Set(refs.map((r) => lessonFormsOf(r)[person]).filter(Boolean))];
    }
    if (PERSONS.every((p) => values[p].length === 0)) return exclude("no forms");
    const clashes = PERSONS.filter((p) => values[p].length > 1).map(
      (p) => `${p} ${values[p].map((v) => `"${v}"`).join(" vs ")}`,
    );
    if (clashes.length > 0) {
      report.push({ infinitive: key, kind: "lesson-conflict", detail: `modules disagree: ${clashes.join("; ")}` });
      return exclude("lesson-conflict");
    }
    const missing = PERSONS.find((p) => values[p].length === 0);
    if (missing) return exclude(`missing ${missing}`);
    full = {} as Record<Person, string>;
    for (const person of PERSONS) full[person] = values[person][0]!;
    status = "classified";
  }

  // 2. R1 gate: every form needs a family or a standard irregular rule, and must fit the verb's pattern.
  const issues = formIssues(key, full);
  if (issues.length > 0) {
    return exclude(`form/tag mismatch ${issues.map((p) => `${p}: ${full[p]}`).join(", ")}`);
  }

  // 3. Gloss (R4): override, else the picked lesson native (full variant), else core english, else
  // dictionary englishParallel.
  const picked = pickGloss(refs.map((r) => (r.verb.native ?? "").trim()).filter(Boolean));
  if (picked.variants.length > 0) {
    report.push({ infinitive: key, kind: "gloss-variants", detail: `${picked.variants.join(", ")}; most frequent used` });
  }
  const english = ov.gloss || picked.gloss || cand.coreEnglish || (profile?.englishParallel ?? "").trim();
  if (!primaryGloss(english)) return exclude("no english");

  // 4. Per-person families, stem/ending split and English.
  const forms: VerbForm[] = [];
  for (const person of PERSONS) {
    const families: FamilyId[] = formFamilies(key, person, full[person]);
    const { stem, ending } = splitForm(key, person, full[person], families);
    forms.push({
      person,
      full: full[person],
      stem,
      ending,
      english: ov.formEnglish[person] ?? englishForm(english, person),
      families,
      sentence: null,
    });
  }

  // 5. Sentence frame from the first module (sorted) whose example has exactly one form token, is not
  // a command (R6) and is not dropped by an override. Command heads come from every sense of the
  // stored gloss and of every lesson gloss for this verb.
  const heads = headVerbs([english, ...refs.map((r) => r.verb.native ?? "")]);
  const ordered = refs
    .map((ref, index) => ({ ref, index }))
    .sort((a, b) => byCodeUnit(a.ref.moduleId, b.ref.moduleId) || a.index - b.index);
  for (const { ref } of ordered) {
    if (!ref.verb.example) continue;
    const framed = frameSentence(ref.verb.example, full);
    if (!framed) continue;
    if (ov.dropFrames.includes(framed.person)) continue;
    if (isCommand(framed.sentence.native ?? "", heads)) continue;
    forms.find((f) => f.person === framed.person)!.sentence = framed.sentence;
    break;
  }

  // 6. Sources: core first, then modules sorted.
  const sources: VerbSource[] = [];
  if (cand.coreRank !== null) sources.push({ kind: "core", rank: cand.coreRank });
  for (const moduleId of [...cand.modules].sort(byCodeUnit)) sources.push({ kind: "module", moduleId });

  if (status === "classified") {
    const detail = forms
      .map((f) => {
        const rule = f.families.length === 0 ? ` (${explainIrregular(key, f.person, f.full)})` : "";
        return `${f.person} ${f.full} [${f.families.join(", ")}]${rule}`;
      })
      .join("; ");
    report.push({ infinitive: key, kind: "classified", detail: `"${english}": ${detail}` });
  }
  return { infinitive: key, english, status, sources, forms };
}

function renderReport(items: ReviewItem[], overrides: Overrides): string {
  const lines: string[] = ["# Verb patterns review report (es, present)", ""];
  lines.push(`Items: ${items.length}`, "");
  for (const kind of KIND_ORDER) {
    const group = items
      .filter((i) => i.kind === kind)
      .sort((a, b) => byCodeUnit(a.infinitive, b.infinitive) || byCodeUnit(a.detail, b.detail));
    lines.push(`## ${kind} (${group.length})`, "");
    if (group.length === 0) lines.push("None.");
    for (const item of group) lines.push(`- ${item.infinitive}: ${item.detail}`);
    lines.push("");
  }
  lines.push("## overrides", "", "Reviewed corrections applied by the compiler (docs/verb-patterns/es-overrides.json).", "");
  lines.push("```json", canonicalJson(overrides), "```", "");
  return lines.join("\n");
}
