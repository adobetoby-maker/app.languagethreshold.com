import type { SpeakingMissionLanguage } from "./speaking-missions.ts";

export type CoreSpeakingSection =
  | "Essential verbs"
  | "Grammar patterns"
  | "Daily living"
  | "Relationships & intimacy";

export interface CoreVerb {
  id: string;
  english: string;
  target: Record<SpeakingMissionLanguage, string>;
}

export interface DailyLivingTopic {
  id: string;
  title: string;
  objective: string;
  partnerRole: string;
  concepts: string[];
  riskClass?: "medical" | "emergency" | "financial" | "legal" | "minor-data" | "intimacy";
}

export interface CoreGrammarPattern {
  id: string;
  name: string;
  meaning: string;
  pattern: string;
  examples: string[];
  phase: 1 | 2;
  hook?: string;
}

export const CORE_SPEAKING_MODULE = {
  id: "core-speaking",
  name: "Core Speaking",
  emoji: "◈",
  category: "Core" as const,
  blurb:
    "Build the verbs and grammar that power everyday speech, then use them in practical daily-life and relationship conversations.",
  userRole: "Language learner handling an everyday conversation",
};

// Complements the app's story-first grammar patterns with the other structures
// learners need constantly in unscripted conversation. Language-specific forms
// stay separate so Japanese is never forced into a Romance-language template.
export const CORE_GRAMMAR_EXTENSIONS: Record<SpeakingMissionLanguage, CoreGrammarPattern[]> = {
  Spanish: [
    {
      id: "existence-hay",
      name: "There is / there are",
      meaning: "say that something exists or is available",
      pattern: "hay + [noun]",
      examples: ["Hay una cita disponible.", "No hay problema."],
      phase: 1,
    },
    {
      id: "articles-gender",
      name: "Articles and gender",
      meaning: "use the right form of the/a",
      pattern: "el / la / los / las · un / una / unos / unas",
      examples: ["la oficina", "un mensaje"],
      phase: 1,
    },
    {
      id: "plural-agreement",
      name: "Plural and agreement",
      meaning: "make nouns and describing words agree",
      pattern: "[noun] + s/es · [adjective] matches gender/number",
      examples: ["dos citas nuevas", "los documentos importantes"],
      phase: 1,
    },
    {
      id: "present-regular",
      name: "Present tense",
      meaning: "describe current actions, routines, and facts",
      pattern: "hablo / comes / vive",
      examples: ["Trabajo por la mañana.", "Vivimos cerca."],
      phase: 1,
    },
    {
      id: "present-irregular",
      name: "High-use irregular present",
      meaning: "use common irregular verbs in the present",
      pattern: "voy · hago · digo · vengo · sé",
      examples: ["Voy al trabajo.", "No sé la respuesta."],
      phase: 1,
    },
    {
      id: "negation",
      name: "Negation",
      meaning: "say not, never, or no longer",
      pattern: "no + [verb] · nunca · ya no",
      examples: ["No entiendo.", "Ya no vivo allí."],
      phase: 1,
    },
    {
      id: "yes-no-question",
      name: "Yes/no questions",
      meaning: "turn a statement into a spoken question",
      pattern: "¿[statement with rising intonation]?",
      examples: ["¿Tiene una cita?", "¿Puedo pagar aquí?"],
      phase: 1,
    },
    {
      id: "information-question",
      name: "Information questions",
      meaning: "ask who, what, where, when, why, or how",
      pattern: "qué / quién / dónde / cuándo / por qué / cómo + [question]",
      examples: ["¿Dónde está la oficina?", "¿Cuándo puede venir?"],
      phase: 1,
    },
    {
      id: "present-progressive",
      name: "Currently doing",
      meaning: "say what is happening right now",
      pattern: "estar + gerundio",
      examples: ["Estoy llamando para confirmar.", "Estamos esperando."],
      phase: 1,
    },
    {
      id: "preterite",
      name: "Completed past",
      meaning: "report a finished event",
      pattern: "hablé / comí / fui / hice",
      examples: ["Llamé ayer.", "Hice la reserva."],
      phase: 2,
    },
    {
      id: "imperfect",
      name: "Habitual or background past",
      meaning: "describe what used to happen or was in progress",
      pattern: "hablaba / comía / era / iba",
      examples: ["Vivía cerca.", "Antes trabajaba los sábados."],
      phase: 2,
    },
    {
      id: "present-perfect",
      name: "Recent or relevant past",
      meaning: "connect a past event to now",
      pattern: "haber + participio",
      examples: ["He perdido mi llave.", "¿Ha llegado el paquete?"],
      phase: 2,
    },
    {
      id: "direct-object",
      name: "Direct-object pronouns",
      meaning: "replace the person or thing directly affected",
      pattern: "lo / la / los / las + [verb]",
      examples: ["Lo necesito hoy.", "La llamo mañana."],
      phase: 2,
    },
    {
      id: "indirect-object",
      name: "Indirect-object pronouns",
      meaning: "say to or for whom something is done",
      pattern: "me / te / le / nos / les + [verb]",
      examples: ["Le dejo un mensaje.", "¿Me puede ayudar?"],
      phase: 2,
    },
    {
      id: "reflexive",
      name: "Reflexive actions",
      meaning: "describe actions people do to or for themselves",
      pattern: "me / te / se / nos + [verb]",
      examples: ["Me llamo Ana.", "Se levanta temprano."],
      phase: 1,
    },
    {
      id: "commands",
      name: "Everyday commands",
      meaning: "give a clear instruction or request",
      pattern: "hable / habla · no hable / no hables",
      examples: ["Espere aquí, por favor.", "No se preocupe."],
      phase: 2,
    },
    {
      id: "polite-request",
      name: "Polite conditional requests",
      meaning: "ask for something more gently",
      pattern: "¿podría / querría + infinitivo?",
      examples: ["¿Podría repetirlo?", "Querría cambiar la cita."],
      phase: 2,
    },
    {
      id: "comparisons",
      name: "Comparisons",
      meaning: "compare options, amounts, and qualities",
      pattern: "más / menos ... que · tan ... como",
      examples: ["Es más barato que el otro.", "Esta hora es mejor."],
      phase: 1,
    },
    {
      id: "por-para",
      name: "Por and para",
      meaning: "express cause, exchange, destination, purpose, and deadline",
      pattern: "por + [cause/path/exchange] · para + [purpose/destination/deadline]",
      examples: ["Gracias por la ayuda.", "Es para mañana."],
      phase: 2,
    },
    {
      id: "connectors",
      name: "Connect ideas",
      meaning: "join and contrast thoughts",
      pattern: "y · pero · entonces · aunque · por eso",
      examples: ["Quiero ir, pero trabajo.", "Está cerrado, por eso llamé."],
      phase: 1,
    },
    {
      id: "si-condition",
      name: "Real conditions",
      meaning: "say what happens if a condition is met",
      pattern: "si + presente, presente/futuro/imperativo",
      examples: ["Si hay tiempo, voy.", "Si puede, llámeme."],
      phase: 2,
    },
    {
      id: "subjunctive-trigger",
      name: "Wishes and requests with que",
      meaning: "express what one person wants another to do",
      pattern: "querer / necesitar que + subjuntivo",
      examples: ["Quiero que venga mañana.", "Necesito que me ayude."],
      phase: 2,
    },
  ],
  Italian: [
    {
      id: "existence-ce",
      name: "There is / there are",
      meaning: "say that something exists or is available",
      pattern: "c'è / ci sono + [noun]",
      examples: ["C'è un appuntamento disponibile.", "Non ci sono problemi."],
      phase: 1,
    },
    {
      id: "articles-gender",
      name: "Articles and gender",
      meaning: "use the right form of the/a",
      pattern: "il / lo / la / i / gli / le · un / uno / una",
      examples: ["l'ufficio", "un messaggio"],
      phase: 1,
    },
    {
      id: "plural-agreement",
      name: "Plural and agreement",
      meaning: "make nouns and describing words agree",
      pattern: "-o→-i · -a→-e · adjective agrees",
      examples: ["due appuntamenti nuovi", "le informazioni importanti"],
      phase: 1,
    },
    {
      id: "present-regular",
      name: "Present tense",
      meaning: "describe current actions, routines, and facts",
      pattern: "parlo / prendi / dorme",
      examples: ["Lavoro la mattina.", "Viviamo qui vicino."],
      phase: 1,
    },
    {
      id: "present-irregular",
      name: "High-use irregular present",
      meaning: "use common irregular verbs in the present",
      pattern: "vado · faccio · dico · vengo · so",
      examples: ["Vado al lavoro.", "Non so la risposta."],
      phase: 1,
    },
    {
      id: "negation",
      name: "Negation",
      meaning: "say not, never, or no longer",
      pattern: "non + [verb] · mai · non ... più",
      examples: ["Non capisco.", "Non abito più lì."],
      phase: 1,
    },
    {
      id: "yes-no-question",
      name: "Yes/no questions",
      meaning: "turn a statement into a spoken question",
      pattern: "[statement with rising intonation]?",
      examples: ["Ha un appuntamento?", "Posso pagare qui?"],
      phase: 1,
    },
    {
      id: "information-question",
      name: "Information questions",
      meaning: "ask who, what, where, when, why, or how",
      pattern: "chi / che cosa / dove / quando / perché / come + [question]",
      examples: ["Dov'è l'ufficio?", "Quando può venire?"],
      phase: 1,
    },
    {
      id: "present-progressive",
      name: "Currently doing",
      meaning: "emphasize what is happening right now",
      pattern: "stare + gerundio",
      examples: ["Sto chiamando per confermare.", "Stiamo aspettando."],
      phase: 1,
    },
    {
      id: "passato-prossimo",
      name: "Completed past",
      meaning: "report a finished event",
      pattern: "avere / essere + participio",
      examples: ["Ho chiamato ieri.", "Sono arrivato alle otto."],
      phase: 2,
    },
    {
      id: "imperfect",
      name: "Habitual or background past",
      meaning: "describe what used to happen or was in progress",
      pattern: "parlavo / mangiavo / ero / andavo",
      examples: ["Abitavo qui vicino.", "Prima lavoravo il sabato."],
      phase: 2,
    },
    {
      id: "direct-object",
      name: "Direct-object pronouns",
      meaning: "replace the person or thing directly affected",
      pattern: "lo / la / li / le + [verb]",
      examples: ["Lo voglio oggi.", "La chiamo domani."],
      phase: 2,
    },
    {
      id: "indirect-object",
      name: "Indirect-object pronouns",
      meaning: "say to or for whom something is done",
      pattern: "mi / ti / gli / le / ci / vi + [verb]",
      examples: ["Le lascio un messaggio.", "Mi può aiutare?"],
      phase: 2,
    },
    {
      id: "reflexive",
      name: "Reflexive actions",
      meaning: "describe actions people do to or for themselves",
      pattern: "mi / ti / si / ci / vi + [verb]",
      examples: ["Mi chiamo Anna.", "Si alza presto."],
      phase: 1,
    },
    {
      id: "commands",
      name: "Everyday commands",
      meaning: "give a clear instruction or request",
      pattern: "parli / parla · non parli / non parlare",
      examples: ["Aspetti qui, per favore.", "Non si preoccupi."],
      phase: 2,
    },
    {
      id: "polite-request",
      name: "Polite conditional requests",
      meaning: "ask for something more gently",
      pattern: "potrebbe / vorrei + infinitive",
      examples: ["Potrebbe ripetere?", "Vorrei cambiare l'appuntamento."],
      phase: 2,
    },
    {
      id: "comparisons",
      name: "Comparisons",
      meaning: "compare options, amounts, and qualities",
      pattern: "più / meno ... di/che · tanto ... quanto",
      examples: ["È più economico dell'altro.", "Quest'ora è migliore."],
      phase: 1,
    },
    {
      id: "prepositions",
      name: "High-use prepositions",
      meaning: "locate, move, and connect everyday information",
      pattern: "a · in · da · di · con · su · per",
      examples: ["Vado in ufficio.", "Vengo da Roma."],
      phase: 1,
    },
    {
      id: "ci-ne",
      name: "Ci and ne",
      meaning: "refer back to a place, topic, or quantity",
      pattern: "ci + [verb] · ne + [verb]",
      examples: ["Ci vado domani.", "Ne vorrei due."],
      phase: 2,
    },
    {
      id: "si-condition",
      name: "Real conditions",
      meaning: "say what happens if a condition is met",
      pattern: "se + presente, presente/futuro/imperativo",
      examples: ["Se c'è tempo, vado.", "Se può, mi chiami."],
      phase: 2,
    },
  ],
  Japanese: [
    {
      id: "topic-wa",
      name: "Topic marker は",
      meaning: "set what the sentence is about",
      pattern: "[topic] は [comment]",
      examples: ["予約は明日です。", "私は会社員です。"],
      phase: 1,
    },
    {
      id: "subject-ga",
      name: "Subject marker が",
      meaning: "identify or emphasize who or what does or is something",
      pattern: "[subject] が [predicate]",
      examples: ["田中さんが来ます。", "時間があります。"],
      phase: 1,
    },
    {
      id: "object-o",
      name: "Object marker を",
      meaning: "mark what an action affects",
      pattern: "[object] を [verb]",
      examples: ["水を飲みます。", "予約を確認します。"],
      phase: 1,
    },
    {
      id: "place-ni-de",
      name: "Place markers に and で",
      meaning: "distinguish destination/existence from action location",
      pattern: "[place] に 行く/いる · [place] で [action]",
      examples: ["病院に行きます。", "駅で待ちます。"],
      phase: 1,
    },
    {
      id: "direction-e",
      name: "Direction marker へ",
      meaning: "point toward a destination",
      pattern: "[destination] へ [movement verb]",
      examples: ["東京へ行きます。", "こちらへどうぞ。"],
      phase: 1,
    },
    {
      id: "possession-no",
      name: "Possession and description with の",
      meaning: "connect nouns as of, belonging to, or a type of",
      pattern: "[noun] の [noun]",
      examples: ["会社の電話番号", "明日の予約"],
      phase: 1,
    },
    {
      id: "and-also",
      name: "And, with, and also",
      meaning: "connect people and things or add another item",
      pattern: "と · も · や",
      examples: ["水とコーヒー", "私も行きます。"],
      phase: 1,
    },
    {
      id: "polite-present",
      name: "Polite present and future",
      meaning: "state routines, facts, and near-future actions politely",
      pattern: "[verb stem] ます",
      examples: ["毎日働きます。", "明日電話します。"],
      phase: 1,
    },
    {
      id: "negative",
      name: "Negative forms",
      meaning: "say that something is not true or will not happen",
      pattern: "〜ません / 〜ない",
      examples: ["分かりません。", "今日は行きません。"],
      phase: 1,
    },
    {
      id: "past",
      name: "Past forms",
      meaning: "report what happened or did not happen",
      pattern: "〜ました / 〜た · 〜ませんでした / 〜なかった",
      examples: ["昨日電話しました。", "予約できませんでした。"],
      phase: 1,
    },
    {
      id: "question-ka",
      name: "Questions with か",
      meaning: "ask a polite yes/no question",
      pattern: "[sentence] か",
      examples: ["予約がありますか。", "ここで払えますか。"],
      phase: 1,
    },
    {
      id: "information-question",
      name: "Information questions",
      meaning: "ask who, what, where, when, why, or how",
      pattern: "だれ / 何 / どこ / いつ / なぜ / どう + か",
      examples: ["予約はいつですか。", "駅はどこですか。"],
      phase: 1,
    },
    {
      id: "adjectives",
      name: "い and な adjectives",
      meaning: "describe things and change descriptions for negative or past time",
      pattern: "〜い · 〜な + noun · 〜くない · 〜だった",
      examples: ["安いホテルです。", "静かな部屋です。"],
      phase: 2,
    },
    {
      id: "te-form",
      name: "Connect actions with the て-form",
      meaning: "sequence actions and build many everyday patterns",
      pattern: "〜て、〜",
      examples: ["電話して、確認します。", "駅に行って、切符を買います。"],
      phase: 1,
    },
    {
      id: "request",
      name: "Polite requests",
      meaning: "ask someone to do something",
      pattern: "〜てください / お願いします",
      examples: ["もう一度言ってください。", "ゆっくりお願いします。"],
      phase: 1,
    },
    {
      id: "permission",
      name: "Ask and give permission",
      meaning: "ask whether an action is allowed",
      pattern: "〜てもいいですか",
      examples: ["ここに座ってもいいですか。", "カードで払ってもいいですか。"],
      phase: 2,
    },
    {
      id: "prohibition",
      name: "Say what is not allowed",
      meaning: "understand or state a prohibition",
      pattern: "〜てはいけません / 〜ないでください",
      examples: ["ここで写真を撮ってはいけません。", "触らないでください。"],
      phase: 2,
    },
    {
      id: "intention",
      name: "Intention",
      meaning: "say what you intend to do",
      pattern: "dictionary form + つもりです",
      examples: ["明日行くつもりです。", "電話するつもりです。"],
      phase: 2,
    },
    {
      id: "plan",
      name: "Scheduled plans",
      meaning: "state an arranged or expected plan",
      pattern: "dictionary form + 予定です",
      examples: ["三時に着く予定です。", "来週会う予定です。"],
      phase: 2,
    },
    {
      id: "experience",
      name: "Past experience",
      meaning: "say whether you have ever done something",
      pattern: "past plain + ことがあります",
      examples: ["日本に行ったことがあります。", "この薬を飲んだことがありません。"],
      phase: 2,
    },
    {
      id: "comparison",
      name: "Comparisons",
      meaning: "compare two options or choose a preference",
      pattern: "A より B のほうが [adjective]",
      examples: ["電車よりバスのほうが安いです。", "午前のほうがいいです。"],
      phase: 2,
    },
    {
      id: "counters",
      name: "Numbers and counters",
      meaning: "count people, objects, times, and durations naturally",
      pattern: "[number] + 人 / つ / 枚 / 回 / 時間",
      examples: ["二人です。", "三枚ください。"],
      phase: 1,
    },
    {
      id: "relative-clause",
      name: "Describe a noun with a clause",
      meaning: "identify people and things with a compact description",
      pattern: "[plain clause] + noun",
      examples: ["昨日買った本", "駅に行くバス"],
      phase: 2,
    },
    {
      id: "condition-tara",
      name: "Conditions with たら",
      meaning: "say what to do or what happens if/when something occurs",
      pattern: "past plain + ら",
      examples: ["着いたら電話してください。", "時間があったら行きます。"],
      phase: 2,
    },
    {
      id: "giving-receiving",
      name: "Giving and receiving",
      meaning: "show who gives or receives an action or thing",
      pattern: "あげる / くれる / もらう",
      examples: ["友達が手伝ってくれました。", "地図をもらいました。"],
      phase: 2,
    },
  ],
};

