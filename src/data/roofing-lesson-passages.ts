// Built by TAC — 2026-10-15
// A short on-the-job reading for each of the 30 Roofing Supervisor Core 30 lessons, shown in "See it".
// Every passage reuses the Spanish terms and phrases from roofing-lesson-words.ts, so the learner
// reads exactly what they practice next. Each sentence is written as an [es, en] pair so the
// Spanish and the English translation can never fall out of step. Specifications (overlaps, nail
// counts, staggers) are always attributed to the guide, the plan, or the manufacturer's
// instructions, never stated as universal facts.

export type RoofingLessonPassage = { title: string; es: string[]; en: string[] };

type Pair = readonly [es: string, en: string];

const passage = (title: string, pairs: Pair[]): RoofingLessonPassage => ({
  title,
  es: pairs.map((pair) => pair[0]),
  en: pairs.map((pair) => pair[1]),
});

export const ROOFING_LESSON_PASSAGES: Record<number, RoofingLessonPassage> = {
  // ---- Lessons 1-10: simple present, short sentences ----
  1: passage("Primer día en el techo", [
    ["Hoy es el primer día en la obra nueva.", "Today is the first day at the new job site."],
    ["El capataz camina por el techo con la cuadrilla.", "The foreman walks the roof with the crew."],
    ["Este techo es inclinado, no es plano.", "This roof is sloped, not flat."],
    ["Es un sistema de techo con tejas asfálticas.", "It is a roof system with asphalt shingles."],
    [
      "El capataz pregunta: ¿Qué material tiene este techo?",
      "The foreman asks: What material does this roof have?",
    ],
    [
      "Un obrero mira el techo y contesta que son tejas asfálticas.",
      "A worker looks at the roof and answers that they are asphalt shingles.",
    ],
    ["También hay un tragaluz en la parte de atrás.", "There is also a skylight at the back."],
    ["Revisen la pendiente del techo antes de empezar.", "Check the roof pitch before we start."],
  ]),
  2: passage("Capas debajo del techo", [
    [
      "La cuadrilla mira las capas debajo de las tejas.",
      "The crew looks at the layers under the shingles.",
    ],
    [
      "Abajo está la cubierta, que es de triplay.",
      "At the bottom is the roof deck, which is plywood.",
    ],
    ["La cubierta tiene que estar seca y limpia.", "The deck has to be dry and clean."],
    [
      "Encima va la sub-capa, por ejemplo el papel de fieltro.",
      "The underlayment goes on top, for example felt paper.",
    ],
    [
      "El capataz pregunta: ¿Dónde va el goterón?",
      "The foreman asks: Where does the drip edge go?",
    ],
    [
      "Un obrero señala el borde del alero y el borde de hastial.",
      "A worker points to the eave edge and the rake edge.",
    ],
    [
      "Luego el capataz ordena: desenrollen la sub-capa.",
      "Then the foreman orders: unroll the underlayment.",
    ],
  ]),
  3: passage("Por dónde entra el agua", [
    [
      "El agua entra con frecuencia por las uniones del techo.",
      "Water often gets in at the joints of the roof.",
    ],
    [
      "Esas uniones están en las limahoyas, las chimeneas y las paredes.",
      "Those joints are at the valleys, the chimneys, and the walls.",
    ],
    ["El tapajuntas ayuda a que el agua no pase.", "Flashing helps keep the water out."],
    [
      "Aquí hay tapajuntas escalonado junto a la pared.",
      "Here there is step flashing next to the wall.",
    ],
    [
      "El capataz pregunta: ¿Dónde están las limahoyas en este techo?",
      "The foreman asks: Where are the valleys on this roof?",
    ],
    [
      "Una obrera señala la limahoya del frente.",
      "A worker points to the valley at the front.",
    ],
    ["Muéstrenme dónde va el tapajuntas.", "Show me where the flashing goes."],
    ["Revisen si hay goteras en la limahoya.", "Check for leaks at the valley."],
  ]),
  4: passage("Cumbrera, ventilación y canaletas", [
    [
      "En la parte más alta del techo está la cumbrera.",
      "At the highest part of the roof is the ridge.",
    ],
    [
      "La ventilación de caballete va a lo largo de la cumbrera.",
      "The ridge vent goes along the ridge.",
    ],
    ["El ático necesita ventilación.", "The attic needs ventilation."],
    [
      "Abajo, en el borde del techo, están la fascia y el sofito.",
      "Below, at the edge of the roof, are the fascia and the soffit.",
    ],
    ["La canaleta está tapada.", "The gutter is clogged."],
    [
      "El agua tiene que correr lejos de la casa.",
      "The water has to run away from the house.",
    ],
    [
      "El capataz pregunta: ¿Dónde va la bajada de agua?",
      "The foreman asks: Where does the downspout go?",
    ],
    [
      "Un obrero la señala en la esquina de la casa.",
      "A worker points to it at the corner of the house.",
    ],
  ]),
  5: passage("Pedido de clavos", [
    ["El capataz llama al proveedor.", "The foreman calls the supplier."],
    [
      "El capataz dice: Necesito dos cajas de clavos para techo.",
      "He says: I need two boxes of roofing nails.",
    ],
    ["¿Tienen clavos con tapa plástica?", "Do you have plastic cap nails?"],
    [
      "El capataz lee las especificaciones para ver qué clavos pide el trabajo.",
      "The foreman reads the job specifications to see which nails the job requires.",
    ],
    [
      "También necesita cemento plástico y sellador.",
      "He also needs roofing cement and sealant.",
    ],
    ["¿Cuándo los pueden entregar?", "When can you deliver them?"],
    [
      "El proveedor revisa su lista y da una fecha de entrega.",
      "The supplier checks his list and gives a delivery date.",
    ],
    ["Por favor, confirmen el pedido.", "Please confirm the order."],
  ]),
  6: passage("Reunión de la mañana", [
    [
      "Son las 7:00 de la mañana y la cuadrilla se reúne.",
      "It is 7:00 in the morning and the crew gathers.",
    ],
    [
      "El capataz dice: Repasemos el plan del techo de hoy antes de empezar.",
      "The foreman says: Let's review today's roof plan before we start.",
    ],
    [
      "El capataz pregunta: ¿Quién dirige la cuadrilla de desmontaje?",
      "The foreman asks: Who is leading the tear-off crew?",
    ],
    [
      "Luis, el jefe de cuadrilla, levanta la mano.",
      "Luis, the crew lead, raises his hand.",
    ],
    [
      "Cada persona tiene una tarea en una zona de trabajo.",
      "Each person has a task in a work zone.",
    ],
    [
      "Muéstrenme dónde van a colocar los materiales.",
      "Show me where you will stage the materials.",
    ],
    ["Avísenme si ven algún peligro.", "Tell me if you see any hazard."],
    ["¿Todos entienden el plan?", "Does everyone understand the plan?"],
    ["¿Hay preguntas antes de empezar?", "Any questions before we start?"],
  ]),
  7: passage("Qué se quita hoy", [
    [
      "Hoy empieza el desmontaje del techo viejo.",
      "Today the tear-off of the old roof begins.",
    ],
    ["El capataz explica el alcance del trabajo.", "The foreman explains the scope of work."],
    [
      "Quiten todo hasta llegar a la cubierta.",
      "Tear off everything down to the deck.",
    ],
    [
      "Quiten todas las capas, también la sub-capa.",
      "Remove all the layers, including the underlayment.",
    ],
    ["Quiten también el tapajuntas.", "Tear off the flashing too."],
    ["Usen la barreta con cuidado.", "Use the pry bar carefully."],
    ["Tiren las tejas al contenedor.", "Throw the shingles into the dumpster."],
    ["¿Entienden qué hay que quitar?", "Do you understand what must be removed?"],
    ["¿Está claro?", "Is that clear?"],
  ]),
  8: passage("Cuidado con la cubierta", [
    [
      "La cuadrilla quita las tejas del techo.",
      "The crew removes the shingles from the roof.",
    ],
    ["No dañen el forro de techo.", "Don't damage the sheathing."],
    [
      "Avísenme si la cubierta se siente blanda o dañada.",
      "Tell me if the deck feels soft or damaged.",
    ],
    [
      "Un obrero pisa un panel y siente que la madera está podrida.",
      "A worker steps on a panel and feels that the wood is rotten.",
    ],
    [
      "El capataz dice: Deténganse aquí; hay que reparar la cubierta antes de continuar.",
      "The foreman says: Stop here; the deck needs repair before we continue.",
    ],
    ["No cubran el panel blando.", "Do not cover the soft panel."],
    ["Marquen el área dañada.", "Mark the damaged area."],
    ["Hay que reemplazar este triplay.", "We need to replace this plywood."],
  ]),
  9: passage("Escombros y clavos viejos", [
    [
      "Después del desmontaje hay escombros por todos lados.",
      "After the tear-off there is debris everywhere.",
    ],
    ["Pónganse los guantes.", "Put on your gloves."],
    [
      "Tiren las tejas al contenedor de escombros.",
      "Throw the shingles into the debris dumpster.",
    ],
    [
      "Un obrero usa la pala y otro usa la carretilla.",
      "One worker uses the shovel and another uses the wheelbarrow.",
    ],
    ["Saquen todos los clavos viejos.", "Pull all the old nails."],
    ["Después pasen el imán por el patio.", "Then run the magnet over the yard."],
    [
      "Barran la cubierta antes de la sub-capa.",
      "Sweep the deck before the underlayment.",
    ],
    [
      "Avísenme cuando terminen de recoger los clavos con el imán.",
      "Tell me when you finish picking up the nails with the magnet.",
    ],
  ]),
  10: passage("Lona antes de la lluvia", [
    [
      "Son las 4:00 de la tarde y hay viento.",
      "It is 4:00 in the afternoon and it is windy.",
    ],
    [
      "El pronóstico del tiempo dice que esta noche va a llover.",
      "The weather forecast says it will rain tonight.",
    ],
    [
      "Hay una sección sin terminar en la parte de atrás.",
      "There is an unfinished section at the back.",
    ],
    [
      "La lluvia puede mojar la cubierta abierta.",
      "Rain can wet the open deck.",
    ],
    ["Cubran esta sección antes de irnos.", "Cover this section before we leave."],
    [
      "Cubran con lona lo que no terminen hoy.",
      "Tarp anything you can't finish today.",
    ],
    [
      "Amarren bien la lona con la cuerda.",
      "Tie the tarp down well with the rope.",
    ],
    [
      "Detengan el trabajo y bajen si cambia el tiempo.",
      "Stop work and come down if the weather changes.",
    ],
    ["Repitan el plan para confirmar.", "Repeat the plan to confirm."],
  ]),

  // ---- Lessons 11-20: sequencing, imperatives, simple past and near future ----
  11: passage("La línea de tiza", [
    [
      "Primero, el capataz saca la cinta métrica.",
      "First, the foreman takes out the tape measure.",
    ],
    [
      "Mide desde el borde del alero y marca los puntos del plano.",
      "He measures from the edge of the eave and marks the points on the plan.",
    ],
    [
      "Después dice: Tracen una línea de tiza para la primera hilera.",
      "Then he says: Run a chalk line for the first course.",
    ],
    [
      "Dos obreros estiran la línea y la sueltan.",
      "Two workers stretch the line and snap it.",
    ],
    ["¿La línea está recta?", "Is the line straight?"],
    ["El capataz revisa la medida otra vez.", "The foreman checks the measurement again."],
    ["Empiecen aquí en el alero.", "Start here at the eave."],
    [
      "Pongan la hilera inicial a lo largo del alero.",
      "Put the starter strip along the eave.",
    ],
    [
      "La medida del vuelo está en el plano del trabajo.",
      "The overhang measurement is on the job plan.",
    ],
  ]),
  12: passage("Juntas escalonadas", [
    [
      "La cuadrilla ya tiene la primera hilera de tejas asfálticas.",
      "The crew already has the first course of asphalt shingles.",
    ],
    [
      "Ahora cada hilera nueva necesita un patrón.",
      "Now each new course needs a pattern.",
    ],
    ["Las juntas no deben quedar alineadas.", "The joints must not line up."],
    [
      "La guía dice: escalonen las uniones seis pulgadas.",
      "The guide says: stagger the joints six inches.",
    ],
    ["Pero cada trabajo es diferente.", "But every job is different."],
    [
      "Un obrero pregunta: ¿Cuál es el escalonado de este trabajo?",
      "A worker asks: What is the stagger for this job?",
    ],
    [
      "El capataz llama a la oficina: Por favor, confirmen la especificación del trabajo.",
      "The foreman calls the office: Please confirm the job specification.",
    ],
    [
      "Mientras tanto, revisen las juntas de la siguiente hilera.",
      "Meanwhile, check the joints on the next course.",
    ],
  ]),
  13: passage("Orden del goterón", [
    [
      "Hoy la cuadrilla va a instalar el goterón.",
      "Today the crew is going to install the drip edge.",
    ],
    [
      "Antes de empezar, el capataz habla con los instaladores.",
      "Before starting, the foreman talks to the installers.",
    ],
    [
      "Expliquen la secuencia del goterón para este techo.",
      "Explain the drip-edge sequence for this roof.",
    ],
    [
      "¿El goterón va debajo o encima de la sub-capa?",
      "Does the drip edge go under or over the underlayment?",
    ],
    [
      "Los instaladores revisan las instrucciones del fabricante antes de contestar.",
      "The installers check the manufacturer's instructions before answering.",
    ],
    [
      "Según el plano, empiecen el goterón en el alero.",
      "According to the plan, start the drip edge at the eave.",
    ],
    ["Corten el goterón en la esquina.", "Cut the drip edge at the corner."],
  ]),
  14: passage("Traslape de la sub-capa", [
    ["Ayer la cuadrilla limpió la cubierta.", "Yesterday the crew cleaned the deck."],
    ["Hoy empiezan con la sub-capa.", "Today they start on the underlayment."],
    [
      "Desenrollen la sub-capa bien recta.",
      "Roll out the underlayment nice and straight.",
    ],
    ["Sin arrugas.", "No wrinkles."],
    [
      "El capataz recuerda la guía: seis pulgadas de traslape en la sub-capa.",
      "The foreman recalls the guide: six-inch overlap on the underlayment.",
    ],
    [
      "Pero también confirma con las instrucciones del fabricante.",
      "But he also confirms with the manufacturer's instructions.",
    ],
    ["¿El traslape está bien?", "Is the overlap correct?"],
    ["Un obrero mide el traslape otra vez.", "A worker measures the overlap again."],
    [
      "Sujeten la sub-capa con clavos de tapa plástica.",
      "Fasten the underlayment with plastic cap nails.",
    ],
  ]),
  15: passage("Protección en la limahoya", [
    [
      "La limahoya es un lugar donde el agua corre con fuerza.",
      "The valley is a place where water runs with force.",
    ],
    [
      "Por eso la cuadrilla pone protección extra.",
      "That is why the crew adds extra protection.",
    ],
    ["Corten la membrana a la medida.", "Cut the membrane to length."],
    [
      "Quiten el papel protector del adhesivo.",
      "Peel the backing paper off the adhesive.",
    ],
    [
      "Pongan la membrana impermeable por la limahoya.",
      "Run the ice and water shield up the valley.",
    ],
    ["Presiónenla bien contra la cubierta.", "Press it down flat against the deck."],
    [
      "Una gotera en la limahoya puede dañar la casa.",
      "A leak in the valley can damage the house.",
    ],
    [
      "El capataz pregunta: ¿La limahoya está cubierta por completo?",
      "The foreman asks: Is the valley covered all the way?",
    ],
    [
      "Muéstrenme la protección de la limahoya antes de cubrirla.",
      "Show me the valley protection before it is covered.",
    ],
  ]),
  16: passage("Clavos en la franja", [
    [
      "El capataz revisa las tejas asfálticas de la hilera nueva.",
      "The foreman checks the asphalt shingles in the new course.",
    ],
    [
      "Ve un clavo muy alto, fuera de la franja de clavado.",
      "He sees a nail that is too high, outside the nailing strip.",
    ],
    ["Ese clavo está muy alto.", "That nail is too high."],
    ["Muéstrenme dónde está la franja.", "Show me where the strip is."],
    [
      "Mantengan los clavos dentro de la zona de clavado.",
      "Keep the nails inside the nailing zone.",
    ],
    ["Corrijan esta hilera.", "Fix this row."],
    [
      "El capataz toma la pistola de clavos y dice: Háganlo así.",
      "The foreman takes the nail gun and says: Do it like this.",
    ],
    [
      "Después, Pedro revisa cada clavo con más cuidado.",
      "Afterward, Pedro checks each nail more carefully.",
    ],
  ]),
  17: passage("El patrón de clavado", [
    [
      "Hoy la cuadrilla abre un paquete nuevo de tejas asfálticas.",
      "Today the crew opens a new package of asphalt shingles.",
    ],
    [
      "Un obrero pregunta: ¿Cuántos clavos necesita esta teja?",
      "A worker asks: How many nails does this shingle need?",
    ],
    [
      "En el ejemplo de la guía son cuatro clavos por teja.",
      "In the guide's example it is four nails per shingle.",
    ],
    [
      "Pero cada fabricante da sus propias instrucciones.",
      "But every manufacturer gives its own instructions.",
    ],
    ["Lean la envoltura del paquete.", "Read the wrapper on the package."],
    [
      "Revisen las instrucciones del producto antes de definir el patrón de clavado.",
      "Check the product instructions before setting the nail pattern.",
    ],
    [
      "Necesito el patrón exacto de este producto.",
      "I need the exact pattern for this product.",
    ],
    [
      "Después, usen el mismo patrón en cada teja.",
      "After that, use the same pattern on every shingle.",
    ],
  ]),
  18: passage("Clavos demasiado hundidos", [
    [
      "El capataz camina por el techo y escucha la pistola de clavos.",
      "The foreman walks the roof and listens to the nail gun.",
    ],
    [
      "Algunos clavos se ven demasiado hundidos.",
      "Some nails look overdriven.",
    ],
    [
      "El capataz levanta la mano y dice: Alto. Los clavos están muy hundidos.",
      "The foreman raises his hand and says: Stop. The nails are too deep.",
    ],
    [
      "La cabeza del clavo tiene que quedar al ras.",
      "The nail head has to sit flush.",
    ],
    [
      "Un obrero revisa el compresor y la manguera.",
      "A worker checks the compressor and the hose.",
    ],
    ["Bajen la presión de aire.", "Lower the air pressure."],
    ["Ajusten la pistola de clavos.", "Adjust the nail gun."],
    ["Pongan un clavo nuevo al lado.", "Put a new nail next to it."],
    [
      "Revisen la profundidad en unas cuantas tejas antes de seguir.",
      "Check the depth on a few shingles before continuing.",
    ],
  ]),
  19: passage("Tapajuntas en la pared", [
    [
      "Hoy la cuadrilla trabaja en la pared lateral de la casa.",
      "Today the crew is working on the sidewall of the house.",
    ],
    ["Aquí el techo se une con la pared.", "Here the roof meets the wall."],
    [
      "El capataz les pide a los instaladores: Expliquen la secuencia del tapajuntas de la pared lateral.",
      "The foreman asks the installers: Explain the sidewall flashing sequence.",
    ],
    [
      "Ellos responden: tapajuntas escalonado debajo de cada hilera.",
      "They answer: step flashing under each course.",
    ],
    ["Instalen una pieza por cada hilera.", "Install one piece per course."],
    ["Doblen el tapajuntas contra la pared.", "Bend the flashing against the wall."],
    [
      "Muéstrenme cómo se traslapa el tapajuntas.",
      "Show me how the flashing overlaps.",
    ],
    [
      "El capataz revisa cada pieza antes de colocar la siguiente hilera de tejas.",
      "The foreman checks each piece before placing the next course of shingles.",
    ],
  ]),
  20: passage("Caballetes y acabado", [
    ["La cuadrilla casi termina el techo.", "The crew is almost done with the roof."],
    [
      "Faltan la cumbrera y la limatesa.",
      "The ridge and the hip are still missing.",
    ],
    [
      "Primero, revisen las instrucciones del producto para el caballete.",
      "First, check the product instructions for the ridge cap.",
    ],
    [
      "Corten los caballetes de una teja inicial, si el producto lo permite.",
      "Cut the ridge caps from a starter shingle, if the product allows it.",
    ],
    [
      "Instalen los caballetes a lo largo de la cumbrera.",
      "Install the ridge caps along the ridge.",
    ],
    [
      "El capataz revisa también la ventilación de caballete.",
      "The foreman also checks the ridge vent.",
    ],
    ["Sellen el último caballete.", "Seal the last cap."],
    ["Cuando terminen, limpien el techo.", "When you finish, clean the roof."],
  ]),

  // ---- Lessons 21-30: longer sentences with reasons, conditions and safety language ----
  21: passage("Anclarse antes de subir", [
    [
      "Antes de subir, el capataz reúne a la cuadrilla junto a la escalera.",
      "Before going up, the foreman gathers the crew next to the ladder.",
    ],
    [
      "Nadie sube sin arnés, porque en el borde del techo hay riesgo de caída.",
      "Nobody goes up without a harness, because there is a fall hazard at the edge of the roof.",
    ],
    [
      "Revisen su arnés antes de subir: la hebilla, la eslinga y las correas.",
      "Check your harness before you climb: the buckle, the lanyard, and the straps.",
    ],
    [
      "Anclen el arnés antes de subir al techo.",
      "Tie your harness off before you go up on the roof.",
    ],
    ["Muéstrenme el anclaje aprobado.", "Show me the approved anchor."],
    [
      "Si no ven un anclaje de techo, no suban y avísenme.",
      "If you don't see a roof anchor, don't go up and tell me.",
    ],
    ["Pónganse también el casco.", "Put on your hard hat too."],
    [
      "La protección contra caídas solo sirve si cada persona la usa bien.",
      "Fall protection only works if each person uses it correctly.",
    ],
    [
      "Después de anclarse, cada persona levanta el pulgar para avisar al capataz.",
      "After tying off, each person gives a thumbs up to let the foreman know.",
    ],
  ]),
  22: passage("Revisión del anclaje", [
    [
      "Mientras trabajan en el techo, un obrero ve algo raro en la línea de vida.",
      "While they work on the roof, a worker sees something wrong with the lifeline.",
    ],
    ["Se detiene y avisa al capataz.", "He stops and tells the foreman."],
    [
      "El capataz dice: Detengan el trabajo. El anclaje no es seguro.",
      "The foreman says: Stop work. The anchor is not safe.",
    ],
    [
      "El capataz pregunta: ¿Dónde está la persona competente?",
      "The foreman asks: Where is the competent person?",
    ],
    [
      "Revisen si la línea de vida tiene daños.",
      "Check whether the lifeline has any damage.",
    ],
    [
      "La persona competente hace la inspección y confirma la distancia de caída del sistema.",
      "The competent person does the inspection and confirms the fall distance of the system.",
    ],
    [
      "Confirmen la instalación del anclaje antes de continuar.",
      "Confirm the anchor setup before we continue.",
    ],
    [
      "Un arnés no sirve de nada si el anclaje o la eslinga fallan.",
      "A harness is no use if the anchor or the lanyard fails.",
    ],
  ]),
  23: passage("Rocío y tormentas", [
    [
      "Son las 6:30 de la mañana y todavía hay rocío en el techo.",
      "It is 6:30 in the morning and there is still dew on the roof.",
    ],
    [
      "El capataz advierte: El techo está mojado. Tengan cuidado.",
      "The foreman warns: The roof is wet. Be careful.",
    ],
    [
      "Busquen un apoyo firme al pisar, porque el rocío hace resbaloso el techo.",
      "Look for solid footing, because the dew makes the roof slippery.",
    ],
    ["Usen botas con buen agarre.", "Wear boots with good grip."],
    [
      "Más tarde, el viento sube y se ven nubes oscuras en el cielo.",
      "Later, the wind picks up and dark clouds appear in the sky.",
    ],
    ["No trabajen el techo con relámpagos.", "Do not work the roof in lightning."],
    [
      "El capataz grita: Viene una tormenta. Bajen ahora.",
      "The foreman shouts: A storm is coming. Come down now.",
    ],
    [
      "Detengan el trabajo y bajen si cambia el tiempo.",
      "Stop work and come down if the weather changes.",
    ],
  ]),
  24: passage("Revisión por calor", [
    [
      "Hace mucho calor y el sol pega fuerte en el techo.",
      "It is very hot and the sun beats down on the roof.",
    ],
    [
      "El capataz dice: Tomen agua cada hora.",
      "The foreman says: Take a water break every hour.",
    ],
    [
      "Pero Raúl no se ve bien, y el capataz se acerca.",
      "But Raúl does not look well, and the foreman walks over.",
    ],
    [
      "El capataz le pregunta: ¿Cómo se siente?",
      "The foreman asks him: How do you feel?",
    ],
    ["¿Está mareado?", "Are you dizzy?"],
    ["Raúl contesta que sí, un poco.", "Raúl answers yes, a little."],
    [
      "El capataz le dice: Vaya a la sombra y descanse. Tome agua ahora.",
      "The foreman tells him: Go to the shade and rest. Drink water now.",
    ],
    [
      "Avíseme si se siente mal, y vamos a seguir el plan de calor del sitio.",
      "Tell me if you feel sick, and we will follow the site heat plan.",
    ],
    [
      "La hidratación y el descanso en la sombra ayudan a evitar el agotamiento por calor.",
      "Hydration and rest in the shade help prevent heat exhaustion.",
    ],
  ]),
  25: passage("Cuidado con los escombros", [
    [
      "Antes de seguir con el desmontaje, el capataz habla con la cuadrilla de tierra.",
      "Before continuing with the tear-off, the foreman talks to the ground crew.",
    ],
    [
      "Los escombros pueden caer del techo y lastimar a alguien que esté abajo.",
      "Debris can fall from the roof and hurt someone below.",
    ],
    [
      "Pongan la cinta de precaución alrededor de la zona restringida.",
      "Put up the warning tape around the exclusion area.",
    ],
    ["Aléjense de la casa.", "Move away from the house."],
    [
      "No se paren debajo del trabajo, aunque lleven casco.",
      "Don't stand under the work, even if you are wearing a hard hat.",
    ],
    [
      "Mantengan a la cuadrilla de tierra lejos de los escombros que caen.",
      "Keep the ground crew clear of falling debris.",
    ],
    [
      "Si usan el ducto de escombros, avisen primero: ¡Cuidado abajo! ¡Caen escombros!",
      "If you use the debris chute, warn people first: Heads up! Debris coming down!",
    ],
    [
      "Esperen hasta que yo diga que está despejado.",
      "Wait until I say it's clear.",
    ],
  ]),
  26: passage("Foto antes de cubrir", [
    [
      "Durante el desmontaje, la cuadrilla encontró un área dañada en la cubierta.",
      "During the tear-off, the crew found a damaged area on the deck.",
    ],
    [
      "El capataz dice: Muéstrenme el área dañada.",
      "The foreman says: Show me the damaged area.",
    ],
    [
      "Tomen una foto antes y después de la reparación.",
      "Take a photo before and after the repair.",
    ],
    [
      "Los obreros reemplazan el triplay dañado.",
      "The workers replace the damaged plywood.",
    ],
    [
      "El capataz pregunta: ¿Qué tan grande es la sección reparada?",
      "The foreman asks: How big is the repaired section?",
    ],
    [
      "Un obrero mide la sección y dice la medida.",
      "A worker measures the section and gives the measurement.",
    ],
    [
      "Tomen una foto del área reparada antes de cubrirla.",
      "Take a photo of the repaired area before covering it.",
    ],
    ["No lo cubran hasta que yo lo revise.", "Do not cover it until I check it."],
    [
      "La foto de la reparación es el registro de lo que queda en el área cubierta.",
      "The repair photo is the record of what stays in the covered area.",
    ],
  ]),
  27: passage("Penetraciones y tapajuntas", [
    [
      "Antes de terminar, el capataz quiere revisar todo lo que atraviesa el techo.",
      "Before finishing, the foreman wants to check everything that goes through the roof.",
    ],
    [
      "Recorramos cada penetración juntos.",
      "Let's walk each penetration together.",
    ],
    [
      "Le pregunta al jefe de cuadrilla: ¿Qué han revisado ya?",
      "He asks the crew lead: What have you already checked?",
    ],
    [
      "Revisen el tapajuntas alrededor de esta ventilación.",
      "Check the flashing around this vent.",
    ],
    ["¿El tapajuntas para tubo está agrietado?", "Is the pipe boot cracked?"],
    [
      "Si hay una grieta, el agua puede causar una gotera.",
      "If there is a crack, water can cause a leak.",
    ],
    [
      "Tomen una foto del tapajuntas alrededor de cada penetración.",
      "Take a photo of the flashing around each penetration.",
    ],
    ["Sellen los clavos expuestos.", "Seal the exposed nails."],
  ]),
  28: passage("Limpieza final", [
    [
      "El techo ya está terminado, pero todavía falta la limpieza.",
      "The roof is already finished, but the cleanup is still missing.",
    ],
    [
      "El capataz dice: Revisemos las canaletas y limpiemos el sitio antes de irnos.",
      "The foreman says: Let's check the gutters and clean the site before leaving.",
    ],
    [
      "Revisen si hay clavos y escombros en las canaletas.",
      "Check the gutters for nails and debris.",
    ],
    [
      "Una canaleta llena puede tapar la bajada de agua.",
      "A full gutter can block the downspout.",
    ],
    [
      "Recojan todos los clavos alrededor de la casa.",
      "Pick up every nail around the house.",
    ],
    [
      "Avísenme cuando terminen de recoger los clavos con el imán.",
      "Tell me when you finish picking up the nails with the magnet.",
    ],
    ["¿Está lleno el contenedor?", "Is the dumpster full?"],
    [
      "Usen la escoba en el patio y pongan la basura en el contenedor.",
      "Use the broom on the yard and put the trash in the dumpster.",
    ],
    [
      "Dejen el patio más limpio que como lo encontraron.",
      "Leave the yard cleaner than you found it.",
    ],
  ]),
  29: passage("Pendientes para mañana", [
    [
      "Es el final del día y la cuadrilla recoge sus herramientas.",
      "It is the end of the day and the crew packs up its tools.",
    ],
    [
      "Recorran el techo conmigo antes de dar el trabajo por terminado.",
      "Walk the roof with me before we call the job complete.",
    ],
    [
      "El capataz pregunta: ¿Qué áreas quedan pendientes para mañana?",
      "The foreman asks: Which areas are still open for tomorrow?",
    ],
    [
      "Una sección junto a la chimenea está sin terminar.",
      "One section next to the chimney is unfinished.",
    ],
    ["Esto sigue pendiente.", "This is still open."],
    ["Agréguenlo a la lista de pendientes.", "Add it to the punch list."],
    [
      "Mañana la primera tarea es terminar esta sección.",
      "Tomorrow the first task is to finish this section.",
    ],
    [
      "Guarden los materiales restantes en un lugar seguro.",
      "Store the remaining materials in a safe place.",
    ],
    [
      "Con la lista de pendientes, todos saben qué hacer mañana.",
      "With the punch list, everyone knows what to do tomorrow.",
    ],
  ]),
  30: passage("Un día completo de techo", [
    [
      "Por la mañana, el capataz abre la reunión informativa: Repasemos el plan del techo de hoy antes de empezar.",
      "In the morning, the foreman opens the briefing: Let's review today's roof plan before we start.",
    ],
    ["La seguridad es lo primero hoy.", "Safety comes first today."],
    [
      "Anclen el arnés antes de subir al techo.",
      "Tie off before you go on the roof.",
    ],
    [
      "Primero el desmontaje, luego la instalación.",
      "Tear-off first, then installation.",
    ],
    [
      "Cuando la cubierta está lista, la cuadrilla pone la sub-capa y el tapajuntas, y el jefe de cuadrilla revisa cada paso.",
      "When the deck is ready, the crew puts down the underlayment and the flashing, and the crew lead checks each step.",
    ],
    [
      "Por la tarde llega un aviso de tormenta, y el capataz ordena: Detengan el trabajo y bajen si cambia el tiempo.",
      "In the afternoon a storm warning arrives, and the foreman orders: Stop work and come down if the weather changes.",
    ],
    [
      "La cuadrilla cubre con una lona la sección sin terminar.",
      "The crew covers the unfinished section with a tarp.",
    ],
    [
      "Al final del día, el capataz pide: Recorran el techo conmigo antes de dar el trabajo por terminado.",
      "At the end of the day, the foreman asks: Walk the roof with me before we call the job complete.",
    ],
    [
      "Lo que falta queda en la lista de pendientes para el cierre de obra.",
      "Whatever is left stays on the punch list for the closeout.",
    ],
  ]),
};
