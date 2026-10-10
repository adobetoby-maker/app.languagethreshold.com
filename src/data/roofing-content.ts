import type { TradesModuleContent } from "./trades-content";
import type { LibrarySeed } from "./library-seeds/_types";

type Pair = { en: string; es: string };

// Keep the published roofing guide's 20 terms and 22 phrases together here.
// The reader, flashcards, and roleplay areas all draw from this same source.
export const ROOFING_GUIDE_MATERIALS: Pair[] = [
  { en: "Shingle", es: "Teja asfáltica" },
  { en: "Tile (clay/concrete)", es: "Teja (de barro/concreto)" },
  { en: "Metal panel", es: "Lámina metálica" },
  { en: "Underlayment", es: "Sub-capa / Fieltro" },
  { en: "Ice and water shield", es: "Membrana impermeable" },
  { en: "Drip edge", es: "Goterón / Vierteaguas" },
  { en: "Ridge cap", es: "Caballete" },
  { en: "Flashing", es: "Tapajuntas / Flashing" },
  { en: "Step flashing", es: "Tapajuntas escalonado" },
  { en: "Valley", es: "Limahoya / Valle" },
  { en: "Roof deck / sheathing", es: "Cubierta / Forro de techo" },
  { en: "Felt paper", es: "Papel de fieltro" },
  { en: "Roofing nails", es: "Clavos para techo" },
  { en: "Plastic cap nails", es: "Clavos con tapa plástica" },
  { en: "Roofing cement", es: "Cemento plástico" },
  { en: "Vent (ridge / box)", es: "Ventilación (de caballete / de caja)" },
  { en: "Skylight", es: "Tragaluz" },
  { en: "Gutter", es: "Canal / Canalón" },
  { en: "Downspout", es: "Bajada de agua" },
  { en: "Fascia", es: "Fascia / Borde" },
];

export const ROOFING_GUIDE_PHRASES = {
  tearOff: [
    { en: "Tear off everything down to the deck.", es: "Quiten todo hasta llegar a la cubierta." },
    { en: "Don't damage the sheathing.", es: "No dañen el forro de techo." },
    { en: "Throw the shingles into the dumpster.", es: "Tiren las tejas al contenedor." },
    { en: "Pull all the old nails.", es: "Saquen todos los clavos viejos." },
    { en: "Sweep the deck before underlayment.", es: "Barran la cubierta antes de la sub-capa." },
    { en: "Tarp anything you can't finish today.", es: "Cubran con lona lo que no terminen hoy." },
  ],
  installation: [
    {
      en: "Run a chalk line for the first course.",
      es: "Tracen una línea de tiza para la primera hilera.",
    },
    { en: "Stagger the joints six inches.", es: "Escalonen las uniones seis pulgadas." },
    { en: "Four nails per shingle.", es: "Cuatro clavos por teja." },
    { en: "Nail in the strip — not too high.", es: "Claven en la franja — no muy alto." },
    { en: "Don't over-drive the nails.", es: "No claven de más — sin enterrar el clavo." },
    { en: "Install the drip edge first.", es: "Instalen el goterón primero." },
    {
      en: "Step flashing under each shingle course.",
      es: "Tapajuntas escalonado debajo de cada hilera.",
    },
    {
      en: "Run ice and water shield up the valley.",
      es: "Pongan la membrana impermeable por la limahoya.",
    },
    {
      en: "Six-inch overlap on the underlayment.",
      es: "Seis pulgadas de traslape en la sub-capa.",
    },
    {
      en: "Cut the ridge caps from a starter shingle.",
      es: "Corten los caballetes de una teja inicial.",
    },
  ],
  safety: [
    { en: "Tie off before you go on the roof.", es: "Anclen el arnés antes de subir al techo." },
    {
      en: "Use the roof anchor — don't freelance.",
      es: "Usen el ancla de techo — nada de improvisar.",
    },
    {
      en: "Lanyard short enough you won't hit the ground.",
      es: "La cuerda de vida corta — que no toquen el suelo si caen.",
    },
    { en: "Watch your footing — the dew is slick.", es: "Cuidado al pisar — el rocío resbala." },
    { en: "Take a water break every hour.", es: "Tomen agua cada hora." },
    { en: "Don't work the roof in lightning.", es: "No trabajen el techo con relámpagos." },
  ],
} satisfies Record<string, Pair[]>;

