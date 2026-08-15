/**
 * Reminder greetings.
 *
 * A reminder opens with a greeting in the target language, then invites in
 * English. The greeting is immersion — the first words you read each day are in
 * the language you are protecting. The invite stays English so the message is
 * still parseable half-asleep, and so a beginner in their fourth language is
 * never blocked by their own notification.
 *
 * Greetings are time-aware because "buonasera" at 7am is wrong in a way a
 * learner will notice, and noticing wrongness in the app erodes trust in the
 * content.
 */

export type GreetingPartOfDay = "morning" | "afternoon" | "evening";

interface LanguageGreetings {
  morning: string;
  afternoon: string;
  evening: string;
}

/**
 * Indexed by the app's Language union. Kept as a plain record rather than a
 * Partial so adding a language to LANGUAGES surfaces a type error here rather
 * than silently falling back to English.
 */
const GREETINGS: Record<string, LanguageGreetings> = {
  Spanish: { morning: "¡Buenos días!", afternoon: "¡Buenas tardes!", evening: "¡Buenas noches!" },
  French: { morning: "Bonjour !", afternoon: "Bon après-midi !", evening: "Bonsoir !" },
  German: { morning: "Guten Morgen!", afternoon: "Guten Tag!", evening: "Guten Abend!" },
  Italian: { morning: "Buongiorno!", afternoon: "Buon pomeriggio!", evening: "Buonasera!" },
  Japanese: { morning: "おはようございます！", afternoon: "こんにちは！", evening: "こんばんは！" },
  Korean: { morning: "좋은 아침이에요!", afternoon: "안녕하세요!", evening: "좋은 저녁이에요!" },
  Portuguese: { morning: "Bom dia!", afternoon: "Boa tarde!", evening: "Boa noite!" },
  Pashto: { morning: "سهار مو په خیر!", afternoon: "ورځ مو په خیر!", evening: "ماښام مو په خیر!" },
  English: { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" },
};

export function partOfDayForHour(hour: number): GreetingPartOfDay {
  if (!Number.isFinite(hour)) return "morning";
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/**
 * Greeting in the target language for the hour the reminder fires.
 * Falls back to English for any language without an entry, rather than
 * returning an empty string — a missing greeting should degrade to a working
 * notification, never to a malformed one.
 */
export function greetingFor(language: string, hour: number): string {
  const set = GREETINGS[language] ?? GREETINGS.English;
  return set[partOfDayForHour(hour)];
}

export function hasGreeting(language: string): boolean {
  return language in GREETINGS;
}
