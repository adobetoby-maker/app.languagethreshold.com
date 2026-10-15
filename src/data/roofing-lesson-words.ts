import type { LessonWord } from "./curriculum.ts";
import {
  ROOFING_EXTRA_MATERIALS,
  ROOFING_EXTRA_PHRASES,
  ROOFING_GUIDE_MATERIALS,
  ROOFING_GUIDE_PHRASES,
} from "./roofing-content.ts";

// Complete bilingual vocabulary for the 30 roofing Core 30 lessons.
// Each lesson lists, in order: the "Drill and pronounce" words from roofing-curriculum.ts,
// then extra key terms, then short crew phrases. Anything that already exists in
// roofing-content.ts is looked up from there so the Spanish is always identical.

type Pair = { en: string; es: string };
type Term = { es: string; note?: string };

const MATERIAL_PAIRS: Pair[] = [...ROOFING_GUIDE_MATERIALS, ...ROOFING_EXTRA_MATERIALS];
const PHRASE_PAIRS: Pair[] = [
  ...Object.values(ROOFING_GUIDE_PHRASES).flat(),
  ...Object.values(ROOFING_EXTRA_PHRASES).flat(),
];

const fromContent = (pairs: Pair[], en: string): string => {
  const pair = pairs.find((p) => p.en === en);
  if (!pair) throw new Error(`Missing roofing content entry: ${en}`);
  return pair.es;
};
// Existing vocabulary entry (exact Spanish from roofing-content.ts).
const m = (contentEn: string): Term => ({ es: fromContent(MATERIAL_PAIRS, contentEn) });
// Newly authored term.
const t = (es: string, note?: string): Term => (note ? { es, note } : { es });