export const ROOFING_EXTRA_MATERIALS: Pair[] = [
  { en: "Starter strip", es: "Hilera inicial" },
  { en: "Pipe boot", es: "Tapajuntas para tubo" },
  { en: "Roof anchor", es: "Anclaje de techo" },
  { en: "Lifeline", es: "Línea de vida" },
  { en: "Harness", es: "Arnés" },
  { en: "Chalk line", es: "Línea de tiza" },
  { en: "Nail gun", es: "Pistola de clavos" },
  { en: "Tarp", es: "Lona" },
  { en: "Dumpster", es: "Contenedor de escombros" },
  { en: "Soft or rotten deck", es: "Cubierta blanda o podrida" },
  { en: "Roof pitch", es: "Pendiente del techo" },
  { en: "Manufacturer instructions", es: "Instrucciones del fabricante" },
];

export const ROOFING_EXTRA_PHRASES = {
  briefing: [
    {
      en: "Let's review today's roof plan before we start.",
      es: "Repasemos el plan del techo de hoy antes de empezar.",
    },
    { en: "Who is leading the tear-off crew?", es: "¿Quién dirige la cuadrilla de desmontaje?" },
    {
      en: "Show me where you will stage the materials.",
      es: "Muéstrenme dónde van a colocar los materiales.",
    },
    {
      en: "Tell me if the deck feels soft or damaged.",
      es: "Avísenme si la cubierta se siente blanda o dañada.",
    },
  ],
  quality: [
    {
      en: "Check the product instructions before setting the nail pattern.",
      es: "Revisen las instrucciones del producto antes de definir el patrón de clavado.",
    },
    {
      en: "Check the flashing around this vent.",
      es: "Revisen el tapajuntas alrededor de esta ventilación.",
    },
    {
      en: "Stop here; the deck needs repair before we continue.",
      es: "Deténganse aquí; hay que reparar la cubierta antes de continuar.",
    },
    {
      en: "Take a photo of the repaired area before covering it.",
      es: "Tomen una foto del área reparada antes de cubrirla.",
    },
  ],
  safetyStopWork: [
    {
      en: "Keep the ground crew clear of falling debris.",
      es: "Mantengan a la cuadrilla de tierra lejos de los escombros que caen.",
    },
    {
      en: "Stop work and come down if the weather changes.",
      es: "Detengan el trabajo y bajen si cambia el tiempo.",
    },
  ],
  closeout: [
    {
      en: "Walk the roof with me before we call the job complete.",
      es: "Recorran el techo conmigo antes de dar el trabajo por terminado.",
    },
    {
      en: "Let's check the gutters and clean the site before leaving.",
      es: "Revisemos las canaletas y limpiemos el sitio antes de irnos.",
    },
    {
      en: "Which areas are still open for tomorrow?",
      es: "¿Qué áreas quedan pendientes para mañana?",
    },
    {
      en: "Store the remaining materials in a safe place.",
      es: "Guarden los materiales restantes en un lugar seguro.",
    },
    {
      en: "Take a photo of the flashing around each penetration.",
      es: "Tomen una foto del tapajuntas alrededor de cada penetración.",
    },
    {
      en: "Tell me when the magnetic nail sweep is finished.",
      es: "Avísenme cuando terminen de recoger los clavos con el imán.",
    },
  ],
} satisfies Record<string, Pair[]>;

const phrases = (pairs: Pair[], intent: string) => pairs.map(({ en }) => ({ en, intent }));

