import type { Language } from "@/state/app-state";
import type { LibraryEntry } from "@/state/library-state";
import {
  type LessonStep,
  r,
  sp,
  wm,
  pt,
  sb,
  ms,
  ot,
  ev,
  sc,
  bb,
  fm,
  gr,
  ld,
  ds,
  fi,
} from "./curriculum-helpers.ts";
export type { LessonStep };
export { r, sp, wm, pt, sb, ms, ot, ev, sc, bb, fm, gr, ld, ds, fi };

export interface Lesson {
  n: number;
  title: string;
  objective: string;
  readingTemplate?: string; // seed-{lang}-xxx resolved at runtime
  steps: LessonStep[];
}

export interface ModuleCurriculum {
  moduleId: string;
  headline: string;
  threshold: string;
  lessons: Lesson[];
}

// ─── Language code map ────────────────────────────────────────────────────────

const LANG_CODES: Record<Language, string> = {
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Japanese: "ja",
  Korean: "ko",
  Portuguese: "pt",
  Pashto: "ps",
  English: "en",
};

const MODULE_PATTERNS: Record<string, string[]> = {
  "lds-missionary": ["seed-{lang}-lds-teaching"],
  "catholic-ministry": ["seed-{lang}-catholic-mass"],
  "construction-foreman": ["seed-{lang}-framer-layout"],
  framer: ["seed-{lang}-framer-layout"],
  "construction-safety": ["seed-{lang}-construction-blueprint"],
  plumber: ["seed-{lang}-plumber-leak"],
  drywall: ["seed-{lang}-drywall-mud"],
  electrician: ["seed-{lang}-electrician-wiring"],
  landscaper: ["seed-{lang}-landscaper-irrigation"],
  "auto-mechanic": ["seed-{lang}-mechanic-brake"],
  "truck-driver": ["seed-{lang}-truck-logbook"],
  "dairy-farmer": ["seed-{lang}-dairy-milking"],
  "ranch-cowboy": ["seed-{lang}-ranch-roundup"],
  "meatpacking-butcher": ["seed-{lang}-butcher-sanitation"],
  "restaurant-hospitality": ["seed-{lang}-restaurant-prep"],
  "legal-immigration": ["seed-{lang}-legal-asylum"],
  "k12-teacher": ["seed-{lang}-k12-iep"],
  "international-travel": ["seed-{lang}-travel-hotel"],
  soccer: ["seed-{lang}-soccer-match"],
  hockey: ["seed-{lang}-hockey-rink"],
  baseball: ["seed-{lang}-baseball-dugout"],
  tennis: ["seed-{lang}-tennis-court"],
  bowling: ["seed-{lang}-bowling-lane"],
  "american-football": ["seed-{lang}-football-play"],
  lacrosse: ["seed-{lang}-lacrosse-field"],
  rugby: ["seed-{lang}-rugby-pitch"],
  "sports-hobbies": ["seed-{lang}-hobbies-gym"],
  "or-evs": ["seed-en-coffee-shop-hello"],
  fmg: ["seed-en-job-interview-basics"],
  "sport-fishing": ["seed-{lang}-fishing-panga"],
};

const MEDICAL_KEYWORDS: Record<string, string> = {
  orthopedics: "family-med",
  nursing: "nursing",
  cardiology: "cardiology",
  "ob-gyn": "ob-gyn",
  "emergency-medicine": "em-",
  "general-surgery": "general-surgery",
  "family-medicine": "family-med",
  "physical-therapy": "physical-therapy",
  "pain-management": "family-med",
  "medical-receptionist": "medical-receptionist",
  "social-work": "social-work",
};

export function getModuleReadingId(
  moduleId: string,
  language: Language,
  entries: LibraryEntry[],
): string | null {
  const lang = LANG_CODES[language] ?? "es";

  // Pattern-based exact lookup
  const patterns = MODULE_PATTERNS[moduleId];
  if (patterns) {
    for (const p of patterns) {
      const id = p.replace("{lang}", lang);
      if (entries.find((e) => e.id === id)) return id;
    }
  }

  // Medical category fuzzy lookup
  const kw = MEDICAL_KEYWORDS[moduleId];
  if (kw) {
    const match = entries.find((e) => e.language === language && e.id.includes(kw));
    if (match) return match.id;
    // Any medical entry for this language
    const any = entries.find(
      (e) =>
        e.language === language &&
        (e.id.includes("family-med") || e.id.includes("-em-") || e.id.includes("nursing")),
    );
    if (any) return any.id;
  }

  return null;
}

// ─── LDS MISSIONARY ──────────────────────────────────────────────────────────

