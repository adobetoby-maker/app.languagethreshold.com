// Built by TAC — 2026-11-21
// The beginner on-ramp of a language ("Spanish 101" and the courses that go with it), read from
// pack.library (language-pack model section 5): the pack names its default course, the ordered
// core basics courses and their guidance lines. A pack with none has no on-ramp; nothing else is
// shown in its place.

import { getModule } from "@/data/modules";
import { nativeLanguageName } from "@/data/languages";
import { packFor, type LanguagePack } from "@/data/language-packs/registry";
import { moduleBaseId } from "@/lib/module-order";

export interface OnrampCourse {
  /** Base course id ("spanish-basics"). */
  id: string;
  /** Short label: "Spanish 101", "Frequent Verbs". */
  label: string;
  /** Link that opens the course's free Foundation stage for this learning pair. */
  href: string;
}

export interface Onramp {
  pack: LanguagePack;
  /** The pack's default course ("Spanish 101"). */
  start: OnrampCourse;
  /** Every basics course, in the pack's order, the default course first. */
  courses: OnrampCourse[];
  /** The pack's intro line for the course list. */
  intro: string;
}

function courseLabel(pack: LanguagePack, id: string): string {
  const full = getModule(id)?.name ?? id;
  const head = full.split(" · ")[0];
  const rest = head.startsWith(`${pack.name} `) ? head.slice(pack.name.length + 1) : head;
  // "Spanish 101" keeps its language; "Spanish Frequent Verbs" drops it.
  return /^\d/.test(rest) ? head : rest;
}

function foundationId(pack: LanguagePack, base: string): string {
  return pack.ids.legacyUnscopedStorage ? `foundation-${base}` : `foundation-${base}-${pack.code}`;
}

/** The on-ramp for a learning pair, or null when the pack declares none for that native language. */
export function onrampFor(target: string, native: string): Onramp | null {
  const pack = packFor(target);
  if (!pack || !pack.library.defaultModule || pack.library.coreBasics.length === 0) return null;
  if (native !== nativeLanguageName(pack.native.default)) return null;
  const course = (id: string): OnrampCourse | null => {
    const stage = foundationId(pack, id);
    if (!getModule(id)) return null;
    const params = new URLSearchParams({
      tab: "core30",
      module: stage,
      target: pack.name,
      native,
    });
    return { id, label: courseLabel(pack, id), href: `/?${params.toString()}` };
  };
  const start = course(pack.library.defaultModule);
  if (!start) return null;
  const courses = pack.library.coreBasics
    .filter((id) => getModule(id)?.name.startsWith(`${pack.name} `))
    .map(course)
    .filter((c): c is OnrampCourse => c !== null);
  return { pack, start, courses, intro: pack.library.intro };
}

/** True when a module (any stage) is one of the pack's basics courses. */
export function isBasicsModule(moduleId: string, target: string): boolean {
  const pack = packFor(target);
  return Boolean(pack && pack.library.coreBasics.includes(moduleBaseId(moduleId)));
}

/** True when a module is the pack's default course (any stage). */
export function isDefaultCourse(moduleId: string, target: string): boolean {
  const pack = packFor(target);
  return Boolean(pack && pack.library.defaultModule && moduleBaseId(moduleId) === pack.library.defaultModule);
}