export const CORE_VERBS: CoreVerb[] = [
  {
    id: "be-identity",
    english: "to be — identity",
    target: { Spanish: "ser", Italian: "essere", Japanese: "である・です" },
  },
  {
    id: "be-state",
    english: "to be — state/location",
    target: { Spanish: "estar", Italian: "essere / stare", Japanese: "いる・ある" },
  },
  {
    id: "have",
    english: "to have",
    target: { Spanish: "tener", Italian: "avere", Japanese: "持つ" },
  },
  {
    id: "do-make",
    english: "to do / make",
    target: { Spanish: "hacer", Italian: "fare", Japanese: "する・作る" },
  },
  { id: "go", english: "to go", target: { Spanish: "ir", Italian: "andare", Japanese: "行く" } },
  {
    id: "come",
    english: "to come",
    target: { Spanish: "venir", Italian: "venire", Japanese: "来る" },
  },
  { id: "say", english: "to say", target: { Spanish: "decir", Italian: "dire", Japanese: "言う" } },
  {
    id: "tell",
    english: "to tell",
    target: { Spanish: "contar / decir", Italian: "raccontare / dire", Japanese: "伝える" },
  },
  {
    id: "speak",
    english: "to speak",
    target: { Spanish: "hablar", Italian: "parlare", Japanese: "話す" },
  },
  {
    id: "ask",
    english: "to ask",
    target: {
      Spanish: "preguntar / pedir",
      Italian: "chiedere / domandare",
      Japanese: "聞く・頼む",
    },
  },
  {
    id: "answer",
    english: "to answer",
    target: { Spanish: "contestar / responder", Italian: "rispondere", Japanese: "答える" },
  },
  {
    id: "know",
    english: "to know",
    target: { Spanish: "saber / conocer", Italian: "sapere / conoscere", Japanese: "知る・分かる" },
  },
  {
    id: "think",
    english: "to think",
    target: { Spanish: "pensar / creer", Italian: "pensare / credere", Japanese: "思う・考える" },
  },
  {
    id: "understand",
    english: "to understand",
    target: {
      Spanish: "entender / comprender",
      Italian: "capire / comprendere",
      Japanese: "分かる・理解する",
    },
  },
  {
    id: "want",
    english: "to want",
    target: { Spanish: "querer", Italian: "volere", Japanese: "欲しい・〜たい" },
  },
  {
    id: "need",
    english: "to need",
    target: { Spanish: "necesitar", Italian: "avere bisogno di", Japanese: "必要とする・要る" },
  },
  {
    id: "can",
    english: "can / to be able",
    target: { Spanish: "poder", Italian: "potere", Japanese: "できる" },
  },
  {
    id: "must",
    english: "must / to have to",
    target: { Spanish: "deber / tener que", Italian: "dovere", Japanese: "〜なければならない" },
  },
  {
    id: "like",
    english: "to like",
    target: { Spanish: "gustar", Italian: "piacere", Japanese: "好きだ" },
  },
  {
    id: "love",
    english: "to love",
    target: {
      Spanish: "amar / encantar",
      Italian: "amare / adorare",
      Japanese: "愛する・大好きだ",
    },
  },
  {
    id: "see",
    english: "to see",
    target: { Spanish: "ver", Italian: "vedere", Japanese: "見る・見える" },
  },
  {
    id: "look",
    english: "to look",
    target: { Spanish: "mirar", Italian: "guardare", Japanese: "見る" },
  },
  {
    id: "hear",
    english: "to hear",
    target: { Spanish: "oír", Italian: "sentire", Japanese: "聞こえる" },
  },
  {
    id: "listen",
    english: "to listen",
    target: { Spanish: "escuchar", Italian: "ascoltare", Japanese: "聞く" },
  },
  {
    id: "give",
    english: "to give",
    target: { Spanish: "dar", Italian: "dare", Japanese: "あげる・くれる" },
  },
  {
    id: "take",
    english: "to take",
    target: {
      Spanish: "tomar / llevar",
      Italian: "prendere / portare",
      Japanese: "取る・持って行く",
    },
  },
  {
    id: "bring",
    english: "to bring",
    target: { Spanish: "traer", Italian: "portare", Japanese: "持って来る" },
  },
  {
    id: "get",
    english: "to get / receive",
    target: {
      Spanish: "conseguir / recibir",
      Italian: "ottenere / ricevere",
      Japanese: "得る・受け取る",
    },
  },
  {
    id: "put",
    english: "to put",
    target: { Spanish: "poner", Italian: "mettere", Japanese: "置く・入れる" },
  },
  {
    id: "find",
    english: "to find",
    target: { Spanish: "encontrar", Italian: "trovare", Japanese: "見つける" },
  },
  { id: "use", english: "to use", target: { Spanish: "usar", Italian: "usare", Japanese: "使う" } },
  {
    id: "work",
    english: "to work",
    target: {
      Spanish: "trabajar / funcionar",
      Italian: "lavorare / funzionare",
      Japanese: "働く・作動する",
    },
  },
  {
    id: "live",
    english: "to live",
    target: { Spanish: "vivir", Italian: "vivere / abitare", Japanese: "住む・生きる" },
  },
  {
    id: "eat",
    english: "to eat",
    target: { Spanish: "comer", Italian: "mangiare", Japanese: "食べる" },
  },
  {
    id: "drink",
    english: "to drink",
    target: { Spanish: "beber / tomar", Italian: "bere", Japanese: "飲む" },
  },
  {
    id: "buy",
    english: "to buy",
    target: { Spanish: "comprar", Italian: "comprare", Japanese: "買う" },
  },
  {
    id: "pay",
    english: "to pay",
    target: { Spanish: "pagar", Italian: "pagare", Japanese: "払う" },
  },
  {
    id: "call",
    english: "to call",
    target: { Spanish: "llamar", Italian: "chiamare", Japanese: "電話する・呼ぶ" },
  },
  {
    id: "wait",
    english: "to wait / hope",
    target: { Spanish: "esperar", Italian: "aspettare / sperare", Japanese: "待つ" },
  },
  {
    id: "help",
    english: "to help",
    target: { Spanish: "ayudar", Italian: "aiutare", Japanese: "助ける・手伝う" },
  },
  {
    id: "start",
    english: "to start",
    target: { Spanish: "empezar / comenzar", Italian: "cominciare / iniziare", Japanese: "始める" },
  },
  {
    id: "finish",
    english: "to finish",
    target: {
      Spanish: "terminar / acabar",
      Italian: "finire / terminare",
      Japanese: "終わる・終える",
    },
  },
  {
    id: "open",
    english: "to open",
    target: { Spanish: "abrir", Italian: "aprire", Japanese: "開ける・開く" },
  },
  {
    id: "close",
    english: "to close",
    target: { Spanish: "cerrar", Italian: "chiudere", Japanese: "閉める・閉まる" },
  },
  {
    id: "read",
    english: "to read",
    target: { Spanish: "leer", Italian: "leggere", Japanese: "読む" },
  },
  {
    id: "write",
    english: "to write",
    target: { Spanish: "escribir", Italian: "scrivere", Japanese: "書く" },
  },
  {
    id: "learn",
    english: "to learn",
    target: { Spanish: "aprender", Italian: "imparare", Japanese: "学ぶ・習う" },
  },
  {
    id: "remember",
    english: "to remember",
    target: {
      Spanish: "recordar / acordarse",
      Italian: "ricordare / ricordarsi",
      Japanese: "覚えている・思い出す",
    },
  },
  {
    id: "forget",
    english: "to forget",
    target: {
      Spanish: "olvidar / olvidarse",
      Italian: "dimenticare / dimenticarsi",
      Japanese: "忘れる",
    },
  },
  {
    id: "feel",
    english: "to feel",
    target: { Spanish: "sentir / sentirse", Italian: "sentire / sentirsi", Japanese: "感じる" },
  },
];