const MISSIONARY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "First Contact & Greetings",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Open a door approach and introduce yourselves with confidence",
    steps: [
      r(
        "Read the LDS Teaching passage. Focus on the greeting lines — these ARE your door approach.",
        7,
      ),
      ms("In the Missionary tab, tap the first greeting and practice it 5 times out loud.", 7),
      sp(
        "Say: 'Buenos días, somos misioneros de Jesucristo. ¿Tiene un momento?' — repeat until natural.",
        6,
      ),
    ],
  },

  {
    n: 2,
    title: "Asking to Share & Setting an Appointment",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Ask permission to share a message and set a return appointment",
    steps: [
      r("Read the teaching passage. Identify the invitation sentences — underline or tap them.", 7),
      ms("Practice the 'invitation to teach' phrase in your module tab. Say it 3 times.", 7),
      sp(
        "Say the full invitation + appointment request: 'Nos gustaría compartir un mensaje. ¿Podríamos regresar el martes?'",
        6,
      ),
    ],
  },

  {
    n: 3,
    title: "The Restoration — Key Vocabulary",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Define and pronounce the 10 core Restoration vocabulary words",
    steps: [
      r("Read the Restoration passage. Tap every word you don't know — save to Word Match.", 8),
      wm(
        "Drill your saved Restoration words: restauración, profeta, apostasía, autoridad, Evangelio.",
        6,
      ),
      sp(
        "Use 3 of the Restoration words in a sentence out loud. Example: 'La restauración del evangelio ocurrió a través de un profeta.'",
        6,
      ),
    ],
  },

  {
    n: 4,
    title: "The Restoration — Teaching It",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach the Restoration story from memory in your target language",
    steps: [
      ms(
        "In the Missionary tab, go through Lesson 1 (La Restauración). Practice each teaching point.",
        8,
      ),
      ds(
        "Role-play: teach the Restoration to an investigator. Use the AI to play the investigator's role.",
        7,
      ),
      sp(
        "Say the opening 4 sentences of the Restoration lesson from memory. Record and listen back.",
        5,
      ),
    ],
  },

  {
    n: 5,
    title: "The Book of Mormon — Introduction",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Introduce the Book of Mormon and bear testimony of it",
    steps: [
      r(
        "Read the teaching passage. Focus on sentences about the Book of Mormon and its origin.",
        7,
      ),
      wm(
        "Drill: Libro de Mormón, profeta, testamento, antiguo, América. Get all 5 right twice.",
        5,
      ),
      sp("Say: 'El Libro de Mormón es otro testamento de Jesucristo. Sé que es verdadero.'", 8),
    ],
  },

  {
    n: 6,
    title: "The Plan of Salvation — Pre-mortal Life",
    readingTemplate: "seed-{lang}-faith-door-greeting",
    objective: "Explain where we came from and why we are here",
    steps: [
      r(
        "Read the faith passage. Look for pre-mortal vocabulary: espíritu, premortal, Padre Celestial.",
        7,
      ),
      pt(
        "Find and practice the pattern: 'Antes de nacer, nosotros [verb]…' Fill it with 5 different verbs.",
        6,
      ),
      sp(
        "Explain pre-mortal existence in 4 sentences. Keep it simple — as if explaining to a child.",
        7,
      ),
    ],
  },

  {
    n: 7,
    title: "The Plan of Salvation — Mortal Life",
    readingTemplate: "seed-{lang}-faith-plan-of-salvation",
    objective: "Explain the purpose of mortal life and agency",
    steps: [
      r("Open 'Plan of Salvation' passage. Read it fully, tap 5+ words you don't know.", 8),
      ms("Go through the Plan of Salvation section in your module tab.", 7),
      sp(
        "Answer: '¿Por qué estamos en la tierra?' in 3 sentences using albedrío, aprender, crecer.",
        5,
      ),
    ],
  },

  {
    n: 8,
    title: "The Plan of Salvation — Life After Death",
    readingTemplate: "seed-{lang}-faith-plan-of-salvation",
    objective: "Name the kingdoms of glory and explain the Spirit World",
    steps: [
      wm("Drill: resurrección, espíritu, paraíso, prisión, juicio. Get 5/5 correct.", 5),
      pt("Pattern: 'Después de morir, nosotros [verb]…' Build 4 sentences.", 6),
      sp("Explain the three kingdoms to an investigator in plain language. Record yourself.", 9),
    ],
  },

  {
    n: 9,
    title: "Faith — Principle & Action",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach faith as a principle of action, not just belief",
    steps: [
      r(
        "Read the LDS teaching passage. Find all sentences with 'fe' (faith). Tap and save them.",
        7,
      ),
      ds(
        "Role-play: an investigator says 'I don't know if I believe.' Respond using faith principles.",
        8,
      ),
      sp("Teach: 'La fe es más que creer — es actuar.' Expand it to 5 sentences.", 5),
    ],
  },

  {
    n: 10,
    title: "Repentance — The Process",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Explain the 5 steps of repentance clearly",
    steps: [
      r("Read the passage. Find all repentance-related vocabulary. Build your Word Match list.", 7),
      ms(
        "In the module tab, practice teaching repentance — focus on the commitment invitation.",
        7,
      ),
      sp("Teach the steps: reconocer, sentir remordimiento, confesar, abandonar, reparar.", 6),
    ],
  },

  {
    n: 11,
    title: "Baptism — The Commitment",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Extend a baptismal invitation naturally and sincerely",
    steps: [
      r("Read the teaching passage. Find the baptism invitation sentences. Memorize them.", 8),
      ms("Practice the baptism commitment in the Missionary module. Say it 5 times.", 7),
      sp(
        "Say the full baptism commitment: '¿Estará usted dispuesto a ser bautizado el día [date] si recibe un testimonio de que este mensaje es verdadero?'",
        5,
      ),
    ],
  },

  {
    n: 12,
    title: "The Holy Ghost — Role & Promise",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Explain the gift of the Holy Ghost and its blessings",
    steps: [
      wm("Drill: Espíritu Santo, confirmación, don, guía, testificar. 5 correct in a row.", 5),
      pt("Pattern: 'El Espíritu Santo puede [verb]…' Build 6 examples.", 6),
      sp(
        "Teach the difference between feeling the Spirit vs. receiving the gift. 4-5 sentences.",
        9,
      ),
    ],
  },

  {
    n: 13,
    title: "Commandments — The Word of Wisdom",
    readingTemplate: "seed-{lang}-faith-word-of-wisdom",
    objective: "Teach the Word of Wisdom and handle common questions",
    steps: [
      r(
        "Read the Word of Wisdom passage. Focus on vocabulary for health, body, and substances.",
        7,
      ),
      ds(
        "Role-play: investigator asks 'Why can't I drink coffee?' — give the explanation in the target language.",
        8,
      ),
      sp("Summarize the Word of Wisdom commitment in 3 clear sentences.", 5),
    ],
  },

  {
    n: 14,
    title: "Commandments — The Law of Chastity",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach the law of chastity with sensitivity and clarity",
    steps: [
      r("Read the teaching passage focusing on family and chastity vocabulary.", 6),
      ms("Practice this lesson section in the module tab — it requires careful word choice.", 8),
      sp(
        "Teach: 'La ley de castidad nos enseña a mantener relaciones sagradas dentro del matrimonio.' Expand to 4 sentences.",
        6,
      ),
    ],
  },

  {
    n: 15,
    title: "Tithing & Fast Offerings",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Explain the law of tithing and the principle behind it",
    steps: [
      r(
        "Read the passage. Save tithing-related vocabulary: diezmo, ofrenda, prosperidad, sacrificio.",
        6,
      ),
      pt("Pattern: 'Cuando pagamos el diezmo, nosotros [result].' Build 4 sentences.", 6),
      sp(
        "Teach the tithing commitment: '¿Estará usted dispuesto a pagar el diezmo — el diez por ciento de sus ingresos?'",
        8,
      ),
    ],
  },

  {
    n: 16,
    title: "The Sabbath Day",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Explain why Sabbath observance matters and invite commitment",
    steps: [
      wm("Drill: domingo, descanso, culto, reunión, sacramento. Flash until instant.", 5),
      ds(
        "Role-play: investigator says 'I work Sundays.' Discuss and invite commitment compassionately.",
        8,
      ),
      sp("Explain the Sabbath commitment in 3 sentences. Invite with the standard invitation.", 7),
    ],
  },

  {
    n: 17,
    title: "Eternal Families",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach eternal families and the role of the temple",
    steps: [
      r(
        "Read teaching passage. Focus on family vocabulary: familia eterna, sellamiento, templo.",
        7,
      ),
      ms("In the module tab, practice the eternal families section.", 7),
      sp(
        "Teach: 'Las familias pueden ser selladas por la eternidad en el templo.' Expand to a 5-sentence lesson.",
        6,
      ),
    ],
  },

  {
    n: 18,
    title: "Prayer — Teaching & Demonstrating",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach how to pray and invite the investigator to kneel and pray with you",
    steps: [
      r("Read the passage. Find every sentence about prayer (oración/orar). Tap and save.", 6),
      pt("Pattern: 'Para orar, nosotros debemos [step].' Build a 5-step prayer guide.", 7),
      sp(
        "Demonstrate a prayer out loud. Then teach: '¿Estaría dispuesto a orar con nosotros ahora mismo?'",
        7,
      ),
    ],
  },

  {
    n: 19,
    title: "Addressing Common Concerns",
    readingTemplate: "seed-{lang}-faith-investigator-concern",
    objective: "Respond to 3 common investigator concerns with empathy",
    steps: [
      r("Read the 'Investigator Concern' passage — this is a live concern scenario.", 8),
      ds(
        "Role-play 3 concerns: 'I already have a religion', 'I'm not sure God exists', 'I'm not ready.' Respond to each.",
        8,
      ),
      sp("Practice the 'feel, felt, found' response pattern in the target language.", 4),
    ],
  },

  {
    n: 20,
    title: "Follow-Up Conversations",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Ask about commitments, express genuine care, and schedule return visits",
    steps: [
      ms("In the module tab, practice follow-up question phrases.", 7),
      pt("Pattern: '¿Tuvo la oportunidad de [commitment]?' Build 6 follow-up questions.", 6),
      sp(
        "Role-play a return visit opening: express care, ask about commitment, invite to continue.",
        7,
      ),
    ],
  },

  {
    n: 21,
    title: "Member Missionary Coordination",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Coordinate with ward members to support investigators",
    steps: [
      r("Read teaching passage. Focus on community and membership vocabulary.", 6),
      ds(
        "Role-play: call a ward member and explain the investigator's situation. Invite them to a dinner.",
        8,
      ),
      sp("Practice: 'Tenemos un investigador que se llama… Nos gustaría que ustedes…'", 6),
    ],
  },

  {
    n: 22,
    title: "Baptism Interview Preparation",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Prepare an investigator for the baptism interview questions",
    steps: [
      ms("Review the baptismal interview questions in the module tab.", 7),
      ds(
        "Role-play the interview: ask all baptism interview questions, respond as investigator.",
        8,
      ),
      sp(
        "Practice the commitment: 'Ha cumplido con todos los compromisos. Está listo para su entrevista.'",
        5,
      ),
    ],
  },

  {
    n: 23,
    title: "Teaching Children & Youth",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Adapt your teaching vocabulary for younger audiences",
    steps: [
      r("Read the passage. Note any sentences that use simple, child-friendly language.", 6),
      sb("Build 5 sentences using only A2-level vocabulary — no complex words.", 6),
      sp(
        "Teach the Restoration to an 8-year-old in the target language. Keep each sentence under 10 words.",
        8,
      ),
    ],
  },

  {
    n: 24,
    title: "Bearing Testimony",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Bear a personal testimony in your own words in the target language",
    steps: [
      r("Read the passage. Find all testimony sentences ('Sé que…', 'Testifico que…').", 7),
      pt("Pattern: 'Yo sé que [gospel principle] porque [personal reason].' Build 6 examples.", 6),
      sp("Bear your full testimony: 30-45 seconds, no notes. Record and listen back.", 7),
    ],
  },

  {
    n: 25,
    title: "Scripture Fluency — Finding & Reading",
    readingTemplate: "seed-{lang}-faith-scripture-explanation",
    objective: "Find, read, and explain a scripture in the target language",
    steps: [
      r(
        "Read the Scripture Explanation passage. Focus on how scriptures are referenced and explained.",
        8,
      ),
      ms("In the module tab, practice finding and reading key scriptures.", 6),
      sp(
        "Read one scripture out loud, then explain it in 2-3 sentences as you would to an investigator.",
        6,
      ),
    ],
  },

  {
    n: 26,
    title: "Post-Baptism Fellowshipping",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Welcome a new member and connect them to ward family",
    steps: [
      ds(
        "Role-play: a new convert feels overwhelmed at church. Help them feel welcome, introduce vocabulary.",
        9,
      ),
      pt(
        "Pattern: 'En la iglesia, nosotros [activity]. Tú también puedes [activity].' Build 5 sentences.",
        5,
      ),
      sp(
        "Practice a post-baptism conversation: celebrate, explain next steps, invite to Sunday.",
        6,
      ),
    ],
  },

  {
    n: 27,
    title: "Gospel Conversations in Daily Life",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Bring gospel topics naturally into everyday conversation",
    steps: [
      r(
        "Read the teaching passage. Notice how gospel principles connect to daily-life situations.",
        7,
      ),
      sb(
        "Build 6 sentences that connect a daily topic (family, work, stress) to a gospel principle.",
        6,
      ),
      sp(
        "Practice a casual gospel share: start with a daily topic, naturally connect it to the gospel.",
        7,
      ),
    ],
  },

  {
    n: 28,
    title: "Companion Study & Planning",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Hold a companion study session entirely in the target language",
    steps: [
      ms("In the module tab, practice planning dialogue: schedules, areas, teaching goals.", 7),
      pt(
        "Pattern: 'Hoy vamos a enseñar [lesson] a [investigator]. Necesitamos [preparation].' Build a study plan.",
        7,
      ),
      sp(
        "Conduct a 2-minute companion study out loud — plan, goals, and prayer — entirely in the target language.",
        6,
      ),
    ],
  },

  {
    n: 29,
    title: "Cultural Sensitivity & Building Trust",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Adapt your approach to show genuine respect for the investigator's background",
    steps: [
      r("Read the faith passage. Identify sentences that show cultural empathy.", 6),
      ds(
        "Role-play: investigator shares their own strong faith tradition. Respond with genuine respect.",
        8,
      ),
      sp(
        "Practice: 'Respeto mucho su fe y sus tradiciones. Lo que compartimos tiene algo en común…'",
        6,
      ),
    ],
  },

  {
    n: 30,
    title: "THRESHOLD — Full First Lesson",
    readingTemplate: "seed-{lang}-lds-teaching",
    objective: "Teach Lesson 1 (La Restauración) from start to finish with commitments",
    steps: [
      ms(
        "In the Missionary tab, run through the complete Restoration lesson — all points, all commitments.",
        10,
      ),
      ds(
        "Role-play: Full Restoration lesson with an AI investigator. Handle at least one concern.",
        8,
      ),
      sp(
        "Bear testimony and extend a baptism commitment to close the lesson. This is your threshold moment.",
        4,
      ),
    ],
  },
];

// ─── ORTHOPEDICS ──────────────────────────────────────────────────────────────

