// Built by TAC — 2026-10-20
// Verb Games: pure pattern compiler. Lesson verbs + dictionary profiles + core list in,
// PatternData + review items + review report markdown out. No file writes, no runtime AI.

import { createHash } from "node:crypto";
import type { VerbProfile } from "../../components/dictionary/types.ts";
import type { LessonVerb } from "../lesson-content-core.ts";
import { formFamilies, splitForm } from "./classify.ts";
import { englishForm, primaryGloss } from "./english.ts";
import { FAMILIES } from "./families.ts";
import { PERSONS } from "./types.ts";
import type { CrushLevel, FamilyId, PatternData, Person, VerbEntry, VerbForm, VerbSource } from "./types.ts";

export interface LessonFile {
  module: string;
  lessons: Record<string, { verbs?: LessonVerb[] }>;
}

export interface CompileInput {
  lessonFiles: LessonFile[];
  profiles: Record<string, VerbProfile>;
  core: { infinitive: string; english: string }[];
  crushLevels: CrushLevel[];
  signoff: { reportSha256: string; signedBy: string; signedAt: string } | null;
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

function pickGloss(natives: string[]): { gloss: string; variants: string[] } {
  const counts = new Map<string, number>();
  for (const native of natives) counts.set(native, (counts.get(native) ?? 0) + 1);
  const distinct = [...counts.keys()].sort(byCodeUnit);
  let best = "";
  let bestCount = 0;
  for (const gloss of distinct) {
    const count = counts.get(gloss) ?? 0;
    if (count > bestCount) {
      best = gloss;
      bestCount = count;
    }
  }
  const variants = distinct.length > 1 ? distinct.map((g) => `"${g}" (${counts.get(g)})`) : [];
  return { gloss: best, variants };
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

  const verbs: VerbEntry[] = [];
  for (const key of [...candidates.keys()].sort(byCodeUnit)) {
    const cand = candidates.get(key)!;
    const entry = compileVerb(key, cand, plain.get(key) ?? [], profiles.get(key), report);
    if (entry) verbs.push(entry);
  }

  report.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      byCodeUnit(a.infinitive, b.infinitive) ||
      byCodeUnit(a.detail, b.detail),
  );
  const reportMarkdown = renderReport(report);
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
  report: ReviewItem[],
): VerbEntry | null {
  const exclude = (detail: string): null => {
    report.push({ infinitive: key, kind: "excluded", detail });
    return null;
  };

  // 1. Forms: profile wins; otherwise lesson forms that agree across modules.
  let full: Record<Person, string>;
  let status: VerbEntry["status"];
  if (profile) {
    full = profileForms(profile);
    const missing = PERSONS.find((p) => !full[p]);
    if (missing) return exclude(`missing ${missing}`);
    const clashes: string[] = [];
    for (const person of PERSONS) {
      const others = [...new Set(refs.map((r) => r.forms[person]).filter((v) => v && v !== full[person]))];
      for (const other of others) clashes.push(`${person} profile "${full[person]}" vs lesson "${other}"`);
    }
    if (clashes.length > 0) {
      report.push({ infinitive: key, kind: "profile-conflict", detail: `${clashes.join("; ")}; profile used` });
    }
    status = "verified";
  } else {
    const values = {} as Record<Person, string[]>;
    for (const person of PERSONS) values[person] = [...new Set(refs.map((r) => r.forms[person]).filter(Boolean))];
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

  // 2. Gloss: most frequent lesson native, else core english, else dictionary englishParallel.
  const picked = pickGloss(refs.map((r) => (r.verb.native ?? "").trim()).filter(Boolean));
  if (picked.variants.length > 0) {
    report.push({ infinitive: key, kind: "gloss-variants", detail: `${picked.variants.join(", ")}; most frequent used` });
  }
  const gloss = picked.gloss || cand.coreEnglish || (profile?.englishParallel ?? "").trim();
  const english = primaryGloss(gloss);
  if (!english) return exclude("no english");

  // 3. Per-person families, stem/ending split and English.
  const forms: VerbForm[] = [];
  for (const person of PERSONS) {
    const families: FamilyId[] = formFamilies(key, person, full[person]);
    if (status === "classified" && families.length === 0) return exclude(`no family for ${person}`);
    const { stem, ending } = splitForm(key, person, full[person], families);
    forms.push({
      person,
      full: full[person],
      stem,
      ending,
      english: englishForm(gloss, person),
      families,
      sentence: null,
    });
  }

  // 4. Sentence frame from the first module (sorted) whose example has exactly one form token.
  const ordered = refs
    .map((ref, index) => ({ ref, index }))
    .sort((a, b) => byCodeUnit(a.ref.moduleId, b.ref.moduleId) || a.index - b.index);
  for (const { ref } of ordered) {
    if (!ref.verb.example) continue;
    const framed = frameSentence(ref.verb.example, full);
    if (!framed) continue;
    forms.find((f) => f.person === framed.person)!.sentence = framed.sentence;
    break;
  }

  // 5. Sources: core first, then modules sorted.
  const sources: VerbSource[] = [];
  if (cand.coreRank !== null) sources.push({ kind: "core", rank: cand.coreRank });
  for (const moduleId of [...cand.modules].sort(byCodeUnit)) sources.push({ kind: "module", moduleId });

  if (status === "classified") {
    const detail = forms.map((f) => `${f.person} ${f.full} [${f.families.join(", ")}]`).join("; ");
    report.push({ infinitive: key, kind: "classified", detail: `"${english}": ${detail}` });
  }
  return { infinitive: key, english, status, sources, forms };
}

function renderReport(items: ReviewItem[]): string {
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
  return lines.join("\n");
}
