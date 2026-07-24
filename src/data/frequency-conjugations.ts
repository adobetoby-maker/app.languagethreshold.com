import type { Language } from "@/state/app-state";

/**
 * Full present-tense conjugation + non-finite forms for the 9 frequency
 * starter verbs. Hand-authored (not AI-generated) on purpose: conjugation is
 * a closed set of facts, not context-dependent content, so there's no reason
 * to pay AI latency/cost or risk a malformed response for something
 * deterministic — same reasoning that keeps the SRS scheduler AI-free.
 *
 * Only covers languages that actually conjugate by grammatical person
 * (Spanish, French, German, Italian, Portuguese). Japanese and Korean verbs
 * don't inflect for person/number at all — they conjugate by tense and
 * politeness register instead — so a "io/tu/lui" style table would be
 * linguistically wrong for them. The UI omits this section for those
 * languages rather than force-fit an inapplicable structure.
 */
export interface CommonUse {
  phrase: string;
  translation: string;
}

export interface ConjugationSet {
  infinitive: string;
  pronunciation: string; // approximate phonetic guide, not strict IPA — easier for a beginner to read
  presentTense: {
    firstSingular: string; // io / yo / je / ich / eu
    secondSingular: string; // tu / tú / tu / du / tu
    thirdSingular: string; // lui-lei / él-ella / il-elle / er-sie / ele-ela
    firstPlural: string; // noi / nosotros / nous / wir / nós
    secondPlural: string; // voi / vosotros / vous / ihr / vós
    thirdPlural: string; // loro / ellos / ils / sie / eles
  };
  gerund: string; // -ing form (Partizip I for German)
  pastParticiple: string; // Partizip II for German
  perfectExample: string; // e.g. "ho fatto" (I have done) — shows the participle in use
  commonUses: CommonUse[];
}

export const FREQUENCY_CONJUGATIONS: Record<
  string, // matches FrequencyWordEntry.id
  Partial<Record<Language, ConjugationSet>>