const ORTHO_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Greeting a Patient",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Greet a patient, introduce yourself, and establish rapport",
    steps: [
      r("Read the family medicine passage. Focus on the greeting and intake sentences.", 7),
      ot("In the Orthopedics module, practice the patient greeting phrases.", 7),
      sp("Say: 'Buenos días, soy [role]. ¿Cómo se llama? ¿Cómo puedo ayudarle hoy?'", 6),
    ],
  },

  {
    n: 2,
    title: "Taking the Chief Complaint",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Ask where it hurts, how long, and how severe — in your target language",
    steps: [
      r("Read the passage. Find and save every pain and complaint vocabulary word.", 7),
      ot("Practice the chief complaint questions in the Orthopedics tab.", 7),
      sp(
        "Ask the three core questions: '¿Dónde le duele? ¿Cuándo empezó? ¿Qué tan fuerte es el dolor del 1 al 10?'",
        6,
      ),
    ],
  },

  {
    n: 3,
    title: "Bones of the Body",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Name 15 bones and their locations on a patient",
    steps: [
      ot("In the Orthopedics tab, drill all bone names using the anatomy feature.", 8),
      wm("Flash all bone vocab until you get 10/10 correct twice in a row.", 6),
      sp("Point to your own body: 'Esto es el fémur. Esto es la tibia.' Run through 10 bones.", 6),
    ],
  },

  {
    n: 4,
    title: "Joints & Cartilage",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain the function of key joints to a patient",
    steps: [
      r("Read the passage. Tap all joint-related words: rodilla, cadera, hombro, codo, muñeca.", 8),
      wm("Drill joint vocabulary to 100% accuracy.", 5),
      sp(
        "Tell a patient about their knee: '¿Le duele aquí? Esto es su rodilla — la articulación entre el fémur y la tibia.'",
        7,
      ),
    ],
  },

  {
    n: 5,
    title: "Muscles, Tendons & Ligaments",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Distinguish and explain the difference between these soft-tissue structures",
    steps: [
      ot("Use the Orthopedics module to drill muscle and soft-tissue vocabulary.", 8),
      pt(
        "Pattern: 'El/La [structure] conecta [A] a [B] y permite [function].' Build 4 examples.",
        6,
      ),
      sp(
        "Explain to a patient: 'Su tendón de Aquiles conecta el músculo de la pantorrilla al talón.'",
        6,
      ),
    ],
  },

  {
    n: 6,
    title: "Pain Assessment (0–10 Scale)",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Use a pain scale conversation naturally and document the rating",
    steps: [
      r("Read the medical intake passage. Find all pain-scale language.", 6),
      sb(
        "Build 5 sentences using: ¿Cuánto duele?, escala, leve, moderado, severo, insoportable.",
        6,
      ),
      sp(
        "Run a full pain assessment conversation: location, onset, character, radiation, scale, modifying factors.",
        8,
      ),
    ],
  },

  {
    n: 7,
    title: "Range of Motion Examination",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Give range-of-motion instructions in the target language",
    steps: [
      ot("In the Orthopedics tab, practice physical exam instruction phrases.", 8),
      sb(
        "Build: 'Por favor, [flexione / extienda / rote] su [joint] hasta donde pueda.' (5 variations)",
        5,
      ),
      sp(
        "Walk through a shoulder exam: 'Levante el brazo. Ahora bájelo. Ahora hacia atrás. ¿Le duele aquí?'",
        7,
      ),
    ],
  },

  {
    n: 8,
    title: "Fractures — Types & Terms",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain a fracture diagnosis to a patient in plain language",
    steps: [
      r("Read the medical passage. Tap fracture-related vocabulary.", 6),
      wm("Drill: fractura, cerrada, abierta, desplazada, conminuta, incompleta. 6/6 correct.", 6),
      sp(
        "Explain an X-ray result: 'Su radiografía muestra una fractura aquí. Necesitamos inmovilizarla.'",
        8,
      ),
    ],
  },

  {
    n: 9,
    title: "Arthritis & Joint Disease",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Diagnose and explain arthritis to a patient",
    steps: [
      ot("Use the module tab to review arthritis vocabulary and patient explanation phrases.", 7),
      pt(
        "Pattern: 'Usted tiene [diagnosis]. Esto significa que [explanation]. El tratamiento incluye [options].' Build 3 diagnoses.",
        7,
      ),
      sp("Give an arthritis diagnosis in patient-friendly language. No jargon — plain Spanish.", 6),
    ],
  },

  {
    n: 10,
    title: "Shoulder & Rotator Cuff",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain a rotator cuff injury and treatment plan",
    steps: [
      r("Read medical passage. Focus on shoulder anatomy vocabulary.", 6),
      wm("Drill: manguito rotador, bursitis, tendinitis, desgarro, impingement. 5/5 correct.", 5),
      sp(
        "Explain: 'Su manguito rotador tiene un desgarro parcial. Le recomiendo fisioterapia y descanso.'",
        9,
      ),
    ],
  },

  {
    n: 11,
    title: "Knee — ACL, Meniscus & Patella",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain common knee injuries to a patient",
    steps: [
      ot("In the module tab, drill knee anatomy and injury names.", 8),
      sb("Build 4 sentences explaining different knee injuries in patient language.", 5),
      sp(
        "Describe an ACL tear: '¿Escuchó un sonido al lesionarse? El ligamento cruzado anterior está desgarrado.'",
        7,
      ),
    ],
  },

  {
    n: 12,
    title: "Spine & Back Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Take a back pain history and explain spinal anatomy",
    steps: [
      r("Read medical intake passage. Focus on spinal and back vocabulary.", 7),
      wm("Drill: columna vertebral, disco, hernia, lumbar, cervical, nervio ciático. 6/6.", 5),
      sp(
        "Ask back pain intake questions: onset, location, radiation, numbness, bowel/bladder changes.",
        8,
      ),
    ],
  },

  {
    n: 13,
    title: "Pre-Op Patient Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain pre-operative instructions clearly",
    steps: [
      r("Read the passage. Find all preparation-related vocabulary.", 6),
      pt(
        "Pattern: 'Antes de la cirugía, usted debe [instruction]. No debe [restriction].' Build 6 pre-op instructions.",
        7,
      ),
      sp("Give a full pre-op briefing: NPO, allergies, consent, what to expect on the day.", 7),
    ],
  },

  {
    n: 14,
    title: "Post-Op Recovery Instructions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Provide post-operative discharge instructions the patient can follow",
    steps: [
      ot("In the module tab, practice discharge instruction phrases.", 8),
      sb(
        "Build: 'Tome el medicamento [name] cada [interval]. Llame si tiene [symptom].' (5 variations)",
        5,
      ),
      sp(
        "Give complete post-op instructions for a hip replacement: activity, medication, danger signs.",
        7,
      ),
    ],
  },

  {
    n: 15,
    title: "Physical Therapy Referral",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain why PT is needed and what to expect",
    steps: [
      r("Read the passage. Find referral and therapy vocabulary.", 6),
      pt(
        "Pattern: 'Le refiero a fisioterapia para [goal]. El fisioterapeuta le ayudará a [outcome].'",
        6,
      ),
      sp(
        "Give a PT referral conversation: reason, duration, goals, and what exercises to expect.",
        8,
      ),
    ],
  },

  {
    n: 16,
    title: "Medication Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain a prescription: name, dose, timing, and side effects",
    steps: [
      r("Read the medical passage. Find all medication instruction phrases.", 7),
      sb(
        "Build: 'Tome [dose] de [medication] [frequency]. Si tiene [side effect], llame.' (4 examples)",
        6,
      ),
      sp(
        "Explain an NSAID prescription: name, dose, with food, avoid alcohol, call if bleeding.",
        7,
      ),
    ],
  },

  {
    n: 17,
    title: "Casting & Splinting Instructions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain how to care for a cast or splint",
    steps: [
      ot("In the module tab, practice cast care vocabulary.", 7),
      pt(
        "Pattern: 'Para cuidar su yeso, usted debe [action]. No debe [restriction].' Build 5 instructions.",
        7,
      ),
      sp(
        "Give full cast care instructions: keep dry, elevate, watch circulation, return if numbness.",
        6,
      ),
    ],
  },

  {
    n: 18,
    title: "Discharge from Emergency",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Discharge a patient with clear return precautions",
    steps: [
      r("Read the emergency triage passage. Focus on assessment and discharge language.", 8),
      sp(
        "Give a full discharge: 'Hoy le diagnostiqué [diagnosis]. Puede irse a casa con [instructions]. Regrese si [warning signs].'",
        7,
      ),
      wm(
        "Drill emergency discharge vocabulary: alta, instrucciones, señales de alarma, seguimiento.",
        5,
      ),
    ],
  },

  {
    n: 19,
    title: "Informed Consent",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain a procedure and obtain informed consent in the target language",
    steps: [
      r("Read the intake passage. Find consent and rights vocabulary.", 6),
      ds(
        "Role-play: explain a procedure to a patient. Answer questions about risks and alternatives.",
        8,
      ),
      sp(
        "Read a consent summary out loud: procedure, risks, alternatives, patient rights, right to refuse.",
        6,
      ),
    ],
  },

  {
    n: 20,
    title: "Pediatric Orthopedics",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Adjust your language and manner for pediatric patients and parents",
    steps: [
      sb("Build 5 sentences in very simple, child-friendly Spanish: short words, no jargon.", 5),
      ds(
        "Role-play: speak to a 6-year-old with a broken arm, then speak to their parent separately.",
        9,
      ),
      sp("Say: 'Hola, ¿cómo te llamas? ¿Dónde te duele? No te preocupes — vamos a ayudarte.'", 6),
    ],
  },

  {
    n: 21,
    title: "Sports Medicine Context",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate and communicate about a sports injury",
    steps: [
      r("Read the medical passage. Find sports and activity vocabulary.", 6),
      ot("In the module tab, drill sports injury vocabulary.", 7),
      sp(
        "Take a sports injury history: mechanism, immediate sensation, ability to bear weight, previous injuries.",
        7,
      ),
    ],
  },

  {
    n: 22,
    title: "Fall Prevention Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel an elderly patient on fall prevention in clear, simple language",
    steps: [
      pt(
        "Pattern: 'Para prevenir caídas, usted debe [action]. Evite [risk].' Build 6 instructions.",
        6,
      ),
      sb("Build 4 sentences using: agarraderas, iluminación, zapatos, alfombras, bastón.", 6),
      sp("Give a full fall prevention counseling session. Speak slowly and simply.", 8),
    ],
  },

  {
    n: 23,
    title: "Prosthetics & Orthotics Basics",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain prosthetic or orthotic devices to a new patient",
    steps: [
      ot("In the module tab, drill prosthetics and orthotics vocabulary.", 7),
      wm(
        "Drill: prótesis, órtesis, amputación, ajuste, ajustar, socket, extremidad. 7 correct.",
        5,
      ),
      sp(
        "Explain a knee brace to a new patient: why they need it, how to put it on, and maintenance.",
        8,
      ),
    ],
  },

  {
    n: 24,
    title: "SBAR Handoff Communication",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Give a clinical handoff using the SBAR structure in the target language",
    steps: [
      r("Read the nursing SBAR passage. Identify each SBAR section.", 8),
      pt(
        "Pattern: 'Situación: [patient issue]. Antecedentes: [history]. Evaluación: [assessment]. Recomendación: [plan].' Build one.",
        8,
      ),
      sp("Give a full SBAR handoff for a post-surgical orthopedic patient.", 4),
    ],
  },

  {
    n: 25,
    title: "Emergency — Acute Trauma",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Rapidly assess an acute trauma patient using standard questions",
    steps: [
      r("Read the emergency triage passage fully. This is a fast-paced scenario.", 8),
      ld("In Listening Drill, practice understanding rapid medical speech.", 5),
      sp("Run a trauma assessment: mechanism, LOC, pain, vitals, allergies — in 90 seconds.", 7),
    ],
  },

  {
    n: 26,
    title: "Patient Education — Home Exercise",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Teach a patient their home exercise program",
    steps: [
      ot("In the module tab, practice exercise instruction vocabulary.", 7),
      sb(
        "Build: '[Muscle group] — haga [number] repeticiones de [exercise], [frequency/day].' 4 exercises.",
        6,
      ),
      sp(
        "Teach a 3-exercise home program for knee rehab. Demonstrate verbally with clear instructions.",
        7,
      ),
    ],
  },

  {
    n: 27,
    title: "Cultural Competency in Care",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Acknowledge and respond to cultural beliefs that affect care",
    steps: [
      r("Read the passage. Notice how the patient describes pain and treatment preferences.", 6),
      ds(
        "Role-play: patient declines surgery for cultural/religious reasons. Respond with respect and explore alternatives.",
        9,
      ),
      sp(
        "Practice: 'Respeto sus creencias. Podemos explorar otras opciones juntos. ¿Qué le parece?'",
        5,
      ),
    ],
  },

  {
    n: 28,
    title: "Documentation Language",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Understand and use clinical documentation phrases",
    steps: [
      r("Read the medical intake. Note the formal clinical language used in assessments.", 7),
      pt(
        "Pattern: 'El paciente refiere [chief complaint] de [duration]. Niega [symptom]. La exploración revela [finding].' Build 3 notes.",
        8,
      ),
      sp("Dictate a brief SOAP note for a new knee pain patient in 90 seconds.", 5),
    ],
  },

  {
    n: 29,
    title: "Complex Case — Full Encounter",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Complete a complex clinical encounter with history, exam, plan, and education",
    steps: [
      ot("In the module tab, go through a full complex case scenario.", 9),
      ds(
        "Role-play a full encounter: greeting → chief complaint → history → exam → diagnosis → plan → discharge.",
        9,
      ),
      sp(
        "Summarize the encounter to the patient: diagnosis, plan, medications, follow-up, return precautions.",
        2,
      ),
    ],
  },

  {
    n: 30,
    title: "THRESHOLD — Full Patient Intake",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective:
      "Complete a full orthopedic patient intake and treatment discussion without switching languages",
    steps: [
      ot("Run the full orthopedic module patient scenario start to finish.", 10),
      ds(
        "AI-assisted full patient encounter: new complaint, physical exam, diagnosis, plan, consent, discharge.",
        8,
      ),
      sp(
        "Debrief out loud: 'I saw a patient with [diagnosis]. My treatment plan was [plan]. I said [key phrases].'",
        4,
      ),
    ],
  },
];

