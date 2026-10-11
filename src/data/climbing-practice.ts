export const TRAVEL_PHRASES: Array<{ en: string; translations: Record<string, string> }> = [
  {
    en: "Where is the crag?",
    translations: {
      Spanish: "¿Dónde está el sector?",
      Portuguese: "Onde fica o paredão?",
      French: "Où est la falaise ?",
      German: "Wo ist der Fels?",
      Italian: "Dov'è la falesia?",
      Japanese: "岩場はどこですか？",
      Korean: "암장이 어디에 있나요?",
    },
  },
  {
    en: "How long is the approach?",
    translations: {
      Spanish: "¿Cuánto tiempo de aproximación?",
      Portuguese: "Quanto tempo de aproximação?",
      French: "Combien de temps d'approche ?",
      German: "Wie lang ist der Zustieg?",
      Italian: "Quanto è lunga l'avvicinamento?",
      Japanese: "アプローチはどのくらいかかりますか？",
      Korean: "어프로치가 얼마나 걸려요?",
    },
  },
  {
    en: "Is this route bolted?",
    translations: {
      Spanish: "¿Está equipada esta vía?",
      Portuguese: "Esta via tem grampos?",
      French: "Cette voie est-elle équipée ?",
      German: "Ist diese Route gebohrt?",
      Italian: "Questa via è attrezzata?",
      Japanese: "このルートはボルト打ちですか？",
      Korean: "이 루트는 볼트 루트인가요?",
    },
  },
  {
    en: "Can I rent gear here?",
    translations: {
      Spanish: "¿Puedo alquilar equipo aquí?",
      Portuguese: "Posso alugar equipamento aqui?",
      French: "Puis-je louer du matériel ici ?",
      German: "Kann ich hier Ausrüstung leihen?",
      Italian: "Posso noleggiare l'attrezzatura qui?",
      Japanese: "ここで装備を借りられますか？",
      Korean: "여기서 장비를 빌릴 수 있나요?",
    },
  },
  {
    en: "What is the grade of this route?",
    translations: {
      Spanish: "¿Cuál es el grado de esta vía?",
      Portuguese: "Qual é a graduação desta via?",
      French: "Quel est le grade de cette voie ?",
      German: "Was ist der Schwierigkeitsgrad dieser Route?",
      Italian: "Qual è il grado di questa via?",
      Japanese: "このルートのグレードは何ですか？",
      Korean: "이 루트의 등급이 뭐예요?",
    },
  },
  {
    en: "Are the bolts safe?",
    translations: {
      Spanish: "¿Los parabolts están en buen estado?",
      Portuguese: "Os grampos estão seguros?",
      French: "Les spits sont-ils en bon état ?",
      German: "Sind die Haken sicher?",
      Italian: "I fix sono sicuri?",
      Japanese: "ボルトは安全ですか？",
      Korean: "볼트가 안전한가요?",
    },
  },
  {
    en: "We need to descend before dark.",
    translations: {
      Spanish: "Necesitamos bajar antes de que oscurezca.",
      Portuguese: "Precisamos descer antes de escurecer.",
      French: "On doit descendre avant la nuit.",
      German: "Wir müssen vor dem Dunkelwerden absteigen.",
      Italian: "Dobbiamo scendere prima che faccia buio.",
      Japanese: "暗くなる前に下山しなければなりません。",
      Korean: "어두워지기 전에 내려가야 해요.",
    },
  },
  {
    en: "Is there a local guide available?",
    translations: {
      Spanish: "¿Hay guía local disponible?",
      Portuguese: "Tem guia local disponível?",
      French: "Y a-t-il un guide local disponible ?",
      German: "Gibt es einen lokalen Führer?",
      Italian: "C'è una guida locale disponibile?",
      Japanese: "地元のガイドはいますか？",
      Korean: "현지 가이드가 있나요?",
    },
  },
  {
    en: "Where can I buy chalk?",
    translations: {
      Spanish: "¿Dónde puedo comprar magnesio?",
      Portuguese: "Onde posso comprar magnésio?",
      French: "Où puis-je acheter de la magnésie ?",
      German: "Wo kann ich Magnesia kaufen?",
      Italian: "Dove posso comprare la magnesite?",
      Japanese: "チョークはどこで買えますか？",
      Korean: "초크는 어디서 살 수 있나요?",
    },
  },
  {
    en: "Is there shade in the afternoon?",
    translations: {
      Spanish: "¿Hay sombra por la tarde?",
      Portuguese: "Tem sombra à tarde?",
      French: "Y a-t-il de l'ombre l'après-midi ?",
      German: "Gibt es nachmittags Schatten?",
      Italian: "C'è ombra nel pomeriggio?",
      Japanese: "午後は日陰がありますか？",
      Korean: "오후에 그늘이 있나요?",
    },
  },
];

