import type { SpeakingMissionLanguage } from "./speaking-missions.ts";
import { CHINESE_GRAMMAR_EXTENSIONS } from "./chinese-grammar-extensions.ts";

export type CoreSpeakingSection =
  | "Essential verbs"
  | "Grammar patterns"
  | "Daily living"
  | "Relationships & intimacy";

export interface CoreVerb {
  id: string;
  english: string;
  target: Partial<Record<Exclude<SpeakingMissionLanguage, "English">, string>>;
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

export const CORE_GRAMMAR_EXTENSIONS: Record<SpeakingMissionLanguage, CoreGrammarPattern[]> = {
  English: [
    { id: "en-present-simple", name: "Present simple", meaning: "routines and facts", pattern: "I/you work · he/she works", examples: ["I work in the morning."], phase: 1 },
    { id: "en-negation", name: "Negation", meaning: "say something is not true", pattern: "do/does not + verb", examples: ["I do not understand."], phase: 1 },
    { id: "en-questions", name: "Questions", meaning: "ask yes/no and information questions", pattern: "Do/Is/What/Where…?", examples: ["Do you take cards?", "Where is the station?"], phase: 1 },
  ],
  Spanish: [
    { id: "existence-hay", name: "There is / there are", meaning: "say that something exists", pattern: "hay + [noun]", examples: ["Hay una cita disponible."], phase: 1 },
    { id: "present-regular", name: "Present tense", meaning: "current actions and routines", pattern: "hablo / comes / vive", examples: ["Trabajo por la mañana."], phase: 1 },
    { id: "negation", name: "Negation", meaning: "say not", pattern: "no + [verb]", examples: ["No entiendo."], phase: 1 },
  ],
  Italian: [
    { id: "existence-ce", name: "There is / there are", meaning: "say that something exists", pattern: "c'è / ci sono + [noun]", examples: ["C'è un appuntamento."], phase: 1 },
    { id: "present-regular", name: "Present tense", meaning: "current actions and routines", pattern: "parlo / prendi / dorme", examples: ["Lavoro la mattina."], phase: 1 },
    { id: "negation", name: "Negation", meaning: "say not", pattern: "non + [verb]", examples: ["Non capisco."], phase: 1 },
  ],
  Japanese: [
    { id: "topic-wa", name: "Topic marker は", meaning: "set what the sentence is about", pattern: "[topic] は [comment]", examples: ["予約は明日です。"], phase: 1 },
    { id: "object-o", name: "Object marker を", meaning: "mark what an action affects", pattern: "[object] を [verb]", examples: ["水を飲みます。"], phase: 1 },
    { id: "polite-present", name: "Polite present and future", meaning: "routines and near-future politely", pattern: "[verb stem] ます", examples: ["毎日働きます。"], phase: 1 },
    { id: "negative", name: "Negative forms", meaning: "say something will not happen", pattern: "〜ません / 〜ない", examples: ["分かりません。"], phase: 1 },
    { id: "te-form", name: "Connect actions with the て-form", meaning: "sequence actions", pattern: "〜て、〜", examples: ["電話して、確認します。"], phase: 1 },
    { id: "request", name: "Polite requests", meaning: "ask someone to do something", pattern: "〜てください", examples: ["もう一度言ってください。"], phase: 1 },
  ],
  Chinese: CHINESE_GRAMMAR_EXTENSIONS,
};

export const CORE_VERBS: CoreVerb[] = [
  { id: "be-identity", english: "to be — identity", target: { Spanish: "ser", Italian: "essere", Japanese: "である・です", Chinese: "是" } },
  { id: "be-state", english: "to be — state/location", target: { Spanish: "estar", Italian: "essere / stare", Japanese: "いる・ある", Chinese: "在 / 有" } },
  { id: "have", english: "to have", target: { Spanish: "tener", Italian: "avere", Japanese: "持つ", Chinese: "有" } },
  { id: "do-make", english: "to do / make", target: { Spanish: "hacer", Italian: "fare", Japanese: "する・作る", Chinese: "做" } },
  { id: "go", english: "to go", target: { Spanish: "ir", Italian: "andare", Japanese: "行く", Chinese: "去" } },
  { id: "come", english: "to come", target: { Spanish: "venir", Italian: "venire", Japanese: "来る", Chinese: "来" } },
  { id: "say", english: "to say", target: { Spanish: "decir", Italian: "dire", Japanese: "言う", Chinese: "说" } },
  { id: "tell", english: "to tell", target: { Spanish: "contar / decir", Italian: "raccontare / dire", Japanese: "伝える", Chinese: "告诉" } },
  { id: "speak", english: "to speak", target: { Spanish: "hablar", Italian: "parlare", Japanese: "話す", Chinese: "说" } },
  { id: "ask", english: "to ask", target: { Spanish: "preguntar / pedir", Italian: "chiedere", Japanese: "聞く・頼む", Chinese: "问" } },
  { id: "answer", english: "to answer", target: { Spanish: "contestar", Italian: "rispondere", Japanese: "答える", Chinese: "回答" } },
  { id: "know", english: "to know", target: { Spanish: "saber / conocer", Italian: "sapere / conoscere", Japanese: "知る・分かる", Chinese: "知道" } },
  { id: "think", english: "to think", target: { Spanish: "pensar", Italian: "pensare", Japanese: "思う・考える", Chinese: "想" } },
  { id: "understand", english: "to understand", target: { Spanish: "entender", Italian: "capire", Japanese: "分かる", Chinese: "明白" } },
  { id: "want", english: "to want", target: { Spanish: "querer", Italian: "volere", Japanese: "欲しい・〜たい", Chinese: "想要" } },
  { id: "need", english: "to need", target: { Spanish: "necesitar", Italian: "avere bisogno di", Japanese: "必要とする", Chinese: "需要" } },
  { id: "can", english: "can / to be able", target: { Spanish: "poder", Italian: "potere", Japanese: "できる", Chinese: "能" } },
  { id: "must", english: "must / to have to", target: { Spanish: "deber / tener que", Italian: "dovere", Japanese: "〜なければならない", Chinese: "必须" } },
  { id: "like", english: "to like", target: { Spanish: "gustar", Italian: "piacere", Japanese: "好きだ", Chinese: "喜欢" } },
  { id: "see", english: "to see", target: { Spanish: "ver", Italian: "vedere", Japanese: "見る", Chinese: "看" } },
  { id: "hear", english: "to hear", target: { Spanish: "oír", Italian: "sentire", Japanese: "聞こえる", Chinese: "听见" } },
  { id: "give", english: "to give", target: { Spanish: "dar", Italian: "dare", Japanese: "あげる・くれる", Chinese: "给" } },
  { id: "take", english: "to take", target: { Spanish: "tomar / llevar", Italian: "prendere", Japanese: "取る", Chinese: "拿" } },
  { id: "use", english: "to use", target: { Spanish: "usar", Italian: "usare", Japanese: "使う", Chinese: "用" } },
  { id: "work", english: "to work", target: { Spanish: "trabajar", Italian: "lavorare", Japanese: "働く", Chinese: "工作" } },
  { id: "live", english: "to live", target: { Spanish: "vivir", Italian: "vivere", Japanese: "住む", Chinese: "住" } },
  { id: "eat", english: "to eat", target: { Spanish: "comer", Italian: "mangiare", Japanese: "食べる", Chinese: "吃" } },
  { id: "drink", english: "to drink", target: { Spanish: "beber / tomar", Italian: "bere", Japanese: "飲む", Chinese: "喝" } },
  { id: "buy", english: "to buy", target: { Spanish: "comprar", Italian: "comprare", Japanese: "買う", Chinese: "买" } },
  { id: "pay", english: "to pay", target: { Spanish: "pagar", Italian: "pagare", Japanese: "払う", Chinese: "付" } },
  { id: "call", english: "to call", target: { Spanish: "llamar", Italian: "chiamare", Japanese: "電話する", Chinese: "打电话" } },
  { id: "wait", english: "to wait", target: { Spanish: "esperar", Italian: "aspettare", Japanese: "待つ", Chinese: "等" } },
  { id: "help", english: "to help", target: { Spanish: "ayudar", Italian: "aiutare", Japanese: "助ける", Chinese: "帮助" } },
  { id: "learn", english: "to learn", target: { Spanish: "aprender", Italian: "imparare", Japanese: "学ぶ", Chinese: "学" } },
  { id: "read", english: "to read", target: { Spanish: "leer", Italian: "leggere", Japanese: "読む", Chinese: "读" } },
  { id: "write", english: "to write", target: { Spanish: "escribir", Italian: "scrivere", Japanese: "書く", Chinese: "写" } },
];

export const DAILY_LIVING_TOPICS: DailyLivingTopic[] = [
  { id: "introductions", title: "Introduce yourself", objective: "Give your name, where you are from, what you do, and one personal detail.", partnerRole: "Person meeting the learner for the first time", concepts: ["name", "origin", "work", "interests"] },
  { id: "numbers", title: "Use numbers in real life", objective: "Exchange a phone number, price, and quantity accurately.", partnerRole: "Clerk confirming numeric information", concepts: ["numbers", "phone number", "price"] },
  { id: "date-time", title: "Confirm dates and times", objective: "Ask for and confirm the day, date, time, and duration.", partnerRole: "Scheduler confirming a date and time", concepts: ["calendar", "time", "duration"] },
  { id: "directions", title: "Ask for and give directions", objective: "Identify a destination, understand turns and landmarks, and confirm the route.", partnerRole: "Local giving directions", concepts: ["left", "right", "straight", "landmark"] },
  { id: "restaurant", title: "Order at a restaurant", objective: "Ask about the menu, order food and drinks, and ask for the bill.", partnerRole: "Restaurant server", concepts: ["menu", "order", "bill"] },
  { id: "hotel", title: "Check in and out of a hotel", objective: "Confirm a reservation, ask about the room, and check out.", partnerRole: "Hotel front desk agent", concepts: ["reservation", "room", "checkout"] },
  { id: "make-appointment", title: "Make an appointment", objective: "State the reason, ask about availability, choose a time, and confirm.", partnerRole: "Scheduler at an office", concepts: ["appointment", "availability", "confirmation"] },
  { id: "emergency", title: "Call for emergency help", objective: "State the emergency, location, and answer a dispatcher's questions.", partnerRole: "Emergency dispatcher", concepts: ["emergency", "location", "danger"], riskClass: "emergency" },
  { id: "clarify", title: "Ask someone to repeat or clarify", objective: "Say you did not understand and request slower speech or repetition.", partnerRole: "Patient conversation partner", concepts: ["repeat", "slower", "meaning"] },
  { id: "pay", title: "Pay for a purchase", objective: "Understand the total, choose cash or card, and request a receipt.", partnerRole: "Cashier", concepts: ["total", "cash", "card", "receipt"] },
];

export const RELATIONSHIPS_INTIMACY_TOPICS: DailyLivingTopic[] = [
  { id: "dating-interest", title: "Express interest and suggest a date", objective: "Express interest respectfully, invite someone to a public activity, and accept either answer without pressure.", partnerRole: "Person the learner would like to know better", concepts: ["interest", "invitation", "date", "respectful refusal"], riskClass: "intimacy" },
  { id: "consent-boundaries", title: "Communicate consent and boundaries", objective: "Ask before physical affection, state a boundary clearly, and respond immediately to no or uncertainty.", partnerRole: "Learner's dating or romantic partner", concepts: ["consent", "boundary", "comfortable", "stop"], riskClass: "intimacy" },
];
