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
  // Verbs 37–50. Chosen for how often a beginner is stuck without them in a real
  // errand — arriving, opening, sending, changing a booking — rather than for
  // frequency in written corpora.
  { id: "get", english: "to get / obtain", target: { Spanish: "conseguir / obtener", Italian: "ottenere", Japanese: "得る・もらう", Chinese: "得到" } },
  { id: "put", english: "to put / place", target: { Spanish: "poner", Italian: "mettere", Japanese: "置く", Chinese: "放" } },
  { id: "find", english: "to find", target: { Spanish: "encontrar", Italian: "trovare", Japanese: "見つける", Chinese: "找到" } },
  { id: "leave", english: "to leave / depart", target: { Spanish: "salir", Italian: "uscire / partire", Japanese: "出る・出発する", Chinese: "离开" } },
  { id: "arrive", english: "to arrive", target: { Spanish: "llegar", Italian: "arrivare", Japanese: "着く・到着する", Chinese: "到达" } },
  { id: "open", english: "to open", target: { Spanish: "abrir", Italian: "aprire", Japanese: "開ける", Chinese: "打开" } },
  { id: "close", english: "to close / shut", target: { Spanish: "cerrar", Italian: "chiudere", Japanese: "閉める", Chinese: "关" } },
  { id: "start", english: "to start / begin", target: { Spanish: "empezar / comenzar", Italian: "cominciare / iniziare", Japanese: "始める", Chinese: "开始" } },
  { id: "finish", english: "to finish / end", target: { Spanish: "terminar / acabar", Italian: "finire", Japanese: "終わる・終える", Chinese: "结束" } },
  { id: "bring", english: "to bring", target: { Spanish: "traer", Italian: "portare", Japanese: "持ってくる", Chinese: "带来" } },
  { id: "send", english: "to send", target: { Spanish: "enviar / mandar", Italian: "inviare / mandare", Japanese: "送る", Chinese: "发送" } },
  { id: "meet", english: "to meet", target: { Spanish: "encontrarse / conocer", Italian: "incontrare", Japanese: "会う", Chinese: "见面" } },
  { id: "stay", english: "to stay / remain", target: { Spanish: "quedarse", Italian: "restare / rimanere", Japanese: "滞在する・残る", Chinese: "停留" } },
  { id: "change", english: "to change", target: { Spanish: "cambiar", Italian: "cambiare", Japanese: "変える", Chinese: "改变" } },
];