export const KNOT_STEPS: Array<{ step: number; en: string; translations: Record<string, string> }> =
  [
    {
      step: 1,
      en: "Thread the rope through both loops of your harness.",
      translations: {
        Spanish: "Pase la cuerda por los dos anillos del arnés.",
        Portuguese: "Passe a corda pelos dois anéis do arnês.",
        French: "Passez la corde dans les deux boucles du baudrier.",
        German: "Führen Sie das Seil durch beide Schlaufen des Klettergurts.",
        Italian: "Passa la corda attraverso entrambi gli anelli dell'imbrago.",
        Japanese: "ハーネスの両方のループにロープを通します。",
        Korean: "하네스의 두 고리에 로프를 통과시킵니다.",
      },
    },
    {
      step: 2,
      en: "Make a loop — leaving about 60 cm of rope free.",
      translations: {
        Spanish: "Haz un bucle — dejando unos 60 cm de cuerda libre.",
        Portuguese: "Faça uma alça — deixando cerca de 60 cm de corda livre.",
        French: "Faites une boucle — en laissant environ 60 cm de corde libre.",
        German: "Machen Sie eine Schlaufe — und lassen Sie ca. 60 cm Seil frei.",
        Italian: "Fai un cappio — lasciando circa 60 cm di corda libera.",
        Japanese: "ループを作ります — 約60cmのロープを残します。",
        Korean: "루프를 만들고 약 60cm의 로프를 여유있게 남깁니다.",
      },
    },
    {
      step: 3,
      en: "Pass the free end through the loop twice — forming a figure eight.",
      translations: {
        Spanish: "Pase el extremo libre por el bucle dos veces — formando un ocho.",
        Portuguese: "Passe a ponta livre pela alça duas vezes — formando um nó oito.",
        French: "Passez le bout libre dans la boucle deux fois — pour former un huit.",
        German: "Führen Sie das freie Ende zweimal durch die Schlaufe — um eine Acht zu formen.",
        Italian: "Passa l'estremità libera nel cappio due volte — formando un otto.",
        Japanese: "フリーエンドをループに2回通します — 8の字を作ります。",
        Korean: "자유 끝을 루프에 두 번 통과시킵니다 — 8자 모양을 만듭니다.",
      },
    },
    {
      step: 4,
      en: "Retrace the eight back through both harness loops exactly.",
      translations: {
        Spanish: "Rehaz el ocho exactamente por los dos anillos del arnés.",
        Portuguese: "Refaça o oito pelos dois anéis do arnês exatamente.",
        French: "Refaites le huit exactement dans les deux boucles du baudrier.",
        German: "Verfolgen Sie die Acht genau durch beide Gurtschlaufen zurück.",
        Italian: "Ritracciate l'otto esattamente attraverso i due anelli dell'imbrago.",
        Japanese: "ハーネスの両ループを通って8の字を正確にたどり直します。",
        Korean: "하네스의 두 고리를 통해 8자를 정확히 되돌아갑니다.",
      },
    },
    {
      step: 5,
      en: "Dress the knot — all strands parallel, no twists.",
      translations: {
        Spanish: "Ajusta el nudo — todas las partes paralelas, sin torsiones.",
        Portuguese: "Ajuste o nó — todas as partes paralelas, sem torções.",
        French: "Arrangez le nœud — tous les brins parallèles, sans torsion.",
        German: "Richten Sie den Knoten aus — alle Stränge parallel, keine Drehungen.",
        Italian: "Sistema il nodo — tutti i capi paralleli, senza torsioni.",
        Japanese: "結び目を整えます — すべてのストランドが平行で、ねじれがないように。",
        Korean: "매듭을 정리합니다 — 모든 가닥이 평행하고 비틀림이 없어야 합니다.",
      },
    },
    {
      step: 6,
      en: "Leave a tail of at least 10 cm. Partner check.",
      translations: {
        Spanish: "Deja una cola de al menos 10 cm. Revisión de compañero.",
        Portuguese: "Deixe uma ponta de pelo menos 10 cm. Revisão do companheiro.",
        French: "Laissez une queue d'au moins 10 cm. Vérification avec le partenaire.",
        German: "Lassen Sie einen Schwanz von mindestens 10 cm. Partnercheck.",
        Italian: "Lascia una coda di almeno 10 cm. Controllo del compagno.",
        Japanese: "少なくとも10cmの末端を残します。パートナーチェック。",
        Korean: "최소 10cm의 끝을 남깁니다. 파트너 체크.",
      },
    },
  ];

