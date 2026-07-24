// All pre-built library seed data — loaded lazily via dynamic import() in LibraryProvider.
// Keeping this module separate from library-state.tsx lets Vite split it into its own chunk,
// reducing the main bundle by ~600–800 kB.

import type { LibraryEntry, BookChapter } from "@/state/library-state";
import { LIBRARY as PRELOADED } from "@/data/library";
import type { SentencePair } from "@/data/library";
import { PREACH_MY_GOSPEL_CHAPTERS } from "@/data/preach-my-gospel";
import { PREACH_MY_GOSPEL_I18N } from "@/data/preach-my-gospel-i18n";
import { FAITH_SEEDS } from "@/data/library-seeds/faith-seeds";
import { MEDICAL_A_SEEDS } from "@/data/library-seeds/medical-a-seeds";
import { MEDICAL_B_SEEDS } from "@/data/library-seeds/medical-b-seeds";
import { TRADES_SEEDS } from "@/data/library-seeds/trades-seeds";
import { TRANSPORT_AGRI_SEEDS } from "@/data/library-seeds/transport-agri-seeds";
import { SERVICE_EDU_SEEDS } from "@/data/library-seeds/service-edu-seeds";
import { SPORTS_A_SEEDS } from "@/data/library-seeds/sports-a-seeds";
import { SPORTS_B_TRAVEL_SEEDS } from "@/data/library-seeds/sports-b-travel-seeds";
import { SPORTS_NUTRITION_A_SEEDS } from "@/data/library-seeds/sports-nutrition-a-seeds";
import { SPORTS_NUTRITION_B_SEEDS } from "@/data/library-seeds/sports-nutrition-b-seeds";
import { SPORTS_NUTRITION_C_SEEDS } from "@/data/library-seeds/sports-nutrition-c-seeds";
import { ENGLISH_TARGET_SEEDS } from "@/data/library-seeds/english-target-seeds";
import { TECHNOLOGY_SEEDS } from "@/data/library-seeds/technology-seeds";
import { COOKING_FOOD_SEEDS } from "@/data/library-seeds/cooking-food-seeds";
import { FINANCE_BUSINESS_SEEDS } from "@/data/library-seeds/finance-business-seeds";
import { KOREAN_MODULE_SEEDS } from "@/data/library-seeds/korean-module-seeds";
import { NEW_MODULES_SEEDS } from "@/data/library-seeds/new-modules-seeds";
import { PASHTO_SEEDS } from "@/data/library-seeds/pashto-seeds";
import { ITALIAN_EXPANSION_SEEDS } from "@/data/library-seeds/italian-expansion-seeds";

// Suppress unused-type warnings for types used only in inline object literals below
type _BookChapter = BookChapter;
type _SentencePair = SentencePair;

const CLASSIC_STUBS: LibraryEntry[] = [
  {
    id: "classic-quixote",
    title: "Don Quixote — Ch. 1",
    subtitle: "Miguel de Cervantes",
    language: "Spanish",
    targetLabel: "Español",
    level: "C2",
    sentences: PRELOADED[0].sentences,
    section: "classic",
    flag: "🇪🇸",
    available: true,
  },
  {
    id: "classic-petit-prince",
    title: "Le Petit Prince",
    subtitle: "Antoine de Saint-Exupéry",
    language: "French",
    targetLabel: "Français",
    level: "B1",
    sentences: [],
    section: "classic",
    flag: "🇫🇷",
    available: false,
  },
  {
    id: "classic-verwandlung",
    title: "Die Verwandlung",
    subtitle: "Franz Kafka",
    language: "German",
    targetLabel: "Deutsch",
    level: "C1",
    sentences: [],
    section: "classic",
    flag: "🇩🇪",
    available: false,
  },
  {
    id: "classic-pinocchio",
    title: "Le avventure di Pinocchio",
    subtitle: "Carlo Collodi",
    language: "Italian",
    targetLabel: "Italiano",
    level: "B2",
    sentences: [],
    section: "classic",
    flag: "🇮🇹",
    available: false,
  },
];

const CULTURE_SEED: LibraryEntry = {
  id: "culture-espana-seed",
  title: "Culture: España",
  subtitle: "A short cultural reading",
  language: "Spanish",
  targetLabel: "Español",
  level: "B1",
  sentences: PRELOADED[1].sentences,
  section: "culture",
  flag: "🇪🇸",
  available: true,
};