// ─── CONSTRUCTION FOREMAN ────────────────────────────────────────────────────

const CONSTRUCTION_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Morning Greeting & Roll Call",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Greet your crew, take attendance, and open the day",
    steps: [
      r("Read the framing passage. Focus on greeting and role identification sentences.", 7),
      wm(
        "Drill crew role vocab: carpintero, electricista, plomero, ayudante, capataz, obrero. 6/6.",
        5,
      ),
      sp(
        "Say the morning greeting: 'Buenos días equipo. Todos presentes. Empezamos a las 7. Primero, seguridad.'",
        8,
      ),
    ],
  },

  {
    n: 2,
    title: "Safety Briefing (Toolbox Talk)",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Run a 5-minute safety meeting in the target language",
    steps: [
      r("Read the framing passage. Find all safety vocabulary.", 7),
      pt(
        "Pattern: 'Hoy trabajamos en [area]. El peligro principal es [hazard]. Para estar seguros, deben [action].' Build 3.",
        7,
      ),
      sp(
        "Run a full toolbox talk: site hazard, PPE requirements, emergency plan, and questions.",
        6,
      ),
    ],
  },

  {
    n: 3,
    title: "Tools — Names & Requests",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Name 15 common tools and ask a worker to bring them",
    steps: [
      r("Read framing passage. Tap all tool names. Build your Word Match list.", 7),
      wm(
        "Drill: martillo, sierra, taladro, nivel, cinta, clavos, tornillos, cincel, llave. 9/9.",
        5,
      ),
      sp("Practice: 'Tráeme la sierra circular. ¿Tienes el nivel? Necesito la cinta métrica.'", 8),
    ],
  },

  {
    n: 4,
    title: "Materials & Measurements",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Order materials by specifying size, quantity, and type",
    steps: [
      r("Read the passage. Focus on measurement and material vocabulary.", 6),
      sb("Build: 'Necesito [quantity] de [material] de [dimension].' (5 different examples)", 7),
      sp(
        "Call in a material order: 'Necesito 20 tablas de 2×4, 8 pies. También 50 libras de clavos de 3 pulgadas.'",
        7,
      ),
    ],
  },

  {
    n: 5,
    title: "Reading Plans — Layout Vocabulary",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Give layout instructions from a plan to your crew",
    steps: [
      r("Read the framing layout passage in full. Map each sentence to a job-site action.", 8),
      pt(
        "Pattern: 'La pared va de [point A] a [point B]. La puerta mide [dimension] y está a [measurement] del [reference].' Build 3.",
        6,
      ),
      sp(
        "Give layout instructions for a simple room using norte/sur/este/oeste and measurements.",
        6,
      ),
    ],
  },

  {
    n: 6,
    title: "Framing Commands",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Give 10 standard framing commands your crew will understand immediately",
    steps: [
      r("Read the framing passage. Identify the command sentences.", 6),
      sb(
        "Build imperatives: 'Clava [location]. Corta a [measurement]. Sujeta la viga mientras yo [action].' (6)",
        7,
      ),
      sp(
        "Drill: 'Mide dos veces, corta una. Nívela. Atorníllala. Sujétala. Mueve la sierra. Cuidado.'",
        7,
      ),
    ],
  },

  {
    n: 7,
    title: "Roof & Sheathing",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Direct crew on roofing tasks",
    steps: [
      wm("Drill: techo, viga, rafters, cubierta, OSB, impermeabilizante, cumbrera, alero. 8/8.", 5),
      pt(
        "Pattern: 'Instala el [material] en el [location], comenzando desde [reference point].' Build 4.",
        7,
      ),
      sp("Describe the roofing sequence to your crew: sheathing, felt, drip edge, shingles.", 8),
    ],
  },

  {
    n: 8,
    title: "Concrete & Foundations",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Direct a concrete pour",
    steps: [
      r("Read framing passage. Find concrete and foundation terms.", 6),
      wm(
        "Drill: concreto, mezcla, forma, varilla, vibrar, nivelar, curar, fraguado. 8 correct.",
        6,
      ),
      sp(
        "Direct a pour: 'Llena la forma hasta la marca. Vibra aquí. Nivela con el vibrador. Cubre y mantén húmedo por 7 días.'",
        8,
      ),
    ],
  },

  {
    n: 9,
    title: "Problem Reporting",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Understand and respond when a worker reports a problem",
    steps: [
      r("Read the passage. Find problem and reporting vocabulary.", 6),
      ds(
        "Role-play: worker reports a problem (wrong measurement, missing material, injury). Respond and direct.",
        9,
      ),
      sp(
        "Practice: 'Dime qué pasó. ¿Cuándo notaste el problema? ¿Qué hiciste? Bien — ahora haz esto…'",
        5,
      ),
    ],
  },

  {
    n: 10,
    title: "Numbers & Measurements — Speed Drill",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Say any measurement instantly without translating in your head",
    steps: [
      pt(
        "Pattern: Dimensions — '[number] pies y [inches] pulgadas', '[number] por [number] pulgadas'. Build 8.",
        7,
      ),
      wm(
        "Flash measurement vocab: pie, pulgada, metro, centímetro, cuadrado, área, volumen. 7/7.",
        5,
      ),
      sp(
        "Speed drill: hear or see a measurement and say it instantly: 8 feet 6 inches → 'Ocho pies y seis pulgadas.'",
        8,
      ),
    ],
  },

  {
    n: 11,
    title: "Time & Scheduling",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Set the day's schedule and manage time in the target language",
    steps: [
      sb(
        "Build: 'Empezamos [task] a las [time]. Terminamos antes de [time]. Almuerzo a las [time].' (4 examples)",
        6,
      ),
      pt("Pattern: 'Si terminamos [task A] antes de [time], entonces podemos [task B].'", 6),
      sp(
        "Give the full day schedule: morning tasks, lunch, afternoon, cleanup, what needs to be done before leaving.",
        8,
      ),
    ],
  },

  {
    n: 12,
    title: "Electrical Safety Coordination",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Communicate basic electrical safety rules to your crew",
    steps: [
      wm(
        "Drill: corriente, voltaje, circuito, interruptor, tierra, corto circuito, fusible, peligro. 8/8.",
        5,
      ),
      pt(
        "Pattern: 'Nunca toques [hazard] cuando [condition]. Siempre [safety action] antes de [task].' Build 4.",
        7,
      ),
      sp(
        "Give electrical safety instructions for a rough-in day: lockout, PPE, don't touch live wires.",
        8,
      ),
    ],
  },

  {
    n: 13,
    title: "Drywall & Finishing",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Direct drywall hanging and taping to finish quality",
    steps: [
      r("Read the drywall passage in full.", 7),
      wm("Drill: drywall, compuesto, cinta, tornillos, lija, espátula, textura, primer. 8/8.", 5),
      sp(
        "Direct a drywall sequence: 'Cuelga el panel. Atornilla cada 8 pulgadas. Aplica cinta y compuesto. Lija cuando seque.'",
        8,
      ),
    ],
  },

  {
    n: 14,
    title: "Giving Feedback & Correction",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Correct a worker's mistake clearly without causing offense",
    steps: [
      r("Read the passage. Find feedback and correction sentences.", 6),
      ds(
        "Role-play: worker did a task wrong — explain what's wrong and how to fix it. Be direct but respectful.",
        9,
      ),
      sp(
        "Practice correction: 'Mira — esto no está bien. Necesita ser a [spec]. Arréglalo así: [step].'",
        5,
      ),
    ],
  },

  {
    n: 15,
    title: "Hiring a New Worker",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Interview and onboard a new worker",
    steps: [
      pt(
        "Pattern: '¿Tienes experiencia en [trade]? ¿Puedes empezar [date]? El pago es [rate] por [period].' Build 5 questions.",
        7,
      ),
      ds(
        "Role-play: conduct a site interview. Ask about skills, experience, references, and availability.",
        8,
      ),
      sp(
        "Give a first-day orientation: site rules, safety, where to park, start time, bathroom location.",
        5,
      ),
    ],
  },

  {
    n: 16,
    title: "Subcontractor Coordination",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Coordinate with a subcontractor on-site",
    steps: [
      r("Read the framing passage. Focus on coordination language.", 6),
      sb(
        "Build: 'Necesito que [sub] termine [task] antes de que [next trade] llegue el [day].' (4 examples)",
        6,
      ),
      sp(
        "Call a sub: 'Hola, soy el capataz de [company]. Necesitamos que su equipo esté aquí el lunes a las 7 para [task].'",
        8,
      ),
    ],
  },

  {
    n: 17,
    title: "Material Orders & Delivery",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Place a material order and coordinate delivery",
    steps: [
      sb(
        "Build order sentences: '[Quantity] de [material], [spec]. Necesito entrega el [date] a las [time].' (4)",
        6,
      ),
      pt(
        "Pattern: 'Si no llegan [materials] hoy, entonces mañana no podemos [task].' Build 3 contingency sentences.",
        6,
      ),
      sp(
        "Call in an order to the lumberyard: materials, quantities, dimensions, delivery date, site address.",
        8,
      ),
    ],
  },

  {
    n: 18,
    title: "Inspection Day Preparation",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Prepare your crew for a code inspection",
    steps: [
      wm(
        "Drill: inspector, código, aprobado, violación, corrección, permiso, cimentación, cableado. 8/8.",
        5,
      ),
      pt(
        "Pattern: 'Para la inspección, asegúrate de que [item] esté [condition].' Build 6 checklist items.",
        7,
      ),
      sp(
        "Brief your crew: 'El inspector llega a las 10. Todo debe estar limpio. Estas son las áreas que revisará.'",
        8,
      ),
    ],
  },

  {
    n: 19,
    title: "Emergency & First Aid",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Respond to a jobsite injury in the target language",
    steps: [
      wm(
        "Drill: herido, accidente, ambulancia, botiquín, vendaje, fractura, quemadura, desmayo.",
        5,
      ),
      sb(
        "Build: 'Llama al 911. No lo muevas. Aplica presión aquí. El botiquín está en [location].' (emergency script)",
        7,
      ),
      sp(
        "Run through an emergency scenario: worker is injured. Call for help, give first aid, direct others.",
        8,
      ),
    ],
  },

  {
    n: 20,
    title: "Project Closeout & Punch List",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Walk through a punch list with your crew",
    steps: [
      r("Read the framing passage. Focus on completion and finish vocabulary.", 6),
      pt(
        "Pattern: 'En el cuarto [location], falta [item]. El [defect] necesita corrección antes del [date].' Build 5.",
        7,
      ),
      sp("Walk through a punch list verbally: room by room, defect by defect, who fixes each.", 7),
    ],
  },

  {
    n: 21,
    title: "Client Walkthrough",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Walk a client through the completed work",
    steps: [
      ds(
        "Role-play: lead a client through a newly completed space. Explain work done, highlight quality.",
        9,
      ),
      sb(
        "Build: 'Aquí instalamos [feature]. Notará que [quality detail]. Esto cumple con [standard].' (4 examples)",
        5,
      ),
      sp(
        "Practice the walkthrough opening: welcome, overview, invite questions, explain warranty.",
        6,
      ),
    ],
  },

  {
    n: 22,
    title: "Payment & Invoicing Terms",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Discuss payment schedule and invoice details",
    steps: [
      wm(
        "Drill: factura, pago, adelanto, saldo, cheque, transferencia, fecha límite, recibo. 8/8.",
        5,
      ),
      pt(
        "Pattern: 'El pago inicial es [amount]. El saldo de [amount] se paga cuando [milestone].' Build 3.",
        7,
      ),
      sp("Explain a payment schedule to a client or owner.", 8),
    ],
  },

  {
    n: 23,
    title: "Weather Delays & Changes",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Communicate schedule changes due to weather or conditions",
    steps: [
      sb(
        "Build: 'Por [weather condition], no podemos [task] hoy. Reprogramamos para el [day].' (4 examples)",
        6,
      ),
      pt(
        "Pattern: 'Si [condition], entonces [action]. Si no, entonces [alternative].' Build 4 contingency plans.",
        6,
      ),
      sp(
        "Call a client: explain a weather delay, new expected completion date, and what it affects.",
        8,
      ),
    ],
  },

  {
    n: 24,
    title: "Quality Control Walk",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Direct a quality control check of completed work",
    steps: [
      r("Read the framing passage. Focus on quality and inspection vocabulary.", 6),
      ds(
        "Role-play: inspect an area with a worker. Point out defects, explain standard, direct correction.",
        9,
      ),
      sp(
        "Run a QC walk: 'Este ángulo no está a 90 grados. Esta unión necesita más tornillos. Esta pintura tiene burbujas — repíntenla.'",
        5,
      ),
    ],
  },

  {
    n: 25,
    title: "Training a New Worker",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Train a brand-new worker on a simple task",
    steps: [
      sb(
        "Build a step-by-step instruction sequence for a simple task (hanging drywall). 5 steps.",
        6,
      ),
      ds("Role-play: train a first-day worker. Demonstrate, then watch them try, then correct.", 9),
      sp("Practice: 'Primero haz esto. Ahora tú. No, así — mira. Bien. Ahora otra vez.'", 5),
    ],
  },

  {
    n: 26,
    title: "Team Culture & Respect",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Communicate expectations around respect and team standards",
    steps: [
      r("Read the passage. Focus on leadership and team language.", 6),
      pt(
        "Pattern: 'En este equipo, nosotros [positive value]. No toleramos [negative behavior].' Build 5.",
        7,
      ),
      sp(
        "Give a team culture speech: expectations, respect, help each other, no shortcuts on safety.",
        7,
      ),
    ],
  },

  {
    n: 27,
    title: "End-of-Day Wrap & Tomorrow's Plan",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Close the day, account for everyone, and preview tomorrow",
    steps: [
      sb(
        "Build: 'Hoy terminamos [task]. Mañana empezamos con [task] a las [time]. Necesitamos [materials].' (3 examples)",
        6,
      ),
      pt(
        "Pattern: 'Asegúrense de [action] antes de irse. Dejen todo [condition].' Build 5 end-of-day checklist items.",
        6,
      ),
      sp(
        "Give the full end-of-day wrap: what was accomplished, cleanup instructions, tomorrow's plan.",
        8,
      ),
    ],
  },

  {
    n: 28,
    title: "Conflict Resolution on Site",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Mediate a conflict between workers professionally",
    steps: [
      r("Read the passage. Find conflict and resolution vocabulary.", 6),
      ds(
        "Role-play: two workers have a conflict. Listen to both, acknowledge feelings, give a decision.",
        9,
      ),
      sp(
        "Practice: 'Los escuché a los dos. El problema es [issue]. La solución es [resolution]. ¿Estamos de acuerdo?'",
        5,
      ),
    ],
  },

  {
    n: 29,
    title: "Foreman's Leadership Speech",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Motivate your crew at the start of a hard week",
    steps: [
      pt(
        "Pattern: 'Esta semana vamos a [challenge]. Necesito que cada uno de ustedes [contribution]. Si lo hacemos juntos, [outcome].' Build your speech.",
        8,
      ),
      ds("Role-play: give your motivation speech to the crew. Handle a skeptical worker.", 8),
      sp(
        "Deliver your full motivation speech: challenge, team belief, specific expectations, call to action.",
        4,
      ),
    ],
  },

  {
    n: 30,
    title: "THRESHOLD — Full Morning Safety Meeting",
    readingTemplate: "seed-{lang}-framer-layout",
    objective: "Run a complete morning safety meeting and task assignment without help",
    steps: [
      r("Read the framing passage one final time. You should understand every word.", 6),
      ds(
        "AI-role-play: run a full morning meeting — roll call, safety brief, task assignments, questions.",
        10,
      ),
      sp(
        "Go again from memory. Greet, safety, assignments, questions, close. Measure yourself against Lesson 1.",
        6,
      ),
    ],
  },
];