export interface Command {
  en: string;
  callerRole: "climber" | "belayer" | "both";
  translations: Record<string, string>;
  notes?: Record<string, string>;
}

export const COMMANDS: Command[] = [
  {
    en: "On belay?",
    callerRole: "climber",
    translations: {
      Spanish: "¿Asegurado?",
      Portuguese: "Na segurança?",
      French: "Tu m'assures ?",
      German: "Sichern?",
      Italian: "In sicura?",
      Japanese: "ビレイOK？",
      Korean: "빌레이?",
    },
  },
  {
    en: "Belay on.",
    callerRole: "belayer",
    translations: {
      Spanish: "Asegurado.",
      Portuguese: "Segurança pronta.",
      French: "Tu es assuré.",
      German: "Gesichert.",
      Italian: "In sicura.",
      Japanese: "ビレイOK。",
      Korean: "빌레이 OK.",
    },
  },
  {
    en: "Climbing?",
    callerRole: "climber",
    translations: {
      Spanish: "¿Escalando?",
      Portuguese: "Escalando?",
      French: "Je grimpe ?",
      German: "Klettern?",
      Italian: "Arrampico?",
      Japanese: "クライミング？",
      Korean: "등반해도 돼?",
    },
  },
  {
    en: "Climb on.",
    callerRole: "belayer",
    translations: {
      Spanish: "Adelante.",
      Portuguese: "Pode subir.",
      French: "C'est parti.",
      German: "Kletter.",
      Italian: "Vai.",
      Japanese: "どうぞ。",
      Korean: "올라가.",
    },
  },
  {
    en: "Slack!",
    callerRole: "climber",
    translations: {
      Spanish: "¡Cuerda!",
      Portuguese: "Corda!",
      French: "Mou !",
      German: "Seil geben!",
      Italian: "Lasca!",
      Japanese: "ロープ！",
      Korean: "줄 풀어!",
    },
    notes: { Spanish: "Give me more rope to clip", Portuguese: "Preciso de corda para clipar" },
  },
  {
    en: "Take!",
    callerRole: "climber",
    translations: {
      Spanish: "¡Tensa!",
      Portuguese: "Toma!",
      French: "Tiens !",
      German: "Nehmen!",
      Italian: "Tieni!",
      Japanese: "テイク！",
      Korean: "잡아!",
    },
    notes: {
      Spanish: "Pull the rope tight — I'm resting",
      Portuguese: "Puxa a corda — vou descansar",
    },
  },
  {
    en: "Watch me!",
    callerRole: "climber",
    translations: {
      Spanish: "¡Atento!",
      Portuguese: "Presta atenção!",
      French: "Attention !",
      German: "Aufpassen!",
      Italian: "Attenzione!",
      Japanese: "見て！",
      Korean: "집중해!",
    },
    notes: {
      Spanish: "I'm about to try something hard",
      Portuguese: "Vou tentar um passo difícil",
    },
  },
  {
    en: "Falling!",
    callerRole: "climber",
    translations: {
      Spanish: "¡Cayendo!",
      Portuguese: "Caindo!",
      French: "Je chute !",
      German: "Sturz!",
      Italian: "Cadendo!",
      Japanese: "落ちます！",
      Korean: "떨어진다!",
    },
  },
  {
    en: "Off belay.",
    callerRole: "climber",
    translations: {
      Spanish: "Seguro libre.",
      Portuguese: "Fora da segurança.",
      French: "Dévache.",
      German: "Sicherung weg.",
      Italian: "Fuori sicura.",
      Japanese: "ビレイ解除。",
      Korean: "빌레이 해제.",
    },
  },
  {
    en: "Safe.",
    callerRole: "climber",
    translations: {
      Spanish: "Seguro.",
      Portuguese: "Seguro.",
      French: "En sécurité.",
      German: "Ich bin sicher.",
      Italian: "Sono sicuro.",
      Japanese: "安全。",
      Korean: "안전.",
    },
  },
  {
    en: "Rock!",
    callerRole: "both",
    translations: {
      Spanish: "¡Piedra!",
      Portuguese: "Pedra!",
      French: "Caillou !",
      German: "Stein!",
      Italian: "Sasso!",
      Japanese: "落石！",
      Korean: "낙석!",
    },
    notes: {
      Spanish: "Warn anyone below of falling rock",
      Portuguese: "Avisa quem está abaixo de pedra caindo",
    },
  },
  {
    en: "Lower me.",
    callerRole: "climber",
    translations: {
      Spanish: "Bájame.",
      Portuguese: "Me desce.",
      French: "Descends-moi.",
      German: "Lass mich ab.",
      Italian: "Calami.",
      Japanese: "降ろして。",
      Korean: "내려줘.",
    },
  },
];