const CULTURE_EXTRA: LibraryEntry[] = [
  {
    id: "culture-it-piccolo-principe",
    title: "Il Piccolo Principe — Capitolo I",
    subtitle: "Antoine de Saint-Exupéry (trad. italiana)",
    language: "Italian",
    targetLabel: "Italiano",
    level: "B1",
    section: "culture",
    flag: "🇮🇹",
    available: true,
    sentences: [
      {
        en: "Once when I was six years old I saw a magnificent picture in a book about the primeval forest, called 'True Stories from Nature.'",
        target:
          "Una volta, quando avevo sei anni, vidi un magnifico disegno in un libro sulla foresta vergine che si chiamava «Storie Vissute della Natura».",
      },
      {
        en: "It showed a boa constrictor in the act of swallowing an animal.",
        target: "Rappresentava un serpente boa nell'atto di inghiottire un animale.",
      },
      {
        en: "I pondered deeply, then, over the adventures of the jungle, and after some work with a coloured pencil I succeeded in making my first drawing.",
        target:
          "Riflettei a lungo sulle avventure della giungla e a mia volta riuscii a tracciare, con una matita colorata, il mio primo disegno.",
      },
      {
        en: "I showed my masterpiece to the grown-ups, and asked them whether the drawing frightened them.",
        target:
          "Mostrai il mio capolavoro alle persone grandi e chiesi loro se il disegno faceva paura.",
      },
      {
        en: "They answered: 'Frighten? Why should anyone be frightened by a hat?'",
        target: "Mi risposero: «Paura? Perché mai uno dovrebbe avere paura di un cappello?».",
      },
      {
        en: "My drawing was not a picture of a hat. It was a picture of a boa constrictor digesting an elephant.",
        target:
          "Il mio disegno non era il disegno di un cappello. Era il disegno di un boa che digeriva un elefante.",
      },
    ],
  },
  {
    id: "culture-it-calvino-marcovaldo",
    title: "Marcovaldo — Funghi in città",
    subtitle: "Italo Calvino",
    language: "Italian",
    targetLabel: "Italiano",
    level: "B2",
    section: "culture",
    flag: "🇮🇹",
    available: true,
    sentences: [
      {
        en: "The wind, coming to the city from far away, brings it unusual gifts, noticed only by a few sensitive souls, like sufferers from hay fever.",
        target:
          "Il vento, venendo in città da lontano, le porta doni inconsueti, di cui s'accorgono solo poche anime sensibili, come gli allergici ai pollini.",
      },
      {
        en: "One day, on the strip of grass at a tram stop, Marcovaldo's eye fell on something strange.",
        target:
          "Un giorno, sulla striscia d'aiola d'un corso cittadino, dove finiva la linea d'un tram, Marcovaldo vide, scendendo dal tram, qualcosa di strano.",
      },
      {
        en: "Mushrooms — real mushrooms — were sprouting right there at the heart of the city.",
        target: "Dei funghi, veri funghi, stavano spuntando proprio lì, nel cuore della città.",
      },
      {
        en: "It seemed to Marcovaldo that the grey, wretched world surrounding him had suddenly become generous with hidden riches.",
        target:
          "A Marcovaldo parve che il mondo grigio e misero che lo circondava diventasse a un tratto generoso di ricchezze nascoste.",
      },
      {
        en: "He returned home with a basket full and the look of a man who has discovered a treasure that the city had reserved only for him.",
        target:
          "Tornò a casa con la cesta colma e l'aria di chi ha scoperto un tesoro che la città aveva riservato soltanto per lui.",
      },
    ],
  },
  {
    id: "culture-ja-tsuru-no-ongaeshi",
    title: "鶴の恩返し — The Crane's Return of a Favor",
    subtitle: "Japanese folk tale",
    language: "Japanese",
    targetLabel: "日本語",
    level: "B1",
    section: "culture",
    flag: "🇯🇵",
    available: true,
    sentences: [
      {
        en: "Long, long ago, in a small village, there lived a kind old man and his wife.",
        target: "むかしむかし、ある小さな村に、心の優しいおじいさんとおばあさんが住んでいました。",
      },
      {
        en: "One snowy day, the old man found a crane caught in a trap and quietly set it free.",
        target:
          "ある雪の降る日、おじいさんは罠にかかった一羽の鶴を見つけ、そっと逃がしてあげました。",
      },
      {
        en: "That night, a young woman knocked on the door and asked to stay until the storm passed.",
        target: "その夜、一人の若い娘が戸を叩き、嵐が過ぎるまで泊めてほしいと頼みました。",
      },
      {
        en: "She wove a beautiful cloth in a closed room, asking only that no one peek inside.",
        target:
          "娘は閉めきった部屋で美しい布を織り、「決して中をのぞかないでください」とだけ頼みました。",
      },
      {
        en: "Unable to resist, the old woman peeked, and saw a crane plucking its own feathers to weave.",
        target:
          "我慢できなくなったおばあさんがのぞくと、一羽の鶴が自分の羽を抜いて布を織っていました。",
      },
      {
        en: "Discovered, the crane bowed once and flew silently into the snowy sky, never to return.",
        target:
          "見られてしまった鶴は、一度お辞儀をして、雪の空へと静かに飛び去り、二度と戻りませんでした。",
      },
    ],
  },
  {
    id: "culture-ja-murakami-kaze",
    title: "風の歌を聴け — In the Style of Murakami",
    subtitle: "Inspired by Haruki Murakami",
    language: "Japanese",
    targetLabel: "日本語",
    level: "C1",
    section: "culture",
    flag: "🇯🇵",
    available: true,
    sentences: [
      {
        en: "There is no such thing as perfect writing, just as there is no such thing as perfect despair.",
        target: "完璧な文章などといったものは存在しない。完璧な絶望が存在しないようにね。",
      },
      {
        en: "On a quiet afternoon, I sat at the counter of a small bar and listened to an old jazz record.",
        target:
          "静かな午後、僕は小さなバーのカウンターに座り、古いジャズのレコードに耳を澄ませていた。",
      },
      {
        en: "The bartender wiped a glass without saying a word, as if time itself had been politely asked to wait.",
        target:
          "バーテンダーは何も言わずにグラスを拭いていた。まるで時間そのものに「少し待ってくれ」と頼んだみたいに。",
      },
      {
        en: "Outside the window, a thin rain was falling, and somewhere a cat was crying.",
        target: "窓の外では細い雨が降っていて、どこかで猫が鳴いていた。",
      },
      {
        en: "I thought about her — about the way she used to laugh, and about the things I had never managed to say.",
        target:
          "僕は彼女のことを考えていた。あの笑い方のこと、そして、ついに言えなかった言葉のことを。",
      },
      {
        en: "The wind passed through the street, carrying away the smell of rain and a small piece of my heart.",
        target:
          "風が通りを抜けていき、雨のにおいと、僕の心のほんの小さなかけらを連れ去っていった。",
      },
    ],
  },
  {
    id: "culture-ko-heungbu-nolbu",
    title: "흥부와 놀부 — Heungbu and Nolbu",
    subtitle: "Korean folk tale",
    language: "Korean",
    targetLabel: "한국어",
    level: "B1",
    section: "culture",
    flag: "🇰🇷",
    available: true,
    sentences: [
      {
        en: "Long, long ago there lived two brothers, Nolbu the elder and Heungbu the younger.",
        target: "옛날 옛적에 놀부라는 형과 흥부라는 동생, 두 형제가 살고 있었습니다.",
      },
      {
        en: "Nolbu was greedy and cruel, but Heungbu was kind and gentle to everyone.",
        target:
          "놀부는 욕심이 많고 마음씨가 사나웠지만, 흥부는 누구에게나 친절하고 마음씨가 고왔습니다.",
      },
      {
        en: "When their father died, Nolbu took all the wealth and drove Heungbu out of the house.",
        target: "아버지가 돌아가시자, 놀부는 모든 재산을 차지하고 흥부를 집에서 쫓아냈습니다.",
      },
      {
        en: "One spring day, Heungbu mended the broken leg of a swallow with great care.",
        target: "어느 봄날, 흥부는 다리가 부러진 제비를 정성껏 치료해 주었습니다.",
      },
      {
        en: "The next year the swallow returned and dropped a single gourd seed at his door.",
        target: "다음 해 봄, 제비가 돌아와 흥부의 집 앞에 박씨 하나를 떨어뜨렸습니다.",
      },
      {
        en: "From the gourds that grew, gold and treasures poured out, and Heungbu became rich.",
        target: "그 박이 자라 열매를 가르자 금과 보물이 쏟아져 나왔고, 흥부는 부자가 되었습니다.",
      },
    ],
  },
  {
    id: "culture-ko-seoul-cafe",
    title: "서울의 어느 카페에서 — At a Café in Seoul",
    subtitle: "A modern slice of Seoul",
    language: "Korean",
    targetLabel: "한국어",
    level: "B1",
    section: "culture",
    flag: "🇰🇷",
    available: true,
    sentences: [
      {
        en: "It was a quiet afternoon in a small café in Seochon, with autumn light falling through the window.",
        target: "서촌의 작은 카페, 창문으로 가을 햇살이 들어오는 조용한 오후였습니다.",
      },
      {
        en: "She ordered a warm latte and opened a worn notebook on the wooden table.",
        target: "그녀는 따뜻한 라떼를 주문하고, 나무 탁자 위에 낡은 노트를 펼쳤습니다.",
      },
      {
        en: "Outside, students were laughing on their way home, their backpacks bouncing lightly.",
        target: "밖에서는 학생들이 가방을 흔들며 집으로 가는 길에 웃고 있었습니다.",
      },
      {
        en: "She thought about the trip to Jeju she had been planning for years.",
        target: "그녀는 몇 년 동안 계획해 온 제주 여행에 대해 생각했습니다.",
      },
      {
        en: "Tonight, she would finally write the first sentence of her novel.",
        target: "오늘 밤, 그녀는 마침내 자신의 소설의 첫 문장을 쓸 것입니다.",
      },
    ],
  },

  // ── French: Cardiology ────────────────────────────────────────────────────
  {
    id: "culture-fr-cardiology-consultation",
    title: "Cardiology: Patient Consultation",
    subtitle: "A French cardiologist briefing a patient",
    language: "French",
    targetLabel: "Français",
    level: "B2",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Good morning, Mr. Lefebvre. I have reviewed your electrocardiogram and I would like to discuss the results with you.",
        target:
          "Bonjour, monsieur Lefebvre. J'ai examiné votre électrocardiogramme et j'aimerais vous en expliquer les résultats.",
      },
      {
        en: "Your ECG shows an irregular heart rhythm, which we call atrial fibrillation.",
        target:
          "Votre ECG montre un rythme cardiaque irrégulier, que l'on appelle fibrillation auriculaire.",
      },
      {
        en: "This is a very common cardiac condition and there are several effective treatment options available.",
        target:
          "C'est une affection cardiaque très courante et il existe plusieurs options de traitement efficaces.",
      },
      {
        en: "I am going to prescribe a medication called an anticoagulant to reduce the risk of blood clots.",
        target:
          "Je vais vous prescrire un médicament appelé anticoagulant pour réduire le risque de formation de caillots sanguins.",
      },
      {
        en: "It is important that you take this medication every day at the same time.",
        target: "Il est important que vous preniez ce médicament tous les jours à la même heure.",
      },
      {
        en: "I would also like to schedule an echocardiogram to assess your heart function more precisely.",
        target:
          "Je souhaite également programmer un échocardiogramme pour évaluer plus précisément la fonction de votre cœur.",
      },
      {
        en: "Do you experience any chest pain, shortness of breath, or dizziness during physical activity?",
        target:
          "Ressentez-vous des douleurs thoraciques, un essoufflement ou des étourdissements lors d'une activité physique ?",
      },
      {
        en: "Your blood pressure today is slightly elevated — we will monitor this closely over the next few weeks.",
        target:
          "Votre tension artérielle est légèrement élevée aujourd'hui — nous la surveillerons de près au cours des prochaines semaines.",
      },
      {
        en: "I recommend reducing your salt intake and avoiding alcohol while you are on this medication.",
        target:
          "Je vous recommande de réduire votre consommation de sel et d'éviter l'alcool pendant la durée de ce traitement.",
      },
      {
        en: "Please come back for a follow-up appointment in four weeks, and call us immediately if you feel palpitations.",
        target:
          "Revenez pour une consultation de contrôle dans quatre semaines, et appelez-nous immédiatement si vous ressentez des palpitations.",
      },
    ],
  },
  {
    id: "culture-fr-cardiology-rehab",
    title: "Cardiology: Cardiac Rehab Briefing",
    subtitle: "Post-MI patient education in French",
    language: "French",
    targetLabel: "Français",
    level: "B2",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "You have made excellent progress since your heart attack three weeks ago, and I am very pleased with your recovery.",
        target:
          "Vous avez fait d'excellents progrès depuis votre infarctus il y a trois semaines, et je suis très satisfait de votre rétablissement.",
      },
      {
        en: "Cardiac rehabilitation will help you regain your strength and reduce the risk of a second cardiac event.",
        target:
          "La rééducation cardiaque vous aidera à retrouver vos forces et à réduire le risque d'un deuxième événement cardiaque.",
      },
      {
        en: "The program consists of supervised exercise sessions three times per week for twelve weeks.",
        target:
          "Le programme comprend des séances d'exercice supervisées trois fois par semaine pendant douze semaines.",
      },
      {
        en: "During each session, we will monitor your heart rate and blood pressure continuously.",
        target:
          "Lors de chaque séance, nous surveillerons votre fréquence cardiaque et votre tension artérielle en continu.",
      },
      {
        en: "It is normal to feel some fatigue at the beginning — your heart muscle is healing and needs gradual conditioning.",
        target:
          "Il est normal de ressentir de la fatigue au début — votre muscle cardiaque guérit et a besoin d'un conditionnement progressif.",
      },
      {
        en: "Your current medications include a beta-blocker, a statin, and aspirin — do not stop taking any of them without consulting me.",
        target:
          "Vos médicaments actuels comprennent un bêtabloquant, une statine et de l'aspirine — ne cessez jamais de les prendre sans me consulter.",
      },
      {
        en: "A heart-healthy diet low in saturated fat and high in vegetables will support your recovery significantly.",
        target:
          "Une alimentation favorable à la santé cardiaque, pauvre en graisses saturées et riche en légumes, soutiendra considérablement votre rétablissement.",
      },
      {
        en: "Your ejection fraction has improved from thirty-five percent to forty-two percent since your last echocardiogram.",
        target:
          "Votre fraction d'éjection est passée de trente-cinq pour cent à quarante-deux pour cent depuis votre dernier échocardiogramme.",
      },
      {
        en: "If you experience chest pain, shortness of breath, or an irregular heartbeat during exercise, stop immediately and inform the nurse.",
        target:
          "Si vous ressentez une douleur thoracique, un essoufflement ou un rythme cardiaque irrégulier pendant l'effort, arrêtez immédiatement et prévenez l'infirmière.",
      },
    ],
  },

  // ── French: OB-GYN ───────────────────────────────────────────────────────
  {
    id: "culture-fr-obgyn-prenatal",
    title: "OB/GYN: Prenatal Consultation",
    subtitle: "First-trimester visit at a French clinic",
    language: "French",
    targetLabel: "Français",
    level: "B2",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Congratulations on your pregnancy, madame. You are currently at ten weeks of gestation.",
        target:
          "Félicitations pour votre grossesse, madame. Vous êtes actuellement à dix semaines d'aménorrhée.",
      },
      {
        en: "During this first trimester, it is normal to feel nausea, fatigue, and breast tenderness.",
        target:
          "Durant ce premier trimestre, il est normal de ressentir des nausées, de la fatigue et une sensibilité des seins.",
      },
      {
        en: "I would like to schedule your first ultrasound for the twelfth week to confirm the due date.",
        target:
          "Je souhaite programmer votre première échographie à la douzième semaine pour confirmer la date d'accouchement prévue.",
      },
      {
        en: "We will also order a blood panel today to check your iron levels, blood type, and screen for infections.",
        target:
          "Nous allons également prescrire un bilan sanguin aujourd'hui pour vérifier votre taux de fer, votre groupe sanguin et dépister d'éventuelles infections.",
      },
      {
        en: "I recommend taking folic acid every day throughout the pregnancy to support the baby's neural development.",
        target:
          "Je vous recommande de prendre de l'acide folique chaque jour tout au long de la grossesse pour soutenir le développement neurologique du bébé.",
      },
      {
        en: "Have you experienced any bleeding, cramping, or unusual discharge since you found out you were pregnant?",
        target:
          "Avez-vous eu des saignements, des crampes ou des pertes inhabituelles depuis que vous avez appris que vous étiez enceinte ?",
      },
      {
        en: "Your prenatal visits will be monthly until the seventh month, then every two weeks, and finally every week.",
        target:
          "Vos consultations prénatales se feront chaque mois jusqu'au septième mois, puis toutes les deux semaines, et enfin chaque semaine.",
      },
      {
        en: "Please avoid alcohol, tobacco, and raw fish entirely during your pregnancy.",
        target:
          "Évitez totalement l'alcool, le tabac et les poissons crus pendant votre grossesse.",
      },
      {
        en: "We also offer a prenatal preparation class at the clinic to help you prepare for labor and delivery.",
        target:
          "Nous proposons également des cours de préparation à l'accouchement à la clinique pour vous aider à vous préparer au travail et à l'accouchement.",
      },
      {
        en: "Do not hesitate to call the maternity ward at any hour if you are worried — that is what we are here for.",
        target:
          "N'hésitez pas à appeler la maternité à toute heure si vous avez des inquiétudes — c'est pour cela que nous sommes là.",
      },
    ],
  },
  {
    id: "culture-fr-obgyn-delivery",
    title: "OB/GYN: Labor & Delivery",
    subtitle: "Birth preparation dialogue in French",
    language: "French",
    targetLabel: "Français",
    level: "B2",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "You are now in active labor — your contractions are every five minutes and your cervix is six centimeters dilated.",
        target:
          "Vous êtes maintenant en travail actif — vos contractions surviennent toutes les cinq minutes et votre col est dilaté à six centimètres.",
      },
      {
        en: "Would you like to discuss the option of an epidural for pain relief at this stage?",
        target:
          "Souhaitez-vous qu'on discute de l'option de la péridurale pour soulager la douleur à ce stade ?",
      },
      {
        en: "The fetal heart rate monitor shows that your baby is doing very well.",
        target:
          "Le moniteur de fréquence cardiaque fœtale montre que votre bébé se porte très bien.",
      },
      {
        en: "When you feel the urge to push, breathe deeply and follow the midwife's guidance.",
        target:
          "Lorsque vous ressentez l'envie de pousser, respirez profondément et suivez les indications de la sage-femme.",
      },
      {
        en: "Congratulations — your baby girl was born at 14:32 and weighs three kilograms two hundred grams.",
        target:
          "Félicitations — votre fille est née à 14 h 32 et pèse trois kilogrammes deux cents grammes.",
      },
      {
        en: "We will place your baby on your chest for skin-to-skin contact immediately after birth.",
        target:
          "Nous placerons votre bébé sur votre poitrine pour un contact peau à peau immédiatement après la naissance.",
      },
      {
        en: "Breastfeeding in the first hour after delivery is strongly encouraged and promotes maternal bonding.",
        target:
          "L'allaitement dans la première heure suivant l'accouchement est fortement encouragé et favorise le lien maternel.",
      },
      {
        en: "I will check on you again this evening, and a pediatrician will examine the baby tomorrow morning.",
        target: "Je passerai vous voir ce soir, et un pédiatre examinera le bébé demain matin.",
      },
      {
        en: "You will stay in the maternity ward for three days for monitoring before returning home.",
        target:
          "Vous resterez en maternité trois jours pour surveillance avant de rentrer à la maison.",
      },
    ],
  },

  // ── French: K-12 Teacher ─────────────────────────────────────────────────
  {
    id: "culture-fr-k12-classroom",
    title: "K–12: La salle de classe",
    subtitle: "A French teacher's first day of school",
    language: "French",
    targetLabel: "Français",
    level: "B1",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Good morning, students! Welcome to class. Please take a seat and take out your notebooks.",
        target:
          "Bonjour, les élèves ! Bienvenue en cours. Veuillez vous asseoir et sortir vos cahiers.",
      },
      {
        en: "My name is Madame Dupont, and I will be your French and literature teacher this year.",
        target:
          "Je m'appelle Madame Dupont, et je serai votre professeure de français et de littérature cette année.",
      },
      {
        en: "Let me explain the classroom rules: respect your classmates, raise your hand before speaking, and arrive on time.",
        target:
          "Laissez-moi vous expliquer les règles de la classe : respectez vos camarades, levez la main avant de parler et arrivez à l'heure.",
      },
      {
        en: "This semester we will read two novels, write four essays, and complete one oral presentation.",
        target:
          "Ce semestre, nous lirons deux romans, rédigerons quatre dissertations et réaliserons un exposé oral.",
      },
      {
        en: "Homework is due at the beginning of each class — late work will lose one point per day.",
        target:
          "Les devoirs sont à rendre en début de cours — les travaux rendus en retard perdront un point par jour.",
      },
      {
        en: "Is there anyone who needs special accommodations or has a learning plan we should be aware of?",
        target:
          "Y a-t-il des élèves qui ont besoin d'aménagements particuliers ou d'un plan personnalisé dont nous devrions être informés ?",
      },
      {
        en: "I encourage you to ask questions whenever you do not understand — there are no bad questions in this classroom.",
        target:
          "Je vous encourage à poser des questions dès que vous ne comprenez pas — il n'y a pas de mauvaises questions dans cette classe.",
      },
      {
        en: "Our first lesson today will be a diagnostic exercise to help me understand what you already know.",
        target:
          "Notre première leçon aujourd'hui sera un exercice diagnostique pour m'aider à comprendre ce que vous savez déjà.",
      },
      {
        en: "Please pair up with the student sitting next to you and introduce yourselves in two sentences.",
        target:
          "Faites équipe avec l'élève assis à côté de vous et présentez-vous en deux phrases.",
      },
      {
        en: "I look forward to a wonderful year of learning together — your effort and curiosity are what matter most.",
        target:
          "Je me réjouis à l'idée d'une merveilleuse année d'apprentissage ensemble — votre effort et votre curiosité sont ce qui compte le plus.",
      },
    ],
  },
  {
    id: "culture-fr-k12-parent-meeting",
    title: "K–12: Parent-Teacher Meeting",
    subtitle: "French teacher communicating with a parent",
    language: "French",
    targetLabel: "Français",
    level: "B2",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Thank you for coming in today, Madame Martin. I wanted to speak with you about Théo's progress.",
        target:
          "Merci d'être venue aujourd'hui, Madame Martin. Je souhaitais vous parler des progrès de Théo.",
      },
      {
        en: "Théo is a very engaged student and his oral participation in class is excellent.",
        target:
          "Théo est un élève très impliqué et sa participation orale en classe est excellente.",
      },
      {
        en: "However, I have noticed that he is struggling with written assignments and has missed three homework deadlines.",
        target:
          "Cependant, j'ai remarqué qu'il éprouve des difficultés avec les travaux écrits et a manqué trois délais pour ses devoirs.",
      },
      {
        en: "Have you noticed any difficulties at home with reading or concentration?",
        target:
          "Avez-vous remarqué des difficultés à la maison en matière de lecture ou de concentration ?",
      },
      {
        en: "I would like to suggest a meeting with the school counselor to discuss whether additional support might be helpful.",
        target:
          "Je souhaite proposer une réunion avec le conseiller scolaire pour voir si un soutien supplémentaire pourrait être utile.",
      },
      {
        en: "We also have a tutoring program available on Tuesdays and Thursdays after school, free of charge.",
        target:
          "Nous avons également un programme de tutorat disponible les mardis et jeudis après les cours, gratuitement.",
      },
      {
        en: "Théo's grades in mathematics and science are strong — this shows he is capable of very good work.",
        target:
          "Les notes de Théo en mathématiques et en sciences sont solides — cela montre qu'il est capable d'un très bon travail.",
      },
      {
        en: "With a little extra support in writing, I believe he can finish the semester with solid results.",
        target:
          "Avec un peu de soutien supplémentaire en rédaction, je crois qu'il peut terminer le semestre avec de bons résultats.",
      },
      {
        en: "Please feel free to email me at any time if you have questions or concerns throughout the year.",
        target:
          "N'hésitez pas à m'envoyer un courriel à tout moment si vous avez des questions ou des préoccupations au cours de l'année.",
      },
    ],
  },

  // ── French: International Travel ─────────────────────────────────────────
  {
    id: "culture-fr-travel-airport",
    title: "Travel: À l'aéroport de Paris",
    subtitle: "Airport navigation and customs dialogue in French",
    language: "French",
    targetLabel: "Français",
    level: "B1",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Excuse me, could you tell me where gate F23 is, please?",
        target:
          "Excusez-moi, pourriez-vous m'indiquer où se trouve la porte F23, s'il vous plaît ?",
      },
      {
        en: "Your gate is at the end of terminal two — follow the signs for international departures.",
        target:
          "Votre porte se trouve au bout du terminal deux — suivez les panneaux pour les départs internationaux.",
      },
      {
        en: "I would like to check in this suitcase and keep my carry-on bag with me.",
        target: "Je souhaite enregistrer cette valise et garder mon bagage à main avec moi.",
      },
      {
        en: "I am sorry, but your bag exceeds the weight limit by three kilograms — there will be a surcharge of thirty euros.",
        target:
          "Je suis désolé, mais votre bagage dépasse la limite de poids de trois kilogrammes — il y aura un supplément de trente euros.",
      },
      {
        en: "Do you have anything to declare at customs — food products, more than ten thousand euros in cash, or tobacco?",
        target:
          "Avez-vous quelque chose à déclarer à la douane — des produits alimentaires, plus de dix mille euros en espèces, ou du tabac ?",
      },
      {
        en: "No, I have nothing to declare. I am here on vacation for two weeks.",
        target: "Non, je n'ai rien à déclarer. Je suis ici en vacances pour deux semaines.",
      },
      {
        en: "May I see your passport and boarding pass, please?",
        target: "Puis-je voir votre passeport et votre carte d'embarquement, s'il vous plaît ?",
      },
      {
        en: "My flight to Lyon is boarding in twenty minutes — I need to get to the gate quickly.",
        target:
          "Mon vol pour Lyon embarque dans vingt minutes — je dois rejoindre la porte rapidement.",
      },
      {
        en: "The RER B train from the airport to the city center runs every fifteen minutes and takes about thirty-five minutes.",
        target:
          "Le RER B depuis l'aéroport jusqu'au centre-ville passe toutes les quinze minutes et prend environ trente-cinq minutes.",
      },
      {
        en: "Have a pleasant journey, and welcome to France!",
        target: "Bon voyage, et bienvenue en France !",
      },
    ],
  },
  {
    id: "culture-fr-travel-hotel",
    title: "Travel: À l'hôtel",
    subtitle: "Hotel check-in and directions in French",
    language: "French",
    targetLabel: "Français",
    level: "B1",
    section: "culture",
    flag: "🇫🇷",
    available: true,
    sentences: [
      {
        en: "Good evening. I have a reservation under the name Johnson for three nights.",
        target: "Bonsoir. J'ai une réservation au nom de Johnson pour trois nuits.",
      },
      {
        en: "Welcome, monsieur. I have found your reservation — you are in room 214 on the second floor.",
        target:
          "Bienvenue, monsieur. J'ai bien trouvé votre réservation — vous êtes dans la chambre 214 au deuxième étage.",
      },
      {
        en: "Could I have a room that is quieter, away from the street? The noise bothers me.",
        target: "Pourrais-je avoir une chambre plus calme, loin de la rue ? Le bruit me dérange.",
      },
      {
        en: "Of course — I can offer you room 318 at the back of the building, which overlooks the courtyard.",
        target:
          "Bien sûr — je peux vous proposer la chambre 318 à l'arrière du bâtiment, qui donne sur la cour intérieure.",
      },
      {
        en: "Breakfast is served in the dining room from seven to ten o'clock every morning.",
        target:
          "Le petit-déjeuner est servi dans la salle à manger de sept heures à dix heures chaque matin.",
      },
      {
        en: "Could you recommend a good restaurant nearby that is not too expensive?",
        target:
          "Pourriez-vous me recommander un bon restaurant à proximité qui ne soit pas trop cher ?",
      },
      {
        en: "I recommend Le Bistrot des Artistes, two streets from here — the set menu is excellent and very affordable.",
        target:
          "Je vous recommande Le Bistrot des Artistes, à deux rues d'ici — le menu du jour est excellent et très abordable.",
      },
      {
        en: "To get to the Eiffel Tower, take line six on the metro from Trocadéro — it is about ten minutes.",
        target:
          "Pour aller à la Tour Eiffel, prenez la ligne six du métro depuis Trocadéro — c'est environ dix minutes.",
      },
      {
        en: "Here is your key card. The Wi-Fi password is written on the back.",
        target: "Voici votre carte-clé. Le mot de passe Wi-Fi est inscrit au dos.",
      },
      {
        en: "Please do not hesitate to contact reception at any time if you need anything.",
        target:
          "N'hésitez pas à contacter la réception à tout moment si vous avez besoin de quoi que ce soit.",
      },
    ],
  },
];