// ─── SOCCER ──────────────────────────────────────────────────────────────────

const SOCCER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Basic Match Vocabulary",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Name the basic elements of a soccer match",
    steps: [
      r("Read the soccer match passage. Tap every term you don't know.", 7),
      sc("In the Soccer module, drill the basic match vocabulary.", 7),
      sp(
        "Describe what's happening in a match: 'El delantero tiene el balón. Pasa al mediocampista. ¡GOL!'",
        6,
      ),
    ],
  },
  {
    n: 2,
    title: "Positions & Roles",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Name all 11 positions and explain their roles",
    steps: [
      r("Read the passage. Find every position name.", 6),
      wm(
        "Drill all positions: portero, defensa central, lateral, mediocampista, delantero, extremo. All correct.",
        6,
      ),
      sp(
        "Explain each position in one sentence: 'El portero defiende la meta. El delantero anota goles.'",
        8,
      ),
    ],
  },
  {
    n: 3,
    title: "Game Rules & Fouls",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Explain offside, penalty kicks, and yellow/red cards",
    steps: [
      r("Read the match passage. Find all rules vocabulary.", 7),
      sc("In the Soccer module, drill rules and foul vocabulary.", 7),
      sp(
        "Explain offside to a new fan: '¿Ves al delantero? Está más cerca de la meta que el último defensa. Eso es fuera de juego.'",
        6,
      ),
    ],
  },
  {
    n: 4,
    title: "Coaching Commands",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Give 10 commands a player would hear from the sideline",
    steps: [
      sc("In the module, practice coaching command phrases.", 7),
      sb(
        "Build imperatives: 'Mantén el balón. Presiona. Cubre a tu hombre. Llévalo por afuera.' (8 commands)",
        6,
      ),
      sp("Shout 10 sideline commands as if in a real match. Volume, urgency, clarity.", 7),
    ],
  },
  {
    n: 5,
    title: "Team Communication on the Pitch",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Communicate with teammates in real-time during play",
    steps: [
      r("Read the match passage. Focus on player-to-player communication.", 6),
      wm("Drill: marca, pásala, muévete, solo, apoya, atrás, adelante, centro, cabeza. 9/9.", 5),
      sp("Do a real-time commentary drill: narrate a fast attack sequence as it would happen.", 9),
    ],
  },
  {
    n: 6,
    title: "Practice Drills & Warm-Up",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Direct a team through a warm-up and drill session",
    steps: [
      sc("In the module, practice training session vocabulary.", 7),
      pt(
        "Pattern: 'Hagan [number] de [drill]. Después de [condition], cambien a [next drill].' Build 4.",
        6,
      ),
      sp("Run a warm-up drill verbally: jog, stretch, passing pairs, shooting sequence.", 7),
    ],
  },
  {
    n: 7,
    title: "Tactical Talk — Formations",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Describe your team's formation and tactical plan",
    steps: [
      r("Read the match passage. Focus on tactical and formation language.", 6),
      wm(
        "Drill: formación, 4-4-2, presión, bloque bajo, contragolpe, posesión, presionar, replegarse. 8/8.",
        5,
      ),
      sp(
        "Explain your tactical plan: 'Jugamos en 4-3-3. En ataque, los extremos se abren. En defensa, bloque medio.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Half-Time Team Talk",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Give a realistic half-time talk — praise, criticize, adjust",
    steps: [
      sc("In the module, practice motivational team talk phrases.", 7),
      ds("Role-play: give a half-time talk. Team is down 1-0. What do you say?", 9),
      sp(
        "Deliver the full half-time talk: what worked, what didn't, specific tactical change, motivation to close.",
        4,
      ),
    ],
  },
  {
    n: 9,
    title: "Injuries & Medical Communication",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Communicate about an injury on the pitch",
    steps: [
      wm(
        "Drill: lesión, torcedura, esguince, hielo, camilla, médico, sustituto, recuperación. 8/8.",
        5,
      ),
      sb(
        "Build: 'Está lesionado en [body part]. Necesita [treatment]. Sale y entra [substitute].' (3 scenarios)",
        6,
      ),
      sp(
        "Call the medical team: 'El número 9 se cayó. Parece una lesión de rodilla. Necesitamos la camilla.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Press Conference Language",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Answer post-match press questions in the target language",
    steps: [
      r("Read the match passage. Focus on match analysis and result vocabulary.", 6),
      ds(
        "Role-play: 5-question press conference after a 2-1 win. Praise team, discuss key moments.",
        9,
      ),
      sp(
        "Give a 60-second post-match statement: result, key moments, player praise, next match.",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Transfer & Contract Talk",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Discuss a player transfer in the target language",
    steps: [
      wm(
        "Drill: traspaso, contrato, cláusula de rescisión, salario, agente, renovar, libre, préstamo. 8/8.",
        5,
      ),
      ds("Role-play: negotiate a player transfer with an agent.", 10),
      sp(
        "Summarize a transfer deal: 'El club pagó 20 millones por un contrato de 4 años con opción de prórroga.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Fan Culture & Match Day",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Talk about match day with fans",
    steps: [
      r("Read the soccer match passage. Focus on atmosphere and fan language.", 6),
      sb(
        "Build: 'El estadio estaba lleno. La afición cantaba. El ambiente era increíble.' (5 match-day sentences)",
        6,
      ),
      sp(
        "Describe the match day experience: travel, atmosphere, goal celebration, final whistle.",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Youth Player Development",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Coach a young player with encouragement and clear instruction",
    steps: [
      sc("In the module, practice youth coaching phrases.", 6),
      sb(
        "Build encouragement + instruction: 'Lo hiciste bien cuando [action]. Ahora trabaja en [improvement area].' (4 examples)",
        6,
      ),
      sp(
        "Coach a U-12 player: correct a skill, praise effort, give one instruction to take home.",
        8,
      ),
    ],
  },
  {
    n: 14,
    title: "Video Analysis Debrief",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Debrief a match using tactical video language",
    steps: [
      r("Read the match passage. Focus on position and movement vocabulary.", 7),
      pt(
        "Pattern: 'En el minuto [N], el [position] debería haber [action] en lugar de [what happened].' Build 3 corrections.",
        7,
      ),
      sp("Give a 90-second video review: two things done well, one tactical adjustment.", 6),
    ],
  },
  {
    n: 15,
    title: "Scouting & Recruitment",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Describe a player's profile to a technical director",
    steps: [
      wm(
        "Drill: técnica, velocidad, visión de juego, liderazgo, zurdo, diestro, físico, creativo. 8/8.",
        5,
      ),
      ds(
        "Role-play: present a scouting report to a coach. Strengths, weaknesses, fit for system.",
        10,
      ),
      sp(
        "Give a 60-second scouting report: position, age, strengths, one weakness, recommendation.",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Locker Room Culture",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Build team culture through direct locker room communication",
    steps: [
      r("Read the passage. Focus on team and leadership language.", 6),
      ds("Role-play: captain's speech before a big match. Unify, motivate, set standard.", 9),
      sp(
        "Give a captain's pre-match speech: team identity, what this match means, belief, collective effort.",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Set Pieces — Instructions",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Give set-piece instructions on the training ground",
    steps: [
      sc("In the module, practice set piece vocabulary.", 6),
      sb(
        "Build set-piece instructions: 'En el córner, el [player] hace el primer bloqueo. El [player] va al primer palo.' (3 examples)",
        7,
      ),
      sp("Walk through a corner kick set piece with 5 players. Name each role and movement.", 7),
    ],
  },
  {
    n: 18,
    title: "Nutrition & Recovery",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Discuss recovery protocols with a player",
    steps: [
      wm(
        "Drill: hidratación, proteína, carbohidrato, hielo, masaje, descanso, sueño, recuperación. 8/8.",
        5,
      ),
      ds(
        "Role-play: performance coach advising a player on post-match recovery. Nutritional plan + sleep.",
        10,
      ),
      sp(
        "Give a recovery plan: hydration, meal within 30 min, ice bath, sleep 8-9 hours, no alcohol.",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Player Discipline & Accountability",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Have a direct, respectful conversation with a player about discipline",
    steps: [
      r("Read the match passage. Focus on accountability and expectation language.", 6),
      ds("Role-play: a player was late to training twice. Have the conversation as a coach.", 9),
      sp(
        "Practice: 'Eres importante para el equipo. Pero esto no puede suceder. ¿Qué pasó y cómo lo vas a corregir?'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Club Structure & League System",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Explain club hierarchy and league structure",
    steps: [
      wm(
        "Drill: director técnico, plantilla, filial, academia, primera, segunda, ascenso, descenso. 8/8.",
        5,
      ),
      pt(
        "Pattern: 'El club tiene [N] equipos. El primero compite en [league]. El filial juega en [league].' Build 3.",
        7,
      ),
      sp("Explain your club structure from academy to first team in 60 seconds.", 8),
    ],
  },
  {
    n: 21,
    title: "Referee Communication",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Communicate with the referee professionally and effectively",
    steps: [
      sc("In the module, practice referee communication phrases.", 6),
      ds("Role-play: ask the referee for clarification on a call. Be firm but respectful.", 9),
      sp(
        "Practice: 'Permiso, ¿puede explicarme cuál fue la falta? Se lo agradezco.' (Professional protest, not arguing)",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Away Travel & Hotel Coordination",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Manage team logistics during an away trip",
    steps: [
      r("Read the passage. Focus on logistics vocabulary.", 6),
      sb(
        "Build: 'El bus sale a las [time]. Check-in a las [time]. Cena a las [time]. Luces apagadas a las [time].' (4 examples)",
        6,
      ),
      sp(
        "Give the travel briefing: departure, hotel rules, curfew, meal times, match-day wake-up.",
        8,
      ),
    ],
  },
  {
    n: 23,
    title: "Social Media & Branding Language",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Post about a match result and interact with fans in the target language",
    steps: [
      ds("Role-play: write a post-match social media post, then respond to 3 fan comments.", 9),
      pt(
        "Pattern: 'Gran victoria esta noche. Gracias por [fan support]. El siguiente partido es [match].' Build a post template.",
        5,
      ),
      sp(
        "Record a 30-second match reaction video in the target language. Natural, energetic, grateful.",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Goalkeeper-Specific Language",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Coach a goalkeeper using position-specific vocabulary",
    steps: [
      sc("In the module, drill goalkeeper vocabulary.", 7),
      sb(
        "Build goalkeeper coaching commands: 'Sal al balón. Cierra el ángulo. Comunica con la defensa. ¡Tuyo!' (6 commands)",
        6,
      ),
      sp(
        "Give a goalkeeper coaching session: footwork, command of the box, distribution, penalty save.",
        7,
      ),
    ],
  },
  {
    n: 25,
    title: "Sports Psychology",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Discuss mental performance with a player using psychology vocabulary",
    steps: [
      wm(
        "Drill: confianza, visualización, presión, enfoque, rutina, mentalidad, adversidad, resiliencia. 8/8.",
        5,
      ),
      ds(
        "Role-play: sports psychologist session with a player who lost confidence after a miss.",
        10,
      ),
      sp(
        "Teach 3 mental performance techniques: visualization, positive self-talk, pre-match routine.",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Training Session Design",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Design and explain a full training session to your staff",
    steps: [
      r("Read match passage. Focus on tactical and technical vocabulary.", 6),
      pt(
        "Pattern: 'La sesión de hoy tiene [N] partes: [part 1 — duration], [part 2 — duration], [part 3].' Build 2 full session plans.",
        8,
      ),
      sp(
        "Present a 90-minute session plan to your staff: objective, phases, drills, and expected outcomes.",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Coaching License Language",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Discuss coaching methodology and philosophy in the target language",
    steps: [
      ds(
        "Role-play: coaching interview for a new position. Explain your philosophy to the board.",
        10,
      ),
      pt(
        "Pattern: 'Mi filosofía de juego se basa en [principle]. Prefiero un estilo [adjective] porque [reason].' Build 3.",
        7,
      ),
      sp("Give a 90-second coaching philosophy statement. Clear, specific, authentic.", 3),
    ],
  },
  {
    n: 28,
    title: "Contract Negotiation Role-Play",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Negotiate a player's contract extension",
    steps: [
      wm(
        "Drill: renovación, cláusula, incentivo, bonificación, rescisión, plazo, opción, agente. 8/8.",
        5,
      ),
      ds(
        "Role-play: full contract extension negotiation between player's agent and sporting director.",
        10,
      ),
      sp(
        "Summarize the deal terms: 'Acordamos [contract length], salario de [amount], con [bonus conditions].'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "Post-Season Review",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Conduct a season debrief with the coaching staff",
    steps: [
      r("Read the match passage. Focus on season and performance language.", 5),
      ds(
        "Role-play: end-of-season review meeting. What worked, what didn't, squad needs for next season.",
        10,
      ),
      sp("Present a 90-second season summary: highs, lows, key metrics, squad priorities.", 5),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Pre-Game Team Talk",
    readingTemplate: "seed-{lang}-soccer-match",
    objective: "Deliver a complete pre-game team talk AND post-game debrief",
    steps: [
      sc("In the Soccer module, go through the complete advanced scenario.", 10),
      ds(
        "Role-play: full 5-minute pre-game talk (tactical + motivational) + 3-minute post-game debrief.",
        8,
      ),
      sp(
        "Deliver the pre-game talk from memory. This is your threshold — measure yourself against Lesson 1.",
        4,
      ),
    ],
  },
];

// ─── OR / EVS (English target — Spanish native) ───────────────────────────────

const OREVS_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Hello & Introductions",
    readingTemplate: "seed-en-coffee-shop-hello",
    objective: "Introduce yourself and greet coworkers in English",
    steps: [
      r("Read 'Coffee Shop Hello'. Every English sentence is what you need to say at work.", 8),
      ev("In the EVS module, practice the greeting phrases.", 6),
      sp("Practice: 'Hello, my name is ___. Nice to meet you. I work in [department].'", 6),
    ],
  },
  {
    n: 2,
    title: "Numbers, Days & Time",
    readingTemplate: "seed-en-numbers-and-days",
    objective: "Say any number, day, and time instantly in English",
    steps: [
      r("Read 'Numbers and Days'. Focus on how numbers and times are pronounced.", 7),
      wm("Drill numbers, days, months, times until all correct without hesitation.", 7),
      sp(
        "Answer fast: What time is it? What day is today? How many hours on your shift? — say it in English.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Asking for Help",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Ask a coworker or supervisor for help politely",
    steps: [
      r("Read 'Asking for Help'. Tap the request phrases.", 7),
      ev("In the EVS module, practice help request scenarios.", 7),
      sp(
        "Practice: 'Excuse me, can you help me? I don't understand. Can you show me? Thank you very much.'",
        6,
      ),
    ],
  },
  {
    n: 4,
    title: "Your Workplace — Rooms & Areas",
    readingTemplate: "seed-en-asking-directions",
    objective: "Name the key areas of the hospital you work in",
    steps: [
      r("Read 'Asking Directions'. Focus on location vocabulary.", 7),
      wm(
        "Drill: patient room, nurse station, supply room, elevator, loading dock, break room, exit. All correct.",
        6,
      ),
      sp(
        "Ask: 'Where is the supply room? How do I get to the 3rd floor? Is the break room on this floor?'",
        7,
      ),
    ],
  },
  {
    n: 5,
    title: "Tools & Equipment Names",
    readingTemplate: "seed-en-coffee-shop-hello",
    objective: "Name your 15 most-used cleaning tools in English",
    steps: [
      ev("In the EVS module, drill cleaning equipment vocabulary.", 8),
      wm(
        "Drill: mop, bucket, cart, vacuum, disinfectant, wipes, gloves, bags, broom, squeegee. 10/10.",
        5,
      ),
      sp(
        "Point to each tool and say its English name. Then say how you use it: 'I use the mop to clean the floor.'",
        7,
      ),
    ],
  },
  {
    n: 6,
    title: "Safety Warnings",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Understand and say safety warning phrases",
    steps: [
      r("Read 'Asking for Help'. Find any safety or caution language.", 6),
      ev("In the EVS module, practice safety vocabulary.", 7),
      sp(
        "Practice the 5 most important safety phrases: 'Wet floor. Do not enter. This room is on isolation. Careful — sharp. Call for help.'",
        7,
      ),
    ],
  },
  {
    n: 7,
    title: "Following Instructions",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Understand step-by-step instructions from a supervisor",
    steps: [
      r("Read the passage. Focus on instruction phrases.", 7),
      ld("In Listening Drill, practice hearing spoken English instructions.", 6),
      sp(
        "Repeat instructions back: 'So first I clean [room], then [room], then I report to [person]? — Is that right?'",
        7,
      ),
    ],
  },
  {
    n: 8,
    title: "Shift Communication",
    readingTemplate: "seed-en-daily-routine",
    objective: "Communicate with the incoming and outgoing shift",
    steps: [
      r("Read 'Daily Routine' passage.", 7),
      ev("In the EVS module, practice shift handoff phrases.", 7),
      sp(
        "Practice the shift handoff: 'I finished [rooms]. Room 214 still needs [task]. The supply cart is restocked.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Isolation Room Procedures",
    readingTemplate: "seed-en-doctors-office",
    objective: "Understand and follow isolation room language",
    steps: [
      r("Read 'Doctor's Office'. Find procedure and safety language.", 6),
      wm(
        "Drill: isolation, gown, gloves, mask, PPE, precautions, contact, airborne, droplet. All correct.",
        6,
      ),
      sp(
        "Read the isolation sign: 'Contact precautions. Put on gown and gloves before entering. Remove before leaving.'",
        8,
      ),
    ],
  },
  {
    n: 10,
    title: "Clean vs. Dirty — Contamination Language",
    readingTemplate: "seed-en-doctors-office",
    objective: "Communicate clearly about clean vs. contaminated areas",
    steps: [
      ev("In the EVS module, drill contamination and cleaning vocabulary.", 8),
      sb(
        "Build: '[Area] is clean. [Area] needs to be cleaned. I already cleaned [room]. [Room] is contaminated.' (4 examples)",
        5,
      ),
      sp(
        "Tell your supervisor: 'Room 302 is done. Room 304 has a spill — I need a biohazard bag.'",
        7,
      ),
    ],
  },
  {
    n: 11,
    title: "Trash & Disposal",
    readingTemplate: "seed-en-doctors-office",
    objective: "Explain trash categories and proper disposal",
    steps: [
      wm(
        "Drill: trash, biohazard, sharps, recycling, regular waste, bag, container, color-coded. All correct.",
        5,
      ),
      ev("In the module, practice disposal communication.", 7),
      sp(
        "Explain: 'Red bags are biohazard. Yellow is chemo waste. Regular trash is black bags. Sharps in the red box.'",
        8,
      ),
    ],
  },
  {
    n: 12,
    title: "Chemical Safety — MSDS/SDS",
    readingTemplate: "seed-en-doctors-office",
    objective: "Understand chemical labels and safety instructions",
    steps: [
      r("Read the doctor's office passage. Find chemical or cleaning product language.", 6),
      wm(
        "Drill: disinfectant, bleach, dilute, rinse, ventilate, gloves, chemical, splash, skin contact. All correct.",
        6,
      ),
      sp(
        "Explain safe use: 'Mix 1 part bleach to 10 parts water. Wear gloves. Ventilate the room. Don't mix bleach with ammonia.'",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Reporting a Problem",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Report a maintenance problem or safety issue in English",
    steps: [
      r("Read 'Asking for Help'. Find problem-reporting phrases.", 7),
      ds(
        "Role-play: report a broken toilet, leaking ceiling, or malfunctioning equipment to a supervisor.",
        9,
      ),
      sp(
        "Practice: 'Excuse me, there's a problem in room [number]. The [item] is broken/leaking. Can someone fix it?'",
        4,
      ),
    ],
  },
  {
    n: 14,
    title: "Working with Nursing Staff",
    readingTemplate: "seed-en-doctors-office",
    objective: "Communicate professionally with nursing staff",
    steps: [
      r("Read 'Doctor's Office'. Focus on nurse-patient-EVS interaction language.", 7),
      ev("In the module, practice nursing staff communication.", 7),
      sp(
        "Practice: 'I need to clean this room — is it okay to enter?' and 'The patient is in the hallway. Is it okay to clean now?'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Elevator & Transport Language",
    readingTemplate: "seed-en-asking-directions",
    objective: "Navigate the hospital and communicate about cart transport",
    steps: [
      r("Read 'Asking Directions'.", 7),
      sb(
        "Build: 'I need to take this cart to [floor/area]. Is the elevator free? Can you hold the door?' (4 examples)",
        6,
      ),
      sp(
        "Practice transport communication: requesting elevator, maneuvering in hallways, apologizing to patients.",
        7,
      ),
    ],
  },
  {
    n: 16,
    title: "Laundry & Linens",
    readingTemplate: "seed-en-coffee-shop-hello",
    objective: "Handle linen exchange communication",
    steps: [
      ev("In the EVS module, drill linen and laundry vocabulary.", 8),
      wm(
        "Drill: sheet, pillowcase, towel, blanket, soiled, clean, hamper, exchange, count. All correct.",
        5,
      ),
      sp(
        "Communicate the linen count: 'I have 12 soiled sheets and 6 towels. I need 14 clean sheets for this cart.'",
        7,
      ),
    ],
  },
  {
    n: 17,
    title: "Emergency Codes",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Understand and respond to hospital emergency codes",
    steps: [
      wm(
        "Drill: Code Blue, Code Red, Code Yellow, lockdown, evacuation, alert, respond, stay put. All correct.",
        5,
      ),
      ev("In the module, practice emergency code responses.", 7),
      sp(
        "Practice: 'There is a Code Red on floor 3. I need to leave the area. Where is the exit?' and 'Code Blue — I heard it. I am going to a safe location.'",
        8,
      ),
    ],
  },
  {
    n: 18,
    title: "Kitchen & Cafeteria Tasks",
    readingTemplate: "seed-en-coffee-shop-hello",
    objective: "Communicate in a hospital kitchen or cafeteria setting",
    steps: [
      r("Read 'Coffee Shop Hello'. Focus on food service vocabulary.", 7),
      sb(
        "Build: 'The [area] needs to be mopped. The tables are clean. Can you restock [item]?' (4 examples)",
        6,
      ),
      sp(
        "Practice a cafeteria conversation: greet, ask about restocking, report a spill, say goodbye to coworker.",
        7,
      ),
    ],
  },
  {
    n: 19,
    title: "Breaks & Scheduling",
    readingTemplate: "seed-en-daily-routine",
    objective: "Ask about your schedule and breaks in English",
    steps: [
      r("Read 'Daily Routine'.", 7),
      wm(
        "Drill: break, lunch, shift, schedule, overtime, clock in/out, supervisor, hours. All correct.",
        5,
      ),
      sp(
        "Ask about your schedule: 'What time is my break? When does my shift end? Can I work overtime this Friday?'",
        8,
      ),
    ],
  },
  {
    n: 20,
    title: "HR Basics — Paycheck & Benefits",
    readingTemplate: "seed-en-job-application",
    objective: "Understand your paycheck and ask HR questions",
    steps: [
      r("Read 'Job Application'. Focus on employment terms.", 7),
      wm(
        "Drill: paycheck, deduction, tax, insurance, benefits, direct deposit, W-2, raise. All correct.",
        5,
      ),
      sp(
        "Ask HR: 'I have a question about my paycheck. I think there is an error. Can I speak with someone?'",
        8,
      ),
    ],
  },
  {
    n: 21,
    title: "Giving Updates to a Supervisor",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Report your status clearly and professionally",
    steps: [
      r("Read 'Asking for Help'. Focus on status update language.", 6),
      ev("In the module, practice giving progress reports.", 7),
      sp(
        "Give your supervisor a status update: 'I finished floors 2 and 3. I am now on floor 4. I will be done in about 30 minutes.'",
        7,
      ),
    ],
  },
  {
    n: 22,
    title: "Asking for Clarification",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Politely ask someone to repeat or explain",
    steps: [
      r("Read 'Asking for Help'. Find clarification phrases.", 7),
      sb(
        "Build: 'I'm sorry, I didn't understand. Can you say that again? Can you speak more slowly? Can you write that down?' (4 variations)",
        6,
      ),
      sp(
        "Practice: someone gives you fast instructions. Ask for clarification, check you understood, thank them.",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Being Friendly with Patients",
    readingTemplate: "seed-en-doctors-office",
    objective: "Speak kindly to patients while working in their room",
    steps: [
      r("Read 'Doctor's Office'. Focus on patient interaction language.", 7),
      ev("In the module, practice patient-facing phrases.", 7),
      sp(
        "Practice: 'Good morning. I'm here to clean your room. Is it okay if I start? I'll be finished soon. Sorry for the interruption.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Team Meetings in English",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Understand and participate in a team meeting",
    steps: [
      r("Read 'Job Interview Basics'. Focus on workplace meeting language.", 7),
      ld("In Listening Drill, practice hearing spoken English at normal speed.", 6),
      sp(
        "Practice contributing to a meeting: 'I have a question. In my area, there is a problem with [issue]. What should I do?'",
        7,
      ),
    ],
  },
  {
    n: 25,
    title: "Performance Review Language",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Understand a performance review and respond professionally",
    steps: [
      r("Read 'Job Interview Basics'. Focus on evaluation language.", 7),
      ds(
        "Role-play: supervisor gives a mixed review. Respond professionally — accept feedback, ask what to improve.",
        9,
      ),
      sp(
        "Practice: 'Thank you for the feedback. I will work on [area]. Can you help me understand what I need to do better?'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Asking for a Raise",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Request a raise professionally",
    steps: [
      r("Read 'Job Interview Basics'. Focus on negotiation phrases.", 6),
      ds(
        "Role-play: meeting with your supervisor to request a raise. Explain your contributions.",
        10,
      ),
      sp(
        "Practice: 'I have been here 2 years. I always arrive on time. I would like to discuss my salary.'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Training a New Coworker",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Train a new English-speaking coworker on your tasks",
    steps: [
      ev("In the module, practice training instruction vocabulary.", 7),
      sb("Build step-by-step instructions for cleaning a patient room. 5 English steps.", 7),
      sp(
        "Walk a new coworker through room cleaning: 'First, put on gloves. Then start with the bathroom. Then wipe all surfaces. Finally, mop the floor.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Workplace Culture & Respect",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss workplace expectations and respect",
    steps: [
      r("Read 'Job Interview Basics'. Focus on professional conduct language.", 6),
      ds(
        "Role-play: a coworker is being disrespectful. You address it professionally in English.",
        10,
      ),
      sp(
        "Practice: 'Excuse me, I would like to talk to you. I felt uncomfortable when you [action]. I would appreciate if you [request].'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Emergency Communication Practice",
    readingTemplate: "seed-en-asking-for-help",
    objective: "Handle any emergency communication in English",
    steps: [
      ev("In the EVS module, practice all emergency and critical vocabulary.", 8),
      ds(
        "Role-play 3 emergencies: a patient falls, a fire alarm, a coworker is injured. Handle each in English.",
        8,
      ),
      sp(
        "Practice calling for help: 'Help! A patient fell in room 212! I need a nurse right now!' Then stay calm and guide others.",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Shift Without Spanish",
    readingTemplate: "seed-en-coffee-shop-hello",
    objective: "Complete an entire shift's communication entirely in English",
    steps: [
      ev("In the EVS module, go through the complete advanced simulation.", 10),
      ds(
        "Role-play: full shift — greeting coworkers, receiving instructions, reporting status, handling a problem, ending shift. English only.",
        8,
      ),
      sp(
        "Record a shift summary in English: what you cleaned, problems you found, questions you have. No Spanish.",
        4,
      ),
    ],
  },
];

// ─── Aggregate ────────────────────────────────────────────────────────────────

// ─── Sport Fishing ────────────────────────────────────────────────────────────

const FISHING_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "First Morning at the Dock",
    objective:
      "Greet your captain and crew, ask about the plan for the day, and confirm departure time.",
    steps: [
      wm(
        "Match: buenos días / buen día, capitán, marinero, ¿a qué hora salimos?, esta mañana. Focus on greeting vocabulary.",
        5,
      ),
      sp(
        "Role-play arriving at the dock. Greet the captain by name, ask what time you leave, and ask what you're targeting today.",
        6,
      ),
      fi(
        "Open the Fishing module → On the Boat tab. Read through the morning departure phrases. Say each one aloud.",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Strike! The Fish is On",
    objective:
      "Understand and react to the captain's strike commands — ¡Ahí va!, ¡Pégale!, ¡Dale dale!, ¡Suéltalo!",
    steps: [
      wm(
        "Match: ¡Ahí va!, ¡Pégale!, ¡Dale dale!, ¡Suéltalo!, ¡Cuidado con la línea! Time yourself — under 10 seconds.",
        5,
      ),
      fi(
        "Open the Fishing module → On the Boat tab. Read all 11 commands. Say the captain call, then the translation, out loud.",
        7,
      ),
      sp(
        "Role-play a marlin strike from start to landing. Captain calls commands in Spanish — you react and describe the fight.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Species Names — What Did We Catch?",
    objective:
      "Name the 10 target species in Spanish: roosterfish, marlin, sailfish, dorado, tuna, wahoo, jack, snapper, sierra, striped marlin.",
    steps: [
      wm(
        "Match 10 species: pez gallo, marlín azul, pez vela, dorado, atún, wahoo/peto, jurel, pargo, sierra, marlín rayado. Under 60 seconds.",
        5,
      ),
      fi(
        "Open Fishing module → Species tab. Read every entry. Focus on how the name connects to the fish's physical description.",
        6,
      ),
      sp(
        "Your captain holds up a fish. You name it in Spanish and describe one physical feature. Cycle through all 10.",
        6,
      ),
    ],
  },
  {
    n: 4,
    title: "Reading the Water",
    objective:
      "Understand what captains are looking for — birds, current, color breaks, and bait schools.",
    steps: [
      wm(
        "Match: los pájaros, la corriente, agua azul, agua verde, el sargazo, las gaviotas, el fondo, la marea. Focus on environmental vocabulary.",
        5,
      ),
      sp(
        "Describe what you see on the water to your captain — birds diving, a weed line, a color break — in Spanish.",
        6,
      ),
      fi(
        "Open Fishing module → Culture tab. Read 'Los pájaros' and 'Agua azul vs. agua verde' entries in full.",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "The Tip — La Propina",
    objective:
      "Understand the tipping culture, learn the vocabulary, and practice the end-of-day exchange.",
    steps: [
      fi(
        "Open Fishing module → Culture tab. Read 'La propina — The Tip as Livelihood' and 'El Panga and Its Crew'. These are not optional vocabulary items — they are cultural obligations.",
        6,
      ),
      sp(
        "Role-play the end of a full fishing day. Thank the captain and mate in Spanish, tip them with a handshake, and name the best moment of the trip.",
        7,
      ),
      wm(
        "Match: la propina, el capitán, el marinero, muchas gracias, fue increíble, excelente trabajo. Warm down.",
        4,
      ),
    ],
  },
  {
    n: 6,
    title: "Fly Fishing the Flats",
    objective:
      "Learn fly fishing-specific commands and vocabulary — cast direction, strip, set the hook, sight fishing.",
    steps: [
      wm(
        "Match: la mosca, el lance, la recuperación, la vista, las aguas claras, el pez gallo, la caña de mosca, el carrete. Under 45 seconds.",
        5,
      ),
      sp(
        "Your guide is sight-casting to a roosterfish. He calls direction changes and tells you when to cast and strip. Role-play the full sequence in Spanish.",
        7,
      ),
      fi(
        "Open Fishing module → On the Boat tab. Focus on directional commands: a la derecha, a la izquierda, ¡Pégale!, ¡Suéltalo!",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Conservation — Suéltalo",
    objective:
      "Understand catch-and-release vocabulary and the cultural ethic around conservation on the East Cape.",
    steps: [
      fi(
        "Open Fishing module → Culture tab. Read 'Suéltalo — The Release Ethic' and 'Cabo Pulmo' entries fully.",
        6,
      ),
      sp(
        "Your captain signals to release a marlin. Describe the release — keeping it in the water, removing the hook, reviving the fish — all in Spanish.",
        6,
      ),
      wm(
        "Match: suéltalo, la reserva marina, la captura y liberación, el pez vela, el marlín, Cabo Pulmo, la recuperación.",
        4,
      ),
    ],
  },
  {
    n: 8,
    title: "At the Dock and Marina",
    objective:
      "Navigate the marina — asking questions, discussing the catch, buying ice and supplies.",
    steps: [
      wm(
        "Match: el muelle, la marina, el hielo, la carnada, el combustible, ¿cuánto cuesta?, la hielera, el pesaje.",
        5,
      ),
      fi("Open Fishing module → At the Dock tab. Read all six phrases. Say each one twice.", 6),
      sp(
        "You've returned to the marina with a cooler full of dorado and tuna. Describe the day to another angler at the dock in Spanish.",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Offshore Conditions and Safety",
    objective:
      "Communicate about sea state, weather, and safety — including roughing it in beam seas.",
    steps: [
      wm(
        "Match: el oleaje, las olas, el viento, el mareo, el chaleco salvavidas, ¿está bien?, no me siento bien, necesito agua.",
        5,
      ),
      sp(
        "The sea is building on the return crossing. You're feeling queasy. Communicate with your captain about the conditions and your state — all in Spanish.",
        6,
      ),
      fi(
        "Open Fishing module → On the Boat tab. Review safety-adjacent commands: watch the line, let it run, to the right/left.",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "The Full Day — Threshold",
    objective:
      "String together a complete fishing day in Spanish — from dock greeting to final tip — with no English.",
    steps: [
      fi(
        "Open Fishing module. Review all five sub-tabs from start to finish. Say each phrase aloud. Prepare for the full simulation.",
        8,
      ),
      sp(
        "Full fishing day simulation: dock greeting, departure, first strike, fight, species identification, release or keep decision, lunch conversation, return, dock arrival, final tip and farewell. Stay in Spanish.",
        10,
      ),
      wm(
        "Final warm-down: match 20 random items from species, boat commands, and dock phrases combined. Beat your Lesson 1 score.",
        5,
      ),
    ],
  },
];

export const CURRICULA: Record<string, ModuleCurriculum> = {
  "lds-missionary": {
    moduleId: "lds-missionary",
    headline: "The Missionary Core 30",
    threshold:
      "By Lesson 30, you can teach Lesson 1 (La Restauración) in your target language from start to finish — greeting, teaching points, concerns, baptismal commitment, and testimony.",
    lessons: MISSIONARY_LESSONS,
  },
  orthopedics: {
    moduleId: "orthopedics",
    headline: "The Clinical Core 30",
    threshold:
      "By Lesson 30, you can complete a full orthopedic patient intake and treatment discussion — greeting, chief complaint, exam, diagnosis, plan, consent, and discharge — without switching languages.",
    lessons: ORTHO_LESSONS,
  },
  "construction-foreman": {
    moduleId: "construction-foreman",
    headline: "The Foreman Core 30",
    threshold:
      "By Lesson 30, you can run a complete morning safety meeting and task assignment in your target language — roll call, safety brief, work assignments, questions, and closeout.",
    lessons: CONSTRUCTION_LESSONS,
  },
  framer: {
    moduleId: "framer",
    headline: "The Framer Core 30",
    threshold:
      "By Lesson 30, you can run a complete morning safety meeting and task assignment in your target language.",
    lessons: CONSTRUCTION_LESSONS,
  },
  soccer: {
    moduleId: "soccer",
    headline: "The Soccer Core 30",
    threshold:
      "By Lesson 30, you can deliver a complete pre-game team talk and post-game debrief in your target language — tactical plan, motivation, corrections, and player praise.",
    lessons: SOCCER_LESSONS,
  },
  "or-evs": {
    moduleId: "or-evs",
    headline: "The EVS Core 30",
    threshold:
      "By Lesson 30, you can complete an entire hospital shift's communication — greetings, instructions, reporting, emergencies, and coworker coordination — entirely in English.",
    lessons: OREVS_LESSONS,
  },
  "sport-fishing": {
    moduleId: "sport-fishing",
    headline: "The Angler's Core 10",
    threshold:
      "By Lesson 10, you can run a complete day of fishing in Spanish — dock greeting, strike commands, species identification, conservation decisions, and a proper tip and farewell to your captain and crew.",
    lessons: FISHING_LESSONS,
  },
};

// Merge extended curricula — import is at bottom to avoid circular init issues
import { EXTENDED_CURRICULA } from "./curriculum-extended.ts";
Object.assign(CURRICULA, EXTENDED_CURRICULA);

export function getCurriculum(moduleId: string): ModuleCurriculum | null {
  return CURRICULA[moduleId] ?? null;
}

export function getCurrentLesson(
  moduleId: string,
  lessonProgress: Record<string, number>,
): Lesson | null {
  const curriculum = getCurriculum(moduleId);
  if (!curriculum) return null;
  const completed = lessonProgress[moduleId] ?? 0;
  if (completed >= curriculum.lessons.length) return null; // all done
  return curriculum.lessons[completed] ?? null;
}
