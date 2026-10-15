import type { CognateRule } from "../cognate-patterns.ts";
import { cognateRule } from "./helpers.ts";

// Cognate rules whose TARGET language is Pashto, for learners who already know English.
// English and Pashto share almost no inherited cognates, so the bridge is English words
// borrowed into everyday Pashto (often via Urdu, Persian or Dari) and written in Pashto's
// Perso-Arabic script. Transliterations are simple Latin approximations of the spoken
// word. Pashto spelling is not fully standardised, so each rule says where forms vary.
// Every `from`/`to` is a descriptive "~" pattern (tests skip those) with an explicit id.

const ps = (o: Omit<Parameters<typeof cognateRule>[0], "target" | "source">) =>
  cognateRule({ ...o, target: "Pashto", source: "English" });

const EN_TO_PS: CognateRule[] = [
  ps({
    id: "tech-devices",
    frequency: "ultra",
    from: "~English technology and media words",
    to: "~the same word respelled in Pashto script",
    name: "Technology and media words",
    reliability: 90,
    hook: "Modern devices keep their English names: say 'television' or 'computer' with Pashto sounds and people understand. Read the letters to see the English hidden in the script.",
    examples: [
      ["television", "ټلويزيون (televizyon)", "television"],
      ["telephone", "ټيليفون (telefon)", "telephone"],
      ["computer", "کمپيوټر (kompyutar)", "computer"],
      ["mobile phone", "موبايل (mobail)", "mobile phone"],
      ["internet", "انټرنيټ (intarnet)", "internet"],
      ["video", "ويډيو (vidyo)", "video"],
    ],
    watchOut:
      "Spelling varies between writers: ټيليفون is also written ټلفون, and the vowels in loanwords shift by region. The spoken word is the safer guide.",
  }),
  ps({
    id: "transport",
    frequency: "ultra",
    from: "~English vehicle and fuel words",
    to: "~the same word respelled in Pashto script",
    name: "Vehicles, transport and fuel",
    reliability: 90,
    hook: "Everyday transport words are English: bus, taxi, truck. Motor (car) became موټر, the standard Pashto word for a car.",
    examples: [
      ["motor car", "موټر (motar)", "car, motor vehicle"],
      ["bus", "بس (bas)", "bus"],
      ["taxi", "ټيکسي (teksi)", "taxi"],
      ["truck", "ټرک (trak)", "truck"],
      ["cycle / bicycle", "سايکل (saaykal)", "bicycle"],
      ["petrol", "پټرول (patrol)", "petrol, gasoline"],
    ],
    watchOut:
      "موټر comes from 'motor', not 'car', so it is the word for any motor vehicle. Do not look for a Pashto word that sounds like 'car'.",
  }),
  ps({
    id: "travel",
    frequency: "high",
    from: "~English travel and hospitality words",
    to: "~the same word respelled in Pashto script",
    name: "Travel and hospitality",
    reliability: 85,
    hook: "At the border, the hotel and the ticket office, the key words are English: passport, visa, hotel, ticket.",
    examples: [
      ["hotel", "هوټل (hotal)", "hotel"],
      ["passport", "پاسپورټ (paaspoort)", "passport"],
      ["visa", "ويزه (viza)", "visa"],
      ["ticket", "ټيکټ (tikat)", "ticket"],
      ["restaurant", "ريسټورانټ (restorant)", "restaurant"],
    ],
    watchOut:
      "Restaurant has several spellings (ريسټورانټ, رستورانت, ريسټورنټ). Visa often ends in the feminine -ه (ويزه), which is silent-ish: say 'viza'.",
  }),
  ps({
    id: "health",
    frequency: "high",
    from: "~English medical words",
    to: "~the same word respelled in Pashto script",
    name: "Health and medicine",
    reliability: 85,
    hook: "Medical places and tools often use English: doctor, nurse, hospital, clinic, injection, x-ray.",
    examples: [
      ["doctor", "ډاکټر (daaktar)", "doctor"],
      ["nurse", "نرس (nars)", "nurse"],
      ["hospital", "اسپتال (aspatal)", "hospital"],
      ["clinic", "کلينيک (klinik)", "clinic"],
      ["injection", "انجکشن (injekshan)", "injection"],
    ],
    watchOut:
      "Native alternatives exist (for example پيچکاري for an injection), but the English loan is very common in speech. Hospital loses its initial h: اسپتال.",
  }),
  ps({
    id: "er-or-professions",
    frequency: "high",
    from: "~English -er / -or / -eer job words",
    to: "~-ر (r) at the end of the Pashto word",
    name: "Job titles ending in -r",
    reliability: 80,
    hook: "English job words in -or, -er and -eer end in the letter ر (r) in Pashto. Doctor is ډاکټر, engineer is انجنير. Each is copied whole, so you do not build new jobs with a suffix.",
    examples: [
      ["doctor", "ډاکټر (daaktar)", "doctor"],
      ["engineer", "انجنير (enjiniir)", "engineer"],
      ["professor", "پروفيسر (profesar)", "professor"],
      ["driver", "ډرايور (drayvar)", "driver"],
    ],
    watchOut:
      "Pashto is not building these from a suffix; each job word was borrowed as a whole. Do not invent new ones by adding ر. Vowel spellings vary (ډرايور / ډريور).",
  }),
  ps({
    id: "ist-ist",
    frequency: "medium",
    from: "~English -ist (person who does or believes)",
    to: "~-يست (-ist), spelled as in English",
    name: "People in -ist",
    reliability: 80,
    hook: "English -ist keeps its sound and is written -يست in Pashto: tourist becomes ټوريست, journalist becomes ژورناليست.",
    examples: [
      ["tourist", "ټوريست (turist)", "tourist"],
      ["journalist", "ژورناليست (zhurnalist)", "journalist"],
      ["communist", "کمونيست (komunist)", "communist"],
      ["artist", "آرټيست (aartist)", "artist (film or stage)"],
    ],
    watchOut:
      "Many of these entered through Persian or Russian-influenced Dari, so the vowels can differ from English (ژورناليست has a 'zh' sound at the start).",
  }),
  ps({
    id: "business-government",
    frequency: "high",
    from: "~English office, finance and government words",
    to: "~the same word respelled in Pashto script",
    name: "Business, offices and government",
    reliability: 85,
    hook: "Words for institutions and projects are mostly English: bank, program, project, company, system, police.",
    examples: [
      ["bank", "بانک (baank)", "bank"],
      ["project", "پروژه (proje)", "project"],
      ["program", "پروګرام (program)", "program, programme"],
      ["company", "کمپني (kampani)", "company"],
      ["system", "سيستم (sistam)", "system"],
      ["police", "پوليس (polis)", "police"],
    ],
    watchOut:
      "پروژه ends in -ژه (zh + silent a), a Persian-style respelling of 'project'. پروګرام uses ګ (g), the Pashto letter, not the Persian گ.",
  }),
  ps({
    id: "school",
    frequency: "medium",
    from: "~English school and study words",
    to: "~the same word respelled in Pashto script",
    name: "School and study",
    reliability: 80,
    hook: "Student life uses English: class, college, diploma, semester, pencil. A learner who knows these can read a school notice.",
    examples: [
      ["class", "کلاس (klaas)", "class, classroom"],
      ["college", "کاليج (kaalij)", "college"],
      ["diploma", "ډيپلوم (diploom)", "diploma"],
      ["semester", "سمستر (semestar)", "semester"],
      ["pencil", "پنسل (pensil)", "pencil"],
    ],
    watchOut:
      "کلاس and کاليج may reach Pashto through Persian, Urdu or English; the form is the same. The usual word for a university is the native پوهنتون, not an English loan.",
  }),
  ps({
    id: "sport",
    frequency: "medium",
    from: "~English sport words",
    to: "~the same word respelled in Pashto script",
    name: "Sport",
    reliability: 85,
    hook: "Sport vocabulary is borrowed: football, cricket, volleyball, team, goal. Cricket especially is hugely popular in Afghanistan and Pakistan.",
    examples: [
      ["football", "فوټبال (footbaal)", "football (soccer)"],
      ["cricket", "کرکټ (kriket)", "cricket"],
      ["volleyball", "والي بال (volibaal)", "volleyball"],
      ["team", "ټيم (tim)", "team"],
      ["goal", "ګول (gol)", "goal"],
    ],
    watchOut: "والي بال is often written with a space, and sometimes as one word.",
  }),
  ps({
    id: "t-d-retroflex",
    frequency: "ultra",
    from: "~English t and d at the start or middle of a word",
    to: "~ټ (retroflex t) and ډ (retroflex d)",
    name: "English t and d become ټ and ډ",
    reliability: 85,
    hook: "Pashto hears English t and d as its retroflex letters ټ and ډ (tongue curled back), so ticket is ټيکټ and doctor is ډاکټر. Once you know this, you can spell and recognise many loans.",
    examples: [
      ["taxi", "ټيکسي (teksi)", "taxi"],
      ["truck", "ټرک (trak)", "truck"],
      ["ticket", "ټيکټ (tikat)", "ticket"],
      ["doctor", "ډاکټر (daaktar)", "doctor"],
      ["driver", "ډرايور (drayvar)", "driver"],
      ["diploma", "ډيپلوم (diploom)", "diploma"],
      ["diesel", "ډيزل (dizal)", "diesel"],
    ],
    watchOut:
      "This is a spelling habit, not a law: some loans use plain ت and د (for example سيستم 'system', ستيشن 'station').",
  }),
];

export const PASHTO_COGNATE_RULES: CognateRule[] = [...EN_TO_PS];