export const ROOFING_CONTENT: TradesModuleContent = {
  moduleId: "roofing",
  areas: [
    {
      id: "roofing-briefing",
      name: "Morning Roofing Brief",
      emoji: "📋",
      blurb: "Assign tear-off, installation, and ground tasks before the crew climbs.",
      counterpart: "Spanish-speaking crew lead",
      learnerRole: "Roofing foreman",
      toneNote: "Use short instructions, confirm understanding, and ask workers to report hazards.",
      phrases: phrases(ROOFING_EXTRA_PHRASES.briefing, "briefing"),
      vocab: ["crew lead", "roof pitch", "staging area", "tear-off", "deck", "weather"],
      challenges: [
        "Brief two crews on separate tear-off and installation assignments.",
        "Ask a crew member to repeat the fall-protection plan in their own words.",
        "Change the work sequence when a material delivery is late.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Let's review today's roof plan before we start." },
        { speaker: "ai", en: "Who is handling tear-off and where do we stage the bundles?" },
        {
          speaker: "learner",
          en: "You lead tear-off. Show me where you will stage the materials.",
        },
        { speaker: "ai", en: "Understood. I will mark the staging area and tell the crew." },
      ],
    },
    {
      id: "roofing-tear-off",
      name: "Tear-Off & Deck Inspection",
      emoji: "🧹",
      blurb: "Direct removal, protect the deck, and report damaged sheathing.",
      counterpart: "Tear-off crew member",
      learnerRole: "Roofing foreman",
      toneNote: "Be specific about the work area and ask for confirmation before covering damage.",
      phrases: [
        ...phrases(ROOFING_GUIDE_PHRASES.tearOff, "tear-off"),
        ...phrases(ROOFING_EXTRA_PHRASES.quality.slice(2), "deck check"),
      ],
      vocab: ["shingles", "sheathing", "old nails", "dumpster", "tarp", "soft deck"],
      challenges: [
        "Stop the crew after finding a soft section of roof deck.",
        "Explain what must be cleaned before underlayment goes down.",
        "Cover an unfinished section before leaving for the day.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Tear off everything down to the deck. Don't damage the sheathing.",
        },
        { speaker: "ai", en: "There is a soft panel by the vent. Should we cover it?" },
        { speaker: "learner", en: "No. Stop here; the deck needs repair before we continue." },
        { speaker: "ai", en: "I will mark it and keep that area open." },
      ],
    },
    {
      id: "roofing-layout",
      name: "Underlayment & Layout",
      emoji: "📐",
      blurb: "Communicate layout, overlap, edge, and valley work clearly.",
      counterpart: "Installation crew member",
      learnerRole: "Roofing foreman",
      toneNote:
        "Treat dimensions as examples; confirm the actual product instructions and job specification.",
      phrases: phrases(
        ROOFING_GUIDE_PHRASES.installation
          .slice(0, 2)
          .concat(
            ROOFING_GUIDE_PHRASES.installation.slice(5, 6),
            ROOFING_GUIDE_PHRASES.installation.slice(7, 9),
          ),
        "layout",
      ),
      vocab: ["chalk line", "first course", "underlayment", "drip edge", "valley", "overlap"],
      challenges: [
        "Show a new worker where the first course begins.",
        "Ask the crew to verify the specified overlap before fastening underlayment.",
        "Coordinate valley protection with the installer.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Run a chalk line for the first course." },
        { speaker: "ai", en: "Do we have the specified overlap for this underlayment?" },
        { speaker: "learner", en: "Check the product instructions before fastening it." },
        { speaker: "ai", en: "I will verify the overlap and call you back." },
      ],
    },
    {
      id: "roofing-install",
      name: "Shingles, Fasteners & Flashing",
      emoji: "🔨",
      blurb: "Coach installation quality while following the selected product specification.",
      counterpart: "Shingle installer",
      learnerRole: "Roofing foreman",
      toneNote:
        "The guide's nail count and dimensions are language examples, not universal installation requirements; defer to product instructions.",
      phrases: [
        ...phrases(ROOFING_GUIDE_PHRASES.installation.slice(2, 5), "fastening"),
        ...phrases(ROOFING_GUIDE_PHRASES.installation.slice(6, 7), "flashing"),
        ...phrases(ROOFING_GUIDE_PHRASES.installation.slice(9), "ridge"),
        ...phrases(ROOFING_EXTRA_PHRASES.quality.slice(0, 2), "quality"),
      ],
      vocab: ["shingle", "nailing strip", "fastener", "step flashing", "ridge cap", "pipe boot"],
      challenges: [
        "Correct a nail placed above the specified nailing zone.",
        "Ask the installer to explain the wall flashing sequence.",
        "Verify the product's fastener pattern with the crew.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Nail in the strip — not too high." },
        { speaker: "ai", en: "How many nails should I use on this product?" },
        {
          speaker: "learner",
          en: "Check the product instructions before setting the nail pattern.",
        },
        { speaker: "ai", en: "I will check the wrapper and show you." },
      ],
    },
    {
      id: "roofing-safety",
      name: "Fall Protection & Weather",
      emoji: "🦺",
      blurb: "Practice clear stop-work, anchor, footing, heat, and weather calls.",
      counterpart: "Crew member on the roof",
      learnerRole: "Roofing foreman",
      toneNote:
        "Practice language only; a competent person must set the site-specific fall-protection plan.",
      phrases: [
        ...phrases(ROOFING_GUIDE_PHRASES.safety, "safety"),
        ...phrases(ROOFING_EXTRA_PHRASES.safetyStopWork, "stop work"),
      ],
      vocab: ["roof anchor", "harness", "lifeline", "fall hazard", "lightning", "debris"],
      challenges: [
        "Stop work when a worker approaches an unprotected edge.",
        "Ask the crew to confirm the site-specific tie-off plan.",
        "Bring everyone down when lightning approaches.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Tie off before you go on the roof." },
        { speaker: "ai", en: "The anchor is farther away than I expected." },
        {
          speaker: "learner",
          en: "Stop work. We will confirm the safe anchor and lifeline setup first.",
        },
        { speaker: "ai", en: "Understood. I will wait below." },
      ],
    },
    {
      id: "roofing-closeout",
      name: "Inspection & Closeout",
      emoji: "✅",
      blurb: "Review repairs, flashing, cleanup, and tomorrow's handoff.",
      counterpart: "Crew lead",
      learnerRole: "Roofing foreman",
      toneNote:
        "Use a collaborative walkthrough and ask for specific confirmation of unfinished work.",
      phrases: phrases(ROOFING_EXTRA_PHRASES.closeout, "closeout"),
      vocab: ["flashing", "vent", "gutter", "repair photo", "punch list", "cleanup"],
      challenges: [
        "Walk the completed roof with the crew lead and name three items to verify.",
        "Document an open repair before the crew leaves.",
        "Assign cleanup and prepare the next day's material list.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Walk the roof with me before we call the job complete." },
        { speaker: "ai", en: "I still need to check the flashing around the vent." },
        { speaker: "learner", en: "Good. Let's check that and clean the site before leaving." },
        { speaker: "ai", en: "I will bring the photos and checklist." },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Roof Materials",
      emoji: "🏠",
      words: ROOFING_GUIDE_MATERIALS.slice(0, 10).map((pair) => pair.en),
    },
    {
      category: "Deck & Fasteners",
      emoji: "🔨",
      words: ROOFING_GUIDE_MATERIALS.slice(10).map((pair) => pair.en),
    },
    {
      category: "Tools & Inspection",
      emoji: "🧰",
      words: ROOFING_EXTRA_MATERIALS.slice(0, 6).map((pair) => pair.en),
    },
    {
      category: "Crew & Safety",
      emoji: "🦺",
      words: ROOFING_EXTRA_MATERIALS.slice(6).map((pair) => pair.en),
    },
  ],
};

