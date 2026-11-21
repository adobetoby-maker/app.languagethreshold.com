// Built by TAC — 2026-11-21
// Authoring-time verb-form rules that the runtime pack does not carry yet (model section 5
// `contentChecks` has patterns only). They apply to generated lesson content in the content
// builders and validators, never to a learner's answer. A pack with no row gets no rule: the check
// is skipped, never borrowed from another language. Delete a row when the pack carries the rule.

import type { LanguagePack } from "./types.ts";

export interface ContentRules {
  /** Every required person form must differ from the others. */
  distinctForms: boolean;
  /** [index in the required keys, ending the form must match, form name, message tail]. */
  endings: readonly (readonly [number, RegExp, string, string])[];
  /** [index, index, message]: the two forms must not be equal. */
  mustDiffer: readonly (readonly [number, number, string])[];
  /** An infinitive base ending like this drops its last two letters for the stem (sentarse). */
  reflexiveSuffix: RegExp | null;
  /** Vowel/spelling stem variants (sient-, jueg-, toqu-) count as the verb's own stem. */
  stemVariants: boolean;
  /** Suppletive forms that count as using an infinitive. */
  extraForms: Record<string, readonly string[]>;
}

const NONE: ContentRules = {
  distinctForms: false,
  endings: [],
  mustDiffer: [],
  reflexiveSuffix: null,
  stemVariants: false,
  extraForms: {},
};

const ROWS: Record<string, ContentRules> = {
  es: {
    distinctForms: true,
    endings: [
      [1, /s$/i, "tú", "should end in -s"],
      [3, /mos$/i, "nosotros", "should end in -mos"],
      [4, /n$/i, "ellos/ustedes", "should end in -n"],
    ],
    mustDiffer: [],
    reflexiveSuffix: /[aeií]rse$/,
    stemVariants: true,
    extraForms: { haber: ["hay"] },
  },
  en: {
    ...NONE,
    mustDiffer: [[2, 0, "the he/she form must differ from the I form (add the -s)"]],
  },
};

export function contentRulesFor(pack: LanguagePack): ContentRules {
  return ROWS[pack.code] ?? NONE;
}
