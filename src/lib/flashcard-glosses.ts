/** Explicit Spanish → English word alignments. Never zip a natural translation
 * into Spanish order: idioms and noun/adjective order do not align that way.
 * Unknown phrases keep their normal translation without an invented gloss. */
const rows = [
  "Teja asfáltica|shingle|asphalt",
  "Tejas asfálticas|shingles|asphalt",
  "Lámina metálica|sheet|metal",
  "Membrana impermeable|membrane|waterproof",
  "Tapajuntas escalonado|flashing|stepped",
  "Forro de techo|sheathing|of|roof",
  "Papel de fieltro|paper|of|felt",
  "Clavos para techo|nails|for|roof",
  "Clavos con tapa plástica|nails|with|cap|plastic",
  "Cemento plástico|cement|plastic",
  "Bajada de agua|downpipe|of|water",
  "Hilera inicial|course|starter",
  "Tapajuntas para tubo|flashing|for|pipe",
  "Anclaje de techo|anchor|of|roof",
  "Línea de vida|line|of|life",
  "Línea de tiza|line|of|chalk",
  "Pistola de clavos|gun|of|nails",
  "Contenedor de escombros|container|of|debris",
  "Cubierta blanda o podrida|deck|soft|or|rotten",
  "Pendiente del techo|slope|of the|roof",
  "Instrucciones del fabricante|instructions|of the|manufacturer",
  "Primera hilera|first|course",
  "Franja de clavado|strip|of|nailing",
  "Patrón de clavado|pattern|of|nailing",
  "Teja inicial|shingle|starter",
  "Cuadrilla de tierra|crew|of|ground",
  "Clavos viejos|nails|old",
  "Sistema de techo|system|of|roof",
  "Techo plano|roof|flat",
  "Techo inclinado|roof|sloped",
  "Borde de hastial|edge|of|gable",
  "Sub-capa sintética|underlayment|synthetic",
  "Ventilación de caballete|ventilation|of|ridge",
  "Ventilación de caja|ventilation|of|box",
  "Clavos galvanizados|nails|galvanized",
  "Jefe de cuadrilla|leader|of|crew",
  "Líder de cuadrilla|leader|of|crew",
  "Cuatro clavos por teja.|four|nails|per|shingle",
  "Instalen el goterón primero.|install|the|drip edge|first",
  "Seis pulgadas de traslape en la sub-capa.|six|inches|of|overlap|in|the|underlayment",
  "Necesito dos cajas de clavos para techo.|I need|two|boxes|of|nails|for|roof",
  "No dañen el forro de techo.|do not|damage|the|sheathing|of|roof",
  "Saquen todos los clavos viejos.|pull out|all|the|nails|old",
  "Buenos días|good|days",
  "Buenas tardes|good|afternoons",
  "Buenas noches|good|nights",
  "Por favor|as a|favor",
  "Muchas gracias|many|thanks",
  "Hasta mañana|until|tomorrow",
  "¿Cómo estás?|how|are you",
  "Me llamo|myself|I call",
  "Tengo hambre|I have|hunger",
  "Tengo sed|I have|thirst",
] as const;

const normalize = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase("es");
const glosses = new Map(
  rows.map((row) => {
    const [phrase, ...meanings] = row.split("|");
    const words = phrase.split(/\s+/);
    if (words.length !== meanings.length) throw new Error(`Misaligned flashcard gloss: ${phrase}`);
    return [normalize(phrase), words.map((word, index) => ({ word, meaning: meanings[index] }))];
  }),
);

export function flashcardWordGloss(
  card: { word: string; language: string },
  nativeLanguage: string,
): readonly { word: string; meaning: string }[] | null {
  if (card.language !== "Spanish" || nativeLanguage !== "English") return null;
  return glosses.get(normalize(card.word)) ?? null;
}

/** Placeholder examples often repeat the word and its translation verbatim. */
export function hasDistinctFlashcardExample(card: { word: string; example: string }): boolean {
  return Boolean(card.example.trim()) && normalize(card.example) !== normalize(card.word);
}
