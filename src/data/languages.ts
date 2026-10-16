/** Language identities shared by the app and authenticated assessment routes. */
export type Language =
  | "Spanish"
  | "French"
  | "German"
  | "Italian"
  | "Japanese"
  | "Chinese"
  | "Korean"
  | "Portuguese"
  | "Pashto"
  | "English";

export const LANGUAGES: Language[] = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Chinese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
];

// The learner's native ("translation") language — used for the left pane,
// definitions, lesson explanations, etc. Default English; expandable.
export type NativeLanguage =
  | "English"
  | "Spanish"
  | "French"
  | "German"
  | "Italian"
  | "Portuguese"
  | "Dutch"
  | "Polish"
  | "Russian"
  | "Turkish"
  | "Arabic"
  | "Hindi"
  | "Chinese (Simplified)"
  | "Japanese"
  | "Korean";

export const NATIVE_LANGUAGES: NativeLanguage[] = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Polish",
  "Russian",
  "Turkish",
  "Arabic",
  "Hindi",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
];
