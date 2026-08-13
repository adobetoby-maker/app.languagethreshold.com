import type { SpeakingMissionLanguage } from "./speaking-missions.ts";

export type CoreSpeakingSection = "Essential verbs" | "Grammar patterns" | "Daily living";

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
}

export const CORE_SPEAKING_MODULE = {
  id: "core-speaking",
  name: "Core Speaking",
  emoji: "◈",
  category: "Core" as const,
  blurb:
    "Build the verbs and grammar that power everyday speech, then use them in practical daily-life conversations.",
  userRole: "Language learner handling an everyday conversation",
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
  },
  {
    id: "pharmacy",
    title: "Use a pharmacy",
    objective:
      "Ask about a prescription, dosage instructions, pickup time, price, and pharmacist clarification.",
    partnerRole: "Pharmacy staff member",
    concepts: ["prescription", "instructions", "pickup", "price"],
  },
  {
    id: "emergency",
    title: "Call for emergency help",
    objective:
      "State the emergency, location, immediate danger, and answer a dispatcher's questions.",
    partnerRole: "Emergency dispatcher",
    concepts: ["emergency", "location", "danger", "instructions"],
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