function seed(id: string, title: string, subtitle: string, pairs: Pair[]): LibrarySeed {
  return {
    id,
    title,
    subtitle,
    language: "Spanish",
    targetLabel: "Español",
    flag: "🇲🇽",
    section: "culture",
    available: true,
    level: "A2",
    category: "Trades",
    sentences: pairs.map(({ en, es }) => ({ en, target: es })),
  };
}

export const ROOFING_READER_SEEDS: LibrarySeed[] = [
  seed("seed-es-roofing-materials", "Roofing: Materials", "20 guide terms plus 12 field terms", [
    ...ROOFING_GUIDE_MATERIALS,
    ...ROOFING_EXTRA_MATERIALS,
  ]),
  seed(
    "seed-es-roofing-tear-off",
    "Roofing: Tear-Off & Prep",
    "Six core commands plus crew briefing",
    [...ROOFING_GUIDE_PHRASES.tearOff, ...ROOFING_EXTRA_PHRASES.briefing],
  ),
  seed(
    "seed-es-roofing-install",
    "Roofing: Layout & Installation",
    "Ten core installation phrases plus quality checks",
    [...ROOFING_GUIDE_PHRASES.installation, ...ROOFING_EXTRA_PHRASES.quality],
  ),
  seed(
    "seed-es-roofing-safety",
    "Roofing: Safety Calls",
    "Six core roof safety phrases plus stop-work language",
    [...ROOFING_GUIDE_PHRASES.safety, ...ROOFING_EXTRA_PHRASES.safetyStopWork],
  ),
  seed(
    "seed-es-roofing-closeout",
    "Roofing: Closeout",
    "Six end-of-day communication phrases",
    ROOFING_EXTRA_PHRASES.closeout,
  ),
];