const TERMS: Record<string, Term> = {
  // Reused from roofing-content.ts
  shingle: m("Shingle"),
  tile: m("Tile (clay/concrete)"),
  "metal panel": m("Metal panel"),
  "roof deck": m("Roof deck / sheathing"),
  underlayment: m("Underlayment"),
  "felt paper": m("Felt paper"),
  "drip edge": m("Drip edge"),
  flashing: m("Flashing"),
  "step flashing": m("Step flashing"),
  valley: m("Valley"),
  "ice and water shield": m("Ice and water shield"),
  "ridge cap": m("Ridge cap"),
  vent: m("Vent (ridge / box)"),
  skylight: m("Skylight"),
  gutter: m("Gutter"),
  downspout: m("Downspout"),
  fascia: m("Fascia"),
  "roofing nails": m("Roofing nails"),
  "plastic cap nails": m("Plastic cap nails"),
  "roofing cement": m("Roofing cement"),
  "starter strip": m("Starter strip"),
  "pipe boot": m("Pipe boot"),
  "roof anchor": m("Roof anchor"),
  lifeline: m("Lifeline"),
  harness: m("Harness"),
  "chalk line": m("Chalk line"),
  "nail gun": m("Nail gun"),
  tarp: m("Tarp"),
  dumpster: m("Dumpster"),
  "soft deck": m("Soft or rotten deck"),
  "roof pitch": m("Roof pitch"),
  "manufacturer instructions": m("Manufacturer instructions"),

  // Terms taken from the Spanish phrases in roofing-content.ts
  deck: t("Cubierta"),
  sheathing: t("Forro de techo"),
  "tear-off": t("Desmontaje", "también: retiro del techo viejo"),
  "first course": t("Primera hilera"),
  joint: t("Junta"),
  course: t("Hilera"),
  overlap: t("Traslape"),
  "nailing strip": t("Franja de clavado"),
  "nail pattern": t("Patrón de clavado"),
  "starter shingle": t("Teja inicial"),
  "ground crew": t("Cuadrilla de tierra"),
  debris: t("Escombros"),
  dew: t("Rocío"),
  lightning: t("Relámpagos", "también: rayos"),
  sweep: t("Barrer"),
  "old nails": t("Clavos viejos"),

  // Newly authored terms
  shingles: t("Tejas asfálticas"),
  roof: t("Techo"),
  "roof system": t("Sistema de techo"),
  "flat roof": t("Techo plano"),
  "sloped roof": t("Techo inclinado"),
  eave: t("Alero"),
  rake: t("Borde de hastial", "también: remate lateral"),
  plywood: t("Triplay", "también: madera contrachapada"),
  "synthetic underlayment": t("Sub-capa sintética"),
  chimney: t("Chimenea"),
  wall: t("Pared"),
  leak: t("Gotera", "también: filtración"),
  sealant: t("Sellador"),
  ridge: t("Cumbrera"),
  "ridge vent": t("Ventilación de caballete"),
  "box vent": t("Ventilación de caja"),
  soffit: t("Sofito"),
  attic: t("Ático"),
  nail: t("Clavo"),
  staple: t("Grapa"),
  screw: t("Tornillo"),
  "galvanized nails": t("Clavos galvanizados"),
  box: t("Caja"),
  "crew lead": t("Jefe de cuadrilla", "también: líder de cuadrilla"),
  "staging area": t("Área de acopio", "para materiales"),
  crew: t("Cuadrilla"),
  foreman: t("Capataz"),
  "work zone": t("Zona de trabajo"),
  assignment: t("Tarea"),
  "roof plan": t("Plan del techo"),
  hazard: t("Peligro"),
  delivery: t("Entrega"),
  "old roof": t("Techo viejo"),
  layer: t("Capa"),
  "scope of work": t("Alcance del trabajo"),
  "pry bar": t("Barreta"),
  damage: t("Daño"),
  "rotten wood": t("Madera podrida"),
  repair: t("Reparación"),
  replace: t("Reemplazar"),
  panel: t("Panel"),
  mark: t("Marcar"),
  magnet: t("Imán"),
  broom: t("Escoba"),
  wheelbarrow: t("Carretilla"),
  shovel: t("Pala"),
  gloves: t("Guantes"),
  "unfinished section": t("Sección sin terminar"),
  weather: t("Clima", "también: tiempo"),
  rain: t("Lluvia"),
  wind: t("Viento"),
  forecast: t("Pronóstico del tiempo"),
  rope: t("Cuerda"),
  "tape measure": t("Cinta métrica"),
  measurement: t("Medida"),
  straight: t("Recto"),
  overhang: t("Vuelo", "del alero"),
  stagger: t("Escalonar"),
  pattern: t("Patrón"),
  inch: t("Pulgada"),
  align: t("Alinear"),
  specification: t("Especificación"),
  cut: t("Cortar"),
  edge: t("Borde"),
  sequence: t("Secuencia"),
  corner: t("Esquina"),
  install: t("Instalar"),
  "install#phase": t("Instalación"),
  fastener: t("Sujetador", "también: elemento de fijación"),
  roll: t("Rollo"),
  wrinkle: t("Arruga"),
  membrane: t("Membrana"),
  adhesive: t("Adhesivo"),
  "backing paper": t("Papel protector"),
  width: t("Ancho"),
  "high nail": t("Clavo muy alto"),
  "nailing zone": t("Zona de clavado"),
  "sealant strip": t("Tira selladora"),
  tab: t("Lengüeta"),
  wrapper: t("Envoltura"),
  product: t("Producto"),
  "number of nails": t("Cantidad de clavos"),
  "overdriven nail": t("Clavo demasiado hundido", "también: clavo enterrado"),
  "air pressure": t("Presión de aire"),
  compressor: t("Compresor"),
  depth: t("Profundidad"),
  "nail head": t("Cabeza del clavo"),
  hose: t("Manguera"),
  adjust: t("Ajustar"),
  sidewall: t("Pared lateral"),
  siding: t("Revestimiento de pared", "también: siding"),
  bend: t("Doblar"),
  "shingle course": t("Hilera de tejas"),
  hip: t("Limatesa"),
  finish: t("Acabado"),
  "tie-off": t("Anclarse"),
  lanyard: t("Eslinga", "también: cuerda de seguridad"),
  "fall protection": t("Protección contra caídas"),
  buckle: t("Hebilla"),
  "hard hat": t("Casco"),
  "fall hazard": t("Riesgo de caída"),
  anchor: t("Anclaje"),
  "fall distance": t("Distancia de caída"),
  "competent person": t("Persona competente"),
  inspection: t("Inspección"),
  "stop work": t("Detener el trabajo"),
  footing: t("Apoyo firme al pisar"),
  slippery: t("Resbaloso"),
  wet: t("Mojado"),
  storm: t("Tormenta"),
  boots: t("Botas"),
  "water break": t("Pausa para tomar agua"),
  heat: t("Calor"),
  shade: t("Sombra"),
  water: t("Agua"),
  dizzy: t("Mareado"),
  "heat exhaustion": t("Agotamiento por calor"),
  rest: t("Descansar"),
  hydration: t("Hidratación"),
  sunscreen: t("Protector solar"),
  "exclusion area": t("Zona restringida", "también: zona de exclusión"),
  "warning tape": t("Cinta de precaución"),
  danger: t("Peligro"),
  chute: t("Ducto de escombros"),
  cone: t("Cono"),
  "repair photo": t("Foto de la reparación"),
  "covered area": t("Área cubierta"),
  photo: t("Foto"),
  "damaged area": t("Área dañada"),
  penetration: t("Penetración"),
  crack: t("Grieta"),
  cleanup: t("Limpieza"),
  yard: t("Patio"),
  trash: t("Basura"),
  "punch list": t("Lista de pendientes"),
  unfinished: t("Sin terminar"),
  tomorrow: t("Mañana"),
  "open item": t("Pendiente"),
  finished: t("Terminado"),
  "remaining materials": t("Materiales restantes"),
  task: t("Tarea"),
  today: t("Hoy"),
  job: t("Trabajo"),
  briefing: t("Reunión informativa", "también: reunión de arranque"),
  safety: t("Seguridad"),
  closeout: t("Cierre de obra", "también: cierre del trabajo"),
};

