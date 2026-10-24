import type { DailyLivingTopic } from "./core-speaking";

/** Draft everyday conversation practice; explicit openings preserve the partner’s role. */
export const EVERYDAY_RELATIONSHIP_TOPICS: DailyLivingTopic[] = [
  {
    id: "parents-check-in",
    title: "Check in with your parents",
    objective:
      "Ask how things are going, listen and ask a follow-up question, share one update, and arrange your next call.",
    partnerRole: "Your parent catching up with you",
    concepts: ["family", "update", "follow-up question", "next call"],
    relationshipGroup: "Family & parents",
    level: "A1",
    openingLines: {
      English: "It is good to hear from you. How has your week been?",
      Spanish: "Qué gusto saber de ti. ¿Cómo te ha ido esta semana?",
      Italian: "Che bello sentirti. Come è andata la tua settimana?",
      Japanese: "声が聞けてうれしいよ。今週はどうだった？",
      Chinese: "很高兴听到你的声音。你这周过得怎么样？",
    },
  },
  {
    id: "family-plans",
    title: "Make plans with family",
    objective:
      "Suggest a family meal or visit, ask what works for everyone, and confirm the day, place, and what to bring.",
    partnerRole: "A parent arranging a family gathering",
    concepts: ["family visit", "day", "place", "what to bring"],
    relationshipGroup: "Family & parents",
    level: "A1",
    openingLines: {
      English: "Shall we have a family meal this weekend? What day works for you?",
      Spanish: "¿Comemos en familia este fin de semana? ¿Qué día te viene bien?",
      Italian: "Mangiamo insieme in famiglia questo fine settimana? Quale giorno ti va bene?",
      Japanese: "週末に家族で食事をしない？何曜日がいい？",
      Chinese: "这个周末我们一家人一起吃饭好吗？你哪天方便？",
    },
  },
  {
    id: "parent-advice",
    title: "Ask a parent for advice",
    objective:
      "Describe an everyday decision, ask for your parent’s perspective, explain your own preference, and say what you will try next.",
    partnerRole: "Your parent listening to an everyday decision",
    concepts: ["decision", "advice", "preference", "next step"],
    relationshipGroup: "Family & parents",
    level: "A2",
    openingLines: {
      English: "You said you wanted my advice. What are you trying to decide?",
      Spanish: "Dijiste que querías mi consejo. ¿Qué estás tratando de decidir?",
      Italian: "Hai detto che volevi un mio consiglio. Che decisione devi prendere?",
      Japanese: "相談したいことがあると言っていたね。何を決めようとしているの？",
      Chinese: "你说想听听我的建议。你正在考虑什么事？",
    },
  },
  {
    id: "parent-disagreement",
    title: "Disagree respectfully with a parent",
    objective:
      "Explain a difference of opinion calmly, ask about your parent’s concern, state your own boundary, and agree how to keep talking respectfully.",
    partnerRole: "Your parent with a different opinion",
    concepts: ["opinion", "listening", "boundary", "respect"],
    relationshipGroup: "Family & parents",
    level: "A2",
    openingLines: {
      English: "I see this differently, but I want to understand your point of view. Can we talk?",
      Spanish: "Yo lo veo de otra manera, pero quiero entender tu punto de vista. ¿Podemos hablar?",
      Italian: "La vedo diversamente, ma voglio capire il tuo punto di vista. Possiamo parlarne?",
      Japanese: "私は少し違う考えだけれど、あなたの気持ちも知りたい。話せる？",
      Chinese: "我的看法不太一样，但我想了解你的想法。我们能聊聊吗？",
    },
  },
  {
    id: "new-friend",
    title: "Get to know a new friend",
    objective:
      "Introduce yourself, ask about interests, share something you enjoy, and suggest a simple way to meet again.",
    partnerRole: "A new friend at a shared activity",
    concepts: ["introduction", "interests", "follow-up", "meet again"],
    relationshipGroup: "Friends",
    level: "A1",
    openingLines: {
      English: "Hi, I do not think we have met. What do you like doing in your free time?",
      Spanish: "Hola, creo que no nos conocemos. ¿Qué te gusta hacer en tu tiempo libre?",
      Italian: "Ciao, credo che non ci conosciamo. Che cosa ti piace fare nel tempo libero?",
      Japanese: "こんにちは。初めまして。休みの日は何をするのが好きですか。",
      Chinese: "你好，我们好像还不认识。你空闲时喜欢做什么？",
    },
  },
  {
    id: "friend-plans",
    title: "Make plans with friends",
    objective:
      "Suggest an activity, ask about time and preferences, offer an alternative, and confirm where you will meet.",
    partnerRole: "A friend planning time together",
    concepts: ["activity", "availability", "alternative", "meeting place"],
    relationshipGroup: "Friends",
    level: "A1",
    openingLines: {
      English: "Are you free this weekend? We could do something together.",
      Spanish: "¿Tienes tiempo este fin de semana? Podríamos hacer algo juntos.",
      Italian: "Hai tempo questo fine settimana? Potremmo fare qualcosa insieme.",
      Japanese: "週末は空いている？一緒に何かしない？",
      Chinese: "你这个周末有空吗？我们可以一起做点什么。",
    },
  },
  {
    id: "friend-catch-up",
    title: "Catch up with a friend",
    objective:
      "Ask about recent news, share an update, follow up on something your friend says, and end the conversation warmly.",
    partnerRole: "A friend you have not seen for a while",
    concepts: ["recent news", "update", "follow-up", "warm closing"],
    relationshipGroup: "Friends",
    level: "A1",
    openingLines: {
      English: "It has been a while! What have you been up to lately?",
      Spanish: "¡Cuánto tiempo! ¿Qué has hecho últimamente?",
      Italian: "È da un po’ che non ci vediamo! Che cosa hai fatto ultimamente?",
      Japanese: "久しぶり！最近どうしていた？",
      Chinese: "好久不见！你最近在忙什么？",
    },
  },
  {
    id: "support-friend",
    title: "Support a friend having a hard day",
    objective:
      "Ask how your friend feels, listen without rushing to fix things, ask whether they want advice or company, and offer one practical way to help.",
    partnerRole: "A friend after a difficult day at work",
    concepts: ["feelings", "listening", "company", "practical help"],
    relationshipGroup: "Friends",
    level: "A2",
    openingLines: {
      English: "Today was a difficult day at work. Do you have a few minutes to talk?",
      Spanish: "Hoy fue un día difícil en el trabajo. ¿Tienes unos minutos para hablar?",
      Italian: "Oggi è stata una giornata difficile al lavoro. Hai qualche minuto per parlare?",
      Japanese: "今日は仕事で大変だったんだ。少し話を聞いてもらえる？",
      Chinese: "今天工作不太顺利。你有几分钟可以聊聊吗？",
    },
  },
  {
    id: "friendship-repair",
    title: "Clear up a misunderstanding with a friend",
    objective:
      "Explain what you meant, ask how your friend understood it, apologize for your part, and agree how to avoid the misunderstanding next time.",
    partnerRole: "A friend who misunderstood a recent message",
    concepts: ["clarification", "feelings", "apology", "repair"],
    relationshipGroup: "Friends",
    level: "A2",
    openingLines: {
      English: "I was not sure how to take your message yesterday. Can we clear it up?",
      Spanish: "No supe cómo interpretar tu mensaje de ayer. ¿Podemos aclararlo?",
      Italian: "Non sapevo come interpretare il tuo messaggio di ieri. Possiamo chiarire?",
      Japanese: "昨日のメッセージの意味がよく分からなかったんだ。少し話せる？",
      Chinese: "我不太明白你昨天那条消息的意思。我们能说清楚吗？",
    },
  },
  {
    id: "first-date",
    title: "Get to know someone on a first date",
    objective:
      "Ask open questions about interests and everyday life, share something about yourself, and respect any topic the other person prefers not to discuss.",
    partnerRole: "An adult getting to know the learner on a first date",
    concepts: ["interests", "questions", "sharing", "comfort"],
    relationshipGroup: "Dating & partners",
    level: "A1",
    openingLines: {
      English: "I am glad we could meet. What do you enjoy doing outside work?",
      Spanish: "Me alegra que hayamos podido vernos. ¿Qué te gusta hacer fuera del trabajo?",
      Italian: "Che bello poterci vedere. Che cosa ti piace fare fuori dal lavoro?",
      Japanese: "会えてうれしいです。仕事以外では何をするのが好きですか。",
      Chinese: "很高兴能见到你。工作之外，你喜欢做什么？",
    },
    riskClass: "intimacy",
  },
  {
    id: "date-preferences",
    title: "Plan a date you both enjoy",
    objective:
      "Suggest a public activity, ask about preferences and availability, respond kindly to a different suggestion, and agree on a time and meeting place.",
    partnerRole: "An adult planning a date with the learner",
    concepts: ["activity", "preferences", "availability", "agreement"],
    relationshipGroup: "Dating & partners",
    level: "A1",
    openingLines: {
      English: "Would you rather meet for coffee or go for a walk? I am open to another idea.",
      Spanish: "¿Prefieres tomar un café o dar un paseo? También podemos hacer otra cosa.",
      Italian:
        "Preferisci prendere un caffè o fare una passeggiata? Possiamo anche fare qualcos’altro.",
      Japanese: "コーヒーを飲むのと散歩するのと、どちらがいいですか。ほかの案でもいいですよ。",
      Chinese: "你想喝杯咖啡，还是去散步？有别的想法也可以。",
    },
    riskClass: "intimacy",
  },
  {
    id: "after-date",
    title: "Follow up after a date",
    objective:
      "Thank the other person, say honestly whether you would like to meet again, suggest a next step if appropriate, and accept their answer without pressure.",
    partnerRole: "An adult following up after a first date",
    concepts: ["thanks", "honesty", "invitation", "respectful refusal"],
    relationshipGroup: "Dating & partners",
    level: "A2",
    openingLines: {
      English: "Thank you for yesterday. How did you feel about our time together?",
      Spanish: "Gracias por la cita de ayer. ¿Cómo te sentiste durante nuestra cita?",
      Italian: "Grazie per ieri. Che ne pensi del nostro incontro?",
      Japanese: "昨日はありがとうございました。一緒に過ごしてどうでしたか。",
      Chinese: "谢谢你昨天和我见面。你觉得我们相处得怎么样？",
    },
    riskClass: "intimacy",
  },
];
