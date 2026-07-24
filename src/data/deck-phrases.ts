import type { DeckWord } from "./deck-pronouns";

// Short everyday phrases: greetings, courtesy, small talk. Kept as fixed
// chunks (not conjugated) since that's how learners actually use them.
export const DECK_PHRASES: DeckWord[] = [
  {
    id: "phrase-good-morning",
    english: "good morning",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Buongiorno",
        example: "Buongiorno, come stai?",
        exampleTranslation: "Good morning, how are you?",
      },
      Spanish: {
        word: "Buenos días",
        example: "Buenos días, ¿cómo estás?",
        exampleTranslation: "Good morning, how are you?",
      },
      French: {
        word: "Bonjour",
        example: "Bonjour, comment ça va?",
        exampleTranslation: "Good morning, how are you?",
      },
      German: {
        word: "Guten Morgen",
        example: "Guten Morgen, wie geht's?",
        exampleTranslation: "Good morning, how are you?",
      },
      Portuguese: {
        word: "Bom dia",
        example: "Bom dia, como está?",
        exampleTranslation: "Good morning, how are you?",
      },
      Japanese: {
        word: "おはようございます",
        romanization: "ohayou gozaimasu",
        example: "おはようございます、元気ですか？",
        exampleTranslation: "Good morning, how are you?",
      },
      Korean: {
        word: "안녕하세요",
        romanization: "annyeonghaseyo",
        example: "안녕하세요, 잘 지내세요?",
        exampleTranslation: "Hello, how are you?",
      },
    },
  },
  {
    id: "phrase-good-evening",
    english: "good evening",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Buonasera",
        example: "Buonasera a tutti.",
        exampleTranslation: "Good evening everyone.",
      },
      Spanish: {
        word: "Buenas tardes",
        example: "Buenas tardes a todos.",
        exampleTranslation: "Good evening everyone.",
      },
      French: {
        word: "Bonsoir",
        example: "Bonsoir tout le monde.",
        exampleTranslation: "Good evening everyone.",
      },
      German: {
        word: "Guten Abend",
        example: "Guten Abend zusammen.",
        exampleTranslation: "Good evening everyone.",
      },
      Portuguese: {
        word: "Boa noite",
        example: "Boa noite a todos.",
        exampleTranslation: "Good evening everyone.",
      },
      Japanese: {
        word: "こんばんは",
        romanization: "konbanwa",
        example: "こんばんは、皆さん。",
        exampleTranslation: "Good evening, everyone.",
      },
      Korean: {
        word: "안녕하세요",
        romanization: "annyeonghaseyo",
        example: "안녕하세요, 여러분.",
        exampleTranslation: "Good evening, everyone.",
      },
    },
  },
  {
    id: "phrase-goodbye",
    english: "goodbye",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Arrivederci",
        example: "Arrivederci, a presto!",
        exampleTranslation: "Goodbye, see you soon!",
      },
      Spanish: {
        word: "Adiós",
        example: "Adiós, hasta pronto.",
        exampleTranslation: "Goodbye, see you soon.",
      },
      French: {
        word: "Au revoir",
        example: "Au revoir, à bientôt.",
        exampleTranslation: "Goodbye, see you soon.",
      },
      German: {
        word: "Auf Wiedersehen",
        example: "Auf Wiedersehen, bis bald.",
        exampleTranslation: "Goodbye, see you soon.",
      },
      Portuguese: {
        word: "Adeus",
        example: "Adeus, até breve.",
        exampleTranslation: "Goodbye, see you soon.",
      },
      Japanese: {
        word: "さようなら",
        romanization: "sayounara",
        example: "さようなら、また会いましょう。",
        exampleTranslation: "Goodbye, let's meet again.",
      },
      Korean: {
        word: "안녕히 가세요",
        romanization: "annyeonghi gaseyo",
        example: "안녕히 가세요, 또 만나요.",
        exampleTranslation: "Goodbye, see you again.",
      },
    },
  },
  {
    id: "phrase-thank-you",
    english: "thank you",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Grazie",
        example: "Grazie mille per l'aiuto.",
        exampleTranslation: "Thank you so much for the help.",
      },
      Spanish: {
        word: "Gracias",
        example: "Muchas gracias por la ayuda.",
        exampleTranslation: "Thank you so much for the help.",
      },
      French: {
        word: "Merci",
        example: "Merci beaucoup pour l'aide.",
        exampleTranslation: "Thank you so much for the help.",
      },
      German: {
        word: "Danke",
        example: "Danke schön für die Hilfe.",
        exampleTranslation: "Thank you so much for the help.",
      },
      Portuguese: {
        word: "Obrigado",
        example: "Muito obrigado pela ajuda.",
        exampleTranslation: "Thank you so much for the help.",
      },
      Japanese: {
        word: "ありがとうございます",
        romanization: "arigatou gozaimasu",
        example: "手伝ってくれてありがとうございます。",
        exampleTranslation: "Thank you for helping me.",
      },
      Korean: {
        word: "감사합니다",
        romanization: "gamsahamnida",
        example: "도와주셔서 감사합니다.",
        exampleTranslation: "Thank you for helping me.",
      },
    },
  },
  {
    id: "phrase-youre-welcome",
    english: "you're welcome",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Prego",
        example: "Grazie! — Prego!",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      Spanish: {
        word: "De nada",
        example: "Gracias! — De nada!",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      French: {
        word: "De rien",
        example: "Merci! — De rien!",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      German: {
        word: "Bitte schön",
        example: "Danke! — Bitte schön!",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      Portuguese: {
        word: "De nada",
        example: "Obrigado! — De nada!",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      Japanese: {
        word: "どういたしまして",
        romanization: "dou itashimashite",
        example: "ありがとう！ — どういたしまして！",
        exampleTranslation: "Thanks! — You're welcome!",
      },
      Korean: {
        word: "천만에요",
        romanization: "cheonmaneyo",
        example: "감사합니다! — 천만에요!",
        exampleTranslation: "Thank you! — You're welcome!",
      },
    },
  },
  {
    id: "phrase-please",
    english: "please",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Per favore",
        example: "Un caffè, per favore.",
        exampleTranslation: "A coffee, please.",
      },
      Spanish: {
        word: "Por favor",
        example: "Un café, por favor.",
        exampleTranslation: "A coffee, please.",
      },
      French: {
        word: "S'il vous plaît",
        example: "Un café, s'il vous plaît.",
        exampleTranslation: "A coffee, please.",
      },
      German: {
        word: "Bitte",
        example: "Einen Kaffee, bitte.",
        exampleTranslation: "A coffee, please.",
      },
      Portuguese: {
        word: "Por favor",
        example: "Um café, por favor.",
        exampleTranslation: "A coffee, please.",
      },
      Japanese: {
        word: "お願いします",
        romanization: "onegaishimasu",
        example: "コーヒーをお願いします。",
        exampleTranslation: "A coffee, please.",
      },
      Korean: {
        word: "부탁합니다",
        romanization: "butakhamnida",
        example: "커피 부탁합니다.",
        exampleTranslation: "A coffee, please.",
      },
    },
  },
  {
    id: "phrase-excuse-me",
    english: "excuse me / sorry",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Mi scusi",
        example: "Mi scusi, dov'è la stazione?",
        exampleTranslation: "Excuse me, where is the station?",
      },
      Spanish: {
        word: "Disculpe",
        example: "Disculpe, ¿dónde está la estación?",
        exampleTranslation: "Excuse me, where is the station?",
      },
      French: {
        word: "Excusez-moi",
        example: "Excusez-moi, où est la gare?",
        exampleTranslation: "Excuse me, where is the station?",
      },
      German: {
        word: "Entschuldigung",
        example: "Entschuldigung, wo ist der Bahnhof?",
        exampleTranslation: "Excuse me, where is the station?",
      },
      Portuguese: {
        word: "Com licença",
        example: "Com licença, onde fica a estação?",
        exampleTranslation: "Excuse me, where is the station?",
      },
      Japanese: {
        word: "すみません",
        romanization: "sumimasen",
        example: "すみません、駅はどこですか？",
        exampleTranslation: "Excuse me, where is the station?",
      },
      Korean: {
        word: "죄송합니다",
        romanization: "joesonghamnida",
        example: "죄송합니다, 역이 어디예요?",
        exampleTranslation: "Excuse me, where is the station?",
      },
    },
  },
  {
    id: "phrase-how-are-you",
    english: "how are you?",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Come stai?",
        example: "Ciao! Come stai?",
        exampleTranslation: "Hi! How are you?",
      },
      Spanish: {
        word: "¿Cómo estás?",
        example: "¡Hola! ¿Cómo estás?",
        exampleTranslation: "Hi! How are you?",
      },
      French: {
        word: "Comment ça va?",
        example: "Salut! Comment ça va?",
        exampleTranslation: "Hi! How are you?",
      },
      German: {
        word: "Wie geht's?",
        example: "Hallo! Wie geht's?",
        exampleTranslation: "Hi! How are you?",
      },
      Portuguese: {
        word: "Como está?",
        example: "Olá! Como está?",
        exampleTranslation: "Hi! How are you?",
      },
      Japanese: {
        word: "お元気ですか？",
        romanization: "o-genki desu ka",
        example: "こんにちは、お元気ですか？",
        exampleTranslation: "Hello, how are you?",
      },
      Korean: {
        word: "잘 지내세요?",
        romanization: "jal jinaeseyo",
        example: "안녕하세요, 잘 지내세요?",
        exampleTranslation: "Hello, how are you?",
      },
    },
  },
  {
    id: "phrase-nice-to-meet-you",
    english: "nice to meet you",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "Piacere di conoscerti",
        example: "Piacere di conoscerti, sono Anna.",
        exampleTranslation: "Nice to meet you, I'm Anna.",
      },
      Spanish: {
        word: "Mucho gusto",
        example: "Mucho gusto, soy Ana.",
        exampleTranslation: "Nice to meet you, I'm Ana.",
      },
      French: {
        word: "Enchanté",
        example: "Enchanté, je m'appelle Anne.",
        exampleTranslation: "Nice to meet you, my name is Anne.",
      },
      German: {
        word: "Freut mich",
        example: "Freut mich, ich heiße Anna.",
        exampleTranslation: "Nice to meet you, my name is Anna.",
      },
      Portuguese: {
        word: "Muito prazer",
        example: "Muito prazer, sou a Ana.",
        exampleTranslation: "Nice to meet you, I'm Ana.",
      },
      Japanese: {
        word: "はじめまして",
        romanization: "hajimemashite",
        example: "はじめまして、アンナです。",
        exampleTranslation: "Nice to meet you, I'm Anna.",
      },
      Korean: {
        word: "만나서 반갑습니다",
        romanization: "mannaseo bangapseumnida",
        example: "만나서 반갑습니다, 저는 안나예요.",
        exampleTranslation: "Nice to meet you, I'm Anna.",
      },
    },
  },
  {
    id: "phrase-see-you-later",
    english: "see you later",
    partOfSpeech: "phrase",
    translations: {
      Italian: {
        word: "A dopo",
        example: "Devo andare, a dopo!",
        exampleTranslation: "I have to go, see you later!",
      },
      Spanish: {
        word: "Hasta luego",
        example: "Me voy, ¡hasta luego!",
        exampleTranslation: "I'm leaving, see you later!",
      },
      French: {
        word: "À plus tard",
        example: "Je dois y aller, à plus tard!",
        exampleTranslation: "I have to go, see you later!",
      },
      German: {
        word: "Bis später",
        example: "Ich muss los, bis später!",
        exampleTranslation: "I have to go, see you later!",
      },
      Portuguese: {
        word: "Até logo",
        example: "Tenho que ir, até logo!",
        exampleTranslation: "I have to go, see you later!",
      },
      Japanese: {
        word: "またね",
        romanization: "mata ne",
        example: "行かなきゃ、またね！",
        exampleTranslation: "I have to go, see you later!",
      },
      Korean: {
        word: "나중에 봐요",
        romanization: "najunge bwayo",
        example: "가야 해요, 나중에 봐요!",
        exampleTranslation: "I have to go, see you later!",
      },
    },
  },
];
