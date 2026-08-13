import type { ModuleCurriculum } from "./curriculum.ts";
import type { Lesson } from "./curriculum-helpers.ts";
import { r, sp, wm, pt, sb, ds, gr, ld } from "./curriculum-helpers.ts";

// ─── EMERGENCY MEDICINE ───────────────────────────────────────────────────────

const EM_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "First Contact in the ER",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Greet and triage an arriving ER patient, collect name and chief complaint",
    steps: [
      r("Read the EM triage passage. Find every greeting and intake question.", 7),
      wm("Drill: triage, urgente, estable, crítico, queja principal, signos vitales. 6/6.", 5),
      sp("Practice rapid intake: '¿Cómo se llama? ¿Qué le pasó? ¿Cuándo empezó? ¿Tiene dolor?'", 8),
    ],
  },
  {
    n: 2,
    title: "Chief Complaint & Onset",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Elicit the mechanism, onset, duration, and character of the chief complaint",
    steps: [
      r("Read the triage passage. Find all onset and timing vocabulary.", 7),
      pt(
        "Pattern: '¿Cuándo empezó? ¿Cómo empezó? ¿Ha tenido esto antes?' Build 5 onset questions.",
        6,
      ),
      sp(
        "Take a full chief complaint: location, onset, character, radiation, severity, modifiers.",
        7,
      ),
    ],
  },
  {
    n: 3,
    title: "Vital Signs Communication",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Call out vital signs and interpret them in clinical language",
    steps: [
      wm(
        "Drill: presión arterial, frecuencia cardíaca, respiración, temperatura, oxígeno. 5/5.",
        5,
      ),
      sb(
        "Build: 'La presión es [number]. La frecuencia es [number]. El oxígeno está al [%].' 4 examples.",
        6,
      ),
      sp("Call out a full set of vitals and state what's normal vs concerning.", 9),
    ],
  },
  {
    n: 4,
    title: "Level of Consciousness — AVPU/GCS",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess and report patient consciousness level using AVPU scale",
    steps: [
      r("Read the triage passage. Focus on neurological assessment language.", 7),
      pt(
        "Pattern: 'El paciente está [alert/verbal/pain/unresponsive]. Responde a [stimulus].' Build 4.",
        6,
      ),
      sp("Report: 'El paciente está consciente, alerta, orientado en persona, lugar y tiempo.'", 7),
    ],
  },
  {
    n: 5,
    title: "Primary Survey — ABCDE",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Verbalize each ABCDE survey step to your team",
    steps: [
      r("Read the triage passage fully. Map each clinical action to a vocabulary word.", 8),
      sb(
        "Build one sentence per ABCDE step: airway, breathing, circulation, disability, exposure.",
        5,
      ),
      sp(
        "Call out the full primary survey aloud: findings, actions, and team directions for each step.",
        7,
      ),
    ],
  },
  {
    n: 6,
    title: "Pain Assessment (OPQRST)",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Use OPQRST to fully characterize a patient's pain",
    steps: [
      r("Read the passage. Identify every pain descriptor word.", 6),
      pt(
        "Pattern: '¿El dolor es [sharp/dull/burning]? ¿Irradia a [location]? ¿Qué lo mejora?' Build full OPQRST.",
        8,
      ),
      sp(
        "Run a complete OPQRST pain assessment out loud. Score: 0–10, describe character, radiation.",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Allergies & Current Medications",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Ask about allergies and collect a medication list",
    steps: [
      r("Read the intake passage. Find allergy and medication vocabulary.", 6),
      wm(
        "Drill: alergia, reacción, medicamento, dosis, frecuencia, prescripción, sin receta. 7/7.",
        5,
      ),
      sp(
        "Ask: '¿Es alérgico a algún medicamento o alimento? ¿Qué medicamentos toma actualmente?'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Past Medical & Surgical History",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Obtain a focused past medical and surgical history",
    steps: [
      r("Read the triage passage. Find history-taking vocabulary.", 6),
      pt(
        "Pattern: '¿Tiene historial de [condition]? ¿Ha tenido cirugía de [type]? ¿Cuándo?' Build 5.",
        7,
      ),
      sp(
        "Take a complete PMH/PSH: chronic conditions, surgeries, hospitalizations, family history.",
        7,
      ),
    ],
  },
  {
    n: 9,
    title: "IV Access & Orders",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Explain IV placement and relay nurse orders in the target language",
    steps: [
      r("Read the triage passage. Find procedure and order vocabulary.", 7),
      sb(
        "Build: 'Voy a colocarle un suero en la vena. Necesita [medication] de [dose] [route].' 4 examples.",
        6,
      ),
      sp(
        "Explain IV placement to a patient and confirm the orders: 'Le voy a poner una vía IV para…'",
        7,
      ),
    ],
  },
  {
    n: 10,
    title: "Diagnostic Tests — Ordering & Explaining",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Order and explain diagnostic tests to the patient",
    steps: [
      wm("Drill: radiografía, tomografía, análisis de sangre, orina, electrocardiograma. 5/5.", 5),
      pt(
        "Pattern: 'Necesitamos un/una [test] para [reason]. Tardará aproximadamente [time].' Build 4.",
        6,
      ),
      sp(
        "Tell a patient: 'Le vamos a hacer una tomografía de la cabeza y análisis de sangre. Esto nos ayudará a…'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Trauma Assessment",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess a trauma patient using MIST handoff language",
    steps: [
      r("Read the triage passage urgently. This is a fast-paced trauma scenario.", 7),
      pt(
        "Pattern: 'Mecanismo: [event]. Lesiones: [injuries]. Signos: [vitals]. Tratamiento previo: [care].' Build 2 MISTs.",
        8,
      ),
      sp("Give a 60-second MIST handoff for a car accident patient. Be fast and precise.", 5),
    ],
  },
  {
    n: 12,
    title: "Chest Pain Workup",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Evaluate chest pain and explain the ACS workup to the patient",
    steps: [
      r("Read the triage passage. Focus on cardiac vocabulary.", 6),
      wm(
        "Drill: dolor torácico, infarto, angina, ECG, troponina, irradiación, sudoración. 7/7.",
        5,
      ),
      sp(
        "Explain to a patient: 'Tiene dolor en el pecho. Vamos a hacerle un electrocardiograma y análisis de sangre para ver si es el corazón.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Stroke Protocol (BE-FAST)",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Identify stroke symptoms using BE-FAST and communicate urgency",
    steps: [
      r("Read the triage passage. Focus on neurological emergency language.", 7),
      sb("Build a BE-FAST check: balance, eyes, face, arms, speech, time — in Spanish.", 5),
      sp(
        "Tell a patient's family: 'Su familiar tiene síntomas de un derrame. Necesitamos actuar ahora. ¿Cuándo empezaron los síntomas?'",
        8,
      ),
    ],
  },
  {
    n: 14,
    title: "Respiratory Distress",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess and manage respiratory distress communication",
    steps: [
      r("Read the passage. Find all respiratory vocabulary.", 7),
      pt(
        "Pattern: 'El paciente tiene dificultad para respirar. La saturación es [%]. Necesita [oxygen type].' Build 3.",
        6,
      ),
      sp(
        "Explain to a patient: 'Tiene dificultad para respirar. Le vamos a poner oxígeno y un medicamento para abrir sus pulmones.'",
        7,
      ),
    ],
  },
  {
    n: 15,
    title: "Shock Recognition & Response",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Recognize shock signs and communicate urgency to the team",
    steps: [
      r("Read the triage passage. Focus on hemodynamic vocabulary.", 7),
      wm("Drill: choque, hipotensión, taquicardia, perfusión, pálido, sudoroso, débil. 7/7.", 5),
      sp(
        "Alert your team: 'Atención — el paciente está en choque. Presión 80/50, FC 130. Necesitamos líquidos IV rápido.'",
        8,
      ),
    ],
  },
  {
    n: 16,
    title: "Pediatric Emergency",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess a pediatric patient and communicate with their parents",
    steps: [
      r("Read the triage passage. Note how language changes for children.", 6),
      sb(
        "Build 4 questions for a pediatric intake: age, weight, symptoms, last eaten, immunizations.",
        6,
      ),
      sp(
        "Address a frightened parent: 'Su hijo está estable. Necesitamos hacerle unos análisis. ¿Cuánto pesa? ¿Tiene alguna alergia?'",
        8,
      ),
    ],
  },
  {
    n: 17,
    title: "Psychiatric Emergency",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Approach a psychiatric patient calmly and safely in the target language",
    steps: [
      r("Read the triage passage. Find mental health and safety vocabulary.", 7),
      ds(
        "Role-play: patient is agitated and saying 'I want to hurt myself.' Respond calmly and safely.",
        9,
      ),
      sp(
        "Practice de-escalation: 'Estoy aquí para ayudarle. Está en un lugar seguro. Puede hablar conmigo.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Overdose & Toxicology",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Take a toxicology history and explain overdose treatment",
    steps: [
      r("Read the triage passage. Focus on toxicology vocabulary.", 6),
      wm(
        "Drill: sobredosis, intoxicación, sustancia, cantidad, hora, naloxona, carbón activado. 7/7.",
        5,
      ),
      sp(
        "Ask family: '¿Qué tomó? ¿Cuánto? ¿A qué hora? ¿Tiene recetas en casa?' Then explain treatment.",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Abdominal Emergency",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess acute abdominal pain using clinical intake language",
    steps: [
      r("Read the triage passage. Find abdominal vocabulary.", 6),
      pt(
        "Pattern: '¿Dónde exactamente le duele? ¿Tiene náuseas, vómitos, diarrea, fiebre?' Build full abdominal hx.",
        8,
      ),
      sp(
        "Take a full abdominal history: location, onset, GI symptoms, last meal, bowel changes.",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Head Injury Assessment",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess a head injury patient for concussion and intracranial injury",
    steps: [
      r("Read the triage passage. Find neurological assessment vocabulary.", 7),
      wm(
        "Drill: traumatismo craneal, pérdida de conciencia, amnesia, cefalea, vómito, visión. 6/6.",
        5,
      ),
      sp(
        "Ask: '¿Perdió el conocimiento? ¿Recuerda el accidente? ¿Tiene dolor de cabeza, vómito, visión doble?'",
        8,
      ),
    ],
  },
  {
    n: 21,
    title: "Wound Assessment & Closure",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Assess a wound and explain closure options to the patient",
    steps: [
      r("Read the passage. Find wound care vocabulary.", 6),
      sb(
        "Build: 'La herida mide [length] cm. Está [deep/superficial]. Necesita [sutures/staples/glue].' 3 examples.",
        6,
      ),
      sp(
        "Explain to a patient: 'Voy a limpiar la herida y ponerle [X] puntos. Le va a doler un poco con la anestesia.'",
        8,
      ),
    ],
  },
  {
    n: 22,
    title: "Syncope Evaluation",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Take a syncope history: prodrome, event, recovery",
    steps: [
      r("Read the triage passage. Find syncope and cardiac vocabulary.", 7),
      pt(
        "Pattern: '¿Qué sintió antes de desmayarse? ¿Alguien lo vio? ¿Cuánto tiempo estuvo inconsciente?' Build hx.",
        8,
      ),
      sp(
        "Take a complete syncope history: prodrome, position, duration, witnesses, post-event status.",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Sepsis Recognition",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Identify sepsis criteria and communicate the sepsis bundle",
    steps: [
      r("Read the triage passage. Focus on infection and inflammatory vocabulary.", 7),
      wm(
        "Drill: sepsis, fiebre, hipotermia, taquicardia, taquipnea, hipotensión, confusión. 7/7.",
        5,
      ),
      sp(
        "Alert the team: 'Sepsis alert — fiebre 39.5, FC 115, FR 24, presión 90/60. Necesitamos cultivos, antibióticos, y líquidos.'",
        8,
      ),
    ],
  },
  {
    n: 24,
    title: "Discharge Instructions",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Give clear ER discharge instructions and return precautions",
    steps: [
      r("Read the triage passage. Find discharge vocabulary.", 6),
      sb(
        "Build: 'Puede irse a casa. Tome [medication] por [days]. Regrese si tiene [warning sign].' 4 examples.",
        6,
      ),
      sp(
        "Give complete discharge: diagnosis, medications, activity restrictions, follow-up, red flags to return.",
        8,
      ),
    ],
  },
  {
    n: 25,
    title: "Family Communication",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Update a worried family member on the patient's condition",
    steps: [
      r("Read the triage passage. Focus on patient/family communication language.", 6),
      ds(
        "Role-play: family member demands to know why their parent has been waiting 3 hours. Respond empathetically.",
        9,
      ),
      sp(
        "Update a family: 'Su familiar está estable. Le estamos haciendo análisis. El doctor hablará con ustedes en [time].'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "SBAR Handoff to Admitting Team",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Hand off an admitted patient using SBAR in the target language",
    steps: [
      r("Read the triage passage. Map it to SBAR structure.", 7),
      pt(
        "Pattern: 'Situación/Antecedentes/Evaluación/Recomendación' — build a full SBAR for an ER patient.",
        8,
      ),
      sp(
        "Give a 90-second SBAR handoff for a patient being admitted for chest pain. Include all 4 elements.",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "Code Blue Communication",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Direct a code team and communicate CPR actions in the target language",
    steps: [
      r("Read the triage passage urgently.", 5),
      wm("Drill: paro cardíaco, RCP, desfibrilador, adrenalina, carga, descarga, ritmo. 7/7.", 5),
      sp(
        "Direct a code: 'Código azul. Inicie RCP. Traigan el desfibrilador. Preparen adrenalina 1mg IV.' Call every 2 minutes.",
        10,
      ),
    ],
  },
  {
    n: 28,
    title: "Breaking Bad News",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Inform a family of a serious diagnosis or death with compassion",
    steps: [
      r("Read the triage passage. Find empathy and communication vocabulary.", 6),
      ds(
        "Role-play: inform a family that their loved one has died. Use SPIKES framework in the target language.",
        10,
      ),
      sp(
        "Practice: 'Quisiera hablar con usted en privado. Tengo noticias difíciles. A pesar de todos nuestros esfuerzos…'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Multi-System Trauma",
    readingTemplate: "seed-{lang}-em-triage",
    objective: "Manage a complex trauma call with team communication",
    steps: [
      r("Read the triage passage rapidly.", 5),
      ds(
        "Role-play: multi-system trauma patient — lead the team, call orders, update family. Entirely in target language.",
        12,
      ),
      sp(
        "Debrief the case: diagnosis, treatment given, disposition, and what you told the family.",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full ER Encounter",
    readingTemplate: "seed-{lang}-em-triage",
    objective:
      "Complete a full ER patient encounter — intake to disposition — without switching languages",
    steps: [
      r("Read the full triage passage as a pre-shift review.", 5),
      ds(
        "AI-assisted full ER encounter: triage → assessment → orders → family update → disposition. Target language throughout.",
        12,
      ),
      sp(
        "Dictate your closing note: chief complaint, workup, diagnosis, treatment, and discharge plan.",
        3,
      ),
    ],
  },
];

// ─── NURSING ──────────────────────────────────────────────────────────────────

const NURSING_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Shift Handoff (SBAR)",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Give a complete SBAR shift handoff for an assigned patient",
    steps: [
      r("Read the nursing SBAR passage. Identify each SBAR section.", 8),
      pt(
        "Pattern: 'Situación: [issue]. Antecedentes: [history]. Evaluación: [status]. Recomendación: [plan].' Build one SBAR.",
        7,
      ),
      sp(
        "Give a full SBAR handoff for a post-surgical patient. Include vitals, meds due, and concerns.",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Patient Introduction & Assessment",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Introduce yourself to a patient and perform an initial nursing assessment",
    steps: [
      r("Read the nursing passage. Focus on greeting and assessment language.", 7),
      wm("Drill: nombre, turno, enfermera, evaluación, dolor, posición, alergias. 7/7.", 5),
      sp(
        "Introduce yourself: 'Buenos días, soy su enfermera hoy. Voy a revisar sus signos vitales y preguntarle cómo se siente.'",
        8,
      ),
    ],
  },
  {
    n: 3,
    title: "Vital Signs & Monitoring",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Take and report a full set of vital signs",
    steps: [
      r("Read the SBAR passage. Find vital sign vocabulary.", 6),
      wm("Drill: presión, pulso, temperatura, respiración, saturación, peso, glucosa. 7/7.", 5),
      sp(
        "Report vitals to a physician: 'La presión es 130/80, el pulso 88 y regular, la saturación 97% en aire ambiente.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Medication Administration",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Perform a medication check using the 5 rights in the target language",
    steps: [
      r("Read the nursing passage. Find medication safety vocabulary.", 7),
      sb(
        "Build 5 Rights checks: '¿Es el paciente correcto? ¿Es el medicamento correcto?…' All 5.",
        5,
      ),
      sp(
        "Explain to a patient: 'Voy a darle su medicamento para el dolor. Se llama [name]. Tómelo con agua.'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Pain Management",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Assess pain, administer medication, and follow up on effectiveness",
    steps: [
      r("Read the nursing passage. Focus on pain assessment language.", 6),
      pt(
        "Pattern: 'Su dolor está en [location]. Calificó [X/10]. Le di [medication] hace [time]. ¿Cómo está ahora?' Build 3.",
        7,
      ),
      sp("Do a full pain cycle: assess → intervene → reassess. Use the 0–10 scale throughout.", 7),
    ],
  },
  {
    n: 6,
    title: "IV Line Care & Flushing",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Explain IV care procedures to a patient and report line status",
    steps: [
      r("Read the nursing passage. Find IV and infusion vocabulary.", 7),
      wm("Drill: vía IV, suero, infusión, lumen, permeabilidad, flebitis, obstrucción. 7/7.", 5),
      sp(
        "Tell a patient: 'Voy a revisar su vía IV. Voy a limpiarla y asegurarme de que funciona bien.'",
        8,
      ),
    ],
  },
  {
    n: 7,
    title: "Wound & Dressing Assessment",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Assess a wound and document findings using clinical language",
    steps: [
      r("Read the nursing passage. Focus on wound and skin vocabulary.", 7),
      pt(
        "Pattern: 'La herida mide [cm]. El borde es [description]. El exudado es [type/amount]. El entorno es [status].' Build 2 notes.",
        8,
      ),
      sp(
        "Describe a wound to the charge nurse: location, size, drainage, tissue type, and current dressing.",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Patient Education & Discharge Teaching",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Teach a patient about their condition and discharge instructions",
    steps: [
      r("Read the nursing passage. Find education and teaching vocabulary.", 7),
      sb(
        "Build 4 teach-back questions: '¿Me puede repetir cuándo debe tomar el medicamento? ¿Cuándo debe llamar al médico?'",
        5,
      ),
      sp(
        "Teach a diabetic patient: diet, insulin technique, glucose monitoring, and when to call the doctor.",
        8,
      ),
    ],
  },
  {
    n: 9,
    title: "Mobility Assistance & Positioning",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Assist a patient with positioning and ambulation safely",
    steps: [
      r("Read the nursing passage. Find mobility and positioning vocabulary.", 6),
      pt(
        "Pattern: 'Voy a ayudarle a [action]. Necesito que [patient action]. Dígame si siente [discomfort].' Build 4.",
        7,
      ),
      sp(
        "Guide a patient out of bed: 'Primero, voy a subir la cabecera. Ahora coloque los pies al borde. Despacio…'",
        7,
      ),
    ],
  },
  {
    n: 10,
    title: "Nutrition & Diet Education",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Explain dietary restrictions and a meal plan to a patient",
    steps: [
      r("Read the nursing passage. Focus on nutrition vocabulary.", 6),
      wm(
        "Drill: dieta, restricción, sodio, azúcar, proteína, líquidos, calorías, alergia. 8/8.",
        5,
      ),
      sp(
        "Explain a cardiac diet: 'Su dieta es baja en sodio y grasas. Evite la sal, los fritos, y las carnes procesadas.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Fall Prevention & Safety",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Assess fall risk and educate the patient on safety measures",
    steps: [
      r("Read the nursing passage. Find safety and fall prevention vocabulary.", 6),
      sb(
        "Build 4 fall prevention instructions: bed rails, call light, non-slip socks, ask for help.",
        6,
      ),
      sp(
        "Tell the patient: 'Su riesgo de caída es alto. Por favor, llame cuando necesite levantarse. No camine solo.'",
        8,
      ),
    ],
  },
  {
    n: 12,
    title: "Urinary Catheter Care",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Explain catheter care and document status",
    steps: [
      r("Read the nursing passage. Focus on urological vocabulary.", 7),
      wm("Drill: sonda, orina, color, cantidad, obstrucción, infección, limpieza. 7/7.", 5),
      sp(
        "Explain to a patient: 'Tiene una sonda para drenar la orina. Voy a mantenerla limpia y revisar que funcione bien.'",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Oxygen Therapy",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Apply oxygen therapy and explain it to the patient",
    steps: [
      r("Read the nursing passage. Find respiratory and oxygen vocabulary.", 6),
      pt(
        "Pattern: 'Su saturación es [%]. Le voy a poner oxígeno por [device] a [L/min]. Respire profundo.' Build 3.",
        7,
      ),
      sp(
        "Explain supplemental oxygen: what it is, why it's needed, how to wear it, and what to report.",
        7,
      ),
    ],
  },
  {
    n: 14,
    title: "Blood Draw & Lab Specimens",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Explain a blood draw and obtain consent for the procedure",
    steps: [
      r("Read the nursing passage. Find phlebotomy vocabulary.", 6),
      wm("Drill: muestra, vena, torniquete, aguja, tubo, análisis, resultado. 7/7.", 5),
      sp(
        "Explain the blood draw: 'Necesito una muestra de sangre. Voy a colocar un torniquete. Va a sentir un pinchazo.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Post-Op Monitoring",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Monitor and report post-operative findings",
    steps: [
      r("Read the nursing SBAR passage. Focus on post-op vocabulary.", 7),
      pt(
        "Pattern: 'El paciente llegó de cirugía hace [time]. Signos vitales: [vitals]. Dolor: [score/10]. El sitio quirúrgico: [status].' Build 2.",
        8,
      ),
      sp(
        "Report post-op status to the surgeon: vitals, pain, incision, urine output, and patient level of consciousness.",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Responding to Patient Complaints",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Address a patient complaint with empathy and action",
    steps: [
      r("Read the nursing passage. Find empathy and complaint response vocabulary.", 6),
      ds(
        "Role-play: patient is angry because they've been waiting 2 hours for pain medication. Respond professionally.",
        9,
      ),
      sp(
        "Practice: 'Entiendo su frustración. Lo siento mucho. Voy a resolver esto ahora mismo.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Family Communication",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Update a patient's family on condition and plan of care",
    steps: [
      r("Read the nursing passage. Focus on family communication vocabulary.", 6),
      ds(
        "Role-play: worried family member calls wanting a patient update. Respond within HIPAA guidelines.",
        9,
      ),
      sp(
        "Update a family: 'Su familiar está descansando. Los signos vitales están estables. El plan de hoy es…'",
        5,
      ),
    ],
  },
  {
    n: 18,
    title: "Rapid Response & Emergency",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Call a rapid response and communicate patient deterioration",
    steps: [
      r("Read the nursing SBAR passage quickly. This is an urgent scenario.", 5),
      wm(
        "Drill: deterioro, respuesta rápida, urgencia, convulsión, inconsciencia, hipoxia. 6/6.",
        5,
      ),
      sp(
        "Call a rapid response: 'Respuesta rápida cuarto [#]. Paciente con [deterioration]. Necesito ayuda ahora.'",
        10,
      ),
    ],
  },
  {
    n: 19,
    title: "Clinical Documentation Language",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Use correct clinical language for nursing documentation",
    steps: [
      r("Read the nursing SBAR passage. Note the formal documentation language.", 7),
      pt(
        "Pattern: 'Paciente refiere [complaint]. Se administró [medication] a las [time]. Paciente tolera [intervention].' Build 3 notes.",
        8,
      ),
      sp(
        "Document a nursing note aloud: assessment findings, interventions performed, patient response.",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Isolation Precautions",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Explain isolation precautions to a patient and their visitors",
    steps: [
      r("Read the nursing passage. Find infection control vocabulary.", 6),
      wm(
        "Drill: aislamiento, contagio, guantes, mascarilla, bata, lavado de manos, precaución. 7/7.",
        5,
      ),
      sp(
        "Explain to a visitor: 'Su familiar está en aislamiento. Necesita ponerse guantes y mascarilla antes de entrar.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Mental Health Nursing",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Conduct a safety and mental status screen for a psychiatric patient",
    steps: [
      r("Read the nursing passage. Focus on mental health vocabulary.", 7),
      ds(
        "Role-play: patient discloses thoughts of self-harm during your assessment. Respond safely and compassionately.",
        10,
      ),
      sp(
        "Ask: '¿Ha pensado en hacerse daño? ¿Tiene un plan? ¿Está pensando en esto ahora mismo?'",
        3,
      ),
    ],
  },
  {
    n: 22,
    title: "Pediatric Nursing",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Adapt nursing communication for a pediatric patient and parent",
    steps: [
      r("Read the nursing passage. Note language adjustments for children.", 6),
      sb(
        "Build 4 child-friendly sentences: simple vocabulary, reassuring tone, explain what you're about to do.",
        6,
      ),
      sp(
        "Talk to a 5-year-old patient: '¿Cómo te llamas? ¿Dónde te duele? Voy a revisar tu bracito — no te va a doler.'",
        8,
      ),
    ],
  },
  {
    n: 23,
    title: "Oncology Nursing",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Support a cancer patient during chemotherapy administration",
    steps: [
      r("Read the nursing passage. Focus on oncology and IV vocabulary.", 7),
      wm(
        "Drill: quimioterapia, ciclo, náuseas, neutropenia, fatiga, neutrófilos, acceso central. 7/7.",
        5,
      ),
      sp(
        "Educate a patient starting chemo: 'Este medicamento puede causar náuseas y fatiga. Aquí está cómo manejarlo…'",
        8,
      ),
    ],
  },
  {
    n: 24,
    title: "End-of-Life Communication",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Support a patient and family in end-of-life care with compassionate language",
    steps: [
      r("Read the nursing passage. Find comfort and palliative care vocabulary.", 6),
      ds(
        "Role-play: patient asks 'Am I going to die?' Respond with compassion and honesty in the target language.",
        10,
      ),
      sp(
        "Practice: 'Estamos enfocados en que esté cómodo y sin dolor. Su familia puede estar con usted en todo momento.'",
        4,
      ),
    ],
  },
  {
    n: 25,
    title: "ICU Communication",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Communicate critical care status to physicians and families",
    steps: [
      r("Read the nursing SBAR passage. Focus on critical care vocabulary.", 8),
      pt(
        "Pattern: 'El paciente está en el ventilador a [settings]. Presores: [medication] a [dose]. Diuresis [output].' Build 2 ICU reports.",
        7,
      ),
      sp(
        "Give ICU rounds report: ventilator status, drips, fluid balance, sedation, and daily goals.",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Discharge Planning Coordination",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Coordinate discharge planning and communicate with the care team",
    steps: [
      r("Read the nursing passage. Focus on discharge planning vocabulary.", 6),
      sb(
        "Build: 'El paciente estará listo para el alta el [date]. Necesitará [equipment/services/follow-up].' 3 examples.",
        6,
      ),
      sp(
        "Communicate the discharge plan to the patient, family, and write the SBAR for case management.",
        8,
      ),
    ],
  },
  {
    n: 27,
    title: "Medication Reconciliation",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Complete a full medication reconciliation at admission",
    steps: [
      r("Read the nursing passage. Focus on medication vocabulary.", 7),
      pt(
        "Pattern: '¿Toma [medication] en casa? ¿Qué dosis? ¿Con qué frecuencia? ¿Lo tiene con usted?' Build full reconciliation.",
        8,
      ),
      sp(
        "Complete a medication reconciliation for a patient with 5 home medications. Ask about dose, frequency, route.",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Charge Nurse Communication",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Report a patient situation to the charge nurse using SBAR",
    steps: [
      r("Read the nursing SBAR passage. Focus on escalation language.", 6),
      ds(
        "Role-play: patient has deteriorated. Escalate to charge nurse with a complete SBAR in the target language.",
        10,
      ),
      sp(
        "Practice the escalation: 'Cargo, tengo una situación. El paciente del cuarto [#] está [problem]. Necesito que venga.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Quality & Safety Reporting",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Report a safety event using standard language",
    steps: [
      r("Read the nursing passage. Focus on safety event vocabulary.", 6),
      sb(
        "Build an incident report statement: 'El paciente [event] a las [time] en [location]. Se encontraba [status]. Se realizó [action].'",
        7,
      ),
      sp(
        "Report a fall event to the charge nurse and complete a verbal incident report in the target language.",
        7,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Nursing Shift",
    readingTemplate: "seed-{lang}-nursing-sbar",
    objective: "Complete an entire nursing shift's communications without switching languages",
    steps: [
      r("Read the SBAR passage as a shift prep review.", 5),
      ds(
        "AI-assisted full shift: handoff → assessment → meds → family call → incident → discharge teaching. Target language only.",
        12,
      ),
      sp(
        "Give end-of-shift report: each patient's status, key events, pending orders, and concerns.",
        3,
      ),
    ],
  },
];

// ─── FAMILY MEDICINE ──────────────────────────────────────────────────────────

const FAMILY_MED_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Annual Wellness Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a preventive wellness visit: reason for visit, screenings, vaccines",
    steps: [
      r("Read the family medicine passage. Focus on preventive care vocabulary.", 7),
      wm("Drill: visita preventiva, vacuna, tamizaje, presión, colesterol, glucosa, peso. 7/7.", 5),
      sp(
        "Open a wellness visit: '¿Cómo está en general? Hoy vamos a revisar su salud y hablar de prevención.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Acute URI — Cold & Flu",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess an upper respiratory infection and give appropriate guidance",
    steps: [
      r("Read the family medicine passage. Focus on respiratory symptom vocabulary.", 6),
      pt(
        "Pattern: '¿Tiene [fever/cough/congestion]? ¿Cuántos días? ¿Ha podido [eat/sleep/work]?' Build URI intake.",
        7,
      ),
      sp(
        "Explain: 'Tiene una infección viral. Los antibióticos no le ayudarán. Le recomiendo descanso, líquidos, y…'",
        7,
      ),
    ],
  },
  {
    n: 3,
    title: "Hypertension Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss hypertension diagnosis, medications, and lifestyle changes",
    steps: [
      r("Read the diabetes passage. Find hypertension parallels.", 6),
      wm(
        "Drill: hipertensión, presión arterial, sistólica, diastólica, medicamento, dieta, sodio. 7/7.",
        5,
      ),
      sp(
        "Explain HTN: 'Su presión está alta. Esto puede causar problemas del corazón. Vamos a empezar con cambios de estilo de vida y posiblemente un medicamento.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Diabetes Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel a new diabetic patient on monitoring, diet, and medications",
    steps: [
      r("Read the diabetes passage in detail. This is your core scenario.", 9),
      pt(
        "Pattern: 'Para controlar su diabetes, necesita [action]. Evite [food]. Monitoree su glucosa [frequency].' Build 5 counseling points.",
        6,
      ),
      sp(
        "Counsel a newly diagnosed T2DM patient: glucose goals, diet, metformin start, and follow-up.",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "Chronic Pain Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate chronic pain and discuss a multimodal management plan",
    steps: [
      r("Read the family medicine passage. Focus on pain and chronic disease vocabulary.", 7),
      sb(
        "Build 4 pain management discussion sentences: duration, impact on function, prior treatments, goals.",
        5,
      ),
      sp(
        "Discuss chronic pain: history, current impact, medication options, physical therapy referral, and goals.",
        8,
      ),
    ],
  },
  {
    n: 6,
    title: "Depression Screening (PHQ-9)",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Administer a depression screening and respond to positive results",
    steps: [
      r("Read the family medicine passage. Find mental health vocabulary.", 6),
      pt(
        "Pattern: 'En las últimas dos semanas, ¿con qué frecuencia ha tenido [PHQ-9 symptom]?' Ask all 9 questions.",
        8,
      ),
      sp(
        "Respond to a positive PHQ-9: acknowledge, explore safety, discuss treatment options with empathy.",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Pediatric Well-Child Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a pediatric well-child check and address parent concerns",
    steps: [
      r("Read the family medicine passage. Focus on developmental vocabulary.", 7),
      wm("Drill: desarrollo, hitos, vacuna, altura, peso, visión, audición, lactancia. 8/8.", 5),
      sp(
        "Ask parents: '¿Cómo está comiendo? ¿Está en la escuela? ¿Alguna preocupación sobre su desarrollo?'",
        8,
      ),
    ],
  },
  {
    n: 8,
    title: "Preventive Screenings Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Recommend age-appropriate screenings and explain why they matter",
    steps: [
      r("Read the family medicine passage. Find screening vocabulary.", 6),
      sb(
        "Build 4 screening recommendations: 'Le recomiendo [screening] porque [reason]. Se hace [frequency].'",
        6,
      ),
      sp(
        "Recommend colonoscopy, mammogram, Pap, and lipid panel. Explain each briefly in patient language.",
        8,
      ),
    ],
  },
  {
    n: 9,
    title: "Medication Reconciliation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review and reconcile a patient's medication list at a visit",
    steps: [
      r("Read the diabetes passage. Focus on medication management language.", 7),
      pt(
        "Pattern: '¿Sigue tomando [medication]? ¿Tiene efectos secundarios? ¿Le alcanza el medicamento?' Build 4 checks.",
        7,
      ),
      sp(
        "Reconcile 4 medications: confirm name, dose, frequency, adherence, and side effects for each.",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Lifestyle Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel a patient on diet, exercise, and sleep as medicine",
    steps: [
      r("Read the family medicine passage. Find lifestyle vocabulary.", 6),
      wm(
        "Drill: ejercicio, dieta, sueño, estrés, alcohol, tabaco, peso, actividad física. 8/8.",
        5,
      ),
      sp(
        "Counsel on 3 lifestyle changes: 30 min walking daily, Mediterranean diet basics, and 7-8 hours sleep.",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Smoking Cessation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel a patient to quit smoking using the 5 A's",
    steps: [
      r("Read the family medicine passage. Find tobacco and cessation vocabulary.", 6),
      sb(
        "Build the 5 A's in Spanish: Preguntar, Aconsejar, Evaluar, Ayudar, Acompañar — one sentence each.",
        5,
      ),
      sp(
        "Counsel on quitting: 'El tabaco causa [list 3 risks]. Existen medicamentos y programas que le pueden ayudar.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Weight Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss BMI, weight goals, and a realistic management plan",
    steps: [
      r("Read the diabetes passage. Focus on metabolic syndrome vocabulary.", 6),
      pt(
        "Pattern: 'Su IMC es [number]. Esto lo pone en riesgo de [conditions]. Una meta realista es [goal].' Build 2.",
        7,
      ),
      sp(
        "Discuss weight with sensitivity: current health impact, realistic 5% goal, dietary changes, and follow-up.",
        7,
      ),
    ],
  },
  {
    n: 13,
    title: "Immunization Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review an immunization history and recommend missing vaccines",
    steps: [
      r("Read the family medicine passage. Find vaccine vocabulary.", 6),
      wm(
        "Drill: vacuna, refuerzo, influenza, tétanos, neumococo, hepatitis, HPV, reacción. 8/8.",
        5,
      ),
      sp(
        "Recommend flu shot: 'Le recomiendo la vacuna contra la influenza. Se la podemos poner hoy. ¿Tiene alguna alergia?'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Specialist Referral Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain why you're referring a patient and what to expect",
    steps: [
      r("Read the family medicine passage. Find referral vocabulary.", 6),
      pt(
        "Pattern: 'Le refiero a [specialist] porque [reason]. Ellos le van a hacer [procedure/evaluation]. Llámenos cuando tenga su cita.' Build 3.",
        8,
      ),
      sp(
        "Explain a cardiology referral: reason, what the cardiologist will do, timeline, and what to bring.",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Lab Results Review",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review and explain lab results to a patient in plain language",
    steps: [
      r("Read the diabetes passage. Focus on lab value vocabulary.", 7),
      sb(
        "Build 4 lab explanations: 'Su [test] es [value]. Lo normal es [range]. Esto significa [interpretation].'",
        5,
      ),
      sp(
        "Review: HbA1c 8.2% (above goal), LDL 145 (needs treatment), creatinine 1.4 (mildly elevated). Explain each.",
        8,
      ),
    ],
  },
  {
    n: 16,
    title: "Elderly Patient Care",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Adjust communication and care plan for an elderly patient",
    steps: [
      r("Read the family medicine passage. Note how complexity of language changes.", 6),
      ds(
        "Role-play: 78-year-old patient comes in with 3 new complaints and is on 8 medications. Navigate with patience.",
        10,
      ),
      sp(
        "Practice slow, clear explanations and involve the caregiver: '¿Tiene un familiar que le ayude en casa?'",
        4,
      ),
    ],
  },
  {
    n: 17,
    title: "Teen Health Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a confidential adolescent health visit",
    steps: [
      r("Read the family medicine passage. Find adolescent health vocabulary.", 6),
      sb(
        "Build HEADS assessment questions: Hogar, Educación, Actividades, Drogas, Sexualidad — one question each.",
        5,
      ),
      sp(
        "Ask a teen confidentially: 'Voy a hacerte unas preguntas privadas. ¿Está bien si tu mamá espera afuera por un momento?'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Women's Health Basics",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a gynecologic history and discuss a Pap smear",
    steps: [
      r("Read the family medicine passage. Focus on women's health vocabulary.", 7),
      wm(
        "Drill: ciclo menstrual, embarazo, Papanicolaou, anticonceptivo, menopausia, flujo. 6/6.",
        5,
      ),
      sp(
        "Explain the Pap smear: '¿Cuándo fue su última citología? Este examen detecta células anormales. Tarda menos de un minuto.'",
        8,
      ),
    ],
  },
  {
    n: 19,
    title: "Men's Health Basics",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss prostate screening and testosterone issues",
    steps: [
      r("Read the family medicine passage. Focus on men's health vocabulary.", 6),
      pt(
        "Pattern: 'A partir de los [age], recomendamos [screening] para detectar [condition]. ¿Tiene síntomas de [condition]?' Build 3.",
        7,
      ),
      sp(
        "Discuss PSA screening with a 50-year-old: risks, benefits, shared decision-making, and patient preference.",
        7,
      ),
    ],
  },
  {
    n: 20,
    title: "Urgent Care Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage an urgent but non-emergency visit efficiently",
    steps: [
      r("Read the family medicine passage. Focus on acute care vocabulary.", 6),
      ds(
        "Role-play: patient with 3-day ear pain, fever 38.5, concerned it's spreading. Manage efficiently.",
        9,
      ),
      sp(
        "Assess, diagnose, and treat: 'Tiene una infección del oído. Le voy a recetar [antibiotic]. Tome [instructions].'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Allergy Evaluation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Distinguish drug allergy from intolerance and document correctly",
    steps: [
      r("Read the family medicine passage. Find allergy vocabulary.", 6),
      wm(
        "Drill: alergia, intolerancia, reacción, urticaria, anafilaxia, dipendencia, rash. 7/7.",
        5,
      ),
      sp(
        "Clarify: 'Cuando tomó penicilina, ¿qué pasó exactamente? ¿Tuvo dificultad para respirar o solo molestia estomacal?'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Sleep Disorder Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess insomnia or sleep apnea and discuss management",
    steps: [
      r("Read the family medicine passage. Find sleep vocabulary.", 6),
      sb("Build Epworth Sleepiness Scale questions in Spanish — 4 examples.", 5),
      sp(
        "Discuss sleep: '¿Cuántas horas duerme? ¿Se siente descansado? ¿Ronca? ¿Su pareja nota que deja de respirar?'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Skin Condition Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Describe a skin lesion using clinical dermatology vocabulary",
    steps: [
      r("Read the family medicine passage. Find skin vocabulary.", 6),
      pt(
        "Pattern: 'La lesión es [type]. Mide [size]. El borde es [description]. El color es [description]. Está en [location].' Build 2.",
        8,
      ),
      sp(
        "Describe a skin lesion to a dermatologist consultant: ABCDE criteria, patient history, itching, duration.",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Gastrointestinal Complaints",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess abdominal symptoms and discuss GI diagnoses",
    steps: [
      r("Read the family medicine passage. Find GI vocabulary.", 7),
      wm(
        "Drill: náuseas, vómito, diarrea, estreñimiento, reflujo, distensión, sangrado, gas. 8/8.",
        5,
      ),
      sp(
        "Take a full GI history: symptoms, timeline, food associations, red flags, and prior episodes.",
        8,
      ),
    ],
  },
  {
    n: 25,
    title: "Headache & Migraine Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate headache and counsel on migraine management",
    steps: [
      r("Read the family medicine passage. Focus on neurological vocabulary.", 7),
      pt(
        "Pattern: '¿Dónde le duele exactamente? ¿Es pulsante? ¿Tiene náuseas o sensibilidad a la luz?' Build POUND criteria.",
        7,
      ),
      sp(
        "Counsel on migraines: triggers, abortive therapy, preventive options, and red flag headaches.",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Urinary Complaints",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate a UTI or BPH and explain treatment",
    steps: [
      r("Read the family medicine passage. Find urinary vocabulary.", 6),
      wm(
        "Drill: orina, ardor, frecuencia, urgencia, sangre, retención, infección urinaria. 7/7.",
        5,
      ),
      sp(
        "Diagnose a UTI: 'Tiene síntomas de infección urinaria. El análisis de orina confirma la infección. Le receto [antibiotic].'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Advance Directive Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Introduce advance directives in a sensitive, respectful conversation",
    steps: [
      r("Read the family medicine passage. Find end-of-life planning vocabulary.", 6),
      ds(
        "Role-play: 65-year-old with new cancer diagnosis asks about end-of-life wishes. Guide the conversation.",
        10,
      ),
      sp(
        "Introduce: 'Me gustaría hablar sobre sus deseos de salud en el futuro — en caso de que no pueda comunicarse.'",
        4,
      ),
    ],
  },
  {
    n: 28,
    title: "Complex Chronic Disease Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage a patient with diabetes, hypertension, and depression in one visit",
    steps: [
      r("Read the diabetes passage as a multi-condition review.", 8),
      pt(
        "Build a multi-condition plan: 'Para la diabetes… Para la presión… Para el estado de ánimo…' 3 parallel plans.",
        7,
      ),
      sp(
        "Prioritize and communicate: 'Hoy vamos a enfocarnos en [top 2 issues]. Los demás los revisamos en [follow-up].'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "New Patient Intake",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Complete a comprehensive new patient history from scratch",
    steps: [
      r("Read the full diabetes passage as a model intake encounter.", 8),
      ds(
        "Role-play full new patient intake: CC, HPI, PMH, PSH, FH, SH, ROS, meds, allergies — target language throughout.",
        10,
      ),
      sp(
        "Summarize the intake: 'Este es un nuevo paciente de [age] con historia de [conditions]. Actualmente toma [meds]. Hoy presenta [chief complaint].'",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Wellness Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective:
      "Complete a full annual wellness visit — history, exam findings, plan — without switching languages",
    steps: [
      r("Read the family medicine passage as your pre-visit review.", 5),
      ds(
        "AI-assisted full wellness visit: greeting → focused history → screenings → lifestyle → plan → follow-up. Target language only.",
        12,
      ),
      sp(
        "Deliver the care plan: 'Hoy le recomiendo [3 actions]. Vamos a revisar sus análisis en [timeframe]. Puede llamar si tiene preguntas.'",
        3,
      ),
    ],
  },
];

// ─── OB-GYN ───────────────────────────────────────────────────────────────────

const OBGYN_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "First Prenatal Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Welcome a new OB patient and collect a complete obstetric history",
    steps: [
      r("Read the family medicine passage. Adapt it to obstetric context.", 7),
      wm("Drill: embarazo, semanas, partos, abortos, cesárea, prenatal, ultrasonido. 7/7.", 5),
      sp(
        "Open the first prenatal visit: '¡Felicidades! ¿Cuándo fue su último período? ¿Tiene otros embarazos o partos?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Obstetric Vocabulary Foundation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Master the 30 most essential obstetric terms in the target language",
    steps: [
      r("Read the family medicine passage. Note all pregnancy-related vocabulary.", 6),
      wm(
        "Drill: G/P notation, placenta, cordón, líquido amniótico, cérvix, dilatación, borramiento. 7/7.",
        5,
      ),
      sp(
        "Explain the OB intake abbreviations: 'G3P2 significa que ha tenido 3 embarazos y 2 partos.'",
        9,
      ),
    ],
  },
  {
    n: 3,
    title: "Gestational Age & Due Date",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Calculate and explain gestational age and estimated due date",
    steps: [
      r("Read the family medicine passage. Focus on dates and gestational vocabulary.", 6),
      pt(
        "Pattern: 'Su fecha de última regla fue el [date]. Tiene [X] semanas de embarazo. Su fecha probable de parto es [date].' Build 2.",
        8,
      ),
      sp(
        "Explain the due date calculation and Naegele's rule to the patient in plain language.",
        6,
      ),
    ],
  },
  {
    n: 4,
    title: "Fetal Movement Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Teach kick counting and when to call about decreased movement",
    steps: [
      r("Read the family medicine passage. Focus on fetal development vocabulary.", 7),
      sb(
        "Build: 'Cuente los movimientos del bebé [frequency]. Si cuenta menos de [number] en [time], llame.' 3 scenarios.",
        5,
      ),
      sp(
        "Teach kick counting: 'A las 28 semanas, comience a contar los movimientos. Haga esto [time of day] por [duration].'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Prenatal Nutrition & Vitamins",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel on prenatal nutrition, supplements, and food safety",
    steps: [
      r("Read the family medicine passage. Focus on nutrition vocabulary.", 6),
      wm(
        "Drill: ácido fólico, hierro, calcio, vitamina prenatal, listeria, mercurio, náuseas. 7/7.",
        5,
      ),
      sp(
        "Counsel: 'Tome su vitamina prenatal diariamente. Evite los mariscos crudos, la carne poco cocida, y quesos suaves no pasteurizados.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Glucose Tolerance Screening",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain the glucose tolerance test and gestational diabetes management",
    steps: [
      r("Read the diabetes passage. Apply it to gestational diabetes context.", 7),
      pt(
        "Pattern: 'El examen mide el azúcar después de tomar glucosa. Si el resultado es [high], podría tener diabetes gestacional.' Build explanation.",
        8,
      ),
      sp(
        "Explain GDM to a patient: what it means, dietary changes, glucose monitoring, and fetal risks.",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Birth Plan Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review a patient's birth preferences and set realistic expectations",
    steps: [
      r("Read the family medicine passage. Focus on labor and delivery vocabulary.", 7),
      ds(
        "Role-play: patient wants a completely unmedicated birth in a high-risk case. Discuss respectfully.",
        9,
      ),
      sp(
        "Ask: '¿Ha pensado en su plan de parto? ¿Le interesa la epidural? ¿Hay personas que desea tener en el parto?'",
        4,
      ),
    ],
  },
  {
    n: 8,
    title: "Labor Signs & ER Triage",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Teach a patient the signs of true labor and when to go to the hospital",
    steps: [
      r("Read the family medicine passage. Find labor vocabulary.", 6),
      sb(
        "Build 4 labor warning signs: regular contractions, water breaking, bleeding, decreased movement.",
        6,
      ),
      sp(
        "Teach: 'Vaya al hospital si tiene contracciones cada 5 minutos por 1 hora, si se le rompe la fuente, o si hay sangrado.'",
        8,
      ),
    ],
  },
  {
    n: 9,
    title: "Cervical Exam & Labor Progress",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain cervical exam findings and labor progress to a patient",
    steps: [
      r("Read the family medicine passage. Focus on labor progress vocabulary.", 7),
      pt(
        "Pattern: 'Tiene [X] cm de dilatación y [%] de borramiento. El bebé está en estación [number].' Build 3 exams.",
        8,
      ),
      sp(
        "Tell a laboring patient: 'Está a 5 cm. La cabeza del bebé está bajando bien. Siga respirando.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Pain Management in Labor",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss epidural, IV medications, and non-pharmacologic pain relief",
    steps: [
      r("Read the family medicine passage. Find pain management vocabulary.", 6),
      wm("Drill: epidural, analgesia, catéter, bloqueo, contracción, alivio, espasmo. 7/7.", 5),
      sp(
        "Discuss the epidural: '¿Le gustaría la epidural? Le voy a explicar cómo funciona y los posibles efectos.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Delivery Room Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Coach a patient through pushing and delivery in the target language",
    steps: [
      r("Read the family medicine passage. Focus on active delivery vocabulary.", 6),
      sb(
        "Build 5 coaching sentences for the pushing stage: 'Empuje... Respire... El bebé está llegando...'",
        5,
      ),
      sp(
        "Coach through delivery: 'Con la próxima contracción, empuje fuerte. Aguante la respiración. Uno, dos, tres…'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Postpartum Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Perform a postpartum assessment and address patient concerns",
    steps: [
      r("Read the family medicine passage. Focus on postpartum vocabulary.", 7),
      pt(
        "Pattern: '¿Cómo se siente? ¿Tiene dolor? ¿Está sangrando? ¿Ha podido orinar? ¿Cómo está el bebé comiendo?' Build assessment.",
        7,
      ),
      sp(
        "Conduct a 4-hour postpartum check: fundus, lochia, pain, urine output, breastfeeding, and emotional status.",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Newborn Care Instructions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Teach essential newborn care to new parents",
    steps: [
      r("Read the family medicine passage. Find newborn vocabulary.", 6),
      wm(
        "Drill: cordón umbilical, ictericia, fontanela, circuncisión, baño, pañal, llanto. 7/7.",
        5,
      ),
      sp(
        "Teach new parents: umbilical cord care, normal newborn appearance, when to call the doctor.",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Breastfeeding Support",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Support breastfeeding initiation and troubleshoot common problems",
    steps: [
      r("Read the family medicine passage. Focus on lactation vocabulary.", 6),
      ds(
        "Role-play: new mom is frustrated because breastfeeding hurts and baby 'won't latch.' Provide support.",
        10,
      ),
      sp(
        "Teach latch technique: 'El bebé debe abrir la boca bien grande. Acérquelo con la nariz al nivel del pezón.'",
        4,
      ),
    ],
  },
  {
    n: 15,
    title: "Contraception Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel on postpartum contraceptive options",
    steps: [
      r("Read the family medicine passage. Find contraception vocabulary.", 6),
      wm(
        "Drill: anticonceptivo, píldora, dispositivo intrauterino, inyección, implante, condón, parche. 7/7.",
        5,
      ),
      sp(
        "Counsel on options: 'Ahora que tuvo el bebé, ¿ha pensado en anticoncepción? Aquí están las opciones…'",
        9,
      ),
    ],
  },
  {
    n: 16,
    title: "GYN Annual Exam",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a gynecologic annual exam and discuss findings",
    steps: [
      r("Read the family medicine passage. Focus on GYN vocabulary.", 7),
      pt(
        "Pattern: 'Hoy vamos a hacer su examen ginecológico. Incluye [components]. ¿Tiene alguna pregunta antes de empezar?' Build intro.",
        7,
      ),
      sp(
        "Walk through the GYN exam: explain each component before doing it, use reassuring language throughout.",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Pap Smear — Procedure & Results",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain the Pap smear procedure and communicate results",
    steps: [
      r("Read the family medicine passage. Find cervical screening vocabulary.", 6),
      wm("Drill: Papanicolaou, cérvix, células, anormal, displasia, VPH, colposcopía. 7/7.", 5),
      sp(
        "Explain an abnormal Pap: 'Su citología muestra células levemente anormales. No es cáncer, pero necesitamos hacer un seguimiento.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Abnormal Uterine Bleeding",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate abnormal uterine bleeding with a complete history",
    steps: [
      r("Read the family medicine passage. Focus on menstrual vocabulary.", 7),
      pt(
        "Pattern: '¿Cuántos días sangra? ¿Usa cuántas toallas al día? ¿Tiene coágulos? ¿Tiene dolor?' Build AUB history.",
        8,
      ),
      sp(
        "Take a full AUB history and explain your workup plan: 'Vamos a hacer un ultrasonido y análisis de sangre.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Pelvic Pain Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate pelvic pain and discuss differential diagnoses",
    steps: [
      r("Read the family medicine passage. Find pelvic anatomy vocabulary.", 6),
      wm("Drill: ovario, trompa, útero, endometriosis, quiste, fibromas, dolor pélvico. 7/7.", 5),
      sp(
        "Ask: '¿El dolor es constante o viene y va? ¿Empeora con el ciclo? ¿Tiene dolor al tener relaciones?'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Menopause Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss menopausal symptoms and management options",
    steps: [
      r("Read the family medicine passage. Focus on hormonal vocabulary.", 6),
      sb(
        "Build 4 menopause symptom discussions: hot flashes, vaginal dryness, sleep, mood changes.",
        5,
      ),
      sp(
        "Discuss HRT: '¿Ha oído hablar de la terapia hormonal? Voy a explicarle los beneficios y los riesgos para su situación.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "STI Screening & Results Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Screen for STIs sensitively and communicate results without judgment",
    steps: [
      r("Read the family medicine passage. Find sexual health vocabulary.", 6),
      ds(
        "Role-play: communicate a positive chlamydia result and discuss treatment, partner notification.",
        10,
      ),
      sp(
        "Screen sensitively: 'Como parte del cuidado preventivo, hacemos pruebas de infecciones. Es confidencial. ¿Está bien?'",
        4,
      ),
    ],
  },
  {
    n: 22,
    title: "Preconception Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for a healthy pregnancy before conception",
    steps: [
      r("Read the family medicine passage. Focus on preconception vocabulary.", 6),
      wm("Drill: ácido fólico, rubéola, vacuna, peso ideal, condición crónica, genética. 6/6.", 5),
      sp(
        "Counsel preconception: 'Antes del embarazo, le recomiendo comenzar ácido fólico, actualizar vacunas, y controlar su presión.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Miscarriage Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Inform a patient of a pregnancy loss with compassion and clinical clarity",
    steps: [
      r("Read the family medicine passage. Find pregnancy complication vocabulary.", 6),
      ds(
        "Role-play: patient at 10 weeks, no fetal heartbeat on ultrasound. Deliver the news compassionately.",
        10,
      ),
      sp(
        "Practice: 'Lamento mucho tener que decirle esto. El ultrasonido muestra que el embarazo no está progresando.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "High-Risk Pregnancy Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain high-risk factors and the need for specialized monitoring",
    steps: [
      r("Read the family medicine passage. Focus on risk vocabulary.", 7),
      pt(
        "Pattern: 'Su embarazo es de alto riesgo por [factor]. Necesitará [additional monitoring/specialist]. El bebé y usted estarán más vigilados.' Build 3.",
        7,
      ),
      sp(
        "Explain pre-eclampsia risk to a hypertensive patient: symptoms to watch, extra visits, and 'when to call'.",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Fetal Monitoring Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain non-stress test and fetal monitoring to a patient",
    steps: [
      r("Read the family medicine passage. Find monitoring vocabulary.", 6),
      wm(
        "Drill: monitoreo, contracción, frecuencia fetal, aceleración, desaceleración, variabilidad. 6/6.",
        5,
      ),
      sp(
        "Explain the NST: 'Este examen revisa el latido del bebé. Vamos a ponerle unos sensores en la barriga por 20 minutos.'",
        9,
      ),
    ],
  },
  {
    n: 26,
    title: "Cesarean Section Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for an emergency or planned cesarean section",
    steps: [
      r("Read the family medicine passage. Focus on surgical obstetrics vocabulary.", 7),
      sb(
        "Build C-section prep instructions: NPO, IV, anesthesia consent, skin prep, who can be present.",
        5,
      ),
      sp(
        "Explain an urgent C-section: 'Necesitamos hacer una cesárea. El bebé necesita nacer ahora. Voy a explicarle rápidamente lo que va a pasar.'",
        8,
      ),
    ],
  },
  {
    n: 27,
    title: "Postpartum Depression Screening",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Screen for postpartum depression using the Edinburgh scale",
    steps: [
      r("Read the family medicine passage. Find mood and postpartum vocabulary.", 6),
      pt(
        "Pattern: 'Desde que tuvo el bebé, ¿ha sentido [Edinburgh question]? ¿Con qué frecuencia?' Ask 3 Edinburgh questions.",
        8,
      ),
      sp(
        "Respond to a positive screen: 'Lo que está sintiendo tiene nombre. Tiene tratamiento. Usted no está sola.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "High-Risk OB Discharge Teaching",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discharge a high-risk postpartum patient with comprehensive teaching",
    steps: [
      r("Read the family medicine passage. Focus on discharge vocabulary.", 6),
      sb(
        "Build 5 discharge instructions for a pre-eclampsia patient: BP monitoring, symptoms to call for, activity, diet, follow-up.",
        5,
      ),
      sp(
        "Give complete high-risk discharge: 'Usted tuvo preeclampsia. Necesita monitorear su presión en casa. Regrese si tiene…'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex OB Case — Full Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage a complex OB patient with multiple risk factors in one visit",
    steps: [
      r("Read the family medicine passage as a multi-factor case review.", 8),
      ds(
        "Role-play: 35-year-old with GDM, HTN, and twin pregnancy at 32 weeks. Manage the full visit.",
        10,
      ),
      sp(
        "Summarize the plan: diagnoses, medications, monitoring schedule, specialists, and next appointment.",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Prenatal Encounter",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Complete a first prenatal visit from intake to plan without switching languages",
    steps: [
      r("Read the family medicine passage as a prenatal prep review.", 5),
      ds(
        "AI-assisted first prenatal visit: history → labs → U/S review → nutrition → birth plan → questions. Target language only.",
        12,
      ),
      sp(
        "Close the visit: 'Tiene un embarazo saludable. Su próxima cita es en [weeks]. Llámenos si tiene preguntas o síntomas nuevos.'",
        3,
      ),
    ],
  },
];

// ─── CARDIOLOGY ───────────────────────────────────────────────────────────────

const CARDIOLOGY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Cardiac History Intake",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Collect a complete cardiac history — symptoms, risk factors, family history",
    steps: [
      r("Read the family medicine passage. Focus on cardiac and vascular vocabulary.", 7),
      wm("Drill: corazón, pecho, palpitaciones, disnea, edema, síncope, hipertensión. 7/7.", 5),
      sp(
        "Open a cardiac intake: '¿Ha tenido dolor en el pecho, palpitaciones, o falta de aire? ¿Antecedentes familiares de enfermedad cardíaca?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Chest Pain Assessment (PQRST)",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Characterize chest pain fully using PQRST and identify ACS red flags",
    steps: [
      r("Read the family medicine passage. Focus on pain characterization vocabulary.", 7),
      pt(
        "PQRST: '¿Qué provoca el dolor? ¿Es opresivo o agudo? ¿Irradia? ¿Del 1 al 10? ¿Qué lo alivia?' Build full assessment.",
        8,
      ),
      sp(
        "Assess a chest pain patient: ACS vs atypical vs GI. Ask all PQRST questions and note red flags.",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "ECG Vocabulary",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain an ECG procedure and discuss basic findings with a patient",
    steps: [
      r("Read the family medicine passage. Find cardiac procedure vocabulary.", 6),
      wm(
        "Drill: electrocardiograma, ritmo, frecuencia, onda, intervalo, infarto, bloqueio. 7/7.",
        5,
      ),
      sp(
        "Explain an ECG: 'Vamos a hacer un electrocardiograma. Son 10 electrodos en la piel. No duele y tarda 5 minutos.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Cardiac Risk Factors Counseling",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Identify and counsel on modifiable cardiac risk factors",
    steps: [
      r("Read the diabetes passage. Focus on metabolic and cardiac risk vocabulary.", 7),
      sb(
        "Build 5 risk factor counseling sentences: hypertension, DM, smoking, cholesterol, obesity.",
        5,
      ),
      sp(
        "Counsel a patient: 'Tiene [X] factores de riesgo cardíaco. Vamos a trabajar en reducir [top 2] con cambios de vida y medicamento.'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Hypertension Management in Cardiology",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage hypertension with specific drug class discussions",
    steps: [
      r("Read the family medicine passage. Focus on hypertension vocabulary.", 7),
      wm(
        "Drill: IECA, ARA, betabloqueante, calcioantagonista, diurético, meta de presión. 6/6.",
        5,
      ),
      sp(
        "Discuss HTN meds: 'Le voy a empezar con un medicamento llamado [drug class]. Actúa relajando los vasos sanguíneos.'",
        8,
      ),
    ],
  },
  {
    n: 6,
    title: "Heart Failure — Signs & Symptoms",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess heart failure symptoms and explain the condition",
    steps: [
      r("Read the family medicine passage. Focus on heart failure vocabulary.", 7),
      pt(
        "Pattern: '¿Tiene hinchazón en los pies? ¿Se cansa al subir escaleras? ¿Duerme con almohadas extra?' Build HF assessment.",
        7,
      ),
      sp(
        "Explain heart failure: 'Su corazón no bombea tan bien como antes. Por eso retiene líquido y se cansa más.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Atrial Fibrillation Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain atrial fibrillation and stroke risk to a patient",
    steps: [
      r("Read the family medicine passage. Find cardiac arrhythmia vocabulary.", 6),
      wm(
        "Drill: fibrilación auricular, ritmo irregular, coágulo, derrame, anticoagulante, CHA2DS2. 6/6.",
        5,
      ),
      sp(
        "Explain AFib: 'Su corazón late de manera irregular. Esto puede causar coágulos que van al cerebro. Necesitamos un anticoagulante.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Cardiac Medications Review",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review and explain the purpose of each cardiac medication",
    steps: [
      r("Read the family medicine passage. Focus on medication vocabulary.", 7),
      pt(
        "Pattern: '[Medication] es para [indication]. Tómelo [instructions]. Llame si tiene [side effect].' Build 5 drug counseling lines.",
        8,
      ),
      sp(
        "Review a cardiac medication list: aspirin, beta-blocker, ACE-I, statin, and diuretic — explain each.",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Stress Test Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain stress test types and preparation instructions",
    steps: [
      r("Read the family medicine passage. Find procedure vocabulary.", 6),
      wm(
        "Drill: prueba de esfuerzo, caminadora, nuclear, ecocardiograma, nada por boca, medicamentos. 6/6.",
        5,
      ),
      sp(
        "Prepare a patient: 'Vamos a hacer una prueba de esfuerzo. No coma nada 4 horas antes. No tome [medications]. Use zapatos cómodos.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Echocardiogram Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain an echocardiogram and discuss its findings with a patient",
    steps: [
      r("Read the family medicine passage. Find imaging vocabulary.", 6),
      sb(
        "Build 3 echocardiogram finding summaries: 'Su ecocardiograma muestra [finding]. Esto significa que [explanation].'",
        6,
      ),
      sp(
        "Explain an echo: 'El ecocardiograma usa sonido para ver su corazón. Vimos que la función es [X]% — lo normal es [range].'",
        8,
      ),
    ],
  },
  {
    n: 11,
    title: "Cholesterol & Statin Therapy",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss cholesterol results and statin initiation",
    steps: [
      r("Read the diabetes passage. Focus on lipid vocabulary.", 6),
      wm(
        "Drill: colesterol total, LDL, HDL, triglicéridos, estatina, atorvastatina, meta. 7/7.",
        5,
      ),
      sp(
        "Discuss results: 'Su LDL es 165 — más alto de lo recomendado para usted. Le voy a iniciar una estatina para reducirlo.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Lifestyle Modifications for Heart Health",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel on the DASH diet, exercise, and cardiac risk reduction",
    steps: [
      r("Read the family medicine passage. Focus on lifestyle vocabulary.", 6),
      pt(
        "Pattern: 'Para su corazón, le recomiendo [dietary change / exercise / lifestyle change]. Esto reduce el riesgo de [outcome] en [%].' Build 4.",
        8,
      ),
      sp(
        "Give cardiac lifestyle counseling: DASH diet basics, 150 min/week exercise, sodium limits, weight goal.",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Coronary Artery Disease Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain CAD pathophysiology and management in patient-friendly language",
    steps: [
      r("Read the family medicine passage. Find vascular vocabulary.", 7),
      wm("Drill: arteria coronaria, placa, obstrucción, angina, infarto, stent, bypass. 7/7.", 5),
      sp(
        "Explain CAD: 'Las arterias del corazón tienen placa. Esto reduce el flujo de sangre y puede causar dolor de pecho o un infarto.'",
        8,
      ),
    ],
  },
  {
    n: 14,
    title: "Heart Attack Recognition & Response",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Teach a patient to recognize heart attack symptoms and act fast",
    steps: [
      r("Read the family medicine passage. Focus on emergency cardiac vocabulary.", 6),
      sb(
        "Build the heart attack action plan: recognize → call 911 → chew aspirin → unlock door → don't drive alone.",
        5,
      ),
      sp(
        "Teach: 'Si tiene dolor de pecho, falta de aire, sudoración o dolor al brazo — llame al 911 inmediatamente.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Cardiac Catheterization Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for cardiac catheterization",
    steps: [
      r("Read the family medicine passage. Find invasive procedure vocabulary.", 7),
      pt(
        "Pattern: 'El cateterismo cardíaco es un procedimiento donde [description]. Usted puede sentir [sensation]. El riesgo incluye [risk].' Build consent.",
        8,
      ),
      sp(
        "Consent a patient: purpose, what happens, sensations to expect, risks (1–2%), recovery instructions.",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Post-Cath Discharge Instructions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discharge a post-cardiac catheterization patient with complete instructions",
    steps: [
      r("Read the family medicine passage. Focus on discharge vocabulary.", 6),
      sb(
        "Build post-cath instructions: access site care, activity restrictions, return precautions, medications.",
        5,
      ),
      sp(
        "Give post-cath discharge: 'Tiene que presionar la zona de acceso si sangra. No levante más de [X] libras por [X] días.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Pacemaker Patient Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain pacemaker implantation and care to a new patient",
    steps: [
      r("Read the family medicine passage. Find device therapy vocabulary.", 6),
      wm(
        "Drill: marcapasos, desfibrilador, implante, latido, batería, interrogación, magneto. 7/7.",
        5,
      ),
      sp(
        "Educate: 'Su marcapasos detecta cuando el corazón va demasiado lento y envía un impulso para regularlo.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Cardiac Rehabilitation Enrollment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Enroll a patient in cardiac rehab and explain the program",
    steps: [
      r("Read the family medicine passage. Focus on rehabilitation vocabulary.", 6),
      pt(
        "Pattern: 'La rehabilitación cardíaca es un programa de [duration] que incluye [components]. El objetivo es [goal].' Build enrollment conversation.",
        8,
      ),
      sp(
        "Enroll a patient: 'Le recomiendo la rehabilitación cardíaca. Va 3 veces por semana. Le ayudará a recuperarse más rápido y con más seguridad.'",
        6,
      ),
    ],
  },
  {
    n: 19,
    title: "Syncope in Cardiology",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate cardiac syncope and explain the workup",
    steps: [
      r("Read the family medicine passage. Find syncope and arrhythmia vocabulary.", 7),
      pt(
        "Pattern: '¿Tuvo advertencia antes de desmayarse? ¿Qué estaba haciendo? ¿Hubo testigos? ¿Se recuperó rápido?' Build syncope hx.",
        7,
      ),
      sp(
        "Explain the cardiac syncope workup: ECG, Holter, echocardiogram, tilt table — purpose of each.",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Peripheral Arterial Disease",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess PAD symptoms and explain the ankle-brachial index",
    steps: [
      r("Read the family medicine passage. Focus on vascular vocabulary.", 6),
      wm(
        "Drill: claudicación, índice tobillo-brazo, isquemia, úlcera, pulso, revascularización. 6/6.",
        5,
      ),
      sp(
        "Ask PAD questions: '¿Le duelen las piernas al caminar? ¿A qué distancia? ¿Se alivia con el reposo?'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Valve Disease Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain valvular heart disease and management to a patient",
    steps: [
      r("Read the family medicine passage. Find valve vocabulary.", 6),
      wm("Drill: válvula, estenosis, insuficiencia, aórtica, mitral, soplo, reemplazo. 7/7.", 5),
      sp(
        "Explain a murmur: 'Tiene un soplo. Esto significa que la válvula del corazón no cierra bien. Vamos a vigilarlo con ecocardiogramas.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Anticoagulation Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Educate a patient starting anticoagulation on safety and monitoring",
    steps: [
      r("Read the family medicine passage. Focus on anticoagulation vocabulary.", 7),
      sb(
        "Build 4 anticoagulation counseling points: purpose, bleeding signs, diet interactions, when to call.",
        5,
      ),
      sp(
        "Counsel: 'El anticoagulante previene coágulos. Llame si tiene sangrado inusual, moretones grandes, o heces oscuras.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Emergency Cardiac Language",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Communicate cardiac emergencies quickly and accurately",
    steps: [
      r("Read the family medicine passage urgently. Practice rapid assessment.", 5),
      wm(
        "Drill: STEMI, falla cardíaca aguda, shock cardiogénico, taponamiento, disección. 5/5.",
        5,
      ),
      sp(
        "Alert: 'STEMI en curso — necesito el laboratorio de cateterismo en 90 minutos. Llame al equipo de guardia.'",
        10,
      ),
    ],
  },
  {
    n: 24,
    title: "Family History & Genetic Risk",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Take a cardiac family history and discuss genetic risk",
    steps: [
      r("Read the family medicine passage. Focus on genetics and family history vocabulary.", 6),
      pt(
        "Pattern: '¿Algún familiar tuvo [cardiac event] antes de los 55/65 años? ¿De qué familiar? ¿A qué edad?' Build family hx protocol.",
        8,
      ),
      sp(
        "Discuss hereditary risk: '¿Hay historia de infartos o muerte súbita en su familia? Esto afecta su nivel de riesgo personal.'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Pre-procedure Teaching",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for any cardiac procedure with consent language",
    steps: [
      r("Read the family medicine passage. Focus on consent vocabulary.", 6),
      sb(
        "Build a consent conversation: procedure name, indication, what it involves, risks, alternatives, patient rights.",
        5,
      ),
      sp(
        "Consent a patient: 'El procedimiento se llama [name]. Sirve para [purpose]. Los riesgos son [risks]. ¿Tiene preguntas?'",
        9,
      ),
    ],
  },
  {
    n: 26,
    title: "Cardiac Surgery Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for open heart surgery",
    steps: [
      r("Read the family medicine passage. Find surgical vocabulary.", 7),
      wm(
        "Drill: cirugía cardíaca, anestesia general, bypass, ICU, recuperación, esternotomía, ventilador. 7/7.",
        5,
      ),
      sp(
        "Prepare a CABG patient: 'Mañana le haremos cirugía del corazón. Le explicaré lo que pasará antes, durante y después.'",
        8,
      ),
    ],
  },
  {
    n: 27,
    title: "Electrophysiology Vocabulary",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain electrophysiology studies and ablation procedures",
    steps: [
      r("Read the family medicine passage. Focus on electrophysiology vocabulary.", 6),
      wm(
        "Drill: ablación, taquicardia, arritmia, estudio electrofisiológico, cardioversión, desfibrilación. 6/6.",
        5,
      ),
      sp(
        "Explain ablation: 'El estudio electrofisiológico mapea las señales eléctricas del corazón para encontrar y eliminar la arritmia.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Breaking Bad Cardiac News",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Inform a patient of a serious cardiac diagnosis with compassion",
    steps: [
      r("Read the family medicine passage. Find empathy and serious diagnosis vocabulary.", 6),
      ds(
        "Role-play: inform a patient that their echo shows an EF of 25% and they need an LVAD evaluation.",
        10,
      ),
      sp(
        "Practice: 'Tengo noticias difíciles. Su corazón no está funcionando tan bien como necesitamos. Quiero hablarle de lo que sigue.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Cardiac Management — Full Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage a complex cardiac patient with multiple conditions and medications",
    steps: [
      r("Read the diabetes passage as a multi-condition prep.", 8),
      ds(
        "Role-play: 68-year-old with AFib, heart failure, CAD, diabetes, and 9 medications. Full cardiology visit.",
        10,
      ),
      sp(
        "Summarize the encounter: diagnoses, medication changes, monitoring plan, referrals, and next visit.",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Cardiac Consultation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective:
      "Complete a new cardiology consultation — from intake to care plan — without switching languages",
    steps: [
      r("Read the family medicine passage as your pre-consult review.", 5),
      ds(
        "AI-assisted new cardiac consult: chief complaint → cardiac history → risk factors → physical → workup → plan. Target language only.",
        12,
      ),
      sp(
        "Deliver the care plan: 'Diagnostico [condition]. El plan incluye [3 steps]. Su próxima cita es en [timeframe].'",
        3,
      ),
    ],
  },
];

// _APPEND_HERE_

// ─── GENERAL SURGERY ──────────────────────────────────────────────────────────

const GEN_SURGERY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Surgical Consult Opening",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Introduce yourself as a surgeon and open a surgical consultation",
    steps: [
      r("Read the family medicine passage. Focus on specialist intake vocabulary.", 7),
      wm(
        "Drill: cirujano, consulta, diagnóstico, indicación, riesgo, consentimiento, procedimiento. 7/7.",
        5,
      ),
      sp(
        "Open a consult: 'Soy el cirujano. Me enviaron para evaluar [problem]. Cuénteme más sobre sus síntomas.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Surgical History & Risk Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Take a complete surgical and anesthetic history",
    steps: [
      r("Read the family medicine passage. Find surgical history vocabulary.", 7),
      pt(
        "Pattern: '¿Ha tenido cirugías antes? ¿Tuvo problemas con la anestesia? ¿Tiene alergias? ¿Toma anticoagulantes?' Build surgical hx.",
        7,
      ),
      sp(
        "Complete a surgical risk assessment: previous surgeries, anesthesia reactions, medications, bleeding history.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Abdominal Exam Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct and verbalize an abdominal exam to the patient and team",
    steps: [
      r("Read the family medicine passage. Find abdominal exam vocabulary.", 6),
      wm(
        "Drill: cuadrante, rebote, rigidez, hepatomegalia, esplenomegalia, ruidos, sensibilidad. 7/7.",
        5,
      ),
      sp(
        "Verbalize your exam: 'El abdomen está blando. Hay sensibilidad en el cuadrante inferior derecho. No hay rebote.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Appendicitis Diagnosis & Plan",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Diagnose appendicitis and explain the need for surgery",
    steps: [
      r("Read the family medicine passage. Focus on acute abdomen vocabulary.", 7),
      sb(
        "Build: 'Los síntomas y el ultrasonido sugieren [diagnosis]. Le recomiendo [surgery]. Los riesgos son [risks].' 2 examples.",
        6,
      ),
      sp(
        "Explain appendicitis: 'Su apéndice está inflamado. Necesita una cirugía hoy para extirparlo antes de que se perfore.'",
        7,
      ),
    ],
  },
  {
    n: 5,
    title: "Gallbladder & Biliary Disease",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain cholecystitis and recommend laparoscopic cholecystectomy",
    steps: [
      r("Read the family medicine passage. Find hepatobiliary vocabulary.", 6),
      wm(
        "Drill: vesícula, cálculo, colecistitis, laparoscopía, colédoco, dolor cólico, grasa. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Los cálculos de la vesícula están causando sus síntomas. Le recomiendo extirpar la vesícula por laparoscopía.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Hernia Evaluation & Repair",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Evaluate a hernia and explain repair options",
    steps: [
      r("Read the family medicine passage. Focus on hernia vocabulary.", 6),
      pt(
        "Pattern: 'Tiene una hernia [type] en [location]. Mide [size]. Le recomiendo repararla porque [reason].' Build 2 cases.",
        8,
      ),
      sp(
        "Explain hernia repair: 'Vamos a reparar la hernia con una malla. La cirugía dura una hora. Se va a casa el mismo día.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Colorectal Cancer Screening",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss colon cancer screening and colonoscopy preparation",
    steps: [
      r("Read the family medicine passage. Find colorectal vocabulary.", 6),
      wm(
        "Drill: colonoscopía, pólipo, cáncer, biopsia, preparación, sedación, resultados. 7/7.",
        5,
      ),
      sp(
        "Recommend colonoscopy: 'A su edad, recomendamos colonoscopía. Detecta el cáncer a tiempo. ¿Ha tenido alguna antes?'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Pre-Op Informed Consent",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Obtain informed consent for a surgical procedure",
    steps: [
      r("Read the family medicine passage. Find consent vocabulary.", 7),
      sb(
        "Build consent elements: procedure name, indication, alternatives, risks, anesthesia, and right to refuse.",
        5,
      ),
      sp(
        "Obtain consent: 'El procedimiento es [name]. Sirve para [goal]. Los riesgos incluyen [risks]. ¿Tiene preguntas?'",
        8,
      ),
    ],
  },
  {
    n: 9,
    title: "Post-Op Care Orders",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Give post-op care instructions to a nurse in the target language",
    steps: [
      r("Read the family medicine passage. Focus on post-operative vocabulary.", 7),
      pt(
        "Pattern: 'Dieta: [restriction]. Actividad: [level]. Medicamentos: [orders]. Monitorear: [vitals/outputs]. Llamar si: [signs].' Build 2 post-op orders.",
        8,
      ),
      sp(
        "Give full post-op orders verbally: diet, activity, IV fluids, pain management, and monitoring parameters.",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Wound Care Instructions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain surgical wound care to a patient going home",
    steps: [
      r("Read the family medicine passage. Focus on wound care vocabulary.", 6),
      wm(
        "Drill: herida, apósito, cambio, infección, enrojecimiento, secreción, puntos, grapas. 8/8.",
        5,
      ),
      sp(
        "Give wound care discharge: 'Limpie la herida con agua y jabón. Cambie el apósito cada día. Llame si ve pus, fiebre, o enrojecimiento.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Bowel Prep & Dietary Restrictions",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain pre-surgical bowel prep and NPO instructions",
    steps: [
      r("Read the family medicine passage. Find bowel prep vocabulary.", 6),
      sb(
        "Build bowel prep instructions: liquid diet day before, laxative timing, NPO from midnight, morning medications.",
        5,
      ),
      sp(
        "Explain prep: 'Mañana nada por boca desde medianoche. Tome la preparación intestinal a las 4 PM de hoy.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Ostomy Patient Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain an ostomy to a patient preparing for colostomy",
    steps: [
      r("Read the family medicine passage. Find ostomy vocabulary.", 6),
      wm(
        "Drill: colostomía, ostomía, bolsa, estoma, intestino, cuidado, cambio, irrigación. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Después de la cirugía, tendrá una abertura en el abdomen para eliminar las heces. Le vamos a enseñar a cuidarla.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Gastrointestinal Bleed Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess and communicate about a GI bleed urgently",
    steps: [
      r("Read the family medicine passage. Focus on GI bleed vocabulary.", 7),
      pt(
        "Pattern: '¿Tiene heces negras o con sangre? ¿Vomitó sangre? ¿Cuándo fue la última vez? ¿Toma aspirina?' Build GI bleed hx.",
        8,
      ),
      sp(
        "Assess: '¿Cuánta sangre? ¿Desde cuándo? ¿Está mareado o débil? Vamos a hacer una endoscopía de urgencia.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Endoscopy Preparation & Explanation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain upper and lower endoscopy procedures",
    steps: [
      r("Read the family medicine passage. Find endoscopy vocabulary.", 6),
      wm(
        "Drill: endoscopía, colonoscopía, biopsía, sedación, úlcera, pólipo, esófago, colon. 8/8.",
        5,
      ),
      sp(
        "Explain EGD: 'Vamos a pasar una cámara por la boca para ver su estómago. Estará sedado. Tarda 15 minutos.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Surgical Complications Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Inform a patient of a post-surgical complication",
    steps: [
      r("Read the family medicine passage. Focus on complication vocabulary.", 6),
      ds(
        "Role-play: patient develops a wound infection on post-op day 3. Explain, treat, and reassure.",
        10,
      ),
      sp(
        "Communicate: 'Noto que la herida tiene señales de infección. Vamos a abrirla, limpiarla, y empezar antibióticos.'",
        4,
      ),
    ],
  },
  {
    n: 16,
    title: "Thyroid Surgery Preparation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prepare a patient for thyroidectomy",
    steps: [
      r("Read the family medicine passage. Focus on thyroid vocabulary.", 6),
      wm(
        "Drill: tiroides, tiroidectomía, nódulo, calcio, voz, nervio recurrente, cicatriz. 7/7.",
        5,
      ),
      sp(
        "Consent: 'Vamos a extirpar la tiroides. Los riesgos incluyen cambio en la voz y nivel bajo de calcio. Vigilaremos ambos.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Breast Surgery Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss breast biopsy or lumpectomy with sensitivity",
    steps: [
      r("Read the family medicine passage. Find breast surgery vocabulary.", 6),
      ds(
        "Role-play: woman just told she needs a breast biopsy. Address her fear sensitively and explain the procedure.",
        10,
      ),
      sp(
        "Explain: 'Vamos a hacer una biopsia del nódulo. Es un procedimiento menor, bajo anestesia local. Los resultados tardan 3-5 días.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Laparoscopic vs Open Surgery",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain the differences between laparoscopic and open surgical approaches",
    steps: [
      r("Read the family medicine passage. Focus on surgical technique vocabulary.", 7),
      sb(
        "Compare: 'La cirugía laparoscópica usa pequeñas incisiones. La cirugía abierta es más extensa. Las ventajas de la laparoscópica son [benefits].'",
        5,
      ),
      sp(
        "Present both options to a patient and let them understand the trade-offs before consenting.",
        8,
      ),
    ],
  },
  {
    n: 19,
    title: "Trauma Surgery Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Communicate during a trauma surgical emergency",
    steps: [
      r("Read the family medicine passage urgently.", 5),
      wm("Drill: trauma, hemorragia, laparotomía, hemoperitoneo, perforación, urgente. 6/6.", 5),
      sp(
        "Brief the OR team: 'Paciente con trauma abdominal, hemoperitoneo en TC. Necesitamos sala de urgencias ahora. ETA 5 minutos.'",
        10,
      ),
    ],
  },
  {
    n: 20,
    title: "Drain & Tube Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain drain and tube care to a patient going home",
    steps: [
      r("Read the family medicine passage. Find drain vocabulary.", 6),
      pt(
        "Pattern: 'Este tubo drena [fluid] de [area]. Vacíelo cuando esté [X] lleno. Anote la cantidad. Llame si el líquido es [abnormal].' Build 2.",
        8,
      ),
      sp(
        "Teach JP drain care: 'Vacíe el drenador dos veces al día. Anote la cantidad. Venga si hay más de [amount] en un día.'",
        6,
      ),
    ],
  },
  {
    n: 21,
    title: "Nutrition After Surgery",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Counsel on post-surgical dietary progression",
    steps: [
      r("Read the family medicine passage. Focus on nutrition vocabulary.", 6),
      sb(
        "Build diet progression: clear liquids → full liquids → soft → regular. One sentence per stage.",
        5,
      ),
      sp(
        "Explain diet progression: 'Empezamos con líquidos claros. Si lo tolera, pasamos a suaves en [X] días. Después una dieta normal.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Activity Restrictions After Surgery",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain activity restrictions and return-to-work expectations",
    steps: [
      r("Read the family medicine passage. Find post-op activity vocabulary.", 6),
      pt(
        "Pattern: 'No levante más de [X] libras por [X] semanas. Puede caminar pero sin [activity]. Regrese al trabajo en [X] weeks.' Build 3.",
        7,
      ),
      sp(
        "Give discharge activity instructions for a laparoscopic hernia repair: lifting, driving, work, sex.",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Follow-Up Visit Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a post-operative follow-up visit",
    steps: [
      r("Read the family medicine passage. Focus on follow-up vocabulary.", 6),
      ds(
        "Role-play: 2-week post-op follow-up for cholecystectomy. Review wound, symptoms, activity, and concerns.",
        9,
      ),
      sp(
        "Summarize the follow-up: 'La herida está bien. Puede retomar su dieta normal. Vuelva si tiene [symptoms].'",
        5,
      ),
    ],
  },
  {
    n: 24,
    title: "Bowel Obstruction Evaluation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess a bowel obstruction and explain treatment options",
    steps: [
      r("Read the family medicine passage. Focus on bowel obstruction vocabulary.", 7),
      wm(
        "Drill: obstrucción, distensión, náuseas, vómito bilioso, último gas, adherencias, sonda. 7/7.",
        5,
      ),
      sp(
        "Ask: '¿Cuándo pasó gas o tuvo evacuación por última vez? ¿Tiene distensión? El radiografía muestra obstrucción intestinal.'",
        8,
      ),
    ],
  },
  {
    n: 25,
    title: "Hernia Strangulation Emergency",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Identify and communicate about an incarcerated or strangulated hernia",
    steps: [
      r("Read the family medicine passage urgently.", 5),
      wm(
        "Drill: hernia encarcelada, estrangulada, isquemia, irreducible, urgencia, cirugía de emergencia. 6/6.",
        5,
      ),
      sp(
        "Tell the patient: 'Su hernia está atrapada y el tejido puede morir. Necesitamos cirugía de urgencia. No hay tiempo que perder.'",
        10,
      ),
    ],
  },
  {
    n: 26,
    title: "Oncologic Surgery Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss oncologic surgery for colon cancer with a patient",
    steps: [
      r("Read the family medicine passage. Find cancer surgery vocabulary.", 6),
      ds(
        "Role-play: patient just diagnosed with stage 2 colon cancer. Discuss surgical options, staging, and expectations.",
        10,
      ),
      sp(
        "Explain: 'Su cáncer está en etapa 2. Recomiendo cirugía para extirparlo. Vamos a hablar del procedimiento y la recuperación.'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Anastomotic Leak Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain an anastomotic leak complication to a patient and family",
    steps: [
      r("Read the family medicine passage. Focus on surgical complication vocabulary.", 6),
      ds(
        "Role-play: patient on post-op day 4 has fever and peritoneal signs — explain the likely complication.",
        10,
      ),
      sp(
        "Explain: 'La conexión que hicimos en el intestino parece estar filtrando. Necesitamos regresar a la sala de operaciones.'",
        4,
      ),
    ],
  },
  {
    n: 28,
    title: "Bowel Prep for Elective Surgery",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Give complete bowel preparation instructions for elective colon surgery",
    steps: [
      r("Read the family medicine passage. Focus on preparation vocabulary.", 6),
      sb(
        "Build a 2-day prep protocol: day before diet, laxative instructions, day-of NPO, morning medications.",
        5,
      ),
      sp(
        "Give full bowel prep instructions: dietary changes, laxative schedule, NPO cutoff, and what to bring.",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Surgical Case Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss a complex multi-procedure surgical plan with a patient",
    steps: [
      r("Read the family medicine passage as a complex case prep.", 8),
      ds(
        "Role-play: patient needs simultaneous cholecystectomy and hernia repair. Discuss combined procedure.",
        10,
      ),
      sp(
        "Summarize: 'Vamos a hacer dos procedimientos al mismo tiempo: extirpar la vesícula y reparar la hernia. Aquí está el plan...'",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Surgical Consultation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective:
      "Complete a full surgical consultation — from chief complaint to operative consent — without switching languages",
    steps: [
      r("Read the family medicine passage as your pre-op review.", 5),
      ds(
        "AI-assisted full surgical consult: intake → exam → imaging review → diagnosis → risks → consent. Target language only.",
        12,
      ),
      sp(
        "Summarize: 'Diagnostico [condition]. El plan quirúrgico es [procedure]. Firme el consentimiento y nos vemos [date].'",
        3,
      ),
    ],
  },
];

// ─── PAIN MANAGEMENT ──────────────────────────────────────────────────────────

const PAIN_MGMT_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Chronic Pain Intake",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Conduct a comprehensive chronic pain intake interview",
    steps: [
      r("Read the family medicine passage. Focus on pain vocabulary.", 7),
      wm(
        "Drill: dolor crónico, intensidad, impacto, función, sueño, estado de ánimo, calidad de vida. 7/7.",
        5,
      ),
      sp(
        "Open: 'Cuénteme todo sobre su dolor — dónde, cuándo empezó, qué lo empeora y qué lo mejora.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Pain Scale & Characterization",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Characterize pain using NRS, PQRST, and PROMIS vocabulary",
    steps: [
      r("Read the family medicine passage. Focus on pain descriptor vocabulary.", 7),
      pt(
        "Build PQRST: '¿Qué provoca? ¿Cómo es — quemante, punzante, opresivo? ¿Irradia? ¿Qué lo calma?' Full assessment.",
        7,
      ),
      sp(
        "Run a full pain characterization: NRS score, quality descriptors, temporal pattern, impact on ADLs.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Opioid Consent & Risk Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Obtain opioid treatment consent and discuss addiction risk",
    steps: [
      r("Read the family medicine passage. Find controlled substance vocabulary.", 6),
      ds(
        "Role-play: patient asks for opioids. Discuss risks, alternatives, and set expectations professionally.",
        10,
      ),
      sp(
        "Explain: 'Antes de recetar opioides, necesito hablar sobre los riesgos de dependencia y las reglas del tratamiento.'",
        4,
      ),
    ],
  },
  {
    n: 4,
    title: "Medication Options for Chronic Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain non-opioid and opioid medication options",
    steps: [
      r("Read the family medicine passage. Focus on analgesic vocabulary.", 7),
      wm("Drill: AINE, acetaminofén, gabapentina, duloxetina, tramadol, opioide, tópico. 7/7.", 5),
      sp(
        "Explain the analgesic ladder: 'Comenzamos con antiinflamatorios y neuropáticos. Si no es suficiente, consideramos opioides.'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Injection Therapy Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain epidural steroid injections and nerve blocks",
    steps: [
      r("Read the family medicine passage. Focus on injection vocabulary.", 6),
      sb(
        "Build 3 injection explanations: epidural, facet joint, trigger point — purpose, procedure, expectations.",
        5,
      ),
      sp(
        "Explain an epidural: 'La inyección de cortisona en la espalda puede reducir la inflamación y el dolor por meses.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Physical Therapy Referral for Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Refer a patient to PT and explain its role in pain management",
    steps: [
      r("Read the family medicine passage. Focus on rehabilitation vocabulary.", 6),
      pt(
        "Pattern: 'La fisioterapia le ayudará a [goal] mediante [techniques]. Espere sentir [outcome] en [timeframe].' Build referral.",
        7,
      ),
      sp(
        "Explain PT for chronic low back pain: core strengthening, posture, flexibility, and pain education.",
        7,
      ),
    ],
  },
  {
    n: 7,
    title: "Psychological Component of Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Introduce the biopsychosocial model of pain without dismissing the patient",
    steps: [
      r("Read the family medicine passage. Find mental health and pain vocabulary.", 6),
      ds(
        "Role-play: patient insists their pain is 'not in their head.' Explain the brain-pain connection respectfully.",
        10,
      ),
      sp(
        "Explain: 'El dolor es real y ocurre en el cerebro. El estrés y la ansiedad pueden amplificarlo — esto no significa que no es real.'",
        4,
      ),
    ],
  },
  {
    n: 8,
    title: "Sleep & Pain Connection",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss how sleep deprivation worsens pain and vice versa",
    steps: [
      r("Read the family medicine passage. Focus on sleep vocabulary.", 6),
      wm(
        "Drill: insomnio, sueño, ciclo de dolor, fatiga, melatonina, higiene del sueño, fragmentado. 7/7.",
        5,
      ),
      sp(
        "Counsel: 'El mal sueño empeora el dolor, y el dolor interrumpe el sueño. Vamos a trabajar en ambos.'",
        9,
      ),
    ],
  },
  {
    n: 9,
    title: "Medication Agreement & Monitoring",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Review an opioid treatment agreement with a patient",
    steps: [
      r("Read the family medicine passage. Find controlled substance safety vocabulary.", 7),
      sb(
        "Build 4 opioid agreement points: urine drug screens, one pharmacy, no early refills, safe storage.",
        5,
      ),
      sp(
        "Review the agreement: 'Estas son las reglas del tratamiento con opioides. Necesito que las entienda y las firme.'",
        8,
      ),
    ],
  },
  {
    n: 10,
    title: "Functional Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess pain's impact on daily function and work capacity",
    steps: [
      r("Read the family medicine passage. Focus on functional vocabulary.", 6),
      pt(
        "Pattern: '¿Puede [ADL]? ¿Puede trabajar? ¿Puede dormir/conducir/caminar [distance]? ¿Qué no puede hacer que antes podía?' Build functional hx.",
        8,
      ),
      sp(
        "Conduct a full functional assessment: work, ADLs, sleep, recreation, and social function.",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "TENS & Non-Pharmacologic Options",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain TENS, massage, acupuncture, and heat/cold therapy",
    steps: [
      r("Read the family medicine passage. Focus on non-pharmacologic vocabulary.", 6),
      wm(
        "Drill: TENS, acupuntura, masaje, calor, hielo, ultrasonido terapéutico, manipulación. 7/7.",
        5,
      ),
      sp(
        "Present options: 'Además de medicamentos, existen terapias complementarias como el TENS y la acupuntura que pueden ayudar.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Low Back Pain Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage a patient with chronic low back pain comprehensively",
    steps: [
      r("Read the family medicine passage. Find spinal vocabulary.", 7),
      ds(
        "Role-play: 45-year-old with 3-year history of low back pain, failed PT, now requesting opioids. Manage the visit.",
        10,
      ),
      sp(
        "Summarize the plan: 'El plan para su espalda incluye [3 interventions]. Comenzamos con [step 1] y evaluamos en [timeframe].'",
        3,
      ),
    ],
  },
  {
    n: 13,
    title: "Neuropathic Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain neuropathic pain and gabapentinoid therapy",
    steps: [
      r("Read the family medicine passage. Find neurological pain vocabulary.", 6),
      wm(
        "Drill: neuropático, ardor, hormigueo, eléctrico, gabapentina, nortriptilina, duloxetina. 7/7.",
        5,
      ),
      sp(
        "Explain: 'El dolor neuropático es diferente. Los nervios envían señales dolorosas incorrectas. Los medicamentos para este tipo son distintos.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Fibromyalgia Diagnosis & Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Diagnose fibromyalgia and educate the patient",
    steps: [
      r("Read the family medicine passage. Focus on fibromyalgia vocabulary.", 6),
      ds(
        "Role-play: patient frustrated after years of dismissal finally receives a fibromyalgia diagnosis. Respond empathetically.",
        10,
      ),
      sp(
        "Explain: 'La fibromialgia es real. Es un trastorno de procesamiento del dolor. No es artritis ni daño en los tejidos.'",
        4,
      ),
    ],
  },
  {
    n: 15,
    title: "Opioid Tapering Conversation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Discuss opioid tapering plan with a patient sensitively",
    steps: [
      r("Read the family medicine passage. Find opioid and tapering vocabulary.", 6),
      ds(
        "Role-play: patient resistant to tapering their oxycodone. Explore concerns, explain rationale, and agree on a plan.",
        10,
      ),
      sp(
        "Explain tapering: 'Quiero reducir la dosis gradualmente. El plan es bajar [X]% cada [X] weeks. Así evitamos síntomas de abstinencia.'",
        4,
      ),
    ],
  },
  {
    n: 16,
    title: "Headache Pain Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage chronic headache with abortive and preventive strategies",
    steps: [
      r("Read the family medicine passage. Focus on headache vocabulary.", 6),
      pt(
        "Pattern: 'Para el dolor agudo, tome [medication]. Para prevenir, tome [preventive] diariamente. Evite [triggers].' Build headache plan.",
        8,
      ),
      sp(
        "Counsel: 'Su migraña necesita dos tratamientos: uno para cuando le ataca y otro para que ataque menos.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Cancer Pain Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Manage cancer-related pain with compassion and clinical precision",
    steps: [
      r("Read the family medicine passage. Find cancer pain vocabulary.", 6),
      ds(
        "Role-play: cancer patient with uncontrolled pain on 10/10. Reassess and adjust opioid therapy.",
        10,
      ),
      sp(
        "Commit: 'Su dolor no está controlado y eso no es aceptable. Vamos a ajustar el tratamiento ahora mismo.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Palliative Pain Goals Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Align pain management goals with a palliative care patient's values",
    steps: [
      r("Read the family medicine passage. Focus on goals of care vocabulary.", 6),
      ds(
        "Role-play: patient with terminal cancer — discuss acceptable pain levels vs sedation risks.",
        10,
      ),
      sp(
        "Ask: '¿Cuál es su meta principal — estar más alerta o estar sin dolor? Podemos ajustar el plan según sus valores.'",
        4,
      ),
    ],
  },
  {
    n: 19,
    title: "Substance Use in Chronic Pain",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Address a positive urine drug screen sensitively and clinically",
    steps: [
      r("Read the family medicine passage. Focus on substance use vocabulary.", 6),
      ds(
        "Role-play: urine drug screen shows patient is on non-prescribed benzodiazepines. Address without judgment.",
        10,
      ),
      sp(
        "Address: 'Su análisis de orina mostró algo que necesitamos hablar. No estoy aquí para juzgar — quiero entender lo que está pasando.'",
        4,
      ),
    ],
  },
  {
    n: 20,
    title: "Interventional Procedures Consent",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Consent a patient for an interventional pain procedure",
    steps: [
      r("Read the family medicine passage. Focus on consent vocabulary.", 6),
      sb(
        "Build consent: procedure, indication, technique, risks (bleeding, infection, nerve damage), alternatives.",
        5,
      ),
      sp(
        "Consent for a spinal cord stimulator trial: 'Este dispositivo envía señales eléctricas para bloquear el dolor. Aquí están los riesgos...'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Spinal Cord Stimulator Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Educate a patient on spinal cord stimulation therapy",
    steps: [
      r("Read the family medicine passage. Find device therapy vocabulary.", 6),
      wm(
        "Drill: estimulador, electrodo, parrestesia, batería, control remoto, recarga, MRI. 7/7.",
        5,
      ),
      sp(
        "Explain SCS: 'El estimulador de la médula espinal cambia el dolor por una sensación de cosquilleo. Primero hacemos una prueba de 7 días.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Complex Regional Pain Syndrome",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain CRPS to a confused and frustrated patient",
    steps: [
      r("Read the family medicine passage. Focus on CRPS vocabulary.", 6),
      ds(
        "Role-play: patient with CRPS feels dismissed by previous doctors. Validate and explain the condition.",
        10,
      ),
      sp(
        "Explain: 'Tiene una condición llamada síndrome de dolor regional complejo. Es real y reconocida. El sistema nervioso está sobreactivado.'",
        4,
      ),
    ],
  },
  {
    n: 23,
    title: "Return-to-Work Functional Assessment",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Assess work capacity and complete a return-to-work evaluation",
    steps: [
      r("Read the family medicine passage. Focus on occupational vocabulary.", 6),
      pt(
        "Pattern: 'El paciente puede [work activity] por [duration]. Limitaciones: no puede [restriction]. Requiere [accommodation].' Build RTW form.",
        8,
      ),
      sp(
        "Complete a return-to-work evaluation: current limitations, accommodations needed, and timeline.",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Mindfulness & Pain Psychology",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Introduce mindfulness-based stress reduction for pain management",
    steps: [
      r("Read the family medicine passage. Find psychological pain vocabulary.", 6),
      sb(
        "Build 4 mindfulness practice instructions: breathing, body scan, visualization, mindful movement.",
        5,
      ),
      sp(
        "Introduce mindfulness: 'La meditación no cura el dolor, pero puede cambiar cómo su cerebro lo procesa. ¿Le gustaría intentarlo?'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Addiction vs Dependence Discussion",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain the clinical difference between dependence and addiction",
    steps: [
      r("Read the family medicine passage. Find addiction vocabulary.", 6),
      ds(
        "Role-play: patient upset because their file says 'opioid dependent.' Explain the distinction and address shame.",
        10,
      ),
      sp(
        "Clarify: 'Dependencia significa que su cuerpo se adaptó al medicamento — eso es normal. Adicción es diferente — implica pérdida de control.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Ketamine Infusion Consultation",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Explain ketamine infusion therapy for refractory pain",
    steps: [
      r("Read the family medicine passage. Focus on infusion vocabulary.", 6),
      wm(
        "Drill: ketamina, infusión, disociación, refractario, protocolo, tolerancia, sesión. 7/7.",
        5,
      ),
      sp(
        "Explain ketamine therapy: 'Es un tratamiento para el dolor que no responde a otros medicamentos. Se da en infusiones de 4 horas en el consultorio.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Medication Side Effect Management",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Address and manage common opioid side effects",
    steps: [
      r("Read the family medicine passage. Find side effect vocabulary.", 6),
      pt(
        "Pattern: 'Si tiene [side effect], tome [remedy]. Si persiste, llámenos. No pare el medicamento sin llamarnos.' Build 4 side effect responses.",
        8,
      ),
      sp(
        "Counsel on opioid side effects: constipation, nausea, drowsiness — management and when to call.",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Naloxone Education",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Prescribe and teach naloxone use for an opioid patient",
    steps: [
      r("Read the family medicine passage. Find opioid safety vocabulary.", 6),
      sb(
        "Build naloxone administration instructions: recognize overdose, call 911, administer, rescue breathing, repeat.",
        5,
      ),
      sp(
        "Teach naloxone: 'Esta es la naloxona — revierte una sobredosis. Le enseñaré a usted y a su familia cómo y cuándo usarla.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Multidisciplinary Team Communication",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective: "Present a pain patient at a multidisciplinary team meeting",
    steps: [
      r("Read the family medicine passage as a team meeting prep.", 7),
      ds(
        "Present a complex pain patient to a multi-disciplinary team: PT, psychology, pharmacy, and nursing. Target language.",
        10,
      ),
      sp(
        "Summarize: 'El paciente tiene dolor crónico de [X] años. Ya intentamos [treatments]. Propongo [next step] y solicito opinión del equipo.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Pain Management Visit",
    readingTemplate: "seed-{lang}-family-med-diabetes",
    objective:
      "Complete a full new chronic pain evaluation — intake to treatment plan — without switching languages",
    steps: [
      r("Read the family medicine passage as your pre-visit prep.", 5),
      ds(
        "AI-assisted full pain consult: pain history → functional assessment → diagnosis → treatment options → consent. Target language only.",
        12,
      ),
      sp(
        "Deliver the plan: 'Mi diagnóstico es [condition]. El plan incluye [3 treatments]. Veremos resultados en [timeframe].'",
        3,
      ),
    ],
  },
];

// ─── PHYSICAL THERAPY ────────────────────────────────────────────────────────

const PT_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Initial PT Evaluation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Conduct an initial physical therapy evaluation and set goals",
    steps: [
      r("Read the physical therapy passage. Focus on evaluation vocabulary.", 7),
      wm(
        "Drill: evaluación, rango de movimiento, fuerza, equilibrio, marcha, función, dolor. 7/7.",
        5,
      ),
      sp(
        "Open: 'Soy su fisioterapeuta. Hoy voy a evaluar su [condition]. ¿Cuáles son sus metas para esta terapia?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Range of Motion Assessment",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Assess and document range of motion using clinical instructions",
    steps: [
      r("Read the PT passage. Focus on joint movement vocabulary.", 7),
      pt(
        "Pattern: 'Por favor, doble/extienda/rote su [joint] hasta donde pueda. ¿Siente dolor con este movimiento?' Build 5 ROM instructions.",
        7,
      ),
      sp(
        "Conduct a full shoulder ROM assessment: flexion, extension, abduction, internal and external rotation.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Strengthening Exercises — Lower Body",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Instruct a patient through 3 lower body strengthening exercises",
    steps: [
      r("Read the PT passage. Find exercise instruction vocabulary.", 7),
      sb(
        "Build 3 exercise instructions: sets, reps, and position for quad sets, SLR, and clamshells.",
        5,
      ),
      sp(
        "Teach quad sets: 'Acuéstese boca arriba. Tense el muslo. Sostenga 5 segundos. Repita 10 veces. 3 series.'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Strengthening Exercises — Upper Body",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Instruct 3 upper extremity strengthening exercises",
    steps: [
      r("Read the PT passage. Find upper extremity exercise vocabulary.", 6),
      sb(
        "Build 3 upper body exercises: rows, shoulder press, and bicep curls — sets, reps, and cues.",
        5,
      ),
      sp(
        "Teach a row exercise: 'Siéntese derecho. Jale el elástico hacia el pecho. Aguante 2 segundos. Regrese despacio. 10 repeticiones.'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Balance & Gait Training",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Train balance and describe gait deviations",
    steps: [
      r("Read the PT passage. Focus on balance and gait vocabulary.", 7),
      wm("Drill: equilibrio, marcha, apoyo, andador, bastón, pasos, caída, apoyo de peso. 8/8.", 5),
      sp(
        "Instruct balance: 'Párese detrás de la silla. Levante un pie por 10 segundos. Alterne. Haga 3 series de cada lado.'",
        8,
      ),
    ],
  },
  {
    n: 6,
    title: "Manual Therapy Communication",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain manual therapy techniques before and during treatment",
    steps: [
      r("Read the PT passage. Find manual therapy vocabulary.", 6),
      pt(
        "Pattern: 'Voy a [technique] en [area]. Puede sentir [sensation]. Dígame si es demasiado. Respire normalmente.' Build 3.",
        7,
      ),
      sp(
        "Explain soft tissue massage: 'Voy a masajear esta área para relajar el músculo. Puede sentir algo de presión.'",
        7,
      ),
    ],
  },
  {
    n: 7,
    title: "Aquatic Therapy Instructions",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Instruct exercises in an aquatic therapy context",
    steps: [
      r("Read the PT passage. Focus on aquatic exercise vocabulary.", 6),
      wm(
        "Drill: agua, flotación, resistencia, calentamiento, profundidad, boyante, apoyo. 7/7.",
        5,
      ),
      sp(
        "Instruct water walking: 'En el agua hasta la cintura, camine hacia adelante 10 pasos. Luego hacia atrás. El agua da soporte.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Functional Goals Setting",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Set SMART functional goals with a patient",
    steps: [
      r("Read the PT passage. Focus on goals and outcomes vocabulary.", 6),
      pt(
        "Pattern: 'La meta es que usted pueda [functional activity] en [timeframe] sin [limitation].' Build 3 SMART goals.",
        8,
      ),
      sp(
        "Set goals: '¿Qué quiere poder hacer que ahora no puede? Mi meta para usted es que en [X] weeks pueda [activity].'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Home Exercise Program Teaching",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Teach a 3-exercise home program and confirm understanding",
    steps: [
      r("Read the PT passage. Find home program vocabulary.", 7),
      sb("Build a 3-exercise HEP with each exercise, sets/reps, frequency, and safety cue.", 5),
      sp(
        "Teach and verify: 'Haga estos 3 ejercicios todos los días. Muéstreme el primero para confirmar que lo hace bien.'",
        8,
      ),
    ],
  },
  {
    n: 10,
    title: "Post-Surgical Rehab — Phase 1",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Guide a patient through immediate post-surgical rehabilitation",
    steps: [
      r("Read the PT passage. Focus on post-surgical precaution vocabulary.", 7),
      wm(
        "Drill: precauciones, carga de peso, arco protegido, edema, hielo, elevación, inmovilizador. 7/7.",
        5,
      ),
      sp(
        "Explain phase 1: 'En esta etapa, el objetivo es reducir la hinchazón y recuperar el movimiento sin forzar la cicatriz.'",
        8,
      ),
    ],
  },
  {
    n: 11,
    title: "Post-ACL Repair Rehabilitation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain ACL rehab phases and precautions to an athlete",
    steps: [
      r("Read the PT passage. Focus on knee rehabilitation vocabulary.", 7),
      pt(
        "Pattern: 'En la fase [1/2/3/4], trabajamos en [goal]. Podrá retornar a [activity] en [timeframe] si logra [criteria].' Build 3 phases.",
        7,
      ),
      sp(
        "Counsel: 'La rehab del LCA dura 9 meses. No hay atajos. Regresará al deporte cuando alcance las metas de fuerza.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Stroke Rehabilitation Communication",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Work with a stroke patient on mobility and functional recovery",
    steps: [
      r("Read the PT passage. Focus on neurological rehab vocabulary.", 7),
      wm(
        "Drill: hemiplejia, espasticidad, transferencia, silla de ruedas, AFO, facilitación, neuroplasticidad. 7/7.",
        5,
      ),
      sp(
        "Encourage a stroke patient: 'Su cerebro puede reaprender. La recuperación toma tiempo. Vamos a practicar [skill] hoy.'",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Shoulder Rehab — Rotator Cuff",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Guide rotator cuff rehabilitation exercises",
    steps: [
      r("Read the PT passage. Focus on shoulder exercise vocabulary.", 6),
      sb(
        "Build 4 rotator cuff exercises: pendulums, ER/IR with theraband, scapular retraction, rhythmic stabilization.",
        5,
      ),
      sp(
        "Instruct: 'Empiece con péndulos — cuelgue el brazo y déjelo oscilar suavemente. Sin usar la musculatura del hombro.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Low Back Pain — Core Stabilization",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Teach core stabilization exercises for low back pain",
    steps: [
      r("Read the PT passage. Focus on core and spinal vocabulary.", 7),
      wm(
        "Drill: core, estabilización, neutro, transverso, diafragma, columna, activación. 7/7.",
        5,
      ),
      sp(
        "Teach dead bug: 'Acuéstese boca arriba. Contraje el abdomen. Extienda el brazo y pierna opuestos. Sin hundir la espalda.'",
        8,
      ),
    ],
  },
  {
    n: 15,
    title: "Cervical Spine Rehab",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Instruct cervical exercises and postural correction",
    steps: [
      r("Read the PT passage. Focus on cervical and posture vocabulary.", 6),
      sb(
        "Build 3 cervical exercises: chin tucks, cervical isometrics, and upper trap stretches.",
        5,
      ),
      sp(
        "Teach chin tucks: 'Siéntese derecho. Jale la barbilla hacia atrás — como haciendo doble mentón. Sostenga 5 segundos. 10 veces.'",
        9,
      ),
    ],
  },
  {
    n: 16,
    title: "Parkinson's Disease PT",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain PT approaches for Parkinson's disease to patient and family",
    steps: [
      r("Read the PT passage. Focus on neurological disease vocabulary.", 7),
      wm("Drill: Parkinson, temblor, rigidez, bradicinesia, festinación, LSVT, amplitud. 7/7.", 5),
      sp(
        "Counsel: 'La fisioterapia para Parkinson se enfoca en movimientos grandes y amplios para luchar contra la rigidez.'",
        8,
      ),
    ],
  },
  {
    n: 17,
    title: "Hip Replacement Rehabilitation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Guide hip replacement rehab with precautions",
    steps: [
      r("Read the PT passage. Focus on hip replacement vocabulary.", 7),
      pt(
        "Pattern: 'Las precauciones de la cadera son: no doble más de 90°, no cruce las piernas, no gire el pie adentro.' Build precaution list.",
        7,
      ),
      sp(
        "Review precautions: 'Estas reglas protegen la prótesis. Las necesita por [X] weeks. Después su cirujano las revisará.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Cardiac PT & Exercise Tolerance",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Guide a cardiac patient through safe exercise with monitoring",
    steps: [
      r("Read the PT passage. Focus on cardiac exercise vocabulary.", 6),
      wm(
        "Drill: RPE, frecuencia cardíaca meta, isquemia, angina, tolerancia, METs, RPE de Borg. 7/7.",
        5,
      ),
      sp(
        "Instruct: 'Camine a un ritmo donde pueda hablar pero no cantar. Si siente presión en el pecho, pare y dígame.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Pediatric PT Communication",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Make PT fun and engaging for a pediatric patient",
    steps: [
      r("Read the PT passage. Focus on child-friendly vocabulary.", 6),
      ds(
        "Role-play: treat a reluctant 7-year-old. Use games, encouragement, and age-appropriate instructions.",
        10,
      ),
      sp(
        "Engage a child: '¡Vamos a jugar un juego! Cada vez que hagas el ejercicio bien, ganas un punto. ¿Estás listo?'",
        4,
      ),
    ],
  },
  {
    n: 20,
    title: "Diabetes-Related Foot Care",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Educate a diabetic patient on foot care and protective footwear",
    steps: [
      r("Read the PT passage. Find diabetes and foot care vocabulary.", 6),
      sb(
        "Build 4 diabetic foot care instructions: daily inspection, moisturize, nail care, footwear.",
        5,
      ),
      sp(
        "Counsel: 'Como diabético, sus pies necesitan cuidado especial. Revíselos todos los días — cualquier herida puede infectarse rápido.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Pulmonary Rehabilitation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Guide breathing exercises for a COPD patient",
    steps: [
      r("Read the PT passage. Focus on respiratory rehabilitation vocabulary.", 7),
      wm(
        "Drill: EPOC, disnea, respiración diafragmática, labios fruncidos, capacidad, expansión. 6/6.",
        5,
      ),
      sp(
        "Teach pursed lip breathing: 'Inhale por la nariz 2 segundos. Exhale por los labios fruncidos por 4. Esto reduce el trabajo respiratorio.'",
        8,
      ),
    ],
  },
  {
    n: 22,
    title: "Lymphedema Management",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain lymphedema and complete decongestive therapy to a patient",
    steps: [
      r("Read the PT passage. Focus on lymphedema vocabulary.", 6),
      wm("Drill: linfedema, drenaje, compresión, vendaje, bombeo, inflamación, fibrosis. 7/7.", 5),
      sp(
        "Explain CDT: 'El linfedema necesita drenaje linfático manual, vendaje compresivo, y ejercicios. Le enseñaré cada componente.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Electrotherapy Explanation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain TENS, ultrasound therapy, and electrical stimulation",
    steps: [
      r("Read the PT passage. Focus on electrotherapy vocabulary.", 6),
      sb(
        "Build 3 modality explanations: TENS, therapeutic ultrasound, and electrical muscle stimulation.",
        5,
      ),
      sp(
        "Explain TENS: 'Este aparato envía pulsos eléctricos suaves que bloquean las señales de dolor. Sentirá un cosquilleo.'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "Pre-Op PT Prehabilitation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Conduct prehabilitation for a patient before surgery",
    steps: [
      r("Read the PT passage. Focus on prehabilitation vocabulary.", 6),
      pt(
        "Pattern: 'Antes de su cirugía, vamos a fortalecer [muscle groups] y mejorar [function] para que su recuperación sea más rápida.' Build prehab plan.",
        8,
      ),
      sp(
        "Explain prehab: 'Las personas que hacen fisioterapia antes de la cirugía se recuperan más rápido. Vamos a empezar ahora.'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Vestibular Rehabilitation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Explain vestibular exercises for BPPV and dizziness",
    steps: [
      r("Read the PT passage. Focus on vestibular vocabulary.", 6),
      wm("Drill: vértigo, mareo, VPPB, canalolito, Epley, nistagmo, compensación. 7/7.", 5),
      sp(
        "Explain Epley maneuver: 'Voy a mover su cabeza en una secuencia específica para mover los cristales del oído que causan el vértigo.'",
        9,
      ),
    ],
  },
  {
    n: 26,
    title: "Chronic Fatigue & Energy Conservation",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Teach energy conservation techniques to a patient with fatigue",
    steps: [
      r("Read the PT passage. Focus on fatigue and energy vocabulary.", 6),
      sb("Build 4 energy conservation principles: pacing, prioritizing, positioning, planning.", 5),
      sp(
        "Teach pacing: 'Divida su energía como un presupuesto. Haga la tarea más importante primero. Descanse antes de estar exhausto.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Adaptive Equipment Education",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Recommend and teach use of adaptive equipment",
    steps: [
      r("Read the PT passage. Find adaptive equipment vocabulary.", 6),
      wm(
        "Drill: andador, bastón, muletas, silla de ruedas, adaptador, agarradera, elevador de inodoro. 7/7.",
        5,
      ),
      sp(
        "Teach crutch use: 'Estas muletas van bajo los brazos — nunca apoyados en las axilas. El peso va en las manos.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Women's Health PT",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Teach pelvic floor exercises to a patient with incontinence",
    steps: [
      r("Read the PT passage. Focus on pelvic floor vocabulary.", 6),
      ds(
        "Role-play: patient embarrassed about incontinence. Normalize, explain PT approach, and instruct Kegels.",
        10,
      ),
      sp(
        "Teach Kegels: 'Contraiga los músculos que usaría para parar la orina. Sostenga 5 segundos. Relaje. 10 veces, 3 series al día.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Rehab — Spinal Cord Injury",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective: "Support a patient with spinal cord injury in functional goals",
    steps: [
      r("Read the PT passage as a complex rehab case review.", 8),
      ds(
        "Role-play: new SCI patient who is frustrated and asking 'will I ever walk again?' Respond with honesty and hope.",
        10,
      ),
      sp(
        "Explain SCI rehab: 'El objetivo es maximizar su independencia y función. Cada médula es diferente. Empecemos viendo qué puede hacer.'",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full PT Evaluation & Treatment",
    readingTemplate: "seed-{lang}-physical-therapy-exercises",
    objective:
      "Complete a full initial PT session — evaluation, goal-setting, treatment, HEP — without switching languages",
    steps: [
      r("Read the PT passage as your pre-session review.", 5),
      ds(
        "AI-assisted full PT session: intake → ROM assessment → functional goals → treatment → home program. Target language only.",
        12,
      ),
      sp(
        "Summarize: 'Hoy evaluamos [condition]. Sus metas son [goals]. Su programa en casa incluye [exercises]. Volvemos el [date].'",
        3,
      ),
    ],
  },
];

// ─── MEDICAL RECEPTIONIST ────────────────────────────────────────────────────

const MED_RECEP_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Answering the Phone",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Answer the medical office phone professionally in the target language",
    steps: [
      r("Read the scheduling passage. Find all phone greeting vocabulary.", 7),
      wm("Drill: consultorio, cita, horario, aseguranza, médico, recepción, turno. 7/7.", 5),
      sp(
        "Answer: 'Consultorio del Dr. [name], buenos días. ¿En qué le puedo ayudar?' Practice 5 times.",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Scheduling an Appointment",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Schedule a new patient appointment over the phone",
    steps: [
      r("Read the scheduling passage. Focus on appointment vocabulary.", 7),
      pt(
        "Pattern: '¿Para qué tipo de consulta? ¿Cuándo puede venir? ¿Mañana a las [time] le viene bien?' Build scheduling conversation.",
        7,
      ),
      sp(
        "Schedule: name, DOB, insurance, reason for visit, available time slots, and confirmation.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Check-In at the Front Desk",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Check in an arriving patient efficiently",
    steps: [
      r("Read the scheduling passage. Focus on check-in vocabulary.", 6),
      wm(
        "Drill: nombre, fecha de nacimiento, seguro, copago, formulario, identificación, sala de espera. 7/7.",
        5,
      ),
      sp(
        "Check in: '¿Su nombre, por favor? ¿Tiene una identificación y su tarjeta del seguro? Su copago es [amount].'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Insurance Verification Questions",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Collect insurance information from a patient",
    steps: [
      r("Read the scheduling passage. Find insurance vocabulary.", 6),
      pt(
        "Pattern: '¿Cuál es su seguro médico? ¿Tiene el número del grupo y el número del miembro?' Build insurance intake.",
        7,
      ),
      sp(
        "Verify insurance: plan name, member ID, group number, and ask if the doctor is in-network.",
        7,
      ),
    ],
  },
  {
    n: 5,
    title: "New Patient Intake Forms",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Guide a new patient through completing intake forms",
    steps: [
      r("Read the scheduling passage. Focus on forms and documentation vocabulary.", 7),
      wm(
        "Drill: formulario, historial médico, alergias, medicamentos, contacto de emergencia, firma. 6/6.",
        5,
      ),
      sp(
        "Instruct: 'Por favor complete estos formularios — su historial médico, seguros, y contacto de emergencia. Pregunte si tiene dudas.'",
        8,
      ),
    ],
  },
  {
    n: 6,
    title: "Cancellation & Rescheduling",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Handle a patient who needs to cancel or reschedule",
    steps: [
      r("Read the scheduling passage. Focus on cancellation vocabulary.", 6),
      sb(
        "Build responses for: cancellation, late cancellation fee explanation, rescheduling, and waitlist offer.",
        5,
      ),
      sp(
        "Handle a call: 'Entiendo. ¿Le gustaría reagendar? Tengo disponibilidad el [day] a las [time]. ¿Le viene bien?'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Copay & Billing Questions",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Explain copays, deductibles, and billing in simple language",
    steps: [
      r("Read the scheduling passage. Find billing vocabulary.", 6),
      wm("Drill: copago, deducible, coaseguro, factura, saldo, pago, plan de pagos. 7/7.", 5),
      sp(
        "Explain a balance: 'Su copago de hoy es $30. Su seguro pagó $150 y usted debe un saldo de [amount].'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Handling an Urgent Call",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Triage an urgent call and get clinical help immediately",
    steps: [
      r("Read the scheduling passage. Focus on urgency vocabulary.", 7),
      pt(
        "Pattern: '¿Cuáles son los síntomas? ¿Desde cuándo? ¿Tiene dolor de pecho o dificultad para respirar?' Build urgent triage.",
        7,
      ),
      sp(
        "Handle an urgent call: assess severity, tell them to call 911 if appropriate, or direct to an urgent slot.",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Prescription Refill Requests",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Handle prescription refill requests professionally",
    steps: [
      r("Read the scheduling passage. Find prescription vocabulary.", 6),
      wm(
        "Drill: receta, reposición, farmacia, médico, aprobación, medicamento, número de teléfono. 7/7.",
        5,
      ),
      sp(
        "Handle: 'Le voy a tomar el nombre del medicamento y la farmacia. El médico enviará la receta en 24 horas.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Test Results Communication",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Communicate that results are ready and direct appropriately",
    steps: [
      r("Read the scheduling passage. Focus on results vocabulary.", 6),
      pt(
        "Pattern: 'Sus resultados están listos. El médico [quiere hablar / dice que son normales]. ¿Puede venir o prefiere una llamada?' Build 3 scenarios.",
        8,
      ),
      sp(
        "Call a patient: 'Le llamo del consultorio del Dr. [name]. Sus resultados están listos. El doctor le puede atender el [date].'",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "Interpreter Coordination",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Coordinate interpreter services for a patient",
    steps: [
      r("Read the scheduling passage. Focus on interpreter vocabulary.", 6),
      wm(
        "Drill: intérprete, idioma, traducción, servicio, telefónico, presencial, programar. 7/7.",
        5,
      ),
      sp(
        "Tell a patient: 'Para su cita, podemos tener un intérprete presente o por teléfono. ¿Cuál prefiere?'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "HIPAA & Confidentiality Basics",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Explain HIPAA rights to a patient in simple language",
    steps: [
      r("Read the scheduling passage. Find privacy vocabulary.", 6),
      sb(
        "Build 4 HIPAA points: right to access records, request correction, control disclosure, and file a complaint.",
        5,
      ),
      sp(
        "Explain: 'Su información médica es confidencial. Solo la compartimos con quien usted autorice o lo que la ley requiera.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Managing a Difficult Patient",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "De-escalate a frustrated patient at the front desk",
    steps: [
      r("Read the scheduling passage. Find conflict resolution vocabulary.", 6),
      ds(
        "Role-play: patient arrives angry because they've been waiting 45 minutes past their appointment time.",
        10,
      ),
      sp(
        "De-escalate: 'Entiendo su frustración. Lamento la espera. Voy a verificar con el médico ahora mismo.'",
        4,
      ),
    ],
  },
  {
    n: 14,
    title: "Specialist Referral Coordination",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Coordinate and explain a specialist referral to a patient",
    steps: [
      r("Read the scheduling passage. Focus on referral vocabulary.", 6),
      pt(
        "Pattern: 'El médico le refirió a [specialist]. Necesita llamar al [number] y mencionar que viene del Dr. [name]. ¿Necesita ayuda para hacer la cita?'",
        8,
      ),
      sp(
        "Explain a referral process: authorization, calling the specialist, what to bring, and timeline.",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Appointment Reminders",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Make a professional appointment reminder call",
    steps: [
      r("Read the scheduling passage. Find reminder vocabulary.", 6),
      wm("Drill: recordatorio, cita, confirmar, traer, seguros, llegue, cancelar. 7/7.", 5),
      sp(
        "Make a reminder call: 'Le llamo para recordarle su cita el [day] a las [time]. ¿Puede confirmar su asistencia?'",
        9,
      ),
    ],
  },
  {
    n: 16,
    title: "After-Hours & On-Call Communication",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Record an after-hours message and explain on-call procedures",
    steps: [
      r("Read the scheduling passage. Find after-hours vocabulary.", 6),
      sb(
        "Build an after-hours voicemail message and explain the on-call protocol to a calling patient.",
        5,
      ),
      sp(
        "Record: 'Ha llamado al consultorio del Dr. [name]. Nuestro horario es [hours]. En emergencias, llame al [number] o 911.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Electronic Records & Portal Help",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Help a patient set up or use their patient portal",
    steps: [
      r("Read the scheduling passage. Find digital health vocabulary.", 6),
      wm(
        "Drill: portal, contraseña, mensaje, cita en línea, resultados, registrarse, aplicación. 7/7.",
        5,
      ),
      sp(
        "Help: 'El portal le permite ver sus resultados y enviar mensajes al médico. ¿Tiene correo electrónico? Le ayudo a registrarse.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Medical Records Requests",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Process a medical records release request",
    steps: [
      r("Read the scheduling passage. Find medical records vocabulary.", 6),
      pt(
        "Pattern: 'Para liberar sus registros necesitamos [form]. Tomará [days]. Podemos enviarlo a [fax/mail/portal].' Build records request.",
        7,
      ),
      sp(
        "Explain the process: 'Necesita firmar una autorización. Sus registros estarán listos en [X] días hábiles.'",
        7,
      ),
    ],
  },
  {
    n: 19,
    title: "No-Show & Follow-Up Protocol",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Handle a no-show appointment and follow up with the patient",
    steps: [
      r("Read the scheduling passage. Focus on no-show vocabulary.", 6),
      sb(
        "Build a no-show follow-up call: acknowledge absence, ask if okay, offer to reschedule, note importance of follow-up.",
        5,
      ),
      sp(
        "Call: 'Notamos que no pudo venir hoy. ¿Está bien? ¿Le gustaría reagendar? El médico recomienda que se atienda pronto.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Patient Complaint Resolution",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Handle a formal patient complaint and escalate appropriately",
    steps: [
      r("Read the scheduling passage. Find complaint resolution vocabulary.", 6),
      ds(
        "Role-play: patient files a formal complaint about their care. Listen, document, apologize, and escalate properly.",
        10,
      ),
      sp(
        "Respond: 'Lamento lo que vivió. Voy a documentar su queja y el gerente de la clínica le contactará hoy o mañana.'",
        4,
      ),
    ],
  },
  {
    n: 21,
    title: "Telehealth Appointment Setup",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Schedule and prepare a patient for a telehealth visit",
    steps: [
      r("Read the scheduling passage. Focus on telehealth vocabulary.", 6),
      wm(
        "Drill: telemedicina, videoconferencia, enlace, internet, cámara, micrófono, código. 7/7.",
        5,
      ),
      sp(
        "Explain telehealth: 'Su cita es por video. Le enviaré un enlace por correo. Necesita internet, cámara y micrófono.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Vaccine Scheduling & Education",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Schedule vaccines and explain what to expect",
    steps: [
      r("Read the scheduling passage. Find vaccination vocabulary.", 6),
      pt(
        "Pattern: '¿Qué vacuna necesita? Tenemos disponibilidad el [date]. Después puede tener [side effects] por [duration].' Build vaccine scheduling.",
        7,
      ),
      sp(
        "Schedule a flu shot: 'La vacuna contra la influenza tarda 5 minutos. Puede tener molestia en el brazo por un día.'",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Handling the Phones Under Volume",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Manage multiple calls efficiently with professional hold language",
    steps: [
      r("Read the scheduling passage. Focus on phone management vocabulary.", 6),
      sb(
        "Build 4 professional hold phrases: asking to hold, returning from hold, taking a message, transferring.",
        5,
      ),
      sp(
        "Handle: '¿Le importa esperar un momento? Gracias por su paciencia. Ahora le atiendo. ¿En qué le puedo ayudar?'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "End-of-Visit Check-Out",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Complete a smooth checkout with follow-up scheduling",
    steps: [
      r("Read the scheduling passage. Focus on checkout vocabulary.", 6),
      wm("Drill: cobro, factura, próxima cita, laboratorio, receta, instrucciones, alta. 7/7.", 5),
      sp(
        "Check out: 'Su visita de hoy es [amount]. El médico quiere verle en [timeframe]. ¿Le agendo ahora?'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Mental Health Appointment Sensitivity",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Handle mental health appointment scheduling with extra sensitivity",
    steps: [
      r("Read the scheduling passage. Focus on mental health sensitivity vocabulary.", 6),
      ds(
        "Role-play: patient calls in crisis asking for an appointment. Handle with compassion and appropriate urgency.",
        10,
      ),
      sp(
        "Respond: 'Entiendo que está pasando un momento difícil. Voy a ver cómo el médico puede verle hoy. Un momento.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Medical Terminology at the Desk",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Decode clinical abbreviations and translate them for patients",
    steps: [
      r("Read the scheduling passage. Focus on clinical abbreviation vocabulary.", 7),
      wm(
        "Drill: HTA, DM2, EPOC, ITU, ECG, HbA1c, RX, Dx, Tx, F/U. Translate each to patient language.",
        10,
      ),
      sp(
        "Translate: 'Su diagnóstico es HTA — eso significa presión arterial alta. Su cita de F/U es su cita de seguimiento.'",
        0,
      ),
    ],
  },
  {
    n: 27,
    title: "Pediatric Appointment Intake",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Take a pediatric patient intake with the parent",
    steps: [
      r("Read the scheduling passage. Focus on pediatric intake vocabulary.", 6),
      pt(
        "Pattern: '¿Nombre del niño? ¿Fecha de nacimiento? ¿Peso actual? ¿Tiene alguna alergia? ¿El motivo de la visita hoy?' Build peds intake.",
        7,
      ),
      sp(
        "Complete a pediatric check-in: child's name, DOB, weight, parent name, insurance, reason for visit.",
        7,
      ),
    ],
  },
  {
    n: 28,
    title: "Clinical Scanning & Documentation",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Explain document scanning and EHR filing to a patient",
    steps: [
      r("Read the scheduling passage. Find EHR vocabulary.", 6),
      sb(
        "Build 3 documentation interactions: 'I need to scan your insurance card, ID, and referral.'",
        5,
      ),
      sp(
        "Explain: 'Voy a escanear su tarjeta del seguro e identificación para su expediente. Solo tomará un momento.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Scheduling — Multi-Specialty",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective: "Coordinate appointments across multiple specialists for one patient",
    steps: [
      r("Read the scheduling passage as a complex multi-appointment scenario.", 7),
      ds(
        "Role-play: new diabetic patient needs labs, ophthalmology, podiatry, and nutrition within 2 weeks.",
        10,
      ),
      sp(
        "Coordinate: 'Voy a programar todas sus citas. Primero los análisis, luego los especialistas. Le voy a dar una lista con todas las fechas.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Reception Shift",
    readingTemplate: "seed-{lang}-medical-receptionist-scheduling",
    objective:
      "Manage a full morning reception shift — phones, check-in, checkout, billing — without switching languages",
    steps: [
      r("Read the scheduling passage as your morning prep.", 5),
      ds(
        "AI-assisted full shift: open phones → check in 3 patients → handle urgent call → reschedule → checkout. Target language only.",
        12,
      ),
      sp(
        "End of shift summary: patients seen, calls handled, pending items, and messages for the doctor.",
        3,
      ),
    ],
  },
];

// ─── SOCIAL WORK ──────────────────────────────────────────────────────────────

const SOCIAL_WORK_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Initial Social Work Assessment",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Conduct an initial biopsychosocial assessment",
    steps: [
      r("Read the discharge passage. Focus on assessment and social vocabulary.", 7),
      wm(
        "Drill: evaluación, vivienda, familia, apoyo, empleo, seguro, seguridad, servicios. 8/8.",
        5,
      ),
      sp(
        "Open: 'Soy la trabajadora social. Quiero entender su situación — dónde vive, con quién cuenta, y qué necesita para ir a casa.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Discharge Planning Basics",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Identify discharge needs and begin planning",
    steps: [
      r("Read the discharge passage. Find discharge planning vocabulary.", 7),
      pt(
        "Pattern: 'Para el alta, necesita [service/equipment]. ¿Tiene [resource]? Si no, puedo ayudarle a conseguirlo.' Build 4 discharge needs.",
        7,
      ),
      sp(
        "Assess discharge needs: home safety, support, transportation, medications, follow-up, and equipment.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Insurance & Benefits Assistance",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Help a patient understand and apply for insurance or benefits",
    steps: [
      r("Read the discharge passage. Focus on benefits vocabulary.", 6),
      wm(
        "Drill: Medicaid, Medicare, SSI, discapacidad, elegibilidad, solicitud, evidencia, trabajador. 8/8.",
        5,
      ),
      sp(
        "Help: 'Basado en sus ingresos y situación, puede calificar para Medicaid. Le ayudo con la solicitud ahora.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Domestic Violence Screening",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Screen for domestic violence using a validated tool sensitively",
    steps: [
      r("Read the discharge passage. Focus on safety and DV vocabulary.", 6),
      ds(
        "Role-play: patient shows bruising and appears fearful. Screen and respond with SAFE questions in target language.",
        10,
      ),
      sp(
        "Screen: 'A veces le pregunto a mis pacientes sobre su seguridad en casa. ¿Se siente segura? ¿Alguien le ha lastimado?'",
        4,
      ),
    ],
  },
  {
    n: 5,
    title: "Crisis Intervention",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "De-escalate a patient in crisis and connect them to support",
    steps: [
      r("Read the discharge passage. Focus on crisis vocabulary.", 6),
      ds(
        "Role-play: patient just received a serious diagnosis and is crying and refusing treatment.",
        10,
      ),
      sp(
        "Respond: 'Entiendo que es una noticia muy difícil. Estoy aquí. No tiene que tomar ninguna decisión ahora mismo.'",
        4,
      ),
    ],
  },
  {
    n: 6,
    title: "Homelessness & Housing Resources",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Connect a homeless patient to shelter and housing resources",
    steps: [
      r("Read the discharge passage. Find housing vocabulary.", 6),
      wm(
        "Drill: sin hogar, albergue, vivienda transitoria, sección 8, HUD, referido, lista de espera. 7/7.",
        5,
      ),
      sp(
        "Offer help: '¿Tiene un lugar donde quedarse? Puedo referirle a un albergue seguro esta noche y empezar el proceso de vivienda permanente.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Substance Use Intervention",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Complete a brief motivational interviewing session for substance use",
    steps: [
      r("Read the discharge passage. Focus on substance use vocabulary.", 6),
      ds(
        "Role-play: motivational interview with a patient using heroin who is not ready to change.",
        10,
      ),
      sp(
        "Use MI: 'Entiendo que no está listo. Cuando lo esté, aquí tiene mi número. Existen opciones de tratamiento sin juzgarle.'",
        4,
      ),
    ],
  },
  {
    n: 8,
    title: "Child Welfare Concerns",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Report and communicate a child welfare concern following protocol",
    steps: [
      r("Read the discharge passage. Find child welfare vocabulary.", 6),
      pt(
        "Pattern: 'Tengo una preocupación sobre la seguridad del niño. He notado [observation]. Estoy obligado a reportarlo. Esto no significa que…' Build mandatory report conversation.",
        8,
      ),
      sp(
        "Explain mandatory reporting: 'Como trabajadora social, tengo obligación legal de reportar si creo que un niño está en peligro.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Elder Abuse Assessment",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Screen for elder abuse and neglect",
    steps: [
      r("Read the discharge passage. Focus on elder care vocabulary.", 6),
      wm(
        "Drill: abuso, anciano, negligencia, explotación, aislamiento, síntomas, tutor, reporte. 8/8.",
        5,
      ),
      sp(
        "Screen: '¿Alguien le ha golpeado o lastimado? ¿Controla alguien su dinero? ¿Le han dejado solo sin comida o medicamentos?'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Hospice & Palliative Care Referral",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Explain hospice and palliative care options to a family",
    steps: [
      r("Read the discharge passage. Find palliative care vocabulary.", 6),
      ds(
        "Role-play: family of a terminal patient is unaware of hospice. Explain with compassion, not as 'giving up'.",
        10,
      ),
      sp(
        "Explain: 'El hospicio no es rendirse — es recibir cuidados para vivir lo mejor posible el tiempo que queda, sin sufrir.'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "Mental Health Referrals",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Refer a patient to outpatient mental health services",
    steps: [
      r("Read the discharge passage. Focus on mental health referral vocabulary.", 6),
      wm(
        "Drill: terapia, psiquiatra, psicólogo, consejero, lista de espera, cobertura, seguimiento. 7/7.",
        5,
      ),
      sp(
        "Refer: 'Le refiero a un terapeuta que habla español y acepta su seguro. ¿Le llamo ahora para ver la disponibilidad?'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Food Insecurity & Food Resources",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Screen for food insecurity and connect to food resources",
    steps: [
      r("Read the discharge passage. Find food security vocabulary.", 6),
      pt(
        "Pattern: 'En el último mes, ¿le preocupó quedarse sin comida? ¿Tuvo que saltar comidas por dinero? ¿Conoce el banco de alimentos?'",
        7,
      ),
      sp(
        "Connect: 'Puedo darle la dirección del banco de alimentos más cercano. También hay SNAP — le ayudo con la solicitud si quiere.'",
        7,
      ),
    ],
  },
  {
    n: 13,
    title: "Transportation Assistance",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Arrange transportation for a patient who cannot drive",
    steps: [
      r("Read the discharge passage. Focus on transportation vocabulary.", 6),
      wm("Drill: transporte, ambulancia, Uber médico, bus, voluntario, vecino, cita. 7/7.", 5),
      sp(
        "Arrange: '¿Tiene cómo llegar a su cita? Puedo solicitar transporte médico gratuito si su seguro lo cubre.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Guardianship & Capacity Evaluation",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Discuss guardianship and patient decision-making capacity",
    steps: [
      r("Read the discharge passage. Find capacity and guardianship vocabulary.", 6),
      ds(
        "Role-play: patient appears to lack capacity for major medical decisions. Discuss with the medical team.",
        10,
      ),
      sp(
        "Explain to family: 'Para proteger a su familiar, podemos iniciar un proceso de tutela legal. Aquí están los pasos.'",
        4,
      ),
    ],
  },
  {
    n: 15,
    title: "Advance Directive Completion",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Help a patient complete an advance directive or healthcare proxy",
    steps: [
      r("Read the discharge passage. Focus on advance directive vocabulary.", 6),
      pt(
        "Pattern: 'El poder notarial médico le designa a alguien para tomar decisiones si usted no puede. ¿A quién elegiría?' Build conversation.",
        8,
      ),
      sp(
        "Guide: 'Este formulario le permite decirle a los médicos qué tipo de atención quiere si no puede hablar por sí mismo.'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "Psychiatric Hospitalization Coordination",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Coordinate an involuntary or voluntary psychiatric admission",
    steps: [
      r("Read the discharge passage. Find psychiatric hospitalization vocabulary.", 6),
      wm(
        "Drill: ingreso psiquiátrico, voluntario, involuntario, criterios, 5150, peligro, evaluación. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Por su seguridad, recomendamos que quede hospitalizado esta noche. Puede ser voluntario — lo que le da más control.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Immigrant & Refugee Services",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Connect immigrant and refugee patients to specialized resources",
    steps: [
      r("Read the discharge passage. Focus on immigration vocabulary.", 6),
      ds(
        "Role-play: undocumented patient afraid to seek care due to immigration status. Address fears and explain rights.",
        10,
      ),
      sp(
        "Reassure: 'Los hospitales no preguntan sobre su estatus migratorio. Tiene derecho a recibir atención de emergencia.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Foster Care & Child Placement",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Explain foster care proceedings to a family",
    steps: [
      r("Read the discharge passage. Find child welfare vocabulary.", 6),
      wm(
        "Drill: cuidado de crianza, CPS, colocación, reunificación, servicios, plan, custodia. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Vamos a buscar un familiar que pueda cuidar al niño mientras la familia recibe los servicios necesarios.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Disability & Accommodation Assistance",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Help a patient apply for disability benefits or accommodations",
    steps: [
      r("Read the discharge passage. Focus on disability vocabulary.", 6),
      pt(
        "Pattern: 'Para solicitar [disability benefit], necesita [documentation] y su historial médico. El proceso toma [timeframe].' Build application guidance.",
        8,
      ),
      sp(
        "Guide: 'Para SSI, necesitamos sus registros médicos y una evaluación funcional. Le ayudo a reunir los documentos.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Community Resource Coordination",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Build a comprehensive community resource referral for a complex patient",
    steps: [
      r("Read the discharge passage. Focus on community resource vocabulary.", 7),
      ds(
        "Role-play: homeless, uninsured diabetic patient being discharged. Build a full resource plan.",
        10,
      ),
      sp(
        "Present the resource plan: 'Para usted, identifiqué servicios para vivienda, alimentos, insulina gratuita, y una clínica comunitaria.'",
        3,
      ),
    ],
  },
  {
    n: 21,
    title: "Cultural Competency in Social Work",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Navigate cultural differences in care planning with respect",
    steps: [
      r("Read the discharge passage. Find cultural sensitivity vocabulary.", 6),
      ds(
        "Role-play: patient's family refuses hospice for religious reasons. Explore values and find common ground.",
        10,
      ),
      sp(
        "Approach: 'Quiero entender qué es lo más importante para su familia en este momento. ¿Qué dice su fe sobre este tema?'",
        4,
      ),
    ],
  },
  {
    n: 22,
    title: "Safety Planning",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Complete a safety plan with a patient at risk of self-harm",
    steps: [
      r("Read the discharge passage. Focus on safety plan vocabulary.", 6),
      pt(
        "Pattern: 'Paso 1: Señales de alerta: [triggers]. Paso 2: Qué hacer: [coping]. Paso 3: A quién llamar: [support]. Paso 4: Número de crisis: [number].'",
        8,
      ),
      sp(
        "Build a safety plan: 'Quiero hacer un plan juntos para cuando se sienta mal. ¿Cuáles son las señales de que las cosas van empeorando?'",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Grief & Loss Support",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Support a patient or family experiencing grief and bereavement",
    steps: [
      r("Read the discharge passage. Focus on grief vocabulary.", 6),
      ds(
        "Role-play: family just lost a loved one. Offer social work support and connect to grief resources.",
        10,
      ),
      sp(
        "Support: 'Lo siento mucho. El duelo es un proceso. No hay manera correcta de sentirlo. Estoy aquí si necesita hablar o si puedo ayudar.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "School Coordination for Pediatric Patients",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Coordinate with a school for a hospitalized pediatric patient",
    steps: [
      r("Read the discharge passage. Find educational and pediatric vocabulary.", 6),
      wm(
        "Drill: escuela, homebound, plan 504, IEP, ausencia, coordinación, retorno, tutor. 8/8.",
        5,
      ),
      sp(
        "Coordinate: 'Su hijo estará en el hospital por [time]. Puedo hablar con la escuela para que le envíen tarea o iniciar servicios educativos en el hospital.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Substance Use Treatment Placement",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Place a patient in a substance use treatment program",
    steps: [
      r("Read the discharge passage. Focus on treatment placement vocabulary.", 6),
      pt(
        "Pattern: 'Hay tres niveles de tratamiento: detoxificación, residencial, y ambulatorio. Según su situación, recomiendo [level].' Build assessment.",
        8,
      ),
      sp(
        "Place: 'Hay una cama disponible en el programa residencial bilingüe esta semana. ¿Estaría dispuesto a ir directamente del hospital?'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Trauma-Informed Care Communication",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Apply trauma-informed language in every interaction",
    steps: [
      r("Read the discharge passage. Focus on trauma-informed vocabulary.", 6),
      ds(
        "Role-play: patient with PTSD is triggered by the hospital environment and becomes uncooperative. Respond with TIC.",
        10,
      ),
      sp(
        "Apply TIC: '¿Está bien si hablamos? Puede detenernos cuando quiera. ¿Qué le ayudaría a sentirse más seguro ahora mismo?'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Interdisciplinary Team Communication",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Present a complex social work case to the care team",
    steps: [
      r("Read the discharge passage as a team presentation prep.", 7),
      ds(
        "Present a complex discharge case to the care team: social barriers, resources found, plan, and outstanding issues.",
        10,
      ),
      sp(
        "Present: 'El paciente tiene [barriers]. Identifiqué [resources]. El plan de alta incluye [steps]. Los pendientes son [items].'",
        3,
      ),
    ],
  },
  {
    n: 28,
    title: "Legal & Protective Services Coordination",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Coordinate with protective services, legal aid, or law enforcement",
    steps: [
      r("Read the discharge passage. Find legal coordination vocabulary.", 6),
      wm(
        "Drill: CPS, APS, orden de protección, abogado, denuncia, policia, testimonio, derechos. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Tengo la obligación de hacer un reporte a servicios protectores. Esto es para proteger a su familiar, no para causarle problemas.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Discharge — Multiple Barriers",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective: "Manage a discharge with housing, insurance, mental health, and medication barriers",
    steps: [
      r("Read the discharge passage as a complex case review.", 8),
      ds(
        "Role-play: coordinate discharge for an unhoused, uninsured, undocumented patient with schizophrenia and no family support.",
        12,
      ),
      sp(
        "Summarize the plan: 'Para [patient], el plan incluye [5 coordinated services]. El alta está programada para [date] si logramos [barrier].'",
        0,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Social Work Assessment",
    readingTemplate: "seed-{lang}-social-work-discharge",
    objective:
      "Complete a full social work assessment — biopsychosocial, safety, discharge plan — without switching languages",
    steps: [
      r("Read the discharge passage as your pre-assessment review.", 5),
      ds(
        "AI-assisted full social work assessment: biopsychosocial → barriers → resources → discharge plan → follow-up. Target language only.",
        12,
      ),
      sp(
        "Summarize: 'La evaluación indica que el paciente necesita [services]. El plan de alta incluye [steps]. El recurso clave es [name].'",
        3,
      ),
    ],
  },
];

// ─── PLUMBER ─────────────────────────────────────────────────────────────────

const PLUMBER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Meeting the Customer",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Greet a homeowner and introduce the service call",
    steps: [
      r("Read the plumber passage. Find all customer greeting vocabulary.", 7),
      wm("Drill: plomero, servicio, fuga, tubería, presión, agua, cotización. 7/7.", 5),
      sp(
        "Greet: 'Buenos días. Soy el plomero. Vengo por el problema de la fuga. ¿Dónde está el problema exactamente?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Describing the Problem",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Understand and describe the plumbing problem using key vocabulary",
    steps: [
      r("Read the plumber passage. Identify all problem-description sentences.", 7),
      pt(
        "Pattern: '¿Cuándo empezó la fuga? ¿Dónde exactamente? ¿Ha empeorado?' Build diagnostic questions.",
        6,
      ),
      sp(
        "Ask a homeowner about their leak: location, when it started, severity, and any repairs attempted.",
        7,
      ),
    ],
  },
  {
    n: 3,
    title: "Shutting Off the Water",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain how to shut off water at the main and at fixtures",
    steps: [
      r("Read the plumber passage. Focus on shut-off vocabulary.", 6),
      sb("Build 3 instructions: main shut-off, fixture valve, and toilet valve.", 5),
      sp(
        "Instruct: 'Voy a cerrar la llave principal del agua. Está aquí. Después lo reparo y la abro de nuevo.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Diagnosing a Leak",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Diagnose the source and cause of a leak",
    steps: [
      r("Read the plumber passage. Focus on diagnostic vocabulary.", 7),
      wm("Drill: fuga, junta, tubo, presión, corrosión, sello, drenaje, desgaste. 8/8.", 5),
      sp(
        "Explain the diagnosis: 'La fuga viene de la junta entre estos dos tubos. Está corroída. Necesito reemplazarla.'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Giving an Estimate",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Present a repair estimate to a homeowner",
    steps: [
      r("Read the plumber passage. Find cost and estimate vocabulary.", 6),
      pt(
        "Pattern: 'El problema es [diagnosis]. La reparación incluye [parts + labor]. El costo total es [amount]. ¿Le parece bien?' Build estimate.",
        7,
      ),
      sp(
        "Give a verbal estimate: problem description, parts needed, labor time, total cost, and payment options.",
        7,
      ),
    ],
  },
  {
    n: 6,
    title: "Pipe Types & Materials",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Name 8 pipe types and explain when each is used",
    steps: [
      r("Read the plumber passage. Find material vocabulary.", 6),
      wm("Drill: PVC, cobre, hierro, galvanizado, CPVC, PEX, polietileno, fundición. 8/8.", 5),
      sp(
        "Explain to a customer: 'Su tubería vieja es de hierro galvanizado — ya tiene 60 años. La voy a reemplazar con PEX que dura más.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Drain Cleaning Communication",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain drain cleaning and root intrusion to a customer",
    steps: [
      r("Read the plumber passage. Focus on drain vocabulary.", 6),
      wm("Drill: drenaje, tapón, serpentina, hidro-jet, raíces, cámara, obstrucción. 7/7.", 5),
      sp(
        "Explain: 'Su drenaje está bloqueado por raíces. Voy a usar una serpentina para despejarlo. Si hay daño serio, necesitamos cámara.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Toilet Repair & Replacement",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Diagnose and repair a running or leaking toilet",
    steps: [
      r("Read the plumber passage. Find toilet vocabulary.", 6),
      pt(
        "Pattern: 'El problema del inodoro es [part]. Cuesta [amount] repararlo. Reemplazarlo costaría [amount]. ¿Qué prefiere?' Build toilet consult.",
        7,
      ),
      sp(
        "Diagnose: 'El inodoro está corriendo porque la válvula de llenado está desgastada. La reemplazo en 30 minutos.'",
        7,
      ),
    ],
  },
  {
    n: 9,
    title: "Water Heater Issues",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Diagnose water heater problems and explain replacement",
    steps: [
      r("Read the plumber passage. Focus on water heater vocabulary.", 7),
      wm(
        "Drill: calentador, tanque, sin tanque, termostato, ánodo, sedimento, fugas, temperatura. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Su calentador tiene 15 años y está goteando. Le recomiendo reemplazarlo por uno sin tanque — ahorra más energía.'",
        8,
      ),
    ],
  },
  {
    n: 10,
    title: "Fixture Installation",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Communicate during a new fixture installation",
    steps: [
      r("Read the plumber passage. Find installation vocabulary.", 6),
      sb("Build 3 installation step instructions: shut off, disconnect, connect, test.", 5),
      sp(
        "Update a customer: 'Ya instalé la llave nueva. Aquí está cómo funciona. Verifique que no gotea en las próximas 24 horas.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Sewer Line Problems",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain sewer line issues and repair options",
    steps: [
      r("Read the plumber passage. Focus on sewer vocabulary.", 6),
      wm(
        "Drill: alcantarilla, línea de desagüe, raíces, fractura, inspección, reparación sin zanja. 6/6.",
        5,
      ),
      sp(
        "Explain: 'La cámara muestra una fractura en la línea de desagüe a 8 pies de profundidad. Tenemos dos opciones...'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Emergency Flood Response",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Respond to a flooding emergency and direct the homeowner",
    steps: [
      r("Read the plumber passage. Focus on emergency vocabulary.", 7),
      pt(
        "Pattern: '¡Urgente! Cierre el agua principal ahora. Mueva lo que pueda. Llamaré de vuelta en [time].' Build emergency protocol.",
        7,
      ),
      sp(
        "Handle an emergency call: triage the situation, give immediate instructions, and set arrival expectations.",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Backflow Prevention",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain backflow prevention devices and testing",
    steps: [
      r("Read the plumber passage. Focus on backflow vocabulary.", 6),
      wm(
        "Drill: reflujo, prevención, válvula, prueba, certificación, código, contaminación. 7/7.",
        5,
      ),
      sp(
        "Explain: 'El dispositivo de prevención de reflujo protege su agua potable. Necesita una prueba anual — la programamos ahora.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Gas Line Work Communication",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Communicate gas line safety and repair requirements",
    steps: [
      r("Read the plumber passage. Focus on gas line vocabulary.", 6),
      wm("Drill: gas natural, fuga, olor, corte, detector, presión, sellado, permiso. 8/8.", 5),
      sp(
        "Warn: 'Si huele a gas, salga de la casa inmediatamente, no encienda nada, y llame a la empresa de gas y a mí.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Permit & Inspection Language",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain permit requirements and inspection process",
    steps: [
      r("Read the plumber passage. Find permit vocabulary.", 6),
      pt(
        "Pattern: 'Este trabajo requiere un permiso de [type]. Yo lo saco. La inspección es en [timeframe]. Si no pasa, debemos [action].' Build permit discussion.",
        7,
      ),
      sp(
        "Tell a customer: 'Para este trabajo necesitamos un permiso del condado. Yo lo gestiono. La inspección aprueba el trabajo.'",
        7,
      ),
    ],
  },
  {
    n: 16,
    title: "Water Softener & Filtration",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain water softener or filtration system installation",
    steps: [
      r("Read the plumber passage. Find water quality vocabulary.", 6),
      wm(
        "Drill: agua dura, suavizador, sal, filtro, carbón, ósmosis inversa, calcio, magnesio. 8/8.",
        5,
      ),
      sp(
        "Recommend: 'Su agua tiene mucho calcio — daña los aparatos. Un suavizador de agua protege su calentador y lavaplatos.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Customer Complaints & Warranties",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Handle a complaint about prior work and discuss warranty",
    steps: [
      r("Read the plumber passage. Find warranty vocabulary.", 6),
      ds(
        "Role-play: customer says a faucet you replaced 3 weeks ago is leaking again. Handle professionally.",
        9,
      ),
      sp(
        "Respond: 'Mi trabajo tiene garantía de 30 días. Regreso hoy a revisarlo sin costo. ¿A qué hora le viene bien?'",
        5,
      ),
    ],
  },
  {
    n: 18,
    title: "Hydro-Jetting Explanation",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain hydro-jetting drain cleaning to a customer",
    steps: [
      r("Read the plumber passage. Find hydro-jetting vocabulary.", 6),
      sb(
        "Build explanation: what hydro-jetting is, when it's needed, process, cost vs. snaking.",
        5,
      ),
      sp(
        "Explain: 'El hidro-jet limpia el tubo con agua a alta presión — elimina grasa, raíces, y depósitos. Es más efectivo que la serpentina.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Re-piping a Home",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Discuss a whole-home repipe project with a homeowner",
    steps: [
      r("Read the plumber passage. Focus on large project vocabulary.", 7),
      ds(
        "Role-play: homeowner with 1960s galvanized pipes needs a full repipe. Explain the process, disruption, and cost.",
        9,
      ),
      sp(
        "Explain: 'Un cambio completo de tubería toma 3 días. Trabajamos por secciones para que tenga agua en la noche.'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Code Compliance Discussion",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain plumbing code requirements to a homeowner",
    steps: [
      r("Read the plumber passage. Focus on code vocabulary.", 6),
      wm(
        "Drill: código, normativa, conforme, actualización, cumplimiento, requerimiento, inspector. 7/7.",
        5,
      ),
      sp(
        "Explain: 'El código actual requiere que los tubos de agua caliente estén aislados. Su instalación antigua no cumple — necesitamos actualizarla.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Rough-In Plumbing",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain rough-in plumbing to a contractor or homeowner",
    steps: [
      r("Read the plumber passage. Focus on rough-in vocabulary.", 6),
      pt(
        "Pattern: 'La tubería de [supply/drain] va aquí. La [fixture] necesita [rough-in dimension]. La inspección es antes de cerrar las paredes.' Build rough-in explanation.",
        7,
      ),
      sp(
        "Explain to a GC: 'El rough-in para el baño está listo. Las salidas de agua están a [measurement]. Llamen al inspector antes de cerrar.'",
        7,
      ),
    ],
  },
  {
    n: 22,
    title: "Frozen Pipe Emergency",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Help a homeowner deal with frozen pipes",
    steps: [
      r("Read the plumber passage. Focus on emergency vocabulary.", 6),
      sb("Build 4 frozen pipe instructions: locate, thaw, check for burst, temporary repair.", 5),
      sp(
        "Guide by phone: 'Cierre el agua principal primero. Aplique calor suave con una secadora — nunca llama abierta. Voy para allá.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Grading & Drainage Issues",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain exterior drainage problems and solutions",
    steps: [
      r("Read the plumber passage. Focus on drainage vocabulary.", 6),
      wm("Drill: drenaje, pendiente, sumidero, canalón, zanja, filtración, sótano. 7/7.", 5),
      sp(
        "Explain: 'El agua entra al sótano porque el suelo no tiene pendiente correcta. Necesitamos instalar un drenaje francés.'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "Finishing the Job",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Complete the job professionally and explain what was done",
    steps: [
      r("Read the plumber passage. Find job completion vocabulary.", 6),
      pt(
        "Pattern: 'Hice [work performed]. Reemplacé [parts]. Probé el sistema y está [status]. El precio total es [amount].' Build closeout.",
        7,
      ),
      sp(
        "Close the job: explain what was done, test results, any recommendations, warranty, and payment.",
        7,
      ),
    ],
  },
  {
    n: 25,
    title: "Upselling & Maintenance Plans",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Professionally suggest additional services and maintenance plans",
    steps: [
      r("Read the plumber passage. Focus on sales vocabulary.", 6),
      ds(
        "Role-play: after fixing a leak, suggest a whole-house inspection and maintenance agreement.",
        9,
      ),
      sp(
        "Suggest: 'Mientras estoy aquí, noto que su calentador ya tiene 12 años. ¿Le hago una revisión preventiva mientras estoy aquí?'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Radiant Floor Heating",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Explain radiant floor heating installation and maintenance",
    steps: [
      r("Read the plumber passage. Find hydronic vocabulary.", 6),
      wm(
        "Drill: radiante, calefacción, tubería, manifiesto, termostato, herméticos, zona. 7/7.",
        5,
      ),
      sp(
        "Explain radiant heat: 'El calor radiante calienta el piso con agua caliente en tubos bajo el piso — es más eficiente que el aire forzado.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Irrigation System Basics",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Connect and communicate about residential irrigation systems",
    steps: [
      r("Read the plumber passage. Focus on irrigation vocabulary.", 6),
      wm("Drill: sistema de riego, aspersor, válvula, zona, temporizador, goteo, presión. 7/7.", 5),
      sp(
        "Explain: 'Voy a revisar las válvulas y la presión de cada zona. Si hay fuga en el sistema, lo encontraré con el detector.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Apprentice Communication",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Direct an apprentice in the target language on a job site",
    steps: [
      r("Read the plumber passage. Focus on direction vocabulary.", 6),
      pt(
        "Pattern: 'Tráeme [tool]. Ve a cerrar [valve]. Mide [X] pulgadas desde [reference]. Conecta el [component].' Build 5 directions.",
        7,
      ),
      sp(
        "Direct your apprentice through a repair: shut off, diagnose, repair, test — give each step as a clear command.",
        7,
      ),
    ],
  },
  {
    n: 29,
    title: "Inspection Day Communication",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective: "Communicate with an inspector and a homeowner on inspection day",
    steps: [
      r("Read the plumber passage. Find inspection vocabulary.", 6),
      ds(
        "Role-play: inspector finds a code violation in your work. Address it professionally in the target language.",
        9,
      ),
      sp(
        "Respond to inspector: 'Gracias por señalarlo. Lo corrigiré hoy. ¿Puedo solicitar una re-inspección mañana por la tarde?'",
        5,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Service Call",
    readingTemplate: "seed-{lang}-plumber-leak",
    objective:
      "Complete a full plumbing service call — diagnosis to invoice — without switching languages",
    steps: [
      r("Read the plumber passage as your job prep.", 5),
      ds(
        "AI-assisted full service call: arrival → diagnosis → estimate → repair → quality check → payment. Target language only.",
        12,
      ),
      sp(
        "Close the call: 'El problema era [diagnosis]. Hice [repair]. Todo funciona. El total es [amount]. Firme aquí por favor.'",
        3,
      ),
    ],
  },
];

// ─── ELECTRICIAN ─────────────────────────────────────────────────────────────

const ELECTRICIAN_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Safety Briefing",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Run a daily electrical safety briefing for your crew",
    steps: [
      r("Read the electrician passage. Focus on safety vocabulary.", 7),
      wm("Drill: voltaje, corriente, tierra, interruptor, circuito, protección, EPP. 7/7.", 5),
      sp(
        "Brief: 'Hoy trabajamos con voltaje de [X]. Confirmen que los breakers están apagados y etiquetados antes de tocar cables.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Electrical Vocabulary Foundation",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Master 15 core electrical terms in the target language",
    steps: [
      r("Read the electrician passage. Build your vocabulary list.", 7),
      wm(
        "Drill: voltaje, amperaje, vatios, transformador, fase, neutro, panel, breaker, tierra. 9/9.",
        5,
      ),
      sp(
        "Explain ohm's law to an apprentice: 'Voltaje es igual a amperaje multiplicado por resistencia — V = I × R.'",
        8,
      ),
    ],
  },
  {
    n: 3,
    title: "Panel & Breaker Communication",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Communicate about a panel upgrade or breaker issue",
    steps: [
      r("Read the electrician passage. Focus on panel vocabulary.", 7),
      pt(
        "Pattern: 'El panel está al [%] de capacidad. El breaker de [circuit] está [status]. Necesitamos [upgrade/repair].' Build panel assessment.",
        7,
      ),
      sp(
        "Tell a customer: 'Su panel tiene 100 amperios — necesita 200 para una casa moderna. Le recomiendo una actualización.'",
        6,
      ),
    ],
  },
  {
    n: 4,
    title: "New Circuit Installation",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain new circuit installation to a homeowner",
    steps: [
      r("Read the electrician passage. Focus on installation vocabulary.", 6),
      wm("Drill: circuito, calibre, interruptor, cable, conducto, carga, tomacorriente. 7/7.", 5),
      sp(
        "Explain: 'Para su nueva cocina, necesita un circuito dedicado de 20 amperios. Corro el cable desde el panel hasta aquí.'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Troubleshooting an Outage",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Diagnose and communicate about an electrical outage",
    steps: [
      r("Read the electrician passage. Focus on diagnostic vocabulary.", 7),
      pt(
        "Pattern: '¿Cuánto tiempo lleva sin luz? ¿Afecta todo o solo una área? ¿Revisó el breaker? ¿Hay quemado o chispa?' Build diagnostic questions.",
        7,
      ),
      sp(
        "Diagnose by phone: triage the outage, give safe instructions, and set arrival expectation.",
        6,
      ),
    ],
  },
  {
    n: 6,
    title: "GFCI & AFCI Outlets",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain GFCI and AFCI protection to a homeowner",
    steps: [
      r("Read the electrician passage. Find safety device vocabulary.", 6),
      wm("Drill: GFCI, AFCI, prueba, reposición, húmedo, protección, disparo. 7/7.", 5),
      sp(
        "Explain GFCI: 'Este tomacorriente GFCI se apaga si detecta una fuga de corriente — protege contra electrocución en baños y cocinas.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Running Conduit",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Direct your crew while running conduit",
    steps: [
      r("Read the electrician passage. Focus on conduit vocabulary.", 6),
      pt(
        "Pattern: 'Corre el conducto desde [point A] hasta [point B]. Usa [type] de [diameter] pulgadas. Dobla aquí a [angle].' Build 3 conduit directions.",
        7,
      ),
      sp(
        "Direct: 'Corre el conducto EMT de 3/4 por el techo hasta la caja de distribución. Haz una curva de 90 grados aquí.'",
        7,
      ),
    ],
  },
  {
    n: 8,
    title: "Load Calculation Communication",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain load calculations and service sizing to a customer or inspector",
    steps: [
      r("Read the electrician passage. Focus on load vocabulary.", 7),
      wm("Drill: carga, demanda, factor, calefacción, A/C, servicio, amperaje total. 7/7.", 5),
      sp(
        "Explain: 'Calculé la carga total de la casa — necesita un servicio de 200 amperios mínimo para todos los aparatos.'",
        8,
      ),
    ],
  },
  {
    n: 9,
    title: "EV Charger Installation",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Quote and explain EV charger installation",
    steps: [
      r("Read the electrician passage. Focus on EV charger vocabulary.", 6),
      sb(
        "Build EV charger proposal: panel capacity check, dedicated circuit, charger type, permit, cost.",
        5,
      ),
      sp(
        "Explain to a customer: 'Para el cargador del carro eléctrico necesita un circuito de 240V y 50 amperios. Incluye permiso e inspección.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Outdoor & Landscape Lighting",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Discuss outdoor wiring and lighting installation",
    steps: [
      r("Read the electrician passage. Find outdoor wiring vocabulary.", 6),
      wm(
        "Drill: exterior, impermeable, UF, conduit, fotocelda, temporizador, bajo voltaje. 7/7.",
        5,
      ),
      sp(
        "Propose: 'Para la iluminación exterior, instalo cable UF directo enterrado o conduit. Incluye fotocelda automática.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Commercial Wiring Basics",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain commercial vs residential wiring to a new apprentice",
    steps: [
      r("Read the electrician passage. Focus on commercial vocabulary.", 7),
      pt(
        "Pattern: 'En comercial, usamos [3-phase, 480V, conduit, bigger wire]. En residencial usamos [120/240V, Romex]. La diferencia es [reason].' Build comparison.",
        7,
      ),
      sp(
        "Explain to an apprentice: 'El voltaje trifásico que usamos aquí es más eficiente para motores y equipos pesados.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Pulling Wire Through Conduit",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Direct a crew while pulling wire",
    steps: [
      r("Read the electrician passage. Focus on wire pulling vocabulary.", 6),
      wm(
        "Drill: cable, jalado, guía, lubricante, tensión, pares, etiquetas, código de color. 8/8.",
        5,
      ),
      sp(
        "Direct: 'Pasa la guía primero. Ata el cable. Aplica lubricante. Jala despacio y parejo — yo guío de este lado.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Grounding & Bonding",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain grounding and bonding requirements to an inspector or customer",
    steps: [
      r("Read the electrician passage. Focus on grounding vocabulary.", 7),
      wm("Drill: tierra, barra de tierra, varilla, electrodo, unión, equipo, sistema. 7/7.", 5),
      sp(
        "Explain: 'La tierra de seguridad protege contra descargas eléctricas. La unión de equipos evita diferencias de potencial peligrosas.'",
        8,
      ),
    ],
  },
  {
    n: 14,
    title: "Low Voltage Systems",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain low voltage — data, security, and structured wiring",
    steps: [
      r("Read the electrician passage. Focus on low voltage vocabulary.", 6),
      wm(
        "Drill: bajo voltaje, red, cámara, alarma, Cat6, coaxial, control, panel de acceso. 8/8.",
        5,
      ),
      sp(
        "Propose: 'Junto con el cableado eléctrico, puedo instalar las redes de datos, cámaras de seguridad, y bocinas — todo en una visita.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Inspection Sign-Off",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Prepare for and communicate with an electrical inspector",
    steps: [
      r("Read the electrician passage. Find inspection vocabulary.", 7),
      ds(
        "Role-play: inspector flags a neutral-to-ground bonding error. Address it professionally and schedule a re-inspection.",
        9,
      ),
      sp(
        "Respond: 'Tiene razón. Lo corrijo hoy. ¿Puedo solicitar la re-inspección para mañana temprano?'",
        4,
      ),
    ],
  },
  {
    n: 16,
    title: "Generator & Transfer Switch",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain generator and transfer switch installation",
    steps: [
      r("Read the electrician passage. Focus on generator vocabulary.", 6),
      wm(
        "Drill: generador, transferencia, automático, carga crítica, propano, gas, prueba semanal. 7/7.",
        5,
      ),
      sp(
        "Explain: 'El interruptor de transferencia automático cambia a generador cuando se va la luz — en menos de 10 segundos.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Working in Tight Spaces",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Communicate about electrical work in attics and crawl spaces",
    steps: [
      r("Read the electrician passage. Find confined space vocabulary.", 6),
      pt(
        "Pattern: 'Necesito trabajar en [attic/crawlspace]. Necesito [tools/PPE]. El riesgo es [hazard]. Voy a [safety measure].' Build confined space plan.",
        7,
      ),
      sp(
        "Brief your helper: 'Voy a entrar al ático. Tú me pasas los cables. Si me llamas y no respondo, entra y ayúdame a salir.'",
        7,
      ),
    ],
  },
  {
    n: 18,
    title: "Smoke Detector & Safety Devices",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain and install interconnected smoke and CO detectors",
    steps: [
      r("Read the electrician passage. Find safety device vocabulary.", 6),
      wm(
        "Drill: detector de humo, CO, interconectado, batería, cableado, ubicación, código. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Instalo detectores de humo interconectados — si uno suena, todos suenan. El código requiere uno en cada cuarto.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Solar Panel Wiring",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Discuss solar PV system wiring and interconnection",
    steps: [
      r("Read the electrician passage. Focus on solar vocabulary.", 6),
      wm(
        "Drill: fotovoltaico, panel, inversor, CC, CA, interconexión, medidor, microinversor. 8/8.",
        5,
      ),
      sp(
        "Explain solar hookup: 'Los paneles generan CC. El inversor lo convierte a CA. Se conecta al panel principal con un breaker dedicado.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Motor & Equipment Wiring",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Wire a 3-phase motor and explain to a foreman",
    steps: [
      r("Read the electrician passage. Focus on motor vocabulary.", 7),
      wm(
        "Drill: motor, trifásico, contactor, relé, arrancador, sobrecarga, manual de conexión. 7/7.",
        5,
      ),
      sp(
        "Explain motor wiring: 'Este motor de 5 HP necesita 3-phase 240V. Aquí están las conexiones L1, L2, L3 según el manual.'",
        8,
      ),
    ],
  },
  {
    n: 21,
    title: "Service Entrance Replacement",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain a service entrance upgrade to a homeowner",
    steps: [
      r("Read the electrician passage. Focus on service entrance vocabulary.", 6),
      ds(
        "Role-play: homeowner's house was built in 1955 with 60-amp service. Propose a full upgrade.",
        9,
      ),
      sp(
        "Explain: 'Con 60 amperios, no puede tener A/C, cargador de carro y lavadora al mismo tiempo. Necesita 200 amperios.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Fire Alarm Systems",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Explain commercial fire alarm system wiring",
    steps: [
      r("Read the electrician passage. Focus on fire alarm vocabulary.", 6),
      wm(
        "Drill: alarma, panel de incendio, detector, strobe, bocina, zona, dirección, initiating. 8/8.",
        5,
      ),
      sp(
        "Explain: 'El sistema de alarma contra incendio requiere cableado de clase A. Cada dispositivo tiene una dirección única.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Apprentice Training on the Job",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Train an apprentice in job-site electrical skills",
    steps: [
      r("Read the electrician passage. Find training vocabulary.", 6),
      pt(
        "Pattern: 'Primero aprende [safety rule]. Luego haz [basic task]. Cuando domines eso, te enseñaré [next skill].' Build training progression.",
        7,
      ),
      sp(
        "Train: 'Nunca trabajes en un circuito sin verificar que el breaker esté apagado y etiquetado. Muéstrame cómo lo haces.'",
        7,
      ),
    ],
  },
  {
    n: 24,
    title: "Customer Education & Safety Tips",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Educate a homeowner on electrical safety",
    steps: [
      r("Read the electrician passage. Find homeowner safety vocabulary.", 6),
      sb(
        "Build 5 homeowner safety tips: overloaded outlets, extension cords, GFCI testing, breaker tripping, when to call.",
        5,
      ),
      sp(
        "Educate: 'No sobrecargue los tomacorrientes. Use regletas con protección. Si el breaker se apaga seguido, llámeme.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Quoting a Large Project",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Present a detailed quote for a large electrical project",
    steps: [
      r("Read the electrician passage. Focus on estimate vocabulary.", 7),
      ds(
        "Role-play: quote a full rewire of a 2,000 sq ft 1950s house with knob-and-tube wiring.",
        9,
      ),
      sp(
        "Present quote: 'El proyecto incluye: nuevo panel 200A, rewire completo, permisos e inspección. El total es [amount]. ¿Le envío por escrito?'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Communication with Other Trades",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Coordinate with plumbers, HVAC, and framers on a job site",
    steps: [
      r("Read the electrician passage. Focus on multi-trade vocabulary.", 6),
      pt(
        "Pattern: 'Necesito que [trade] termine [task] antes de que yo [action], porque [reason]. ¿Cuándo pueden?' Build coordination.",
        7,
      ),
      sp(
        "Coordinate: 'Plomería — necesito que terminen el rough-in del baño antes del jueves para correr mi cableado.'",
        7,
      ),
    ],
  },
  {
    n: 27,
    title: "Final Trim Out",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Complete trim-out and explain finished work to a customer",
    steps: [
      r("Read the electrician passage. Focus on final installation vocabulary.", 6),
      wm("Drill: tapa, placa, tomacorriente, interruptor, probador, voltaje, terminado. 7/7.", 5),
      sp(
        "Close the job: 'Ya terminé la instalación. Probé todos los circuitos — todo funciona. Aquí están las etiquetas del panel.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Energy Audit Language",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Discuss energy efficiency and usage with a customer",
    steps: [
      r("Read the electrician passage. Focus on energy vocabulary.", 6),
      sb(
        "Build 4 energy savings recommendations: LED lighting, smart thermostats, peak hour usage, solar.",
        5,
      ),
      sp(
        "Recommend: 'Cambiando a LEDs y añadiendo un medidor inteligente puede reducir su factura de electricidad en un 30%.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Commercial Job Communication",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective: "Manage communication on a large commercial electrical job",
    steps: [
      r("Read the electrician passage as a complex job prep.", 7),
      ds(
        "Role-play: foreman on a commercial build — coordinate with the GC, handle an inspection, and brief your crew.",
        10,
      ),
      sp(
        "Update the GC: 'Terminamos el rough-in del primer piso. La inspección es viernes. El segundo piso empieza el lunes.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Electrical Service Call",
    readingTemplate: "seed-{lang}-electrician-wiring",
    objective:
      "Complete a full electrical service call — problem to final test — without switching languages",
    steps: [
      r("Read the electrician passage as your job prep.", 5),
      ds(
        "AI-assisted full call: arrival → diagnosis → repair → test → customer education → invoice. Target language only.",
        12,
      ),
      sp(
        "Close out: 'Reemplacé el [component]. Todo funciona. No sobrecargue este circuito. El total es [amount].'",
        3,
      ),
    ],
  },
];

// ─── DRYWALL ─────────────────────────────────────────────────────────────────

const DRYWALL_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Material Order & Layout",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Order drywall materials and explain the layout to your crew",
    steps: [
      r("Read the drywall passage. Focus on material vocabulary.", 7),
      wm("Drill: tablarroca, yeso, lámina, tornillo, cinta, compuesto, esquinero, lija. 8/8.", 5),
      sp(
        "Order: 'Necesito 40 láminas de tablarroca de 4×8, 2 cajas de tornillos de 1-5/8 y 5 galones de compuesto.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Measuring & Cutting",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Give cutting instructions and measurements to your crew",
    steps: [
      r("Read the drywall passage. Focus on measuring vocabulary.", 7),
      pt(
        "Pattern: 'Mide [dimension]. Marca aquí. Corta con la navaja. Rompe y corta el papel atrás.' Build 3 cut instructions.",
        7,
      ),
      sp(
        "Direct: 'Esta pieza mide 47.5 pulgadas de ancho. Marca, corta, rompe, y termina con la navaja.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Hanging on Walls",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Direct the crew on hanging drywall on walls",
    steps: [
      r("Read the drywall passage. Focus on hanging vocabulary.", 6),
      wm("Drill: montante, tornillo, espaciado, borde, centro, nivel, plomada, soporte. 8/8.", 5),
      sp(
        "Direct: 'Empieza desde la esquina. Asegúrate que el borde cae en el centro del montante. Tornillos cada 8 pulgadas.'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Hanging Ceilings",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Direct ceiling drywall installation",
    steps: [
      r("Read the drywall passage. Focus on ceiling vocabulary.", 6),
      pt(
        "Pattern: 'En el techo, el drywall va perpendicular a las vigas. Usa [fastener]. Necesitas al menos [X] personas para sostener.' Build ceiling crew instructions.",
        7,
      ),
      sp(
        "Brief the crew: 'Para el techo, necesitamos 3 personas. Dos sostienen, uno atornilla. Empezamos en el centro.'",
        7,
      ),
    ],
  },
  {
    n: 5,
    title: "First Coat — Taping",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Apply tape and first coat of joint compound",
    steps: [
      r("Read the drywall passage. Find taping vocabulary.", 7),
      wm(
        "Drill: compuesto, cinta, junta, espátula, filos, primera capa, burbuja, presión. 8/8.",
        5,
      ),
      sp(
        "Instruct: 'Aplica una capa delgada de compuesto en la junta. Coloca la cinta centrada. Pasa la espátula para quitar burbujas.'",
        8,
      ),
    ],
  },
  {
    n: 6,
    title: "Feathering & Second Coat",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Apply and feather the second coat of mud",
    steps: [
      r("Read the drywall passage. Focus on coating vocabulary.", 7),
      pt(
        "Pattern: 'La segunda capa es más ancha. Extiende a [X] inches cada lado. Usa la espátula de [X] pulgadas. Deja secar.' Build second coat instructions.",
        7,
      ),
      sp(
        "Direct: 'La segunda capa de lodo va 2 pulgadas más ancha que la primera. Usa la espátula de 10 pulgadas y plana el borde.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Finish Coat & Skim Coat",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Apply a skim coat for a smooth, flat finish",
    steps: [
      r("Read the drywall passage. Focus on finish coat vocabulary.", 6),
      wm("Drill: lija, liso, skim, parejo, grano fino, poros, mezcla delgada. 7/7.", 5),
      sp(
        "Instruct: 'La última capa es muy delgada — como mantequilla sobre pan. Usa el compuesto más diluido y la espátula más larga.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Sanding Techniques",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Direct sanding work and quality checking",
    steps: [
      r("Read the drywall passage. Find sanding vocabulary.", 6),
      pt(
        "Pattern: 'Usa lija de [grit]. Lija en círculos pequeños sobre las juntas. Verifica con la luz rasante. Si ves [defect], aplica más compuesto.' Build sanding protocol.",
        7,
      ),
      sp(
        "Direct: 'Lija las juntas con grano 120. Después de lijar, pasa la mano — si sientes algo, necesita más compuesto.'",
        7,
      ),
    ],
  },
  {
    n: 9,
    title: "Corner Bead Installation",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Install and coat corner bead on exterior corners",
    steps: [
      r("Read the drywall passage. Focus on corner vocabulary.", 6),
      wm("Drill: esquinero, exterior, interior, metal, plástico, nivel, golpe, capas. 8/8.", 5),
      sp(
        "Direct: 'El esquinero va recto — usa el nivel. Fíjalo con tornillos o grapas. Después aplica 3 capas de lodo.'",
        8,
      ),
    ],
  },
  {
    n: 10,
    title: "Texture Application",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Apply knockdown or orange peel texture",
    steps: [
      r("Read the drywall passage. Find texture vocabulary.", 6),
      wm(
        "Drill: textura, naranja, cáscara, aplastado, pistola, compresor, consistencia, tiempo. 8/8.",
        5,
      ),
      sp(
        "Explain texture: 'La textura de naranja se aplica con pistola. Ajusta la presión hasta que las gotas sean del tamaño de una naranja.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Moisture Damage Repair",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Assess and repair water-damaged drywall",
    steps: [
      r("Read the drywall passage. Focus on damage vocabulary.", 6),
      pt(
        "Pattern: 'Esta sección tiene daño de agua — está [deformed/moldy]. Necesita [removal/replacement/sealer]. El costo es [amount].' Build damage assessment.",
        7,
      ),
      sp(
        "Tell the customer: 'Esta parte del drywall tiene moho. Hay que quitarla, tratar la pared, y poner tablarroca nueva.'",
        7,
      ),
    ],
  },
  {
    n: 12,
    title: "Patching Holes",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Explain hole patching methods for different sizes",
    steps: [
      r("Read the drywall passage. Find patch vocabulary.", 6),
      wm("Drill: parche, malla, respaldo, tornillos de anclaje, compuesto, lijar, pintar. 7/7.", 5),
      sp(
        "Explain: 'Para un hueco pequeño uso parche de malla. Para uno grande, corto un cuadrado y pongo respaldo de madera.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Fire Code & Special Board",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Explain fire-rated and moisture-resistant board applications",
    steps: [
      r("Read the drywall passage. Focus on fire and moisture vocabulary.", 6),
      wm(
        "Drill: cortafuego, resistente, tipo X, cementatia, verde, azul, código, compartimento. 8/8.",
        5,
      ),
      sp(
        "Explain: 'En el garaje y cuarto del calentador, el código requiere drywall tipo X de 5/8 de pulgada — es resistente al fuego.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Working with Metal Studs",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Frame with metal studs and communicate with the crew",
    steps: [
      r("Read the drywall passage. Focus on metal stud vocabulary.", 7),
      pt(
        "Pattern: 'El canal va en el piso y el techo. Los montantes van cada 16 pulgadas. Usa tornillos de punta de broca para unirlos.' Build metal stud instructions.",
        7,
      ),
      sp(
        "Direct the crew: 'Los montantes de metal van cada 16 pulgadas de centro a centro. Usa el snap-lock para unirlos al canal.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Soundproofing Discussion",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Recommend soundproofing upgrades to a customer",
    steps: [
      r("Read the drywall passage. Find soundproofing vocabulary.", 6),
      ds(
        "Role-play: customer wants to soundproof a home studio. Recommend drywall, green glue, and decoupling.",
        9,
      ),
      sp(
        "Recommend: 'Para reducir el sonido, instalo doble capa de drywall con Green Glue en medio. Reduce el ruido en un 50%.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Ceiling Grid & Drop Ceiling",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Install a drop ceiling grid and communicate with the customer",
    steps: [
      r("Read the drywall passage. Focus on ceiling grid vocabulary.", 6),
      wm("Drill: cielo suspendido, grid, ángulo, colgante, teja, lámpara, nivel. 7/7.", 5),
      sp(
        "Explain drop ceiling: 'El cielo falso cuelga de la estructura. Instalo el ángulo perimetral primero, luego las carreras principales.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Quality Control Walk-Through",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Lead a quality control inspection with the crew",
    steps: [
      r("Read the drywall passage. Focus on quality vocabulary.", 7),
      pt(
        "Pattern: 'En este cuarto, revisa las juntas [location]. Busca [defect]. Si ves [problem], marca con cinta y corrige.' Build QC protocol.",
        7,
      ),
      sp(
        "Walk through: 'Vamos a revisar todo con la luz rasante. Cualquier junta que se vea, necesita otra capa.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Estimating a Job",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Estimate a drywall job by square footage and scope",
    steps: [
      r("Read the drywall passage. Find estimate vocabulary.", 6),
      sb("Build an estimate: square footage, material cost, labor, texture, and total.", 5),
      sp(
        "Give an estimate: 'La casa tiene 1,200 pies cuadrados de drywall. El material son [amount], la mano de obra [amount]. Total [amount].'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Finishing Level Standards (Levels 0–5)",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Explain finishing levels to a GC or painter",
    steps: [
      r("Read the drywall passage. Find finishing level vocabulary.", 7),
      wm("Drill: nivel 0, nivel 3, nivel 4, nivel 5, imprimación, lijado fino, skim coat. 7/7.", 5),
      sp(
        "Explain: 'Para pintura con luz rasante, necesitan nivel 5 — skim coat completo sobre toda la superficie.'",
        8,
      ),
    ],
  },
  {
    n: 20,
    title: "Coordinating with Painters",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Hand off the job to painters with proper finish specifications",
    steps: [
      r("Read the drywall passage. Focus on handoff vocabulary.", 6),
      pt(
        "Pattern: 'El drywall está en nivel [X]. Primer antes de pintar. Las esquinas están [status]. Los detalles pendientes son [items].' Build painter handoff.",
        7,
      ),
      sp(
        "Hand off: 'El trabajo de drywall está terminado al nivel 4. Necesita imprimación antes de pintar. Las esquinas están perfectas.'",
        7,
      ),
    ],
  },
  {
    n: 21,
    title: "Garage & Basement Work",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Plan and communicate a garage or basement drywall project",
    steps: [
      r("Read the drywall passage. Focus on specialty area vocabulary.", 6),
      wm("Drill: garage, sótano, humedad, resistente, base, concreto, aislante, vapor. 8/8.", 5),
      sp(
        "Plan: 'En el sótano, usamos tablarroca resistente a la humedad. Primero instalamos barrera de vapor y aislante.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Arches & Curved Walls",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Explain curved and arched drywall installation",
    steps: [
      r("Read the drywall passage. Focus on curved work vocabulary.", 6),
      pt(
        "Pattern: 'Para doblar el drywall en [curve], usamos [wet/flexible board]. La curva mínima es [radius]. Lo mojamos [time] antes de doblar.' Build curve instructions.",
        7,
      ),
      sp(
        "Explain: 'Para el arco, uso tablarroca de 1/4 de pulgada. La mojo, espero 20 minutos, y la doblo suavemente.'",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Customer Communication Mid-Job",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Update a customer on job progress and manage expectations",
    steps: [
      r("Read the drywall passage. Focus on progress update vocabulary.", 6),
      ds(
        "Role-play: customer panics seeing the house covered in joint compound dust. Explain the process and timeline.",
        9,
      ),
      sp(
        "Update: 'Terminamos el primer recubrimiento. Necesita secar 24 horas. Mañana aplicamos la segunda capa.'",
        5,
      ),
    ],
  },
  {
    n: 24,
    title: "Window & Door Trim Prep",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Prepare drywall returns around windows and doors",
    steps: [
      r("Read the drywall passage. Focus on trim prep vocabulary.", 6),
      wm(
        "Drill: retorno, jamba, dintel, bate, recubrimiento, capa, esquinero, tolerancia. 8/8.",
        5,
      ),
      sp(
        "Direct: 'El retorno de la ventana tiene 4.5 pulgadas. Corta el drywall exacto para que el bate cubra el borde.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Lead & Hazmat Awareness",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Communicate hazmat procedures for older buildings",
    steps: [
      r("Read the drywall passage. Focus on hazmat vocabulary.", 6),
      wm(
        "Drill: plomo, asbesto, prueba, EPP, contenimiento, bolsa, disposición, certificado. 8/8.",
        5,
      ),
      sp(
        "Warn: 'Esta casa fue construida antes de 1978. Antes de cortar o lijar, necesitamos una prueba de plomo y asbesto.'",
        9,
      ),
    ],
  },
  {
    n: 26,
    title: "Crew Management on Large Projects",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Assign tasks and manage a large drywall crew",
    steps: [
      r("Read the drywall passage. Focus on crew management vocabulary.", 7),
      pt(
        "Pattern: 'Equipo A: cuartos 1 y 2. Equipo B: sala y comedor. Tú en techos. Terminan hoy. Yo reviso a las 4.' Build crew assignment.",
        7,
      ),
      sp(
        "Assign: 'Juan y Carlos: segunda planta. Pedro: cuelgan el garaje. María: termina las esquinas del primero. Revisión a las 3.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Acoustical Ceiling Tiles",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Install acoustical ceiling tiles in a commercial space",
    steps: [
      r("Read the drywall passage. Focus on acoustical ceiling vocabulary.", 6),
      wm("Drill: acústico, suspendido, grid, teja, aislamiento, absorción, sonido. 7/7.", 5),
      sp(
        "Explain to a customer: 'Las tejas acústicas reducen el ruido en la oficina. Las instalo en el grid que ya está.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Final Punch List Communication",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Review the punch list with the GC and correct deficiencies",
    steps: [
      r("Read the drywall passage. Focus on punch list vocabulary.", 6),
      ds(
        "Role-play: GC walks the job and finds 5 deficiencies. Respond professionally and commit to a timeline.",
        9,
      ),
      sp(
        "Respond: 'Entiendo. Corrijo el cuarto 3 y los esquineros del pasillo mañana temprano. ¿Puedo tener la aceptación final el jueves?'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "Water Damage Insurance Work",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective: "Document and communicate a water damage drywall insurance claim",
    steps: [
      r("Read the drywall passage as an insurance scenario prep.", 7),
      ds(
        "Role-play: write a scope of work for an insurance adjuster after a water damage event.",
        9,
      ),
      sp(
        "State scope: 'El alcance incluye: demolición de 200 pies de drywall dañado, secado, reinstalación y acabado nivel 4.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Drywall Project",
    readingTemplate: "seed-{lang}-drywall-mud",
    objective:
      "Manage a full room drywall project — hang to finish — communicating in target language",
    steps: [
      r("Read the drywall passage as your project prep.", 5),
      ds(
        "AI-assisted full project: material order → hanging → taping → finishing → QC → customer sign-off. Target language only.",
        12,
      ),
      sp(
        "Sign off: 'El cuarto está terminado al nivel 4. Las esquinas están perfectas. Listo para pintura. El total es [amount].'",
        3,
      ),
    ],
  },
];

// ─── LANDSCAPER ──────────────────────────────────────────────────────────────

const LANDSCAPER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Morning Crew Meeting",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Run a morning safety and task meeting for your landscape crew",
    steps: [
      r("Read the landscaper passage. Focus on daily meeting vocabulary.", 7),
      wm("Drill: paisajismo, césped, riego, poda, herramienta, seguridad, turno, equipo. 8/8.", 5),
      sp(
        "Brief: 'Buenos días. Hoy tenemos 4 trabajos. El equipo A va al riego, el B al corte. Todos traigan sus EPP.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Mowing Instructions",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Give mowing assignments and height instructions",
    steps: [
      r("Read the landscaper passage. Focus on mowing vocabulary.", 7),
      pt(
        "Pattern: 'Corta el césped a [height] pulgadas. El patrón es [direction]. Evita [obstacle]. El borde va con la bordeadora.' Build 3 mowing instructions.",
        7,
      ),
      sp(
        "Direct: 'Corta a 3 pulgadas. Patrón de rayas. Evita la zona de flores. Después bordeadora y soplador.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Irrigation System Operation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Operate and communicate about an irrigation system",
    steps: [
      r("Read the irrigation passage fully. This is your core scenario.", 8),
      wm(
        "Drill: aspersor, zona, válvula, controlador, goteo, cobertura, presión, programación. 8/8.",
        5,
      ),
      sp(
        "Set the timer: 'La zona 1 riega el césped del frente — 15 minutos, 3 veces por semana. La zona 2 riega las flores.'",
        7,
      ),
    ],
  },
  {
    n: 4,
    title: "Irrigation Leak Repair",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Diagnose and repair an irrigation leak",
    steps: [
      r("Read the irrigation passage. Focus on repair vocabulary.", 7),
      pt(
        "Pattern: 'La fuga está en [zone/location]. El aspersor [broke/clogged/sank]. Lo reparo con [method] y pruebo la cobertura.' Build repair workflow.",
        7,
      ),
      sp(
        "Report to customer: 'Encontré una fuga en la zona 3. Era un aspersor roto. Ya lo reemplacé y probé la cobertura.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Pruning & Hedge Trimming",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Direct pruning and hedge trimming work",
    steps: [
      r("Read the landscaper passage. Focus on pruning vocabulary.", 6),
      wm(
        "Drill: poda, recorte, motosierra, tijera, seto, formación, sanitaria, correctiva. 8/8.",
        5,
      ),
      sp(
        "Direct: 'Recorta el seto a 4 pies de alto. Línea recta desde la calle. Las esquinas en ángulo de 45 grados.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Fertilization & Soil",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Apply fertilizer and explain soil treatment to a customer",
    steps: [
      r("Read the landscaper passage. Focus on soil vocabulary.", 6),
      wm(
        "Drill: fertilizante, nitrógeno, fósforo, potasio, pH, compost, enmienda, granulado. 8/8.",
        5,
      ),
      sp(
        "Recommend: 'Su césped necesita fertilizante con alto nitrógeno en primavera. El suelo está demasiado ácido — añadimos cal.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Pest & Weed Control",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Identify pests and explain treatment options",
    steps: [
      r("Read the landscaper passage. Focus on pest vocabulary.", 6),
      wm(
        "Drill: plaga, maleza, herbicida, insecticida, aplicación, etiqueta, PPE, re-entrada. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Tiene chinches de jardín. Voy a aplicar un insecticida orgánico. No puede entrar al área por 24 horas.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Tree Trimming & Removal",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Explain and execute safe tree work",
    steps: [
      r("Read the landscaper passage. Focus on tree work vocabulary.", 7),
      pt(
        "Pattern: 'El árbol necesita [service] porque [reason]. El riesgo es [hazard]. El costo es [amount].' Build tree proposal.",
        7,
      ),
      sp(
        "Propose tree removal: 'Este árbol tiene raíces que dañan su fundación. Necesita quitarse. El trabajo toma medio día.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Mulch & Ground Cover",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Apply mulch correctly and explain its benefits",
    steps: [
      r("Read the landscaper passage. Focus on mulch vocabulary.", 6),
      wm(
        "Drill: mantillo, cobertura, profundidad, volcán, humedad, maleza, descomposición. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Aplico 3 pulgadas de mantillo — sin que toque el tronco. Retiene la humedad y bloquea las malezas.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Planting Instructions",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Direct plant installation with proper technique",
    steps: [
      r("Read the landscaper passage. Focus on planting vocabulary.", 7),
      pt(
        "Pattern: 'Cava el hoyo [2x] el ancho y [same depth] que la raíz. Coloca la planta al nivel del suelo. Rellena con [soil mix].' Build planting instructions.",
        7,
      ),
      sp(
        "Direct: 'El hoyo debe ser el doble de ancho que la maceta. Planta al mismo nivel que estaba. Apisonaa bien y riega.'",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "Sod Installation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Install sod and explain the process to a customer",
    steps: [
      r("Read the landscaper passage. Focus on sod vocabulary.", 6),
      wm(
        "Drill: pasto en rollo, preparación, nivelación, juntas, rodillo, riego, arraigo. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Quitamos el pasto viejo, nivelamos el suelo, y colocamos el rollo en patrón de ladrillo. Riega dos veces al día por 2 semanas.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Customer Quote Presentation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Present a landscape maintenance or installation quote",
    steps: [
      r("Read the landscaper passage. Focus on estimate vocabulary.", 6),
      ds("Role-play: present a seasonal maintenance contract to a homeowner.", 9),
      sp(
        "Present: 'El servicio mensual incluye corte, bordeado, soplado, y fertilización trimestral. El total es [amount] al mes.'",
        5,
      ),
    ],
  },
  {
    n: 13,
    title: "Drainage Problems & Solutions",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Assess drainage issues and explain solutions",
    steps: [
      r("Read the landscaper passage. Find drainage vocabulary.", 6),
      wm(
        "Drill: drenaje, charco, pendiente, dreno francés, zanja, geotextil, grava, desbordamiento. 8/8.",
        5,
      ),
      sp(
        "Diagnose: 'El agua se acumula porque el suelo no tiene pendiente. Instalamos un drenaje francés a lo largo de la cerca.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Seasonal Cleanup",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Brief the crew on a seasonal cleanup job",
    steps: [
      r("Read the landscaper passage. Focus on cleanup vocabulary.", 6),
      pt(
        "Pattern: 'Hoy hacemos limpieza de [spring/fall]. Incluye: [task list]. El orden es [priority sequence]. Terminamos en [time].' Build cleanup brief.",
        7,
      ),
      sp(
        "Brief: 'Limpieza de otoño — recojan las hojas, corten el pasto, podad los perennes, y cubran las plantas sensibles.'",
        7,
      ),
    ],
  },
  {
    n: 15,
    title: "Landscape Design Consultation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Discuss a landscape design plan with a customer",
    steps: [
      r("Read the landscaper passage. Focus on design vocabulary.", 6),
      ds(
        "Role-play: customer wants a full backyard landscape redesign with a budget of $15,000.",
        9,
      ),
      sp(
        "Consult: 'Para su presupuesto, puedo incluir: patio de concreto, plantas nativas, riego automático, y iluminación básica.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Equipment Maintenance Communication",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Direct daily equipment maintenance in the target language",
    steps: [
      r("Read the landscaper passage. Focus on equipment vocabulary.", 7),
      pt(
        "Pattern: 'Al final del día: limpia [tool], revisa [fluid], afila [blade], reporta si [problem].' Build end-of-day protocol.",
        7,
      ),
      sp(
        "Direct: 'Antes de guardar las máquinas, limpien el filtro de aire, revisen el aceite, y reporten cualquier daño.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Sod vs Seed Discussion",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Help a customer decide between sod and seeding",
    steps: [
      r("Read the landscaper passage. Find sod and seed vocabulary.", 6),
      sb(
        "Compare: cost, time to establish, maintenance, success rate, and best use case for each option.",
        5,
      ),
      sp(
        "Recommend: 'Para resultados inmediatos, el rollo es mejor pero cuesta más. La semilla tarda 3 meses pero es más económica.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Irrigation Winterization",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Explain and perform irrigation system winterization",
    steps: [
      r("Read the irrigation passage. Focus on winterization vocabulary.", 6),
      wm(
        "Drill: soplado, compresor, invierno, válvulas, daño por congelación, drenaje, desconexión. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Para winterizar el riego, apago el agua, abro las válvulas de drenaje, y soplo con compresor para sacar el agua restante.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Hardscape Installation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Communicate during patio or walkway installation",
    steps: [
      r("Read the landscaper passage. Focus on hardscape vocabulary.", 6),
      wm("Drill: patio, adoquín, base, arena, nivelación, compactación, borde, sello. 8/8.", 5),
      sp(
        "Direct: 'Excaven 6 pulgadas. Base de grava de 4 pulgadas, compactada. Arena de 1 pulgada. Luego los adoquines con 1/8 pulgada de separación.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Retaining Wall Construction",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Explain retaining wall installation to a customer and crew",
    steps: [
      r("Read the landscaper passage. Focus on retaining wall vocabulary.", 7),
      pt(
        "Pattern: 'El muro de contención va a [location]. Los bloques se entierran [X] pulgadas. El drenaje atrás es esencial para evitar presión.' Build wall explanation.",
        7,
      ),
      sp(
        "Explain: 'El muro de 4 pies necesita cimentación de grava y un tubo de drenaje atrás para evitar que el agua presione el muro.'",
        6,
      ),
    ],
  },
  {
    n: 21,
    title: "Lighting Installation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Install and explain landscape lighting",
    steps: [
      r("Read the landscaper passage. Focus on lighting vocabulary.", 6),
      wm(
        "Drill: bajo voltaje, transformador, led, spot, camino, temporizador, fotocelda, cable. 8/8.",
        5,
      ),
      sp(
        "Install: 'Las luces de camino van a 6 pies de distancia. El cable se entierra 6 pulgadas. El transformador se instala cerca de la toma.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Contract & Service Agreement",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Review a landscape service contract with a customer",
    steps: [
      r("Read the landscaper passage. Focus on contract vocabulary.", 6),
      ds(
        "Role-play: customer wants to negotiate out of a winter salt-spreading clause. Handle professionally.",
        9,
      ),
      sp(
        "Explain: 'El contrato cubre servicio semanal de abril a noviembre. Los servicios de invierno son adicionales. ¿Quiere incluirlos?'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Xeriscape & Water Conservation",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Recommend xeriscape design for water conservation",
    steps: [
      r("Read the landscaper passage. Focus on xeriscape vocabulary.", 6),
      wm(
        "Drill: xeriscaping, nativa, tolerante a la sequía, roca decorativa, goteo, mulch, adaptada. 7/7.",
        5,
      ),
      sp(
        "Recommend: 'Para reducir su factura de agua, puedo convertir esta área a plantas nativas con riego por goteo.'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "Irrigation Programming",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Program a smart irrigation controller and explain it to the customer",
    steps: [
      r("Read the irrigation passage. Focus on controller vocabulary.", 7),
      pt(
        "Pattern: 'La zona [X] riega [area]. Programa [days/week], [start time], [duration]. El sensor de lluvia la pausará automáticamente.' Build program settings.",
        7,
      ),
      sp(
        "Teach customer: 'Le programé el riego inteligente. Se ajusta automáticamente según el clima. Aquí le explico cómo cambiarlo.'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Storm Cleanup",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Coordinate an emergency storm cleanup crew",
    steps: [
      r("Read the landscaper passage. Focus on emergency vocabulary.", 6),
      wm(
        "Drill: tormenta, árbol caído, daño, emergencia, motosierra, seguridad, prioridad, desvío. 8/8.",
        5,
      ),
      sp(
        "Brief: 'Emergencia de tormenta. Equipo 1: árboles sobre estructuras. Equipo 2: vías bloqueadas. Seguridad primero — si hay cables, llamamos a la empresa eléctrica.'",
        9,
      ),
    ],
  },
  {
    n: 26,
    title: "Aeration & Overseeding",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Explain lawn aeration and overseeding to a customer",
    steps: [
      r("Read the landscaper passage. Focus on aeration vocabulary.", 6),
      wm(
        "Drill: aireación, núcleo, compactación, semilla, contacto suelo, fertilizante inicial, riego. 7/7.",
        5,
      ),
      sp(
        "Explain: 'La aireación hace hoyos en el suelo para que el agua y los nutrientes lleguen a las raíces. Luego sembramos encima.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Dealing with HOA Requirements",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Communicate HOA landscape requirements to a customer",
    steps: [
      r("Read the landscaper passage. Find HOA vocabulary.", 6),
      ds(
        "Role-play: customer received an HOA violation for lawn height. Explain, fix, and help them respond to the HOA.",
        9,
      ),
      sp(
        "Help: 'Le ayudo a llevar el césped a las especificaciones del HOA esta semana. También le preparo una carta de respuesta.'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Employee Safety & Injury Response",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Respond to and communicate a job-site injury",
    steps: [
      r("Read the landscaper passage. Focus on injury vocabulary.", 6),
      pt(
        "Pattern: '[Employee] se lastimó [body part] con [tool]. Hice [first aid]. Fue a [clinic]. Reporte en camino.' Build incident report.",
        7,
      ),
      sp(
        "Report the incident: 'Carlos tuvo un accidente — la bordeadora le cortó el pie. Llamé al 911. Están en el hospital.'",
        7,
      ),
    ],
  },
  {
    n: 29,
    title: "Seasonal Planting Plan",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective: "Present a seasonal color rotation plan to a commercial client",
    steps: [
      r("Read the landscaper passage as a seasonal plan prep.", 7),
      ds("Role-play: present a 4-season planting rotation to a commercial property manager.", 9),
      sp(
        "Present: 'En primavera: petunias. Verano: vincas. Otoño: crisantemos. Invierno: pansies. El precio por cambio es [amount].'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Landscape Service Day",
    readingTemplate: "seed-{lang}-landscaper-irrigation",
    objective:
      "Manage a full landscape service day — crew briefing to customer closeout — without switching languages",
    steps: [
      r("Read the landscaper passage as your morning prep.", 5),
      ds(
        "AI-assisted full service day: crew meeting → job site → customer check-in → issue resolution → closeout. Target language only.",
        12,
      ),
      sp(
        "Close the day: 'Terminamos su propiedad. Cortamos, bordeamos, aplicamos fertilizante, y reparamos el aspersor de la zona 3.'",
        3,
      ),
    ],
  },
];

// ─── AUTO MECHANIC ────────────────────────────────────────────────────────────

const AUTO_MECH_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Customer Check-In",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Check in a customer and record their vehicle complaint",
    steps: [
      r("Read the mechanic passage. Focus on intake vocabulary.", 7),
      wm(
        "Drill: mecánico, taller, vehículo, queja, kilometraje, síntoma, diagnóstico, cotización. 8/8.",
        5,
      ),
      sp(
        "Check in: '¿Cuál es el problema con su carro? ¿Cuándo empezó? ¿Hace algún ruido o siente algo raro?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Brake Diagnosis",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Diagnose and explain a brake system problem",
    steps: [
      r("Read the brake passage fully. This is your core scenario.", 8),
      wm(
        "Drill: freno, pastilla, disco, calibrador, líquido, desgaste, chirrido, pulsación. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Sus pastillas de freno tienen menos de 2mm. Los discos están rayados. Necesita cambiar ambos para frenar bien.'",
        7,
      ),
    ],
  },
  {
    n: 3,
    title: "Oil Change & Fluid Service",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Perform and communicate an oil change service",
    steps: [
      r("Read the mechanic passage. Focus on fluid vocabulary.", 6),
      pt(
        "Pattern: 'El aceite de su carro es [type]. Necesita cambio cada [interval]. Mientras estoy aquí, reviso los demás fluidos.' Build oil change conversation.",
        7,
      ),
      sp(
        "Tell a customer: 'Le cambié el aceite, filtro, y revisé todos los fluidos. El líquido de frenos está bajo — ¿quiere que lo llene?'",
        7,
      ),
    ],
  },
  {
    n: 4,
    title: "Tire Service & Rotation",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain tire inspection, rotation, and replacement",
    steps: [
      r("Read the mechanic passage. Focus on tire vocabulary.", 6),
      wm(
        "Drill: neumático, desgaste, rotación, balanceo, alineación, presión, pulgadas, llanta. 8/8.",
        5,
      ),
      sp(
        "Report: 'Sus llantas delanteras tienen 2/32 de profundidad — están muy gastadas. Las traseras están bien por ahora.'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Engine Diagnosis — Check Engine Light",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain a check engine light diagnosis using OBD codes",
    steps: [
      r("Read the mechanic passage. Focus on engine diagnostic vocabulary.", 7),
      pt(
        "Pattern: 'El código [P####] indica un problema con [component]. La causa probable es [reason]. La reparación es [fix].' Build code explanation.",
        7,
      ),
      sp(
        "Explain: 'El código P0300 indica falla de encendido aleatoria. Probablemente son las bujías. Le costará [amount].'",
        6,
      ),
    ],
  },
  {
    n: 6,
    title: "AC System Service",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Diagnose AC problems and explain the service",
    steps: [
      r("Read the mechanic passage. Focus on AC vocabulary.", 6),
      wm(
        "Drill: aire acondicionado, refrigerante, compresor, condensador, evaporador, fuga, recarga. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Su aire no enfría porque tiene poca carga de refrigerante. Revisamos si hay fuga y recargamos el sistema.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Transmission Issues",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain transmission problems and service options",
    steps: [
      r("Read the mechanic passage. Focus on transmission vocabulary.", 7),
      wm(
        "Drill: transmisión, automática, manual, fluido, cambio, resbalamiento, código, filtro. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Su transmisión está resbalando en la tercera velocidad. Revisé el fluido — está quemado. Necesita cambio de fluido y filtro primero.'",
        8,
      ),
    ],
  },
  {
    n: 8,
    title: "Electrical Diagnosis",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Diagnose and explain an electrical problem",
    steps: [
      r("Read the mechanic passage. Focus on electrical diagnostic vocabulary.", 6),
      wm(
        "Drill: batería, alternador, arrancador, fusible, relé, circuito, voltaje, amperaje. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Su batería tiene 3 años y no carga bien. Probé el alternador — está bien. La batería necesita cambio.'",
        9,
      ),
    ],
  },
  {
    n: 9,
    title: "Alignment & Suspension",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain alignment, steering, and suspension problems",
    steps: [
      r("Read the mechanic passage. Focus on suspension vocabulary.", 7),
      pt(
        "Pattern: 'La alineación está [off/correct]. El [component] tiene desgaste. El carro jala a la [direction] porque [reason].' Build suspension report.",
        7,
      ),
      sp(
        "Report: 'La alineación está 2 grados fuera en el frente. Las rótulas también están desgastadas. Necesita ambas reparaciones.'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Pre-Purchase Inspection",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Present a pre-purchase vehicle inspection report",
    steps: [
      r("Read the mechanic passage. Focus on inspection vocabulary.", 7),
      ds(
        "Role-play: customer wants to buy a used car but your inspection found 4 major issues. Present honestly.",
        9,
      ),
      sp(
        "Report: 'Encontré 4 problemas: frenos desgastados, fuga de aceite, llantas gastadas, y un código de motor. Le recomiendo negociar el precio.'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "Timing Belt & Major Service",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain a major service (timing belt, spark plugs, coolant flush)",
    steps: [
      r("Read the mechanic passage. Focus on major service vocabulary.", 7),
      wm(
        "Drill: banda de tiempo, bujías, refrigerante, tensionador, polea, intervalo, cataclismo. 7/7.",
        5,
      ),
      sp(
        "Explain: 'A los 100,000 km, recomendamos cambiar la banda de tiempo. Si se rompe en marcha, el motor se destruye — es crítica.'",
        8,
      ),
    ],
  },
  {
    n: 12,
    title: "Exhaust System",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain exhaust problems and emissions failure",
    steps: [
      r("Read the mechanic passage. Focus on exhaust vocabulary.", 6),
      wm(
        "Drill: escape, catalizador, silenciador, sonda, oxígeno, emisiones, inspección, ruido. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Su carro falló la inspección de emisiones. El catalizador está dañado. Sin él, su carro no pasa y contamina más.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Coolant & Overheating",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Diagnose overheating and explain the cooling system",
    steps: [
      r("Read the mechanic passage. Focus on cooling system vocabulary.", 7),
      pt(
        "Pattern: 'El motor se calienta porque [cause]. La reparación es [fix]. Sin repararla, el motor puede sufrir [damage].' Build cooling diagnosis.",
        7,
      ),
      sp(
        "Explain urgency: 'El carro se calienta porque la bomba de agua está fallando. Si sigue manejando así, puede fundir el motor.'",
        6,
      ),
    ],
  },
  {
    n: 14,
    title: "Customer Complaint Handling",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Handle a customer complaint about prior work",
    steps: [
      r("Read the mechanic passage. Focus on customer service vocabulary.", 6),
      ds(
        "Role-play: customer says the brake noise returned 3 weeks after your repair. Handle professionally.",
        9,
      ),
      sp(
        "Respond: 'Lo siento mucho. Tráigalo hoy sin costo y lo reviso. Mi trabajo tiene garantía de 30 días.'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Explaining the Repair Order",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Walk a customer through a repair order line by line",
    steps: [
      r("Read the mechanic passage. Focus on repair order vocabulary.", 6),
      pt(
        "Pattern: 'Esta línea es para [part]. Costó [price]. Instalé [quantity]. La mano de obra es [hours × rate].' Build repair order walkthrough.",
        7,
      ),
      sp(
        "Explain the invoice: parts, labor, taxes, and warranty — clearly and in plain language.",
        7,
      ),
    ],
  },
  {
    n: 16,
    title: "Fleet Maintenance Communication",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Communicate fleet maintenance reports to a fleet manager",
    steps: [
      r("Read the mechanic passage. Focus on fleet vocabulary.", 7),
      wm(
        "Drill: flota, programa, mantenimiento preventivo, intervalo, kilómetros, registro, estatus. 7/7.",
        5,
      ),
      sp(
        "Report to fleet manager: 'Esta semana revisé 8 camiones. 6 pasaron. 2 necesitan frenos urgente. Aquí el reporte completo.'",
        8,
      ),
    ],
  },
  {
    n: 17,
    title: "Safety Inspection Communication",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Complete a vehicle safety inspection and report findings",
    steps: [
      r("Read the mechanic passage. Focus on safety inspection vocabulary.", 6),
      sb(
        "Build a safety inspection report: lights, brakes, tires, wipers, steering, belts, fluids.",
        5,
      ),
      sp(
        "Report: 'La inspección de seguridad pasó en todo menos las llantas delanteras y la luz trasera derecha. ¿Las reparamos hoy?'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Hybrid & EV Service",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain hybrid and EV-specific service requirements",
    steps: [
      r("Read the mechanic passage. Focus on hybrid vocabulary.", 7),
      wm(
        "Drill: híbrido, eléctrico, batería de alto voltaje, regenerativa, inversor, KWh, distancia. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Los híbridos tienen un sistema de 12V para arrancar y uno de alto voltaje para el motor. Son sistemas separados.'",
        8,
      ),
    ],
  },
  {
    n: 19,
    title: "Parts Ordering Communication",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Order parts and communicate delays to a customer",
    steps: [
      r("Read the mechanic passage. Focus on parts ordering vocabulary.", 6),
      pt(
        "Pattern: 'Necesito la pieza [part number] para [year/make/model]. ¿La tienen? ¿Cuándo llega? El cliente está esperando.' Build parts call.",
        7,
      ),
      sp(
        "Tell customer: 'La parte no está en inventario. La pedí — llega el jueves. ¿Puede dejar el carro o prefiere que lo llamemos?'",
        7,
      ),
    ],
  },
  {
    n: 20,
    title: "Warranty Claims",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Process a warranty claim for a customer",
    steps: [
      r("Read the mechanic passage. Find warranty vocabulary.", 6),
      wm(
        "Drill: garantía, fabricante, concesionario, reclamación, defecto, cobertura, deducible. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Este problema está bajo la garantía del fabricante. No le cuesta nada — yo proceso la reclamación por usted.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Seasonal Maintenance",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Recommend seasonal maintenance services",
    steps: [
      r("Read the mechanic passage. Focus on seasonal vocabulary.", 6),
      ds(
        "Role-play: recommend a winter preparation package to a customer with an older vehicle.",
        9,
      ),
      sp(
        "Recommend: 'Para el invierno, le recomiendo revisar la batería, el refrigerante, los limpiaparabrisas, y las llantas.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Training an Apprentice",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Train a new mechanic apprentice in the shop",
    steps: [
      r("Read the mechanic passage. Focus on training vocabulary.", 6),
      pt(
        "Pattern: 'Primero observa cómo hago [task]. Luego tú lo haces con mi supervisión. Recuerda: [safety rule] siempre.' Build apprentice training.",
        7,
      ),
      sp(
        "Train: 'Cuando cambies frenos, siempre ponle el freno de mano antes de levantar el carro. Seguridad primero, velocidad después.'",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Road Test Communication",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Communicate road test findings before and after a repair",
    steps: [
      r("Read the mechanic passage. Focus on road test vocabulary.", 6),
      wm(
        "Drill: prueba de manejo, vibración, ruido, aceleración, frenado, dirección, corrección. 7/7.",
        5,
      ),
      sp(
        "Report: 'Manejé el carro antes y después. Antes había vibración a 60 mph. Después del balanceo, el carro va perfectamente liso.'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "Diesel Engine Basics",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain diesel-specific maintenance to a customer",
    steps: [
      r("Read the mechanic passage. Focus on diesel vocabulary.", 6),
      wm(
        "Drill: diésel, inyector, glow plug, DPF, DEF, turbo, filtro de partículas, regeneración. 8/8.",
        5,
      ),
      sp(
        "Explain DPF: 'El filtro de partículas de su camión necesita regeneración. Si lo ignora, puede taparse y dañar el motor.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Insurance Estimate & Collision Repair",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Write and explain a collision repair estimate",
    steps: [
      r("Read the mechanic passage. Focus on collision vocabulary.", 6),
      ds(
        "Role-play: customer brought a car after a rear-end collision. Write an estimate and explain to the adjuster.",
        9,
      ),
      sp(
        "Explain: 'El impacto dañó el parachoques, el marco y la cámara de retroceso. El estimado total es [amount].'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Customer Education — Maintenance Schedule",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Educate a customer on their vehicle's maintenance schedule",
    steps: [
      r("Read the mechanic passage. Focus on maintenance schedule vocabulary.", 6),
      sb(
        "Build a maintenance schedule: oil every 5k, tires every 6k, timing belt every 100k, brakes as needed.",
        5,
      ),
      sp(
        "Educate: 'Le hice un calendario de mantenimiento para su carro. Cada 5,000 km: aceite. Cada 15,000: llantas. A los 100,000: banda de tiempo.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Explaining a Deferred Repair",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Explain what happens if a repair is deferred and how to prioritize",
    steps: [
      r("Read the mechanic passage. Find deferral vocabulary.", 6),
      pt(
        "Pattern: 'Esta reparación es [urgent/can wait]. Si espera, el riesgo es [consequence]. Si lo hace ahora, previene [damage].' Build priority matrix.",
        7,
      ),
      sp(
        "Prioritize: 'Los frenos son urgentes — seguridad. El ruido del motor puede esperar un mes. La fuga de aceite es importante pero no crítica.'",
        7,
      ),
    ],
  },
  {
    n: 28,
    title: "Shop Floor Management",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Direct the shop floor and assign work orders in the target language",
    steps: [
      r("Read the mechanic passage. Focus on shop management vocabulary.", 7),
      pt(
        "Pattern: 'Juan: toma el Ford de las 9. Pedro: termina los frenos del Toyota. María: diagnóstico del Honda. Prioridad en ese orden.' Build job assignments.",
        7,
      ),
      sp(
        "Assign the day: 'Tenemos 6 órdenes de trabajo. Las más urgentes son el Honda de las 8 y el freno del camión de las 10.'",
        6,
      ),
    ],
  },
  {
    n: 29,
    title: "State Emissions & Inspection",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective: "Communicate state inspection results and required repairs",
    steps: [
      r("Read the mechanic passage as an inspection scenario prep.", 7),
      ds(
        "Role-play: vehicle failed state inspection for 3 items. Explain each to the customer and get approval for repairs.",
        9,
      ),
      sp(
        "Report: 'Su carro falló la inspección por: frenos traseros, luce de stop derecha, y un código de emisiones. ¿Autoriza los tres?'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Service Appointment",
    readingTemplate: "seed-{lang}-mechanic-brake",
    objective:
      "Complete a full service appointment — check-in to invoice — without switching languages",
    steps: [
      r("Read the mechanic passage as your pre-shift prep.", 5),
      ds(
        "AI-assisted full appointment: check-in → diagnosis → estimate → approval → repair → test → invoice. Target language only.",
        12,
      ),
      sp(
        "Close out: 'Todo está listo. Cambié [parts], revisé [systems], probé en el camino. El total es [amount]. Garantía de 30 días.'",
        3,
      ),
    ],
  },
];

// ─── TRUCK DRIVER ─────────────────────────────────────────────────────────────

const TRUCK_DRIVER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Dispatch Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Receive and confirm a dispatch order",
    steps: [
      r("Read the logbook passage. Focus on dispatch vocabulary.", 7),
      wm("Drill: despacho, carga, entrega, ruta, destino, hora, millas, confirmación. 8/8.", 5),
      sp(
        "Confirm dispatch: 'Recibido. Pickup en [location] a las [time]. Entrega en [destination] para las [time]. Confirmo.'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "Pre-Trip Inspection",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Complete a pre-trip inspection and report findings",
    steps: [
      r("Read the logbook passage. Focus on inspection vocabulary.", 7),
      pt(
        "Pattern: 'Revisé [component]. Estado: [ok/problem]. [Action taken if needed].' Build pre-trip report for 8 items.",
        7,
      ),
      sp(
        "Report: 'Inspección completa. Frenos bien, luces bien, llantas bien. Encontré un faro trasero flojo — lo apretné. Listo para salir.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Hours of Service & Logbook",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Understand HOS regulations and complete a logbook entry",
    steps: [
      r("Read the logbook passage fully. This is your core scenario.", 8),
      wm(
        "Drill: horas de servicio, libro de registro, ciclo, descanso, conducción, FMCSA, violación. 7/7.",
        5,
      ),
      sp(
        "Explain your log: 'Conduje 8 horas. Paré 30 minutos. Me quedan 3 horas de conducción. Necesito un descanso de 10 horas esta noche.'",
        7,
      ),
    ],
  },
  {
    n: 4,
    title: "Weigh Station Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate at a weigh station",
    steps: [
      r("Read the logbook passage. Focus on weigh station vocabulary.", 6),
      wm(
        "Drill: báscula, peso bruto, peso neto, licencia, documentos, tara, ejes, exceso. 8/8.",
        5,
      ),
      sp(
        "Respond to officer: 'Aquí mi licencia, registro, y seguro. La carga pesa [X] toneladas. Voy a [destination] con [cargo].'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Cargo Securement",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate about cargo securement requirements",
    steps: [
      r("Read the logbook passage. Focus on securement vocabulary.", 6),
      wm(
        "Drill: amarre, cadena, correa, puntales, carga, distribución, distribución, tarima. 8/8.",
        5,
      ),
      sp(
        "Report: 'La carga está asegurada con 4 correas de 4 toneladas cada una. Distribución pareja. Conforme a las normas DOT.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "DOT Roadside Inspection",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate professionally during a roadside DOT inspection",
    steps: [
      r("Read the logbook passage. Focus on DOT vocabulary.", 7),
      ds(
        "Role-play: DOT officer finds a minor log violation. Respond professionally and cooperatively.",
        9,
      ),
      sp(
        "Respond: 'Tiene razón sobre el error en el registro. Fue un error al ingresar los datos. ¿Puedo corregirlo ahora?'",
        4,
      ),
    ],
  },
  {
    n: 7,
    title: "Fuel & Trip Planning",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Plan fuel stops and communicate fuel needs",
    steps: [
      r("Read the logbook passage. Focus on route planning vocabulary.", 6),
      wm(
        "Drill: diésel, galones, millas por galón, parada, ruta, tiempo, economía, reserva. 8/8.",
        5,
      ),
      sp(
        "Plan: 'El camión tiene [X] galones. Recorro [X] millas por galón. Necesito parar en [location] antes de quedarme sin combustible.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Delivery Documentation",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Complete and explain delivery documentation",
    steps: [
      r("Read the logbook passage. Focus on delivery vocabulary.", 6),
      wm("Drill: carta de porte, recibo, firma, rechazo, daño, diferencia, hora, sellado. 8/8.", 5),
      sp(
        "At delivery: 'Aquí está la carga. ¿Puede firmar el recibo y marcar si hay daño visible? Necesito la copia rosada.'",
        9,
      ),
    ],
  },
  {
    n: 9,
    title: "Receiving Loading Instructions",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Receive and confirm loading dock instructions",
    steps: [
      r("Read the logbook passage. Focus on loading dock vocabulary.", 6),
      pt(
        "Pattern: '¿En qué muelle debo cargar? ¿Necesito pedir turno? ¿Hay restricción de altura? ¿A qué hora cierran?' Build dock check-in.",
        7,
      ),
      sp(
        "Check in: 'Vengo a cargar para [destination]. El número de orden es [number]. ¿En qué muelle me debo posicionar?'",
        7,
      ),
    ],
  },
  {
    n: 10,
    title: "Hazardous Materials Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate hazmat placarding and documentation requirements",
    steps: [
      r("Read the logbook passage. Focus on hazmat vocabulary.", 7),
      wm(
        "Drill: hazmat, placa, ficha de datos, clase, número ONU, emergencia, segregación. 7/7.",
        5,
      ),
      sp(
        "Report: 'Llevo clase 3 — líquidos inflamables. Las placas están en los 4 lados. La documentación está en la guantera.'",
        8,
      ),
    ],
  },
  {
    n: 11,
    title: "Breakdown Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Report a breakdown and coordinate roadside assistance",
    steps: [
      r("Read the logbook passage. Focus on breakdown vocabulary.", 6),
      pt(
        "Pattern: 'Estoy varado en [location] en la milla [#]. El problema es [failure]. Necesito [service]. ¿Cuánto tiempo tardan?' Build breakdown call.",
        8,
      ),
      sp(
        "Call dispatch: 'Tuve una falla — llanta pinchada en la I-40, milla 223 oeste. Necesito servicio de llantas. ¿Pueden coordinar?'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Customer Complaint at Delivery",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Handle a damaged goods complaint at delivery professionally",
    steps: [
      r("Read the logbook passage. Focus on damage complaint vocabulary.", 6),
      ds(
        "Role-play: consignee says 3 pallets are damaged on arrival. Handle the documentation and communication.",
        9,
      ),
      sp(
        "Handle: 'Anoto el daño en el recibo. Por favor también firme el recibo de daño. Repórtelo a su compañía de seguro y al despachador.'",
        5,
      ),
    ],
  },
  {
    n: 13,
    title: "Weather & Road Conditions",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Report road and weather conditions to dispatch",
    steps: [
      r("Read the logbook passage. Focus on road condition vocabulary.", 6),
      wm(
        "Drill: hielo, nieve, neblina, viento, reducción, detour, cierre, velocidad máxima. 8/8.",
        5,
      ),
      sp(
        "Report: 'Despacho — hay neblina densa en la I-80 entre los postes 150-180. Reducí velocidad a 45 mph. Notifico retraso de 1 hora.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Truck Stop Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate effectively at a truck stop",
    steps: [
      r("Read the logbook passage. Focus on truck stop vocabulary.", 6),
      wm(
        "Drill: parada de camiones, lavado, ducha, estacionamiento, báscula, reservar, shower credits. 7/7.",
        5,
      ),
      sp(
        "Ask at the counter: 'Vengo a cargar diésel y necesito una ducha. ¿Tienen estacionamiento para esta noche?'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Electronic Logging Device (ELD)",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Operate an ELD and explain violations to a supervisor",
    steps: [
      r("Read the logbook passage. Focus on ELD vocabulary.", 7),
      wm(
        "Drill: ELD, registro electrónico, ciclo, violación, evento, certificar, edición, transferencia. 8/8.",
        5,
      ),
      sp(
        "Explain: 'El ELD registra automáticamente los tiempos de conducción. No se puede editar una violación — solo se anota una explicación.'",
        8,
      ),
    ],
  },
  {
    n: 16,
    title: "Border Crossing Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate at a US-Mexico border crossing",
    steps: [
      r("Read the logbook passage. Focus on border crossing vocabulary.", 7),
      wm(
        "Drill: aduana, manifiesto, factura, FAST card, CBP, declaración, inspección, permiso. 8/8.",
        5,
      ),
      sp(
        "At the border: 'Aquí mi documentación: factura comercial, carta de porte, y permiso de la empresa. Llevo [commodity].'",
        8,
      ),
    ],
  },
  {
    n: 17,
    title: "Load Planning Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate load weight distribution with a loader",
    steps: [
      r("Read the logbook passage. Focus on load planning vocabulary.", 7),
      pt(
        "Pattern: 'El límite de los ejes delanteros es [X] lbs. Los traseros [X] lbs. Distribuye la carga [way] para quedarnos dentro.' Build load plan.",
        7,
      ),
      sp(
        "Direct the loader: 'La carga pesada va al frente del remolque. Las cajas ligeras atrás. Necesitamos peso parejo en los dos ejes traseros.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Night Driving Safety",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate night driving safety practices",
    steps: [
      r("Read the logbook passage. Focus on night driving vocabulary.", 6),
      wm(
        "Drill: nocturno, fatiga, luces altas, reflectores, reducir velocidad, descanso, cafeína, señales. 8/8.",
        5,
      ),
      sp(
        "Brief yourself or a co-driver: 'Conducción nocturna — luces revisadas, café tomado, ventana abierta. Paro cada 2 horas para estirarme.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Backing & Dock Procedures",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate while backing into a dock",
    steps: [
      r("Read the logbook passage. Focus on maneuvering vocabulary.", 6),
      pt(
        "Pattern: 'Voy a entrar en reversa al muelle [#]. Guíame por radio: ¿Tengo espacio a la derecha? ¿Cuánto a la izquierda?' Build backing communication.",
        7,
      ),
      sp(
        "Radio your spotter: 'Entrando en reversa. Dame distancias. Para, para, para — basta. ¿Quedé derecho?' ",
        7,
      ),
    ],
  },
  {
    n: 20,
    title: "Company Policy Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate company policies to a new driver",
    steps: [
      r("Read the logbook passage. Focus on company policy vocabulary.", 6),
      ds(
        "Role-play: explain the company's drug testing, phone, and speed policy to a new driver.",
        9,
      ),
      sp(
        "Explain: 'La empresa tiene tolerancia cero para el uso del teléfono al manejar. También prueba de drogas aleatoria mensual.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Refrigerated Load Management",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate refrigerated load requirements",
    steps: [
      r("Read the logbook passage. Focus on refrigerated load vocabulary.", 7),
      wm(
        "Drill: refrigerado, temperatura, termógrafo, modo continuo, pre-frío, setpoint, descongelación. 7/7.",
        5,
      ),
      sp(
        "Set up: 'La carga requiere -18 grados. El reefer está pre-frío. El termógrafo está corriendo. Confirmo temperatura antes de salir.'",
        8,
      ),
    ],
  },
  {
    n: 22,
    title: "Oversized Load Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate oversized/overweight load regulations",
    steps: [
      r("Read the logbook passage. Focus on oversized load vocabulary.", 6),
      wm(
        "Drill: carga sobredimensionada, permiso, escolta, piloto, ancho, altura, ruta aprobada. 7/7.",
        5,
      ),
      sp(
        "Coordinate: 'La carga tiene 14 pies de ancho. El permiso requiere dos vehículos escolta y solo viajamos de día.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Accident Reporting",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Report a minor accident to dispatch and law enforcement",
    steps: [
      r("Read the logbook passage. Focus on accident vocabulary.", 6),
      pt(
        "Pattern: 'Tuve un accidente en [location]. Hora: [time]. Involucrado: [other party]. Daños: [description]. Lesiones: [none/present]. Llamé a: [authorities].' Build accident report.",
        8,
      ),
      sp(
        "Call dispatch: 'Accidente menor en la Ruta 66 milla 50. Sin heridos. Daño a parachoques. Policía en camino. Esperando instrucciones.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Fuel Tax & IFTA",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Understand and communicate IFTA fuel reporting",
    steps: [
      r("Read the logbook passage. Focus on IFTA vocabulary.", 6),
      wm(
        "Drill: IFTA, millas por estado, galones, reporte trimestral, decal, auditoría, reembolso. 7/7.",
        5,
      ),
      sp(
        "Explain IFTA to a new driver: 'El IFTA reporta las millas y el combustible por estado. Guarda todos los recibos de combustible.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Team Driver Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Coordinate with a co-driver on a team driving assignment",
    steps: [
      r("Read the logbook passage. Focus on team driving vocabulary.", 7),
      ds(
        "Role-play: coordinate a hand-off with a co-driver — logs, route, load status, and special notes.",
        9,
      ),
      sp(
        "Hand off: 'Te toca manejar. La carga es frágil — maneja suave. La entrega es a las 6 AM. Aquí el log transferido.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Drug & Alcohol Testing Language",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Understand and communicate drug testing procedures",
    steps: [
      r("Read the logbook passage. Focus on drug testing vocabulary.", 6),
      wm(
        "Drill: prueba de drogas, aleatoria, razonable sospecha, post-accidente, dilución, cadena de custodia. 6/6.",
        5,
      ),
      sp(
        "Explain: 'Toda la industria requiere prueba pre-empleo. También hay pruebas aleatorias. Un positivo significa out-of-service inmediato.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Carrier Communication",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Communicate status updates to your carrier throughout a run",
    steps: [
      r("Read the logbook passage. Focus on carrier communication vocabulary.", 7),
      pt(
        "Pattern: 'Actualización: Pasé [checkpoint] a las [time]. ETA en destino: [time]. Novedad: [issue if any].' Build 3 status updates.",
        7,
      ),
      sp(
        "Update carrier: 'Pasé Oklahoma City a las 2 PM. Sin novedades. ETA en Dallas 5 PM. Carga intacta.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "CSA Score Awareness",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Explain CSA scores and their impact on career",
    steps: [
      r("Read the logbook passage. Focus on CSA vocabulary.", 6),
      wm(
        "Drill: CSA, puntuación, violación, categoría, umbral, historial, impacto, mejora. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Las violaciones del DOT afectan tu puntaje CSA. Un puntaje alto puede causarte más inspecciones o problemas para conseguir trabajo.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Delivery Scenario",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective: "Handle a complex delivery with access issues and consignee disputes",
    steps: [
      r("Read the logbook passage as a complex scenario prep.", 7),
      ds(
        "Role-play: arrive at delivery, dock is closed, consignee disputes the count. Handle the full situation.",
        10,
      ),
      sp(
        "Report: 'El muelle estaba cerrado. El consignatario firmó con 2 paletas de diferencia. Anoté en el recibo y llamé a despacho.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Long-Haul Run",
    readingTemplate: "seed-{lang}-truck-logbook",
    objective:
      "Communicate through an entire long-haul run — dispatch to delivery — without switching languages",
    steps: [
      r("Read the logbook passage as your pre-trip review.", 5),
      ds(
        "AI-assisted full run: dispatch → pre-trip → driving updates → weigh station → delivery → log close. Target language only.",
        12,
      ),
      sp(
        "Close the run: 'Entrega completa. Firmaron recibo. Log cerrado con [X] horas de conducción. Me dirijo al terminal.'",
        3,
      ),
    ],
  },
];

// ─── CONSTRUCTION SAFETY ────────────────────────────────────────────────────

const CONST_SAFETY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Daily Safety Briefing (Toolbox Talk)",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Run a 5-minute daily safety meeting for your crew",
    steps: [
      r("Read the construction passage. Focus on safety vocabulary.", 7),
      wm("Drill: seguridad, EPP, peligro, riesgo, accidente, reporte, zona, control. 8/8.", 5),
      sp(
        "Brief: 'Buenos días. El peligro de hoy es [hazard]. Para estar seguros, todos deben [PPE + action]. ¿Preguntas antes de empezar?'",
        8,
      ),
    ],
  },
  {
    n: 2,
    title: "PPE Requirements",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain and enforce PPE requirements on site",
    steps: [
      r("Read the construction passage. Focus on PPE vocabulary.", 7),
      pt(
        "Pattern: 'En esta área, se requiere [PPE list]. Si no lo trae, [consequence]. El EPP está en [location].' Build PPE briefing.",
        7,
      ),
      sp(
        "Enforce PPE: 'En esta zona de excavación: casco, chaleco, botas de punta de acero, y protección visual. Sin excepción.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Hazard Identification Walk-Through",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Lead a site hazard identification walk and document findings",
    steps: [
      r("Read the construction passage. Focus on hazard identification vocabulary.", 7),
      wm(
        "Drill: caída, tropiezo, energía peligrosa, excavación, quemadura, corte, colapso, exposición. 8/8.",
        5,
      ),
      sp(
        "Lead walk: 'En esta área veo 3 peligros: el borde sin baranda, cables en el piso, y polvo de sílice. Los anotamos y corregimos hoy.'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Fall Protection Communication",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain fall protection requirements at heights",
    steps: [
      r("Read the construction passage. Focus on fall protection vocabulary.", 6),
      wm(
        "Drill: protección contra caídas, arnés, línea de vida, baranda, escalera, cubierta, 6 pies. 7/7.",
        5,
      ),
      sp(
        "Brief: 'Todo trabajo a más de 6 pies requiere protección contra caídas — arnés, baranda, o cubierta de abertura.'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Scaffolding Safety",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Inspect scaffolding and communicate safety requirements",
    steps: [
      r("Read the construction passage. Focus on scaffolding vocabulary.", 7),
      pt(
        "Pattern: 'El andamio fue inspeccionado por [inspector] el [date]. Estado: [ok/issues]. Los trabajadores deben [requirements].' Build scaffold inspection report.",
        7,
      ),
      sp(
        "Brief crew: 'Este andamio fue inspeccionado esta mañana. No lo muevan. La capacidad máxima es [X] lbs. Usen las escaleras de acceso.'",
        6,
      ),
    ],
  },
  {
    n: 6,
    title: "Excavation & Trenching Safety",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate excavation safety requirements and slope requirements",
    steps: [
      r("Read the construction passage. Focus on excavation vocabulary.", 6),
      wm(
        "Drill: excavación, zanja, talud, entibación, protección, derrumbe, clasificación de suelo, 5 pies. 8/8.",
        5,
      ),
      sp(
        "Brief: 'Toda zanja de más de 5 pies requiere protección — talud, entibado, o caja de protección. Nadie entra sin verificar.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Lockout/Tagout Procedure",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain and enforce lockout/tagout procedures",
    steps: [
      r("Read the construction passage. Focus on LOTO vocabulary.", 6),
      wm(
        "Drill: bloqueo, etiqueta, energía peligrosa, aislamiento, fuente, candado, verificación. 7/7.",
        5,
      ),
      sp(
        "Explain LOTO: 'Antes de trabajar en equipo eléctrico, apaguen la fuente, pongan el candado, y verifiquen que está sin energía.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Emergency Action Plan",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Brief workers on the emergency action plan and evacuation",
    steps: [
      r("Read the construction passage. Focus on emergency vocabulary.", 7),
      pt(
        "Pattern: 'En caso de [emergency type], el punto de reunión es [location]. El responsable es [person]. Llamen al [number].' Build EAP for 3 scenarios.",
        7,
      ),
      sp(
        "Brief: 'En caso de emergencia: todos se reúnen en el estacionamiento norte. El jefe de seguridad es Carlos. El 911 está en el número de la obra.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Accident Investigation & Reporting",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Investigate an accident and communicate findings",
    steps: [
      r("Read the construction passage. Focus on incident vocabulary.", 6),
      wm(
        "Drill: accidente, investigación, causa raíz, testigo, reporte, OSHA, 300 log, primera ayuda. 8/8.",
        5,
      ),
      sp(
        "Report: '¿Qué pasó exactamente? ¿Hubo testigos? ¿Qué condición causó el accidente? Necesito el reporte en 24 horas.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Heat Illness Prevention",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate heat illness prevention protocols",
    steps: [
      r("Read the construction passage. Focus on heat safety vocabulary.", 6),
      wm(
        "Drill: calor, hidratación, sombra, descanso, síntoma, agotamiento, golpe de calor, emergencia. 8/8.",
        5,
      ),
      sp(
        "Brief: 'Temperatura de más de 95°F hoy. Agua disponible en el cooler. Descanso de 10 minutos cada hora. Si alguien se siente mal, repórtelo.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Silica Dust Control",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain silica exposure risks and control methods",
    steps: [
      r("Read the construction passage. Focus on silica vocabulary.", 6),
      wm(
        "Drill: sílice, polvo, respirador, N95, control de ingeniería, monitoreo, OSHA 100. 7/7.",
        5,
      ),
      sp(
        "Explain: 'Cortar concreto o ladrillo produce polvo de sílice que daña los pulmones permanentemente. Usa agua o ventilación y el respirador.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Electrical Safety on Site",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate electrical safety requirements during construction",
    steps: [
      r("Read the construction passage. Focus on electrical safety vocabulary.", 7),
      wm(
        "Drill: GFCI, cable dañado, distancia, línea energizada, capacitación, bloqueo, tierra. 7/7.",
        5,
      ),
      sp(
        "Brief: 'Todos los cables en el exterior o condiciones mojadas necesitan protección GFCI. Reporta cualquier cable dañado inmediatamente.'",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Chemical & Hazmat Communication",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain hazard communication (HazCom) and SDS requirements",
    steps: [
      r("Read the construction passage. Focus on HazCom vocabulary.", 6),
      wm(
        "Drill: GHS, SDS, etiqueta, peligro, EPP requerido, primeros auxilios, almacenamiento, disposición. 8/8.",
        5,
      ),
      sp(
        "Explain: 'Antes de usar cualquier químico, lea la hoja SDS. Le indica los peligros, el EPP necesario, y qué hacer en caso de exposición.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Crane & Rigging Safety",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate crane lift safety requirements",
    steps: [
      r("Read the construction passage. Focus on crane vocabulary.", 7),
      wm(
        "Drill: grúa, rigger, señalero, capacidad, zona de exclusión, viento, certificación, plan de izaje. 8/8.",
        5,
      ),
      sp(
        "Brief the lift: 'Zona de exclusión de 30 pies alrededor de la grúa. Solo el rigger certificado conecta las eslingas. Todos afuera.'",
        8,
      ),
    ],
  },
  {
    n: 15,
    title: "Confined Space Entry",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate confined space entry permit requirements",
    steps: [
      r("Read the construction passage. Focus on confined space vocabulary.", 7),
      pt(
        "Pattern: 'Espacio confinado requiere: prueba de atmosfera, persona de rescate afuera, permiso firmado, y comunicación constante.' Build confined space protocol.",
        7,
      ),
      sp(
        "Require: 'Antes de entrar a ese tanque, necesitan: prueba de atmósfera, rescatador afuera, y el permiso de entrada firmado por mí.'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "OSHA Rights & Responsibilities",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain OSHA rights to workers in the target language",
    steps: [
      r("Read the construction passage. Focus on OSHA vocabulary.", 6),
      wm(
        "Drill: OSHA, derecho, inspección, represalia, reporte, queja, publicar, capacitación. 8/8.",
        5,
      ),
      sp(
        "Explain rights: 'Tiene derecho a un lugar de trabajo seguro, a reportar peligros a OSHA, y a no sufrir represalias por hacerlo.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "First Aid Response",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Respond to a minor job site injury and communicate with the crew",
    steps: [
      r("Read the construction passage. Focus on first aid vocabulary.", 6),
      pt(
        "Pattern: '[Worker] se lastimó [body part]. Apliqué [first aid]. Fue a [clinic/ER]. Notifiqué a [supervisor]. Reporte lista.' Build first aid response.",
        7,
      ),
      sp(
        "Respond to a cut: 'Para el sangrado. Limpia la herida. Aplica vendaje. Si es profundo, necesita puntos — vamos a la clínica.'",
        7,
      ),
    ],
  },
  {
    n: 18,
    title: "Respirable Dust & Asbestos",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate asbestos hazard procedures during demolition",
    steps: [
      r("Read the construction passage. Focus on asbestos vocabulary.", 6),
      wm(
        "Drill: asbesto, demolición, muestra, abatement, contención, EPP nivel, certificado, disposición. 8/8.",
        5,
      ),
      sp(
        "Stop work: 'Encontramos material sospechoso de asbesto. Paramos el trabajo aquí. Necesitamos una prueba antes de continuar.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Traffic & Site Access Control",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate traffic control and site access requirements",
    steps: [
      r("Read the construction passage. Focus on access control vocabulary.", 6),
      wm(
        "Drill: control de tráfico, cono, barricada, flagman, entrada, visitante, orientación, señal. 8/8.",
        5,
      ),
      sp(
        "Brief the flagman: 'Tu posición es aquí. Cuando viene un camión de carga, para el tráfico de la avenida. Radio si hay problema.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Safety Incident Near-Miss Reporting",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Encourage and document near-miss safety reporting",
    steps: [
      r("Read the construction passage. Focus on near-miss vocabulary.", 6),
      ds(
        "Role-play: worker reports a near-miss where a tool almost fell on a coworker. Document and respond supportively.",
        9,
      ),
      sp(
        "Respond: 'Gracias por reportarlo. Los casi-accidentes son tan importantes como los accidentes. Vamos a corregir la situación hoy.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Ladder Safety",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Brief crew on proper ladder selection and use",
    steps: [
      r("Read the construction passage. Focus on ladder vocabulary.", 6),
      wm(
        "Drill: escalera, 3 puntos, extensión, posición, ángulo, capacidad, tipo, acceso. 8/8.",
        5,
      ),
      sp(
        "Brief: 'Recuerden: tres puntos de contacto siempre. No sobrepase el peldaño de trabajo. Verifiquen la capacidad antes de subir.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Fire Prevention on Site",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate fire prevention and hot work permit requirements",
    steps: [
      r("Read the construction passage. Focus on fire prevention vocabulary.", 6),
      wm(
        "Drill: permiso de trabajo en caliente, extintor, guardia de fuego, 35 pies, soldadura, manta, inspección. 7/7.",
        5,
      ),
      sp(
        "Require a hot work permit: 'Antes de soldar, necesitan el permiso firmado, un extintor a 5 pies, y un guardia de fuego por 30 minutos después.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Drug-Free Workplace",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Communicate a drug-free workplace policy to your crew",
    steps: [
      r("Read the construction passage. Focus on drug-free policy vocabulary.", 6),
      pt(
        "Pattern: 'Esta empresa tiene tolerancia cero para sustancias. Hay prueba aleatoria, post-accidente, y por sospecha razonable.' Build policy briefing.",
        7,
      ),
      sp(
        "Brief: 'Si alguien huele a alcohol o actúa raro, tengo la obligación de ordenar una prueba inmediata. La seguridad de todos depende de esto.'",
        7,
      ),
    ],
  },
  {
    n: 24,
    title: "Cold Weather Safety",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Brief the crew on cold weather work hazards",
    steps: [
      r("Read the construction passage. Focus on cold weather vocabulary.", 6),
      wm(
        "Drill: hipotermia, viento helado, capas, pausas de calentamiento, frostbite, síntoma, temperatura mínima. 7/7.",
        5,
      ),
      sp(
        "Brief: 'Bajo 20°F, descanso de calentamiento cada 2 horas. Ropa en capas. Si alguien tiembla mucho o está confundido, es emergencia.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Subcontractor Safety Orientation",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Conduct a safety orientation for new subcontractors",
    steps: [
      r("Read the construction passage. Focus on orientation vocabulary.", 7),
      pt(
        "Pattern: 'Bienvenidos al proyecto. Las reglas del sitio son: [rule 1], [rule 2], [rule 3]. El número de emergencia es [number]. Firmen aquí.' Build orientation.",
        7,
      ),
      sp(
        "Orient: 'Antes de empezar, necesitan ver el video de seguridad de 10 minutos y firmar que entendieron las reglas del sitio.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Site Security & Badge Access",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Explain site security procedures and badge access",
    steps: [
      r("Read the construction passage. Focus on security vocabulary.", 6),
      wm(
        "Drill: tarjeta de acceso, seguridad, fotografía, identificación, visitante, registro, entrada, zona restringida. 8/8.",
        5,
      ),
      sp(
        "Explain access: 'Todos necesitan su tarjeta de acceso para entrar. Los visitantes se registran en la caseta. Zonas rojas son restringidas.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Monthly Safety Meeting",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Lead a comprehensive monthly safety meeting",
    steps: [
      r("Read the construction passage as a meeting prep.", 7),
      ds(
        "Lead a full monthly safety meeting: review incidents, update PPE policy, new OSHA standard, Q&A from crew.",
        10,
      ),
      sp(
        "Open: 'Reunión de seguridad mensual. Primero: los incidentes del mes pasado. Segundo: nueva regla de protección de manos. Preguntas al final.'",
        3,
      ),
    ],
  },
  {
    n: 28,
    title: "Safety Culture Leadership",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Inspire a safety-first culture in your crew",
    steps: [
      r("Read the construction passage. Focus on safety culture vocabulary.", 6),
      ds(
        "Role-play: address a crew member who removed their hard hat because 'it's uncomfortable.' Reinforce without humiliating.",
        9,
      ),
      sp(
        "Lead: 'Todos llegamos con familia en casa. Ningún trabajo vale una lesión. La seguridad no es negociable — es respeto propio y a los demás.'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "OSHA Inspection Response",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective: "Respond professionally to an OSHA inspection",
    steps: [
      r("Read the construction passage. Focus on OSHA inspection vocabulary.", 6),
      ds(
        "Role-play: OSHA inspector arrives unannounced. Greet, cooperate, accompany on walk-through, and respond to findings.",
        10,
      ),
      sp(
        "Respond to a citation: 'Entendemos la violación. La corrección se hará en [X] days. Aquí está el plan de acción.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Safety Leadership Shift",
    readingTemplate: "seed-{lang}-construction-blueprint",
    objective:
      "Lead a full day of safety activities — briefings, inspections, incident response — without switching languages",
    steps: [
      r("Read the construction passage as your morning safety prep.", 5),
      ds(
        "AI-assisted full safety shift: morning brief → site walk → near-miss response → subcontractor orientation → closeout. Target language only.",
        12,
      ),
      sp(
        "Close the shift: 'El resumen de seguridad de hoy: sin accidentes. Corregimos 2 peligros. El andamio del sector C fue reinspeccionado.'",
        3,
      ),
    ],
  },
];

// ─── HOCKEY ──────────────────────────────────────────────────────────────────

const HOCKEY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Rink & Equipment",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Name the rink zones and 15 pieces of equipment",
    steps: [
      r(
        "Read the hockey rink passage. Map every vocabulary word to a location or piece of gear.",
        8,
      ),
      wm("Drill: patín, stick, portería, disco, línea azul, faceoff, malla, casco. 8/8.", 5),
      sp(
        "Name equipment and their purpose: 'El casco protege la cabeza. Los patines de hielo son para deslizarse.'",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Positions on Ice",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain every position and its role",
    steps: [
      r("Read the hockey passage. Focus on position vocabulary.", 7),
      pt(
        "Pattern: 'El [position] juega en [zone]. Su responsabilidad es [role]. Un buen [position] debe [skill].' Build 5 position descriptions.",
        7,
      ),
      sp(
        "Describe all 6 positions on ice: center, wings, defensemen, and goalie — in the target language.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Basic Rules",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain the 10 most important hockey rules",
    steps: [
      r("Read the hockey passage. Find rule vocabulary.", 7),
      wm(
        "Drill: offside, icing, penalti, poder de juego, alto sticking, interferencia, gancho. 7/7.",
        5,
      ),
      sp(
        "Explain icing: 'El icing ocurre cuando disparas el disco desde tu zona hasta el otro lado sin que nadie lo toque.'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Penalty Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Describe common penalties and their duration",
    steps: [
      r("Read the hockey passage. Find penalty vocabulary.", 6),
      sb("Build 5 penalty sentences: name, infraction, duration, and game impact.", 5),
      sp(
        "Explain a penalty: 'Esa fue una penalidad menor de 2 minutos por trip. El jugador va al banco de penales y jugamos con ventaja.'",
        9,
      ),
    ],
  },
  {
    n: 5,
    title: "Faceoff & Puck Drops",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain faceoff situations and strategy",
    steps: [
      r("Read the hockey passage. Focus on faceoff vocabulary.", 6),
      wm("Drill: faceoff, zona, centro, gana, presión, formación, neutral, disco. 8/8.", 5),
      sp(
        "Explain faceoffs: 'El faceoff ocurre después de cada gol, al inicio del período, y cuando el juego se detiene. El centro lucha por el disco.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Power Play Strategy",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain power play formations and communication",
    steps: [
      r("Read the hockey passage. Focus on power play vocabulary.", 7),
      pt(
        "Pattern: 'En poder de juego, usamos formación [4-1 / 1-3-1 / umbrella]. El punto es [position]. Objetivo: [shot/pass sequence].' Build power play plan.",
        7,
      ),
      sp(
        "Explain: 'En poder de juego, mantenemos el disco en movimiento — pase, pase, disparo. Buscamos el espacio al lado del portero.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Goaltender Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Coach a goalie on positioning and calling out defenders",
    steps: [
      r("Read the hockey passage. Focus on goaltending vocabulary.", 6),
      wm(
        "Drill: portero, ángulo, pilar, bastón, mariposa, despejar, rebote, comunicación. 8/8.",
        5,
      ),
      sp(
        "Coach the goalie: 'Cierra el ángulo cuando el atacante entra por la derecha. Llama al defensa: ¡derecha, derecha!'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Line Changes",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate line changes smoothly during play",
    steps: [
      r("Read the hockey passage. Find line change vocabulary.", 6),
      pt(
        "Pattern: 'Línea de ataque: [players] entra. Cambio en la banca cuando [signal]. No dejen el disco en zona propia antes de cambiar.' Build line change protocol.",
        7,
      ),
      sp(
        "Call a change: '¡Cambio! Primera línea afuera, segunda adentro. Espera la señal del capitán.'",
        7,
      ),
    ],
  },
  {
    n: 9,
    title: "Pre-Game Talk",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Deliver a pre-game motivational team talk",
    steps: [
      r("Read the hockey passage. Focus on motivational vocabulary.", 6),
      ds("Role-play: pre-game locker room speech — the team is facing their toughest opponent.", 9),
      sp(
        "Deliver a 60-second pre-game talk: game plan, emphasis, and motivation. In the target language.",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "On-Ice Drills Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Call out drills and corrections during practice",
    steps: [
      r("Read the hockey passage. Focus on practice vocabulary.", 7),
      sb(
        "Build 4 drill instructions: name of drill, positions, movement pattern, and emphasis.",
        5,
      ),
      sp(
        "Call a drill: 'Ejercicio de pase en parejas. Un tiro al fondo, un toque a tu compañero, disparo al portero. ¡Vamos!'",
        8,
      ),
    ],
  },
  {
    n: 11,
    title: "Defensive Zone Coverage",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain defensive zone coverage principles",
    steps: [
      r("Read the hockey passage. Focus on defensive vocabulary.", 7),
      wm(
        "Drill: zona defensiva, cobertura de hombre, zona, presión, cubierta, rotación, cuerpo. 7/7.",
        5,
      ),
      sp(
        "Explain: 'En zona defensiva, usamos cobertura de hombre. Cada uno cubre a su jugador. No dejen el portero solo.'",
        8,
      ),
    ],
  },
  {
    n: 12,
    title: "Shooting Technique",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Teach wrist shot, slap shot, and backhand technique",
    steps: [
      r("Read the hockey passage. Focus on shooting vocabulary.", 6),
      pt(
        "Pattern: 'El wrist shot: peso adelante, palo doblado, muñeca hacia arriba. El slap shot: backswing, contacto en el palo, follow through.' Build 3 shooting descriptions.",
        7,
      ),
      sp(
        "Demonstrate verbally: 'Para el wrist shot, el peso va en la pierna delantera y giras la muñeca al soltar el disco.'",
        7,
      ),
    ],
  },
  {
    n: 13,
    title: "Checking & Body Contact",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain legal checking and illegal contact rules",
    steps: [
      r("Read the hockey passage. Focus on contact vocabulary.", 6),
      wm(
        "Drill: chequeo, cuerpo, hombro, ilegal, boarding, charging, hitting, protección. 8/8.",
        5,
      ),
      sp(
        "Explain legal hitting: 'El chequeo con el hombro al portador del disco es legal. Chequear por la espalda es boarding — penalti mayor.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Breakout Play",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain the team's breakout play from the defensive zone",
    steps: [
      r("Read the hockey passage. Focus on breakout vocabulary.", 7),
      pt(
        "Pattern: 'Breakout 1-4-1: portero activa al defensa. El defensa pasa a la borda. El centro cruza al medio. Alas abiertas. Salida controlada.' Build breakout plan.",
        7,
      ),
      sp(
        "Explain the breakout: 'Cuanto el portero controla el disco, dos alas van a las bordas. El centro sube al medio. No paniquen.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Post-Game Review",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Lead a post-game team review in the locker room",
    steps: [
      r("Read the hockey passage. Find review vocabulary.", 6),
      ds(
        "Role-play: post-game review after a loss — stay constructive, identify 3 improvements, maintain team morale.",
        9,
      ),
      sp(
        "Lead the review: 'Perdimos pero aprendemos. Tres cosas bien: [list]. Tres a mejorar: [list]. El próximo juego es [day].'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "1-on-1 Player Coaching",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Coach a player individually on a specific skill",
    steps: [
      r("Read the hockey passage. Focus on individual coaching vocabulary.", 6),
      ds("Role-play: a player is struggling with their backhand shot. Coach them one-on-one.", 9),
      sp(
        "Coach: 'Tu backhand es bueno, pero el palo está demasiado vertical. Inclínalo más y empuja desde los dedos.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Referee Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate respectfully with game officials",
    steps: [
      r("Read the hockey passage. Focus on official communication vocabulary.", 6),
      wm("Drill: árbitro, queja, capitán, señal, gol, no-gol, revisión, protesta. 8/8.", 5),
      sp(
        "Speak to the ref: 'Solo el capitán puede hablar con los árbitros. La queja se hace respetuosamente entre períodos.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Overtime & Shootout",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain overtime rules and shootout strategy",
    steps: [
      r("Read the hockey passage. Focus on overtime vocabulary.", 7),
      pt(
        "Pattern: 'El overtime es [format]. El shootout: cada equipo elige [X] tiradores. El primer disparo es para el capitán.' Build OT strategy.",
        7,
      ),
      sp(
        "Explain to players: 'En el shootout, muestrales un movimiento que no hayan visto. Sorpresa es clave.'",
        6,
      ),
    ],
  },
  {
    n: 19,
    title: "Team Meeting & Season Goals",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Lead a pre-season team meeting and set goals together",
    steps: [
      r("Read the hockey passage. Focus on team building vocabulary.", 6),
      ds(
        "Lead a pre-season meeting: vision, individual goals, team goals, expectations, and accountability.",
        10,
      ),
      sp(
        "State the mission: 'Esta temporada, nuestra meta es [goal]. Para lograrlo, necesitamos [3 commitments] de cada jugador.'",
        4,
      ),
    ],
  },
  {
    n: 20,
    title: "Youth Hockey Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Coach youth players with age-appropriate language",
    steps: [
      r("Read the hockey passage. Note how vocabulary adjusts for young players.", 6),
      sb("Build 4 youth-friendly coaching instructions: simple, encouraging, with fun cues.", 5),
      sp(
        "Coach a 10-year-old: '¡Buen intento! Recuerda: mantén los ojos al frente, no al disco. ¡Tú puedes! Inténtalo de nuevo.'",
        9,
      ),
    ],
  },
  {
    n: 21,
    title: "Away Game Travel Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate logistic and preparation details for an away game",
    steps: [
      r("Read the hockey passage. Focus on travel vocabulary.", 6),
      wm(
        "Drill: viaje, hotel, autobús, hora de salida, equipo, reunión, desayuno, puntualidad. 8/8.",
        5,
      ),
      sp(
        "Brief the team: 'Salida mañana a las 6 AM. Todos en el autobús con su equipo. Desayuno en el hotel a las 7.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Penalty Kill Strategy",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Explain penalty kill formation and communication",
    steps: [
      r("Read the hockey passage. Focus on penalty kill vocabulary.", 6),
      wm(
        "Drill: matar penalti, formación, cuadrado, presión, despejar, contador de tiempo, agresivo. 7/7.",
        5,
      ),
      sp(
        "Explain PK box: 'En el kill, formación de caja. El primer jugador presiona al portador del disco en su zona. Los demás sostienen.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "In-Game Adjustments",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Make and communicate mid-game tactical adjustments",
    steps: [
      r("Read the hockey passage. Focus on adjustment vocabulary.", 7),
      ds(
        "Role-play: losing 2-0 at second intermission — make adjustments, adjust line combos, refocus the team.",
        9,
      ),
      sp(
        "Adjust: 'Estamos perdiendo por la presión alta de ellos. Cambio: sacamos el disco más rápido. Segunda línea empieza este período.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Hockey Vocabulary Speed Drill",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Rapid-fire 30 hockey terms in under 2 minutes",
    steps: [
      wm(
        "Drill all 30 hockey terms: positions, plays, penalties, equipment. Flash until instant.",
        10,
      ),
      sp(
        "Name 10 plays: 'Breakout, power play, penalty kill, icing, faceoff, one-timer, wraparound, penalty shot, screen, rebound.'",
        5,
      ),
      ld(
        "Listen to a broadcast clip and identify 5 terms. Describe each in the target language.",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Scouting Report Presentation",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Present a scouting report on an upcoming opponent",
    steps: [
      r("Read the hockey passage. Focus on scouting vocabulary.", 6),
      ds(
        "Present a scouting report: opponent's power play, key shooter, goalie weaknesses, defensive tendencies.",
        10,
      ),
      sp(
        "Present: 'Su #15 es el motor de su power play. El portero es débil en el lado del guante. Presionamos eso.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Conditioning & Training Language",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate during an off-ice conditioning session",
    steps: [
      r("Read the hockey passage. Focus on fitness vocabulary.", 6),
      wm(
        "Drill: acondicionamiento, fuerza, velocidad, agilidad, resistencia, intervalo, escalera, peso. 8/8.",
        5,
      ),
      sp(
        "Lead off-ice training: 'Tres series de escalera de velocidad, luego sentadillas con peso. Descanso de 60 segundos entre series.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Parent & Family Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate with a player's parents about development",
    steps: [
      r("Read the hockey passage. Focus on parent communication vocabulary.", 6),
      ds(
        "Role-play: parent wants their child on the top line. Handle the conversation with empathy and clarity.",
        9,
      ),
      sp(
        "Explain: 'Su hijo está mejorando mucho. Para llegar a la primera línea, necesita trabajar en [specific skill].'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Playoffs Preparation Talk",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Deliver a playoffs preparation speech",
    steps: [
      r("Read the hockey passage. Focus on motivational vocabulary.", 6),
      ds("Role-play: deliver a 2-minute playoffs speech to fire up the team.", 10),
      sp(
        "Deliver: 'Todo el trabajo de la temporada nos trajo aquí. Este es nuestro momento. Defiendan cada disco como si fuera el último.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Injury Communication",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Communicate about a player injury during a game",
    steps: [
      r("Read the hockey passage. Focus on injury vocabulary.", 6),
      wm(
        "Drill: lesión, entrenador de atletismo, hielo, fuera de juego, evaluación, protocolo de concusión. 6/6.",
        5,
      ),
      sp(
        "Handle an injury: 'El #7 cayó en la borda. Necesitamos al entrenador médico en el hielo. Protocolo de concusión activado.'",
        9,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Game Management",
    readingTemplate: "seed-{lang}-hockey-rink",
    objective: "Manage a complete game from pre-game to post-game without switching languages",
    steps: [
      r("Read the hockey passage as your pre-game prep.", 5),
      ds(
        "AI-assisted full game: pre-game talk → line changes → bench communication → post-game review. Target language only.",
        12,
      ),
      sp(
        "Post-game: 'Ganamos [score]. Las claves fueron [3 factors]. La próxima semana trabajamos en [1 improvement].'",
        3,
      ),
    ],
  },
];

// ─── BASEBALL ─────────────────────────────────────────────────────────────────

const BASEBALL_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Field & Equipment",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Name all field positions and 15 pieces of equipment",
    steps: [
      r("Read the baseball dugout passage. Map vocabulary to field positions.", 8),
      wm("Drill: guante, bate, casco, bola, diamante, bases, montículo, dugout. 8/8.", 5),
      sp(
        "Name all 9 positions and describe where each plays: 'El shortstop juega entre la segunda y la tercera base.'",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Batting Mechanics",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Coach hitting mechanics in the target language",
    steps: [
      r("Read the baseball passage. Focus on batting vocabulary.", 7),
      pt(
        "Pattern: 'Stance ancho. Rodillas dobladas. Peso atrás. Ojos al pitcher. Swing al nivel de la bola. Follow-through.' Build batting coach cues.",
        7,
      ),
      sp(
        "Give batting instruction: 'Para el swing, mantén los codos dentro, las manos juntas, y no abras los hombros antes de tiempo.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Pitching Vocabulary",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Name 8 pitches and their movement",
    steps: [
      r("Read the baseball passage. Focus on pitching vocabulary.", 6),
      wm("Drill: recta, curveball, cambio, slider, sinker, cutter, splitter, knuckleball. 8/8.", 5),
      sp(
        "Explain: 'El changeup se agarra igual que la recta pero se lanza más lento. El batidor espera la recta y pierde el tiempo.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Fielding Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Call plays and direct fielders during a game",
    steps: [
      r("Read the baseball passage. Focus on fielding communication vocabulary.", 7),
      pt(
        "Pattern: '¡Tuyo! ¡Mío! ¡Segunda! ¡Tira a primera! ¡Corte! ¡Deja caer!' Build 6 fielding call phrases.",
        5,
      ),
      sp(
        "Call a double play: '¡Bola al shortstop! Segunda primero — tira! ¡Doble play! ¡La sacamos!'",
        8,
      ),
    ],
  },
  {
    n: 5,
    title: "Baserunning Instructions",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Give baserunning signals and coaching instructions",
    steps: [
      r("Read the baseball passage. Focus on baserunning vocabulary.", 6),
      wm("Drill: robar, adelantarse, señal, hold, slide, tag up, corredor, turnaround. 8/8.", 5),
      sp(
        "Coach third base: '¡Para! ¡Para! ¡Córrete! ¡Slide! — buena decisión, eso fue el instinto correcto.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Dugout Lineup Management",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Manage the batting lineup and communicate substitutions",
    steps: [
      r("Read the baseball dugout passage. Focus on lineup vocabulary.", 7),
      pt(
        "Pattern: 'El lineup de hoy: [positions in order 1-9]. El cambio es: [player A] sale, [player B] entra en [position].' Build lineup card.",
        7,
      ),
      sp(
        "Announce a substitution: 'Número 12 sale. Entra el 34 al jardín izquierdo. Número 12 bateó bien — gracias.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Pitching Change Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Make a pitching change and communicate with the bullpen",
    steps: [
      r("Read the baseball passage. Focus on pitching change vocabulary.", 6),
      wm(
        "Drill: relevo, bullpen, lanzador, cuenta de lanzamientos, cansado, zurdo, derecho, cerrador. 7/7.",
        5,
      ),
      sp(
        "Make the change: 'Tiempo. Se me acaba el abridor — ya tiene 95 lanzamientos. Voy al bullpen por el relevista zurdo.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Signs & Communication System",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Explain the team's sign system to a new player",
    steps: [
      r("Read the baseball dugout passage. Focus on sign vocabulary.", 6),
      pt(
        "Pattern: 'La indicadora es [signal]. Si ves [key signal], el siguiente movimiento es [play]. Confirma tocando [body part].' Build sign explanation.",
        8,
      ),
      sp(
        "Explain: 'Nuestras señales: el toque del sombrero es indicadora. Después de la indicadora, el primer toque de la nariz es el toque y corre.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Catching Mechanics & Pitch Calling",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Coach a catcher on framing and pitch calling",
    steps: [
      r("Read the baseball passage. Focus on catching vocabulary.", 6),
      wm("Drill: receptor, encuadrar, señal, zona, bloqueo, tiro, lanzador, inteligencia. 8/8.", 5),
      sp(
        "Coach the catcher: 'Encuadra el borde del plato — jala el guante hacia adentro al recibirla. El árbitro ve eso como strike.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Pre-Game Scouting Talk",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Brief the team on today's opponent",
    steps: [
      r("Read the baseball dugout passage. Focus on scouting vocabulary.", 6),
      ds(
        "Role-play: pre-game briefing on pitcher tendencies, defensive alignment, and key hitters to avoid.",
        9,
      ),
      sp(
        "Brief: 'Su lanzador es zurdo y usa mucho la curveball con dos strikes. Busquen fastball temprano en la cuenta.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Infield Pop-Up Calls",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Call pop-ups and prevent collisions",
    steps: [
      r("Read the baseball passage. Focus on communication vocabulary.", 6),
      sb("Build 5 communication calls: 'mía, tuya, derechista, izquierdista, sigue, para'.", 5),
      sp(
        "Practice out loud: calling a pop-up between first base and right field — who takes it and who backs off.",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Bunt & Hit-and-Run Plays",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Explain and call sacrifice bunt and hit-and-run",
    steps: [
      r("Read the baseball passage. Focus on small ball vocabulary.", 6),
      wm(
        "Drill: toque, toque de sacrificio, toque por hit, corrida y golpe, adelantar, sacrificio, out. 7/7.",
        5,
      ),
      sp(
        "Call the bunt: 'Toque de sacrificio — mueve el corredor a segunda. Boca del bate al pitcher. No importa si es out.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Pitcher-Catcher Meeting on Mound",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Communicate a pitching strategy during a mound visit",
    steps: [
      r("Read the baseball passage. Focus on pitching strategy vocabulary.", 6),
      pt(
        "Pattern: 'Está bateando la recta. Próxima: changeup abajo. Si empata, curveball por fuera. No le des nada dentro.' Build mound conference.",
        7,
      ),
      sp(
        "Call the strategy: 'Oiga, se está ajustando a tu fastball. Tíralo afuera con el cambio dos veces, luego recta arriba.'",
        7,
      ),
    ],
  },
  {
    n: 14,
    title: "Umpire Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Communicate respectfully with umpires",
    steps: [
      r("Read the baseball passage. Focus on umpire vocabulary.", 6),
      ds(
        "Role-play: argue a call professionally as a manager — get your point across without getting ejected.",
        9,
      ),
      sp(
        "Argue respectfully: 'Con todo respeto, ¿puede hablar con su compañero? Creo que el corredor llegó antes de la etiqueta.'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Youth Baseball Coaching",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Coach youth players with encouragement and simple technique",
    steps: [
      r("Read the baseball passage. Note how vocabulary adjusts for youth.", 6),
      sb(
        "Build 4 youth coaching phrases: one for batting, one for fielding, one for baserunning, one encouragement.",
        5,
      ),
      sp(
        "Encourage: '¡Buen swing! Esta vez, mantén los ojos en la bola hasta que el bate la toque. ¡Tú puedes hacerlo!'",
        9,
      ),
    ],
  },
  {
    n: 16,
    title: "Bullpen Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Communicate warm-up and entry instructions to the bullpen",
    steps: [
      r("Read the baseball passage. Focus on bullpen vocabulary.", 6),
      wm(
        "Drill: bullpen, calentar, listo, entrar, lanzamientos, retraso, cerrador, preparar. 8/8.",
        5,
      ),
      sp(
        "Call the bullpen: 'Que el cerrador empiece a calentar. Necesito 10 lanzamientos de bullpen antes de la novena.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Stolen Base Strategy",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Explain stolen base timing and strategy",
    steps: [
      r("Read the baseball passage. Focus on stolen base vocabulary.", 7),
      pt(
        "Pattern: 'Se roba cuando [catcher release] es lento o cuando el pitcher no lo cuida. La señal es [sign]. El tiempo mínimo es [seconds].' Build SB strategy.",
        7,
      ),
      sp(
        "Brief: 'Este receptor tiene tiempo de 2.1 para tirar. Si sales en la primera velocidad, tienes buena oportunidad de robarte la segunda.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Defensive Shift Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Set and explain a defensive shift",
    steps: [
      r("Read the baseball passage. Focus on defensive positioning vocabulary.", 6),
      wm(
        "Drill: cambio defensivo, posición, bateador zurdo, zona, probabilidad, campo, refuerzo. 7/7.",
        5,
      ),
      sp(
        "Set the shift: 'Cambio de posición para este bateador. Shortstop al lado derecho del cuadro. Segunda un paso atrás.'",
        9,
      ),
    ],
  },
  {
    n: 19,
    title: "Walk-Off & Late-Inning Drama",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Communicate in high-pressure late-inning situations",
    steps: [
      r("Read the baseball passage. Focus on late-inning vocabulary.", 7),
      ds(
        "Role-play: bases loaded, two outs, full count, tie game, bottom of the ninth. Manage from the dugout.",
        10,
      ),
      sp(
        "Manage: 'Tiempo. Cuenta llena, bases llenas. No le des nada bueno. Fuerza el out en primera. No seas especial.'",
        3,
      ),
    ],
  },
  {
    n: 20,
    title: "Post-Game Team Talk",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Lead a post-game team meeting",
    steps: [
      r("Read the baseball passage. Find team meeting vocabulary.", 6),
      ds(
        "Role-play: post-game meeting after a tough loss — stay focused on process, not outcome.",
        9,
      ),
      sp(
        "Lead: 'Perdimos hoy pero controlamos lo que podemos controlar. El proceso fue bueno. Mañana volvemos a trabajar.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Pitching Count Management",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Make pitching count decisions and communicate pitch limits",
    steps: [
      r("Read the baseball passage. Focus on pitch count vocabulary.", 7),
      pt(
        "Pattern: 'El lanzador tiene [X] lanzamientos. Su límite es [Y]. Si empata en la siguiente entrada, lo saco.' Build pitch count management.",
        7,
      ),
      sp(
        "Explain the limit: 'Tiene 85 lanzamientos — su límite son 95 hoy. Si estamos ganando al final de la séptima, lo saco.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Batting Practice Organization",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Organize batting practice and give station instructions",
    steps: [
      r("Read the baseball passage. Focus on BP vocabulary.", 6),
      wm(
        "Drill: práctica de bateo, estación, rotación, t-ball, tiros de frente, batazo, trabajo. 7/7.",
        5,
      ),
      sp(
        "Organize BP: 'Grupo A: bateo con lanzador. Grupo B: t-ball trabajando el hit opuesto. Rotamos cada 10 minutos.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Injury & Medical Timeout",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Handle a player injury on the field",
    steps: [
      r("Read the baseball passage. Focus on injury vocabulary.", 6),
      wm(
        "Drill: lesión, tiempo médico, entrenador, evaluar, sustituir, camilla, concusión, fuera. 8/8.",
        5,
      ),
      sp(
        "Handle: 'Tiempo médico para el jugador en segunda. Entrenador al campo. Todos mantengan su posición.'",
        9,
      ),
    ],
  },
  {
    n: 24,
    title: "Infield Fly Rule Explanation",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Explain the infield fly rule to a confused player",
    steps: [
      r("Read the baseball passage. Focus on rules vocabulary.", 6),
      ds(
        "Role-play: a player is confused why they were called out on an infield fly they could have caught. Explain.",
        9,
      ),
      sp(
        "Explain: 'La regla del fly de cuadro protege a los corredores — si el infielder puede atraparla fácilmente, el bateador es out automáticamente.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Rain Delay Management",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Manage a rain delay and keep the team focused",
    steps: [
      r("Read the baseball passage. Focus on delay vocabulary.", 6),
      ds(
        "Role-play: 45-minute rain delay, team is getting cold and distracted. Keep them engaged.",
        9,
      ),
      sp(
        "Manage: 'Vamos a usar este tiempo. Revisamos el video de los primeros turnos. Estiren y mantengan el cuerpo caliente.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Pitcher Development Talk",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Give one-on-one development feedback to a pitcher",
    steps: [
      r("Read the baseball passage. Focus on pitching development vocabulary.", 6),
      ds(
        "Role-play: a 17-year-old pitcher is developing but has control issues. Give specific, encouraging feedback.",
        9,
      ),
      sp(
        "Coach: 'Tu recta tiene buen movimiento. El problema es la mecánica del paso — tu pie delantero aterriza muy adentro.'",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "Draft Scouting Language",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Discuss player tools using scouting language",
    steps: [
      r("Read the baseball passage. Focus on scouting vocabulary.", 7),
      wm(
        "Drill: herramientas, velocidad, brazo, manos, bateo, poder, pies, proyección, techo, piso. 10/10.",
        5,
      ),
      sp(
        "Describe a prospect: 'El chico tiene 5 herramientas. Brazo de 70, velocidad de 65, y el bate puede llegar a ser 60. Alto techo.'",
        8,
      ),
    ],
  },
  {
    n: 28,
    title: "Pre-Season Expectations Meeting",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Set expectations and team values at the start of the season",
    steps: [
      r("Read the baseball passage as a season prep.", 7),
      ds(
        "Lead a pre-season expectations meeting: team values, accountability, baseball IQ, and effort standards.",
        10,
      ),
      sp(
        "State expectations: 'Este equipo tiene dos reglas: trabaja duro y juega inteligente. Todo lo demás lo resolvemos juntos.'",
        3,
      ),
    ],
  },
  {
    n: 29,
    title: "Championship Push Communication",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective: "Motivate the team during a playoff push",
    steps: [
      r("Read the baseball dugout passage as a motivational prep.", 6),
      ds("Deliver a 3-minute speech to a team 2 games out of first with 5 games left.", 10),
      sp(
        "Deliver: 'Cinco juegos. Controlamos nuestro destino. Un juego a la vez — no vean la tabla, jueguen lo de hoy.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Game Management",
    readingTemplate: "seed-{lang}-baseball-dugout",
    objective:
      "Manage a 9-inning game from dugout — lineup to post-game — without switching languages",
    steps: [
      r("Read the baseball dugout passage as your pre-game review.", 5),
      ds(
        "AI-assisted 9-inning game: lineup card → in-game decisions → pitching change → walk-off → post-game. Target language only.",
        12,
      ),
      sp(
        "Post-game: 'Ganamos [score]. Clave: [3 factors]. El héroe de hoy fue [player]. Mañana descansamos — nos vemos el jueves.'",
        3,
      ),
    ],
  },
];

// ─── TENNIS ──────────────────────────────────────────────────────────────────

const TENNIS_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Court & Equipment Names",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Name all court areas and 12 pieces of tennis equipment",
    steps: [
      r("Read the tennis court passage. Map vocabulary to court areas.", 8),
      wm("Drill: cancha, red, línea de base, servicio, saque, raqueta, pelota, línea. 8/8.", 5),
      sp(
        "Name all areas: '¿Qué es la T? ¿El alley? ¿La línea de base? ¿El ad court?' — answer each.",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Scoring System",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Explain the tennis scoring system from love to deuce",
    steps: [
      r("Read the tennis passage. Focus on scoring vocabulary.", 7),
      pt(
        "Pattern: 'Love es cero. 15-15 es lo mismo. 30-40 es ventaja servidor. Deuce — necesitan dos seguidos.' Build scoring progression.",
        7,
      ),
      sp(
        "Call out a game score-by-score: '15-love, 15-all, 30-15, 30-30, deuce, ventaja, juego.' In the target language.",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "The Serve",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Teach serve mechanics and placement",
    steps: [
      r("Read the tennis passage. Focus on serve vocabulary.", 6),
      wm(
        "Drill: saque, primer saque, segundo saque, fault, double fault, slice, kick, flat. 8/8.",
        5,
      ),
      sp(
        "Coach the serve: 'Lanza la pelota a las 2. Gira el hombro. Tira el brazo hacia arriba y contáctala en extensión máxima.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Forehand & Backhand",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Teach forehand and backhand technique",
    steps: [
      r("Read the tennis passage. Focus on groundstroke vocabulary.", 7),
      pt(
        "Pattern: 'Forehand: empuña el mango, gira la cadera, tira la raqueta bajo arriba. Backhand: ambas manos, misma rotación.' Build stroke comparison.",
        7,
      ),
      sp(
        "Coach: 'Cuando la bola viene a tu derecho, gira los hombros temprano — no esperes que llegue para girar.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Volley & Net Play",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Teach volley technique and when to come to the net",
    steps: [
      r("Read the tennis passage. Focus on net play vocabulary.", 6),
      wm("Drill: volea, red, delantera, corta, ángulo, smash, lob, acercarse. 8/8.", 5),
      sp(
        "Coach: 'Al volear, no swingues — bloquea la pelota. La raqueta sale delante del cuerpo. Ángulo con la muñeca.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Match Strategy",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Discuss match tactics against different opponents",
    steps: [
      r("Read the tennis passage. Focus on strategy vocabulary.", 7),
      pt(
        "Pattern: 'Contra [opponent style], usa [tactic]. Ataca [weakness]. Protege [your weakness] con [adjustment].' Build 3 tactical plans.",
        7,
      ),
      sp(
        "Strategize: 'Tu oponente tiene la derecha más fuerte. Ataca su revés con slice bajo y sube a la red cuando sea corta.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Topspin vs Slice",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Explain topspin and slice and when to use each",
    steps: [
      r("Read the tennis passage. Focus on spin vocabulary.", 6),
      wm("Drill: efecto, topspin, slice, rotación, rebote, baja, alta, control. 8/8.", 5),
      sp(
        "Explain: 'El topspin rebota alto — bueno para mantener al oponente atrás. El slice rebota bajo — ideal para acercarte a la red.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Doubles Communication",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Communicate with your doubles partner during a match",
    steps: [
      r("Read the tennis passage. Focus on doubles vocabulary.", 6),
      pt(
        "Pattern: '¿Mío o tuyo? Yo voy al centro, tú cubre el alley. En nuestro saque, tú volea, yo sirvo desde afuera.' Build doubles communication.",
        7,
      ),
      sp(
        "Brief your partner: 'Cuando sirvo, tú te mueves hacia el centro después del saque. Si lobs, tú lo tomas con el smash.'",
        7,
      ),
    ],
  },
  {
    n: 9,
    title: "Pre-Match Warm-Up",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Conduct a structured pre-match warm-up",
    steps: [
      r("Read the tennis passage. Focus on warm-up vocabulary.", 6),
      sb(
        "Build a warm-up sequence: rally from baseline → approach shots → volleys → serves → mental prep.",
        5,
      ),
      sp(
        "Coach warm-up: 'Primero, peloteo desde la línea de base por 5 minutos. Luego acercadas. Después voleas. Finalizamos con saques.'",
        9,
      ),
    ],
  },
  {
    n: 10,
    title: "Ball Machine & Solo Drills",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Direct a player through ball machine practice",
    steps: [
      r("Read the tennis passage. Focus on drill vocabulary.", 6),
      wm(
        "Drill: máquina de pelotas, velocidad, trayectoria, repetición, foco, posición, ejecución. 7/7.",
        5,
      ),
      sp(
        "Set up: 'La máquina tirará a tu derecha, luego a tu izquierda. 20 repeticiones de cada lado. Enfócate en el punto de contacto.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Mental Toughness Communication",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Coach mental resilience between points",
    steps: [
      r("Read the tennis passage. Focus on mental vocabulary.", 6),
      ds(
        "Role-play: player is losing and getting frustrated between points. Coach mental reset techniques.",
        9,
      ),
      sp(
        "Coach: 'Entre puntos, tres pasos: expira, da la vuelta, y borra el punto anterior. El único punto que importa es el siguiente.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Tiebreak Tactics",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Explain tiebreak rules and strategy",
    steps: [
      r("Read the tennis passage. Focus on tiebreak vocabulary.", 7),
      pt(
        "Pattern: 'En el tiebreak, se sirve así: [rotation]. La estrategia es [first serve %, ball placement]. A 6-6, necesitan 2 de diferencia.' Build tiebreak brief.",
        7,
      ),
      sp(
        "Explain: 'En el tiebreak, el primer punto es de saque del que no sirvió al último. Luego alternan de 2 en 2.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Approach Shot & Finishing",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Teach the approach shot and net finishing",
    steps: [
      r("Read the tennis passage. Focus on approach vocabulary.", 6),
      wm(
        "Drill: acercada, corta, slice de acercada, volcar, dirección, topo, smash, terminar. 8/8.",
        5,
      ),
      sp(
        "Coach: 'Cuando el oponente da una corta, acércate con slice bajo. Llega a la red y voltea el primer voleo hacia el pasillo.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Return of Serve",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Coach return of serve strategy and technique",
    steps: [
      r("Read the tennis passage. Focus on return vocabulary.", 7),
      pt(
        "Pattern: 'Posición: dividido un paso dentro de la línea. Contra saque fuerte: bloquea. Contra saque lento: ataca.' Build return plan.",
        7,
      ),
      sp(
        "Coach: 'Divide antes de que sirva. Toma el saque temprano. Si es al cuerpo, salta adentro y bloquea con el revés.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Player Evaluation Vocabulary",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Evaluate a player's strengths and areas for improvement",
    steps: [
      r("Read the tennis passage. Find evaluation vocabulary.", 6),
      ds(
        "Role-play: assess a junior player after watching them hit for 30 minutes. Give balanced feedback.",
        9,
      ),
      sp(
        "Evaluate: 'Tu derecho tiene buen topspin. Tu revés necesita más rotación. El saque es tu mayor arma — úsala más.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Match Calling (Line Calls)",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Make and communicate line calls correctly",
    steps: [
      r("Read the tennis passage. Focus on line call vocabulary.", 6),
      wm("Drill: dentro, fuera, out, falta, let, llamada, anotar, disputar. 8/8.", 5),
      sp(
        "Explain line call etiquette: 'Llama las tuyas, no las de tu oponente. Si tienes duda, la pelota está adentro — la duda favorece al oponente.'",
        9,
      ),
    ],
  },
  {
    n: 17,
    title: "Fitness for Tennis",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Discuss fitness requirements for competitive tennis",
    steps: [
      r("Read the tennis passage. Focus on fitness vocabulary.", 6),
      wm(
        "Drill: velocidad, agilidad, resistencia, cambio de dirección, recuperación, split step, potencia. 7/7.",
        5,
      ),
      sp(
        "Explain: 'El tenis requiere explosividad y resistencia. Sprint de 3 metros y recuperación — eso es el juego de base.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Post-Match Review",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Review a match with a student and identify improvements",
    steps: [
      r("Read the tennis passage. Focus on review vocabulary.", 6),
      ds(
        "Role-play: post-match review after a student lost in a tiebreak. Build confidence while identifying improvements.",
        9,
      ),
      sp(
        "Review: '¿Qué funcionó? ¿Qué cambiarías? Perdiste el tiebreak pero ganaste más puntos de calidad hoy que la semana pasada.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Racket & String Selection",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Advise a player on racket and string selection",
    steps: [
      r("Read the tennis passage. Focus on equipment vocabulary.", 6),
      wm(
        "Drill: raqueta, peso, balance, cabeza, tensión, cuerdas, poliprofil, natural, híbrido. 9/9.",
        5,
      ),
      sp(
        "Advise: 'Para tu juego de base y topspin, te recomiendo una raqueta con cabeza grande y cuerdas de poliprofil a 52 libras.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Warm-Weather & Clay Court Adjustments",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Adjust game plan for clay court conditions",
    steps: [
      r("Read the tennis passage. Focus on surface vocabulary.", 6),
      pt(
        "Pattern: 'En polvo de ladrillo, la pelota rebota [high/slow]. Construye los puntos con [tactic]. Llega a la red con [approach].' Build clay plan.",
        7,
      ),
      sp(
        "Explain clay: 'En polvo, el slide es una ventaja. Construye el punto con topspin profundo. Los errores son más caros — sé paciente.'",
        7,
      ),
    ],
  },
  {
    n: 21,
    title: "Serve & Volley Tactics",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Explain and practice serve-and-volley patterns",
    steps: [
      r("Read the tennis passage. Focus on serve-and-volley vocabulary.", 6),
      wm(
        "Drill: saque y red, primer paso, posición de división, primera volea, rematador, ángulo. 6/6.",
        5,
      ),
      sp(
        "Coach: 'Saca al cuerpo en la T. Primer paso hacia la red inmediatamente. Divide antes de que el oponente contacte. Primera volea al ángulo.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Watching Professional Tennis",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Analyze a professional match using sport-specific vocabulary",
    steps: [
      r("Read the tennis passage. Focus on analysis vocabulary.", 6),
      ds(
        "Analyze a Djokovic vs Alcaraz point-by-point in the target language: pattern, tactic, execution.",
        9,
      ),
      sp(
        "Analyze: 'El returno bajo al cuerpo forzó la volea incómoda. La pasa cruzada fue el golpe ganador.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Junior Tournament Preparation",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Prepare a junior player for their first tournament",
    steps: [
      r("Read the tennis passage. Focus on tournament vocabulary.", 6),
      pt(
        "Pattern: 'En el torneo: llega [time] antes. Calienta [duration] solo. El primer saque [strategy]. Controla tus emociones con [technique].' Build tournament prep.",
        7,
      ),
      sp(
        "Prepare: 'Tu objetivo en el primer torneo no es ganar — es aplicar lo que practicamos bajo presión real.'",
        7,
      ),
    ],
  },
  {
    n: 24,
    title: "Coaching Under Pressure",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Coach a player who is serving for the match",
    steps: [
      r("Read the tennis passage. Focus on pressure coaching vocabulary.", 6),
      ds(
        "Role-play: your student is serving for the match at 5-4. Coach the changeover before that game.",
        9,
      ),
      sp(
        "Coach: 'Sirve y queda en la línea de base. Juega tenis seguro, no héroe. Un punto a la vez. Respira.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Tennis Academies & Pathways",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Discuss development pathways for talented junior players",
    steps: [
      r("Read the tennis passage. Focus on development vocabulary.", 6),
      ds(
        "Role-play: discuss with parents whether their child should join a full-time tennis academy.",
        9,
      ),
      sp(
        "Advise: 'Para avanzar al nivel nacional, necesita mínimo 4 horas de entrenamiento al día. La academia te da estructura y sparring.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Physical Recovery Between Matches",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Discuss recovery protocols for a tournament",
    steps: [
      r("Read the tennis passage. Focus on recovery vocabulary.", 6),
      wm(
        "Drill: recuperación, hidratación, nutrición, enfriamiento, estiramientos, sueño, hielo, masaje. 8/8.",
        5,
      ),
      sp(
        "Advise recovery: 'Después del partido, 15 minutos de enfriamiento. Come carbohidratos y proteína en la primera hora. Duerme 8 horas.'",
        9,
      ),
    ],
  },
  {
    n: 27,
    title: "Second Serve Strategy",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Develop a reliable second serve under pressure",
    steps: [
      r("Read the tennis passage. Focus on second serve vocabulary.", 6),
      pt(
        "Pattern: 'El segundo saque debe entrar al [X]%. Usa kick o slice para añadir margen. Evita [area] contra [returner type].' Build second serve plan.",
        7,
      ),
      sp(
        "Coach: 'En el segundo saque, saca con más margen y spin. Prefiero que entres al 90% con el kick a que falles el flat.'",
        7,
      ),
    ],
  },
  {
    n: 28,
    title: "Group Lesson Organization",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Manage a group tennis lesson with multiple skill levels",
    steps: [
      r("Read the tennis passage. Focus on group instruction vocabulary.", 6),
      sb("Build 4 group drill rotations: feeding, target practice, match play, fitness.", 5),
      sp(
        "Organize: 'Grupo principiante en la cancha 1 con el asistente. Intermedios conmigo. Avanzados hacen match play en la 3.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Match Scenario",
    readingTemplate: "seed-{lang}-tennis-court",
    objective: "Coach through a complex in-match tactical problem",
    steps: [
      r("Read the tennis passage as a complex case prep.", 7),
      ds(
        "Coach a tiebreak against a left-handed baseliner with a kick second serve. Adjust tactics on the fly.",
        10,
      ),
      sp(
        "Adjust: 'Contra el zurdo, devuelve su kick al revés de él — que es tu derecho. Construye desde ahí y ataca el palo.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Tennis Coaching Session",
    readingTemplate: "seed-{lang}-tennis-court",
    objective:
      "Run a complete coaching session — warm-up through match play feedback — without switching languages",
    steps: [
      r("Read the tennis passage as your session prep.", 5),
      ds(
        "AI-assisted full coaching session: warm-up → technique drill → tactics → match play → feedback. Target language only.",
        12,
      ),
      sp(
        "Close the session: 'Hoy trabajamos en tu revés y el saque. El mejor momento fue [specific]. Para la próxima: [focus].'",
        3,
      ),
    ],
  },
];

// ─── BOWLING ─────────────────────────────────────────────────────────────────

const BOWLING_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Lane & Equipment Names",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Name all lane areas and 10 pieces of bowling equipment",
    steps: [
      r("Read the bowling lane passage. Map vocabulary to lane areas.", 8),
      wm(
        "Drill: pista, bolos, bola, flechas, puntos, canaleta, línea de falta, fosa de pinos. 8/8.",
        5,
      ),
      sp(
        "Name all areas: 'La zona de aproximación, la pista, las flechas, los puntos, la bolera de pinos — ¿dónde está cada uno?'",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Scoring System",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain the bowling scoring system including spares and strikes",
    steps: [
      r("Read the bowling passage. Focus on scoring vocabulary.", 7),
      pt(
        "Pattern: 'Un strike son 10 más los próximos 2 lanzamientos. Un spare es 10 más el siguiente. El máximo es [300].' Build scoring explanation.",
        7,
      ),
      sp(
        "Explain a frame: 'Tiraste un strike, luego 7 y spare — esa caja vale 10+10 = 20. La siguiente caja empieza en 20.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Ball Selection & Fit",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Help a player select the right ball",
    steps: [
      r("Read the bowling passage. Focus on ball vocabulary.", 6),
      wm("Drill: peso, agujero, cubierta, núcleo, gancho, reacción, mano, dedo. 8/8.", 5),
      sp(
        "Help: 'Para principiantes, una bola de 10-12 libras straight. Para jugadores con hook, una bola de cubierta de reacción.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "4-Step Approach",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Coach the 4-step approach from pushaway to release",
    steps: [
      r("Read the bowling passage. Focus on approach vocabulary.", 7),
      pt(
        "Pattern: '1: empuje y primer paso derecho. 2: swing hacia atrás y paso izquierdo. 3: máximo backswing y paso. 4: slide, release, follow-through.' Build 4-step.",
        7,
      ),
      sp(
        "Coach: 'El swing y los pasos deben ser sincrónicos — la bola lleva el ritmo. No la guíes, déjala péndulo.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Spare Shooting System",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Teach a systematic spare shooting approach",
    steps: [
      r("Read the bowling passage. Focus on spare vocabulary.", 6),
      wm(
        "Drill: spare, pino, dirección, mira, bola derecha, sistema de 3-6-9, pino 7, pino 10. 8/8.",
        5,
      ),
      sp(
        "Explain the 3-6-9 system: 'Para el pino 7, mueve 3 tablillas a la derecha. Para el pino 10, mueve 6 tablillas a la izquierda.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Hook Delivery",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Teach hook delivery technique and rev rate",
    steps: [
      r("Read the bowling passage. Focus on hook vocabulary.", 7),
      pt(
        "Pattern: 'El hook se genera con la posición de la mano y el eje de rotación. Más eje = más hook. Direcciona con los hombros.' Build hook coaching.",
        7,
      ),
      sp(
        "Coach the hook: 'Al lanzar, la mano gira de la posición 6 a la posición 4. No empujes la bola — soltarla con los dedos.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Lane Conditions",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain oil patterns and how to adjust",
    steps: [
      r("Read the bowling passage. Focus on lane condition vocabulary.", 6),
      wm("Drill: aceite, patrón, corto, largo, sport, carrydown, seco, trayectoria. 8/8.", 5),
      sp(
        "Adjust: 'La pista está seca hoy — la bola gancha demasiado temprano. Mueve 2 tablillas hacia el centro y lanza más derecho.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Tournament Bowling Communication",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Communicate during a competitive tournament",
    steps: [
      r("Read the bowling passage. Focus on tournament vocabulary.", 7),
      pt(
        "Pattern: '¿Cuánto aceite hay? ¿Qué bola estás usando? Tira hasta las flechas y gancha en el tablero [X].' Build tournament communication.",
        7,
      ),
      sp(
        "Talk strategy: 'La pista 3 tiene más aceite que la 4. Empieza con la sólida y ajusta si el ángulo de entrada cambia.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Mental Focus & Consistency",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Coach mental consistency between frames",
    steps: [
      r("Read the bowling passage. Focus on mental game vocabulary.", 6),
      ds(
        "Role-play: player threw 3 splits in a row and is visibly frustrated. Coach mental reset.",
        9,
      ),
      sp(
        "Coach: 'Borra los últimos 3 tiros. Cada tiro es independiente. Respira, enfócate en las flechas, y ejecuta el mismo swing.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Youth Bowling Instruction",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Teach bowling fundamentals to a youth player",
    steps: [
      r("Read the bowling passage. Note vocabulary adjustments for youth.", 6),
      sb(
        "Build 4 youth-friendly bowling instructions: approach, swing, release, follow-through.",
        5,
      ),
      sp(
        "Teach a child: '¡Mira la flecha del medio! Da tres pasos y deja caer la bola suavemente en la pista. ¡Buen tiro!'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "League Communication",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Communicate in a bowling league setting",
    steps: [
      r("Read the bowling passage. Find league vocabulary.", 6),
      wm("Drill: liga, hándicap, promedio, serie, semana, equipo, puntos, reporte. 8/8.", 5),
      sp(
        "Report league score: 'Esta semana sacamos 2 puntos de 4. Mi promedio subió a 185. El equipo lleva 22 puntos en la temporada.'",
        9,
      ),
    ],
  },
  {
    n: 12,
    title: "Ball Maintenance & Drilling",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain ball maintenance and drilling adjustments",
    steps: [
      r("Read the bowling passage. Focus on equipment vocabulary.", 6),
      wm(
        "Drill: desengrasante, limpieza, tachuela, perforación, eje, PIN, ajuste, bola plúmbica. 8/8.",
        5,
      ),
      sp(
        "Explain maintenance: 'Después de cada serie, limpia la bola con un paño limpio. Cada 50 juegos, desengrasado profundo.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Spare Leaves & Splits",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Name common splits and their difficulty",
    steps: [
      r("Read the bowling passage. Focus on split vocabulary.", 6),
      wm("Drill: 7-10, brooklyn, cornerpins, big four, baby split, sleeve, washout. 7/7.", 5),
      sp(
        "Explain the 7-10: 'El 7-10 es la división más difícil del boliche. Para convertirla, necesitas golpear un pino y que vuele al otro.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Bowling Etiquette",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain bowling lane etiquette",
    steps: [
      r("Read the bowling passage. Find etiquette vocabulary.", 6),
      pt(
        "Pattern: 'La regla de la pista es: si alguien está en la aproximación, tú esperas. El jugador a la derecha tiene prioridad.' Build etiquette rules.",
        7,
      ),
      sp(
        "Explain: 'En boliche, el jugador de la pista derecha lanza primero. Respeta el turno y no distraigas mientras alguien está en la aproximación.'",
        7,
      ),
    ],
  },
  {
    n: 15,
    title: "Bowling for Exercise & Fun",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Promote bowling as recreation and fitness",
    steps: [
      r("Read the bowling passage. Focus on recreation vocabulary.", 6),
      ds("Role-play: encourage a nervous first-time bowler. Make it fun and accessible.", 9),
      sp(
        "Welcome: '¡No se preocupe si nunca ha jugado! El boliche es para divertirse. Le enseño los básicos y lo demás llega solo.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Adjusting to New Lane Conditions",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Adapt your game mid-tournament as oil breaks down",
    steps: [
      r("Read the bowling passage. Focus on adjustment vocabulary.", 7),
      pt(
        "Pattern: 'Lleva [X] juegos en la pista. El aceite ya se fue del centro. Ajusta [direction] [boards] y usa [slower/faster ball].' Build adjustment strategy.",
        7,
      ),
      sp(
        "Adjust mid-game: 'El aceite está roto en el centro — la bola gancha muy pronto. Muevo 3 tablillas a la derecha.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Backup Ball Delivery",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain backup ball technique and when it helps",
    steps: [
      r("Read the bowling passage. Find backup ball vocabulary.", 6),
      wm("Drill: bola backup, reverso, lado izquierdo, ventaja, estilo, derecha, pino 10. 7/7.", 5),
      sp(
        "Explain: 'La bola backup gancha a la derecha para un diestro. Es útil para sacar el pino 10 de esquina en un spare.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "High Score Record Attempt",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Coach and communicate during a perfect game attempt",
    steps: [
      r("Read the bowling passage. Focus on pressure vocabulary.", 6),
      ds(
        "Role-play: a player has 11 strikes and is about to shoot for a perfect 300 game. Coach the last frame.",
        9,
      ),
      sp(
        "Coach: 'Nada ha cambiado. El mismo proceso, la misma línea, el mismo swing. Solo un tiro más. Respira y ejecuta.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Bowling Ball Grip Adjustments",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Adjust grip to improve consistency",
    steps: [
      r("Read the bowling passage. Focus on grip vocabulary.", 6),
      wm(
        "Drill: convencional, fingertip, tarugo, agujero del pulgar, inserción, profundidad, span. 7/7.",
        5,
      ),
      sp(
        "Adjust grip: 'El pulgar sale demasiado tarde — el agujero está muy largo. Vamos a añadir tarugo para acortar el span.'",
        9,
      ),
    ],
  },
  {
    n: 20,
    title: "Bowling Center Operations",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Communicate as a bowling center employee or pro shop worker",
    steps: [
      r("Read the bowling passage. Focus on operations vocabulary.", 6),
      pt(
        "Pattern: 'Pistas 1-10 están reservadas. El costo es [amount] por juego más zapatos. ¿Cuántas personas son?' Build customer service script.",
        7,
      ),
      sp(
        "Welcome customers: 'Bienvenidos. ¿Cuántas personas? ¿Van a jugar cuántos juegos? Tienen zapatos o necesitan alquilarlos?'",
        7,
      ),
    ],
  },
  {
    n: 21,
    title: "Pin Action & Carry",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Explain pin carry and how ball energy affects it",
    steps: [
      r("Read the bowling passage. Focus on pin action vocabulary.", 6),
      wm("Drill: entrada, ángulo, deflexión, energía, pocket, carry, break point, loft. 8/8.", 5),
      sp(
        "Explain carry: 'La bola necesita entrar al pocket con el ángulo correcto para que los pinos choquen entre sí y limpies todo.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Bowling Technology & Track Areas",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Discuss how lane machines and technology affect bowling",
    steps: [
      r("Read the bowling passage. Focus on technology vocabulary.", 6),
      ds("Explain how lane machines and modern ball technology changed the game of bowling.", 9),
      sp(
        "Explain: 'Las máquinas modernas aplican aceite con precisión. Las bolas de partícula de alta tracción reaccionan de manera que antes era imposible.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Team Tournament Bowling",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Coordinate team strategy during a 5-player tournament",
    steps: [
      r("Read the bowling passage. Focus on team bowling vocabulary.", 7),
      pt(
        "Pattern: 'El ancla es el mejor jugador. El lanzador 2 abre si el lanzador 1 no convierte. Ancla cierra todo.' Build team strategy.",
        7,
      ),
      sp(
        "Brief: 'Orden del equipo: Pedro, María, Carlos, Ana, y yo de ancla. Si alguien abre el frame, el siguiente limpia el spare.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Cross-Lane Etiquette & Competition",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Navigate competitive bowling etiquette and respect",
    steps: [
      r("Read the bowling passage. Find competition vocabulary.", 6),
      wm(
        "Drill: cortesía, adversario, respetar, turno, concentración, intimidación, distracciones. 7/7.",
        5,
      ),
      sp(
        "Explain: 'En torneos, si tu adversario está en la aproximación y tú también, dale el paso si está a tu derecha.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Reading Your Own Game Film",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Analyze your bowling form on video",
    steps: [
      r("Read the bowling passage. Focus on self-analysis vocabulary.", 6),
      ds(
        "Analyze a bowling video: identify 3 technique issues and articulate them in the target language.",
        9,
      ),
      sp(
        "Analyze: 'En el video veo que el hombro derecho cae en el tercer paso — eso desvía el swing hacia afuera.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Coaching Beginner vs Advanced",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Adjust coaching language for different skill levels",
    steps: [
      r("Read the bowling passage. Focus on level differentiation.", 6),
      pt(
        "Para principiante: 'Mira la flecha del medio, da 3 pasos, y suelta la bola suavemente.' Para avanzado: 'Ajusta el entry angle con el layout y el axis rotation.' Build both.",
        8,
      ),
      sp(
        "Switch levels: teach the same concept to a 10-year-old and a competitive adult in the target language.",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "300 Game History & Culture",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Discuss bowling history and culture in the target language",
    steps: [
      r("Read the bowling passage. Find culture vocabulary.", 6),
      ds(
        "Discuss bowling's history in the target country: when it arrived, who bowls, and its cultural significance.",
        9,
      ),
      sp(
        "Share: 'En México, el boliche llegó en los años 60. Es popular en familia y en ligas de empresa. El promedio nacional es [X].'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Lane Maintenance Awareness",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Communicate with lane maintenance staff",
    steps: [
      r("Read the bowling passage. Find lane care vocabulary.", 6),
      wm(
        "Drill: mantenimiento, aceite, desengrasante, limpieza, maquinaria, ajuste, reparación. 7/7.",
        5,
      ),
      sp(
        "Request maintenance: 'Pista 7 está muy seca en los tableros 5-10. ¿Pueden aplicar una pasada de aceite adicional al medio?'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Bowling League Season Planning",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective: "Plan and communicate a bowling league season schedule",
    steps: [
      r("Read the bowling passage. Focus on season vocabulary.", 7),
      ds("Lead a league planning meeting: schedule, rule changes, handicap system, and trophy.", 9),
      sp(
        "Open the meeting: 'La temporada empieza el [date]. 24 semanas, 4 pistas por noche. El hándicap es 90% de 210.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Bowling Session",
    readingTemplate: "seed-{lang}-bowling-lane",
    objective:
      "Coach a complete bowling session — warm-up to game analysis — without switching languages",
    steps: [
      r("Read the bowling lane passage as your session prep.", 5),
      ds(
        "AI-assisted full session: equipment check → warm-up → technique coaching → game → post-game analysis. Target language only.",
        12,
      ),
      sp(
        "Close: 'Hoy mejoraste en el spare del pino 10 y mantuviste el swing más consistente. La próxima semana: trabajo en los splits.'",
        3,
      ),
    ],
  },
];

// ─── AMERICAN FOOTBALL ────────────────────────────────────────────────────────

const FOOTBALL_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Field & Positions",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Name every position and field zone in the target language",
    steps: [
      r("Read the football play passage. Map vocabulary to field positions.", 8),
      wm(
        "Drill: quarterback, receptor, corredor, liniero, defensa, end zone, primera down. 7/7.",
        5,
      ),
      sp(
        "Name all 22 positions and their roles: 'El quarterback lanza la pelota. El liniero ofensivo lo protege.'",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Basic Rules & Scoring",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain downs, scoring, and basic game flow",
    steps: [
      r("Read the football passage. Focus on rules vocabulary.", 7),
      pt(
        "Pattern: 'Tiene 4 intentos para avanzar 10 yardas. Si no llega, el otro equipo toma la pelota. Un touchdown vale 6 puntos.' Build rules intro.",
        7,
      ),
      sp(
        "Explain a first down situation: '3a down, 7 yardas por ganar. Si no llegan, patean o arriesgan en cuarta down.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Huddle & Play Call",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Call a play in the huddle and communicate it clearly",
    steps: [
      r("Read the football passage. Focus on play call vocabulary.", 6),
      wm("Drill: huddle, jugada, formación, snap, right, left, motion, audible, señal. 9/9.", 5),
      sp(
        "Call a play: '34 sweep derecha. El corredor va por el tackle. Todos bloqueamos al segundo nivel. ¡Manos a todos!'",
        8,
      ),
    ],
  },
  {
    n: 4,
    title: "Line of Scrimmage Communication",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Communicate at the line of scrimmage pre-snap",
    steps: [
      r("Read the football passage. Focus on pre-snap vocabulary.", 7),
      pt(
        "Pattern: '¡Set! ¡Hut! Si ves [coverage], audible a [play]. La señal es [gesture].' Build pre-snap calls.",
        7,
      ),
      sp("Call at the line: '¡Tommy! ¡Tommy! — cambiamos a 32 dive izquierda. ¡Set! ¡Hut!'", 6),
    ],
  },
  {
    n: 5,
    title: "Defensive Assignments",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain defensive coverage and assignments",
    steps: [
      r("Read the football passage. Focus on defensive vocabulary.", 6),
      wm(
        "Drill: zona, hombre a hombre, cobertura 2, blitz, pass rush, safety, cobertura, esquinero. 8/8.",
        5,
      ),
      sp(
        "Brief the defense: 'Cobertura 2. Esquineros cubren el flat. Safeties guardan el medio. Linebackers cubren las rutas cortas.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Special Teams",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain kickoff, punt, and field goal teams",
    steps: [
      r("Read the football passage. Focus on special teams vocabulary.", 7),
      pt(
        "Pattern: 'En el kickoff, [coverage / return]. En el punt, [gunner / returner]. En el field goal, [protection / kicker].' Build special teams brief.",
        7,
      ),
      sp(
        "Brief special teams: 'En el kickoff, los cobridores van en sus carriles. No se crucen. El primero en el returner gana el tackle.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Route Running",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Name and describe 8 receiving routes",
    steps: [
      r("Read the football passage. Focus on route vocabulary.", 6),
      wm("Drill: fly, post, curl, in, out, slant, corner, wheel, out and up. 9/9.", 5),
      sp(
        "Describe the post route: 'Corre 10 yardas en línea recta, corta a 45 grados hacia el centro. Espera el balón en el break.'",
        9,
      ),
    ],
  },
  {
    n: 8,
    title: "Halftime Adjustments",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Give halftime tactical adjustments to the team",
    steps: [
      r("Read the football passage. Focus on adjustment vocabulary.", 7),
      ds(
        "Lead a halftime locker room address: identify what went wrong, give corrections, and re-energize.",
        10,
      ),
      sp(
        "State adjustments: 'Estamos 0-14. El problema es el control de la línea. Ajustamos el bloqueo en el lado izquierdo.'",
        3,
      ),
    ],
  },
  {
    n: 9,
    title: "2-Minute Drill",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain and execute the 2-minute drill vocabulary",
    steps: [
      r("Read the football passage. Focus on clock management vocabulary.", 7),
      pt(
        "Pattern: '2-minute drill: plays sin huddle, pelota al sideline después de la recepción, usa el spike si necesitan. No pierdan tiempo.' Build 2-minute brief.",
        7,
      ),
      sp(
        "Brief the offense: '2 minutos, sin timeouts. Jugaremos sin huddle. Si completan, van al sideline. Necesitamos 3 jugadas y un field goal.'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Red Zone Offense",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain red zone offensive strategy",
    steps: [
      r("Read the football passage. Focus on red zone vocabulary.", 6),
      wm("Drill: zona roja, scoring, jump ball, fade, slant, run, tight end, end zone. 8/8.", 5),
      sp(
        "Explain: 'En la zona roja, el campo se comprime. Usamos más rutas cortas y slants. El tight end es clave cerca del end zone.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Blitz Packages",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain blitz packages and how to block them",
    steps: [
      r("Read the football passage. Focus on blitz vocabulary.", 7),
      pt(
        "Pattern: 'Si ves 6 hombres en la línea, es blitz. El protector asigna: center al medio, guards cubren fuera, backs ayudan.' Build blitz protection.",
        7,
      ),
      sp(
        "Alert the offense: '¡Seis hombres! ¡Protección Max! — cada bloqueador cubre al hombre que tiene más cerca.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Quarterback Reads",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain reading a defense pre-snap and post-snap",
    steps: [
      r("Read the football passage. Focus on QB read vocabulary.", 6),
      wm(
        "Drill: seguridad, cobertura, mira, progresión, apertura, salida, primero, segundo. 8/8.",
        5,
      ),
      sp(
        "Coach the QB: 'Pre-snap: cuenta los safeties. Post-snap: tu primer look es el X. Si está cubierto, pasa al tight end en el medio.'",
        9,
      ),
    ],
  },
  {
    n: 13,
    title: "Option & RPO Concepts",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain RPO and option plays to the offense",
    steps: [
      r("Read the football passage. Focus on RPO vocabulary.", 6),
      ds("Explain the RPO concept: pre-snap read, run-pass option, and QB decision-making.", 9),
      sp(
        "Explain RPO: 'En el RPO, la decisión del QB es instantánea: si el linebacker cae a cubrir, lanzas. Si se queda, entramos la pelota al corredor.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Training Camp Communication",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Communicate during a training camp practice",
    steps: [
      r("Read the football passage. Focus on practice vocabulary.", 7),
      pt(
        "Pattern: 'Periodo 1: estiramiento y individual. Periodo 2: unidad. Periodo 3: 7-on-7. Periodo 4: equipo. Cierre: especiales.' Build practice schedule.",
        7,
      ),
      sp(
        "Call practice: '¡Velocidad, velocidad! ¡Primera unidad al frente! Esto es competencia — cada repetición cuenta.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Injury Protocol on Field",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Respond to a player injury on the field",
    steps: [
      r("Read the football passage. Focus on injury vocabulary.", 6),
      wm(
        "Drill: lesión, entrenador médico, protocolo de concusión, sustitución, camilla, fuera. 6/6.",
        5,
      ),
      sp(
        "Handle: 'Tiempo médico para el #22. Entrenador al campo. Protocolo de concusión activado — no puede regresar sin evaluación.'",
        9,
      ),
    ],
  },
  {
    n: 16,
    title: "Film Study Language",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Analyze film in the target language during a team session",
    steps: [
      r("Read the football passage. Focus on film study vocabulary.", 6),
      ds(
        "Analyze 3 plays on film: identify the defensive coverage, the offensive error, and the adjustment needed.",
        10,
      ),
      sp(
        "Comment on film: 'Aquí, el tackle izquierdo pierde al pass rusher porque no se set bien. Necesita bajar el centro de gravedad.'",
        4,
      ),
    ],
  },
  {
    n: 17,
    title: "Pressure & Fourth Down",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Communicate fourth down decisions under pressure",
    steps: [
      r("Read the football passage. Focus on fourth down vocabulary.", 6),
      ds(
        "Role-play: 4th and 2 from your own 40-yard line, down by 3 in the 4th quarter. Decide and communicate.",
        9,
      ),
      sp(
        "Call it: '4a down. Estamos en nuestras 40. Decisión: intentamos. Formation tight, QB sneak. Si fallamos, preparados para defender.'",
        5,
      ),
    ],
  },
  {
    n: 18,
    title: "Offensive Line Communication",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Direct the offensive line with blocking assignments",
    steps: [
      r("Read the football passage. Focus on O-line vocabulary.", 7),
      wm(
        "Drill: bloqueo, combo, doble equipo, pull, zona, gap, tight end, responsabilidad. 8/8.",
        5,
      ),
      sp(
        "Direct: 'Center y guardia derecho hacen doble equipo al nose tackle. El tackle derecho sella al edge. Guardia izquierdo sube al linebacker.'",
        8,
      ),
    ],
  },
  {
    n: 19,
    title: "Secondary Coverage Calls",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Call secondary coverage adjustments in-game",
    steps: [
      r("Read the football passage. Focus on secondary vocabulary.", 7),
      pt(
        "Pattern: 'Si el receptor se alinea en slot: esquinero se ajusta. Si hay trips: cambio a zona. Si ven motion: llamen [coverage change].' Build secondary adjustments.",
        7,
      ),
      sp(
        "Adjust coverage: '¡Trips izquierda! ¡Zona! Esquinero, shade hacia adentro. Safety, carga el slot — cúbrelo man-to-man si libera.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Post-Game Press Conference Language",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Give a professional post-game press conference response",
    steps: [
      r("Read the football passage. Focus on media vocabulary.", 6),
      ds(
        "Role-play post-game press conference after a loss. Take responsibility, be professional, no excuses.",
        9,
      ),
      sp(
        "Respond: 'Perdimos hoy y la responsabilidad es mía. Tomé malas decisiones en los momentos clave. El equipo merece más de mi parte.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Draft Pick Welcome",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Welcome a new player and explain the team culture",
    steps: [
      r("Read the football passage. Focus on team culture vocabulary.", 6),
      wm(
        "Drill: cultura, expectativa, sistema, instalación, proceso, compañeros, confianza, rol. 8/8.",
        5,
      ),
      sp(
        "Welcome: 'Bienvenido al equipo. Aquí trabajamos duro, pero juntos. El sistema tarda tiempo — confía en el proceso.'",
        9,
      ),
    ],
  },
  {
    n: 22,
    title: "Two-Point Conversion",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain two-point conversion strategy",
    steps: [
      r("Read the football passage. Focus on two-point vocabulary.", 6),
      pt(
        "Pattern: 'Ejecutamos la conversión de 2 puntos cuando [situation]. Nuestra jugada favorita es [play] porque [reason].' Build 2PC strategy.",
        7,
      ),
      sp(
        "Explain: 'Preferimos ir por 2 puntos después del segundo touchdown porque necesitamos 8 para empatar — no tiene sentido ir por 1.'",
        7,
      ),
    ],
  },
  {
    n: 23,
    title: "Clock Management",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Manage the clock at the end of a close game",
    steps: [
      r("Read the football passage. Focus on clock management vocabulary.", 7),
      wm(
        "Drill: reloj, spike, timeout, kneel, dos minutos, cuatro down, segundos, ganando. 8/8.",
        5,
      ),
      sp(
        "Manage end of game: 'Ganamos por 3. Nos quedan 2 minutos. Rodilla — gastamos el reloj. Sin riesgos. Si llegamos a 4a, pateamos.'",
        8,
      ),
    ],
  },
  {
    n: 24,
    title: "Onside Kick Strategy",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain onside kick setup and execution",
    steps: [
      r("Read the football passage. Focus on onside kick vocabulary.", 6),
      wm(
        "Drill: onside kick, cobertura, recuperar, ángulo, pelota libre, segunda oportunidad. 6/6.",
        5,
      ),
      sp(
        "Brief: 'Onside kick. Necesitamos recuperar la pelota. El pateador apunta a los 10 yardas en el lado derecho. Todos corren al rompimiento.'",
        9,
      ),
    ],
  },
  {
    n: 25,
    title: "Player Safety & Concussion Protocol",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Implement and communicate concussion protocol",
    steps: [
      r("Read the football passage. Focus on safety vocabulary.", 6),
      ds(
        "Role-play: player takes a big hit and seems dazed. Implement concussion protocol professionally.",
        9,
      ),
      sp(
        "Implement: 'El #15 está en protocolo de concusión. No regresa hoy sin evaluación médica completa. No negociable.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Recruiting Communication",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Communicate with a prospective recruit in the target language",
    steps: [
      r("Read the football passage. Focus on recruiting vocabulary.", 6),
      ds(
        "Role-play: recruit visit with a bilingual player. Explain the program, culture, and opportunity.",
        9,
      ),
      sp(
        "Recruit: 'Lo que ofrecemos: desarrollo como jugador y como persona. Aquí hay un camino claro a jugar a nivel siguiente.'",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "Defensive Blitz Timing",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Coordinate a delayed or zone blitz",
    steps: [
      r("Read the football passage. Focus on blitz timing vocabulary.", 7),
      pt(
        "Pattern: 'Zone blitz: linebacker sale, defensive end cae a zona. El QB ve presión pero hay un linebacker en cobertura — confusión intencional.' Build zone blitz plan.",
        7,
      ),
      sp(
        "Brief: 'Zone blitz — el linebacker izquierdo blitzea, el tackle derecho cae al flat. El QB pensará que hay apertura — no la habrá.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Timeout Strategy",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Explain timeout usage strategy in different situations",
    steps: [
      r("Read the football passage. Focus on timeout vocabulary.", 6),
      wm("Drill: tiempo muerto, defensivo, ofensivo, icing, salvar, desperdicio, último. 7/7.", 5),
      sp(
        "Strategize: 'Guardamos los timeouts para la última posesión. No los malgastamos en el segundo cuarto por una mala formación.'",
        9,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Defensive Scheme",
    readingTemplate: "seed-{lang}-football-play",
    objective: "Install a complex defensive coverage scheme",
    steps: [
      r("Read the football passage as a complex defense prep.", 8),
      ds(
        "Install a quarters coverage adjustment against a spread offense. Walk through all 11 assignments.",
        10,
      ),
      sp(
        "Install: 'Quarters coverage: safeties tienen los cuartos externos. Linebackers tienen las rutas de cruce. Cornerbacks en man outside.'",
        2,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Game Communication",
    readingTemplate: "seed-{lang}-football-play",
    objective:
      "Communicate through a full game — huddle calls to post-game — without switching languages",
    steps: [
      r("Read the football passage as your game-day prep.", 5),
      ds(
        "AI-assisted full game: pre-game talk → play calls → halftime → final drive → post-game. Target language only.",
        12,
      ),
      sp(
        "Post-game: 'Ganamos [score]. Las tres claves: [factors]. La próxima semana preparamos [opponent]. Descansen mañana.'",
        3,
      ),
    ],
  },
];

// ─── LACROSSE ─────────────────────────────────────────────────────────────────

const LACROSSE_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Field & Equipment",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Name all field zones and lacrosse equipment",
    steps: [
      r("Read the lacrosse field passage. Map all vocabulary.", 8),
      wm("Drill: stick, cabeza, malla, casco, guantes, protectores, portería, crease. 8/8.", 5),
      sp(
        "Name and describe: 'El stick tiene cabeza y mango. La portería mide 6×6 pies. El crease es la zona protegida del portero.'",
        7,
      ),
    ],
  },
  {
    n: 2,
    title: "Positions & Roles",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain every position and its responsibilities",
    steps: [
      r("Read the lacrosse passage. Focus on position vocabulary.", 7),
      pt(
        "Pattern: 'El [attack/midfield/defense/goalie] juega en [zone]. Su responsabilidad principal es [role]. El número de [position] en el campo es [X].' Build 4 position descriptions.",
        7,
      ),
      sp(
        "Describe midfield: 'El mediocampista corre de extremo a extremo — ataca y defiende. Necesita máxima resistencia.'",
        6,
      ),
    ],
  },
  {
    n: 3,
    title: "Cradling & Ball Handling",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Teach cradling technique and basic ball handling",
    steps: [
      r("Read the lacrosse passage. Focus on stick skills vocabulary.", 6),
      wm(
        "Drill: mecimiento, agarre, rotación, muñeca, arriba/abajo, control, alto, velocidad. 8/8.",
        5,
      ),
      sp(
        "Coach: 'El mecimiento mantiene la pelota en la cabeza. Gira la muñeca — no el codo. Practica mientras caminas y luego corriendo.'",
        9,
      ),
    ],
  },
  {
    n: 4,
    title: "Passing & Catching",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Coach passing mechanics and catching",
    steps: [
      r("Read the lacrosse passage. Focus on passing vocabulary.", 7),
      pt(
        "Pattern: 'Para pasar: codo alto, paso hacia el objetivo, libera con los dedos. Para atrapar: ojos en la pelota, cabeza del stick suave.' Build passing-catching instruction.",
        7,
      ),
      sp(
        "Coach: 'Al recibir el pase, no pongas el stick rígido — amortigua con los brazos como atrapa un huevo.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Shooting Technique",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Teach overhand and sidearm shooting",
    steps: [
      r("Read the lacrosse passage. Focus on shooting vocabulary.", 6),
      wm("Drill: tiro, codo, liberación, poder, muñeca, ángulo, velocidad, esquina. 8/8.", 5),
      sp(
        "Coach overhand shot: 'Paso hacia el portero, codo arriba, jala la mano inferior — la velocidad sale de esa mano baja.'",
        9,
      ),
    ],
  },
  {
    n: 6,
    title: "Ground Ball Communication",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Call ground ball situations and coach technique",
    steps: [
      r("Read the lacrosse passage. Find ground ball vocabulary.", 6),
      wm(
        "Drill: pelota suelta, agacharse, barrido, ángulo, cuerpo, bloqueo, recuperar, proteger. 8/8.",
        5,
      ),
      sp(
        "Call: '¡Pelota suelta! ¡Agáchate, no pares! Pon el cuerpo entre el oponente y la pelota — recupera y levanta.'",
        9,
      ),
    ],
  },
  {
    n: 7,
    title: "Face-Off Strategy",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain face-off techniques and winnable positions",
    steps: [
      r("Read the lacrosse passage. Focus on face-off vocabulary.", 7),
      pt(
        "Pattern: 'En el face-off, la posición del cuerpo es [description]. La técnica favorita es [move]. Si pierdo, [backup assignment].' Build face-off plan.",
        7,
      ),
      sp(
        "Brief: 'En el face-off, colocas el stick plano. Al silbato, barrida hacia afuera y avanzas con el cuerpo. Si te adelantas, ganas.'",
        6,
      ),
    ],
  },
  {
    n: 8,
    title: "Defensive Positioning",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Coach defensive stance and positioning",
    steps: [
      r("Read the lacrosse passage. Focus on defensive vocabulary.", 6),
      wm("Drill: posición, pies, knees, stance, marca, cuerpo, paso lateral, crease. 8/8.", 5),
      sp(
        "Coach defense: 'Pies separados a lo ancho de los hombros. Rodillas dobladas. Stick al lado. Ojos en el pecho del atacante.'",
        9,
      ),
    ],
  },
  {
    n: 9,
    title: "Offensive Sets & Plays",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain basic offensive sets and pick plays",
    steps: [
      r("Read the lacrosse passage. Focus on offensive vocabulary.", 7),
      pt(
        "Pattern: 'Formación 2-2-2: dos atacantes, dos mids, dos atrás. En el pick, [player A] pone el cuerpo para liberar a [player B].' Build offensive set explanation.",
        7,
      ),
      sp(
        "Explain pick play: 'El atacante izquierdo pone una pantalla al defensa del atacante derecho. Si sale libre, pase al lado débil.'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Goalie Communication",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Coach a goalkeeper on positioning and clearing",
    steps: [
      r("Read the lacrosse passage. Focus on goalkeeping vocabulary.", 6),
      wm("Drill: portero, posición, ángulo, parada, despejar, salida, pelota, comunicar. 8/8.", 5),
      sp(
        "Coach: 'Cuando despejas, grita el nombre del jugador al que pasas. Después de la parada, mira arriba primero — no pánico.'",
        9,
      ),
    ],
  },
  {
    n: 11,
    title: "Fast Break & Transition",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Execute fast break communication",
    steps: [
      r("Read the lacrosse passage. Focus on transition vocabulary.", 6),
      pt(
        "Pattern: '¡Transición! Un atacante al poste izquierdo, uno al derecho. El mid lleva la pelota al medio. 3 en 2 — decidan rápido.' Build fast break call.",
        7,
      ),
      sp(
        "Call the break: '¡Vamos! 4 en 3. No lancen desde lejos — busquen la ventaja adentro y terminen con confianza.'",
        7,
      ),
    ],
  },
  {
    n: 12,
    title: "Clear & Ride",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain clear and ride concepts",
    steps: [
      r("Read the lacrosse passage. Focus on clear and ride vocabulary.", 7),
      wm("Drill: clear, presión, ride, zona, salida, transición, media cancha, ayuda. 8/8.", 5),
      sp(
        "Brief: 'Al despejar, no paniquen. Portero → defensa → mid. No dejen que el oponente les presione a las líneas.'",
        8,
      ),
    ],
  },
  {
    n: 13,
    title: "Extra-Man Offense (EMO)",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Run an extra-man offense after a penalty",
    steps: [
      r("Read the lacrosse passage. Focus on EMO vocabulary.", 6),
      wm(
        "Drill: ventaja, extra, rotación, movimiento, espacio, apertura, shot clock, penalty. 7/7.",
        5,
      ),
      sp(
        "Set up EMO: 'Extra hombre. Formación 3-3. Movemos la pelota hasta crear una apertura — no precipitar el lanzamiento.'",
        9,
      ),
    ],
  },
  {
    n: 14,
    title: "Youth Lacrosse Fundamentals",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Coach youth players in age-appropriate lacrosse",
    steps: [
      r("Read the lacrosse passage. Note vocabulary adjustments.", 6),
      sb(
        "Build 4 youth coaching moments: one for each fundamental — cradling, passing, catching, defending.",
        5,
      ),
      sp(
        "Encourage: '¡Bien hecho! Ahora intenta mecerte mientras corres. No mires el stick — confía en tus manos.'",
        9,
      ),
    ],
  },
  {
    n: 15,
    title: "Penalty Box Communication",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Handle penalties, argue calls respectfully, and adjust the lineup",
    steps: [
      r("Read the lacrosse passage. Find penalty vocabulary.", 6),
      ds(
        "Role-play: player gets a flagrant foul called against them. Handle the conversation with the official.",
        9,
      ),
      sp(
        "Manage: 'Acepta la penalidad y ve al banco. No discutas. Ajustamos la defensa mientras estás fuera — necesitamos 30 segundos más.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Dodging Techniques",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Teach the roll dodge, split dodge, and bull dodge",
    steps: [
      r("Read the lacrosse passage. Focus on dodge vocabulary.", 7),
      pt(
        "Pattern: 'Roll dodge: gira alrededor del defensor. Split: cambia de mano y cruza. Bull: baja la cabeza y fuerza el espacio.' Build dodge explanations.",
        7,
      ),
      sp(
        "Coach: 'El split dodge funciona cuando el defensa está sobre-comprometido. Finges a la derecha, cambias de mano, y explota a la izquierda.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Behind-the-Goal Play",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain X-position (behind the goal) strategy",
    steps: [
      r("Read the lacrosse passage. Focus on behind-goal vocabulary.", 6),
      wm("Drill: X, detrás de la portería, wrap, feed, cut, opciones, posición, ventaja. 8/8.", 5),
      sp(
        "Explain X-position: 'Desde el X, el atacante tiene tres opciones: pase al frente, carry al poste, o escapar arriba.'",
        9,
      ),
    ],
  },
  {
    n: 18,
    title: "Box Lacrosse vs Field Lacrosse",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Explain the differences between box and field lacrosse",
    steps: [
      r("Read the lacrosse passage. Find format vocabulary.", 6),
      ds(
        "Explain the tactical and physical differences between box and field lacrosse to a new player.",
        9,
      ),
      sp(
        "Compare: 'El box es en cancha cerrada — más contacto, más rápido, más trabajo de stick. Las habilidades del box mejoran el juego en campo.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Game Tempo Control",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Communicate game tempo decisions — slow down or push the pace",
    steps: [
      r("Read the lacrosse passage. Focus on tempo vocabulary.", 7),
      pt(
        "Pattern: 'Si estamos ganando, control de pelota — forzamos que ellos nos persigan. Si perdemos, transición rápida — no permitimos que se acomoden.' Build tempo decisions.",
        7,
      ),
      sp(
        "Call tempo: '¡Tiempo! Ganamos por 2. El resto del tiempo: controlamos la pelota. No tomemos tiros de baja probabilidad.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Scouting the Opposition",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Present a pre-game scouting report",
    steps: [
      r("Read the lacrosse passage. Focus on scouting vocabulary.", 6),
      ds(
        "Present a scouting report on the opposing goalie and their face-off specialist's tendencies.",
        9,
      ),
      sp(
        "Scout report: 'Su portero es débil del lado derecho en el ángulo bajo. En face-offs, siempre usa el barrido hacia afuera.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Sticking Up for Teammates",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Handle a conflict on the field professionally",
    steps: [
      r("Read the lacrosse passage. Focus on conflict vocabulary.", 6),
      ds("Role-play: an opponent is being cheap-shot physical. Handle it without escalating.", 9),
      sp(
        "Handle: 'Ignora la provocación. Les importa que reacciones. Si hay una falta real, deja que el árbitro la llame. Mantén el enfoque.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Time & Room Shots",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Identify and capitalize on time and room scoring opportunities",
    steps: [
      r("Read the lacrosse passage. Focus on shooting opportunity vocabulary.", 6),
      wm("Drill: tiempo y espacio, lanzar, armar, preparar, esquina, potencia, decisión. 7/7.", 5),
      sp(
        "Coach: 'Cuando tienes tiempo y espacio, no dudes — arma el tiro y busca una esquina. La duda mata la oportunidad.'",
        9,
      ),
    ],
  },
  {
    n: 23,
    title: "Film Session — Offensive Review",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Review offensive film and identify improvement areas",
    steps: [
      r("Read the lacrosse passage. Focus on analysis vocabulary.", 6),
      ds(
        "Analyze 4 offensive possessions on film: identify the read, the error, and the correction.",
        10,
      ),
      sp(
        "Analyze: 'Aquí, el atacante retiene la pelota demasiado — el corte del mid ya estaba abierto y no lo vio.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Mental Preparation & Visualization",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Teach mental visualization as part of pregame prep",
    steps: [
      r("Read the lacrosse passage. Focus on mental prep vocabulary.", 6),
      ds(
        "Guide a 5-minute visualization session: warm up, scoring the first goal, making a key defensive stop.",
        9,
      ),
      sp(
        "Guide: 'Cierra los ojos. Imagina el primer face-off. Lo ganas. La pelota va al atacante. El pase, el corte, el gol. Estás listo.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Tournament Bracket Management",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Plan and communicate a tournament bracket strategy",
    steps: [
      r("Read the lacrosse passage. Focus on tournament vocabulary.", 7),
      ds(
        "Walk through a tournament bracket: who to watch out for, when to rest key players, and championship prep.",
        9,
      ),
      sp(
        "Plan: 'En el primer juego guardamos energía. Si avanzamos, el rival de semifinal es el que debemos preparar mejor.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Attack Unit Communication",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Run a dedicated attack unit drill with communication",
    steps: [
      r("Read the lacrosse passage. Focus on attack unit vocabulary.", 7),
      pt(
        "Pattern: 'Los tres atacantes se mueven en patrón de triángulo. Si el defensa carga, el atacante da el pick. La pelota sigue el movimiento.' Build attack unit drill.",
        7,
      ),
      sp(
        "Run the drill: 'Triángulo — pelota derecha, corte izquierdo, pase bajo. Repetición de las cosas pequeñas gana los grandes juegos.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Defense Drill Set",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Direct a defense-focused practice drill session",
    steps: [
      r("Read the lacrosse passage. Focus on defensive drill vocabulary.", 6),
      sb("Build a 4-drill defensive session: 1-on-1, 2-on-2, team defense, and ground balls.", 5),
      sp(
        "Direct: 'Comenzamos con 1-on-1 en el crease. Manos bajas, pies en movimiento. Después de 10 minutos, pasamos al trabajo en equipo.'",
        9,
      ),
    ],
  },
  {
    n: 28,
    title: "Season Review & Awards",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Lead an end-of-season team meeting in the target language",
    steps: [
      r("Read the lacrosse passage. Focus on season review vocabulary.", 6),
      ds(
        "Lead an end-of-season meeting: highs and lows, individual shout-outs, what to build on next year.",
        10,
      ),
      sp(
        "Close the season: 'Esta fue una temporada de crecimiento. Cada uno de ustedes mejoró. La base está lista para el año que viene.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Play Design",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective: "Design and explain a complex offensive set play",
    steps: [
      r("Read the lacrosse passage as a complex play prep.", 7),
      ds("Design and teach a backdoor cut play off a fake feed from behind the goal.", 10),
      sp(
        "Teach: 'El atacante del X finge el feed. El mid desde arriba corta por detrás del defensa. Recibe y lanza antes de que cierren.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Game Communication",
    readingTemplate: "seed-{lang}-lacrosse-field",
    objective:
      "Coach a complete lacrosse game from warm-up to post-game without switching languages",
    steps: [
      r("Read the lacrosse passage as your game prep.", 5),
      ds(
        "AI-assisted full game: pre-game → bench communication → substitutions → timeouts → post-game. Target language only.",
        12,
      ),
      sp(
        "Post-game: '[Score]. Ganamos/Perdimos porque [3 factors]. La próxima práctica enfocamos en [1 area].'",
        3,
      ),
    ],
  },
];

// ── Rugby ──────────────────────────────────────────────────────────────────
export const RUGBY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Pitch & Positions",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Name the pitch markings and 15 player positions",
    steps: [
      r("Read the rugby pitch passage. Identify positions and field zones.", 8),
      wm(
        "Match: hooker/talonador, flanker/ala, fly-half/apertura, fullback/zaguero, scrum-half/medio-scrum",
        7,
      ),
      sp(
        "Introduce your team: 'Soy el apertura. Trabajo entre los forwards y los backs. Mi rol es distribuir el balón.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Scrum Mechanics",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Call and execute a set scrum in the target language",
    steps: [
      r("Read the passage. Focus on scrum commands.", 7),
      pt(
        "Pattern: 'Agrupamos — flexionamos — empujamos. El medio-scrum introduce el balón en el lateral. El talonador raspa hacia atrás.' Repeat for binding calls.",
        8,
      ),
      sp("Call the scrum: 'Arriba — atrás — listos — ya!' Signal binding and feed.", 5),
    ],
  },
  {
    n: 3,
    title: "Lineout Calls",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Use coded lineout calls and lifting commands",
    steps: [
      r("Read the passage. Focus on lineout vocabulary.", 7),
      sb("Build 3 coded lineout plays: short throw, middle, long. Include lift commands.", 8),
      sp("Call: 'Señal verde — el salto al centro — levantamos — pelota atrás al capitán.'", 5),
    ],
  },
  {
    n: 4,
    title: "Ruck & Maul",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Direct teammates in ruck and maul situations",
    steps: [
      r("Read the passage. Focus on breakdown vocabulary.", 7),
      wm(
        "Match: ruck/ruck, maul/maul, jackaling/robo de balón, bind/agarrar, clear-out/despejar",
        7,
      ),
      sp(
        "Direct at the breakdown: 'Ruck — agárrense — empujen de frente. No cruzar los pies. Pelota a la derecha.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Tackling Technique",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Coach the three phases of a legal tackle",
    steps: [
      r("Read the passage. Focus on tackle safety vocabulary.", 6),
      pt(
        "Pattern: 'Cabeza al lado — hombro en los muslos — brazos abrazando — llevar al suelo.' Build tackling instruction set.",
        9,
      ),
      sp(
        "Coach: 'Cabeza al lado — nunca adelante. Envuelves las piernas, no el torso. Bájalo con control.'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Penalty & Free Kick",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Explain penalty options and execute the kick call",
    steps: [
      r("Read the passage. Focus on penalty decision vocabulary.", 7),
      ds("Discuss: touch kick, scrum, or shot at goal — when does each make sense?", 8),
      sp(
        "Decide: 'Penal a favor. Estamos en posición. El pateador intenta los tres puntos. ¡Silencio en la barrera!'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Kicking Game",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Call punt, grubber, and chip-kick situations",
    steps: [
      r("Read the passage. Focus on kicking vocabulary.", 7),
      sb(
        "Build kick scenarios: box kick to gain territory, grubber through gap, up-and-under on last tackle.",
        8,
      ),
      sp(
        "Call the kick: 'Arriba y adelante — nuestros backs persiguen. El zaguero viene a contestar — presión máxima.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Set Plays from Lineout",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Run a three-phase attack sequence from lineout ball",
    steps: [
      r("Read the passage. Focus on set play vocabulary.", 6),
      pt(
        "Pattern: 'Lineout ganado → maul → pick and go → backs attack wide.' Build the sequence call.",
        9,
      ),
      sp(
        "Execute: 'Lineout — maul en el momento del catch. Pick and go dos veces. En la tercera, apertura abre a los backs.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Backs Alignment",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Set backs depth and alignment for an attack",
    steps: [
      r("Read the passage. Focus on backs alignment vocabulary.", 7),
      pt(
        "Pattern: 'Backs profundos — dos metros entre cada jugador — el centro fija al defensa — el ala explota al espacio.' Build alignment call.",
        8,
      ),
      sp(
        "Set alignment: 'Backs — más profundos. El doce fija, el trece sale afuera. Ala — ¡espera el espacio!'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Defensive Line",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Coordinate a rushing defensive line",
    steps: [
      r("Read the passage. Focus on defensive coordination vocabulary.", 7),
      sb("Build 3 defensive calls: rush, drift, man-on-man, and blitz.", 8),
      sp(
        "Call the rush: 'Línea defensiva arriba — todos a la vez — presionamos al apertura antes de que pase.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Half-Time Team Talk",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Deliver a structured half-time talk with adjustments",
    steps: [
      r("Read the passage. Use it as game context.", 6),
      ds("Deliver a half-time talk: what's working, what to fix, and one key tactical change.", 10),
      sp(
        "Close the talk: 'Primera mitad fue buena en la melé. Segunda mitad — ganemos la línea de ventaja. Listos? ¡Vamos!'",
        4,
      ),
    ],
  },
  {
    n: 12,
    title: "Referee Communication",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Communicate with the referee respectfully and clearly",
    steps: [
      r("Read the passage. Focus on referee interaction vocabulary.", 6),
      wm(
        "Match: captain appeal/protesta del capitán, advantage/ventaja, forward pass/pase adelantado, knock-on/toque al frente",
        8,
      ),
      sp(
        "Address the ref: 'Árbitro, ¿podría explicar la decisión? Entendido. ¿Es ventaja para nosotros?'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Substitutions",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Call and explain substitutions during a match",
    steps: [
      r("Read the passage. Focus on substitution vocabulary.", 6),
      sb("Build substitution calls for props, backs, and injury-forced changes.", 9),
      sp(
        "Inform the bench: 'Número 3, prepárate — entras por el pilar izquierdo en el siguiente penal. Dale instrucciones sobre la melé.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Scrummaging Under Pressure",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Coach a scrummaging unit under pressure in a match",
    steps: [
      r("Read the passage as pre-match scrum prep.", 6),
      ds("Analyze: what's going wrong in the scrum and how to fix it at the next penalty?", 10),
      sp(
        "Fix it: 'Nuestra melé está perdiendo el ángulo. Vuelvan al fundamento — rodillas adentro — empuje derecho adelante.'",
        4,
      ),
    ],
  },
  {
    n: 15,
    title: "Tackle Bag Drill",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Run a tackle bag circuit in the target language",
    steps: [
      r("Read the passage as drill prep context.", 6),
      pt(
        "Pattern: 'Cuatro bolsas — paso entre — tacklea la siguiente — levántate rápido — repite.' Build the circuit instruction.",
        9,
      ),
      sp(
        "Run the drill: 'Seis repeticiones — máxima velocidad. Recuerden la cabeza al lado en cada tackle. ¡Empezamos!'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Endurance Session",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Lead a conditioning session with clear Spanish commands",
    steps: [
      r("Read the passage. Focus on fitness vocabulary.", 6),
      sb(
        "Build a 5-station conditioning circuit: shuttle runs, tackles, lineouts, scrums, sprint finish.",
        9,
      ),
      sp(
        "Run the session: 'Ocho minutos por estación. Sin parar entre estaciones. El trabajo de hoy gana partidos el sábado.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Video Review Session",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Lead a video review with specific tactical feedback",
    steps: [
      r("Read the passage as a match review reference.", 6),
      ds("Review three plays: one scrum win, one missed tackle, one successful backs move.", 10),
      sp(
        "Feedback: 'Esta jugada fue la diferencia. El ala tardó medio segundo. La próxima semana, trabajamos esa aceleración.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Weather Adaptation",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Adjust the game plan for wet/muddy conditions",
    steps: [
      r("Read the passage. Focus on weather-related vocabulary.", 6),
      pt(
        "Pattern: 'Con lluvia — menos pases largos — más pick and go — kicks al espacio. Con viento — ataca contra el viento en la primera mitad.' Build weather plan.",
        9,
      ),
      sp(
        "Announce: 'Llueve y hay viento del norte. Cambiamos el plan — juego de forwards — melé y maul toda la tarde.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Back Row Moves",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Call and run back row set plays",
    steps: [
      r("Read the passage. Focus on back row vocabulary.", 7),
      sb(
        "Build 3 back row moves: blindside flanker break, number 8 pick, scrum-half dummy run.",
        8,
      ),
      sp(
        "Call the play: 'Señal negra — el 8 toma la pelota del base de la melé — el 7 bloquea al flanker contrario — los backs se adelantan.'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "High Ball Under Pressure",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Coach catching a high ball under defensive pressure",
    steps: [
      r("Read the passage. Focus on high ball vocabulary.", 6),
      pt(
        "Pattern: 'Llama el balón — posición — ojos al balón — absorbe el contacto al aterrizar — protege.' Build catching instruction.",
        9,
      ),
      sp(
        "Coach: '¡Tuyo, tuyo! Llama fuerte. Posición de salto — no lo desvíes — dos manos. Aterriza y protege.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Attacking Maul",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Build and drive an attacking maul to score",
    steps: [
      r("Read the passage. Focus on maul vocabulary.", 7),
      ds("Plan: lineout catch → maul formation → drive 5 meters → peel to backs or push over.", 9),
      sp(
        "Drive: 'Maul — todos se unen — empujamos juntos — tres pasos — la pelota sale al medio o cruzamos.'",
        4,
      ),
    ],
  },
  {
    n: 22,
    title: "Penalty Kick Routine",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Talk through a penalty kick pre-routine in the target language",
    steps: [
      r("Read the passage. Focus on kicking vocabulary.", 5),
      wm(
        "Match: tee/tee, wind direction/dirección del viento, approach/carrera de aproximación, follow-through/seguimiento",
        9,
      ),
      sp(
        "Pre-kick routine: 'Viento de derecha — me acerco desde la izquierda — miro el palo. Respiro. Golpeo la mitad del balón.' [Execute]",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Game Management",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Manage game clock and score differential through language",
    steps: [
      r("Read the passage as a tense match reference.", 5),
      ds(
        "Manage: you're up by 3 with 10 minutes left. What do you do? Kick to touch? Scrum? Grind?",
        11,
      ),
      sp(
        "Direct: 'Tres puntos arriba — diez minutos. Pateamos al banderín — no arriesgamos penal — hacemos que el tiempo pase.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Injury Protocol",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Communicate an injury stoppage and blood sub",
    steps: [
      r("Read the passage. Focus on injury vocabulary.", 6),
      pt(
        "Pattern: '¿Estás bien? ¿Puedes continuar? Necesitas evaluación. Sangre — salida obligatoria — blood sub.' Build injury protocol.",
        9,
      ),
      sp(
        "Handle injury: 'Para el juego — lesión en campo. Número 11 — evaluación ahora. Sangre — sale por el número 23.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Maul Defense",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Break down an attacking maul defensively",
    steps: [
      r("Read the passage. Focus on maul defense vocabulary.", 6),
      sb(
        "Build a maul defense set: counter-bind, pulling the ball carrier, splitting the maul.",
        9,
      ),
      sp(
        "Counter: 'Maul — nadie se une en el lado equivocado. Dos hombres al balón — lo separamos. Árbitro ve que ellos paran.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Backs vs. Forwards Balance",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Discuss and decide how to balance forward and back play",
    steps: [
      r("Read the passage. Focus on tactical vocabulary.", 7),
      ds("Debate: when to use the backs for width versus relying on the forward pack to grind?", 9),
      sp(
        "Decide: 'Este rival es débil en la línea de tres cuartos. Hoy usamos los backs más que de costumbre — amplitud desde el principio.'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Restarts & Kickoffs",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Call and execute restart strategies",
    steps: [
      r("Read the passage. Focus on restart vocabulary.", 7),
      sb("Build 3 restart calls: long kick deep, chip to 10m line, short restart to open side.", 8),
      sp(
        "Call: 'Patada corta al lado abierto — nuestros forwards recuperan — no perdemos la pelota en el inicio.'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Try Celebrations & Reset",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Celebrate and immediately refocus after scoring",
    steps: [
      r("Read the passage. Focus on try and momentum vocabulary.", 5),
      ds(
        "After scoring: how do you celebrate briefly and immediately refocus for the conversion and kickoff?",
        10,
      ),
      sp(
        "Reset: '¡Buen ensayo! Felicidades — conversión ahora — concentración. Después del puntapié inicial — volvemos a la misma intensidad.'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "Complex Attacking Move",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Design and teach a multi-phase attacking sequence",
    steps: [
      r("Read the passage as tactical prep.", 7),
      ds("Design a 3-phase move: scrum win → pick and go → switch pass → backs wide.", 9),
      sp(
        "Teach: 'Fase uno — melé — el 8 recoge. Fase dos — ruck — switch al doce. Fase tres — backs explotan a la derecha del campo.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Match Leadership",
    readingTemplate: "seed-{lang}-rugby-pitch",
    objective: "Lead an 80-minute match entirely in the target language",
    steps: [
      r("Read the passage as your pre-match prep.", 5),
      ds(
        "AI-assisted full match: warm-up brief → in-match calls → half-time → final 10 min pressure management → post-match. No English.",
        12,
      ),
      sp(
        "Post-match: '[Result]. Ganamos/Perdimos porque [3 reasons]. La próxima semana [1 focus].'",
        3,
      ),
    ],
  },
];

// ── Sports & Hobbies (Gym/Recreation) ────────────────────────────────────
export const SPORTS_HOBBIES_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Gym Floor",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Name equipment and zones in a gym",
    steps: [
      r("Read the gym passage. Identify each piece of equipment and its zone.", 8),
      wm(
        "Match: dumbbell/mancuerna, barbell/barra, cable machine/máquina de poleas, pull-up bar/barra de dominadas, foam roller/rodillo de espuma",
        7,
      ),
      sp(
        "Give a gym tour: 'A la derecha están las mancuernas, ordenadas del más ligero al más pesado. Al fondo, las máquinas de poleas.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Personal Training Intake",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Conduct a fitness intake interview",
    steps: [
      r("Read the passage. Focus on fitness assessment vocabulary.", 7),
      pt(
        "Pattern: '¿Cuál es tu objetivo principal? ¿Perder peso, ganar músculo, mejorar resistencia? ¿Tienes alguna lesión o limitación?' Build intake questions.",
        8,
      ),
      sp(
        "Run the intake: '¿Cuántas veces por semana puedes venir? ¿Qué actividades disfrutas? Vamos a crear un plan para ti.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Workout Plan Explanation",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain a weekly workout split in the target language",
    steps: [
      r("Read the passage. Focus on training program vocabulary.", 7),
      sb("Build a 4-day split: push, pull, legs, full body. Explain each day's purpose.", 8),
      sp(
        "Explain: 'Lunes — empuje: pecho, hombros, tríceps. Martes — jalón: espalda y bíceps. Miércoles — descanso activo.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Form Correction",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Correct a client's squat or deadlift form",
    steps: [
      r("Read the passage. Focus on movement correction vocabulary.", 6),
      pt(
        "Pattern: 'Las rodillas no deben sobrepasar los dedos de los pies — empuja las caderas hacia atrás — espalda recta — pecho arriba.' Build correction cues.",
        9,
      ),
      sp(
        "Correct: 'Para — regresa. Las caderas van hacia atrás, no hacia abajo. Imagina que te sientas en una silla detrás de ti.'",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "Nutrition Basics",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Give basic nutrition guidance in the target language",
    steps: [
      r("Read the passage. Focus on nutrition vocabulary.", 7),
      wm(
        "Match: protein/proteína, carbohydrate/carbohidrato, calorie deficit/déficit calórico, meal prep/preparación de comidas, hydration/hidratación",
        7,
      ),
      sp(
        "Advise: 'Para ganar músculo, necesitas comer más proteína que tu peso en kilogramos. Intenta 1.6 gramos por kilo diario.'",
        6,
      ),
    ],
  },
  {
    n: 6,
    title: "Stretching & Mobility",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Lead a mobility routine in the target language",
    steps: [
      r("Read the passage. Focus on stretching vocabulary.", 6),
      sb(
        "Build a 5-move mobility routine: hip flexor, thoracic spine, hamstring, shoulder, ankle.",
        9,
      ),
      sp(
        "Lead: 'Flexor de cadera derecho — rodilla en el suelo — empuja las caderas adelante — respira. 30 segundos por lado.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Group Fitness Class",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Lead a group fitness class introduction",
    steps: [
      r("Read the passage. Focus on group class vocabulary.", 7),
      pt(
        "Pattern: 'Bienvenidos a la clase de [tipo]. Hoy trabajamos [muscles]. Si necesitas modificar, dime. Comenzamos con calentamiento.' Build class intro.",
        8,
      ),
      sp(
        "Open the class: 'Bienvenidos. Soy [nombre], su instructor de hoy. Esta clase es de 45 minutos — cardio y fuerza. ¿Listos? Vamos.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Cardio Equipment",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain how to use cardio machines",
    steps: [
      r("Read the passage. Focus on cardio vocabulary.", 7),
      wm(
        "Match: treadmill/caminadora, elliptical/elíptica, stationary bike/bicicleta estacionaria, rowing machine/máquina de remo, heart rate zone/zona de frecuencia cardíaca",
        7,
      ),
      sp(
        "Instruct: 'En la caminadora — ajusta la velocidad aquí. Para interval training — alterna entre nivel 6 y nivel 10 cada minuto.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Progress Tracking",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Review a client's 4-week progress and adjust the plan",
    steps: [
      r("Read the passage. Focus on progress assessment vocabulary.", 6),
      ds("Review 4 weeks of progress: what improved, what stalled, what to change in month 2?", 10),
      sp(
        "Review: 'En cuatro semanas — ganaste 2 kilos de músculo y perdiste 1.5 de grasa. Ajustamos las calorías para el próximo mes.'",
        4,
      ),
    ],
  },
  {
    n: 10,
    title: "Injury Prevention Talk",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Educate a client on injury prevention",
    steps: [
      r("Read the passage. Focus on injury prevention vocabulary.", 6),
      pt(
        "Pattern: 'Calienta siempre 10 minutos antes. No aumentes el peso más del 10% por semana. Si sientes dolor agudo — para.' Build prevention education.",
        9,
      ),
      sp(
        "Educate: 'El dolor muscular después del entrenamiento es normal. El dolor en articulaciones durante el entrenamiento — nunca ignores.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Hiking Trail Brief",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Brief a hiking group on trail details",
    steps: [
      r("Read the passage. Focus on outdoor recreation vocabulary.", 7),
      sb("Build a trail brief: distance, elevation, difficulty, gear check, safety stops.", 8),
      sp(
        "Brief: 'La ruta tiene 8 kilómetros y 400 metros de desnivel positivo. Nivel moderado. Llevamos 2 litros de agua mínimo. Nos reagrupamos en cada cruce.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Swimming Lane Etiquette",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain pool lane etiquette and swimming vocabulary",
    steps: [
      r("Read the passage. Focus on aquatic vocabulary.", 7),
      wm(
        "Match: freestyle/estilo libre, breaststroke/pecho, backstroke/espalda, circle swim/nadar en círculo, lane rope/cuerda de carril",
        7,
      ),
      sp(
        "Explain: 'En la piscina — siempre nada en círculo dentro del carril. Adelanta por la izquierda. Si alguien te toca el pie, da espacio para que adelante.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Yoga Session Introduction",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Open and guide a beginner yoga session",
    steps: [
      r("Read the passage. Focus on yoga vocabulary.", 7),
      pt(
        "Pattern: 'Inhala — estira — exhala — relaja. Pose del guerrero — pie derecho adelante — brazos arriba — mira al frente.' Build 5-pose sequence.",
        8,
      ),
      sp(
        "Guide: 'Comenzamos en postura de montaña. Pies juntos, brazos al lado. Respira profundo. Inhala — brazos al cielo. Exhala — dobla hacia adelante.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Cycling Class Commands",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Lead a cycling class with resistance and cadence commands",
    steps: [
      r("Read the passage. Focus on cycling vocabulary.", 6),
      sb(
        "Build a 30-minute ride profile: warm-up, climb, sprint, recovery, sprint, cool-down with commands.",
        9,
      ),
      sp(
        "Lead: 'Subida ahora — añade resistencia nivel 7. Mantén las cadencias en 70 RPM. Arriba del sillín si puedes. ¡Tres minutos más!'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Rock Climbing Basics",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Teach basic rock climbing communication and safety",
    steps: [
      r("Read the passage. Focus on climbing vocabulary.", 7),
      wm(
        "Match: harness/arnés, belay device/asegurador, hold/agarre, top rope/cuerda superior, bouldering/boulder",
        7,
      ),
      sp(
        "Safety check: 'Arnés bien ajustado — dos dedos pasan debajo. Nudo figura 8 revisado. ¿Listo para escalar? Cuando yo diga asegurado, puedes subir.'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "Martial Arts Warm-Up",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Lead a martial arts warm-up and basic stance instruction",
    steps: [
      r("Read the passage. Focus on martial arts vocabulary.", 6),
      pt(
        "Pattern: 'Guardia alta — pies al ancho de los hombros — rodillas ligeramente flexionadas — manos protegen la cara. Giro de cadera al golpear.' Build warm-up commands.",
        9,
      ),
      sp(
        "Lead warm-up: 'Diez saltos — diez rodillas al pecho — cinco minutos de sombra. Después de la entrada en calor, trabajamos la guardia básica.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Dance Fitness",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Lead a basic dance fitness warm-up in the target language",
    steps: [
      r("Read the passage. Focus on dance fitness vocabulary.", 6),
      sb("Build a 4-step choreography intro: step-touch, mambo, merengue step, arm sync.", 9),
      sp(
        "Teach: 'Paso a la derecha — toca — paso a la izquierda — toca. Añadimos los brazos: arriba al tocar, abajo al paso. ¡Música!'",
        5,
      ),
    ],
  },
  {
    n: 18,
    title: "Gym Safety Protocols",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain gym safety and emergency procedures",
    steps: [
      r("Read the passage. Focus on safety vocabulary.", 6),
      ds(
        "Cover: equipment inspection, spotter protocol, emergency stop, AED location, staff communication.",
        10,
      ),
      sp(
        "Brief safety: 'Si un equipo parece roto — no lo uses. Avisa al personal. En emergencias — el botón rojo para la caminadora. El DEA está junto a la recepción.'",
        4,
      ),
    ],
  },
  {
    n: 19,
    title: "Body Composition Talk",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain body composition metrics to a client",
    steps: [
      r("Read the passage. Focus on body composition vocabulary.", 7),
      pt(
        "Pattern: 'El peso total no cuenta toda la historia. Lo que importa es la composición — cuánto es músculo, cuánto es grasa, cuánto es agua.' Build explanation.",
        8,
      ),
      sp(
        "Explain: 'Tu IMC es 27 — pero tu porcentaje de grasa es 18%, que está en el rango atlético. El número en la báscula no lo es todo.'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Partner Training",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Set up and run a partner workout in the target language",
    steps: [
      r("Read the passage. Focus on partner training vocabulary.", 6),
      sb(
        "Build 4 partner exercises: pass med-ball, plank high-five, band-resisted run, synchronized squats.",
        9,
      ),
      sp(
        "Pair up: 'Busca a tu compañero. El ejercicio uno — pase de balón medicinal — diez repeticiones cada uno — sin parar. ¡Vamos!'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Sports Injury Basics",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Communicate RICE protocol and common sports injuries",
    steps: [
      r("Read the passage. Focus on sports injury vocabulary.", 7),
      wm(
        "Match: sprain/esguince, strain/distensión, R.I.C.E./R.H.C.E. (reposo, hielo, compresión, elevación), DOMS/dolor muscular tardío, concussion/conmoción cerebral",
        7,
      ),
      sp(
        "Apply RICE: 'Esguince de tobillo — reposo ahora. Hielo 20 minutos — no directamente en la piel. Comprimir con vendaje. Eleva la pierna.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Supplement Guidance",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain common supplements in the target language",
    steps: [
      r("Read the passage. Focus on supplement vocabulary.", 7),
      ds(
        "Discuss: protein powder, creatine, BCAAs, pre-workout — what each does and who benefits.",
        9,
      ),
      sp(
        "Advise: 'La creatina es uno de los suplementos más estudiados. 3 a 5 gramos diarios mejoran la fuerza. Es segura para adultos sanos.'",
        4,
      ),
    ],
  },
  {
    n: 23,
    title: "Obstacle Course Race Brief",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Brief a team for an obstacle course race",
    steps: [
      r("Read the passage. Focus on obstacle race vocabulary.", 7),
      sb("Brief 5 obstacles: wall climb, cargo net, mud crawl, tire flip, rope traverse.", 8),
      sp(
        "Brief: 'La primera barrera — la escalan juntos. Si alguien no puede — el equipo ayuda. Nadie se queda atrás en la carrera.'",
        5,
      ),
    ],
  },
  {
    n: 24,
    title: "Outdoor Boot Camp",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Run an outdoor boot camp session",
    steps: [
      r("Read the passage. Focus on outdoor training vocabulary.", 6),
      pt(
        "Pattern: '30 segundos de trabajo — 10 segundos de descanso. Burpees — lagartijas — sentadillas — sprints. Cuatro rondas.' Build the camp plan.",
        9,
      ),
      sp(
        "Run it: 'Ronda uno — burpees. ¡Ya! Treinta segundos — máxima intensidad. Diez — descanso. Próximo — lagartijas.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Swimming Training Plan",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain a swimming training plan to a beginner",
    steps: [
      r("Read the passage. Focus on swimming training vocabulary.", 7),
      sb("Build a beginner swim plan: Week 1 (4×50m), Week 2 (4×100m), Week 3 (2×200m).", 8),
      sp(
        "Explain: 'Esta semana — cuatro largos de 50 metros con descanso de 30 segundos. El objetivo es la técnica, no la velocidad. Concéntrate en la respiración.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Fitness Goal Setting",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Set SMART fitness goals with a client",
    steps: [
      r("Read the passage. Focus on goal-setting vocabulary.", 7),
      pt(
        "Pattern: 'Un objetivo SMART es: Específico — Medible — Alcanzable — Relevante — con Tiempo definido.' Build 3 example goals.",
        8,
      ),
      sp(
        "Set a goal: 'Mi objetivo: correr 5 kilómetros sin parar en 12 semanas. Comienzo con tres días de entrenamiento por semana.'",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "CrossFit WOD Introduction",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Explain a WOD (workout of the day) in the target language",
    steps: [
      r("Read the passage. Focus on CrossFit vocabulary.", 6),
      wm(
        "Match: WOD/entrenamiento del día, AMRAP/máximas rondas posibles, EMOM/cada minuto al inicio del minuto, rep scheme/esquema de repeticiones, Rx/peso prescrito",
        8,
      ),
      sp(
        "Brief the WOD: 'Hoy — AMRAP de 20 minutos: 10 thrusters, 15 pull-ups, 20 box jumps. Escalen el peso si es necesario. El reloj empieza en tres.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Recovery Day",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Plan and explain an active recovery day",
    steps: [
      r("Read the passage. Focus on recovery vocabulary.", 6),
      sb(
        "Build a recovery day plan: light cardio, foam rolling, mobility work, contrast shower, sleep hygiene.",
        9,
      ),
      sp(
        "Plan: 'Día de recuperación — no significa hacer nada. Caminata ligera de 30 minutos, rodillo de espuma en los cuádriceps, y 8 horas de sueño.'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "Community Event Planning",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Organize a community fitness event",
    steps: [
      r("Read the passage. Focus on event planning vocabulary.", 6),
      ds(
        "Plan a charity 5K or community workout day: logistics, roles, communication with participants.",
        10,
      ),
      sp(
        "Announce: 'El próximo mes organizamos una carrera de 5K para beneficencia. Necesito voluntarios para el registro, hidratación, y la meta.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Fitness Assessment",
    readingTemplate: "seed-{lang}-hobbies-gym",
    objective: "Conduct a complete fitness assessment in the target language",
    steps: [
      r("Read the passage as assessment prep.", 5),
      ds(
        "AI-assisted assessment: intake → movement screen → goal setting → plan presentation → motivation close. Target language only.",
        12,
      ),
      sp(
        "Close: 'En base a tu evaluación, tu plan personalizado está listo. Comenzamos el lunes. Estoy aquí para apoyarte.'",
        3,
      ),
    ],
  },
];

// ── Dairy Farmer ──────────────────────────────────────────────────────────
export const DAIRY_FARMER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Dairy Farm Layout",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Name the key areas of a dairy operation",
    steps: [
      r("Read the dairy farm passage. Identify each area.", 8),
      wm(
        "Match: milking parlor/sala de ordeño, holding pen/corral de espera, free stall barn/establo de camas libres, colostrum/calostro, bulk tank/tanque de enfriamiento",
        7,
      ),
      sp(
        "Describe the farm: 'Las vacas pasan de la zona de descanso al corral de espera, después a la sala de ordeño, y vuelven al establo.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Milking Routine",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Walk through the complete milking protocol",
    steps: [
      r("Read the passage. Focus on milking procedure vocabulary.", 7),
      pt(
        "Pattern: 'Predipping — secado — estimulación — colocar las pezoneras — ordeño — retirar — post-dipping.' Build step-by-step.",
        8,
      ),
      sp(
        "Walk through: 'Primero el predip — dejamos actuar 30 segundos. Secamos con toalla individual. Estimulamos 10 a 15 segundos. Luego colocamos las pezoneras.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Cow Health Check",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Communicate a daily health observation",
    steps: [
      r("Read the passage. Focus on cow health vocabulary.", 7),
      sb(
        "Build a health check report: rumination, manure score, body condition score, hoof condition, eye clarity.",
        8,
      ),
      sp(
        "Report: 'La vaca número 47 tiene baja ruminación esta mañana. Su estiércol es muy aguado. La reviso para acidosis o metritis.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Mastitis Detection",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Identify and report mastitis signs",
    steps: [
      r("Read the passage. Focus on mastitis vocabulary.", 7),
      wm(
        "Match: mastitis/mastitis, CMT test/prueba de mastitis californiana, somatic cell count/recuento de células somáticas, quarter/cuarto mamario, dry off/secar",
        7,
      ),
      sp(
        "Report mastitis: 'El cuarto delantero derecho de la número 12 tiene leche grumosa. Prueba CMT positiva. La separo y llamo al veterinario.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Calf Care Protocol",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Explain newborn calf care steps",
    steps: [
      r("Read the passage. Focus on calf care vocabulary.", 7),
      pt(
        "Pattern: 'Al nacer — despejar vías aéreas — calostro en las primeras dos horas — mínimo 4 litros — yodo en el ombligo — identificación con arete.' Build the protocol.",
        8,
      ),
      sp(
        "Explain: 'La ternera nació hace 20 minutos. Ya le limpié las vías. Ahora le damos calostro de la madre — biberón o sonda — tiene que recibir 4 litros hoy.'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Feed & Ration",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Describe the daily total mixed ration (TMR)",
    steps: [
      r("Read the passage. Focus on nutrition vocabulary.", 7),
      sb(
        "Build a TMR description: silage percentage, hay, concentrate, minerals, water requirements.",
        8,
      ),
      sp(
        "Describe: 'La ración mixta total de hoy lleva 40% silo de maíz, 20% alfalfa, 30% concentrado y 10% subproductos. Mezclamos y entregamos dos veces al día.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Bulk Tank Management",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Manage bulk tank logs and temperature reporting",
    steps: [
      r("Read the passage. Focus on milk quality vocabulary.", 6),
      wm(
        "Match: bulk tank/tanque de enfriamiento, temperature log/registro de temperatura, pickup/recogida, somatic cells/células somáticas, bacteria count/recuento bacteriano",
        8,
      ),
      sp(
        "Log the tank: 'La temperatura del tanque al finalizar el ordeño fue 3.8 grados. El camión recolecta a las 6 AM. La muestra del lunes dio 180,000 células somáticas.'",
        6,
      ),
    ],
  },
  {
    n: 8,
    title: "Breeding Records",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Record and communicate breeding events",
    steps: [
      r("Read the passage. Focus on reproduction vocabulary.", 7),
      pt(
        "Pattern: 'La vaca [número] está en celo — inseminación artificial hoy — registrar en el sistema — revisar preñez en 28 días.' Build breeding record entry.",
        8,
      ),
      sp(
        "Record: 'La número 83 mostró celo esta mañana — monto y vulva roja. Inseminé a las 12 horas. Registro: IA el [fecha] — revisar el 15 del próximo mes.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Dry Cow Management",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Explain the dry-off process and transition period",
    steps: [
      r("Read the passage. Focus on dry cow vocabulary.", 6),
      ds(
        "Explain dry-off: why we stop milking 60 days before calving, what the transition diet looks like, and what to watch for.",
        10,
      ),
      sp(
        "Explain: 'La número 34 se seca hoy. Le aplicamos sellador intramamario en los cuatro cuartos. En 60 días cala. Durante la transición — vigilamos hipocalcemia.'",
        4,
      ),
    ],
  },
  {
    n: 10,
    title: "Lameness Scoring",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Score locomotion and report hoof issues",
    steps: [
      r("Read the passage. Focus on lameness vocabulary.", 6),
      wm(
        "Match: locomotion score/puntuación de locomoción, hoof trimmer/podólogo bovino, white line disease/enfermedad de la línea blanca, digital dermatitis/dermatitis digital, block/bloque ortopédico",
        8,
      ),
      sp(
        "Score and report: 'La número 67 cojea del trasero derecho — locomotion score 3. Reservo al podólogo para mañana — probable dermatitis digital.'",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "Milking Equipment Maintenance",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Report equipment issues and schedule maintenance",
    steps: [
      r("Read the passage. Focus on equipment vocabulary.", 6),
      sb(
        "Build a maintenance checklist: vacuum level, pulsation rate, liner replacement, CIP cycle, milk meter calibration.",
        9,
      ),
      sp(
        "Report: 'La unidad número 4 tiene pulsación irregular. El técnico viene el martes. Mientras tanto, usamos solo tres unidades en ese lado de la sala.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Biosecurity Protocol",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Explain farm biosecurity to a new worker",
    steps: [
      r("Read the passage. Focus on biosecurity vocabulary.", 7),
      pt(
        "Pattern: 'Antes de entrar — desinfección de botas. Sin animales propios en la instalación. Los visitantes — ropa limpia y aprobada. Animales nuevos — cuarentena 21 días.' Build protocol.",
        8,
      ),
      sp(
        "Brief new worker: 'En esta granja — bioseguridad es prioridad. Botas de hule al cruzar el umbral. Nada de animales ajenos sin permiso del gerente.'",
        5,
      ),
    ],
  },
  {
    n: 13,
    title: "Milk Quality Report",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Discuss a quality report with the herd manager",
    steps: [
      r("Read the passage. Focus on quality metrics vocabulary.", 7),
      ds(
        "Review a monthly quality report: SCC trends, bacteria counts, antibiotic residue tests, fat and protein percentages.",
        9,
      ),
      sp(
        "Discuss: 'El recuento bacteriano subió a 25,000. Revisamos el proceso de limpieza del tanque. El alto SCC viene del cuarto grupo de celos tardíos.'",
        4,
      ),
    ],
  },
  {
    n: 14,
    title: "Heat Detection",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Identify and communicate heat detection signs",
    steps: [
      r("Read the passage. Focus on heat detection vocabulary.", 7),
      sb(
        "Build a daily heat detection report: standing heat, secondary signs, activity monitoring data, optimal insemination window.",
        8,
      ),
      sp(
        "Report: 'Tres vacas en celo hoy según el podómetro. La número 21 y 58 — inseminación óptima en 12 horas. La número 31 — segunda lectura esta tarde.'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Emergency Calving",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Communicate a difficult calving event",
    steps: [
      r("Read the passage. Focus on calving emergency vocabulary.", 6),
      pt(
        "Pattern: 'La vaca lleva [tiempo] en trabajo de parto. El ternero está [posición]. Necesitamos [acción].' Build emergency communication.",
        9,
      ),
      sp(
        "Call for help: 'La número 19 lleva dos horas en expulsión y no hay progreso. El becerro viene de cabeza pero sin patas. Necesito al veterinario ahora.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Pasture Rotation",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Plan and communicate a pasture rotation schedule",
    steps: [
      r("Read the passage. Focus on pasture management vocabulary.", 6),
      sb(
        "Build a 5-paddock rotation plan: grazing days, rest days, forage height entry and exit points.",
        9,
      ),
      sp(
        "Explain: 'Hoy movemos el hato al potrero tres. El dos tiene suficiente descanso. El uno — otro día. La rotación de 21 días mantiene el pasto en el punto óptimo.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Silage Making",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Explain the silage process and quality indicators",
    steps: [
      r("Read the passage. Focus on silage vocabulary.", 7),
      wm(
        "Match: silage/ensilaje, inoculant/inoculante, fermentation/fermentación, pH/pH, bunker silo/silo de trinchera, face management/manejo del frente",
        7,
      ),
      sp(
        "Explain: 'El maíz se cosechó al 34% de materia seca. Lo llenamos en el silo y lo cubrimos bien. En 21 días abrimosy el pH debe ser 3.8 a 4.2.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Veterinary Communication",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Report a herd health issue to the vet",
    steps: [
      r("Read the passage. Focus on veterinary communication vocabulary.", 6),
      ds(
        "Report a health issue: how many animals affected, symptoms, duration, any treatments tried, and pen location.",
        10,
      ),
      sp(
        "Report: 'Doctor, tenemos cinco vacas en el grupo fresco con fiebre alta y pérdida de apetito desde ayer. Dos tienen descarga nasal. Ninguna ha respondido al tratamiento inicial.'",
        4,
      ),
    ],
  },
  {
    n: 19,
    title: "Employee Training",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Train a new milker on the parlor protocol",
    steps: [
      r("Read the passage. Focus on training vocabulary.", 6),
      pt(
        "Pattern: 'Primero observas — luego practicas con supervisión — después trabajas solo. Cualquier duda — pregunta antes de actuar.' Build training sequence.",
        9,
      ),
      sp(
        "Train: 'Hoy aprendes el predip y el secado. Mañana — las pezoneras. Al final de la semana — el ciclo completo. Nunca tengas miedo de preguntar.'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Milk Pricing & Market Talk",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Discuss milk pricing factors with a coworker",
    steps: [
      r("Read the passage. Focus on market vocabulary.", 6),
      ds(
        "Discuss: what factors affect milk price — butterfat, protein, SCC, bacteria count, seasonal bonuses.",
        10,
      ),
      sp(
        "Discuss: 'Este mes el precio base baja pero tenemos bono por grasa — nuestras vacas están al 4.1%. El SCC nos penaliza si sube de 200,000.'",
        4,
      ),
    ],
  },
  {
    n: 21,
    title: "Herd Reproduction Goals",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Set and discuss reproduction performance goals",
    steps: [
      r("Read the passage. Focus on reproductive efficiency vocabulary.", 7),
      sb(
        "Build a reproduction KPI report: pregnancy rate, heat detection rate, conception rate, voluntary waiting period.",
        8,
      ),
      sp(
        "Review: 'Nuestra tasa de preñez es 22% — la meta es 25%. La tasa de detección de celos subió al 68% con los podómetros. Concentrémonos en la tasa de concepción.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Young Stock Management",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Explain heifer rearing protocols",
    steps: [
      r("Read the passage. Focus on heifer rearing vocabulary.", 6),
      pt(
        "Pattern: 'Terneras de 0 a 8 semanas — becerro individual — calostro y leche o sustituto. 8 semanas a destete — concentrado de inicio. Meta: primer parto a 23-24 meses.' Build growth plan.",
        9,
      ),
      sp(
        "Explain: 'Las vaquillas en el corral de destete — reciben 2 kilos de concentrado de inicio y acceso libre a heno. Las pasamos al grupo de novillas a los 4 meses.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Water System Maintenance",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Report and fix a water system issue",
    steps: [
      r("Read the passage. Focus on water system vocabulary.", 6),
      sb(
        "Report a water trough issue: identify problem, communicate urgency, assign repair, track resolution.",
        8,
      ),
      sp(
        "Report: 'El bebedero del corral tres tiene la válvula atascada — no llena. Las vacas en ese grupo necesitan agua ahora. Llamo al plomero y traigo agua provisional con manguera.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Record Keeping Systems",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Use farm record systems to look up and update cow data",
    steps: [
      r("Read the passage. Focus on data management vocabulary.", 6),
      wm(
        "Match: DHIA record/registro DHIA, ear tag/arete de identificación, pedigree/pedigrí, lactation curve/curva de lactación, days in milk/días en lactación",
        8,
      ),
      sp(
        "Update the system: 'La número 102 — 45 días en lactación, producción promedio de 38 litros. El IA fue el 15 de abril. Preñez confirmada hoy — parto estimado 20 de enero.'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Weather & Herd Stress Management",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Respond to heat stress in the herd",
    steps: [
      r("Read the passage. Focus on heat stress vocabulary.", 6),
      pt(
        "Pattern: 'Temperatura + humedad alta — índice de calor crítico. Activamos: aspersores — ventiladores — horario nocturno de ordeño — acceso constante al agua.' Build heat plan.",
        9,
      ),
      sp(
        "Respond: 'El índice de calor llegó a 78 hoy. Activamos los aspersores cada 15 minutos. Movemos el ordeño de las 2 PM a las 10 PM para reducir el estrés.'",
        5,
      ),
    ],
  },
  {
    n: 26,
    title: "Milk Hauler Communication",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Communicate with the milk hauler at pickup",
    steps: [
      r("Read the passage. Focus on pickup vocabulary.", 5),
      sb(
        "Build hauler communication: tank temperature, volume estimate, quality issues to disclose, paperwork exchange.",
        9,
      ),
      sp(
        "At pickup: 'Buenos días — el tanque está a 3.5 grados. Aproximadamente 4,200 litros. Sin tratamientos en las últimas 72 horas. Aquí los registros.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Transition Cow Management",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Monitor and communicate transition cow health",
    steps: [
      r("Read the passage. Focus on transition period vocabulary.", 7),
      wm(
        "Match: close-up dry/vacas secas próximas al parto, fresh pen/corral de recientes, subclinical ketosis/cetosis subclínica, NEFA/ácidos grasos no esterificados, fresh cow check/revisión de vacas recientes",
        7,
      ),
      sp(
        "Check: 'La número 28 está en el corral de recientes — día 4 posparto. Come bien, rumen lleno, sin fiebre. La que entró ayer todavía no come — BHBA test mañana.'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Annual Production Review",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Review annual herd production with the owner",
    steps: [
      r("Read the passage. Focus on annual performance vocabulary.", 6),
      ds(
        "Present annual KPIs: milk per cow per day, somatic cell average, pregnancy rate, cull rate, cost per hundredweight.",
        10,
      ),
      sp(
        "Present: 'Este año — promedio de 33 litros por vaca por día. SCC promedio 185,000. Tasa de preñez 23%. Tasa de descarte 28%. El costo por quintal bajó 3% con la nueva ración.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Equipment Breakdown Response",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Manage a milking equipment breakdown mid-shift",
    steps: [
      r("Read the passage. Focus on equipment emergency vocabulary.", 6),
      pt(
        "Pattern: 'El equipo [tipo] falló — [describir síntoma] — vacas en espera — plan alternativo: [acción inmediata] — técnico en camino.' Build emergency response.",
        9,
      ),
      sp(
        "Handle it: 'La bomba de vacío cayó en el ordeño de la tarde. Cerramos la sala — vacas de regreso al corral. El técnico llega en 90 minutos. Ordeño manual de las más llenas.'",
        5,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Shift Leadership",
    readingTemplate: "seed-{lang}-dairy-milking",
    objective: "Run an entire milking shift in the target language",
    steps: [
      r("Read the passage as your shift prep.", 5),
      ds(
        "AI-assisted full shift: morning health checks → milking parlor → calf feeding → fresh cow checks → end-of-shift report. Target language only.",
        12,
      ),
      sp(
        "End-of-shift: 'Turno completado. 87 vacas ordeñadas — 3,100 litros. Una mastitis detectada — tratada. Sin incidentes de seguridad.'",
        3,
      ),
    ],
  },
];

// ── Ranch / Cowboy ────────────────────────────────────────────────────────
export const RANCH_COWBOY_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Ranch Layout",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Name ranch zones, pastures, and infrastructure",
    steps: [
      r("Read the ranch passage. Identify each zone.", 8),
      wm(
        "Match: pasture/potrero, chute/manga de manejo, squeeze chute/cepo, branding pen/corral de herraje, feed lot/corral de engorda",
        7,
      ),
      sp(
        "Describe: 'El rancho tiene seis potreros rotacionales, un corral de manejo con manga y cepo, y un corral de engorda al norte del arroyo.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Roundup Communication",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Coordinate a cattle roundup on horseback",
    steps: [
      r("Read the passage. Focus on roundup vocabulary.", 7),
      pt(
        "Pattern: 'Tú vas al norte — yo rodeo el sur. Cuando tengas el ganado en movimiento, silba. Juntamos en el corral grande.' Build rider assignment calls.",
        8,
      ),
      sp(
        "Assign positions: 'Carlos — toma el arroyo del lado norte. Yo cubro el cerro. Si ves animales sueltos en el cañón, avísame por radio.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Cattle Handling in the Chute",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Direct cattle through the handling system safely",
    steps: [
      r("Read the passage. Focus on handling system vocabulary.", 7),
      sb(
        "Build chute handling calls: entering the alley, pressure and release, closing gates, working the squeeze.",
        8,
      ),
      sp(
        "Direct: 'Abre el paso — uno a la vez. No grites — mantén presión suave desde atrás. Cuando entre al cepo — cierra la palanca. No toques la cabeza.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Branding Day",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Coordinate a branding day team",
    steps: [
      r("Read the passage. Focus on branding vocabulary.", 6),
      wm(
        "Match: brand/hierro, calf/becerro, flank/flanquear, castrate/castrar, vaccinate/vacunar, ear tag/arete",
        8,
      ),
      sp(
        "Coordinate: 'Necesito un flanqueador, un herrador, y dos de vacunas. Trabajan de dos en dos. El becerro entra — flanquean — hierro — vacuna — arete — sueltan.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Fence Repair",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Assign and complete a fence repair task",
    steps: [
      r("Read the passage. Focus on fence repair vocabulary.", 7),
      pt(
        "Pattern: '50 metros de cerca caída en el potrero sur — tres postes rotos — alambre de púas roto en dos lugares. Necesitamos: postes, grapas, alambre y herramientas.' Build repair plan.",
        8,
      ),
      sp(
        "Assign: 'Miguel — los postes del lado este. Yo pongo el alambre. Tú tensas con el tensador. Terminamos antes que llueva.'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Water System Check",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Inspect and report on ranch water sources",
    steps: [
      r("Read the passage. Focus on water system vocabulary.", 6),
      sb(
        "Build a water check report: tank levels, windmill function, pipe leaks, float valves, trough cleanliness.",
        9,
      ),
      sp(
        "Report: 'El molino del potrero dos no estaba bombeando. El tanque estaba bajo. Revisé — la bomba perdió una paleta. Se necesita reparar o el ganado se queda sin agua.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Herd Health Protocol",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Explain a spring vaccination protocol",
    steps: [
      r("Read the passage. Focus on herd health vocabulary.", 7),
      wm(
        "Match: modified live vaccine/vacuna viva modificada, booster/refuerzo, pour-on/pour-on, dewormer/desparasitante, implant/implante",
        7,
      ),
      sp(
        "Explain the protocol: 'Al encerrar en primavera — vacuna de siete vías, refuerzo de Brucella en novillas, implante hormonal y desparasitante pour-on. Todo registrado en la libreta de salud.'",
        6,
      ),
    ],
  },
  {
    n: 8,
    title: "Sorting Cattle",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Sort cattle by class in the corral",
    steps: [
      r("Read the passage. Focus on sorting vocabulary.", 6),
      pt(
        "Pattern: 'Las vacas con cría — al potrero norte. Los novillos de engorda — al corral chico. Los sementales — al encierro. Toros viejos — manga para revisar.' Build sort calls.",
        9,
      ),
      sp(
        "Direct the sort: 'Las pares van a la derecha — las vacas vacías a la izquierda. Los machos al corral del fondo. Separa con calma — no corras el ganado.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Loading & Transport",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Load cattle safely and communicate with the driver",
    steps: [
      r("Read the passage. Focus on transport vocabulary.", 7),
      sb(
        "Build a loading checklist: count, health check, manifest, trailer inspection, tie-down check, weight estimation.",
        8,
      ),
      sp(
        "Communicate with driver: 'Tenemos 24 novillos — promedio de 380 kilos. El manifiesto dice 23 — revisa la jaula — hay uno en la compartición delantera que no contamos.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Grazing Management",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Explain rotational grazing decisions",
    steps: [
      r("Read the passage. Focus on grazing management vocabulary.", 7),
      ds(
        "Plan: which pasture is grazed, how long, when to rotate, what to watch for in forage quality.",
        9,
      ),
      sp(
        "Explain: 'El potrero cuatro lleva seis días de pastoreo — el zacate baja del 30 centímetros. Mañana movemos al cinco. El cuatro descansa 21 días.'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "Calving Season",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Monitor and communicate calving observations",
    steps: [
      r("Read the passage. Focus on calving vocabulary.", 7),
      pt(
        "Pattern: 'La vaca está en trabajo de parto — [tiempo]. Señales: [descripción]. Intervención si no hay progreso en [tiempo].' Build calving protocol.",
        8,
      ),
      sp(
        "Report: 'La 14 lleva una hora en expulsión — patas visibles pero no avanza. Preparamos la cadena obstétrica. Si en 30 minutos no nace, llamo al vet.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Bull Management",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Plan and communicate bull turnout and removal",
    steps: [
      r("Read the passage. Focus on bull management vocabulary.", 6),
      sb(
        "Build bull turnout plan: semen evaluation, body condition check, turnout date, bull:cow ratio, removal date.",
        8,
      ),
      sp(
        "Plan: 'El semental entra al potrero de las vacas el 15 de junio. Ratio — un toro por 25 vacas. Lo retiramos el 15 de agosto. Temporada de monta de 60 días.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Predator Incident Response",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Report a predator attack and coordinate response",
    steps: [
      r("Read the passage. Focus on predator and security vocabulary.", 6),
      ds(
        "Report: animal killed, location, evidence found, immediate steps taken, notify livestock authorities.",
        10,
      ),
      sp(
        "Report: 'Encontramos una vaquilla muerta en el potrero este. Marcas de coyotes. La carcasa ya está en el borde del cerro. Aviso al oficial de ganadería y revisamos la cerca.'",
        4,
      ),
    ],
  },
  {
    n: 14,
    title: "Equipment Operation",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Operate and describe ranch equipment in the target language",
    steps: [
      r("Read the passage. Focus on equipment vocabulary.", 6),
      wm(
        "Match: tractor/tractor, loader/cargador frontal, bale spear/pica pacas, post driver/colocador de postes, ATV/cuatrimoto",
        7,
      ),
      sp(
        "Instruct: 'Para mover las pacas — monta el pica pacas en el cargador frontal. Engancha la paca de lado. Levanta despacio — no corras el tractor con paca en alto.'",
        7,
      ),
    ],
  },
  {
    n: 15,
    title: "Hay Production",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Explain hay cutting, tedding, and baling",
    steps: [
      r("Read the passage. Focus on hay production vocabulary.", 7),
      pt(
        "Pattern: 'Cortamos cuando el zacate tiene 20% de humedad — tendemos para secar dos días — empacamos cuando baja al 16-18%.' Build hay operation plan.",
        8,
      ),
      sp(
        "Explain: 'El alfalfa del potrero dos está listo para cortar. Lo cortamos mañana si no llueve. Tendemos jueves y viernes. Empacamos el sábado temprano.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Ranch Inventory",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Count and report ranch inventory",
    steps: [
      r("Read the passage. Focus on inventory vocabulary.", 6),
      sb(
        "Build an inventory checklist: cattle count by class, hay inventory, fencing materials, vaccines, fuel.",
        8,
      ),
      sp(
        "Report: 'El inventario de hoy — 142 vacas pares, 38 novillos de engorda, 4 sementales. Paja — 340 pacas. Alambre — dos rollos. Vacuna de 7 vías — 80 dosis restantes.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Drought Response Plan",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Discuss drought management options",
    steps: [
      r("Read the passage. Focus on drought management vocabulary.", 6),
      ds(
        "Discuss: early culling, hay purchase, lease pasture, water hauling, feed supplements, destocking decision.",
        10,
      ),
      sp(
        "Discuss: 'El potrero norte está muy seco. Tenemos tres opciones — compramos heno extra, arrendamos agostadero, o vendemos las vacas vacías ahora antes de que el precio baje más.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Fire Emergency on the Ranch",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Communicate a range fire emergency",
    steps: [
      r("Read the passage. Focus on emergency vocabulary.", 6),
      pt(
        "Pattern: 'Fuego en el [lugar]. Viento hacia [dirección]. Ganado en peligro en el potrero [número]. Necesitamos [recursos].' Build fire emergency call.",
        9,
      ),
      sp(
        "Call: 'Fuego en el cerro del sur — viento del oeste. El ganado del potrero tres está en el camino. Muévelo al corral ahora. Llamo al departamento de bomberos forestales.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Rodeo Event Coordination",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Coordinate a ranch rodeo or sorting event",
    steps: [
      r("Read the passage. Focus on rodeo vocabulary.", 6),
      sb("Plan a team sorting or penning event: teams, animals, rules, timing, safety.", 9),
      sp(
        "Announce: 'El equipo tiene 90 segundos para separar 10 animales por número. Sin dejar entrar a los que no corresponden. Árbitro listo. ¿Listos? ¡Ya!'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Night Watch Protocol",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Explain a night calving or security watch",
    steps: [
      r("Read the passage. Focus on night watch vocabulary.", 6),
      pt(
        "Pattern: 'Recorrido cada dos horas — revisa [área]. Reporta: [animal en trabajo de parto / cerca caída / animal suelto]. Radio encendido.' Build watch protocol.",
        9,
      ),
      sp(
        "Brief the night hand: 'Tu turno es de las 10 PM a las 4 AM. Recorre los corrales de maternidad cada dos horas. Cualquier vaca que empuje — llámame.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Mineral Supplementation",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Explain mineral supplementation for grazing cattle",
    steps: [
      r("Read the passage. Focus on mineral vocabulary.", 7),
      wm(
        "Match: salt lick/bloque de sal, mineral block/bloque mineral, selenium/selenio, magnesium/magnesio, free choice/libre acceso",
        7,
      ),
      sp(
        "Explain: 'Ponemos bloque mineral con selenio al inicio del pastoreo. El zacate de este potrero tiene bajo magnesio en primavera — riesgo de hipomagnesemia. El bloque lo previene.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Branding Record Entry",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Record branding day data in the herd records",
    steps: [
      r("Read the passage. Focus on record keeping vocabulary.", 6),
      sb(
        "Build a branding day record: date, herd size, number branded, castrations, vaccinations, weights if available.",
        8,
      ),
      sp(
        "Record: 'Día de herraje — 15 de mayo. 43 becerros procesados. 27 machos castrados. Vacuna de 7 vías y desparasitante. Promedio estimado de 85 kilos. Arete del 200 al 242.'",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Road Trip to Sale Barn",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Communicate at a livestock auction",
    steps: [
      r("Read the passage. Focus on auction vocabulary.", 6),
      ds(
        "Walk through: check-in, weighing, sorting pens, bidding process, buyer communication after sale.",
        10,
      ),
      sp(
        "At the auction: 'Buenos días — traigo 18 novillos de engorda. Aquí el certificado de salud. ¿En qué corral los recibo? ¿A qué hora entra mi lote al ring?'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Wildlife & Land Stewardship",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Discuss wildlife management on the ranch",
    steps: [
      r("Read the passage. Focus on land stewardship vocabulary.", 7),
      ds(
        "Discuss: leaving riparian areas for wildlife, managing invasive species, collaborating with wildlife agencies, water for deer and elk.",
        9,
      ),
      sp(
        "Explain: 'Dejamos 50 metros de cada arroyo sin pastoreo para los venados y aves. También tenemos acuerdo con el departamento de caza para monitorear el antílope.'",
        4,
      ),
    ],
  },
  {
    n: 25,
    title: "Contractor Communication",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Hire and brief a fence or well contractor",
    steps: [
      r("Read the passage. Focus on contractor vocabulary.", 6),
      sb(
        "Build a contractor brief: scope of work, location, timeline, materials, access instructions.",
        8,
      ),
      sp(
        "Brief: 'Necesito un nuevo pozo en el potrero norte — a 300 metros del molino actual. El acceso es por la puerta del camino de tierra. Empezar el lunes si el clima lo permite.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Land Lease Negotiation",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Discuss a pasture lease with a landowner",
    steps: [
      r("Read the passage. Focus on land lease vocabulary.", 6),
      ds(
        "Negotiate: acreage, rate per animal unit month, lease term, fencing responsibility, water access.",
        10,
      ),
      sp(
        "Negotiate: 'Le ofrezco 12 dólares por AUM por el potrero de 200 acres. Me comprometo a mantener la cerca sur. ¿Incluye el agua del pozo o pongo mi propio depósito?'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Cow-Calf Pair Check",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Verify bonding and nursing in cow-calf pairs",
    steps: [
      r("Read the passage. Focus on pair management vocabulary.", 6),
      pt(
        "Pattern: 'La vaca [número] — ¿acepta al becerro? ¿El becerro mamó? ¿Tiene suficiente leche? ¿Arete visible? ¿Ombligo sano?' Build pair check protocol.",
        9,
      ),
      sp(
        "Check and report: 'La número 67 rechaza al becerro — ata a la vaca. El becerro número 31 no ha mamado en 8 horas — revisamos tetillas y ponemos sonda si es necesario.'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Ranch Budget Review",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Review a ranch budget with the owner",
    steps: [
      r("Read the passage. Focus on financial vocabulary.", 6),
      ds(
        "Review: cattle sales income, hay and feed costs, vet and supplies, labor, fuel, and land lease. What's the margin?",
        10,
      ),
      sp(
        "Present: 'Venta de ganado generó 145,000. Costos de forraje — 32,000. Vet y medicamentos — 8,500. Mano de obra — 40,000. El margen neto fue de 38,000 — mejor que el año pasado.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "End-of-Day Report",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Deliver a complete end-of-day ranch report",
    steps: [
      r("Read the passage. Focus on reporting vocabulary.", 6),
      sb(
        "Build a daily report: animal status, tasks completed, issues found, maintenance needed, tomorrow's plan.",
        8,
      ),
      sp(
        "Report: 'Fin del día — el hato está bien. Reparamos 200 metros de cerca sur. Encontramos una vaca cojeando — Dr. García viene mañana. Mañana — movemos el ganado al potrero seis.'",
        6,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Ranch Day",
    readingTemplate: "seed-{lang}-ranch-roundup",
    objective: "Operate a full ranch day in the target language",
    steps: [
      r("Read the passage as your morning prep.", 5),
      ds(
        "AI-assisted full day: morning check → roundup call → handling → veterinary event → end-of-day report. Target language only.",
        12,
      ),
      sp(
        "End-of-day: 'Día completo — [summary of work done]. Sin emergencias. Plan de mañana: [next task].'",
        3,
      ),
    ],
  },
];

// ── Meatpacking / Butcher ─────────────────────────────────────────────────
export const MEATPACKING_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Processing Floor",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Name the zones of a meatpacking facility",
    steps: [
      r("Read the butcher/sanitation passage. Identify each zone.", 8),
      wm(
        "Match: kill floor/sala de matanza, fabrication/sala de despiece, cooler/cámara frigorífica, sanitation crew/equipo de saneamiento, USDA inspector/inspector del USDA",
        7,
      ),
      sp(
        "Describe the floor: 'Empezamos en la sala de matanza, el animal pasa a la cámara en 45 minutos. Desde la cámara, el despiece empieza después de 12 horas a 1 grado.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Knife Safety & Sharpening",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain knife safety and sharpening procedures",
    steps: [
      r("Read the passage. Focus on knife safety vocabulary.", 7),
      pt(
        "Pattern: 'Siempre corta alejándote del cuerpo. El cuchillo sin filo es más peligroso que el afilado. Afilas con el chaira antes de cada tarea.' Build safety instruction.",
        8,
      ),
      sp(
        "Instruct: 'El cuchillo de deshuesado — afílalo antes de cada res. Usa el guante de malla en la mano de soporte. Nunca dejes el cuchillo en la mesa con el filo expuesto.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Sanitation Protocol",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain the SSOPs and daily sanitation procedures",
    steps: [
      r("Read the passage. Focus on sanitation vocabulary.", 7),
      sb(
        "Build a sanitation shift plan: pre-op inspection, chemical setup, breakdown cleaning, sanitize, pre-op check.",
        8,
      ),
      sp(
        "Brief the crew: 'Pre-operacional a las 4 AM. Limpian todas las sierras y bandas antes de que el USDA inspeccione. Si hay falla — no producción hasta que se apruebe.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Line Speed & Quotas",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Communicate production targets and line speed",
    steps: [
      r("Read the passage. Focus on production vocabulary.", 6),
      wm(
        "Match: chain speed/velocidad de cadena, head/count/cabezas procesadas, rework/reproceso, downtime/tiempo muerto, efficiency/eficiencia",
        8,
      ),
      sp(
        "Set expectations: 'La meta de hoy son 340 cabezas. La cadena corre a 250 por hora. Si hay tiempo muerto — lo recuperamos en el turno de tarde. Cero reproceso en cortes A.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "USDA Inspection Communication",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Interact with a USDA inspector professionally",
    steps: [
      r("Read the passage. Focus on inspection vocabulary.", 7),
      pt(
        "Pattern: 'Buenos días, inspector. Aquí los registros de temperatura de ayer. La retención del lote 12 — ya fue resuelta. ¿Necesita algo más?' Build inspector interaction.",
        8,
      ),
      sp(
        "Interact: 'Inspector, el corte que marcó ayer — lo desviamos a reproceso. El supervisor lo revisó y aprobó. Aquí el formulario de disposición.'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Primal Cut Breakdown",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Identify and cut primal sections of beef",
    steps: [
      r("Read the passage. Focus on primal cut vocabulary.", 7),
      wm(
        "Match: chuck/paleta, rib/costillar, loin/lomo, round/pierna, brisket/pecho, flank/falda",
        8,
      ),
      sp(
        "Explain cuts: 'Empezamos con el lomo — sacamos el T-bone y el striploin. La paleta va a molienda de calidad A. El pecho — cortamos brisket y lo separamos para ahumado.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Cold Chain Compliance",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Monitor and document cold chain temperatures",
    steps: [
      r("Read the passage. Focus on cold chain vocabulary.", 6),
      sb(
        "Build a temperature log: kill floor exit temp, 12-hour carcass temp, fabrication room temp, boxed product temp, shipping temp.",
        9,
      ),
      sp(
        "Document: 'La canal 347 salió de la sala de matanza a las 2 PM con temperatura superficial de 28°C. A las 2 AM — 3.2°C. Cadena fría cumplida. Liberada para despiece.'",
        6,
      ),
    ],
  },
  {
    n: 8,
    title: "Ground Beef Production",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Supervise a ground beef production run",
    steps: [
      r("Read the passage. Focus on ground beef vocabulary.", 7),
      pt(
        "Pattern: 'El blend de hoy es 80/20 — 80% magro y 20% grasa. Usamos paleta trimming y grasa de costilla. El grinder primero — mixer después — formado y empaque.' Build production sequence.",
        8,
      ),
      sp(
        "Brief the crew: 'El blend de hoy — 80/20. Paleta y grasa de costilla en proporción 4 a 1. Temperatura del producto no debe pasar 4°C durante el proceso. Empezamos.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Personal Protective Equipment",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Ensure PPE compliance on the line",
    steps: [
      r("Read the passage. Focus on PPE vocabulary.", 6),
      wm(
        "Match: chain mail glove/guante de malla, hard hat/casco, apron/mandil, steel-toed boot/bota con puntera de acero, ear protection/protección auditiva",
        8,
      ),
      sp(
        "Check PPE: 'Antes de entrar a la sala — casco, mandil, guante de malla en la mano de soporte, botas con puntera. Sin protección auditiva — no entra a la sala de sierras.'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Ergonomic Injury Prevention",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Teach ergonomic practices to prevent repetitive strain",
    steps: [
      r("Read the passage. Focus on ergonomics vocabulary.", 6),
      pt(
        "Pattern: 'Mano neutral — no dobles la muñeca al cortar. Alterna la mano de soporte cada 30 minutos. Estira los antebrazos durante el descanso.' Build ergonomic training.",
        9,
      ),
      sp(
        "Train: 'Las lesiones por movimiento repetitivo son las más comunes aquí. Mano neutral siempre. Si sientes hormigueo en los dedos — repórtalo de inmediato al supervisor.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Line Communication During Production",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Use standard communication signals on the production line",
    steps: [
      r("Read the passage. Focus on production floor communication.", 7),
      sb(
        "Build signal vocabulary: chain stop, rework hold, call inspector, first aid needed, speed up, break time.",
        8,
      ),
      sp(
        "Communicate: 'Cadena — alto. Hay un punto de retención en la posición 7. Que inspección revise. Mientras tanto — el equipo descansa dos minutos.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Allergen & Label Compliance",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain allergen segregation and labeling requirements",
    steps: [
      r("Read the passage. Focus on allergen and labeling vocabulary.", 6),
      ds(
        "Explain: how allergens (soy in marinades, milk in blends) must be tracked, labeled, and segregated on the line.",
        10,
      ),
      sp(
        "Brief: 'El producto marinado con soya — línea separada. El empaque lleva el alérgeno impreso. Limpieza total entre corridas de productos con y sin alérgeno. Sin excepciones.'",
        4,
      ),
    ],
  },
  {
    n: 13,
    title: "HACCP Critical Control Points",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Monitor HACCP critical control points on the line",
    steps: [
      r("Read the passage. Focus on HACCP vocabulary.", 7),
      wm(
        "Match: critical control point/punto crítico de control, critical limit/límite crítico, corrective action/acción correctiva, monitoring log/registro de monitoreo, hazard/peligro",
        7,
      ),
      sp(
        "Monitor: 'El PCC del lethality step es la temperatura interna del producto cocinado — mínimo 71°C. Si baja del límite — paro inmediato y acción correctiva. Registro en el formulario HACCP.'",
        6,
      ),
    ],
  },
  {
    n: 14,
    title: "Boxed Beef Labeling",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Label and pack boxed beef to specification",
    steps: [
      r("Read the passage. Focus on boxed beef vocabulary.", 6),
      sb(
        "Build a pack label: establishment number, product name, cut code, net weight, pack date, use-by date, USDA mark.",
        8,
      ),
      sp(
        "Verify the label: 'El box lleva — establecimiento 1234 — striploin selecto — 12.4 kilos — fecha de empaque hoy — úsese antes de 35 días. La etiqueta del USDA está centrada.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "New Employee Orientation",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Orient a new employee on their first day",
    steps: [
      r("Read the passage. Focus on orientation vocabulary.", 6),
      pt(
        "Pattern: 'Bienvenido — hoy es orientación. Vemos: seguridad, sanidad, tu función en la línea, dónde reportar si estás enfermo, y cómo usar el equipo de protección.' Build orientation outline.",
        9,
      ),
      sp(
        "Orient: 'Tu primera semana — observas antes de cortar solo. Cada error que reportas voluntariamente se maneja diferente que el que escondo. Aquí somos un equipo.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Foreign Material Control",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain foreign material prevention and response",
    steps: [
      r("Read the passage. Focus on foreign material vocabulary.", 6),
      ds(
        "Explain: metal detection systems, broken knife blade protocol, bone fragment management, glass and plastic control.",
        10,
      ),
      sp(
        "Explain: 'Si se rompe la hoja de un cuchillo — paro de línea. Contamos todos los fragmentos. No continuamos hasta encontrar cada pieza. Reportamos al supervisor de calidad.'",
        4,
      ),
    ],
  },
  {
    n: 17,
    title: "Product Recall Protocol",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain a product recall procedure",
    steps: [
      r("Read the passage. Focus on recall vocabulary.", 6),
      sb(
        "Build a recall workflow: identify lot, trace distribution, contact accounts, pull product, report to USDA, communicate to team.",
        9,
      ),
      sp(
        "Brief: 'El lote del día 12 tiene posible contaminación de E. coli. Trazamos 8 distribuidores. Llamamos a todos antes de las 5 PM. El producto está en cuarentena hasta confirmación del laboratorio.'",
        5,
      ),
    ],
  },
  {
    n: 18,
    title: "Overtime & Fatigue Management",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Manage overtime fatigue on the floor",
    steps: [
      r("Read the passage. Focus on fatigue management vocabulary.", 6),
      pt(
        "Pattern: 'Cuando el equipo está cansado — los accidentes suben. Programamos descansos cada 2 horas. Nadie corta más de 4 horas sin rotación de posición.' Build fatigue protocol.",
        9,
      ),
      sp(
        "Address the team: 'Llevamos 10 horas. Todos rotan de posición en el siguiente descanso. Si alguien siente que ya no puede cortar con control — dilo — sin consecuencias.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Shrink & Yield Tracking",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Calculate and discuss product yield",
    steps: [
      r("Read the passage. Focus on yield vocabulary.", 7),
      wm(
        "Match: trim loss/merma de recorte, yield grade/grado de rendimiento, shrink/merma, fat cap/capa de grasa, dressing percentage/porcentaje de rendimiento en canal",
        7,
      ),
      sp(
        "Discuss yield: 'El rendimiento de hoy en striploin fue del 74% — la meta es 76%. Revisamos la técnica de desgrasa. Dos centímetros de grasa sobran en la mayoría de las piezas.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Export Compliance",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain export documentation requirements",
    steps: [
      r("Read the passage. Focus on export vocabulary.", 6),
      sb(
        "Build an export doc checklist: health certificate, USDA EV stamp, country-specific requirements, cold chain documentation, vessel booking.",
        8,
      ),
      sp(
        "Explain: 'El embarque para Japón necesita — certificado sanitario del USDA, sello EV en cada caja, y registro de temperatura del contenedor. El agente aduanal confirma mañana.'",
        6,
      ),
    ],
  },
  {
    n: 21,
    title: "Overtime Shift Handoff",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Hand off a shift with all necessary information",
    steps: [
      r("Read the passage. Focus on shift handoff vocabulary.", 6),
      pt(
        "Pattern: 'En este turno procesamos [cantidad]. Retención activa en [lote]. El inspector marcó [observación]. Limpieza de [equipo] pendiente. Mañana el supervisor necesita [acción].' Build handoff script.",
        9,
      ),
      sp(
        "Hand off: 'Este turno — 280 cabezas. Retención en el lote 8 — esperando resultado del lab. La sierra 3 — ruido inusual — avisen al mecánico al inicio del siguiente turno.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "Lockout/Tagout Procedures",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain lockout/tagout before equipment maintenance",
    steps: [
      r("Read the passage. Focus on LOTO vocabulary.", 7),
      sb(
        "Build LOTO steps: notify supervisor → de-energize → apply lock → verify zero energy → perform maintenance → remove lock → restart.",
        8,
      ),
      sp(
        "Explain: 'Antes de limpiar por dentro de la sierra — corta la energía, aplica tu candado personal, verifica que no arranca. Nadie más puede quitar tu candado. Solo tú.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Food Safety Culture",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Discuss food safety culture with the team",
    steps: [
      r("Read the passage. Focus on food safety culture vocabulary.", 6),
      ds(
        "Discuss: why food safety is everyone's job, how to report issues without fear, how consumer trust depends on the team.",
        10,
      ),
      sp(
        "Motivate: 'Las familias que compran esta carne confían en nosotros. Una sola contaminación — daña a personas reales. Por eso reportamos todo, sin importar quién lo causó.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Ammonia Refrigeration Safety",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Explain ammonia leak response procedures",
    steps: [
      r("Read the passage. Focus on refrigeration safety vocabulary.", 6),
      pt(
        "Pattern: 'Si huele a amoniaco fuerte — evacúa la zona. No corras. Respira por la nariz. Reporta al cuarto de máquinas. El equipo de respuesta toma el control.' Build emergency response.",
        9,
      ),
      sp(
        "Brief: 'El amoniaco tiene un olor característico — si lo detectas — sal de la zona calmado. No ayudes si no tienes entrenamiento. Espera afuera y confirma que todos salieron.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Seasonal Staffing",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Train temporary seasonal workers quickly",
    steps: [
      r("Read the passage. Focus on training vocabulary.", 6),
      sb(
        "Build a rapid onboarding plan: safety basics, one task only on day 1, buddy system, report-in process.",
        8,
      ),
      sp(
        "Brief the temp crew: 'Hoy aprenden una sola tarea. Trabajan con un compañero asignado. Si no entienden algo — paren y pregunten. No adivinamos aquí — el producto va a familias.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Bone Fragment Audit",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Conduct and document a bone fragment audit",
    steps: [
      r("Read the passage. Focus on audit vocabulary.", 6),
      wm(
        "Match: X-ray machine/máquina de rayos X, bone fragment/fragmento de hueso, reject/rechazo, rework table/mesa de reproceso, audit log/registro de auditoría",
        8,
      ),
      sp(
        "Document: 'La auditoría de huesos de hoy — 6 piezas rechazadas de 400. Tasa del 1.5% — dentro del límite de 2%. Las 6 piezas van a la mesa de reproceso. Registro actualizado.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Plant Efficiency Meeting",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Participate in a production efficiency review meeting",
    steps: [
      r("Read the passage. Focus on efficiency vocabulary.", 6),
      ds(
        "Review: today's throughput vs. target, downtime causes, quality rejections, and one improvement for tomorrow.",
        10,
      ),
      sp(
        "Contribute: 'El tiempo muerto de hoy fue por la sierra 2 — 18 minutos. Si inspeccionamos las cuchillas a las 4 AM, antes de la cadena, lo evitamos mañana.'",
        4,
      ),
    ],
  },
  {
    n: 28,
    title: "Community & Workforce Relationships",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Discuss workforce communication and community relationships",
    steps: [
      r("Read the passage. Focus on workforce relations vocabulary.", 6),
      ds(
        "Discuss: multilingual workplace communication, respecting cultural differences, ESL support programs, worker dignity.",
        10,
      ),
      sp(
        "Reflect: 'Este trabajo lo hacen muchas personas de distintos países. Cuando el supervisor habla español, la producción mejora. El respeto en el idioma de cada quien importa.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Shift Safety Meeting",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Run a 5-minute shift safety meeting",
    steps: [
      r("Read the passage as shift prep.", 5),
      sb(
        "Build a safety minute structure: one safety observation, one near-miss from last week, one reminder, one positive shout-out.",
        9,
      ),
      sp(
        "Run it: 'Buenos días. Esta semana — cero accidentes. La semana pasada — casi accidente en la posición 12 por cuchillo en mesa. El recordatorio: filo siempre cubierto al no usar.'",
        6,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Processing Shift",
    readingTemplate: "seed-{lang}-butcher-sanitation",
    objective: "Lead an entire processing shift in the target language",
    steps: [
      r("Read the passage as shift prep.", 5),
      ds(
        "AI-assisted full shift: pre-op briefing → production → USDA interaction → quality hold → end-of-shift report. Target language only.",
        12,
      ),
      sp(
        "End of shift: 'Turno terminado — [head count] cabezas. Incidentes: [summary]. HACCP — en conformidad. Limpieza inicia en 30 minutos.'",
        3,
      ),
    ],
  },
];

// ── Restaurant & Hospitality ──────────────────────────────────────────────
export const RESTAURANT_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Restaurant Layout",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Name the zones of a restaurant",
    steps: [
      r("Read the restaurant passage. Identify each zone.", 8),
      wm(
        "Match: front of house/sala, back of house/cocina, expo window/ventana de pase, walk-in cooler/cámara de refrigeración, server station/estación de servicio",
        7,
      ),
      sp(
        "Describe: 'El restaurante tiene sala con 60 cubiertos, la cocina detrás de la ventana de pase, y la bodega de bebidas al fondo del pasillo.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Morning Prep List",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Communicate and assign morning prep tasks",
    steps: [
      r("Read the passage. Focus on prep vocabulary.", 7),
      pt(
        "Pattern: 'La mise en place de hoy — brunoise de cebolla 5 kilos, fondo de pollo 10 litros, masa para pasta 3 kilos, vinagreta emulsionada 2 litros.' Build prep assignment.",
        8,
      ),
      sp(
        "Assign: 'Carlos — las salsas madres. María — el corte de verduras. Yo — los fondos. Meta: todo listo para las 11 AM. Comenzamos.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Taking a Table Order",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Take a full table order in the target language",
    steps: [
      r("Read the passage. Focus on order-taking vocabulary.", 7),
      sb(
        "Build a 4-top order: appetizer, entrée, cooking temp preferences, modifications, drinks.",
        8,
      ),
      sp(
        "Take the order: 'Las entradas — las dos ensesadas César y los calamares. Para el plato principal — ¿cómo quieren el filete? ¿Con la guarnición de papa o ensalada?'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Allergen Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Handle an allergen request from a guest",
    steps: [
      r("Read the passage. Focus on allergen vocabulary.", 6),
      wm(
        "Match: gluten-free/sin gluten, nut allergy/alergia a nueces, dairy-free/sin lácteos, cross-contamination/contaminación cruzada, modify/modificar",
        8,
      ),
      sp(
        "Handle: 'La señora en la mesa 7 tiene alergia al maní — severa. Aviso a la cocina antes de tomar el pedido. El chef confirma qué platos son seguros sin modificar la receta.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Expo Window Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Run the expo window during a dinner service",
    steps: [
      r("Read the passage. Focus on expo communication vocabulary.", 7),
      pt(
        "Pattern: 'Mesa 12 — dos filetes temperatura media, un risotto sin queso, un salmón. ¿Todo listo? Pase cuando el salmón salga.' Build expo window calls.",
        8,
      ),
      sp(
        "Call the pass: 'Mesa 4 — listo — tres entradas: dos tapas de pulpo y un carpaccio. La mesa 8 — ¿cuánto falta para los tres platos?'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Kitchen Hierarchy",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Understand and use kitchen titles and chain of command",
    steps: [
      r("Read the passage. Focus on kitchen hierarchy vocabulary.", 6),
      wm(
        "Match: executive chef/chef ejecutivo, sous chef/subchef, line cook/cocinero de línea, prep cook/ayudante de cocina, dishwasher/lavaplatos",
        8,
      ),
      sp(
        "Introduce: 'Soy el subchef — trabajo directo con el chef ejecutivo. Si hay problema en la línea, vienes a mí primero. El chef ejecutivo se involucra si no puedo resolverlo.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Station Setup",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Set up a cook's station before service",
    steps: [
      r("Read the passage. Focus on station vocabulary.", 7),
      sb(
        "Build a station setup checklist: clean surfaces, mise en place organization, heat levels, ticket rail ready, tools in place.",
        8,
      ),
      sp(
        "Confirm station: 'Mi estación está lista — salsas a temperatura, mise en place completo, la plancha a 200 grados, tickets vacíos en el riel. Listo para el servicio.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "During-Service Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Communicate effectively during a busy service rush",
    steps: [
      r("Read the passage. Focus on service rush vocabulary.", 6),
      pt(
        "Pattern: 'Calling — mesa 9 — un pollo, dos pastas — all day: tres pollos, cinco pastas. ¿Cuánto tiempo?' Build ticket-calling system.",
        9,
      ),
      sp(
        "Call it: 'All day — seis entradas, cuatro filetes, dos vegetarianos. La mesa 15 necesita el plato en 8 minutos — VIP. Avísenme cuando salga.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Complaint Handling",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Handle a guest complaint professionally",
    steps: [
      r("Read the passage. Focus on complaint handling vocabulary.", 6),
      ds(
        "Scenario: the guest received the wrong dish. How do you apologize, fix it, and recover the table?",
        10,
      ),
      sp(
        "Handle: 'Disculpe — entiendo su molestia. Voy a retirar el plato ahora mismo y su correcto sale en 5 minutos. Le ofrezco una copa de cortesía mientras espera.'",
        4,
      ),
    ],
  },
  {
    n: 10,
    title: "Wine Service",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Describe wines and complete a table-side pour",
    steps: [
      r("Read the passage. Focus on wine service vocabulary.", 7),
      wm(
        "Match: tannin/tanino, dry/seco, sommelier/sumiller, decant/decantar, pairing/maridaje, vintage/añada",
        7,
      ),
      sp(
        "Present wine: 'Este Malbec de Mendoza — 2021 — tiene notas de ciruela y tabaco. Taninos suaves, final largo. Combina perfectamente con el filete que ordenó. ¿Prueba?'",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "Closing Duties",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Assign and complete closing tasks",
    steps: [
      r("Read the passage. Focus on closing vocabulary.", 6),
      sb(
        "Build a closing checklist: counts, cleaning stations, wrapping prep, labeling, locking walk-in, final walkthrough.",
        8,
      ),
      sp(
        "Assign closing: 'Carlos — la cámara de carnes etiquetada. Ana — las salsas cubiertas y fechadas. Yo hago el conteo del bar. Nos vemos en 45 minutos para la revisión final.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Staff Meal Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Plan and announce staff meal",
    steps: [
      r("Read the passage. Focus on staff communication vocabulary.", 5),
      pt(
        "Pattern: 'La comida del personal hoy — arroz con pollo — en la mesa grande a las 4:30. Coman antes del servicio — no durante.' Build staff meal announcement.",
        9,
      ),
      sp(
        "Announce: 'Atención equipo — la comida es a las 4:30 hoy. Hay suficiente para todos. Quien no pueda comer a esa hora — habla conmigo.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Inventory Count",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Conduct and communicate a food inventory count",
    steps: [
      r("Read the passage. Focus on inventory vocabulary.", 6),
      wm(
        "Match: FIFO/PEPS (primero en entrar, primero en salir), shelf life/vida útil, spoilage/desperdicio, par level/nivel mínimo de existencia, purchase order/orden de compra",
        8,
      ),
      sp(
        "Report inventory: 'En el recuento de hoy — el salmón está por debajo del nivel mínimo — pedimos 10 kilos para mañana. El queso de cabra — caducidad en dos días — lo ponemos en el especial.'",
        6,
      ),
    ],
  },
  {
    n: 14,
    title: "Training a New Server",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Shadow and train a new server",
    steps: [
      r("Read the passage. Focus on service training vocabulary.", 7),
      pt(
        "Pattern: 'Primero observas tres mesas conmigo. Después — tú tomas el pedido, yo estoy detrás. La tercera semana — tus propias mesas.' Build training progression.",
        8,
      ),
      sp(
        "Train: 'Cuando te presentes a la mesa — sonríe, di tu nombre, ofrece agua y la carta. No empujes el vino en la primera visita. Lee a los clientes primero.'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Temperature Logging",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Complete food temperature logs during service",
    steps: [
      r("Read the passage. Focus on food safety vocabulary.", 6),
      sb(
        "Build a temperature log routine: walk-in at open, hot holding check, cooling log, soup temp, final close check.",
        8,
      ),
      sp(
        "Log temps: 'Walk-in de carnes a las 10 AM — 2.1 grados. La sopa en baño maría — 74 grados. El salmón enfriándose — 18 grados en 2 horas — dentro del rango seguro.'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "Banquet Coordination",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Coordinate a private event service",
    steps: [
      r("Read the passage. Focus on banquet vocabulary.", 7),
      ds(
        "Plan a 50-person dinner: timeline, station assignments, dietary restrictions, serving sequence, coordination with kitchen.",
        9,
      ),
      sp(
        "Brief the banquet team: '7 PM llegan los 50 invitados. La entrada — ensalada familiar a las 7:30. A las 8 PM — el buffet caliente. Todo en punto. Ana coordina bebidas, Carlos los platos.'",
        4,
      ),
    ],
  },
  {
    n: 17,
    title: "Cocktail Knowledge",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Describe and sell cocktails in the target language",
    steps: [
      r("Read the passage. Focus on bar vocabulary.", 7),
      wm(
        "Match: muddled/macerado, garnish/guarnición, on the rocks/con hielo, neat/solo, mocktail/sin alcohol, shaken/agitado",
        7,
      ),
      sp(
        "Describe: 'El mojito de la casa lleva ron blanco de Cuba, menta fresca macerada, lima, azúcar de caña, y agua con gas. Lo servimos con hielo triturado y una ramita de menta.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Portion Control",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Explain and enforce portion control standards",
    steps: [
      r("Read the passage. Focus on portion control vocabulary.", 6),
      pt(
        "Pattern: 'El filete — 250 gramos antes de cocinar. La pasta — 120 gramos seco. La guarnición — 80 gramos. Pesa en caso de duda — la consistencia protege el margen.' Build standards.",
        9,
      ),
      sp(
        "Reinforce: 'La porción de salmón es 180 gramos — fileteado y pesado en crudo. Si das 220 cada vez — perdemos 400 dólares en ventas de salmón al mes.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Health Code Inspection Prep",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Prepare the kitchen for a health inspection",
    steps: [
      r("Read the passage. Focus on health inspection vocabulary.", 6),
      sb(
        "Build an inspection prep checklist: temperature logs current, labels on all containers, FIFO enforced, handwashing stations stocked, pest evidence removed.",
        8,
      ),
      sp(
        "Brief: 'El inspector viene esta semana. Revisen: cada contenedor con fecha y producto. Nada en el suelo. Termómetros calibrados. Las manos — lavado correcto obligatorio.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Upselling Techniques",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Practice upselling in Spanish/target language",
    steps: [
      r("Read the passage. Focus on upselling vocabulary.", 6),
      ds(
        "Practice upselling: suggesting wine pairings, dessert timing, premium proteins, add-ons, and cocktail recommendations.",
        10,
      ),
      sp(
        "Upsell: '¿Le gustaría empezar con un cóctel de bienvenida? Tenemos un margarita de mango que combina perfectamente con la entrada que eligió.'",
        4,
      ),
    ],
  },
  {
    n: 21,
    title: "POS System Usage",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Navigate a POS system in the target language",
    steps: [
      r("Read the passage. Focus on POS vocabulary.", 6),
      wm(
        "Match: void/cancelar, comp/cortesía, split check/dividir cuenta, modifier/modificador, fire time/tiempo de salida",
        8,
      ),
      sp(
        "Use the POS: 'La mesa 9 quiere dividir la cuenta en tres. En el sistema — seleccionas los ítems de cada persona — separas — imprimes tres cuentas distintas.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Receiving Deliveries",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Receive and inspect a food delivery",
    steps: [
      r("Read the passage. Focus on receiving vocabulary.", 6),
      sb(
        "Build a delivery inspection checklist: temperature check, date verification, quantity count, quality visual, sign-off or rejection.",
        8,
      ),
      sp(
        "Inspect: 'La entrega de pollo — temperatura al recibir 3.5 grados — bien. Fecha de empaque ayer — bien. Conteo — 15 kilos, el pedido era 20. Llamamos al proveedor ahora.'",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Rush Hour Problem Solving",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Solve a kitchen problem during a rush",
    steps: [
      r("Read the passage. Focus on problem-solving vocabulary.", 6),
      ds(
        "Scenario: a cook calls in sick during the Friday rush. How do you redistribute the stations and communicate to the team?",
        10,
      ),
      sp(
        "Solve it: 'Manolo llamó enfermo. Redistribuimos — Carlos toma frío, yo cubro caliente. Ana — expide. Vamos a necesitar que todos corran más rápido esta noche. Podemos.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Menu Knowledge Quiz",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Describe every section of the menu in the target language",
    steps: [
      r("Read the passage as menu context.", 5),
      pt(
        "Pattern: 'Entradas — [3 platos con ingredientes y descripción]. Platos principales — [3 platos]. Postres — [2 platos]. La especialidad de la casa es [plato] porque [razón].' Build menu pitch.",
        10,
      ),
      sp(
        "Pitch the menu: 'Esta noche tenemos tres especiales. El primero — lubina al horno con mantequilla de limón y alcaparras. El segundo — risotto de trufa negra con parmesano añejado.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Grievance & HR Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Address a workplace concern with a supervisor",
    steps: [
      r("Read the passage. Focus on HR communication vocabulary.", 6),
      sb(
        "Build a respectful grievance: state the issue, provide context, suggest a solution, keep it professional.",
        8,
      ),
      sp(
        "Address concern: 'Quiero hablar con usted — tengo un problema con el horario del fin de semana. ¿Hay un momento hoy para conversar? Quiero resolverlo correctamente.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Tip Pool Communication",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Explain the restaurant's tip policy to a new hire",
    steps: [
      r("Read the passage. Focus on compensation vocabulary.", 5),
      pt(
        "Pattern: 'El restaurante tiene pool de propinas. Cada servidor da el 20% al barra, el 10% a los ayudantes. Al final del turno — el total se divide entre horas trabajadas.' Build tip explanation.",
        9,
      ),
      sp(
        "Explain: 'Esta semana recibiste 300 dólares en propinas — menos el 30% al pool. Tu parte neta es 210. El sistema es transparente — puedes revisar el cálculo conmigo.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Social Media Feedback Response",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Respond to a restaurant review in the target language",
    steps: [
      r("Read the passage. Focus on customer feedback vocabulary.", 6),
      ds(
        "Draft a response to a 3-star review: acknowledge the experience, apologize for what went wrong, invite them back.",
        10,
      ),
      sp(
        "Respond: 'Estimado visitante, lamentamos que su experiencia no fue la que esperamos brindarle. Le invitamos a contactarnos directamente — queremos que su próxima visita sea excepcional.'",
        4,
      ),
    ],
  },
  {
    n: 28,
    title: "Catering Event Debrief",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Debrief a catering event with the team",
    steps: [
      r("Read the passage. Focus on event debrief vocabulary.", 5),
      ds(
        "Debrief: what went well, what went wrong, client feedback, what to change for next time.",
        10,
      ),
      sp(
        "Lead debrief: 'El evento de anoche — el servicio fue puntual, el cliente quedó satisfecho. El problema — la segunda entrada tardó 15 minutos. La próxima vez precocinamos más cantidad.'",
        5,
      ),
    ],
  },
  {
    n: 29,
    title: "Seasonal Menu Development",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Discuss seasonal menu changes with the team",
    steps: [
      r("Read the passage. Focus on menu development vocabulary.", 6),
      ds(
        "Discuss: seasonal ingredients available now, dish concepts, price points, dishes to retire, and testing timeline.",
        9,
      ),
      sp(
        "Contribute: 'En primavera — las espinacas y las habas frescas están en su punto. Propongo un risotto de habas con menta y queso de cabra — juega bien con el perfil del menú actual.'",
        5,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Service Shift",
    readingTemplate: "seed-{lang}-restaurant-prep",
    objective: "Complete an entire restaurant service in the target language",
    steps: [
      r("Read the passage as your pre-shift prep.", 5),
      ds(
        "AI-assisted full service: pre-shift briefing → taking orders → kitchen communication → complaint resolution → closing. Target language only.",
        12,
      ),
      sp(
        "Post-service: 'Buen servicio hoy. [X covers]. Sin quejas importantes. El equipo lo hizo bien. Mañana — ajustamos la posición del expo.'",
        3,
      ),
    ],
  },
];

// ── Legal Immigration ─────────────────────────────────────────────────────
export const LEGAL_IMMIGRATION_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Asylum Process Overview",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain the asylum filing process in accessible language",
    steps: [
      r("Read the legal asylum passage. Identify key process terms.", 8),
      wm(
        "Match: asylum seeker/solicitante de asilo, I-589 form/formulario I-589, one-year filing deadline/plazo de un año, affirmative asylum/asilo afirmativo, defensive asylum/asilo defensivo",
        7,
      ),
      sp(
        "Explain: 'Puedes solicitar asilo dentro del primer año de llegar al país. Si lo haces antes de que el gobierno actúe, se llama asilo afirmativo — a través de USCIS.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Client Intake Interview",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Conduct an initial client intake for an immigration case",
    steps: [
      r("Read the passage. Focus on intake vocabulary.", 7),
      pt(
        "Pattern: '¿Cuándo llegó? ¿Por qué salió de su país? ¿Tiene documentos de identidad? ¿Ha tenido contacto previo con las autoridades de inmigración?' Build intake questions.",
        8,
      ),
      sp(
        "Conduct intake: '¿Tiene familia en Estados Unidos? ¿Cuántas personas dependen de usted? ¿Tiene alguna condena criminal, aunque sea leve? Es importante que me diga la verdad.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Explaining Rights to a Client",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain constitutional and legal rights clearly",
    steps: [
      r("Read the passage. Focus on rights vocabulary.", 7),
      sb(
        "Explain: right to remain silent, right to an attorney, right not to self-incriminate, right to a fair hearing.",
        8,
      ),
      sp(
        "Explain rights: 'Tiene derecho a guardar silencio frente a oficiales de inmigración. Tiene derecho a un abogado — si no puede pagarlo, hay organizaciones gratuitas. No está obligado a firmar nada.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Documenting Persecution",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Help a client document persecution for their application",
    steps: [
      r("Read the passage. Focus on persecution documentation vocabulary.", 6),
      pt(
        "Pattern: '¿Quién lo persiguió? ¿Con qué frecuencia? ¿Hubo amenazas escritas, verbales, o físicas? ¿Fue al hospital o a la policía? ¿Tiene testigos?' Build documentation questions.",
        9,
      ),
      sp(
        "Document: 'El 15 de marzo de 2023, hombres del cartel amenazaron mi vida en mi negocio. Tengo dos testigos. Fui a la policía pero no tomaron denuncia — por eso tuve que irme.'",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "USCIS Interview Preparation",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Prepare a client for their USCIS asylum interview",
    steps: [
      r("Read the passage. Focus on USCIS interview vocabulary.", 7),
      wm(
        "Match: asylum officer/oficial de asilo, credibility/credibilidad, corroborating evidence/evidencia corroborante, country conditions/condiciones del país, nexus/nexo",
        7,
      ),
      sp(
        "Prep the client: 'El oficial le hará preguntas sobre su historia. Diga la verdad — si no recuerda una fecha exacta, dígalo. No exagere. La consistencia es más importante que el detalle perfecto.'",
        6,
      ),
    ],
  },
  {
    n: 6,
    title: "Explaining Immigration Court",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain immigration court procedure to a client",
    steps: [
      r("Read the passage. Focus on court procedure vocabulary.", 7),
      sb(
        "Explain: master calendar hearing, individual hearing, government attorney, immigration judge, evidence submission, appeal rights.",
        8,
      ),
      sp(
        "Explain: 'En la primera audiencia — master calendar — el juez fija la fecha del juicio. La audiencia individual es el juicio real. Usted testifica y el fiscal del gobierno lo interroga.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Preparing a Declaration",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Help a client write and review their sworn declaration",
    steps: [
      r("Read the passage. Focus on declaration writing vocabulary.", 6),
      ds(
        "Review a client declaration: structure, chronological order, specific details, emotional truth without exaggeration.",
        10,
      ),
      sp(
        "Guide: 'Su declaración empieza con la vida antes de los problemas, luego describe cada incidente en orden. No salte eventos — el juez los busca todos. Sea específico con fechas y lugares.'",
        4,
      ),
    ],
  },
  {
    n: 8,
    title: "Country Conditions Research",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Present country conditions evidence to support a case",
    steps: [
      r("Read the passage. Focus on country conditions vocabulary.", 7),
      pt(
        "Pattern: 'El informe del Departamento de Estado confirma que [grupo] enfrenta [tipo de persecución] en [país] — citamos la página [X] del informe de [año].' Build evidence presentation.",
        8,
      ),
      sp(
        "Present: 'Según el informe del Departamento de Estado de 2024 — las personas LGBTQ en Honduras enfrentan violencia sistemática y la policía no responde. Esto corrobora el testimonio de nuestra cliente.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Removal Order Explanation",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain a removal order and appeal options",
    steps: [
      r("Read the passage. Focus on removal order vocabulary.", 6),
      wm(
        "Match: order of removal/orden de deportación, BIA appeal/apelación ante la BIA, motion to reopen/moción para reabrir, stay of removal/suspensión de deportación, voluntary departure/salida voluntaria",
        8,
      ),
      sp(
        "Explain: 'El juez negó su caso. Tiene 30 días para apelar ante la BIA. La apelación suspende temporalmente la deportación. Este es el plazo — no podemos perder un día.'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "DACA & TPS Basics",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain DACA and TPS eligibility and process",
    steps: [
      r("Read the passage. Focus on DACA/TPS vocabulary.", 7),
      pt(
        "Pattern: 'DACA — llegó antes de los 16 años — ha vivido aquí desde 2007 — sin delito grave — renovable cada dos años. TPS — protege a nacionales de países con desastres o conflicto.' Build eligibility check.",
        8,
      ),
      sp(
        "Explain DACA: 'Si llegó antes de cumplir los 16 años y antes de 2007, y no tiene antecedentes penales graves — puede calificar. Su permiso de trabajo se renueva cada dos años.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Green Card Categories",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain green card pathways to a client",
    steps: [
      r("Read the passage. Focus on green card vocabulary.", 7),
      wm(
        "Match: family preference/preferencia familiar, employment-based/basada en empleo, diversity visa/visa de diversidad, EB-1/EB-1, adjustment of status/ajuste de estatus",
        7,
      ),
      sp(
        "Explain: 'Tiene cuatro categorías principales para la residencia permanente: familiar, empleo, asilo, y lotería de visas. Su caso más viable es el familiar — su esposa es ciudadana.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Naturalization Eligibility",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain naturalization requirements and process",
    steps: [
      r("Read the passage. Focus on naturalization vocabulary.", 6),
      sb(
        "Explain: 5-year residency, continuous presence, physical presence, good moral character, English test, civics test.",
        8,
      ),
      sp(
        "Explain: 'Para naturalizarse — necesita 5 años de residencia permanente, sin viajes fuera de 6 meses, buen carácter moral, y aprobar los exámenes de inglés y civismo.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Know Your Rights Card",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain what to do during an immigration enforcement encounter",
    steps: [
      r("Read the passage. Focus on enforcement encounter vocabulary.", 7),
      pt(
        "Pattern: 'Si un agente lo detiene — permanece calmado — no huyas — tienes el derecho al silencio — pide ver la orden judicial — no firmes nada — pide hablar con un abogado.' Build rights card.",
        8,
      ),
      sp(
        "Explain: 'Si ICE viene a su casa — no abra la puerta sin una orden judicial firmada por un juez. Ellos pueden mostrar una orden de ICE — esa no obliga a abrir. Pida verla por debajo de la puerta.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Unaccompanied Minor Intake",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Conduct an intake with an unaccompanied minor",
    steps: [
      r("Read the passage. Focus on minor-appropriate vocabulary.", 6),
      ds(
        "Approach: age-appropriate language, trauma-informed intake, establishing trust, explaining the process simply.",
        10,
      ),
      sp(
        "Begin gently: 'Hola. Estoy aquí para ayudarte, no para asustarte. Soy abogado — mi trabajo es protegerte. ¿Puedes contarme de dónde eres y cómo llegaste aquí?'",
        4,
      ),
    ],
  },
  {
    n: 15,
    title: "Consular Processing",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain consular processing to a family outside the U.S.",
    steps: [
      r("Read the passage. Focus on consular processing vocabulary.", 7),
      sb(
        "Explain: visa petition → NVC → medical exam → consular interview → visa issuance → entry.",
        8,
      ),
      sp(
        "Explain: 'Su esposa en México aplica a través del consulado americano. Primero aprobamos la petición aquí — después el Centro Nacional de Visas la contacta para la entrevista en el consulado.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Documenting Domestic Violence",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Help a DV survivor document their case for immigration relief",
    steps: [
      r("Read the passage. Focus on VAWA/domestic violence vocabulary.", 6),
      wm(
        "Match: VAWA self-petition/autopetición VAWA, U visa/visa U, T visa/visa T, good faith marriage/matrimonio de buena fe, extreme cruelty/crueldad extrema",
        8,
      ),
      sp(
        "Explain VAWA: 'Como víctima de violencia doméstica por parte de su esposo ciudadano, puede presentar su propio caso sin que él lo sepa. El proceso es confidencial. Su seguridad primero.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Explaining Legal Fees",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain legal fees and fee waivers to a client",
    steps: [
      r("Read the passage. Focus on fees vocabulary.", 6),
      sb(
        "Explain: USCIS filing fees, fee waivers for low income, attorney fees vs. accredited rep fees, pro bono resources.",
        8,
      ),
      sp(
        "Explain fees: 'La presentación del I-589 no tiene costo. El I-485 para el ajuste de estatus cuesta 1,440 dólares — pero puede solicitar exención de pago si sus ingresos califican.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Case Status Follow-Up",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Update a client on their case status",
    steps: [
      r("Read the passage. Focus on case status vocabulary.", 6),
      pt(
        "Pattern: 'Su caso — número [X] — está en revisión desde [fecha]. USCIS tiene una demora de [tiempo] para este tipo. La fecha de prioridad actual es [mes/año]. Todavía es válido esperar.' Build status update.",
        9,
      ),
      sp(
        "Update: 'Revisé el sistema hoy — su caso está pendiente de una entrevista. Hay una demora de 8 meses en esta oficina. Si no recibe notificación en 60 días — lo consulto con USCIS.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Notario Fraud Warning",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Warn a client about immigration fraud",
    steps: [
      r("Read the passage. Focus on fraud prevention vocabulary.", 7),
      ds(
        "Explain: what a notario can and cannot do legally, how notario fraud works, what to do if defrauded.",
        9,
      ),
      sp(
        "Warn: 'En Latinoamérica, el notario es abogado — aquí no. Un notario en EE.UU. solo autentica firmas. Si le cobró para presentar su caso — puede haber cometido fraude. Cuénteme qué pasó.'",
        4,
      ),
    ],
  },
  {
    n: 20,
    title: "Credible Fear Interview Prep",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Prepare a client for a credible fear screening",
    steps: [
      r("Read the passage. Focus on credible fear vocabulary.", 7),
      wm(
        "Match: credible fear/miedo creíble, positive finding/determinación positiva, expedited removal/deportación acelerada, asylum officer/oficial de asilo, persecution/persecución",
        7,
      ),
      sp(
        "Prepare: 'En la entrevista — explique por qué tiene miedo de regresar. Sea específico — ¿quién lo amenaza? ¿Por qué? ¿Cuándo fue la última amenaza? No exagere — sea exactamente honesto.'",
        6,
      ),
    ],
  },
  {
    n: 21,
    title: "Bond Hearing Preparation",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Prepare a client for an immigration bond hearing",
    steps: [
      r("Read the passage. Focus on bond hearing vocabulary.", 6),
      sb(
        "Explain bond hearing: immigration judge, ICE attorney, ties to community, flight risk factors, amount setting, payment.",
        8,
      ),
      sp(
        "Prepare: 'El juez decidirá si fija una fianza. Necesitamos documentos de su comunidad — trabajo, familia aquí, años de residencia. Cuanto más fuertes los vínculos — menor la fianza.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Work Authorization Explained",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain employment authorization documentation",
    steps: [
      r("Read the passage. Focus on work authorization vocabulary.", 6),
      pt(
        "Pattern: 'El permiso de trabajo (EAD) — se aplica 150 días después de presentar el asilo — tarda 30 días procesarse — válido un año — renovable.' Build work authorization explanation.",
        9,
      ),
      sp(
        "Explain: 'Presentó su asilo en enero — después del 1 de junio puede aplicar para el permiso de trabajo. Se llama EAD. Con eso puede trabajar legalmente hasta que su caso se resuelva.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Community Clinic Outreach",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Conduct a brief community immigration rights presentation",
    steps: [
      r("Read the passage. Focus on outreach vocabulary.", 6),
      ds(
        "Plan a 10-minute community talk: who qualifies for help, what you can do for free, how to avoid fraud, how to reach you.",
        10,
      ),
      sp(
        "Present: 'Soy abogada de inmigración. Ofrezco consultas gratuitas el primer sábado de cada mes. Si tiene miedo de ser deportado o no entiende su situación — llame antes de firmar nada.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Consulate Appointment Communication",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Prepare a client for a consulate appointment",
    steps: [
      r("Read the passage. Focus on consulate vocabulary.", 6),
      sb(
        "Build a consulate prep checklist: documents, dress code, timing, what to say, how to answer questions clearly.",
        8,
      ),
      sp(
        "Prep: 'Llegue 30 minutos antes. Lleve todos los documentos originales y copias. Si no entiende la pregunta — diga 'no entendí, ¿puede repetir?' No invente respuestas.'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Expunged Records & Moral Character",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain how criminal records affect immigration cases",
    steps: [
      r("Read the passage. Focus on criminal record vocabulary.", 7),
      ds(
        "Discuss: aggravated felony bar, CIMT, expungement effect on immigration, how to disclose honestly.",
        9,
      ),
      sp(
        "Explain: 'Aunque su caso fue borrado del récord criminal, para inmigración — el borrado no elimina el delito. Debemos declararlo en el formulario. Si lo ocultamos — descalifica el caso.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Detention Center Visit",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Communicate with a client in immigration detention",
    steps: [
      r("Read the passage. Focus on detention vocabulary.", 6),
      sb(
        "Prepare for a detention visit: what to say, what to ask, what not to say, how to document the meeting.",
        8,
      ),
      sp(
        "At the visit: 'Tengo 30 minutos. Vamos a repasar su historia y lo que diremos en la audiencia. No mencione su ruta de entrada — eso puede complicar el caso. Cuénteme sobre las amenazas.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Sibling Petition Strategy",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain a sibling petition timeline to a client",
    steps: [
      r("Read the passage. Focus on family petition vocabulary.", 7),
      pt(
        "Pattern: 'Como ciudadano americano puede pedir a su hermano — categoría F4. El tiempo de espera actual es de 12 a 15 años. Es válido empezar ahora — cuanto antes, mejor.' Build family petition explanation.",
        8,
      ),
      sp(
        "Explain: 'Puede pedir a su hermano hoy. La fecha de prioridad establece su lugar en la fila. Los boletos se distribuyen por cuota anual — el proceso es largo pero comienza con la petición.'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "VAWA Confidentiality Rules",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Explain VAWA confidentiality protections to a survivor",
    steps: [
      r("Read the passage. Focus on VAWA confidentiality vocabulary.", 6),
      wm(
        "Match: confidentiality/confidencialidad, prohibited disclosure/divulgación prohibida, abuser/abusador, DHS/DHS, USCIS/USCIS",
        8,
      ),
      sp(
        "Explain: 'VAWA tiene protecciones de confidencialidad muy fuertes. USCIS no puede decirle a su esposo que usted presentó. No puede contactarlo para verificar. Su seguridad está protegida.'",
        6,
      ),
    ],
  },
  {
    n: 29,
    title: "Preparing for the Hearing Day",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Walk a client through the day of their immigration hearing",
    steps: [
      r("Read the passage. Focus on hearing day vocabulary.", 5),
      sb(
        "Build hearing day prep: dress, timing, court etiquette, speaking to the judge, handling the cross-examination, staying calm.",
        9,
      ),
      sp(
        "Final prep: 'Llegue a las 8 AM — una hora antes. Hable solo cuando el juez o yo le preguntemos. Responda solo lo que se pregunta. Si no entiende — diga 'no entendí'. Yo estoy con usted.'",
        6,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Client Consultation",
    readingTemplate: "seed-{lang}-legal-asylum",
    objective: "Conduct a complete client intake and strategy session",
    steps: [
      r("Read the passage as your case prep.", 5),
      ds(
        "AI-assisted full consultation: intake → rights explanation → case analysis → strategy presentation → next steps. Target language only.",
        12,
      ),
      sp(
        "Close: 'Entiendo su situación. Tiene opciones. El paso uno es [action]. Lo llamo el [date]. No tome ninguna decisión sin consultar primero.'",
        3,
      ),
    ],
  },
];

// ── K-12 Teacher ──────────────────────────────────────────────────────────
export const K12_TEACHER_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The IEP Meeting",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Navigate an IEP meeting in the target language",
    steps: [
      r("Read the IEP passage. Identify the key roles and terms.", 8),
      wm(
        "Match: IEP/PEI (Plan Educativo Individualizado), present levels/niveles de desempeño actuales, annual goal/meta anual, accommodation/acomodación, modification/modificación",
        7,
      ),
      sp(
        "Introduce the meeting: 'Buenas tardes. Comenzamos la reunión del PEI de [estudiante]. Presentes: la mamá, el maestro de educación especial, el maestro de [materia], y yo como coordinadora.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Parent-Teacher Conference",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Conduct a productive parent-teacher conference",
    steps: [
      r("Read the passage. Focus on conference vocabulary.", 7),
      pt(
        "Pattern: 'Gracias por venir. Su hijo/a está [fortaleza]. Una área de trabajo es [área]. Aquí está el plan para apoyarlo/la en casa y en la escuela.' Build conference structure.",
        8,
      ),
      sp(
        "Open: 'Gracias por venir, señora Méndez. [Nombre] tiene mucho potencial en lectura. Quiero hablar sobre cómo lo apoyamos mejor en matemáticas — veo que tiene dificultades con las fracciones.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Classroom Instructions",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Give clear classroom instructions in the target language",
    steps: [
      r("Read the passage. Focus on instructional vocabulary.", 7),
      sb(
        "Build instructions for: pair work, independent work, class discussion, group project, and quiz.",
        8,
      ),
      sp(
        "Instruct: 'Para este trabajo — abren la página 47 — leen el texto en silencio — y contestan las tres preguntas al final. Tienen 10 minutos. Empiecen.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Behavior Management",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Use positive behavior supports in the target language",
    steps: [
      r("Read the passage. Focus on behavior vocabulary.", 6),
      wm(
        "Match: behavior support plan/plan de apoyo conductual, token economy/economía de fichas, redirect/redirigir, positive reinforcement/refuerzo positivo, consequence/consecuencia",
        8,
      ),
      sp(
        "Redirect: 'Miguel — noto que no estás en tu tarea. Recuerda nuestro acuerdo — cuando terminas el trabajo, tienes cinco minutos de tiempo libre. Vuelve a la página 12.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Explaining Grades to Parents",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Explain a report card to a parent in the target language",
    steps: [
      r("Read the passage. Focus on grading vocabulary.", 7),
      sb("Explain grades in: reading, math, science, social studies, effort, and behavior.", 8),
      sp(
        "Explain: 'La calificación de A en lectura refleja que está por encima del nivel del grado. La C en matemáticas — está trabajando al nivel — pero necesita más práctica con las multiplicaciones.'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "ELL Student Support",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Communicate with an ELL student and family",
    steps: [
      r("Read the passage. Focus on ELL support vocabulary.", 7),
      pt(
        "Pattern: 'Su hijo/a está aprendiendo inglés. En nuestra escuela — recibe apoyo de ESL. Aquí hay recursos en español para practicar en casa. Pueden hablar español en casa — eso ayuda.' Build ELL support talk.",
        8,
      ),
      sp(
        "Reassure: 'Hablar español en casa no frena el inglés — lo refuerza. Un niño que es fuerte en su primer idioma aprende el segundo más rápido. Sigan leyendo juntos en español.'",
        5,
      ),
    ],
  },
  {
    n: 7,
    title: "Lesson Planning Vocabulary",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Describe a lesson plan in the target language",
    steps: [
      r("Read the passage. Focus on lesson planning vocabulary.", 6),
      wm(
        "Match: learning objective/objetivo de aprendizaje, hook/actividad de enganche, guided practice/práctica guiada, independent practice/práctica independiente, exit ticket/boleto de salida",
        8,
      ),
      sp(
        "Describe your lesson: 'Hoy el objetivo es identificar las partes del párrafo. Comenzamos con un ejemplo en la pizarra, practicamos juntos, después escriben solos, y al final — el boleto de salida.'",
        6,
      ),
    ],
  },
  {
    n: 8,
    title: "Crisis Communication with a Student",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Respond to an emotionally dysregulated student",
    steps: [
      r("Read the passage. Focus on de-escalation vocabulary.", 6),
      ds(
        "Discuss: trauma-informed approach, giving space, using calm voice, offering choices, not escalating power struggles.",
        10,
      ),
      sp(
        "De-escalate: 'Veo que estás muy enojado ahora. No tienes que hablar todavía. Cuando estés listo — aquí estoy. Tienes dos opciones: ir al rincón de calma o tomar agua. Tú decides.'",
        4,
      ),
    ],
  },
  {
    n: 9,
    title: "School Supplies & Materials",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Name classroom materials and request them in context",
    steps: [
      r("Read the passage. Focus on materials vocabulary.", 7),
      wm(
        "Match: pencil/lápiz, highlighter/resaltador, notebook/cuaderno, folder/carpeta, protractor/transportador, ruler/regla",
        8,
      ),
      sp(
        "Request: '¿Alguien tiene un resaltador que me pueda prestar? Gracias. Para la tarea de mañana — necesitan la carpeta azul, dos lápices afilados, y el libro de matemáticas.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Academic Language Scaffolding",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Scaffold academic vocabulary for ELL students",
    steps: [
      r("Read the passage. Focus on academic language vocabulary.", 7),
      sb(
        "Build a scaffold: introduce word, show image, give example sentence, have students repeat, use it in context.",
        8,
      ),
      sp(
        "Scaffold: 'La palabra de hoy es INFERIR. Inferir significa sacar una conclusión sin que el texto lo diga directamente. Ejemplo: si el personaje lleva paraguas — inferimos que va a llover.'",
        5,
      ),
    ],
  },
  {
    n: 11,
    title: "Safety Drill Instructions",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Lead a fire or lockdown drill in the target language",
    steps: [
      r("Read the passage. Focus on emergency drill vocabulary.", 6),
      pt(
        "Pattern: 'Simulacro de incendio — todos se levantan — salen en fila por la puerta trasera — sin hablar — nos formamos en el patio junto a la cancha. Cuento a todos.' Build drill instructions.",
        9,
      ),
      sp(
        "Lead drill: 'Atención clase — simulacro de incendio. Dejen todo — sin mochila. Salimos en orden por la puerta de atrás. Silencio hasta llegar al patio. Voy delante.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Special Education Referral",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Communicate a special education referral to a parent",
    steps: [
      r("Read the passage. Focus on referral vocabulary.", 7),
      ds(
        "Explain: what you've observed, why you're referring, what the evaluation involves, parent rights during the process.",
        9,
      ),
      sp(
        "Explain: 'He notado que [nombre] tiene dificultades consistentes con la lectura que van más allá del nivel del grupo. Quisiera referirlo para una evaluación — es voluntaria y gratuita. Usted tiene derechos en este proceso.'",
        4,
      ),
    ],
  },
  {
    n: 13,
    title: "Progress Monitoring",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Explain progress monitoring data to a parent",
    steps: [
      r("Read the passage. Focus on progress monitoring vocabulary.", 6),
      wm(
        "Match: benchmark/punto de referencia, fluency/fluidez, running record/registro de lectura corrida, percentile/percentil, trend line/línea de tendencia",
        8,
      ),
      sp(
        "Explain data: 'En septiembre su lectura estaba en el percentil 25. En enero — percentil 38. Está mejorando. La meta para junio es el percentil 45. Vamos bien.'",
        6,
      ),
    ],
  },
  {
    n: 14,
    title: "Classroom Routines",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Teach and explain daily classroom routines",
    steps: [
      r("Read the passage. Focus on routines vocabulary.", 6),
      sb(
        "Build routines for: morning entry, attendance, transition between subjects, bathroom procedure, dismissal.",
        8,
      ),
      sp(
        "Explain morning routine: 'Cuando entran — mochila en el gancho — tarea en la bandeja azul — siéntense y empiezan el warm-up en la pizarra. Sin esperar instrucciones. Eso es lo que hacemos cada mañana.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Talking About Bullying",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Address a bullying incident with students and parents",
    steps: [
      r("Read the passage. Focus on bullying prevention vocabulary.", 7),
      pt(
        "Pattern: 'Lo que describiste es acoso — no está bien. Aquí las reglas son claras: respeto a todos, siempre. Vamos a hablar con los involucrados y con tus papás.' Build bullying response.",
        8,
      ),
      sp(
        "Address parent: 'Llamé porque hubo un incidente con [nombre]. Lo tomamos muy en serio. Aquí está lo que pasó y el plan de la escuela para que no vuelva a ocurrir.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "Technology in the Classroom",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Teach digital tools with target-language instructions",
    steps: [
      r("Read the passage. Focus on technology vocabulary.", 6),
      wm(
        "Match: login/inicio de sesión, Google Classroom/Google Classroom, submit/enviar, attachment/archivo adjunto, digital citizen/ciudadano digital",
        8,
      ),
      sp(
        "Instruct: 'Abren el Chromebook — van a Google Classroom — hacen clic en la tarea de hoy. Leen las instrucciones. Cuando terminen — hacen clic en ENTREGAR. No cierren sin entregar.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Supporting Grief & Trauma",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Support a grieving student with trauma-informed language",
    steps: [
      r("Read the passage. Focus on grief support vocabulary.", 6),
      ds(
        "Discuss: how to acknowledge loss without minimizing, when to refer to the counselor, how to adjust expectations while keeping the student connected.",
        10,
      ),
      sp(
        "Support: 'Sé que has pasado por algo muy difícil. Aquí estoy para ti. No tienes que hablar hoy si no quieres — pero cuando estés listo, la consejera y yo estamos disponibles.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Back to School Night",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Present your class to parents at Back to School Night",
    steps: [
      r("Read the passage. Focus on parent communication vocabulary.", 7),
      sb(
        "Build a Back to School Night presentation: class expectations, curriculum overview, communication methods, homework policy, how to help at home.",
        8,
      ),
      sp(
        "Present: 'Bienvenidos. Esta noche quiero que conozcan cómo funciona nuestra clase. El objetivo es que su hijo salga con fuerte comprensión lectora y amor por aprender. Aquí está cómo trabajamos juntos.'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Grade-Level Team Meeting",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Participate in a grade-level team data review",
    steps: [
      r("Read the passage. Focus on team meeting vocabulary.", 6),
      ds(
        "Discuss: student performance data, which students need intervention, which are ready for extension, what instructional strategies to try.",
        10,
      ),
      sp(
        "Contribute: 'En mi grupo — tres estudiantes están por debajo del nivel de referencia en lectura. Propongo intervención en grupos pequeños tres veces por semana durante 20 minutos.'",
        4,
      ),
    ],
  },
  {
    n: 20,
    title: "Field Trip Communication",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Communicate field trip details to students and families",
    steps: [
      r("Read the passage. Focus on field trip vocabulary.", 6),
      sb(
        "Build a field trip communication: permission slip, what to bring, schedule, chaperone roles, behavior expectations.",
        8,
      ),
      sp(
        "Announce: 'El viernes tenemos la excursión al museo de ciencias. Necesitan traer la autorización firmada, almuerzo empacado, y ropa cómoda. Salimos a las 8:30 AM.'",
        6,
      ),
    ],
  },
  {
    n: 21,
    title: "Project-Based Learning Introduction",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Introduce a project-based learning unit",
    steps: [
      r("Read the passage. Focus on project-based learning vocabulary.", 7),
      pt(
        "Pattern: 'En este proyecto — van a investigar [tema] y presentar [producto final]. Trabajarán en grupos de tres. La presentación es el [fecha]. Los criterios están en la rúbrica.' Build PBL launch.",
        8,
      ),
      sp(
        "Launch: 'El proyecto de las próximas tres semanas — diseñar una solución a un problema en nuestra comunidad. Grupos de tres — eligen el problema. La presentación es ante la clase el 30 de mayo.'",
        5,
      ),
    ],
  },
  {
    n: 22,
    title: "504 Plan Communication",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Explain a 504 plan accommodation to a student",
    steps: [
      r("Read the passage. Focus on 504 accommodation vocabulary.", 6),
      wm(
        "Match: extended time/tiempo extendido, preferential seating/asiento preferencial, reduced distraction/ambiente de menor distracción, calculator use/uso de calculadora, breaks/descansos",
        8,
      ),
      sp(
        "Explain: 'Tu Plan 504 dice que puedes tener 50% más de tiempo en los exámenes. Eso significa que si la clase tiene 40 minutos — tú tienes 60. Lo usamos en todos los exámenes formales.'",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Substitute Teacher Notes",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Write and explain substitute teacher notes",
    steps: [
      r("Read the passage. Focus on classroom management vocabulary.", 6),
      sb(
        "Build sub notes: schedule, routines, student needs (IEP notes, allergies), behavior plan, emergency procedures.",
        8,
      ),
      sp(
        "Leave notes: 'Clase de cuarto grado — 22 estudiantes. Omar necesita sentarse en la primera fila. Sofía tiene Plan 504 — tiempo extendido. El horario está en el pizarrón. Gracias.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Reading Small Group Instruction",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Conduct a guided reading lesson in a small group",
    steps: [
      r("Read the passage. Focus on reading instruction vocabulary.", 7),
      pt(
        "Pattern: 'Hoy leemos [título]. Antes de leer — predigan de qué trata. Durante la lectura — paren en el asterisco y cuéntenme qué pasó. Después — la pregunta de inferencia.' Build guided reading structure.",
        8,
      ),
      sp(
        "Guide: 'Miren la portada — ¿qué predicen? Ahora lean la primera página en voz baja. Para. ¿Qué pasó? ¿Por qué creen que el personaje tomó esa decisión?'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Math Problem-Solving Language",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Teach math word problem vocabulary and strategies",
    steps: [
      r("Read the passage. Focus on math vocabulary.", 6),
      wm(
        "Match: sum/suma, difference/diferencia, product/producto, quotient/cociente, unknown/incógnita, variable/variable",
        8,
      ),
      sp(
        "Teach: 'La palabra TOTAL me dice que sumo. La palabra MENOS o QUEDAN me dice que resto. La palabra VECES me dice que multiplico. Subraya la palabra clave antes de resolver.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Science Lab Safety",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Brief students on science lab safety rules",
    steps: [
      r("Read the passage. Focus on lab safety vocabulary.", 7),
      sb(
        "Build lab safety rules: goggles, hair back, no running, handle with care, what to do if spill, emergency exit.",
        8,
      ),
      sp(
        "Brief: 'En el laboratorio — lentes de seguridad siempre. Pelo recogido si es largo. Sin correr. Si derramas algo — avísame inmediatamente — no lo limpies solo. ¿Preguntas?'",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "Social Studies Discussion",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Facilitate a Socratic seminar in the target language",
    steps: [
      r("Read the passage. Focus on discussion facilitation vocabulary.", 6),
      ds(
        "Facilitate a Socratic seminar on a historical event: pose the essential question, manage turn-taking, push for evidence-based reasoning.",
        10,
      ),
      sp(
        "Facilitate: '¿Por qué creen que los colonos decidieron declarar la independencia? Escucho una opinión — ¿quién puede añadir evidencia del texto? Recuerden — hablen con el grupo, no conmigo.'",
        4,
      ),
    ],
  },
  {
    n: 28,
    title: "Teacher Collaboration",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Collaborate with a co-teacher or specialist",
    steps: [
      r("Read the passage. Focus on collaboration vocabulary.", 6),
      sb(
        "Build a co-teaching plan: who delivers instruction, who supports, how to signal transitions, how to debrief.",
        8,
      ),
      sp(
        "Plan with co-teacher: 'Tú diriges la minilección — yo circulo y apoyo a los tres estudiantes con PEI. En la práctica independiente — cambiamos. Al final — 5 minutos para debrief.'",
        6,
      ),
    ],
  },
  {
    n: 29,
    title: "Family Literacy Event",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Facilitate a family literacy night at school",
    steps: [
      r("Read the passage. Focus on family engagement vocabulary.", 6),
      ds(
        "Plan family literacy night: activities families can do at home, how to use the library, tips for reading together regardless of parent's literacy level.",
        10,
      ),
      sp(
        "Facilitate: 'No necesitan saber leer para ayudar con la lectura. Pueden escuchar a su hijo leer, hacer preguntas sobre el libro, o mirar las imágenes juntos y conversar en español.'",
        4,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full School Day Communication",
    readingTemplate: "seed-{lang}-k12-iep",
    objective: "Navigate an entire school day in the target language",
    steps: [
      r("Read the passage as your day prep.", 5),
      ds(
        "AI-assisted full day: morning routines → lesson delivery → parent call → IEP meeting → end-of-day debrief. Target language only.",
        12,
      ),
      sp(
        "End-of-day: 'El día estuvo productivo. [One win, one challenge]. Mañana enfocamos en [next lesson focus].'",
        3,
      ),
    ],
  },
];

// ── International Travel ──────────────────────────────────────────────────
export const TRAVEL_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Checking Into the Hotel",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Complete a hotel check-in in the target language",
    steps: [
      r("Read the hotel passage. Focus on check-in vocabulary.", 8),
      wm(
        "Match: reservation/reserva, check-in/registro, room key/llave de habitación, upgrade/mejora, early check-in/registro anticipado",
        7,
      ),
      sp(
        "Check in: 'Buenas tardes — tengo reserva a nombre de Martínez para dos noches. ¿Es posible una habitación con vista al mar? Llegamos temprano — ¿hay habitación disponible ya?'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "At the Airport",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate an airport in the target language",
    steps: [
      r("Read the passage. Focus on airport vocabulary.", 7),
      pt(
        "Pattern: '¿Dónde está el mostrador de facturación? ¿Cuánto equipaje de mano puedo llevar? ¿A qué puerta debo ir? ¿Hay sala de espera VIP?' Build airport navigation questions.",
        8,
      ),
      sp(
        "Navigate: 'Disculpe — busco el mostrador de Iberia. ¿Está cerca de la terminal T4? Gracias. ¿Y hay transporte entre terminales o tengo que caminar?'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "Ordering in a Restaurant",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Order a full meal in an unfamiliar restaurant",
    steps: [
      r("Read the passage. Focus on restaurant vocabulary.", 7),
      sb(
        "Build a restaurant interaction: asking for the menu, ordering, asking about ingredients, requesting modifications, paying.",
        8,
      ),
      sp(
        "Order: 'Buenas noches — ¿nos puede traer la carta de vinos también? Para empezar — el ceviche. De plato principal — el arroz con mariscos. ¿El ají pica mucho? Lo prefiero suave.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Getting Around the City",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Use public transport and ask for directions",
    steps: [
      r("Read the passage. Focus on transport vocabulary.", 6),
      wm(
        "Match: subway/metro, bus stop/parada de autobús, taxi fare/tarifa de taxi, transfer/transbordo, round trip/ida y vuelta",
        8,
      ),
      sp(
        "Ask for directions: 'Disculpe — quiero llegar al Parque Central. ¿Tomo el metro o el autobús? ¿Cuántos transbordos? ¿Cuánto tarda aproximadamente?'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Currency & Shopping",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Handle money and shopping transactions",
    steps: [
      r("Read the passage. Focus on commerce vocabulary.", 7),
      pt(
        "Pattern: '¿Cuánto cuesta? ¿Tiene algo más barato? ¿Aceptan tarjeta? ¿Hay descuento por pagar en efectivo? ¿Me puede hacer un mejor precio?' Build shopping interaction.",
        8,
      ),
      sp(
        "Negotiate: '¿Qué precio final me da por los dos? Tengo efectivo. Busco algo de recuerdo para llevar a mi familia — ¿qué me recomienda en ese rango de precio?'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Medical Emergency While Traveling",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Communicate a medical need while abroad",
    steps: [
      r("Read the passage. Focus on medical emergency vocabulary.", 6),
      wm(
        "Match: pharmacy/farmacia, prescription/receta, allergic reaction/reacción alérgica, emergency room/sala de urgencias, travel insurance/seguro de viaje",
        8,
      ),
      sp(
        "Communicate: 'Necesito ayuda — tengo una reacción alérgica fuerte. ¿Hay una farmacia cerca que esté abierta ahora? Si empeora — ¿dónde está el hospital más cercano?'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Hotel Problem Solving",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Resolve a hotel issue in the target language",
    steps: [
      r("Read the passage. Focus on complaint vocabulary.", 7),
      sb(
        "Build hotel complaints: noisy room, broken AC, billing error, wrong room type, missing towels.",
        8,
      ),
      sp(
        "Complain professionally: 'Disculpe — hay un problema con mi habitación. El aire acondicionado no funciona y hace mucho calor. ¿Es posible cambiar de habitación? También hay un error en mi cuenta.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Tour Guide Interaction",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Engage with a local tour guide and ask cultural questions",
    steps: [
      r("Read the passage. Focus on cultural tourism vocabulary.", 7),
      pt(
        "Pattern: '¿Cuántos años tiene esta estructura? ¿Por qué es importante para la historia local? ¿Qué significa este símbolo? ¿Hay horarios especiales?' Build tour questions.",
        8,
      ),
      sp(
        "Engage: '¿Puede explicarnos la diferencia entre las dos pirámides? Entendí que la grande era para el dios sol — ¿la pequeña era también religiosa o tenía otra función?'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Homestay Communication",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Communicate with a homestay family",
    steps: [
      r("Read the passage. Focus on homestay vocabulary.", 6),
      ds(
        "Navigate: introducing yourself, dietary preferences, daily schedule, household rules, expressing gratitude.",
        10,
      ),
      sp(
        "Introduce yourself: 'Muchas gracias por recibirme. Soy [nombre], estudio español en la universidad. Quiero mejorar mucho este mes. ¿Hay alguna regla que deba saber? No como carne — ¿es un problema?'",
        4,
      ),
    ],
  },
  {
    n: 10,
    title: "Visa & Border Crossing",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate immigration at a border crossing",
    steps: [
      r("Read the passage. Focus on immigration vocabulary.", 7),
      wm(
        "Match: passport/pasaporte, visa/visa, customs declaration/declaración de aduana, carry-on/equipaje de mano, border agent/agente de frontera",
        7,
      ),
      sp(
        "At the border: 'Vengo como turista — planeo quedarme 10 días. Me alojo en el Hotel Camino Real en la Ciudad de México. Aquí mi pasaporte y mi declaración de aduana.'",
        6,
      ),
    ],
  },
  {
    n: 11,
    title: "Lost Luggage Report",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Report lost luggage to an airline agent",
    steps: [
      r("Read the passage. Focus on lost luggage vocabulary.", 6),
      sb(
        "Build a lost luggage report: flight number, bag description, delivery address, claim number, urgency of contents.",
        8,
      ),
      sp(
        "Report: 'Mi maleta no llegó en el vuelo IB 6845. Viene de Madrid — en tránsito por Lisboa. Es una maleta negra mediana con ruedas — tiene una cinta roja como identificación. ¿Cuándo la recibiré?'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Restaurant Etiquette Abroad",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate dining etiquette differences in another country",
    steps: [
      r("Read the passage. Focus on dining etiquette vocabulary.", 7),
      ds(
        "Discuss: tipping customs, service timing, how to get the bill, what's rude vs. polite, ordering properly.",
        9,
      ),
      sp(
        "Ask: 'Disculpe — ¿cómo se pide la cuenta aquí? ¿Está incluido el servicio? En mi país — la propina es costumbre — ¿aquí también se practica?'",
        4,
      ),
    ],
  },
  {
    n: 13,
    title: "Talking to Locals",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Start a genuine conversation with a local",
    steps: [
      r("Read the passage. Focus on conversational vocabulary.", 7),
      pt(
        "Pattern: 'Perdone — ¿usted es de aquí? Estoy viajando por primera vez y quiero recomendaciones locales. ¿Qué lugar no debo perderme que los turistas no conocen?' Build local conversation openers.",
        8,
      ),
      sp(
        "Start a conversation: '¿Disculpa — eres local? Llevo tres días y quiero probar comida típica auténtica — no en los sitios del centro turístico. ¿Dónde comes tú habitualmente?'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Haggling at a Market",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Haggle respectfully in a local market",
    steps: [
      r("Read the passage. Focus on negotiation vocabulary.", 6),
      wm(
        "Match: fixed price/precio fijo, bargain/regatear, discount/descuento, last price/último precio, cash deal/trato en efectivo",
        8,
      ),
      sp(
        "Haggle: 'Me gusta mucho esto pero es un poco caro para mí. Si compro dos — ¿me hace un precio especial? Tengo efectivo — ¿cuál sería su mejor precio?'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Transportation Delays",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Handle a flight or train delay in the target language",
    steps: [
      r("Read the passage. Focus on delay vocabulary.", 6),
      sb(
        "Build delay communication: asking for status, rebooking, accommodation request, travel insurance claim.",
        8,
      ),
      sp(
        "Handle delay: 'El vuelo fue cancelado — necesito información sobre opciones de rebooking. ¿Hay vuelos disponibles hoy? Si no — ¿la aerolínea cubre hotel y comida esta noche?'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "Museum & Gallery Visit",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate a museum or cultural site in the target language",
    steps: [
      r("Read the passage. Focus on cultural site vocabulary.", 7),
      pt(
        "Pattern: '¿A qué hora cierra? ¿Hay visita guiada en inglés o español? ¿Está permitido fotografiar? ¿El precio incluye todas las salas?' Build museum visit questions.",
        8,
      ),
      sp(
        "Visit: 'Dos entradas adulto, por favor. ¿Hay audioguía disponible? Nos interesan especialmente las salas de arte precolombino — ¿por dónde empezamos?'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Asking for Recommendations",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Ask locals for authentic travel recommendations",
    steps: [
      r("Read the passage. Focus on recommendation vocabulary.", 6),
      ds(
        "Practice: asking about hidden gems, local neighborhoods, seasonal events, transportation tips, safety awareness.",
        10,
      ),
      sp(
        "Ask: '¿Qué barrio recomiendas para caminar sin masas de turistas? Busco algo con vida local — mercados, cafeterías de barrio, murales. ¿Hay algo especial este fin de semana en la ciudad?'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Cultural Faux Pas Repair",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Apologize for a cultural mistake gracefully",
    steps: [
      r("Read the passage. Focus on apology and cultural sensitivity vocabulary.", 6),
      wm(
        "Match: misunderstanding/malentendido, unintentional/sin intención, offend/ofender, custom/costumbre, forgive/perdonar",
        8,
      ),
      sp(
        "Apologize: 'Disculpe — no era mi intención ofenderle. No conocía bien la costumbre aquí. ¿Puede explicarme cómo se hace correctamente? Quiero respetar la cultura local.'",
        6,
      ),
    ],
  },
  {
    n: 19,
    title: "Travel Journal Entry",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Describe a day of travel in the target language",
    steps: [
      r("Read the passage as your travel context.", 5),
      sb(
        "Write a journal entry: where you went, what you saw, who you met, what surprised you, what you'll remember.",
        10,
      ),
      sp(
        "Narrate: 'Hoy visité el mercado central — lo que más me sorprendió fue la variedad de chiles que no conocía. Hablé con una vendedora por 20 minutos — aprendí más que en toda la semana anterior.'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Emergency Contact Communication",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Contact an embassy or emergency service abroad",
    steps: [
      r("Read the passage. Focus on emergency contact vocabulary.", 6),
      pt(
        "Pattern: 'Soy ciudadano estadounidense — necesito asistencia consular. Perdí mi pasaporte en [ciudad]. Estoy alojado en [hotel]. ¿Qué debo hacer primero?' Build emergency contact sequence.",
        9,
      ),
      sp(
        "Contact: 'Llamo a la embajada porque me robaron el pasaporte esta mañana. Tengo una foto del pasaporte en mi teléfono. ¿Puedo obtener un pasaporte de emergencia antes de mi vuelo el lunes?'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Cooking Class Participation",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Participate in a local cooking class",
    steps: [
      r("Read the passage. Focus on cooking class vocabulary.", 7),
      ds(
        "Participate: follow instructions in the target language, ask about techniques, discuss ingredients, compliment the teacher.",
        9,
      ),
      sp(
        "Ask: '¿Cuánto tiempo se deja fermentar la masa? ¿Hay una diferencia si uso chile seco en lugar de fresco? ¿Este plato es regional o se come en todo el país?'",
        4,
      ),
    ],
  },
  {
    n: 22,
    title: "Long-Distance Bus Travel",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Take an intercity bus in the target language",
    steps: [
      r("Read the passage. Focus on bus travel vocabulary.", 6),
      sb(
        "Build bus interactions: buying ticket, choosing seat, asking about stops, identifying your stop, managing luggage.",
        8,
      ),
      sp(
        "Buy ticket: 'Un boleto a Oaxaca — para mañana — el turno de la mañana si hay. ¿Hay clases distintas? ¿El autobús para en Puebla o es directo? ¿Puedo subir esta maleta al compartimiento?'",
        6,
      ),
    ],
  },
  {
    n: 23,
    title: "Making New Friends While Traveling",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Build a genuine connection with a fellow traveler",
    steps: [
      r("Read the passage. Focus on friendship vocabulary.", 7),
      pt(
        "Pattern: '¿De dónde eres? ¿Cuánto tiempo llevas viajando? ¿Qué lugar te pareció lo mejor? ¿Tienes algún plan para mañana — ¿quieres juntarte?' Build traveler conversation.",
        8,
      ),
      sp(
        "Connect: '¿Cuánto tiempo llevas en México? Yo llevo una semana y todavía no entiendo bien cómo funciona el metro. ¿Vienes de un hostal? ¿Dónde te quedas?'",
        5,
      ),
    ],
  },
  {
    n: 24,
    title: "Navigating Nightlife Safely",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate nightlife safely with key language",
    steps: [
      r("Read the passage. Focus on safety vocabulary.", 6),
      wm(
        "Match: taxi fare/tarifa de taxi, sober/sobrio, safe route/ruta segura, licensed taxi/taxi autorizado, emergency number/número de emergencias",
        8,
      ),
      sp(
        "Stay safe: 'Disculpe — ¿podría llamar a un taxi autorizado para mí? Prefiero no caminar solo de noche. ¿Cuál es el número de policía o emergencias aquí si lo necesito?'",
        6,
      ),
    ],
  },
  {
    n: 25,
    title: "Post Office & Shipping",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Mail a package or postcard in a foreign country",
    steps: [
      r("Read the passage. Focus on postal vocabulary.", 6),
      sb(
        "Build postal interactions: sending a postcard, declaring contents, choosing service, calculating shipping time.",
        8,
      ),
      sp(
        "At post office: 'Quiero enviar este paquete a Estados Unidos — nada de valor, solo artesanías de recuerdo. ¿Cuánto costaría por correo regular? ¿Cuántos días tarda en llegar?'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Discussing Impressions of the Country",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Share impressions and observations about the country",
    steps: [
      r("Read the passage as cultural context.", 5),
      ds(
        "Discuss: what surprised you most, cultural differences from home, what you admire, what you found challenging.",
        11,
      ),
      sp(
        "Share impressions: 'Lo que más me sorprendió fue la familia — el nivel de conexión familiar es muy distinto al de mi país. También la comida — pensé que conocía la cocina mexicana pero no conocía nada.'",
        4,
      ),
    ],
  },
  {
    n: 27,
    title: "Renting a Car Abroad",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Rent a car and understand local driving rules",
    steps: [
      r("Read the passage. Focus on car rental vocabulary.", 7),
      wm(
        "Match: rental agreement/contrato de alquiler, collision damage waiver/seguro de daños, speed limit/límite de velocidad, toll/peaje, full tank policy/política de tanque lleno",
        7,
      ),
      sp(
        "Rent a car: 'Tengo reserva para un compacto por tres días. ¿Está incluido el seguro básico? ¿Cuál es la política de gasolina — entrego lleno o pago aquí? ¿Hay peajes en la ruta a Guadalajara?'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Language Learning Conversation Exchange",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Conduct a tandem language exchange with a local",
    steps: [
      r("Read the passage as conversation context.", 5),
      ds(
        "Exchange: half the time they practice English, half the time you practice Spanish. Discuss topics of mutual interest.",
        12,
      ),
      sp(
        "Propose: 'Propongo que hablemos 30 minutos en español y 30 en inglés. Yo tengo preguntas sobre la cultura local — tú me corriges. Yo te corrijo en inglés. ¿Te parece?'",
        3,
      ),
    ],
  },
  {
    n: 29,
    title: "Reflecting on the Trip",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Reflect on a trip and share it in the target language",
    steps: [
      r("Read the passage as trip reflection context.", 5),
      sb(
        "Build a trip reflection: best moment, biggest challenge, language improvement, what you'd do differently, will you return?",
        10,
      ),
      sp(
        "Reflect: 'El viaje me cambió más de lo que esperaba. El idioma — al final de la semana pienso en español sin traducir. Lo más difícil fue el acento regional. Regreso el año que viene — seguro.'",
        5,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Day Abroad Simulation",
    readingTemplate: "seed-{lang}-travel-hotel",
    objective: "Navigate a complete day abroad without English",
    steps: [
      r("Read the passage as your day plan.", 5),
      ds(
        "AI-assisted full day: hotel breakfast → city navigation → market interaction → restaurant → evening cultural event → return to hotel. Target language only.",
        12,
      ),
      sp(
        "Debrief: 'Hoy en el día sin inglés — lo más difícil fue [situation]. Lo logré porque [strategy]. Mañana voy a intentar [next challenge].'",
        3,
      ),
    ],
  },
];

// ── Catholic Ministry ─────────────────────────────────────────────────────
export const CATHOLIC_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "The Mass Structure",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Name each part of the Mass in the target language",
    steps: [
      r("Read the Mass passage. Identify each liturgical part.", 8),
      wm(
        "Match: Introductory Rites/Ritos iniciales, Liturgy of the Word/Liturgia de la Palabra, Liturgy of the Eucharist/Liturgia Eucarística, Communion/Comunión, Dismissal/Envío",
        7,
      ),
      sp(
        "Explain: 'La Misa tiene cuatro partes. Comenzamos con los Ritos iniciales — la bienvenida y el Acto Penitencial. Después viene la Liturgia de la Palabra con las lecturas y el Evangelio.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Sunday Homily Delivery",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Deliver a brief homily in the target language",
    steps: [
      r("Read the Mass passage. Focus on homily vocabulary.", 7),
      pt(
        "Pattern: 'El Evangelio de hoy nos habla de [tema]. Lo que Jesús nos enseña aquí es [mensaje]. En nuestra vida cotidiana — podemos vivirlo cuando [aplicación práctica].' Build homily structure.",
        8,
      ),
      sp(
        "Deliver: 'El Evangelio de hoy nos desafía a amar al prójimo como a nosotros mismos. No es fácil — pero ¿cuándo fue la última vez que perdonaste a alguien que no lo merecía?'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "RCIA — Faith Inquiry Session",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead an RCIA inquiry session for Spanish speakers",
    steps: [
      r("Read the passage. Focus on RCIA vocabulary.", 7),
      sb(
        "Build an RCIA session: welcome the inquirer, explain what RCIA is, describe the journey, invite questions.",
        8,
      ),
      sp(
        "Welcome: 'Bienvenido al RCIA — la preparación para entrar en plena comunión con la Iglesia Católica. No tienes que saber nada ahora — solo que sientes que Dios te llama. Eso basta.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Sacrament of Baptism Preparation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Prepare a family for infant baptism in the target language",
    steps: [
      r("Read the passage. Focus on baptism vocabulary.", 6),
      wm(
        "Match: godfather/padrino, godmother/madrina, chrism oil/crisma, font/pila bautismal, original sin/pecado original, rite of welcome/rito de bienvenida",
        8,
      ),
      sp(
        "Prepare the family: 'El bautismo es el primero de los siete sacramentos. Los padrinos tienen un papel fundamental — no es un honor social — es una responsabilidad espiritual para toda la vida de su ahijado.'",
        6,
      ),
    ],
  },
  {
    n: 5,
    title: "Confession Guidance",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Guide a parishioner through the Sacrament of Reconciliation",
    steps: [
      r("Read the passage. Focus on confession vocabulary.", 7),
      pt(
        "Pattern: 'El sacramento tiene cinco partes: examen de conciencia — contrición — propósito de enmienda — confesión — penitencia y absolución.' Build the guidance walk-through.",
        8,
      ),
      sp(
        "Guide: 'Antes de confesar — tomamos un tiempo para examinar nuestra conciencia. Piensa en las últimas semanas — ¿hay algo que hayas hecho o dejado de hacer que sabes que no estuvo bien?'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Marriage Prep (Pre-Cana)",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead a pre-Cana session for an engaged couple",
    steps: [
      r("Read the passage. Focus on marriage preparation vocabulary.", 6),
      ds(
        "Discuss topics: sacramental nature of marriage, communication, family of origin, finances, natural family planning, children.",
        10,
      ),
      sp(
        "Open: 'Bienvenidos a su primer encuentro de preparación matrimonial. El matrimonio católico es un sacramento — no solo un contrato. Vamos a hablar de lo que eso significa para su vida juntos.'",
        4,
      ),
    ],
  },
  {
    n: 7,
    title: "Quinceañera Preparation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Prepare a young woman for her Quinceañera Mass",
    steps: [
      r("Read the passage. Focus on quinceañera vocabulary.", 7),
      sb(
        "Explain the liturgy: Misa, readings selection, tiara blessing, last doll, crown of flowers, candle ritual.",
        8,
      ),
      sp(
        "Explain: 'La Quinceañera no es solo una fiesta — es una consagración. En la Misa agradecemos a Dios por los 15 años de vida y pides su guía para la adultez. Cada símbolo tiene un significado.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Funeral Mass Coordination",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Coordinate a funeral Mass with the grieving family",
    steps: [
      r("Read the passage. Focus on funeral vocabulary.", 6),
      wm(
        "Match: vigil/velorio, funeral Mass/Misa exequial, cremation/cremación, committal/rito de la sepultura, rosary/rosario, entrust/encomendar",
        8,
      ),
      sp(
        "Coordinate: 'Primero el rosario el miércoles por la tarde. La Misa exequial el jueves a las 10 AM. ¿Quieren lecturas específicas? ¿Quién habla en el ofertorio? ¿Hay cremación o sepultura?'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Youth Group Formation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead a youth formation session in the target language",
    steps: [
      r("Read the passage. Focus on youth ministry vocabulary.", 7),
      pt(
        "Pattern: 'Hoy hablamos de [tema de fe]. Quiero que reflexionen sobre [pregunta]. En grupos de tres — discutan [actividad]. Compartimos con el grupo.' Build youth session structure.",
        8,
      ),
      sp(
        "Lead: '¿Cuándo fue la última vez que sintieron que Dios estaba presente de verdad en su vida? No en la iglesia — en un momento ordinario. Discutan en parejas — después compartimos.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Pastoral Home Visit",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Conduct a pastoral home visit to a sick or elderly parishioner",
    steps: [
      r("Read the passage. Focus on pastoral care vocabulary.", 6),
      ds(
        "Visit: greeting, listening to the person's situation, offering prayer, Anointing of the Sick if applicable, follow-up plan.",
        10,
      ),
      sp(
        "Open: 'Que la paz del Señor esté con usted. Vine a visitarlo como parte de la comunidad parroquial. ¿Cómo se ha sentido? ¿Le gustaría que rezáramos juntos antes de irme?'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "Sacraments of Initiation Explained",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Explain the three Sacraments of Initiation",
    steps: [
      r("Read the passage. Focus on initiation sacraments vocabulary.", 7),
      sb(
        "Explain: Baptism (birth), First Communion (nourishment), Confirmation (maturity). Link them as a complete initiation journey.",
        8,
      ),
      sp(
        "Explain: 'Los tres sacramentos de iniciación forman juntos la puerta completa a la vida en Cristo. El bautismo nos incorpora, la Eucaristía nos alimenta, y la Confirmación nos fortalece para el testimonio.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Parish Announcements",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Deliver parish announcements in the target language",
    steps: [
      r("Read the passage. Focus on parish community vocabulary.", 6),
      pt(
        "Pattern: 'Esta semana en nuestra parroquia — [evento 1]. El sábado — [evento 2]. Recuerden la colecta especial para [causa]. Gracias por su generosidad.' Build announcements script.",
        9,
      ),
      sp(
        "Announce: 'El próximo sábado — feria parroquial a las 10 AM. La colecta de este domingo es para el fondo de emergencia de familias migrantes. Los grupos de oración — siguen los miércoles a las 7 PM.'",
        5,
      ),
    ],
  },
  {
    n: 13,
    title: "Lectio Divina Session",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead a Lectio Divina prayer experience",
    steps: [
      r("Read the passage as sacred text context.", 6),
      ds(
        "Lead Lectio Divina: lectio (reading) → meditatio (reflect) → oratio (pray) → contemplatio (rest). Explain each step.",
        10,
      ),
      sp(
        "Guide: 'Leemos el texto en voz alta — escuchen sin analizar. Segunda lectura — ¿qué palabra o frase les toca el corazón? Siéntense con esa palabra. Dejen que Dios les hable a través de ella.'",
        4,
      ),
    ],
  },
  {
    n: 14,
    title: "Social Justice Ministry",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Explain Catholic Social Teaching to parish volunteers",
    steps: [
      r("Read the passage. Focus on social justice vocabulary.", 7),
      wm(
        "Match: human dignity/dignidad humana, preferential option for the poor/opción preferencial por los pobres, subsidiarity/subsidiaridad, solidarity/solidaridad, common good/bien común",
        7,
      ),
      sp(
        "Teach: 'La Doctrina Social Católica tiene siete principios. El primero — y el más fundamental — es la dignidad de la persona humana. Todo lo demás fluye de ahí.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "RCIA Rite of Election",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Explain the Rite of Election to catechumens",
    steps: [
      r("Read the passage. Focus on RCIA process vocabulary.", 6),
      sb(
        "Explain: what Election means, the significance of the Book of the Elect, the role of sponsors, what happens next (Lent).",
        8,
      ),
      sp(
        "Explain: 'En el Rito de Elección — ustedes son reconocidos por la Iglesia como elegidos para los sacramentos. El nombre en el libro es una señal de que Dios los ha llamado por nombre. Es un momento sagrado.'",
        6,
      ),
    ],
  },
  {
    n: 16,
    title: "Ministry of Hospitality Training",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Train parish greeters in the target language",
    steps: [
      r("Read the passage. Focus on hospitality vocabulary.", 6),
      pt(
        "Pattern: 'Como ministro de hospitalidad — tu trabajo es que toda persona se sienta bienvenida. Sonríe, saluda, ayuda a los que buscan asiento, y atiende a los visitantes nuevos especialmente.' Build greeter training.",
        9,
      ),
      sp(
        "Train: 'La persona que entra sola por primera vez — esa es la persona más importante en la puerta hoy. Un saludo sincero puede ser la diferencia entre que vuelva o no.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Extraordinary Minister of Communion",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Train extraordinary ministers of Holy Communion",
    steps: [
      r("Read the passage. Focus on Eucharistic ministry vocabulary.", 7),
      wm(
        "Match: ciborium/copón, paten/patena, consume/consumir, ablutions/abluciones, communion line/fila de comunión, reverence/reverencia",
        7,
      ),
      sp(
        "Instruct: 'Cuando el comulgante se acerca — presenten la hostia y digan 'El Cuerpo de Cristo.' Si alguien no puede recibirla en la mano — en la boca, con reverencia. Si hay duda — consulten al sacerdote.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Faith Sharing Group",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Facilitate a small faith sharing group",
    steps: [
      r("Read the passage as scripture context.", 6),
      ds(
        "Facilitate a small group: open with prayer, share the text, personal reflection question, group sharing, closing prayer.",
        10,
      ),
      sp(
        "Facilitate: 'Leemos el texto juntos. ¿Dónde se sienten ustedes en esta historia — con el hijo pródigo, con el padre, o con el hermano mayor? No hay respuestas incorrectas — solo honestidad.'",
        4,
      ),
    ],
  },
  {
    n: 19,
    title: "Prayer at Hospital/Nursing Home",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Conduct a prayer visit at a hospital or nursing home",
    steps: [
      r("Read the passage. Focus on pastoral visit vocabulary.", 6),
      sb(
        "Build a hospital visit: greeting, assessing the person's needs, offering prayer, anointing if deacon, leaving a blessing.",
        8,
      ),
      sp(
        "Pray with: 'Señor Jesús — estás presente aquí con [nombre]. Que esta oración sea un momento de tu paz. Tú que sanaste a los enfermos — toca su cuerpo y su espíritu en este momento. Amén.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Stewardship Sunday Talk",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Deliver a stewardship talk at all Masses",
    steps: [
      r("Read the passage. Focus on stewardship vocabulary.", 6),
      pt(
        "Pattern: 'Todo lo que tenemos — tiempo, talento, y tesoro — son dones de Dios. La pregunta no es cuánto tenemos — sino cómo lo usamos en su nombre.' Build stewardship message.",
        9,
      ),
      sp(
        "Deliver: 'Hoy los invitamos a reflexionar sobre sus dones. No se trata de dinero únicamente. ¿Cuántas horas de tu semana das a tu familia, tu comunidad, tu parroquia?'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Advent & Christmas Preparation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Explain Advent traditions and Christmas liturgy",
    steps: [
      r("Read the passage. Focus on Advent vocabulary.", 7),
      wm(
        "Match: Advent wreath/corona de Adviento, Jesse Tree/árbol de Jesé, Posadas/Las Posadas, Midnight Mass/Misa de Gallo, Epiphany/Epifanía",
        7,
      ),
      sp(
        "Explain Advent: 'El Adviento son cuatro semanas de preparación para la Navidad — no solo como fiesta — sino como celebración del nacimiento del Salvador. Cada vela de la corona tiene un significado.'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Lenten Retreat Introduction",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Open a parish Lenten retreat",
    steps: [
      r("Read the passage. Focus on Lenten vocabulary.", 6),
      ds(
        "Open a retreat: explain the purpose of Lent, introduce the three pillars (prayer, fasting, almsgiving), set the tone for conversion.",
        10,
      ),
      sp(
        "Open: 'La Cuaresma no es un tiempo de tristeza — es un tiempo de conversión. Los tres pilares son la oración, el ayuno, y la limosna. Esta semana — ¿cuál de los tres vas a profundizar?'",
        4,
      ),
    ],
  },
  {
    n: 23,
    title: "Procession & Rite Leadership",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead a procession or ritual in the target language",
    steps: [
      r("Read the passage. Focus on ritual vocabulary.", 6),
      sb(
        "Build a procession for: entrance, Gospel, Corpus Christi, or Quinceañera. Include instructions and responses.",
        8,
      ),
      sp(
        "Lead: 'La procesión de entrada comienza. Avancen en orden — el crucifijo al frente, los acólitos con las velas, el diácono con el evangeliario — y por último, el sacerdote. En silencio y con reverencia.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Deacon's Homily on Service",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Deliver a deacon's homily centered on service (diakonia)",
    steps: [
      r("Read the passage. Focus on service vocabulary.", 7),
      pt(
        "Pattern: 'El diácono es el servidor — diákonos en griego. La Iglesia nos llama a todos a servir — no en los altares solamente — sino en la mesa del comedor de beneficencia, en la prisión, en el barrio.' Build service homily.",
        8,
      ),
      sp(
        "Deliver: 'La próxima vez que pases por un semáforo y veas a alguien con una señal — te invito a que lo mires a los ojos. Eso es el primer paso del servicio.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Parish Council Participation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Participate in a parish council meeting",
    steps: [
      r("Read the passage. Focus on parish governance vocabulary.", 6),
      ds(
        "Navigate a parish council meeting: budget report, ministry updates, community concerns, upcoming events, old and new business.",
        10,
      ),
      sp(
        "Contribute: 'Quisiera proponer que en el presupuesto del próximo año incluyamos fondos para un ministerio bilingüe para las familias de inmigrantes recientes. Hay una necesidad real en nuestra comunidad.'",
        4,
      ),
    ],
  },
  {
    n: 26,
    title: "Annulment Process Explanation",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Explain the annulment process with compassion",
    steps: [
      r("Read the passage. Focus on tribunal vocabulary.", 6),
      wm(
        "Match: declaration of nullity/declaración de nulidad, marriage tribunal/tribunal matrimonial, impediment/impedimento, canonical consent/consentimiento canónico, pastoral support/acompañamiento pastoral",
        8,
      ),
      sp(
        "Explain: 'Una declaración de nulidad no dice que el matrimonio nunca existió — dice que faltó algo esencial para que fuera un sacramento válido. Es un proceso de discernimiento, no de juicio.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Anointing of the Sick",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Administer the Anointing of the Sick in the target language",
    steps: [
      r("Read the passage. Focus on anointing vocabulary.", 7),
      sb(
        "Build the rite: penitential rite, scripture reading, litany, laying of hands, anointing with oil, Lord's Prayer, blessing.",
        8,
      ),
      sp(
        "Anoint: 'Por esta santa unción y por su bondadosa misericordia, te ayude el Señor con la gracia del Espíritu Santo. Para que, libre de tus pecados, te conceda la salvación y te conforte en tu enfermedad.'",
        5,
      ),
    ],
  },
  {
    n: 28,
    title: "Interfaith Dialogue",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Represent Catholic faith in an interfaith conversation",
    steps: [
      r("Read the passage. Focus on interfaith vocabulary.", 6),
      ds(
        "Discuss: how Catholics approach interfaith dialogue, common ground with Protestant Christianity, respect for other faiths, what Vatican II said.",
        10,
      ),
      sp(
        "In dialogue: 'Desde el Concilio Vaticano II — la Iglesia Católica busca el diálogo con las otras tradiciones religiosas con respeto y apertura. Compartimos mucho con nuestros hermanos cristianos, y también con las otras religiones abrahámicas.'",
        4,
      ),
    ],
  },
  {
    n: 29,
    title: "Mission Territory Context",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Discuss the history and current reality of Catholic mission",
    steps: [
      r("Read the passage. Focus on mission vocabulary.", 6),
      sb(
        "Discuss: evangelization vs. proselytism, inculturation, respect for indigenous culture, solidarity missions.",
        8,
      ),
      sp(
        "Discuss: 'La misión hoy no es la de los siglos anteriores — no vamos a imponer — vamos a acompañar. La evangelización respeta la cultura local y escucha antes de hablar.'",
        6,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Sunday Mass Leadership",
    readingTemplate: "seed-{lang}-catholic-mass",
    objective: "Lead or assist a complete Sunday Mass in the target language",
    steps: [
      r("Read the passage as your Mass preparation.", 5),
      ds(
        "AI-assisted full Mass: introductory rites → readings → homily → liturgy of Eucharist → communion → dismissal. Target language only.",
        12,
      ),
      sp(
        "Dismiss: 'La Misa ha terminado. Vayan en paz para amar y servir al Señor. Que Dios les acompañe en la semana.'",
        3,
      ),
    ],
  },
];

// ── FMG (Foreign Medical Graduate / Job Entry) ────────────────────────────
export const FMG_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Introduction in a Professional Setting",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Introduce yourself professionally in an English-language job context",
    steps: [
      r("Read the job interview passage. Focus on professional introduction vocabulary.", 8),
      wm(
        "Match: résumé/CV, cover letter/carta de presentación, references/referencias, background/trayectoria, qualifications/calificaciones",
        7,
      ),
      sp(
        "Introduce yourself: 'Hello, my name is [name]. I'm a physician trained in [country] and I'm currently completing the USMLE process. I have 6 years of clinical experience and I'm passionate about internal medicine.'",
        5,
      ),
    ],
  },
  {
    n: 2,
    title: "Medical School & Training Background",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Explain your foreign medical training in U.S. English context",
    steps: [
      r("Read the passage. Focus on training description vocabulary.", 7),
      pt(
        "Pattern: 'I completed my MD at [university] in [country], which is a 6-year program. My residency was in [specialty] at [hospital]. I passed Steps 1 and 2 of the USMLE.' Build training narrative.",
        8,
      ),
      sp(
        "Describe: 'I attended the National Medical University in [city]. My clinical rotations included internal medicine, surgery, pediatrics, and OB/GYN. I performed well academically and I'm ready to apply those skills here.'",
        5,
      ),
    ],
  },
  {
    n: 3,
    title: "USMLE & Licensing Vocabulary",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss the USMLE licensing process fluently",
    steps: [
      r("Read the passage. Focus on licensing vocabulary.", 7),
      sb(
        "Build a licensing status update: Step 1 score, Step 2 CK score, Step 3 plan, ECFMG certification, state board application.",
        8,
      ),
      sp(
        "Update your status: 'I passed USMLE Step 1 with a score of 240. I passed Step 2 CK last October. I'm currently preparing for Step 3. My ECFMG certificate is in process and I expect it by March.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Residency Interview English",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Answer common residency interview questions fluently",
    steps: [
      r("Read the passage. Focus on interview vocabulary.", 7),
      pt(
        "Pattern: 'Tell me about yourself → I'm an IMG with a strong clinical background in [specialty]. Why did you choose this specialty? → My interest began when [story]. What are your weaknesses? → I'm still building my familiarity with U.S. electronic medical records.' Build answer structure.",
        8,
      ),
      sp(
        "Answer: 'I chose internal medicine because it demands broad clinical thinking and long-term patient relationships. I saw this in my residency in [city] and it's the kind of medicine I want to practice.'",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "Personal Statement Vocabulary",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Write and speak about your personal statement themes",
    steps: [
      r("Read the passage. Focus on personal statement vocabulary.", 6),
      ds(
        "Develop personal statement themes: why medicine, why this specialty, a formative patient experience, your career goals.",
        10,
      ),
      sp(
        "Share your theme: 'The experience that solidified my commitment to medicine was treating a farmer in rural [country] who hadn't seen a doctor in years. That encounter taught me what access to care really means.'",
        4,
      ),
    ],
  },
  {
    n: 6,
    title: "Describing Clinical Experience",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Describe clinical cases and experience in U.S. English",
    steps: [
      r("Read the passage. Focus on clinical description vocabulary.", 7),
      wm(
        "Match: chief complaint/motivo de consulta, history of present illness/enfermedad actual, physical exam/exploración física, assessment and plan/evaluación y plan, discharge summary/resumen de alta",
        7,
      ),
      sp(
        "Describe a case: 'I had a 58-year-old male presenting with chest pain for two hours, diaphoretic, with EKG changes in V1 through V4. I immediately activated the cath lab — it was an anterior STEMI.'",
        6,
      ),
    ],
  },
  {
    n: 7,
    title: "Communicating with U.S. Patients",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Practice patient communication in American clinical English",
    steps: [
      r("Read the passage. Focus on patient communication vocabulary.", 7),
      sb(
        "Build patient communications: introducing yourself, explaining a diagnosis, obtaining consent, delivering bad news, discharge instructions.",
        8,
      ),
      sp(
        "Introduce yourself: 'Hi Mrs. Johnson — I'm Dr. [name], one of the residents on the team. Dr. Smith asked me to come check on you today. Can you tell me how you're feeling this morning?'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Navigating the U.S. Healthcare System",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Explain U.S. healthcare concepts fluently",
    steps: [
      r("Read the passage. Focus on healthcare system vocabulary.", 6),
      wm(
        "Match: HMO/HMO, PPO/PPO, deductible/deducible, prior authorization/autorización previa, in-network/dentro de la red",
        8,
      ),
      sp(
        "Explain: 'When a patient asks why their medication needs prior authorization — I explain that their insurance requires approval before covering certain prescriptions. I help them navigate that process.'",
        6,
      ),
    ],
  },
  {
    n: 9,
    title: "Electronic Health Record Basics",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss EHR systems and documentation skills",
    steps: [
      r("Read the passage. Focus on EHR vocabulary.", 6),
      pt(
        "Pattern: 'I have experience with [Epic/Cerner/MEDITECH]. I document using SOAP notes. I'm comfortable with order entry, medication reconciliation, and writing discharge summaries.' Build EHR competency statement.",
        9,
      ),
      sp(
        "Demonstrate: 'In my observership at [hospital], I shadowed attendings using Epic. I practiced writing SOAP notes and became familiar with the workflow. I pick up new systems quickly.'",
        5,
      ),
    ],
  },
  {
    n: 10,
    title: "Cultural Competency in Practice",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Demonstrate cultural competency in a patient scenario",
    steps: [
      r("Read the passage. Focus on cultural competency vocabulary.", 7),
      ds(
        "Discuss: working with patients of different cultural backgrounds, health beliefs that differ from biomedical model, language barriers, interpreter use.",
        9,
      ),
      sp(
        "Share: 'In my country, patients often don't tell their families about a serious diagnosis until they're ready. I learned to ask each patient directly: who would you like involved in your care decisions?'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "SOAP Note Documentation",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Write and present a complete SOAP note in English",
    steps: [
      r("Read the passage. Focus on documentation vocabulary.", 7),
      sb(
        "Build a SOAP note: Subjective (patient's complaint), Objective (vitals and exam), Assessment (diagnosis), Plan (management).",
        8,
      ),
      sp(
        "Present: 'Subjective: 45-year-old female with 3-day history of productive cough and fever. Objective: Temp 38.5, rhonchi in left lower lobe. Assessment: community-acquired pneumonia. Plan: azithromycin, chest X-ray, follow-up in 5 days.'",
        5,
      ),
    ],
  },
  {
    n: 12,
    title: "Residency Match Strategy",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss Match strategy and program selection confidently",
    steps: [
      r("Read the passage. Focus on Match strategy vocabulary.", 6),
      wm(
        "Match: ERAS/ERAS, NRMP/NRMP, program director/director del programa, ranking list/lista de clasificación, scramble/SOAP (Supplemental Offer and Acceptance Program)",
        8,
      ),
      sp(
        "Discuss strategy: 'I'm applying primarily to community-based internal medicine programs, with geographic flexibility. I've applied to 80 programs and secured 12 interviews so far. My strategy is to rank broadly but rank honestly.'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Letter of Recommendation Discussion",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss letters of recommendation in professional English",
    steps: [
      r("Read the passage. Focus on recommendation letter vocabulary.", 6),
      pt(
        "Pattern: 'My strongest letter is from Dr. [name] at [institution] — we worked together for three months during my observership. She can speak to my clinical skills, work ethic, and adaptability.' Build LOR discussion.",
        9,
      ),
      sp(
        "Explain: 'I have three letters — one from my observership attending, one from a U.S. physician I shadowed in cardiology, and one from my department chair in [country]. I believe they collectively speak to my readiness.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Professional Networking in English",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Network at a medical conference or event in English",
    steps: [
      r("Read the passage. Focus on professional networking vocabulary.", 7),
      sb(
        "Build networking interactions: introducing yourself, asking about specialty/training, exchanging contact info, following up.",
        8,
      ),
      sp(
        "Network: 'Hi — I'm [name], an IMG in the matching process. I'm particularly interested in your program's approach to resident education. I read about your outcomes data — it's impressive. Could I contact you with a few questions?'",
        5,
      ),
    ],
  },
  {
    n: 15,
    title: "Board Examination Language",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Read and answer USMLE-style question stem language",
    steps: [
      r("Read the passage. Focus on clinical reasoning vocabulary.", 7),
      pt(
        "Pattern: 'A 62-year-old man with a history of [condition] presents with [symptoms]. On exam: [findings]. Labs show [values]. Which of the following is the most likely diagnosis?' Build clinical question parsing.",
        8,
      ),
      sp(
        "Answer a question: 'The stem says he's 62 with HTN and DM, presents with sudden onset crushing chest pain radiating to the jaw. Diaphoretic, BP 90/60. Most likely: STEMI. First step: 12-lead EKG.'",
        5,
      ),
    ],
  },
  {
    n: 16,
    title: "End-of-Rotation Presentation",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Present a case at rounds or end-of-rotation",
    steps: [
      r("Read the passage. Focus on presentation vocabulary.", 6),
      wm(
        "Match: attending/médico tratante, fellow/fellow, rounds/rondas, presentation/presentación del caso, differential diagnosis/diagnóstico diferencial, workup/evaluación diagnóstica",
        8,
      ),
      sp(
        "Present: 'Mr. Rivera is a 67-year-old male with a PMH of COPD presenting with worsening dyspnea for 3 days. He is an ex-smoker, 40 pack-years. Vitals: hypoxic at 88% on room air. My differential includes COPD exacerbation, PE, and pneumonia.'",
        6,
      ),
    ],
  },
  {
    n: 17,
    title: "Professionalism in U.S. Medicine",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss medical professionalism standards in the U.S.",
    steps: [
      r("Read the passage. Focus on professionalism vocabulary.", 6),
      ds(
        "Discuss: punctuality, dress code, appropriate patient boundaries, peer feedback, reporting errors, chain of command.",
        9,
      ),
      sp(
        "Explain your approach: 'I understand that U.S. medicine has a strong culture of transparency about errors. If I make a mistake — I report it immediately and use it as a learning opportunity. That culture makes medicine safer.'",
        4,
      ),
    ],
  },
  {
    n: 18,
    title: "Research & Publications Discussion",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss research experience confidently in English",
    steps: [
      r("Read the passage. Focus on research vocabulary.", 6),
      sb(
        "Build a research narrative: study design, your role, key findings, publication status, what you learned.",
        8,
      ),
      sp(
        "Discuss: 'In my third year, I assisted on a retrospective study of hypertension outcomes in diabetic patients. I performed chart reviews and data entry. The study was accepted in a peer-reviewed journal in [country]. I learned how to read primary literature critically.'",
        6,
      ),
    ],
  },
  {
    n: 19,
    title: "Communicating Bad News",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Use the SPIKES protocol for delivering bad news",
    steps: [
      r("Read the passage. Focus on SPIKES vocabulary.", 7),
      wm(
        "Match: Setting/Entorno, Perception/Percepción, Invitation/Invitación, Knowledge/Conocimiento, Empathy/Empatía, Summary/Resumen",
        7,
      ),
      sp(
        "Deliver: 'Mrs. Chen — I want to speak with you privately. [K step] The results of your biopsy showed that the mass is malignant. [E step] I can only imagine how difficult this is to hear. I'm here and we will walk through this together.'",
        6,
      ),
    ],
  },
  {
    n: 20,
    title: "Teamwork & Hierarchy in U.S. Hospitals",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Navigate U.S. hospital hierarchy and teamwork expectations",
    steps: [
      r("Read the passage. Focus on teamwork vocabulary.", 6),
      pt(
        "Pattern: 'In the U.S. — interns present cases to residents, residents to attendings. Nurses, pharmacists, and social workers are key team members. Flat hierarchy in decisions — steep hierarchy in accountability.' Build teamwork navigation.",
        9,
      ),
      sp(
        "Explain: 'I learned in my observership to always communicate directly with the nurse. They often have clinical observations that don't make it into the chart but are critical for the patient's management.'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Salary & Contract Negotiation Basics",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Navigate a salary or contract conversation in English",
    steps: [
      r("Read the passage. Focus on negotiation vocabulary.", 6),
      wm(
        "Match: base salary/salario base, signing bonus/bono de contratación, PTO/tiempo libre pagado, malpractice insurance/seguro de responsabilidad civil, non-compete clause/cláusula de no competencia",
        8,
      ),
      sp(
        "Negotiate: 'Thank you for the offer. I'm very interested in the position. I wanted to ask about the malpractice coverage — is it occurrence-based or claims-made? And is there any flexibility on the signing bonus given the relocation?'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Pediatrics Rotation Communication",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Communicate with pediatric patients and parents",
    steps: [
      r("Read the passage. Focus on pediatric communication vocabulary.", 7),
      sb(
        "Build pediatric communications: age-appropriate explanations, addressing parents, obtaining consent from minors, discussing vaccines.",
        8,
      ),
      sp(
        "Speak to a child: 'Hi Sophia — I'm Dr. [name]. I know you came in because your tummy hurts. Can you point to where it hurts the most? Is it sharp or more like a squeeze?'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Psychiatry & Mental Health Vocabulary",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Use mental health terminology accurately in English",
    steps: [
      r("Read the passage. Focus on psychiatry vocabulary.", 6),
      wm(
        "Match: mood disorder/trastorno del estado de ánimo, affect/afecto, suicidal ideation/ideación suicida, psychosis/psicosis, insight/conciencia de enfermedad, cognitive distortion/distorsión cognitiva",
        8,
      ),
      sp(
        "Screen: 'I'd like to ask you some routine questions. In the past two weeks — have you felt hopeless or had thoughts of harming yourself? I ask everyone — it helps me understand how you're really doing.'",
        6,
      ),
    ],
  },
  {
    n: 24,
    title: "Evidence-Based Medicine",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss EBM principles and apply them to clinical decisions",
    steps: [
      r("Read the passage. Focus on EBM vocabulary.", 7),
      pt(
        "Pattern: 'In EBM — we integrate the best available research, our clinical experience, and the patient's values. When I was unsure about [decision] — I consulted UpToDate and cross-referenced the most recent guidelines.' Build EBM narrative.",
        8,
      ),
      sp(
        "Demonstrate: 'For this patient with first-episode atrial fibrillation, I reviewed the most recent AHA guidelines before making the recommendation. EBM isn't about memorizing protocols — it's about knowing where to find the best evidence.'",
        5,
      ),
    ],
  },
  {
    n: 25,
    title: "Surgical & Procedural Vocabulary",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Use procedural English during simulated or real procedures",
    steps: [
      r("Read the passage. Focus on procedural vocabulary.", 6),
      wm(
        "Match: sterile field/campo estéril, drape/paño, gauze/gasa, retractor/retractor, suture/sutura, wound closure/cierre de la herida",
        8,
      ),
      sp(
        "Instruct during procedure: 'I need you to hold very still — I'm going to use local anesthetic. You'll feel a small sting and then some pressure. Tell me if you feel any pain beyond that. I'll explain each step as we go.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "OB/GYN Communication",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Communicate in obstetrics and gynecology contexts",
    steps: [
      r("Read the passage. Focus on OB/GYN vocabulary.", 7),
      sb(
        "Build OB communications: prenatal visit history, L&D admission, explaining C-section decision, postpartum care instructions.",
        8,
      ),
      sp(
        "Explain: 'Mrs. Rivera — based on the fetal heart tracing and your labor progress, the safest option for you and your baby is a C-section. I know this isn't what you planned. Let me explain what happens next.'",
        5,
      ),
    ],
  },
  {
    n: 27,
    title: "Internal Medicine Board-Style Case",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Work through a complex internal medicine case in English",
    steps: [
      r("Read the passage as case context.", 5),
      ds(
        "Work through: a 70-year-old with new-onset heart failure — history, EKG, echo findings, BNP, management discussion, disposition.",
        12,
      ),
      sp(
        "Present plan: 'For this patient with newly diagnosed systolic HF with EF of 30% — I'd start with ACE inhibitor, beta-blocker, and loop diuretic. I'd optimize the doses before discharge and arrange cardiology follow-up within 2 weeks.'",
        3,
      ),
    ],
  },
  {
    n: 28,
    title: "U.S. Ethics & Law Basics",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Discuss medical ethics scenarios in English",
    steps: [
      r("Read the passage. Focus on ethics vocabulary.", 6),
      wm(
        "Match: informed consent/consentimiento informado, capacity/capacidad, surrogate decision maker/sustituto de decisión, advance directive/directiva anticipada, DNR/órdenes de no reanimar",
        8,
      ),
      sp(
        "Discuss ethics: 'When a patient lacks capacity, I look for an advance directive first. If there's none, I identify the legally recognized surrogate — usually the next of kin. The goal is always to honor what the patient would have wanted.'",
        6,
      ),
    ],
  },
  {
    n: 29,
    title: "Program Interview Thank-You & Follow-Up",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Write and speak a post-interview thank-you message",
    steps: [
      r("Read the passage. Focus on post-interview vocabulary.", 5),
      sb(
        "Draft a follow-up email: thank the program director, reinforce your interest, mention one specific thing you discussed, close professionally.",
        10,
      ),
      sp(
        "Say: 'Dr. Williams — thank you for taking the time to speak with me yesterday. I was particularly struck by your program's commitment to underserved communities — it aligns perfectly with my long-term goals. I would be honored to train with your team.'",
        5,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — Full Interview & Case Simulation",
    readingTemplate: "seed-en-job-interview-basics",
    objective: "Complete a full residency program interview in English",
    steps: [
      r("Read the passage as your pre-interview prep.", 5),
      ds(
        "AI-assisted full interview: self-introduction → specialty choice → clinical case → ethics scenario → research → questions for the program. English only.",
        12,
      ),
      sp(
        "Close: 'Thank you for this conversation. I'm committed to this specialty, to this program's mission, and to becoming the best physician I can be for my patients. I hope to join your team.'",
        3,
      ),
    ],
  },
];

// ── Assembled export ───────────────────────────────────────────────────────
// ── Rock Climbing ──────────────────────────────────────────────────────────
export const CLIMBING_LESSONS: Lesson[] = [
  {
    n: 1,
    title: "Gear Names & What They Do",
    readingTemplate: "seed-{lang}-climbing-gear",
    objective: "Name and describe 8 essential pieces of climbing gear",
    steps: [
      r("Read the climbing gear passage. Identify each item and its function.", 8),
      wm(
        "Match: harness/arnês/arnés, carabiner/mosquetão/mosquetón, rope/corda/cuerda, belay device/freio/dispositivo de aseguramiento, quickdraw/expresso/exprés, chalk bag/saco de magnésio/bolsa de magnesio",
        8,
      ),
      sp(
        "Describe your rack: 'El arnés y el mosquetón son lo primero que uso. La cuerda dinámica absorbe las caídas. El exprés conecta la cuerda con los parabolts de la vía.'",
        4,
      ),
    ],
  },
  {
    n: 2,
    title: "The Essential Partner Commands",
    readingTemplate: "seed-{lang}-climbing-commands",
    objective: "Use the 10 core belayer/climber commands correctly in sequence",
    steps: [
      r("Read the climbing commands passage. Identify each call and the expected response.", 8),
      pt(
        "Pattern: '¿Asegurado? → Asegurado. ¿Escalando? → Adelante. ¡Tensa! → [belayer takes rope]. ¡Cayendo! → [belayer prepares].' Build the full call-response chain.",
        8,
      ),
      sp(
        "Run the command sequence with your AI partner: start with 'On belay?' and go through a full climb from tie-in to 'Off belay.'",
        4,
      ),
    ],
  },
  {
    n: 3,
    title: "Tying the Figure-Eight — Step by Step",
    readingTemplate: "seed-{lang}-climbing-knots",
    objective: "Give and follow 8 knot-tying instructions in the target language",
    steps: [
      r("Read the knot instruction passage. Focus on directional and sequential vocabulary.", 7),
      sb(
        "Build a complete knot-tying instruction set: thread → loop → pass → retrace → dress → check. Use imperative commands.",
        8,
      ),
      sp(
        "Teach the knot: 'Pase la cuerda por los dos anillos del arnés. Haga un bucle — deje 60 cm libre. Pase el extremo dos veces. Rehaga el ocho exactamente. Ajuste el nudo.'",
        5,
      ),
    ],
  },
  {
    n: 4,
    title: "Movement Coaching — Hands & Feet",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Coach hand and foot positioning in the target language",
    steps: [
      r("Read the movement coaching passage. Focus on directional vocabulary.", 7),
      pt(
        "Pattern: 'Move your right/left hand/foot to... Push your hips into the wall. Shift your weight onto your outside foot. Trust your feet.' Build a coaching sequence for each body part.",
        8,
      ),
      sp(
        "Coach: 'Mano derecha a la presa de arriba. Pie izquierdo en el apoio del lado. Empuja las caderas hacia la pared. Extiende el brazo — alcanza.'",
        5,
      ),
    ],
  },
  {
    n: 5,
    title: "Rope Commands During a Lead Climb",
    readingTemplate: "seed-{lang}-climbing-commands",
    objective: "Call rope management commands during an active lead climb",
    steps: [
      r("Read the passage. Focus on rope management vocabulary.", 7),
      wm(
        "Match: slack/cuerda, take/tensa, watch me/atento, falling/cayendo, clipping/clipando, lowering/bajando",
        8,
      ),
      sp(
        "Call during lead: '¡Cuerda! — necesito más cuerda para clipar. ¡Atento! — este paso es difícil. ¡Cayendo! [pause] ¿Cómo fue la caída?'",
        5,
      ),
    ],
  },
  {
    n: 6,
    title: "Shoe Fit & Rubber Types",
    readingTemplate: "seed-{lang}-climbing-gear",
    objective: "Discuss climbing shoe fit and rubber characteristics",
    steps: [
      r("Read the passage. Focus on shoe and rubber vocabulary.", 6),
      ds(
        "Discuss: aggressive vs. neutral shoes, when to size down, sensitivity vs. durability rubber.",
        10,
      ),
      sp(
        "Advise: 'Para vías deportivas de alta dificultad — zapatos agresivos, puntera muy ajustada. Para escalada en roca natural multi-largo — un poco más de comodidad.'",
        4,
      ),
    ],
  },
  {
    n: 7,
    title: "Belaying Technique Walkthrough",
    readingTemplate: "seed-{lang}-climbing-commands",
    objective: "Explain ATC vs. assisted-braking device technique",
    steps: [
      r("Read the passage. Focus on belay technique vocabulary.", 7),
      sb(
        "Build a belay device instruction set: feed rope, brake position, catching a fall, lowering a climber.",
        8,
      ),
      sp(
        "Instruct: 'Con el ATC — la mano de freno nunca sale de la posición de bloqueo. Al dar cuerda — la mano de freno siempre detrás. Para bajar — gira el dispositivo — baja lento y controlado.'",
        5,
      ),
    ],
  },
  {
    n: 8,
    title: "Reading a Route from the Ground",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Describe a route's features and sequence from the base",
    steps: [
      r("Read the passage. Focus on route-reading vocabulary.", 7),
      pt(
        "Pattern: 'La vía tiene una travesía baja, después un diedro vertical, una sección de roca compacta arriba, y la chapa está debajo de una visera pequeña.' Build route description vocabulary.",
        8,
      ),
      sp(
        "Read the route: 'Veo dos presas de mano buenas al inicio. Después hay una sección de pie de gato en roca lisa. La clave está en los pies — hay que confiar en la goma.'",
        5,
      ),
    ],
  },
  {
    n: 9,
    title: "Requesting a Guide or Instructor",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Hire a local guide and communicate experience level",
    steps: [
      r("Read the travel passage. Focus on guide hire vocabulary.", 7),
      wm(
        "Match: guide/guía, licensed/certificado, half day/medio día, full day/día completo, beginner/principiante, outdoor experience/experiencia en exterior",
        7,
      ),
      sp(
        "Hire a guide: 'Busco un guía certificado para dos días. Somos dos personas — un escalador de sala con tres años de experiencia y un principiante en roca. ¿Qué vías recomienda para nosotros?'",
        6,
      ),
    ],
  },
  {
    n: 10,
    title: "Gym vs. Outdoor Rock Differences",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Explain what changes from gym to outdoor climbing",
    steps: [
      r("Read the passage. Focus on comparison vocabulary.", 6),
      ds(
        "Discuss: rock type differences, footwork on natural features, weather considerations, placing gear vs. clipping bolts.",
        10,
      ),
      sp(
        "Explain: 'En el rocódromo las presas están marcadas y el suelo es plano. En roca — lees la vía tú mismo, el suelo es irregular, y el clima importa mucho. Los pies son todo.'",
        4,
      ),
    ],
  },
  {
    n: 11,
    title: "Anchor Building Communication",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Communicate anchor components and their function",
    steps: [
      r("Read the safety passage. Focus on anchor vocabulary.", 7),
      wm(
        "Match: anchor/ancla/âncora, master point/punto maestro, equalization/ecualización, redundancy/redundancia, bolt/parabolt/grampo, cordelette/cordino",
        7,
      ),
      sp(
        "Describe an anchor: 'El ancla tiene dos parabolts conectados con una cinta. La equalización distribuye la carga entre los dos puntos. El punto maestro está centrado y alineado con la dirección de carga.'",
        6,
      ),
    ],
  },
  {
    n: 12,
    title: "Rappelling Instructions",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Set up and instruct a rappel in the target language",
    steps: [
      r("Read the passage. Focus on rappel instruction vocabulary.", 6),
      sb(
        "Build a rappel setup sequence: thread rope through anchor, extend device, weight test, release, descend, signals.",
        8,
      ),
      sp(
        "Instruct: 'Pasa la cuerda por el rapel — doble exacto. Pon el dispositivo. Agarra la cuerda de freno con la mano dominante. Pon tu peso gradualmente. Cuando llegues abajo — grita: ¡Cuerda libre!'",
        6,
      ),
    ],
  },
  {
    n: 13,
    title: "Calling Grades & Difficulty",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Discuss route grades in Yosemite and French systems",
    steps: [
      r("Read the passage. Focus on grading system vocabulary.", 7),
      pt(
        "Pattern: 'Esta vía es 5.10b en el sistema Yosemite — equivale a un 6a francés. Es moderada para un escalador deportivo — técnica pero no expuesta.' Build grade comparison conversations.",
        8,
      ),
      sp(
        "Discuss: 'El 5.11 aquí en Brasil se llama VIIb en el sistema de la Brazilian Alpine Club. Hay que preguntar siempre qué sistema están usando para no confundirse.'",
        5,
      ),
    ],
  },
  {
    n: 14,
    title: "Rock Type & Surface Descriptions",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Describe rock texture and type to inform technique",
    steps: [
      r("Read the passage. Focus on rock and surface vocabulary.", 6),
      wm(
        "Match: granite/granito, sandstone/arenisca, limestone/calcita/calcário, friction slab/placa de fricción, crimpy/agarres pequeños, sloper/regleta redonda",
        8,
      ),
      sp(
        "Describe rock: 'El granito de esta zona es muy rugoso — la fricción es excelente. Hay que usar técnica de placa — confiar en la goma, cuerpo alejado de la roca, pasos pequeños y precisos.'",
        6,
      ),
    ],
  },
  {
    n: 15,
    title: "Weather Safety Communication",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Discuss and respond to weather changes at the crag",
    steps: [
      r("Read the passage. Focus on weather safety vocabulary.", 6),
      ds(
        "Discuss: reading thunderstorm signs, when to descend, lightning protocol, how to communicate urgency.",
        10,
      ),
      sp(
        "Communicate urgency: 'Veo nubes de tormenta al oeste — tenemos 30 minutos máximo. Bajamos ahora — no terminamos la vía. La roca puede esperar. Hay que bajar antes de la lluvia.'",
        4,
      ),
    ],
  },
  {
    n: 16,
    title: "Describing Pain & Injuries",
    readingTemplate: "seed-{lang}-climbing-medical",
    objective: "Communicate injury type, location, and severity clearly",
    steps: [
      r("Read the medical passage. Focus on pain description vocabulary.", 7),
      wm(
        "Match: sprained/esguinzado, fractured/fracturado, shoulder/hombro, wrist/muñeca, finger pulley/polea del dedo, strain/distensión",
        8,
      ),
      sp(
        "Describe injury: 'Me duele la polea del dedo anular en la mano derecha. Empezó después del campus board. El dolor es agudo al cerrar completamente el dedo — probablemente una lesión de A2.'",
        5,
      ),
    ],
  },
  {
    n: 17,
    title: "Emergency Response at the Crag",
    readingTemplate: "seed-{lang}-climbing-medical",
    objective: "Call for help and direct an emergency response",
    steps: [
      r("Read the passage. Focus on emergency response vocabulary.", 6),
      sb(
        "Build an emergency sequence: assess the situation → call for help → direct others → give first aid → describe to responders.",
        8,
      ),
      sp(
        "Call for help: 'Necesito ayuda — tenemos un escalador lesionado en la base de la vía Cruzeiro, sector norte. Posible fractura de tobillo. Necesitamos camilla y acceso por la cara sur.'",
        6,
      ),
    ],
  },
  {
    n: 18,
    title: "Communicating with a Local Guide in Brazil",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Navigate a guided climb day entirely in Portuguese",
    steps: [
      r("Read the travel passage. Focus on Brazil-specific climbing vocabulary.", 7),
      pt(
        "Pattern: 'Bom dia — sou o guia. Esta manhã vamos ao Morro Dois Irmãos — uma hora de aproximação. Você tem experiência em tradicional ou só esportiva? Vamos revisar o equipamento antes de sair.' Build guide interaction.",
        8,
      ),
      sp(
        "Interact: 'Boa tarde — vim escalar a Pedra da Gávea com um grupo de quatro pessoas. Dois experientes, dois iniciantes. Quanto tempo para chegar à base? Tem sombra de manhã?'",
        5,
      ),
    ],
  },
  {
    n: 19,
    title: "Renting vs. Buying Gear Abroad",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Negotiate gear rental and discuss gear quality",
    steps: [
      r("Read the passage. Focus on equipment rental vocabulary.", 6),
      ds(
        "Discuss: what to rent vs. bring, how to inspect rental gear, when to decline unsafe equipment.",
        9,
      ),
      sp(
        "Negotiate: 'Quero alugar um kit básico — arnês, capacete e freio. Posso verificar a data de fabricação do arnês? Se o arnês tem mais de dez anos, prefiro não usar. Qual é a política se o equipamento apresentar problema?'",
        5,
      ),
    ],
  },
  {
    n: 20,
    title: "Partner Check (Buddy Check)",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Complete a full buddy check in the target language",
    steps: [
      r("Read the safety passage. Focus on buddy check vocabulary.", 6),
      pt(
        "Pattern: 'Arnês ajustado — cintura e pernas. Nó revisado — retraçado, cauda suficiente. Mosquetão fechado — porta trancada. Sistema de segurança revisado. Prontos?' Build partner check sequence.",
        9,
      ),
      sp(
        "Run the check: 'Verifico seu arnês — cintura ajustada, alças de pernas passadas. Tu verificas mi nudo — ¿está correcto? Dispositivo de aseguramiento — puerta cerrada. ¡Listos para escalar!'",
        5,
      ),
    ],
  },
  {
    n: 21,
    title: "Asking About Route Beta",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Ask for and give specific move beta",
    steps: [
      r("Read the passage. Focus on beta exchange vocabulary.", 7),
      wm(
        "Match: sequence/secuencia, heel hook/gancho de talón, knee bar/rodillero, undercling/saque inferior, sidepull/tracción lateral, deadpoint/punto muerto",
        7,
      ),
      sp(
        "Ask for beta: '¿Cuál es la secuencia en el crux? ¿Pones el pie derecho en el agujerito o usas el talón del lado izquierdo? El movimiento clave — ¿es un deadpoint o dinámico?'",
        6,
      ),
    ],
  },
  {
    n: 22,
    title: "Teaching a Beginner to Climb",
    readingTemplate: "seed-{lang}-climbing-movement",
    objective: "Introduce a complete beginner to climbing in the target language",
    steps: [
      r("Read the passage. Focus on beginner instruction vocabulary.", 7),
      sb(
        "Build a 5-step intro: gear up → tie in → first moves on the wall → trust your feet → first clip or top-out.",
        8,
      ),
      sp(
        "Introduce: 'Hoy vas a aprender tres cosas: cómo ponerte el arnês, cómo nudo ocho, y cómo moverte en la pared. Lo más importante — confía en tus pies. La goma tiene más adherencia de lo que piensas.'",
        5,
      ),
    ],
  },
  {
    n: 23,
    title: "Multi-Pitch Communication",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Communicate between pitches when out of earshot",
    steps: [
      r("Read the passage. Focus on multi-pitch communication vocabulary.", 7),
      pt(
        "Pattern: 'Al llegar a la reunión — gritas: ¡Reunión! El escalador responde: ¡Escalando! Al terminar la cuerda — ¡Cuerda! Si no se escucha — usas señales de cuerda acordadas.' Build multi-pitch system.",
        9,
      ),
      sp(
        "Communicate: 'Llegué a la reunión — ya estoy construyendo el ancla. En tres tirones de cuerda — puedes empezar. Si no escuchas mi grito — espera el triple tirón y empieza.'",
        4,
      ),
    ],
  },
  {
    n: 24,
    title: "Discussing Route History & First Ascents",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Talk about climbing history and famous routes at a destination",
    steps: [
      r("Read the travel passage. Focus on climbing history vocabulary.", 6),
      ds(
        "Discuss the Pedra da Gávea, Morro Dois Irmãos, and Serra do Cipó — what makes them historically significant in Brazilian climbing.",
        10,
      ),
      sp(
        "Share: 'El Morro Dois Irmãos fue escalado por primera vez en 1964. Sigue siendo una de las vías más emblemáticas de Brasil — combinación de escalada deportiva, paisaje único, y historia local.'",
        4,
      ),
    ],
  },
  {
    n: 25,
    title: "Post-Climb Recovery Language",
    readingTemplate: "seed-{lang}-climbing-medical",
    objective: "Discuss muscle soreness, recovery, and injury prevention",
    steps: [
      r("Read the passage. Focus on recovery vocabulary.", 6),
      pt(
        "Pattern: 'Tengo agujetas en los antebrazos. El estiramiento después de escalar ayuda. Si sientes dolor en los tendones — no escales por dos días.' Build recovery conversation.",
        8,
      ),
      sp(
        "Discuss: 'Después de escalar cuerdas — me duelen los antebrazos al día siguiente. Para prevenir lesiones de tendón — calienta siempre y no escales al máximo cada día.'",
        6,
      ),
    ],
  },
  {
    n: 26,
    title: "Describing a Fall",
    readingTemplate: "seed-{lang}-climbing-safety",
    objective: "Narrate what happened in a fall and assess the situation",
    steps: [
      r("Read the safety passage. Focus on fall description vocabulary.", 6),
      sb(
        "Build a fall account: where on the route, what happened, how the rope caught, any injuries, what to do next.",
        8,
      ),
      sp(
        "Narrate: 'Caí en el crux — unos 4 metros. El asegurador me agarró bien. No me golpeé con la pared. Solo me asusté. Revisé manos y pies — todo bien. Vuelvo a intentar la vía.'",
        6,
      ),
    ],
  },
  {
    n: 27,
    title: "Climbing Center / Gym Visit",
    readingTemplate: "seed-{lang}-climbing-gear",
    objective: "Navigate a foreign climbing gym — registration, rental, boulder vs. lead",
    steps: [
      r("Read the passage. Focus on gym navigation vocabulary.", 6),
      wm(
        "Match: bouldering/bloc/boulder, lead wall/muro de cuerda, auto-belay/auto-asegurador, day pass/entrada diaria, harness rental/alquiler de arnés, waiver/exoneración de responsabilidad",
        8,
      ),
      sp(
        "Check in: 'Buenas tardes — quiero escalar en cuerda hoy, no en bloc. ¿Puedo alquilar arnês y freio? ¿Es necesario hacer una prueba de aseguramiento o puedo comenzar directamente?'",
        6,
      ),
    ],
  },
  {
    n: 28,
    title: "Translating for Another Climber",
    readingTemplate: "seed-{lang}-climbing-commands",
    objective: "Interpret for a climbing partner who doesn't speak the local language",
    steps: [
      r("Read the passage. Focus on interpretation vocabulary.", 5),
      ds(
        "Interpret: your partner needs route beta from a local climber, needs to negotiate a guide fee, and needs to ask about local conditions. Translate in real time.",
        12,
      ),
      sp(
        "Translate: 'Mi compañero pregunta si hay agua potable cerca de la base. Dice que en la última visita el acceso estaba cerrado — ¿sigue siendo así? Y quiere saber si hay sombra al mediodía.'",
        3,
      ),
    ],
  },
  {
    n: 29,
    title: "Planning a Multi-Day Climbing Trip Abroad",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective: "Organize a multi-day climbing trip using only the target language",
    steps: [
      r("Read the travel passage. Focus on trip planning vocabulary.", 5),
      ds(
        "Plan a 3-day trip: transportation from city to crag, accommodation near the base, daily objectives, equipment logistics, emergency contact setup.",
        12,
      ),
      sp(
        "Plan: 'Día uno — viajamos de Río a Serra do Cipó, cinco horas. Alojamiento en Cardeal Mota. Día dos y tres — Cânion das Bandeirinhas. Llevamos cuerda de 60 metros, seis expresos, cintas y pequeño botiquín.'",
        3,
      ),
    ],
  },
  {
    n: 30,
    title: "THRESHOLD — A Full Day at the Crag",
    readingTemplate: "seed-{lang}-climbing-travel",
    objective:
      "Communicate every aspect of a climbing day — gear check to post-climb — without switching languages",
    steps: [
      r("Read the climbing passage as your morning preparation.", 5),
      ds(
        "AI-assisted full day at a crag: arrive and meet locals → gear check → partner commands on the wall → route beta → emergency response drill → post-climb debrief. Target language only.",
        12,
      ),
      sp(
        "Debrief: 'El día fue productivo. Escalé tres vías — la más difícil fue [grade]. Me costó [aspect]. La siguiente vez voy a trabajar [skill]. La seguridad estuvo bien — comandos claros todo el tiempo.'",
        3,
      ),
    ],
  },
];

export const EXTENDED_CURRICULA: Record<string, ModuleCurriculum> = {
  "emergency-medicine": {
    moduleId: "emergency-medicine",
    headline: "Emergency Medicine Spanish",
    threshold:
      "By Lesson 30, you can triage and manage an ER patient entirely in the target language — intake, assessment, orders, and family communication.",
    lessons: EM_LESSONS,
  },
  nursing: {
    moduleId: "nursing",
    headline: "Nursing Communication",
    threshold:
      "By Lesson 30, you can conduct a full nursing shift — SBAR handoff, patient assessment, medication administration, and discharge teaching — in the target language.",
    lessons: NURSING_LESSONS,
  },
  "family-medicine": {
    moduleId: "family-medicine",
    headline: "Family Medicine Spanish",
    threshold:
      "By Lesson 30, you can run a complete family medicine visit — intake, exam, diagnosis, treatment plan, and follow-up — in the target language.",
    lessons: FAMILY_MED_LESSONS,
  },
  "ob-gyn": {
    moduleId: "ob-gyn",
    headline: "OB/GYN Communication",
    threshold:
      "By Lesson 30, you can conduct a full OB/GYN encounter — prenatal visit, L&D support, postpartum discharge — in the target language.",
    lessons: OBGYN_LESSONS,
  },
  cardiology: {
    moduleId: "cardiology",
    headline: "Cardiology Spanish",
    threshold:
      "By Lesson 30, you can complete a full cardiology workup conversation — history, diagnosis, procedure consent, and lifestyle counseling — in the target language.",
    lessons: CARDIOLOGY_LESSONS,
  },
  "general-surgery": {
    moduleId: "general-surgery",
    headline: "General Surgery Spanish",
    threshold:
      "By Lesson 30, you can conduct a complete surgical encounter — pre-op, OR communication, recovery, and discharge — in the target language.",
    lessons: GEN_SURGERY_LESSONS,
  },
  "pain-management": {
    moduleId: "pain-management",
    headline: "Pain Management Spanish",
    threshold:
      "By Lesson 30, you can conduct a full pain management clinic visit — intake, assessment, treatment discussion, and follow-up — in the target language.",
    lessons: PAIN_MGMT_LESSONS,
  },
  "physical-therapy": {
    moduleId: "physical-therapy",
    headline: "Physical Therapy Spanish",
    threshold:
      "By Lesson 30, you can run a complete PT session — evaluation, exercise instruction, pain feedback, and discharge planning — in the target language.",
    lessons: PT_LESSONS,
  },
  "medical-receptionist": {
    moduleId: "medical-receptionist",
    headline: "Medical Receptionist Spanish",
    threshold:
      "By Lesson 30, you can manage a full front-desk shift — scheduling, check-in, insurance, and patient communication — in the target language.",
    lessons: MED_RECEP_LESSONS,
  },
  "social-work": {
    moduleId: "social-work",
    headline: "Social Work Spanish",
    threshold:
      "By Lesson 30, you can conduct a full social work assessment and discharge planning session in the target language.",
    lessons: SOCIAL_WORK_LESSONS,
  },
  plumber: {
    moduleId: "plumber",
    headline: "Plumbing Trade Spanish",
    threshold:
      "By Lesson 30, you can manage a full plumbing job — estimate, diagnosis, repair, and customer close — in the target language.",
    lessons: PLUMBER_LESSONS,
  },
  electrician: {
    moduleId: "electrician",
    headline: "Electrical Trade Spanish",
    threshold:
      "By Lesson 30, you can run a complete electrical job site — safety briefing, installation, inspection, and client communication — in the target language.",
    lessons: ELECTRICIAN_LESSONS,
  },
  drywall: {
    moduleId: "drywall",
    headline: "Drywall Trade Spanish",
    threshold:
      "By Lesson 30, you can manage a complete drywall job — estimate, installation, finishing, and client walkthrough — in the target language.",
    lessons: DRYWALL_LESSONS,
  },
  landscaper: {
    moduleId: "landscaper",
    headline: "Landscaping Spanish",
    threshold:
      "By Lesson 30, you can run a full landscaping day — crew assignment, install communication, and client handoff — in the target language.",
    lessons: LANDSCAPER_LESSONS,
  },
  "auto-mechanic": {
    moduleId: "auto-mechanic",
    headline: "Auto Mechanic Spanish",
    threshold:
      "By Lesson 30, you can handle a complete vehicle repair cycle — diagnosis, repair, test drive, and customer delivery — in the target language.",
    lessons: AUTO_MECH_LESSONS,
  },
  "truck-driver": {
    moduleId: "truck-driver",
    headline: "Truck Driver Spanish",
    threshold:
      "By Lesson 30, you can complete a full trucking run — dispatch communication, border crossing, delivery, and log documentation — in the target language.",
    lessons: TRUCK_DRIVER_LESSONS,
  },
  "construction-safety": {
    moduleId: "construction-safety",
    headline: "Construction Safety Spanish",
    threshold:
      "By Lesson 30, you can run a complete safety-first construction shift — morning meeting, toolbox talk, incident response, and end-of-day report — in the target language.",
    lessons: CONST_SAFETY_LESSONS,
  },
  hockey: {
    moduleId: "hockey",
    headline: "Hockey Coaching Spanish",
    threshold:
      "By Lesson 30, you can coach a complete hockey practice and game — drills, bench communication, and post-game debrief — in the target language.",
    lessons: HOCKEY_LESSONS,
  },
  baseball: {
    moduleId: "baseball",
    headline: "Baseball Spanish",
    threshold:
      "By Lesson 30, you can coach a complete baseball game — lineup, bench communication, pitching changes, and post-game debrief — in the target language.",
    lessons: BASEBALL_LESSONS,
  },
  tennis: {
    moduleId: "tennis",
    headline: "Tennis Spanish",
    threshold:
      "By Lesson 30, you can conduct a full tennis coaching session — technique, match strategy, and player development — in the target language.",
    lessons: TENNIS_LESSONS,
  },
  bowling: {
    moduleId: "bowling",
    headline: "Bowling Spanish",
    threshold:
      "By Lesson 30, you can coach a complete bowling session — technique, lane strategy, and league communication — in the target language.",
    lessons: BOWLING_LESSONS,
  },
  "american-football": {
    moduleId: "american-football",
    headline: "American Football Spanish",
    threshold:
      "By Lesson 30, you can coach a complete American football game — play calls, sideline communication, and post-game debrief — in the target language.",
    lessons: FOOTBALL_LESSONS,
  },
  lacrosse: {
    moduleId: "lacrosse",
    headline: "Lacrosse Spanish",
    threshold:
      "By Lesson 30, you can coach a complete lacrosse game — warm-up to post-game — in the target language.",
    lessons: LACROSSE_LESSONS,
  },
  rugby: {
    moduleId: "rugby",
    headline: "Rugby Spanish",
    threshold:
      "By Lesson 30, you can lead an 80-minute rugby match entirely in the target language — warm-up, in-match calls, and post-match debrief.",
    lessons: RUGBY_LESSONS,
  },
  "sports-hobbies": {
    moduleId: "sports-hobbies",
    headline: "Sports & Fitness Spanish",
    threshold:
      "By Lesson 30, you can conduct a complete fitness assessment and training session in the target language.",
    lessons: SPORTS_HOBBIES_LESSONS,
  },
  "dairy-farmer": {
    moduleId: "dairy-farmer",
    headline: "Dairy Farm Spanish",
    threshold:
      "By Lesson 30, you can run a complete milking shift — health checks, parlor, calf care, and end-of-shift report — in the target language.",
    lessons: DAIRY_FARMER_LESSONS,
  },
  "ranch-cowboy": {
    moduleId: "ranch-cowboy",
    headline: "Ranch & Cowboy Spanish",
    threshold:
      "By Lesson 30, you can operate a full ranch day — roundup, handling, health events, and end-of-day report — in the target language.",
    lessons: RANCH_COWBOY_LESSONS,
  },
  "meatpacking-butcher": {
    moduleId: "meatpacking-butcher",
    headline: "Meatpacking & Butcher Spanish",
    threshold:
      "By Lesson 30, you can lead an entire processing shift — pre-op to end-of-shift report — in the target language.",
    lessons: MEATPACKING_LESSONS,
  },
  "restaurant-hospitality": {
    moduleId: "restaurant-hospitality",
    headline: "Restaurant & Hospitality Spanish",
    threshold:
      "By Lesson 30, you can complete an entire restaurant service — orders, kitchen communication, and closing — in the target language.",
    lessons: RESTAURANT_LESSONS,
  },
  "legal-immigration": {
    moduleId: "legal-immigration",
    headline: "Legal & Immigration Spanish",
    threshold:
      "By Lesson 30, you can conduct a full client consultation — intake, rights, case strategy, and next steps — in the target language.",
    lessons: LEGAL_IMMIGRATION_LESSONS,
  },
  "k12-teacher": {
    moduleId: "k12-teacher",
    headline: "K-12 Teaching Spanish",
    threshold:
      "By Lesson 30, you can navigate a complete school day — instruction, IEP meeting, parent call, and debrief — in the target language.",
    lessons: K12_TEACHER_LESSONS,
  },
  "international-travel": {
    moduleId: "international-travel",
    headline: "International Travel Spanish",
    threshold:
      "By Lesson 30, you can navigate a complete day abroad — transportation, shopping, dining, and social interaction — without switching to your native language.",
    lessons: TRAVEL_LESSONS,
  },
  "catholic-ministry": {
    moduleId: "catholic-ministry",
    headline: "Catholic Ministry Spanish",
    threshold:
      "By Lesson 30, you can lead or assist a complete Sunday Mass and pastoral encounter in the target language.",
    lessons: CATHOLIC_LESSONS,
  },
  fmg: {
    moduleId: "fmg",
    headline: "Foreign Medical Graduate English",
    threshold:
      "By Lesson 30, you can complete a full residency program interview — self-introduction, clinical case, ethics scenario, and Q&A — in English.",
    lessons: FMG_LESSONS,
  },
  "rock-climbing": {
    moduleId: "rock-climbing",
    headline: "Rock Climbing Language",
    threshold:
      "By Lesson 30, you can communicate every aspect of a climbing day — gear check, partner commands, movement coaching, emergency response, and post-climb debrief — in your target language.",
    lessons: CLIMBING_LESSONS,
  },
};