> = {
  can: {
    Italian: {
      infinitive: "potere",
      pronunciation: "poh-TEH-reh",
      presentTense: { firstSingular: "posso", secondSingular: "puoi", thirdSingular: "può", firstPlural: "possiamo", secondPlural: "potete", thirdPlural: "possono" },
      gerund: "potendo",
      pastParticiple: "potuto",
      perfectExample: "ho potuto",
      commonUses: [
        { phrase: "posso aiutarti?", translation: "can I help you?" },
        { phrase: "non posso venire", translation: "I can't come" },
      ],
    },
    Spanish: {
      infinitive: "poder",
      pronunciation: "poh-DEHR",
      presentTense: { firstSingular: "puedo", secondSingular: "puedes", thirdSingular: "puede", firstPlural: "podemos", secondPlural: "podéis", thirdPlural: "pueden" },
      gerund: "pudiendo",
      pastParticiple: "podido",
      perfectExample: "he podido",
      commonUses: [
        { phrase: "¿puedo ayudarte?", translation: "can I help you?" },
        { phrase: "no puedo ir", translation: "I can't go" },
      ],
    },
    French: {
      infinitive: "pouvoir",
      pronunciation: "poo-VWAHR",
      presentTense: { firstSingular: "peux", secondSingular: "peux", thirdSingular: "peut", firstPlural: "pouvons", secondPlural: "pouvez", thirdPlural: "peuvent" },
      gerund: "pouvant",
      pastParticiple: "pu",
      perfectExample: "j'ai pu",
      commonUses: [
        { phrase: "je peux vous aider", translation: "I can help you" },
        { phrase: "on peut y aller", translation: "we can go" },
      ],
    },
    German: {
      infinitive: "können",
      pronunciation: "KUR-nen",
      presentTense: { firstSingular: "kann", secondSingular: "kannst", thirdSingular: "kann", firstPlural: "können", secondPlural: "könnt", thirdPlural: "können" },
      gerund: "könnend",
      pastParticiple: "gekonnt",
      perfectExample: "ich habe gekonnt",
      commonUses: [
        { phrase: "ich kann das machen", translation: "I can do that" },
        { phrase: "kannst du mir helfen?", translation: "can you help me?" },
      ],
    },
    Portuguese: {
      infinitive: "poder",
      pronunciation: "poh-DEHR",
      presentTense: { firstSingular: "posso", secondSingular: "podes", thirdSingular: "pode", firstPlural: "podemos", secondPlural: "podeis", thirdPlural: "podem" },
      gerund: "podendo",
      pastParticiple: "podido",
      perfectExample: "eu pude",
      commonUses: [
        { phrase: "posso ajudar?", translation: "can I help?" },
        { phrase: "não posso ir", translation: "I can't go" },
      ],
    },
  },
  use: {
    Italian: {
      infinitive: "usare",
      pronunciation: "oo-ZAH-reh",
      presentTense: { firstSingular: "uso", secondSingular: "usi", thirdSingular: "usa", firstPlural: "usiamo", secondPlural: "usate", thirdPlural: "usano" },
      gerund: "usando",
      pastParticiple: "usato",
      perfectExample: "ho usato",
      commonUses: [
        { phrase: "posso usare il telefono?", translation: "can I use the phone?" },
        { phrase: "uso spesso questo", translation: "I often use this" },
      ],
    },
    Spanish: {
      infinitive: "usar",
      pronunciation: "oo-SAHR",
      presentTense: { firstSingular: "uso", secondSingular: "usas", thirdSingular: "usa", firstPlural: "usamos", secondPlural: "usáis", thirdPlural: "usan" },
      gerund: "usando",
      pastParticiple: "usado",
      perfectExample: "he usado",
      commonUses: [
        { phrase: "puedo usar tu teléfono", translation: "I can use your phone" },
        { phrase: "lo uso todos los días", translation: "I use it every day" },
      ],
    },
    French: {
      infinitive: "utiliser",
      pronunciation: "oo-tee-lee-ZAY",
      presentTense: { firstSingular: "utilise", secondSingular: "utilises", thirdSingular: "utilise", firstPlural: "utilisons", secondPlural: "utilisez", thirdPlural: "utilisent" },
      gerund: "utilisant",
      pastParticiple: "utilisé",
      perfectExample: "j'ai utilisé",
      commonUses: [
        { phrase: "je peux utiliser ça?", translation: "can I use that?" },
        { phrase: "on l'utilise souvent", translation: "we use it often" },
      ],
    },
    German: {
      infinitive: "benutzen",
      pronunciation: "beh-NOOT-sen",
      presentTense: { firstSingular: "benutze", secondSingular: "benutzt", thirdSingular: "benutzt", firstPlural: "benutzen", secondPlural: "benutzt", thirdPlural: "benutzen" },
      gerund: "benutzend",
      pastParticiple: "benutzt",
      perfectExample: "ich habe benutzt",
      commonUses: [
        { phrase: "darf ich das benutzen?", translation: "may I use that?" },
        { phrase: "ich benutze es täglich", translation: "I use it daily" },
      ],
    },
    Portuguese: {
      infinitive: "usar",
      pronunciation: "oo-ZAHR",
      presentTense: { firstSingular: "uso", secondSingular: "usas", thirdSingular: "usa", firstPlural: "usamos", secondPlural: "usais", thirdPlural: "usam" },
      gerund: "usando",
      pastParticiple: "usado",
      perfectExample: "eu usei",
      commonUses: [
        { phrase: "posso usar isso?", translation: "can I use that?" },
        { phrase: "uso todos os dias", translation: "I use it every day" },
      ],
    },
  },
  do: {
    Italian: {
      infinitive: "fare",
      pronunciation: "FAH-reh",
      presentTense: { firstSingular: "faccio", secondSingular: "fai", thirdSingular: "fa", firstPlural: "facciamo", secondPlural: "fate", thirdPlural: "fanno" },
      gerund: "facendo",
      pastParticiple: "fatto",
      perfectExample: "ho fatto",
      commonUses: [
        { phrase: "cosa fai?", translation: "what are you doing?" },
        { phrase: "ho molto da fare", translation: "I have a lot to do" },
      ],
    },
    Spanish: {
      infinitive: "hacer",
      pronunciation: "ah-SEHR",
      presentTense: { firstSingular: "hago", secondSingular: "haces", thirdSingular: "hace", firstPlural: "hacemos", secondPlural: "hacéis", thirdPlural: "hacen" },
      gerund: "haciendo",
      pastParticiple: "hecho",
      perfectExample: "he hecho",
      commonUses: [
        { phrase: "¿qué haces?", translation: "what are you doing?" },
        { phrase: "tengo mucho que hacer", translation: "I have a lot to do" },
      ],
    },
    French: {
      infinitive: "faire",
      pronunciation: "FEHR",
      presentTense: { firstSingular: "fais", secondSingular: "fais", thirdSingular: "fait", firstPlural: "faisons", secondPlural: "faites", thirdPlural: "font" },
      gerund: "faisant",
      pastParticiple: "fait",
      perfectExample: "j'ai fait",
      commonUses: [
        { phrase: "qu'est-ce que tu fais?", translation: "what are you doing?" },
        { phrase: "j'ai beaucoup à faire", translation: "I have a lot to do" },
      ],
    },
    German: {
      infinitive: "machen",
      pronunciation: "MAH-khen",
      presentTense: { firstSingular: "mache", secondSingular: "machst", thirdSingular: "macht", firstPlural: "machen", secondPlural: "macht", thirdPlural: "machen" },
      gerund: "machend",
      pastParticiple: "gemacht",
      perfectExample: "ich habe gemacht",
      commonUses: [
        { phrase: "was machst du gerade?", translation: "what are you doing right now?" },
        { phrase: "ich mache das gleich", translation: "I'll do that right away" },
      ],
    },
    Portuguese: {
      infinitive: "fazer",
      pronunciation: "fah-ZEHR",
      presentTense: { firstSingular: "faço", secondSingular: "fazes", thirdSingular: "faz", firstPlural: "fazemos", secondPlural: "fazeis", thirdPlural: "fazem" },
      gerund: "fazendo",
      pastParticiple: "feito",
      perfectExample: "eu fiz",
      commonUses: [
        { phrase: "o que você está fazendo?", translation: "what are you doing?" },
        { phrase: "tenho muito a fazer", translation: "I have a lot to do" },
      ],
    },
  },
  come: {
    Italian: {
      infinitive: "venire",
      pronunciation: "veh-NEE-reh",
      presentTense: { firstSingular: "vengo", secondSingular: "vieni", thirdSingular: "viene", firstPlural: "veniamo", secondPlural: "venite", thirdPlural: "vengono" },
      gerund: "venendo",
      pastParticiple: "venuto",
      perfectExample: "sono venuto",
      commonUses: [
        { phrase: "puoi venire?", translation: "can you come?" },
        { phrase: "vengo subito", translation: "I'm coming right away" },
      ],
    },
    Spanish: {
      infinitive: "venir",
      pronunciation: "beh-NEER",
      presentTense: { firstSingular: "vengo", secondSingular: "vienes", thirdSingular: "viene", firstPlural: "venimos", secondPlural: "venís", thirdPlural: "vienen" },
      gerund: "viniendo",
      pastParticiple: "venido",
      perfectExample: "he venido",
      commonUses: [
        { phrase: "¿puedes venir?", translation: "can you come?" },
        { phrase: "ya vengo", translation: "I'm coming" },
      ],
    },
    French: {
      infinitive: "venir",
      pronunciation: "vuh-NEER",
      presentTense: { firstSingular: "viens", secondSingular: "viens", thirdSingular: "vient", firstPlural: "venons", secondPlural: "venez", thirdPlural: "viennent" },
      gerund: "venant",
      pastParticiple: "venu",
      perfectExample: "je suis venu",
      commonUses: [
        { phrase: "tu peux venir?", translation: "can you come?" },
        { phrase: "je viens tout de suite", translation: "I'm coming right away" },
      ],
    },
    German: {
      infinitive: "kommen",
      pronunciation: "KOM-men",
      presentTense: { firstSingular: "komme", secondSingular: "kommst", thirdSingular: "kommt", firstPlural: "kommen", secondPlural: "kommt", thirdPlural: "kommen" },
      gerund: "kommend",
      pastParticiple: "gekommen",
      perfectExample: "ich bin gekommen",
      commonUses: [
        { phrase: "kannst du kommen?", translation: "can you come?" },
        { phrase: "ich komme sofort", translation: "I'm coming right away" },
      ],
    },
    Portuguese: {
      infinitive: "vir",
      pronunciation: "VEER",
      presentTense: { firstSingular: "venho", secondSingular: "vens", thirdSingular: "vem", firstPlural: "vimos", secondPlural: "vindes", thirdPlural: "vêm" },
      gerund: "vindo",
      pastParticiple: "vindo",
      perfectExample: "eu vim",
      commonUses: [
        { phrase: "você pode vir?", translation: "can you come?" },
        { phrase: "eu já venho", translation: "I'm coming right away" },
      ],
    },
  },
  go: {
    Italian: {
      infinitive: "andare",
      pronunciation: "ahn-DAH-reh",
      presentTense: { firstSingular: "vado", secondSingular: "vai", thirdSingular: "va", firstPlural: "andiamo", secondPlural: "andate", thirdPlural: "vanno" },
      gerund: "andando",
      pastParticiple: "andato",
      perfectExample: "sono andato",
      commonUses: [
        { phrase: "devo andare", translation: "I have to go" },
        { phrase: "andiamo!", translation: "let's go!" },
      ],
    },
    Spanish: {
      infinitive: "ir",
      pronunciation: "EER",
      presentTense: { firstSingular: "voy", secondSingular: "vas", thirdSingular: "va", firstPlural: "vamos", secondPlural: "vais", thirdPlural: "van" },
      gerund: "yendo",
      pastParticiple: "ido",
      perfectExample: "he ido",
      commonUses: [
        { phrase: "tengo que ir", translation: "I have to go" },
        { phrase: "¡vamos!", translation: "let's go!" },
      ],
    },
    French: {
      infinitive: "aller",
      pronunciation: "ah-LAY",
      presentTense: { firstSingular: "vais", secondSingular: "vas", thirdSingular: "va", firstPlural: "allons", secondPlural: "allez", thirdPlural: "vont" },
      gerund: "allant",
      pastParticiple: "allé",
      perfectExample: "je suis allé",
      commonUses: [
        { phrase: "je dois y aller", translation: "I have to go" },
        { phrase: "allons-y!", translation: "let's go!" },
      ],
    },
    German: {
      infinitive: "gehen",
      pronunciation: "GAY-en",
      presentTense: { firstSingular: "gehe", secondSingular: "gehst", thirdSingular: "geht", firstPlural: "gehen", secondPlural: "geht", thirdPlural: "gehen" },
      gerund: "gehend",
      pastParticiple: "gegangen",
      perfectExample: "ich bin gegangen",
      commonUses: [
        { phrase: "ich muss gehen", translation: "I have to go" },
        { phrase: "gehen wir!", translation: "let's go!" },
      ],
    },
    Portuguese: {
      infinitive: "ir",
      pronunciation: "EER",
      presentTense: { firstSingular: "vou", secondSingular: "vais", thirdSingular: "vai", firstPlural: "vamos", secondPlural: "ides", thirdPlural: "vão" },
      gerund: "indo",
      pastParticiple: "ido",
      perfectExample: "eu fui",
      commonUses: [
        { phrase: "tenho que ir", translation: "I have to go" },
        { phrase: "vamos!", translation: "let's go!" },
      ],
    },
  },
  say: {
    Italian: {
      infinitive: "dire",
      pronunciation: "DEE-reh",
      presentTense: { firstSingular: "dico", secondSingular: "dici", thirdSingular: "dice", firstPlural: "diciamo", secondPlural: "dite", thirdPlural: "dicono" },
      gerund: "dicendo",
      pastParticiple: "detto",
      perfectExample: "ho detto",
      commonUses: [
        { phrase: "cosa vuoi dire?", translation: "what do you want to say?" },
        { phrase: "non so cosa dire", translation: "I don't know what to say" },
      ],
    },
    Spanish: {
      infinitive: "decir",
      pronunciation: "deh-SEER",
      presentTense: { firstSingular: "digo", secondSingular: "dices", thirdSingular: "dice", firstPlural: "decimos", secondPlural: "decís", thirdPlural: "dicen" },
      gerund: "diciendo",
      pastParticiple: "dicho",
      perfectExample: "he dicho",
      commonUses: [
        { phrase: "¿qué quieres decir?", translation: "what do you want to say?" },
        { phrase: "no sé qué decir", translation: "I don't know what to say" },
      ],
    },
    French: {
      infinitive: "dire",
      pronunciation: "DEER",
      presentTense: { firstSingular: "dis", secondSingular: "dis", thirdSingular: "dit", firstPlural: "disons", secondPlural: "dites", thirdPlural: "disent" },
      gerund: "disant",
      pastParticiple: "dit",
      perfectExample: "j'ai dit",
      commonUses: [
        { phrase: "qu'est-ce que tu veux dire?", translation: "what do you want to say?" },
        { phrase: "je ne sais pas quoi dire", translation: "I don't know what to say" },
      ],
    },
    German: {
      infinitive: "sagen",
      pronunciation: "ZAH-gen",
      presentTense: { firstSingular: "sage", secondSingular: "sagst", thirdSingular: "sagt", firstPlural: "sagen", secondPlural: "sagt", thirdPlural: "sagen" },
      gerund: "sagend",
      pastParticiple: "gesagt",
      perfectExample: "ich habe gesagt",
      commonUses: [
        { phrase: "was willst du sagen?", translation: "what do you want to say?" },
        { phrase: "ich weiß nicht, was ich sagen soll", translation: "I don't know what to say" },
      ],
    },
    Portuguese: {
      infinitive: "dizer",
      pronunciation: "dee-ZEHR",
      presentTense: { firstSingular: "digo", secondSingular: "dizes", thirdSingular: "diz", firstPlural: "dizemos", secondPlural: "dizeis", thirdPlural: "dizem" },
      gerund: "dizendo",
      pastParticiple: "dito",
      perfectExample: "eu disse",
      commonUses: [
        { phrase: "o que você quer dizer?", translation: "what do you want to say?" },
        { phrase: "não sei o que dizer", translation: "I don't know what to say" },
      ],
    },
  },
  learn: {
    Italian: {
      infinitive: "imparare",
      pronunciation: "eem-pah-RAH-reh",
      presentTense: { firstSingular: "imparo", secondSingular: "impari", thirdSingular: "impara", firstPlural: "impariamo", secondPlural: "imparate", thirdPlural: "imparano" },
      gerund: "imparando",
      pastParticiple: "imparato",
      perfectExample: "ho imparato",
      commonUses: [
        { phrase: "voglio imparare l'italiano", translation: "I want to learn Italian" },
        { phrase: "sto imparando molto", translation: "I'm learning a lot" },
      ],
    },
    Spanish: {
      infinitive: "aprender",
      pronunciation: "ah-prehn-DEHR",
      presentTense: { firstSingular: "aprendo", secondSingular: "aprendes", thirdSingular: "aprende", firstPlural: "aprendemos", secondPlural: "aprendéis", thirdPlural: "aprenden" },
      gerund: "aprendiendo",
      pastParticiple: "aprendido",
      perfectExample: "he aprendido",
      commonUses: [
        { phrase: "quiero aprender español", translation: "I want to learn Spanish" },
        { phrase: "estoy aprendiendo mucho", translation: "I'm learning a lot" },
      ],
    },
    French: {
      infinitive: "apprendre",
      pronunciation: "ah-PRAHN-druh",
      presentTense: { firstSingular: "apprends", secondSingular: "apprends", thirdSingular: "apprend", firstPlural: "apprenons", secondPlural: "apprenez", thirdPlural: "apprennent" },
      gerund: "apprenant",
      pastParticiple: "appris",
      perfectExample: "j'ai appris",
      commonUses: [
        { phrase: "je veux apprendre le français", translation: "I want to learn French" },
        { phrase: "j'apprends beaucoup", translation: "I'm learning a lot" },
      ],
    },
    German: {
      infinitive: "lernen",
      pronunciation: "LEHR-nen",
      presentTense: { firstSingular: "lerne", secondSingular: "lernst", thirdSingular: "lernt", firstPlural: "lernen", secondPlural: "lernt", thirdPlural: "lernen" },
      gerund: "lernend",
      pastParticiple: "gelernt",
      perfectExample: "ich habe gelernt",
      commonUses: [
        { phrase: "ich möchte Deutsch lernen", translation: "I want to learn German" },
        { phrase: "ich lerne viel", translation: "I'm learning a lot" },
      ],
    },
    Portuguese: {
      infinitive: "aprender",
      pronunciation: "ah-prehn-DEHR",
      presentTense: { firstSingular: "aprendo", secondSingular: "aprendes", thirdSingular: "aprende", firstPlural: "aprendemos", secondPlural: "aprendeis", thirdPlural: "aprendem" },
      gerund: "aprendendo",
      pastParticiple: "aprendido",
      perfectExample: "eu aprendi",
      commonUses: [
        { phrase: "quero aprender português", translation: "I want to learn Portuguese" },
        { phrase: "estou aprendendo muito", translation: "I'm learning a lot" },
      ],
    },
  },
  tell: {
    Italian: {
      infinitive: "raccontare",
      pronunciation: "rahk-kohn-TAH-reh",
      presentTense: { firstSingular: "racconto", secondSingular: "racconti", thirdSingular: "racconta", firstPlural: "raccontiamo", secondPlural: "raccontate", thirdPlural: "raccontano" },
      gerund: "raccontando",
      pastParticiple: "raccontato",
      perfectExample: "ho raccontato",
      commonUses: [
        { phrase: "raccontami tutto", translation: "tell me everything" },
        { phrase: "mi ha raccontato una storia", translation: "he/she told me a story" },
      ],
    },
    Spanish: {
      infinitive: "contar",
      pronunciation: "kohn-TAHR",
      presentTense: { firstSingular: "cuento", secondSingular: "cuentas", thirdSingular: "cuenta", firstPlural: "contamos", secondPlural: "contáis", thirdPlural: "cuentan" },
      gerund: "contando",
      pastParticiple: "contado",
      perfectExample: "he contado",
      commonUses: [
        { phrase: "cuéntame todo", translation: "tell me everything" },
        { phrase: "me contó una historia", translation: "he/she told me a story" },
      ],
    },
    French: {
      infinitive: "raconter",
      pronunciation: "rah-kohn-TAY",
      presentTense: { firstSingular: "raconte", secondSingular: "racontes", thirdSingular: "raconte", firstPlural: "racontons", secondPlural: "racontez", thirdPlural: "racontent" },
      gerund: "racontant",
      pastParticiple: "raconté",
      perfectExample: "j'ai raconté",
      commonUses: [
        { phrase: "raconte-moi tout", translation: "tell me everything" },
        { phrase: "il m'a raconté une histoire", translation: "he told me a story" },
      ],
    },
    German: {
      infinitive: "erzählen",
      pronunciation: "ehr-TSAY-len",
      presentTense: { firstSingular: "erzähle", secondSingular: "erzählst", thirdSingular: "erzählt", firstPlural: "erzählen", secondPlural: "erzählt", thirdPlural: "erzählen" },
      gerund: "erzählend",
      pastParticiple: "erzählt",
      perfectExample: "ich habe erzählt",
      commonUses: [
        { phrase: "erzähl mir alles", translation: "tell me everything" },
        { phrase: "sie hat mir eine Geschichte erzählt", translation: "she told me a story" },
      ],
    },
    Portuguese: {
      infinitive: "contar",
      pronunciation: "kohn-TAHR",
      presentTense: { firstSingular: "conto", secondSingular: "contas", thirdSingular: "conta", firstPlural: "contamos", secondPlural: "contais", thirdPlural: "contam" },
      gerund: "contando",
      pastParticiple: "contado",
      perfectExample: "eu contei",
      commonUses: [
        { phrase: "conte-me tudo", translation: "tell me everything" },
        { phrase: "ele me contou uma história", translation: "he told me a story" },
      ],
    },
  },
  speak: {
    Italian: {
      infinitive: "parlare",
      pronunciation: "pahr-LAH-reh",
      presentTense: { firstSingular: "parlo", secondSingular: "parli", thirdSingular: "parla", firstPlural: "parliamo", secondPlural: "parlate", thirdPlural: "parlano" },
      gerund: "parlando",
      pastParticiple: "parlato",
      perfectExample: "ho parlato",
      commonUses: [
        { phrase: "parli italiano?", translation: "do you speak Italian?" },
        { phrase: "parlo un po'", translation: "I speak a little" },
      ],
    },
    Spanish: {
      infinitive: "hablar",
      pronunciation: "ah-BLAHR",
      presentTense: { firstSingular: "hablo", secondSingular: "hablas", thirdSingular: "habla", firstPlural: "hablamos", secondPlural: "habláis", thirdPlural: "hablan" },
      gerund: "hablando",
      pastParticiple: "hablado",
      perfectExample: "he hablado",
      commonUses: [
        { phrase: "¿hablas español?", translation: "do you speak Spanish?" },
        { phrase: "hablo un poco", translation: "I speak a little" },
      ],
    },
    French: {
      infinitive: "parler",
      pronunciation: "pahr-LAY",
      presentTense: { firstSingular: "parle", secondSingular: "parles", thirdSingular: "parle", firstPlural: "parlons", secondPlural: "parlez", thirdPlural: "parlent" },
      gerund: "parlant",
      pastParticiple: "parlé",
      perfectExample: "j'ai parlé",
      commonUses: [
        { phrase: "tu parles français?", translation: "do you speak French?" },
        { phrase: "je parle un peu", translation: "I speak a little" },
      ],
    },
    German: {
      infinitive: "sprechen",
      pronunciation: "SHPREH-khen",
      presentTense: { firstSingular: "spreche", secondSingular: "sprichst", thirdSingular: "spricht", firstPlural: "sprechen", secondPlural: "sprecht", thirdPlural: "sprechen" },
      gerund: "sprechend",
      pastParticiple: "gesprochen",
      perfectExample: "ich habe gesprochen",
      commonUses: [
        { phrase: "sprichst du Deutsch?", translation: "do you speak German?" },
        { phrase: "ich spreche ein bisschen", translation: "I speak a little" },
      ],
    },
    Portuguese: {
      infinitive: "falar",
      pronunciation: "fah-LAHR",
      presentTense: { firstSingular: "falo", secondSingular: "falas", thirdSingular: "fala", firstPlural: "falamos", secondPlural: "falais", thirdPlural: "falam" },
      gerund: "falando",
      pastParticiple: "falado",
      perfectExample: "eu falei",
      commonUses: [
        { phrase: "você fala português?", translation: "do you speak Portuguese?" },
        { phrase: "eu falo um pouco", translation: "I speak a little" },
      ],
    },
  },
};