// Preach My Gospel — surfaced when the LDS Missionary module is active.
// Spanish original (PMG 2023) plus AI-translated variants for other languages.
const PREACH_MY_GOSPEL_SEED: LibraryEntry = {
  id: "missionary-preach-my-gospel",
  title: "Preach My Gospel",
  subtitle: "A Guide to Missionary Service · Spanish",
  language: "Spanish",
  targetLabel: "Español",
  level: "B2",
  section: "missionary",
  flag: "🇪🇸",
  available: true,
  sentences: PREACH_MY_GOSPEL_CHAPTERS[0].sentences,
  chapters: PREACH_MY_GOSPEL_CHAPTERS.map((c) => ({
    title: c.title,
    sentences: c.sentences,
  })),
};

const PREACH_MY_GOSPEL_I18N_SEEDS: LibraryEntry[] = PREACH_MY_GOSPEL_I18N.map((pmg) => ({
  id: `missionary-preach-my-gospel-${pmg.language.toLowerCase()}`,
  title: "Preach My Gospel",
  subtitle: `A Guide to Missionary Service · ${pmg.targetLabel}`,
  language: pmg.language,
  targetLabel: pmg.targetLabel,
  level: "B2" as const,
  section: "missionary" as const,
  flag: pmg.flag,
  available: true,
  sentences: pmg.chapters[0].sentences,
  chapters: pmg.chapters.map((c) => ({ title: c.title, sentences: c.sentences })),
}));