export const DAILY_LIVING_TOPICS: DailyLivingTopic[] = [
  { id: "introductions", title: "Introduce yourself", objective: "Give your name, where you are from, what you do, and one personal detail.", partnerRole: "Person meeting the learner for the first time", concepts: ["name", "origin", "work", "interests"] },
  { id: "numbers", title: "Use numbers in real life", objective: "Exchange a phone number, price, and quantity accurately.", partnerRole: "Clerk confirming numeric information", concepts: ["numbers", "phone number", "price"] },
  { id: "date-time", title: "Confirm dates and times", objective: "Ask for and confirm the day, date, time, and duration.", partnerRole: "Scheduler confirming a date and time", concepts: ["calendar", "time", "duration"] },
  { id: "directions", title: "Ask for and give directions", objective: "Identify a destination, understand turns and landmarks, and confirm the route.", partnerRole: "Local giving directions", concepts: ["left", "right", "straight", "landmark"] },
  { id: "restaurant", title: "Order at a restaurant", objective: "Ask about the menu, order food and drinks, and ask for the bill.", partnerRole: "Restaurant server", concepts: ["menu", "order", "bill"] },
  { id: "hotel", title: "Check in and out of a hotel", objective: "Confirm a reservation, ask about the room, and check out.", partnerRole: "Hotel front desk agent", concepts: ["reservation", "room", "checkout"] },
  { id: "make-appointment", title: "Make an appointment", objective: "State the reason, ask about availability, choose a time, and confirm.", partnerRole: "Scheduler at an office", concepts: ["appointment", "availability", "confirmation"] },
  { id: "answer-phone", title: "Answer the phone", objective: "Say who you are, ask who is calling, and take a message or pass the call on.", partnerRole: "Caller you were not expecting", concepts: ["greeting", "who is calling", "message", "transfer"] },
  { id: "confirm-appointment", title: "Confirm an appointment", objective: "Repeat back the date, time, and place, and ask what to bring.", partnerRole: "Receptionist confirming a booking", concepts: ["date", "time", "location", "what to bring"] },
  { id: "reschedule", title: "Reschedule an appointment", objective: "Explain you cannot make it, offer alternatives, and confirm the new time.", partnerRole: "Scheduler moving a booking", concepts: ["conflict", "alternative times", "new time", "confirmation"] },
  { id: "cancel", title: "Cancel a booking", objective: "Cancel clearly, ask about any fee or notice period, and confirm it is done.", partnerRole: "Staff member handling cancellations", concepts: ["cancellation", "notice", "fee", "confirmation"] },
  // High-stakes cluster. The riskClass on each entry is what attaches the extra
  // runtime rule in safetyRulesForDailyLiving — these rehearse the language of
  // hard rooms, never the judgement of the professional standing in them.
  { id: "doctor-visit", title: "Describe symptoms at a doctor's visit", objective: "Say what hurts, how long it has been happening, answer questions about your history, and repeat back the plan you were given.", partnerRole: "Clinician taking a history", concepts: ["symptom", "duration", "pain", "medical history"], riskClass: "medical" },
  { id: "pharmacy", title: "Collect a prescription at a pharmacy", objective: "Give your name, ask how and when to take the medicine, ask what to watch for, and confirm the quantity.", partnerRole: "Pharmacist at the counter", concepts: ["prescription", "dose", "schedule", "side effects"], riskClass: "medical" },
  { id: "emergency", title: "Call for emergency help", objective: "State the emergency, location, and answer a dispatcher's questions.", partnerRole: "Emergency dispatcher", concepts: ["emergency", "location", "danger"], riskClass: "emergency" },
  { id: "bank-atm", title: "Handle money at a bank or ATM", objective: "Withdraw or deposit money, ask about fees, report a card that will not work, and confirm the balance.", partnerRole: "Bank teller", concepts: ["withdraw", "deposit", "fee", "balance"], riskClass: "financial" },
  { id: "school-childcare", title: "Speak with a school or childcare", objective: "Report an absence, ask about pickup times, and confirm who is allowed to collect the child.", partnerRole: "School or nursery staff member", concepts: ["absence", "pickup", "permission", "contact"], riskClass: "minor-data" },
  { id: "nonemergency-police", title: "Make a non-emergency police report", objective: "Report a lost item or minor incident, give a clear description and time, and ask what happens next.", partnerRole: "Non-emergency police officer", concepts: ["report", "description", "time", "next steps"], riskClass: "legal" },
  { id: "customs", title: "Answer questions at customs", objective: "State the purpose and length of your stay, declare what you are carrying, and answer follow-up questions calmly.", partnerRole: "Border or customs officer", concepts: ["purpose", "length of stay", "declaration", "documents"], riskClass: "legal" },
  { id: "clarify", title: "Ask someone to repeat or clarify", objective: "Say you did not understand and request slower speech or repetition.", partnerRole: "Patient conversation partner", concepts: ["repeat", "slower", "meaning"] },
  { id: "pay", title: "Pay for a purchase", objective: "Understand the total, choose cash or card, and request a receipt.", partnerRole: "Cashier", concepts: ["total", "cash", "card", "receipt"] },

  // Getting around.
  { id: "taxi-rideshare", title: "Take a taxi or rideshare", objective: "Give the destination, agree the route or fare, and ask to stop where you need.", partnerRole: "Taxi or rideshare driver", concepts: ["destination", "fare", "route", "stop here"] },
  { id: "public-transport", title: "Use buses and metro", objective: "Buy the right ticket, confirm the line and direction, and check where to get off.", partnerRole: "Transit staff member", concepts: ["ticket", "line", "direction", "stop"] },
  { id: "train-station", title: "Travel by train", objective: "Ask about departures, find the platform, and confirm your seat or carriage.", partnerRole: "Station agent", concepts: ["departure", "platform", "seat", "transfer"] },
  { id: "airport-checkin", title: "Check in for a flight", objective: "Check in, ask about baggage allowance, and confirm the gate and boarding time.", partnerRole: "Airline check-in agent", concepts: ["check-in", "baggage", "gate", "boarding"] },
  { id: "rental-car", title: "Pick up a rental car", objective: "Confirm the booking, ask what the insurance covers, and agree the fuel and return terms.", partnerRole: "Car rental agent", concepts: ["booking", "insurance", "fuel policy", "return"] },
  { id: "lost-luggage", title: "Report lost luggage", objective: "Describe the bag, give your flight and reference, and ask how and when it will reach you.", partnerRole: "Baggage services agent", concepts: ["description", "reference", "delivery", "compensation"] },

  // Shopping and errands.
  { id: "grocery-shopping", title: "Shop for groceries", objective: "Ask where an item is, ask for a quantity at the counter, and check what is fresh today.", partnerRole: "Shop assistant", concepts: ["aisle", "quantity", "fresh", "price"] },
  { id: "clothing-sizes", title: "Buy clothes and shoes", objective: "Ask for your size, request another colour, and ask to try something on.", partnerRole: "Clothing shop assistant", concepts: ["size", "colour", "fitting room", "fit"] },
  { id: "market-bargain", title: "Buy at a market stall", objective: "Ask the price, ask politely for a better one, and agree or decline without offence.", partnerRole: "Market stallholder", concepts: ["price", "discount", "agreement", "polite refusal"] },
  { id: "returns-exchange", title: "Return or exchange an item", objective: "Explain the problem, show the receipt, and ask for a refund, exchange, or repair.", partnerRole: "Customer service assistant", concepts: ["receipt", "fault", "refund", "exchange"] },
  { id: "post-office", title: "Send a parcel or letter", objective: "Say where it is going, choose a speed and price, and ask about tracking and insurance.", partnerRole: "Post office clerk", concepts: ["destination", "postage", "tracking", "delivery time"] },
  { id: "mobile-phone-plan", title: "Set up a phone or data plan", objective: "Compare plans, ask what is included, and confirm the monthly cost and how to cancel.", partnerRole: "Mobile shop advisor", concepts: ["plan", "data", "monthly cost", "cancellation"] },

  // Home and living.
  { id: "rent-apartment", title: "View and rent a place to live", objective: "Ask what is included, confirm the deposit and notice period, and arrange to sign.", partnerRole: "Landlord or letting agent", concepts: ["rent", "deposit", "notice period", "included bills"], riskClass: "legal" },
  { id: "utilities-setup", title: "Set up electricity, gas, or water", objective: "Open an account, give a meter reading, and confirm how and when you will be billed.", partnerRole: "Utility company representative", concepts: ["account", "meter reading", "billing", "start date"] },
  { id: "repair-request", title: "Report something broken at home", objective: "Describe what is wrong and since when, and agree a time for the repair.", partnerRole: "Landlord or repair technician", concepts: ["fault", "since when", "appointment", "urgency"] },
  { id: "neighbours", title: "Talk to your neighbours", objective: "Introduce yourself, ask a small favour, and raise a noise or parking issue politely.", partnerRole: "Neighbour", concepts: ["introduction", "favour", "noise", "politeness"] },
  { id: "internet-setup", title: "Arrange internet at home", objective: "Choose a package, book the installation, and confirm what happens if the line fails.", partnerRole: "Internet provider advisor", concepts: ["package", "speed", "installation", "support"] },

  // Work and study.
  { id: "job-interview", title: "Interview for a job", objective: "Describe your experience, answer why you want the role, and ask about the team and hours.", partnerRole: "Hiring manager", concepts: ["experience", "strengths", "hours", "questions to ask"] },
  { id: "first-day-work", title: "Start a new job", objective: "Introduce yourself to colleagues, ask where things are, and confirm what is expected today.", partnerRole: "New colleague showing you around", concepts: ["introduction", "orientation", "expectations", "break times"] },
  { id: "team-meeting", title: "Take part in a meeting", objective: "Give a short update, ask a clarifying question, and disagree politely.", partnerRole: "Colleague chairing the meeting", concepts: ["update", "clarification", "polite disagreement", "next steps"] },
  { id: "ask-for-help-work", title: "Ask for help at work", objective: "Say what you are stuck on, ask for a specific kind of help, and confirm you understood.", partnerRole: "Supervisor or experienced colleague", concepts: ["problem", "specific request", "confirmation", "thanks"] },
  { id: "course-enrollment", title: "Enrol in a course", objective: "Ask about the level, schedule, and cost, and complete the enrolment.", partnerRole: "Course administrator", concepts: ["level", "schedule", "cost", "enrolment"] },

  // Health and body.
  { id: "dentist-visit", title: "Go to the dentist", objective: "Say which tooth hurts and for how long, and ask what the treatment involves and costs.", partnerRole: "Dentist or dental receptionist", concepts: ["tooth", "pain", "treatment", "cost"], riskClass: "medical" },
  { id: "optician", title: "Get glasses or an eye test", objective: "Describe the problem with your sight, ask about the test, and choose frames or lenses.", partnerRole: "Optician", concepts: ["sight", "eye test", "prescription", "frames"], riskClass: "medical" },
  { id: "describe-allergy", title: "Explain an allergy or dietary need", objective: "State clearly what you cannot have and how serious it is, and check what a dish contains.", partnerRole: "Server or host preparing food", concepts: ["allergy", "severity", "ingredients", "substitution"], riskClass: "medical" },

  // Being sociable.
  { id: "small-talk", title: "Make small talk", objective: "Open with the weather, weekend, or surroundings, keep it going, and close warmly.", partnerRole: "Acquaintance making conversation", concepts: ["opener", "follow-up question", "shared ground", "closing"] },
  { id: "invite-someone", title: "Invite someone out", objective: "Suggest a plan, offer a time and place, and confirm the arrangement.", partnerRole: "Friend or colleague", concepts: ["invitation", "time", "place", "confirmation"] },
  { id: "accept-decline", title: "Accept or decline an invitation", objective: "Accept warmly, or decline with a short honest reason and an alternative.", partnerRole: "Person who invited the learner", concepts: ["acceptance", "polite refusal", "reason", "alternative"] },
  { id: "thanks-compliments", title: "Thank someone and give a compliment", objective: "Thank someone specifically, give a genuine compliment, and receive one gracefully.", partnerRole: "Friend, host, or colleague", concepts: ["thanks", "compliment", "specificity", "receiving praise"] },
  { id: "apologize", title: "Apologise and put something right", objective: "Say what you did, apologise without excuses, and offer to fix it.", partnerRole: "Person the learner has inconvenienced", concepts: ["apology", "responsibility", "repair", "reassurance"] },

  // Practical errands.
  { id: "haircut", title: "Get a haircut", objective: "Describe the length and style you want, ask for a change mid-cut, and settle up.", partnerRole: "Hairdresser or barber", concepts: ["length", "style", "adjustment", "payment"] },
  { id: "book-tickets", title: "Book tickets for an event", objective: "Ask what is available, choose seats and a date, and confirm the booking and refund rules.", partnerRole: "Box office or ticket agent", concepts: ["availability", "seats", "date", "refund policy"] },
  { id: "service-complaint", title: "Complain about poor service", objective: "State the problem calmly, say what you want done, and escalate politely if refused.", partnerRole: "Manager handling complaints", concepts: ["problem", "desired outcome", "calm tone", "escalation"] },
];