export interface GearItem {
  id: string;
  emoji: string;
  imgUrl: string;
  names: Record<string, string>; // lang → name
}

export const GEAR_ITEMS: GearItem[] = [
  {
    id: "harness",
    emoji: "🔗",
    imgUrl: "/images/gear/harness.jpg",
    names: {
      Spanish: "Arnés",
      Portuguese: "Arnês",
      French: "Baudrier",
      German: "Klettergurt",
      Italian: "Imbrago",
      Japanese: "ハーネス",
      Korean: "하네스",
      English: "Harness",
    },
  },
  {
    id: "carabiner",
    emoji: "🔒",
    imgUrl: "/images/gear/carabiner.jpg",
    names: {
      Spanish: "Mosquetón",
      Portuguese: "Mosquetão",
      French: "Mousqueton",
      German: "Karabiner",
      Italian: "Moschettone",
      Japanese: "カラビナ",
      Korean: "카라비너",
      English: "Carabiner",
    },
  },
  {
    id: "rope",
    emoji: "🪢",
    imgUrl: "/images/gear/rope.jpg",
    names: {
      Spanish: "Cuerda",
      Portuguese: "Corda",
      French: "Corde",
      German: "Seil",
      Italian: "Corda",
      Japanese: "ロープ",
      Korean: "로프",
      English: "Rope",
    },
  },
  {
    id: "quickdraw",
    emoji: "⛓️",
    imgUrl: "/images/gear/quickdraw.jpg",
    names: {
      Spanish: "Exprés",
      Portuguese: "Expresso",
      French: "Dégaine",
      German: "Express-Schlinge",
      Italian: "Rinvio",
      Japanese: "ヌンチャク",
      Korean: "퀵드로우",
      English: "Quickdraw",
    },
  },
  {
    id: "chalk-bag",
    emoji: "🎒",
    imgUrl: "/images/gear/chalk-bag.jpg",
    names: {
      Spanish: "Bolsa de Magnesio",
      Portuguese: "Saco de Magnésio",
      French: "Sac à Magnésie",
      German: "Magnesiabeutel",
      Italian: "Sacchetto di Magnesio",
      Japanese: "チョークバッグ",
      Korean: "초크백",
      English: "Chalk Bag",
    },
  },
  {
    id: "shoes",
    emoji: "👟",
    imgUrl: "/images/gear/climbing-shoes.jpg",
    names: {
      Spanish: "Pies de Gato",
      Portuguese: "Sapatilha de Escalada",
      French: "Chaussons d'Escalade",
      German: "Kletterschuhe",
      Italian: "Scarpette da Arrampicata",
      Japanese: "クライミングシューズ",
      Korean: "클라이밍 슈즈",
      English: "Climbing Shoes",
    },
  },
  {
    id: "helmet",
    emoji: "⛑️",
    imgUrl: "/images/gear/helmet.jpg",
    names: {
      Spanish: "Casco",
      Portuguese: "Capacete",
      French: "Casque",
      German: "Kletterhelm",
      Italian: "Casco",
      Japanese: "ヘルメット",
      Korean: "헬멧",
      English: "Helmet",
    },
  },
  {
    id: "belay-device",
    emoji: "⚙️",
    imgUrl: "/images/gear/belay-device.jpg",
    names: {
      Spanish: "Dispositivo de Aseguramiento",
      Portuguese: "Freio",
      French: "Assureur",
      German: "Sicherungsgerät",
      Italian: "Assicuratore",
      Japanese: "ビレイデバイス",
      Korean: "빌레이 장치",
      English: "Belay Device",
    },
  },
];