// ── Module seeds: Pain Management ───────────────────────────────────────────
const PAIN_MANAGEMENT_SEEDS: LibraryEntry[] = [
  {
    id: "culture-es-pain-consent",
    title: "Formulario de Consentimiento — Manejo del Dolor",
    subtitle: "Pain Management · consent & opioid agreement",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "This consent form explains the risks and benefits of opioid medication for chronic pain management.",
        target:
          "Este formulario de consentimiento explica los riesgos y beneficios de los medicamentos opioides para el manejo del dolor crónico.",
      },
      {
        en: "You agree to take the medication only as prescribed and not to share it with any other person.",
        target:
          "Usted acepta tomar el medicamento únicamente según lo recetado y no compartirlo con ninguna otra persona.",
      },
      {
        en: "On a scale of zero to ten, how would you rate your pain right now?",
        target: "En una escala del cero al diez, ¿cómo calificaría su dolor en este momento?",
      },
      {
        en: "The doctor will review your prescription at every visit to make sure the dose is safe and effective.",
        target:
          "El médico revisará su receta en cada visita para asegurarse de que la dosis sea segura y eficaz.",
      },
      {
        en: "We will perform a urine drug screen today as part of your controlled substance agreement.",
        target:
          "Realizaremos un análisis de orina hoy como parte de su acuerdo de sustancias controladas.",
      },
      {
        en: "If you experience severe nausea, dizziness, or difficulty breathing, go to the emergency room immediately.",
        target:
          "Si experimenta náuseas intensas, mareos o dificultad para respirar, vaya a la sala de urgencias de inmediato.",
      },
      {
        en: "Non-opioid options such as physical therapy and nerve blocks may also help reduce your pain.",
        target:
          "Las opciones no opioides como la fisioterapia y los bloqueos nerviosos también pueden ayudar a reducir su dolor.",
      },
      {
        en: "Please bring all of your medications to each appointment so we can review them together.",
        target:
          "Por favor traiga todos sus medicamentos a cada cita para que podamos revisarlos juntos.",
      },
      {
        en: "Tolerance can develop over time, and we may need to adjust your treatment plan.",
        target:
          "La tolerancia puede desarrollarse con el tiempo y es posible que necesitemos ajustar su plan de tratamiento.",
      },
      {
        en: "Sign here to confirm that you understand and agree to the terms of this pain management contract.",
        target:
          "Firme aquí para confirmar que comprende y acepta los términos de este contrato de manejo del dolor.",
      },
    ],
  },
  {
    id: "culture-es-pain-procedure",
    title: "Explicación del Procedimiento — Inyección Epidural",
    subtitle: "Pain Management · procedure explanation",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "Today we are going to perform an epidural steroid injection to reduce the inflammation around the nerve.",
        target:
          "Hoy vamos a realizar una inyección epidural de corticosteroides para reducir la inflamación alrededor del nervio.",
      },
      {
        en: "You will be awake during the procedure, but we will give you a local anesthetic to numb the skin.",
        target:
          "Estará despierto durante el procedimiento, pero le aplicaremos un anestésico local para adormecer la piel.",
      },
      {
        en: "You may feel some pressure in your lower back as the needle is guided into position under X-ray.",
        target:
          "Es posible que sienta algo de presión en la parte baja de la espalda mientras la aguja se guía hacia su posición bajo rayos X.",
      },
      {
        en: "The entire procedure takes about fifteen minutes; please remain still while the injection is given.",
        target:
          "El procedimiento completo dura unos quince minutos; por favor permanezca quieto mientras se aplica la inyección.",
      },
      {
        en: "Most patients feel some relief within three to five days as the anti-inflammatory medication takes effect.",
        target:
          "La mayoría de los pacientes sienten alivio dentro de tres a cinco días a medida que el medicamento antiinflamatorio hace efecto.",
      },
      {
        en: "Do not drive yourself home — please bring someone who can take you after the procedure.",
        target:
          "No conduzca de regreso a casa; por favor traiga a alguien que pueda llevarlo después del procedimiento.",
      },
      {
        en: "If your pain significantly worsens or you develop a fever within 48 hours, call our office right away.",
        target:
          "Si su dolor empeora significativamente o desarrolla fiebre dentro de las 48 horas, llame a nuestro consultorio de inmediato.",
      },
      {
        en: "We may also discuss a spinal cord stimulator as a longer-term option if the injections provide limited relief.",
        target:
          "También podemos hablar sobre un estimulador de médula espinal como una opción a largo plazo si las inyecciones proporcionan un alivio limitado.",
      },
    ],
  },
];