export const DAILY_LIVING_TOPICS: DailyLivingTopic[] = [
  {
    id: "introductions",
    title: "Introduce yourself",
    objective: "Give your name, where you are from, what you do, and one personal detail.",
    partnerRole: "Person meeting the learner for the first time",
    concepts: ["name", "origin", "work", "interests"],
  },
  {
    id: "spell-name",
    title: "Spell and confirm your name",
    objective:
      "Spell your name, correct a misunderstanding, and confirm how it appears on a record.",
    partnerRole: "Receptionist entering the learner's name",
    concepts: ["alphabet", "spelling", "confirmation"],
  },
  {
    id: "numbers",
    title: "Use numbers in real life",
    objective: "Exchange a phone number, address number, price, and quantity accurately.",
    partnerRole: "Clerk confirming numeric information",
    concepts: ["numbers", "phone number", "price", "quantity"],
  },
  {
    id: "date-time",
    title: "Confirm dates and times",
    objective: "Ask for and confirm the day, date, time, and duration.",
    partnerRole: "Scheduler confirming a date and time",
    concepts: ["calendar", "time", "duration"],
  },
  {
    id: "daily-routine",
    title: "Describe your daily routine",
    objective: "Explain when you wake, work, eat, travel, and go to bed.",
    partnerRole: "Friend comparing daily routines",
    concepts: ["morning", "work", "meals", "evening"],
  },
  {
    id: "family",
    title: "Talk about family",
    objective: "Describe close family members, relationships, ages, and where they live.",
    partnerRole: "New acquaintance asking about family",
    concepts: ["family", "age", "relationships"],
  },
  {
    id: "home",
    title: "Describe your home",
    objective: "Describe where you live, the rooms, household items, and what needs attention.",
    partnerRole: "Neighbor visiting the learner's home",
    concepts: ["home", "rooms", "furniture"],
  },
  {
    id: "weather",
    title: "Discuss weather and clothing",
    objective: "Understand the forecast and decide what clothing or plans fit the weather.",
    partnerRole: "Local discussing today's weather",
    concepts: ["weather", "temperature", "clothing"],
  },
  {
    id: "small-talk",
    title: "Make everyday small talk",
    objective: "Open, sustain, and politely close a brief everyday conversation.",
    partnerRole: "Neighbor encountered in public",
    concepts: ["greeting", "weekend", "weather", "farewell"],
  },
  {
    id: "answer-phone",
    title: "Answer the phone",
    objective: "Answer professionally, identify yourself, and ask how you can help.",
    partnerRole: "Caller reaching the learner",
    concepts: ["phone greeting", "identity", "purpose"],
  },
  {
    id: "ask-for-person",
    title: "Ask to speak with someone",
    objective: "Ask for the right person, explain why you are calling, and handle their absence.",
    partnerRole: "Person answering a business phone",
    concepts: ["extension", "availability", "call purpose"],
  },
  {
    id: "take-message",
    title: "Take and leave a phone message",
    objective: "Record or provide a name, number, reason for calling, and callback request.",
    partnerRole: "Caller or receptionist exchanging a message",
    concepts: ["message", "callback", "phone number"],
  },
  {
    id: "voicemail",
    title: "Understand and leave voicemail",
    objective: "Leave a concise voicemail and identify the key details in a received message.",
    partnerRole: "Voicemail recipient returning the call",
    concepts: ["voicemail", "reason", "callback"],
  },
  {
    id: "wrong-number",
    title: "Handle a wrong number or bad connection",
    objective: "Clarify who was called, explain the error, and manage a poor connection politely.",
    partnerRole: "Caller who reached the wrong person",
    concepts: ["wrong number", "connection", "repeat"],
  },
  {
    id: "make-appointment",
    title: "Make an appointment",
    objective:
      "State the reason, ask about availability, choose a time, and confirm the appointment.",
    partnerRole: "Scheduler at an office",
    concepts: ["appointment", "availability", "date", "confirmation"],
  },
  {
    id: "reschedule",
    title: "Reschedule an appointment",
    objective: "Explain that you cannot attend, compare alternatives, and confirm the new time.",
    partnerRole: "Scheduler changing an appointment",
    concepts: ["reschedule", "conflict", "new time"],
  },
  {
    id: "cancel",
    title: "Cancel an appointment",
    objective: "Cancel politely, answer necessary questions, and learn any cancellation policy.",
    partnerRole: "Scheduler processing a cancellation",
    concepts: ["cancel", "notice", "policy"],
  },
  {
    id: "confirm-appointment",
    title: "Confirm appointment details",
    objective: "Confirm date, time, location, preparation, documents, and arrival instructions.",
    partnerRole: "Office staff confirming an upcoming visit",
    concepts: ["confirmation", "location", "instructions"],
  },
  {
    id: "doctor-visit",
    title: "Prepare for a basic doctor visit",
    objective:
      "Describe the reason for the visit, symptoms, onset, medications, and allergies without seeking diagnosis from the AI.",
    partnerRole: "Clinic intake staff",
    concepts: ["symptoms", "onset", "medications", "allergies"],
    riskClass: "medical",
  },
  {
    id: "pharmacy",
    title: "Use a pharmacy",
    objective:
      "Ask about a prescription, pickup time, price, and ask a pharmacist to clarify the prescription label.",
    partnerRole: "Pharmacy staff member",
    concepts: ["prescription", "instructions", "pickup", "price"],
    riskClass: "medical",
  },
  {
    id: "emergency",
    title: "Call for emergency help",
    objective:
      "State the emergency, location, immediate danger, and answer a dispatcher's questions.",
    partnerRole: "Emergency dispatcher",
    concepts: ["emergency", "location", "danger", "instructions"],
    riskClass: "emergency",
  },
  {
    id: "directions",
    title: "Ask for and give directions",
    objective: "Identify a destination, understand turns and landmarks, and confirm the route.",
    partnerRole: "Local giving directions",
    concepts: ["left", "right", "straight", "landmark"],
  },
  {
    id: "public-transit",
    title: "Use public transportation",
    objective: "Choose a route, ask where to board, pay the fare, transfer, and identify the stop.",
    partnerRole: "Transit worker or fellow passenger",
    concepts: ["route", "fare", "transfer", "stop"],
  },
  {
    id: "taxi-rideshare",
    title: "Take a taxi or rideshare",
    objective: "Confirm identity and destination, give route details, and handle payment.",
    partnerRole: "Taxi or rideshare driver",
    concepts: ["pickup", "destination", "route", "payment"],
  },
  {
    id: "buy-ticket",
    title: "Buy a travel ticket",
    objective: "Choose destination, date, one-way or return, seat, and payment method.",
    partnerRole: "Ticket agent",
    concepts: ["ticket", "departure", "return", "seat"],
  },
  {
    id: "hotel",
    title: "Check in and out of a hotel",
    objective:
      "Confirm a reservation, ask about the room and services, report an issue, and check out.",
    partnerRole: "Hotel front desk agent",
    concepts: ["reservation", "room", "amenities", "checkout"],
  },
  {
    id: "restaurant",
    title: "Order at a restaurant",
    objective: "Ask about the menu, order food and drinks, request changes, and ask for the bill.",
    partnerRole: "Restaurant server",
    concepts: ["menu", "order", "modification", "bill"],
  },
  {
    id: "dietary-needs",
    title: "Explain allergies and dietary needs",
    objective:
      "State an allergy or dietary restriction, ask about ingredients, and confirm safe options.",
    partnerRole: "Restaurant employee discussing ingredients",
    concepts: ["allergy", "ingredients", "dietary restriction"],
    riskClass: "medical",
  },
  {
    id: "grocery",
    title: "Shop for groceries",
    objective: "Find items, ask about quantity and freshness, compare options, and check out.",
    partnerRole: "Grocery store employee",
    concepts: ["aisle", "quantity", "freshness", "checkout"],
  },
  {
    id: "clothes",
    title: "Shop for clothes",
    objective: "Ask for an item, size, color, fitting room, price, and another option.",
    partnerRole: "Clothing store employee",
    concepts: ["size", "color", "fitting room", "price"],
  },
  {
    id: "pay",
    title: "Pay for a purchase",
    objective:
      "Understand the total, choose cash or card, request a receipt, and resolve a payment problem.",
    partnerRole: "Cashier",
    concepts: ["total", "cash", "card", "receipt"],
  },
  {
    id: "return-refund",
    title: "Return an item and request a refund",
    objective: "Explain the problem, provide proof of purchase, and understand return options.",
    partnerRole: "Customer service employee",
    concepts: ["return", "receipt", "refund", "exchange"],
  },
  {
    id: "bank-atm",
    title: "Use a bank or ATM",
    objective:
      "Ask about an account transaction, withdrawal, deposit, fees, or an ATM problem without sharing real credentials.",
    partnerRole: "Bank employee",
    concepts: ["deposit", "withdrawal", "fee", "account"],
    riskClass: "financial",
  },
  {
    id: "mail-delivery",
    title: "Send mail or a package",
    objective:
      "Choose service speed, describe contents generally, confirm address format, and track delivery.",
    partnerRole: "Postal or delivery clerk",
    concepts: ["package", "address", "delivery", "tracking"],
  },
  {
    id: "utilities",
    title: "Set up or discuss utilities",
    objective:
      "Ask about starting service, billing, an outage, and restoration time without sharing real account data.",
    partnerRole: "Utility customer service representative",
    concepts: ["service", "bill", "outage", "restoration"],
  },
  {
    id: "landlord-repair",
    title: "Request a home repair",
    objective:
      "Describe the problem and urgency, arrange access, and confirm when it will be repaired.",
    partnerRole: "Landlord or maintenance coordinator",
    concepts: ["repair", "urgency", "access", "schedule"],
  },
  {
    id: "work-introduction",
    title: "Introduce yourself at work",
    objective: "Explain your role, learn a coworker's role, and ask how the team communicates.",
    partnerRole: "New coworker",
    concepts: ["job title", "team", "responsibility"],
  },
  {
    id: "work-schedule",
    title: "Discuss a work schedule",
    objective: "Confirm shift times, breaks, availability, and a schedule change.",
    partnerRole: "Supervisor discussing the schedule",
    concepts: ["shift", "break", "availability", "change"],
  },
  {
    id: "ask-help",
    title: "Ask for help",
    objective: "Explain what you need, what you already tried, and confirm the help or next step.",
    partnerRole: "Coworker or public-service employee",
    concepts: ["help", "problem", "attempt", "next step"],
  },
  {
    id: "clarify",
    title: "Ask someone to repeat or clarify",
    objective:
      "Say you did not understand, request slower speech or repetition, and confirm the meaning.",
    partnerRole: "Patient conversation partner",
    concepts: ["repeat", "slower", "meaning", "confirmation"],
  },
  {
    id: "invite",
    title: "Make an invitation",
    objective: "Invite someone, propose a time and place, and discuss practical details.",
    partnerRole: "Friend considering an invitation",
    concepts: ["invitation", "time", "place", "plan"],
  },
  {
    id: "accept-decline",
    title: "Accept or decline plans politely",
    objective: "Accept with details or decline with a brief reason and suggest another time.",
    partnerRole: "Friend making plans",
    concepts: ["accept", "decline", "reason", "alternative"],
  },
  {
    id: "weekend-plans",
    title: "Discuss plans and free time",
    objective: "Talk about upcoming plans, preferences, timing, and transportation.",
    partnerRole: "Friend planning a weekend",
    concepts: ["future plans", "preference", "time"],
  },
  {
    id: "school-childcare",
    title: "Communicate with a school or childcare provider",
    objective:
      "Discuss schedule, attendance, pickup, a routine issue, and next steps using fictional details.",
    partnerRole: "School or childcare staff member",
    concepts: ["attendance", "pickup", "schedule", "message"],
    riskClass: "minor-data",
  },
  {
    id: "neighbors",
    title: "Talk with a neighbor",
    objective: "Introduce yourself, discuss a shared concern, and agree on a considerate solution.",
    partnerRole: "Neighbor",
    concepts: ["neighborhood", "noise", "shared space"],
  },
  {
    id: "lost-item",
    title: "Report and recover a lost item",
    objective:
      "Describe the item and last known location, ask about lost-and-found, and leave safe contact instructions.",
    partnerRole: "Lost-and-found employee",
    concepts: ["description", "location", "lost and found"],
  },
  {
    id: "nonemergency-police",
    title: "Report a non-emergency problem",
    objective:
      "Describe what happened, when and where, and what assistance you need without inventing legal advice.",
    partnerRole: "Non-emergency dispatcher",
    concepts: ["incident", "time", "location", "description"],
    riskClass: "legal",
  },
  {
    id: "car-trouble",
    title: "Handle car trouble",
    objective:
      "Describe the vehicle problem and location, ask for roadside help, and understand arrival time.",
    partnerRole: "Roadside assistance dispatcher",
    concepts: ["vehicle", "breakdown", "location", "tow"],
  },
  {
    id: "gas-station",
    title: "Use a gas station",
    objective: "Ask about fuel, pump operation, payment, restroom, and simple assistance.",
    partnerRole: "Gas station attendant",
    concepts: ["fuel", "pump", "payment"],
  },
  {
    id: "airport",
    title: "Navigate an airport",
    objective:
      "Find check-in, discuss baggage, locate security and the gate, and understand a delay.",
    partnerRole: "Airline or airport employee",
    concepts: ["check-in", "baggage", "gate", "delay"],
  },
  {
    id: "customs",
    title: "Answer routine border and customs questions",
    objective:
      "State travel purpose, length of stay, lodging type, and general declarations using fictional details.",
    partnerRole: "Border or customs officer",
    concepts: ["purpose", "duration", "lodging", "declaration"],
    riskClass: "legal",
  },
  {
    id: "personal-service",
    title: "Book a haircut or personal service",
    objective:
      "Request a service, explain preferences, ask about price and duration, and confirm the result.",
    partnerRole: "Personal-service provider",
    concepts: ["appointment", "preference", "price", "duration"],
  },
  {
    id: "phone-internet",
    title: "Set up phone or internet service",
    objective:
      "Compare plans, ask about cost and installation, and report a service problem without sharing real credentials.",
    partnerRole: "Phone or internet representative",
    concepts: ["plan", "data", "installation", "outage"],
  },
];