export interface Phrase {
  en: string;
  translations: Record<string, string>;
  category: "emergency" | "pain" | "describe" | "hospital";
}

export const PHRASES: Phrase[] = [
  // Emergency
  {
    en: "I need help.",
    category: "emergency",
    translations: {
      Spanish: "Necesito ayuda.",
      Portuguese: "Preciso de ajuda.",
      French: "J'ai besoin d'aide.",
      German: "Ich brauche Hilfe.",
      Italian: "Ho bisogno di aiuto.",
      Japanese: "助けが必要です。",
      Korean: "도움이 필요해요.",
    },
  },
  {
    en: "Call emergency services.",
    category: "emergency",
    translations: {
      Spanish: "Llama a emergencias.",
      Portuguese: "Chame o socorro.",
      French: "Appelez les secours.",
      German: "Rufen Sie den Notarzt.",
      Italian: "Chiama i soccorsi.",
      Japanese: "救急を呼んでください。",
      Korean: "응급 서비스를 불러주세요.",
    },
  },
  {
    en: "There has been a fall.",
    category: "emergency",
    translations: {
      Spanish: "Hubo una caída.",
      Portuguese: "Houve uma queda.",
      French: "Il y a eu une chute.",
      German: "Es gab einen Sturz.",
      Italian: "C'è stata una caduta.",
      Japanese: "墜落がありました。",
      Korean: "추락 사고가 있었습니다.",
    },
  },
  {
    en: "We are at [location / crag name].",
    category: "emergency",
    translations: {
      Spanish: "Estamos en [ubicación / nombre del sector].",
      Portuguese: "Estamos em [localização / nome da pedra].",
      French: "Nous sommes à [lieu / nom de la falaise].",
      German: "Wir sind bei [Ort / Felsname].",
      Italian: "Siamo a [posizione / nome della falesia].",
      Japanese: "[場所/クライミングエリア名]にいます。",
      Korean: "[위치/암장 이름]에 있습니다.",
    },
  },

  // Pain & location
  {
    en: "Where does it hurt?",
    category: "pain",
    translations: {
      Spanish: "¿Dónde te duele?",
      Portuguese: "Onde dói?",
      French: "Où as-tu mal ?",
      German: "Wo tut es weh?",
      Italian: "Dove ti fa male?",
      Japanese: "どこが痛いですか？",
      Korean: "어디가 아파요?",
    },
  },
  {
    en: "It hurts here.",
    category: "pain",
    translations: {
      Spanish: "Me duele aquí.",
      Portuguese: "Dói aqui.",
      French: "Ça fait mal ici.",
      German: "Hier tut es weh.",
      Italian: "Fa male qui.",
      Japanese: "ここが痛いです。",
      Korean: "여기가 아파요.",
    },
  },
  {
    en: "My finger / wrist / shoulder hurts.",
    category: "pain",
    translations: {
      Spanish: "Me duele el dedo / la muñeca / el hombro.",
      Portuguese: "Me dói o dedo / o pulso / o ombro.",
      French: "J'ai mal au doigt / au poignet / à l'épaule.",
      German: "Mein Finger / Handgelenk / Schulter tut weh.",
      Italian: "Mi fa male il dito / il polso / la spalla.",
      Japanese: "指/手首/肩が痛いです。",
      Korean: "손가락/손목/어깨가 아파요.",
    },
  },
  {
    en: "The pain is sharp / dull / constant.",
    category: "pain",
    translations: {
      Spanish: "El dolor es agudo / sordo / constante.",
      Portuguese: "A dor é aguda / surda / constante.",
      French: "La douleur est aiguë / sourde / constante.",
      German: "Der Schmerz ist scharf / dumpf / anhaltend.",
      Italian: "Il dolore è acuto / sordo / costante.",
      Japanese: "痛みは鋭い/鈍い/持続的です。",
      Korean: "통증이 날카롭다/둔하다/지속적이다.",
    },
  },

  // Describe injury
  {
    en: "I fell and hurt my ankle.",
    category: "describe",
    translations: {
      Spanish: "Me caí y me lastimé el tobillo.",
      Portuguese: "Caí e machuquei o tornozelo.",
      French: "Je suis tombé et je me suis blessé à la cheville.",
      German: "Ich bin gestürzt und habe mich am Knöchel verletzt.",
      Italian: "Sono caduto e mi sono fatto male alla caviglia.",
      Japanese: "転んで足首を痛めました。",
      Korean: "떨어져서 발목을 다쳤어요.",
    },
  },
  {
    en: "I can't move my arm / leg.",
    category: "describe",
    translations: {
      Spanish: "No puedo mover el brazo / la pierna.",
      Portuguese: "Não consigo mover o braço / a perna.",
      French: "Je ne peux pas bouger le bras / la jambe.",
      German: "Ich kann meinen Arm / mein Bein nicht bewegen.",
      Italian: "Non riesco a muovere il braccio / la gamba.",
      Japanese: "腕/足が動かせません。",
      Korean: "팔/다리를 움직일 수 없어요.",
    },
  },
  {
    en: "I think I have a broken bone.",
    category: "describe",
    translations: {
      Spanish: "Creo que tengo un hueso roto.",
      Portuguese: "Acho que tenho um osso fraturado.",
      French: "Je crois que j'ai un os cassé.",
      German: "Ich glaube, ich habe einen Knochenbruch.",
      Italian: "Credo di avere un osso rotto.",
      Japanese: "骨折したと思います。",
      Korean: "뼈가 부러진 것 같아요.",
    },
  },
  {
    en: "I am allergic to [medication].",
    category: "describe",
    translations: {
      Spanish: "Soy alérgico/a a [medicamento].",
      Portuguese: "Sou alérgico/a a [medicamento].",
      French: "Je suis allergique à [médicament].",
      German: "Ich bin allergisch gegen [Medikament].",
      Italian: "Sono allergico/a a [farmaco].",
      Japanese: "[薬]にアレルギーがあります。",
      Korean: "[약]에 알레르기가 있어요.",
    },
  },

  // Hospital / clinic
  {
    en: "Is there a hospital nearby?",
    category: "hospital",
    translations: {
      Spanish: "¿Hay un hospital cerca?",
      Portuguese: "Há hospital perto?",
      French: "Y a-t-il un hôpital à proximité ?",
      German: "Gibt es ein Krankenhaus in der Nähe?",
      Italian: "C'è un ospedale vicino?",
      Japanese: "近くに病院はありますか？",
      Korean: "근처에 병원이 있나요?",
    },
  },
  {
    en: "I need a doctor.",
    category: "hospital",
    translations: {
      Spanish: "Necesito un médico.",
      Portuguese: "Preciso de um médico.",
      French: "J'ai besoin d'un médecin.",
      German: "Ich brauche einen Arzt.",
      Italian: "Ho bisogno di un medico.",
      Japanese: "医者が必要です。",
      Korean: "의사가 필요해요.",
    },
  },
  {
    en: "Do you have travel insurance?",
    category: "hospital",
    translations: {
      Spanish: "¿Tienes seguro de viaje?",
      Portuguese: "Você tem seguro viagem?",
      French: "Tu as une assurance voyage ?",
      German: "Haben Sie eine Reiseversicherung?",
      Italian: "Hai un'assicurazione di viaggio?",
      Japanese: "旅行保険はありますか？",
      Korean: "여행 보험이 있나요?",
    },
  },
];