// ── Module seeds: Family Medicine ────────────────────────────────────────────
const FAMILY_MEDICINE_SEEDS: LibraryEntry[] = [
  {
    id: "culture-es-family-wellness",
    title: "Visita de Bienestar Anual",
    subtitle: "Family Medicine · wellness exam & counseling",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "We are here today for your annual wellness visit — let's review how you have been feeling overall.",
        target:
          "Estamos aquí hoy para su visita de bienestar anual. Revisemos cómo se ha sentido en general.",
      },
      {
        en: "Your blood pressure today is one hundred and forty over ninety — a bit higher than we would like.",
        target:
          "Su presión arterial hoy es ciento cuarenta sobre noventa, un poco más alta de lo que nos gustaría.",
      },
      {
        en: "I am going to prescribe a low-dose medication and ask you to reduce your sodium intake.",
        target:
          "Voy a recetarle un medicamento de dosis baja y le pediré que reduzca su consumo de sodio.",
      },
      {
        en: "Has anyone in your family been diagnosed with diabetes, heart disease, or high cholesterol?",
        target:
          "¿Algún familiar suyo ha sido diagnosticado con diabetes, enfermedad cardíaca o colesterol alto?",
      },
      {
        en: "I would like to order a fasting blood test to check your cholesterol and blood sugar levels.",
        target:
          "Me gustaría ordenar un análisis de sangre en ayunas para verificar sus niveles de colesterol y azúcar en sangre.",
      },
      {
        en: "At your age, a colorectal cancer screening is recommended — we can discuss the options today.",
        target:
          "A su edad, se recomienda una prueba de detección de cáncer colorrectal; podemos hablar sobre las opciones hoy.",
      },
      {
        en: "Are you up to date on your flu vaccine and your tetanus booster?",
        target: "¿Está al día con su vacuna contra la influenza y su refuerzo contra el tétanos?",
      },
      {
        en: "I want to refer you to a cardiologist for a more detailed evaluation of your heart.",
        target: "Quiero referirlo a un cardiólogo para una evaluación más detallada de su corazón.",
      },
      {
        en: "Regular exercise — even thirty minutes of walking five days a week — can make a significant difference.",
        target:
          "El ejercicio regular, incluso treinta minutos de caminata cinco días a la semana, puede marcar una diferencia significativa.",
      },
      {
        en: "Let's schedule a follow-up appointment in three months to review your lab results and blood pressure.",
        target:
          "Programemos una cita de seguimiento en tres meses para revisar sus resultados de laboratorio y su presión arterial.",
      },
    ],
  },
  {
    id: "culture-es-family-diabetes",
    title: "Manejo de la Diabetes — Consulta de Seguimiento",
    subtitle: "Family Medicine · chronic disease management",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "Your A1C result is seven point eight — it has improved since your last visit, which is great news.",
        target:
          "Su resultado de A1C es siete punto ocho; ha mejorado desde su última visita, lo cual es una buena noticia.",
      },
      {
        en: "We are going to start you on metformin — it is taken twice daily with meals.",
        target: "Vamos a comenzar con metformina; se toma dos veces al día con las comidas.",
      },
      {
        en: "Please monitor your blood sugar at home every morning before eating and record the numbers.",
        target:
          "Por favor controle su azúcar en sangre en casa cada mañana antes de comer y registre los números.",
      },
      {
        en: "A diagnosis of type two diabetes does not have to limit your life if we manage it together.",
        target:
          "Un diagnóstico de diabetes tipo dos no tiene que limitar su vida si lo manejamos juntos.",
      },
      {
        en: "I recommend meeting with our registered dietitian to build a meal plan that works for you.",
        target:
          "Le recomiendo que se reúna con nuestra dietista registrada para elaborar un plan de alimentación que funcione para usted.",
      },
      {
        en: "If you ever feel shaky, sweaty, or confused, check your blood sugar — it may be too low.",
        target:
          "Si alguna vez se siente tembloroso, sudoroso o confundido, revise su azúcar en sangre; puede estar demasiado baja.",
      },
      {
        en: "We will also check your kidney function and do an eye exam every year as part of your diabetes care.",
        target:
          "También revisaremos la función de sus riñones y haremos un examen de los ojos cada año como parte de su cuidado de la diabetes.",
      },
      {
        en: "Your feet need to be inspected at every visit — nerve damage from diabetes can go unnoticed.",
        target:
          "Sus pies deben ser revisados en cada visita; el daño nervioso por diabetes puede pasar desapercibido.",
      },
      {
        en: "The treatment plan we design together will include medication, lifestyle changes, and regular monitoring.",
        target:
          "El plan de tratamiento que diseñemos juntos incluirá medicamentos, cambios en el estilo de vida y seguimiento regular.",
      },
    ],
  },
];