// A phrase is either an exact English phrase from roofing-content.ts (Spanish looked up),
// or a newly authored [en, es] pair.
type PhraseSpec = string | readonly [string, string];

const toTerm = (key: string): LessonWord => {
  const term = TERMS[key];
  if (!term) throw new Error(`Missing roofing lesson term: ${key}`);
  // "en#variant" keys pick an alternate Spanish for the same English word.
  const en = key.split("#")[0];
  return { en, es: term.es, kind: "term", ...(term.note ? { note: term.note } : {}) };
};

const toPhrase = (spec: PhraseSpec): LessonWord => {
  if (typeof spec === "string") {
    return { en: spec, es: fromContent(PHRASE_PAIRS, spec), kind: "phrase" };
  }
  return { en: spec[0], es: spec[1], kind: "phrase" };
};

// drill words first (original order), then extra terms, then phrases
const lesson = (drill: string[], extra: string[], phrases: PhraseSpec[]): LessonWord[] => [
  ...drill.map(toTerm),
  ...extra.map(toTerm),
  ...phrases.map(toPhrase),
];

export const ROOFING_LESSON_WORDS: Record<number, LessonWord[]> = {
  1: lesson(
    ["shingle", "tile", "metal panel", "roof deck"],
    ["roof", "roof system", "flat roof", "sloped roof", "roof pitch", "skylight"],
    [
      ["What material does this roof have?", "¿Qué material tiene este techo?"],
      ["Today we are installing asphalt shingles.", "Hoy vamos a instalar tejas asfálticas."],
      ["This roof is metal panel.", "Este techo es de lámina metálica."],
      ["Is the roof flat or sloped?", "¿El techo es plano o inclinado?"],
      ["Check the roof pitch before we start.", "Revisen la pendiente del techo antes de empezar."],
    ],
  ),
  2: lesson(
    ["roof deck", "underlayment", "felt paper", "drip edge"],
    ["sheathing", "eave", "rake", "plywood", "synthetic underlayment"],
    [
      "Install the drip edge first.",
      "Sweep the deck before underlayment.",
      ["The deck must be dry and clean.", "La cubierta tiene que estar seca y limpia."],
      ["Roll out the underlayment.", "Desenrollen la sub-capa."],
      ["Where does the drip edge go?", "¿Dónde va el goterón?"],
    ],
  ),
  3: lesson(
    ["flashing", "step flashing", "valley", "ice and water shield"],
    ["chimney", "wall", "leak", "sealant", "roofing cement"],
    [
      "Step flashing under each shingle course.",
      "Run ice and water shield up the valley.",
      ["Show me where the flashing goes.", "Muéstrenme dónde va el tapajuntas."],
      ["Where are the valleys on this roof?", "¿Dónde están las limahoyas en este techo?"],
      ["Seal around the chimney.", "Sellen alrededor de la chimenea."],
      ["Check for leaks at the valley.", "Revisen si hay goteras en la limahoya."],
    ],
  ),
  4: lesson(
    ["ridge cap", "vent", "gutter", "downspout", "fascia"],
    ["ridge", "ridge vent", "box vent", "soffit", "attic"],
    [
      [
        "The ridge vent goes along the ridge.",
        "La ventilación de caballete va a lo largo de la cumbrera.",
      ],
      ["Where does the downspout go?", "¿Dónde va la bajada de agua?"],
      ["The gutter is clogged.", "La canaleta está tapada."],
      ["The water must drain away from the house.", "El agua tiene que correr lejos de la casa."],
      ["The attic needs ventilation.", "El ático necesita ventilación."],
    ],
  ),
  5: lesson(
    ["roofing nails", "plastic cap nails", "roofing cement"],
    ["nail", "staple", "screw", "galvanized nails", "box", "sealant"],
    [
      ["I need two boxes of roofing nails.", "Necesito dos cajas de clavos para techo."],
      ["Do you have plastic cap nails?", "¿Tienen clavos con tapa plástica?"],
      ["Which nails does the job require?", "¿Qué clavos pide el trabajo?"],
      ["When can you deliver them?", "¿Cuándo los pueden entregar?"],
      ["Please confirm the order.", "Por favor, confirmen el pedido."],
    ],
  ),
  6: lesson(
    ["crew lead", "staging area", "tear-off"],
    ["crew", "foreman", "work zone", "assignment", "roof plan", "hazard", "delivery"],
    [
      "Let's review today's roof plan before we start.",
      "Who is leading the tear-off crew?",
      "Show me where you will stage the materials.",
      ["Tell me if you see any hazard.", "Avísenme si ven algún peligro."],
      ["Does everyone understand the plan?", "¿Todos entienden el plan?"],
      ["Any questions before we start?", "¿Hay preguntas antes de empezar?"],
    ],
  ),
  7: lesson(
    ["tear-off", "shingles", "deck"],
    ["old roof", "layer", "scope of work", "underlayment", "pry bar", "flashing"],
    [
      "Tear off everything down to the deck.",
      "Throw the shingles into the dumpster.",
      ["Remove all the layers.", "Quiten todas las capas."],
      ["Tear off the flashing too.", "Quiten también el tapajuntas."],
      ["Do you understand what must be removed?", "¿Entienden qué hay que quitar?"],
      ["Is that clear?", "¿Está claro?"],
    ],
  ),
  8: lesson(
    ["sheathing", "soft deck", "damage"],
    ["rotten wood", "repair", "replace", "panel", "plywood", "mark"],
    [
      "Don't damage the sheathing.",
      "Tell me if the deck feels soft or damaged.",
      "Stop here; the deck needs repair before we continue.",
      ["Do not cover the soft panel.", "No cubran el panel blando."],
      ["Mark the damaged area.", "Marquen el área dañada."],
      ["We need to replace this plywood.", "Hay que reemplazar este triplay."],
    ],
  ),
  9: lesson(
    ["dumpster", "old nails", "sweep"],
    ["debris", "magnet", "broom", "wheelbarrow", "shovel", "gloves"],
    [
      "Throw the shingles into the dumpster.",
      "Pull all the old nails.",
      "Sweep the deck before underlayment.",
      "Tell me when the magnetic nail sweep is finished.",
      ["Pick up all the shingle pieces.", "Recojan todos los pedazos de teja."],
      ["Put on your gloves.", "Pónganse los guantes."],
    ],
  ),
  10: lesson(
    ["tarp", "unfinished section", "weather"],
    ["rain", "wind", "forecast", "rope", "leak"],
    [
      "Tarp anything you can't finish today.",
      "Stop work and come down if the weather changes.",
      ["Cover this section before we leave.", "Cubran esta sección antes de irnos."],
      ["Tie down the tarp well.", "Amarren bien la lona."],
      ["Rain is coming tonight.", "Esta noche va a llover."],
      ["Repeat the plan to confirm.", "Repitan el plan para confirmar."],
    ],
  ),
  11: lesson(
    ["chalk line", "first course", "starter strip"],
    ["eave", "tape measure", "measurement", "straight", "overhang"],
    [
      "Run a chalk line for the first course.",
      ["Start here at the eave.", "Empiecen aquí en el alero."],
      ["Is the line straight?", "¿La línea está recta?"],
      ["Measure from the edge.", "Midan desde el borde."],
      ["Put the starter strip along the eave.", "Pongan la hilera inicial a lo largo del alero."],
    ],
  ),
  12: lesson(
    ["joint", "stagger", "course"],
    ["shingle", "pattern", "inch", "align", "specification", "cut"],
    [
      "Stagger the joints six inches.",
      ["The joints must not line up.", "Las juntas no deben quedar alineadas."],
      ["What is the stagger for this job?", "¿Cuál es el escalonado de este trabajo?"],
      [
        "Please confirm the job specification.",
        "Por favor, confirmen la especificación del trabajo.",
      ],
      ["Check the joints on the next course.", "Revisen las juntas de la siguiente hilera."],
    ],
  ),
  13: lesson(
    ["drip edge", "eave", "rake", "underlayment"],
    ["edge", "sequence", "overlap", "corner", "install"],
    [
      "Install the drip edge first.",
      [
        "Does the drip edge go under or over the underlayment?",
        "¿El goterón va debajo o encima de la sub-capa?",
      ],
      ["Start the drip edge at the eave.", "Empiecen el goterón en el alero."],
      ["Cut the drip edge at the corner.", "Corten el goterón en la esquina."],
      [
        "Explain the drip-edge sequence for this roof.",
        "Expliquen la secuencia del goterón para este techo.",
      ],
    ],
  ),
  14: lesson(
    ["underlayment", "overlap", "fastener"],
    ["roll", "felt paper", "plastic cap nails", "wrinkle", "inch", "manufacturer instructions"],
    [
      "Six-inch overlap on the underlayment.",
      ["Roll out the underlayment straight.", "Desenrollen la sub-capa bien recta."],
      ["No wrinkles.", "Sin arrugas."],
      ["Is the overlap correct?", "¿El traslape está bien?"],
      [
        "Fasten the underlayment with plastic cap nails.",
        "Sujeten la sub-capa con clavos de tapa plástica.",
      ],
    ],
  ),
  15: lesson(
    ["valley", "ice and water shield", "membrane"],
    ["adhesive", "backing paper", "width", "leak", "flashing", "shingle"],
    [
      "Run ice and water shield up the valley.",
      [
        "Show me the valley protection before it is covered.",
        "Muéstrenme la protección de la limahoya antes de cubrirla.",
      ],
      ["Peel off the backing paper.", "Quiten el papel protector."],
      ["Press it down flat.", "Presiónenla bien contra la cubierta."],
      ["Cut the membrane to length.", "Corten la membrana a la medida."],
      ["Is the valley covered all the way?", "¿La limahoya está cubierta por completo?"],
    ],
  ),
  16: lesson(
    ["nailing strip", "high nail", "fastener"],
    ["nail", "shingle", "nail gun", "nailing zone", "sealant strip", "tab"],
    [
      "Nail in the strip — not too high.",
      ["That nail is too high.", "Ese clavo está muy alto."],
      [
        "Keep the nails inside the nailing zone.",
        "Mantengan los clavos dentro de la zona de clavado.",
      ],
      ["Fix this row.", "Corrijan esta hilera."],
      ["Do it like this.", "Háganlo así."],
      ["Show me where the strip is.", "Muéstrenme dónde está la franja."],
    ],
  ),
  17: lesson(
    ["nail pattern", "shingle", "manufacturer instructions"],
    ["nail", "fastener", "nail gun", "wrapper", "product", "number of nails"],
    [
      "Four nails per shingle.",
      "Check the product instructions before setting the nail pattern.",
      ["How many nails does this shingle need?", "¿Cuántos clavos necesita esta teja?"],
      ["Read the wrapper.", "Lean la envoltura del paquete."],
      ["Use the same pattern on every shingle.", "Usen el mismo patrón en cada teja."],
      ["I need the exact pattern for this product.", "Necesito el patrón exacto de este producto."],
    ],
  ),
  18: lesson(
    ["overdriven nail", "shingle", "nail gun"],
    ["air pressure", "compressor", "depth", "nail head", "hose", "adjust"],
    [
      "Don't over-drive the nails.",
      ["Stop. The nails are too deep.", "Alto. Los clavos están muy hundidos."],
      ["Lower the air pressure.", "Bajen la presión de aire."],
      ["The nail head must sit flush.", "La cabeza del clavo tiene que quedar al ras."],
      ["Put a new nail next to it.", "Pongan un clavo nuevo al lado."],
      ["Adjust the nail gun.", "Ajusten la pistola de clavos."],
    ],
  ),
  19: lesson(
    ["step flashing", "wall", "shingle course"],
    ["sidewall", "flashing", "siding", "sealant", "bend", "overlap"],
    [
      "Step flashing under each shingle course.",
      ["Install one piece per course.", "Instalen una pieza por cada hilera."],
      ["Bend the flashing against the wall.", "Doblen el tapajuntas contra la pared."],
      [
        "Describe the sidewall flashing sequence.",
        "Expliquen la secuencia del tapajuntas de la pared lateral.",
      ],
      ["Show me how the flashing overlaps.", "Muéstrenme cómo se traslapa el tapajuntas."],
    ],
  ),
  20: lesson(
    ["ridge cap", "starter shingle", "ridge"],
    ["hip", "ridge vent", "cut", "finish", "sealant", "nail"],
    [
      "Cut the ridge caps from a starter shingle.",
      [
        "Install the ridge caps along the ridge.",
        "Instalen los caballetes a lo largo de la cumbrera.",
      ],
      [
        "Check the product instructions for the ridge cap.",
        "Revisen las instrucciones del producto para el caballete.",
      ],
      ["Seal the last cap.", "Sellen el último caballete."],
      ["Clean the roof when you finish.", "Limpien el techo cuando terminen."],
    ],
  ),
  21: lesson(
    ["harness", "tie-off", "roof anchor"],
    ["lanyard", "fall protection", "buckle", "hard hat", "fall hazard"],
    [
      "Tie off before you go on the roof.",
      "Use the roof anchor — don't freelance.",
      "Lanyard short enough you won't hit the ground.",
      ["Show me the approved anchor.", "Muéstrenme el anclaje aprobado."],
      ["Check your harness before you climb.", "Revisen su arnés antes de subir."],
      ["Nobody goes up without a harness.", "Nadie sube sin arnés."],
    ],
  ),
  22: lesson(
    ["anchor", "lifeline", "fall distance"],
    ["harness", "lanyard", "competent person", "inspection", "rope", "stop work"],
    [
      "Use the roof anchor — don't freelance.",
      ["Stop work. The anchor is not safe.", "Detengan el trabajo. El anclaje no es seguro."],
      ["Where is the competent person?", "¿Dónde está la persona competente?"],
      ["Check the lifeline for damage.", "Revisen si la línea de vida tiene daños."],
      [
        "Confirm the anchor setup before we continue.",
        "Confirmen la instalación del anclaje antes de continuar.",
      ],
    ],
  ),
  23: lesson(
    ["dew", "footing", "lightning"],
    ["slippery", "wet", "rain", "wind", "storm", "boots"],
    [
      "Watch your footing — the dew is slick.",
      "Don't work the roof in lightning.",
      "Stop work and come down if the weather changes.",
      ["The roof is wet. Be careful.", "El techo está mojado. Tengan cuidado."],
      ["A storm is coming. Come down now.", "Viene una tormenta. Bajen ahora."],
      ["Wear boots with good grip.", "Usen botas con buen agarre."],
    ],
  ),
  24: lesson(
    ["water break", "heat", "shade"],
    ["water", "dizzy", "heat exhaustion", "rest", "hydration", "sunscreen"],
    [
      "Take a water break every hour.",
      ["How do you feel?", "¿Cómo se siente?"],
      ["Are you dizzy?", "¿Está mareado?"],
      ["Go to the shade and rest.", "Vaya a la sombra y descanse."],
      ["Drink water now.", "Tome agua ahora."],
      ["Tell me if you feel sick.", "Avíseme si se siente mal."],
    ],
  ),
  25: lesson(
    ["ground crew", "debris", "exclusion area"],
    ["hard hat", "warning tape", "danger", "chute", "cone", "tear-off"],
    [
      "Keep the ground crew clear of falling debris.",
      ["Move away from the house.", "Aléjense de la casa."],
      ["Don't stand under the work.", "No se paren debajo del trabajo."],
      ["Wait until I say it's clear.", "Esperen hasta que yo diga que está despejado."],
      ["Put up the warning tape.", "Pongan la cinta de precaución."],
      ["Heads up! Debris coming down!", "¡Cuidado abajo! ¡Caen escombros!"],
    ],
  ),
  26: lesson(
    ["repair photo", "deck", "covered area"],
    ["repair", "plywood", "photo", "damaged area", "sheathing", "measurement"],
    [
      "Take a photo of the repaired area before covering it.",
      ["Show me the damaged area.", "Muéstrenme el área dañada."],
      [
        "Take a photo before and after the repair.",
        "Tomen una foto antes y después de la reparación.",
      ],
      ["Do not cover it until I check it.", "No lo cubran hasta que yo lo revise."],
      ["How big is the repaired section?", "¿Qué tan grande es la sección reparada?"],
    ],
  ),
  27: lesson(
    ["vent", "pipe boot", "flashing"],
    ["penetration", "sealant", "crack", "leak", "skylight", "chimney"],
    [
      "Check the flashing around this vent.",
      "Take a photo of the flashing around each penetration.",
      ["Walk each penetration with me.", "Recorramos cada penetración juntos."],
      ["Is the pipe boot cracked?", "¿El tapajuntas para tubo está agrietado?"],
      ["What have you already checked?", "¿Qué han revisado ya?"],
      ["Seal the exposed nails.", "Sellen los clavos expuestos."],
    ],
  ),
  28: lesson(
    ["gutter", "dumpster", "nail", "cleanup"],
    ["magnet", "broom", "debris", "yard", "trash", "downspout"],
    [
      "Let's check the gutters and clean the site before leaving.",
      "Tell me when the magnetic nail sweep is finished.",
      [
        "Check the gutters for nails and debris.",
        "Revisen si hay clavos y escombros en las canaletas.",
      ],
      ["Pick up every nail around the house.", "Recojan todos los clavos alrededor de la casa."],
      ["Is the dumpster full?", "¿Está lleno el contenedor?"],
      [
        "Leave the yard cleaner than you found it.",
        "Dejen el patio más limpio que como lo encontraron.",
      ],
    ],
  ),
  29: lesson(
    ["punch list", "unfinished", "tomorrow"],
    ["open item", "finished", "remaining materials", "task", "today", "job"],
    [
      "Which areas are still open for tomorrow?",
      "Store the remaining materials in a safe place.",
      "Walk the roof with me before we call the job complete.",
      ["This is still open.", "Esto sigue pendiente."],
      [
        "Tomorrow the first task is to finish this section.",
        "Mañana la primera tarea es terminar esta sección.",
      ],
      ["Add it to the punch list.", "Agréguenlo a la lista de pendientes."],
    ],
  ),
  30: lesson(
    ["briefing", "tear-off", "install#phase", "safety", "closeout"],
    ["crew lead", "underlayment", "flashing", "tarp", "punch list"],
    [
      "Let's review today's roof plan before we start.",
      "Tie off before you go on the roof.",
      "Stop work and come down if the weather changes.",
      "Walk the roof with me before we call the job complete.",
      ["Tear-off first, then installation.", "Primero el desmontaje, luego la instalación."],
      ["Safety comes first today.", "La seguridad es lo primero hoy."],
    ],
  ),
};