// A dedicated Core progression because relationship language is common daily
// life, but deserves clearer consent, privacy, and age-appropriate safeguards
// than an ordinary small-talk mission.
export const RELATIONSHIPS_INTIMACY_TOPICS: DailyLivingTopic[] = [
  {
    id: "dating-interest",
    title: "Express interest and suggest a date",
    objective:
      "Express interest respectfully, invite someone to a public activity, and accept either answer without pressure.",
    partnerRole: "Person the learner would like to know better",
    concepts: ["interest", "invitation", "date", "respectful refusal"],
    riskClass: "intimacy",
  },
  {
    id: "relationship-status",
    title: "Discuss relationship status",
    objective:
      "Ask and answer respectfully about dating, partnership, exclusivity, and how each person describes the relationship.",
    partnerRole: "Person discussing the relationship with the learner",
    concepts: ["dating", "partner", "single", "exclusive"],
    riskClass: "intimacy",
  },
  {
    id: "affection-appreciation",
    title: "Express affection and appreciation",
    objective:
      "Give a sincere compliment, express care and gratitude, and respond naturally to affection.",
    partnerRole: "Learner's romantic partner",
    concepts: ["affection", "compliment", "care", "gratitude"],
    riskClass: "intimacy",
  },
  {
    id: "relationship-expectations",
    title: "Talk about expectations and the future",
    objective:
      "Discuss communication, time together, exclusivity, and future hopes without assuming that both people want the same thing.",
    partnerRole: "Learner's dating or romantic partner",
    concepts: ["expectations", "commitment", "communication", "future"],
    riskClass: "intimacy",
  },
  {
    id: "consent-boundaries",
    title: "Communicate consent and boundaries",
    objective:
      "Ask before physical affection, state a boundary clearly, check comfort, and respond immediately and respectfully to no or uncertainty.",
    partnerRole: "Learner's dating or romantic partner",
    concepts: ["consent", "boundary", "comfortable", "stop"],
    riskClass: "intimacy",
  },
  {
    id: "safer-intimacy",
    title: "Discuss intimacy and sexual health respectfully",
    objective:
      "Use non-graphic language to discuss readiness, mutual consent, protection, testing, and seeking qualified sexual-health care.",
    partnerRole: "Adult romantic partner in a fictional conversation",
    concepts: ["readiness", "consent", "protection", "testing"],
    riskClass: "intimacy",
  },
  {
    id: "relationship-conflict",
    title: "Repair a relationship disagreement",
    objective:
      "Describe feelings without insults, listen to the other perspective, apologize where appropriate, and agree on a next step.",
    partnerRole: "Learner's dating or romantic partner",
    concepts: ["feelings", "disagreement", "apology", "repair"],
    riskClass: "intimacy",
  },
  {
    id: "end-relationship",
    title: "End a relationship respectfully",
    objective:
      "State the decision clearly and kindly, avoid false promises, respect safety and boundaries, and close the conversation without coercion.",
    partnerRole: "Learner's dating or romantic partner",
    concepts: ["breakup", "decision", "kindness", "boundary"],
    riskClass: "intimacy",
  },
];