// ── Module seeds: Construction / Trades ──────────────────────────────────────
const CONSTRUCTION_SEEDS: LibraryEntry[] = [
  {
    id: "culture-es-construction-safety",
    title: "Charla de Seguridad — Reunión Matutina",
    subtitle: "Construction Foreman · safety tailgate meeting",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "Good morning, everyone — before we start work, we need to go over today's safety briefing.",
        target:
          "Buenos días a todos. Antes de comenzar el trabajo, necesitamos repasar la charla de seguridad de hoy.",
      },
      {
        en: "All workers must wear a hard hat, steel-toed boots, and a high-visibility vest at all times on this site.",
        target:
          "Todos los trabajadores deben usar casco, botas con punta de acero y chaleco de alta visibilidad en todo momento en esta obra.",
      },
      {
        en: "If you spot a hazard, stop work immediately and report it to the foreman before continuing.",
        target:
          "Si detecta un peligro, detenga el trabajo de inmediato e infórmele al capataz antes de continuar.",
      },
      {
        en: "The scaffold on the east side has been inspected and is safe to use — do not remove any guardrails.",
        target:
          "El andamio en el lado este ha sido inspeccionado y es seguro para usar; no quite ningún pasamanos.",
      },
      {
        en: "Today we are pouring the concrete foundation — make sure the rebar is properly tied before the truck arrives.",
        target:
          "Hoy estamos vertiendo la cimentación de concreto; asegúrese de que el acero de refuerzo esté correctamente atado antes de que llegue el camión.",
      },
      {
        en: "The building permit is posted at the entrance — inspectors may arrive this afternoon to review the work.",
        target:
          "El permiso de construcción está publicado en la entrada; los inspectores pueden llegar esta tarde para revisar el trabajo.",
      },
      {
        en: "Review the blueprint before you begin — any questions about the load-bearing walls, come see me.",
        target:
          "Revise el plano antes de comenzar; cualquier pregunta sobre las paredes de carga, venga a verme.",
      },
      {
        en: "We have a deadline to hit — but safety is never something we rush. Do it right the first time.",
        target:
          "Tenemos un plazo que cumplir, pero la seguridad nunca es algo que se apresure. Hágalo bien desde la primera vez.",
      },
      {
        en: "If you need to operate the forklift today, make sure you have your certification card on you.",
        target:
          "Si necesita operar el montacargas hoy, asegúrese de tener su tarjeta de certificación con usted.",
      },
      {
        en: "Any worker who is not wearing proper PPE will be sent off the site — no exceptions.",
        target:
          "Cualquier trabajador que no use el equipo de protección personal adecuado será retirado de la obra; sin excepciones.",
      },
    ],
  },
  {
    id: "culture-es-construction-coordination",
    title: "Coordinación con Subcontratistas",
    subtitle: "Construction Foreman · subcontractor & inspection communication",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "The electrical subcontractor is scheduled to rough in the second floor wiring on Thursday.",
        target:
          "El subcontratista eléctrico tiene programado hacer el cableado de obra del segundo piso el jueves.",
      },
      {
        en: "We need the concrete forms removed and the area cleaned before the inspector arrives at noon.",
        target:
          "Necesitamos que se retiren los moldes de concreto y se limpie el área antes de que llegue el inspector al mediodía.",
      },
      {
        en: "The delivery of steel beams is two days late — we need to rework the schedule for the structural crew.",
        target:
          "La entrega de vigas de acero tiene dos días de retraso; necesitamos reorganizar el programa para el equipo estructural.",
      },
      {
        en: "All tools must be secured and stored at the end of each shift — do not leave them on the scaffold.",
        target:
          "Todas las herramientas deben guardarse y almacenarse al final de cada turno; no las dejen en el andamio.",
      },
      {
        en: "The plumbing rough-in passed inspection this morning — good work from the crew.",
        target:
          "La instalación de plomería de obra pasó la inspección esta mañana; buen trabajo del equipo.",
      },
      {
        en: "We have a material shortage — call the supplier and request a same-day delivery of one hundred bags of cement.",
        target:
          "Tenemos escasez de materiales; llame al proveedor y solicite una entrega el mismo día de cien sacos de cemento.",
      },
      {
        en: "New laborers must complete the site orientation and sign the safety agreement before starting work.",
        target:
          "Los nuevos trabajadores deben completar la orientación del sitio y firmar el acuerdo de seguridad antes de comenzar a trabajar.",
      },
      {
        en: "Stage the materials near the building entrance, but keep the emergency exit clear at all times.",
        target:
          "Almacene los materiales cerca de la entrada del edificio, pero mantenga la salida de emergencia despejada en todo momento.",
      },
    ],
  },
];