export const RELATIONSHIPS_INTIMACY_TOPICS: DailyLivingTopic[] = [
  { id: "dating-interest", title: "Express interest and suggest a date", objective: "Express interest respectfully, invite someone to a public activity, and accept either answer without pressure.", partnerRole: "Person the learner would like to know better", concepts: ["interest", "invitation", "date", "respectful refusal"], riskClass: "intimacy" },
  { id: "consent-boundaries", title: "Communicate consent and boundaries", objective: "Ask before physical affection, state a boundary clearly, and respond immediately to no or uncertainty.", partnerRole: "Learner's dating or romantic partner", concepts: ["consent", "boundary", "comfortable", "stop"], riskClass: "intimacy" },
  // The hardest conversations in a new language are rarely the transactional
  // ones. Each of these rehearses the words for a moment people otherwise avoid
  // until their vocabulary catches up — and every one carries the intimacy
  // safety rules: non-graphic, consent-forward, never anyone under 18.
  { id: "defining-relationship", title: "Talk about what you are to each other", objective: "Say what you are looking for, ask what they want, and accept a different answer without pressure.", partnerRole: "Person the learner is dating", concepts: ["intentions", "exclusivity", "expectations", "accepting difference"], riskClass: "intimacy" },
  { id: "meeting-family", title: "Meet a partner's family", objective: "Introduce yourself warmly, answer questions about your intentions, and navigate an awkward one gracefully.", partnerRole: "Partner's parent or sibling", concepts: ["introduction", "respect", "intentions", "deflecting politely"], riskClass: "intimacy" },
  { id: "disagreement-repair", title: "Disagree and repair afterwards", objective: "Say what upset you without blaming, hear their side, and agree how to handle it next time.", partnerRole: "Learner's partner after an argument", concepts: ["feelings", "listening", "repair", "agreement"], riskClass: "intimacy" },
  { id: "living-together", title: "Discuss living together", objective: "Talk through space, chores, money, and guests, and say what you need without apologising for it.", partnerRole: "Partner planning to share a home", concepts: ["chores", "money", "privacy", "needs"], riskClass: "intimacy" },
  { id: "sexual-health-conversation", title: "Talk about sexual health", objective: "Raise protection and testing plainly, ask what they prefer, and agree together before anything continues.", partnerRole: "Learner's partner", concepts: ["protection", "testing", "agreement", "comfort"], riskClass: "intimacy" },
  { id: "ending-relationship", title: "End a relationship respectfully", objective: "Say clearly that it is over, give an honest reason without cruelty, and hear their response.", partnerRole: "Partner the learner is separating from", concepts: ["clarity", "honesty", "kindness", "closure"], riskClass: "intimacy" },
];