// ── Module seeds: Restaurant & Hospitality ───────────────────────────────────
const RESTAURANT_SEEDS: LibraryEntry[] = [
  {
    id: "culture-es-restaurant-service",
    title: "Servicio en Mesa — Escenarios de Restaurante",
    subtitle: "Restaurant & Hospitality · table service",
    language: "Spanish",
    targetLabel: "Español",
    level: "B1",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "Good evening, welcome! My name is Carlos and I will be your server tonight.",
        target: "Buenas noches, ¡bienvenido! Me llamo Carlos y seré su mesero esta noche.",
      },
      {
        en: "Do you have a reservation, or would you prefer a table in our open seating area?",
        target:
          "¿Tiene una reservación o prefiere una mesa en nuestra área de asientos disponibles?",
      },
      {
        en: "Tonight's specials are a pan-seared salmon with mango salsa and a braised short rib with mashed potatoes.",
        target:
          "Los especiales de esta noche son un salmón a la plancha con salsa de mango y costilla de res estofada con puré de papas.",
      },
      {
        en: "Can I start you off with something to drink, or would you like a few minutes to look over the menu?",
        target:
          "¿Puedo traerle algo de tomar para empezar o prefiere unos minutos para revisar el menú?",
      },
      {
        en: "I'm so sorry about the wait — the kitchen is running about ten minutes behind on that dish.",
        target:
          "Lamento mucho la espera; la cocina tiene unos diez minutos de retraso en ese platillo.",
      },
      {
        en: "Do you or anyone at your table have any food allergies or dietary restrictions?",
        target:
          "¿Usted o alguno de los comensales en su mesa tiene alergias alimentarias o restricciones dietéticas?",
      },
      {
        en: "Our kitchen can prepare the pasta gluten-free if you need it — just let me know.",
        target: "Nuestra cocina puede preparar la pasta sin gluten si lo necesita; sólo avíseme.",
      },
      {
        en: "I will let the kitchen know right away and bring you a corrected order as quickly as possible.",
        target:
          "Le avisaré a la cocina de inmediato y le traeré un pedido correcto lo más pronto posible.",
      },
      {
        en: "When you are ready, I can bring the check, or would you like to see the dessert menu?",
        target: "Cuando esté listo, puedo traerle la cuenta o ¿le gustaría ver el menú de postres?",
      },
      {
        en: "Thank you so much for dining with us tonight — please come back and see us again soon.",
        target:
          "Muchas gracias por cenar con nosotros esta noche; por favor vuelva a visitarnos pronto.",
      },
    ],
  },
  {
    id: "culture-es-restaurant-kitchen",
    title: "Coordinación de Cocina — Durante el Servicio",
    subtitle: "Restaurant & Hospitality · kitchen coordination",
    language: "Spanish",
    targetLabel: "Español",
    level: "B2",
    section: "culture",
    flag: "🇲🇽",
    available: true,
    sentences: [
      {
        en: "Fire two salmon, one short rib, and hold the soup on table seven until the appetizers go out.",
        target:
          "Fuego a dos salmones, una costilla, y mantén la sopa de la mesa siete hasta que salgan los entremeses.",
      },
      {
        en: "We are eighty-six on the risotto tonight — tell the servers immediately so they can update the guests.",
        target:
          "Esta noche nos quedamos sin risotto; avísenles a los meseros de inmediato para que informen a los clientes.",
      },
      {
        en: "The ticket time on the grill station is running at eighteen minutes — we need to speed up.",
        target:
          "El tiempo de ticket en la estación de la parrilla está en dieciocho minutos; necesitamos acelerar.",
      },
      {
        en: "All food leaving the kitchen must be plated correctly and at the right temperature — check your work.",
        target:
          "Todo el alimento que salga de la cocina debe estar emplatado correctamente y a la temperatura adecuada; revisen su trabajo.",
      },
      {
        en: "We have a large party of twenty arriving in thirty minutes — pre-plate the salads now.",
        target:
          "Llega un grupo grande de veinte personas en treinta minutos; preparen los platos de ensalada ahora.",
      },
      {
        en: "Wash your hands after handling raw protein and before touching any ready-to-eat food.",
        target:
          "Lávense las manos después de manipular proteína cruda y antes de tocar cualquier alimento listo para consumir.",
      },
      {
        en: "The walk-in cooler needs to be restocked before close — check the inventory sheet on the clipboard.",
        target:
          "El refrigerador de cámara necesita reabastecerse antes del cierre; revisen la hoja de inventario en el portapapeles.",
      },
      {
        en: "Good service tonight, team — tips are shared equally and the breakdown will be on the board after close.",
        target:
          "Buen servicio esta noche, equipo; las propinas se distribuyen de forma equitativa y el desglose estará en el tablero después del cierre.",
      },
      {
        en: "Before you leave, make sure your station is clean, all food is labeled with today's date, and the floor is swept.",
        target:
          "Antes de salir, asegúrense de que su estación esté limpia, todos los alimentos estén etiquetados con la fecha de hoy y el piso esté barrido.",
      },
    ],
  },
];

const tag = (cat: string) => (e: LibraryEntry) => ({ ...e, category: cat });

/**
 * Per-language LDS scripture packs — loaded on-demand when the user's selected
 * language changes. Each loader returns a Promise so Vite can split each
 * language group into its own chunk (~50–65 kB each).
 */
export const LDS_PACK_LOADERS: Record<string, () => Promise<LibraryEntry[]>> = {
  Spanish: () =>
    import("@/data/lds-scriptures").then(({ LDS_SCRIPTURES }) =>
      LDS_SCRIPTURES.map((book) => ({
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        language: "Spanish" as const,
        targetLabel: "Español",
        level: "C1" as const,
        section: "missionary" as const,
        flag: book.flag,
        available: true,
        sentences: book.chapters[0]?.sentences ?? [],
        chapters: book.chapters,
        category: "Faith",
      })),
    ),
  French: () =>
    import("@/data/library-seeds/lds-scriptures-fr-pt").then(({ LDS_SCRIPTURES_FR }) =>
      LDS_SCRIPTURES_FR.map((e) => ({ ...e, category: "Faith" })),
    ),
  Portuguese: () =>
    import("@/data/library-seeds/lds-scriptures-fr-pt").then(({ LDS_SCRIPTURES_PT }) =>
      LDS_SCRIPTURES_PT.map((e) => ({ ...e, category: "Faith" })),
    ),
  German: () =>
    import("@/data/library-seeds/lds-scriptures-de-it").then(({ LDS_SCRIPTURES_DE }) =>
      LDS_SCRIPTURES_DE.map((e) => ({ ...e, category: "Faith" })),
    ),
  Italian: () =>
    import("@/data/library-seeds/lds-scriptures-de-it").then(({ LDS_SCRIPTURES_IT }) =>
      LDS_SCRIPTURES_IT.map((e) => ({ ...e, category: "Faith" })),
    ),
  Japanese: () =>
    import("@/data/library-seeds/lds-scriptures-ja-ko").then(({ LDS_SCRIPTURES_JA }) =>
      LDS_SCRIPTURES_JA.map((e) => ({ ...e, category: "Faith" })),
    ),
  Korean: () =>
    import("@/data/library-seeds/lds-scriptures-ja-ko").then(({ LDS_SCRIPTURES_KO }) =>
      LDS_SCRIPTURES_KO.map((e) => ({ ...e, category: "Faith" })),
    ),
};

export const ALL_SEEDS: LibraryEntry[] = [
  { ...PREACH_MY_GOSPEL_SEED, category: "Faith" },
  ...PREACH_MY_GOSPEL_I18N_SEEDS.map(tag("Faith")),
  ...CLASSIC_STUBS.map(tag("Classics")),
  { ...CULTURE_SEED, category: "Culture" },
  ...CULTURE_EXTRA.map(tag("Culture")),
  ...PAIN_MANAGEMENT_SEEDS.map(tag("Medical")),
  ...FAMILY_MEDICINE_SEEDS.map(tag("Medical")),
  ...CONSTRUCTION_SEEDS.map(tag("Trades")),
  ...RESTAURANT_SEEDS.map(tag("Food & Hospitality")),
  ...(FAITH_SEEDS as LibraryEntry[]).map(tag("Faith")),
  ...(MEDICAL_A_SEEDS as LibraryEntry[]).map(tag("Medical")),
  ...(MEDICAL_B_SEEDS as LibraryEntry[]).map(tag("Medical")),
  ...(TRADES_SEEDS as LibraryEntry[]).map(tag("Trades")),
  ...(TRANSPORT_AGRI_SEEDS as LibraryEntry[]).map(tag("Transport & Agriculture")),
  ...(SERVICE_EDU_SEEDS as LibraryEntry[]).map(tag("Service & Education")),
  ...(SPORTS_A_SEEDS as LibraryEntry[]).map(tag("Sports")),
  ...(SPORTS_B_TRAVEL_SEEDS as LibraryEntry[]).map(tag("Sports")),
  ...(SPORTS_NUTRITION_A_SEEDS as LibraryEntry[]).map(tag("Nutrition")),
  ...(SPORTS_NUTRITION_B_SEEDS as LibraryEntry[]).map(tag("Nutrition")),
  ...(SPORTS_NUTRITION_C_SEEDS as LibraryEntry[]).map(tag("Nutrition")),
  ...(ENGLISH_TARGET_SEEDS as LibraryEntry[]).map(tag("English")),
  ...(TECHNOLOGY_SEEDS as LibraryEntry[]).map(tag("Technology")),
  ...(COOKING_FOOD_SEEDS as LibraryEntry[]).map(tag("Food & Hospitality")),
  ...(FINANCE_BUSINESS_SEEDS as LibraryEntry[]).map(tag("Finance")),
  ...(KOREAN_MODULE_SEEDS as LibraryEntry[]).map(tag("Korean")),
  ...(NEW_MODULES_SEEDS as LibraryEntry[]).map((e) => ({ ...e, category: e.category ?? "Other" })),
  ...(PASHTO_SEEDS as LibraryEntry[]).map((e) => ({ ...e, category: e.category ?? "Culture" })),
  ...(ITALIAN_EXPANSION_SEEDS as LibraryEntry[]).map((e) => ({ ...e, category: e.category ?? "Culture" })),
];
