/** Stable role IDs shared by web and native clients; appearance is deliberately absent. */
export const SPEAKING_PARTNERS = [
  [
    "open",
    "Open conversation",
    "Everyday",
    "a friendly conversation partner",
    "a language learner",
  ],
  ["friend", "Friend", "Everyday", "the learner's friend", "your friend"],
  ["family", "Family member", "Everyday", "an adult family member", "an adult relative"],
  ["neighbor", "Neighbor", "Everyday", "the learner's neighbor", "your neighbor"],
  ["boss", "Boss / supervisor", "Work", "the learner's supervisor", "a team member"],
  [
    "employee",
    "Employee / team member",
    "Work",
    "a team member reporting to the learner",
    "the team supervisor",
  ],
  ["coworker", "Coworker", "Work", "a colleague working alongside the learner", "your coworker"],
  [
    "customer",
    "Customer / client",
    "Work",
    "a customer asking for a service",
    "a service provider",
  ],
  [
    "receptionist",
    "Receptionist / scheduler",
    "Appointments",
    "a receptionist arranging an appointment",
    "someone arranging an appointment",
  ],
  [
    "patient",
    "Patient",
    "Healthcare",
    "a patient communicating with the learner",
    "a healthcare worker",
  ],
  [
    "patient-family",
    "Patient's family member",
    "Healthcare",
    "an adult relative asking about a patient's care",
    "a healthcare worker",
  ],
  [
    "nurse",
    "Nurse",
    "Healthcare",
    "a nurse coordinating care or room preparation",
    "a colleague or patient, as the module specifies",
  ],
  [
    "physician",
    "Physician",
    "Healthcare",
    "a physician discussing the selected situation",
    "a colleague or patient, as the module specifies",
  ],
  [
    "medical-assistant",
    "Medical assistant",
    "Healthcare",
    "a medical assistant handling clinic intake",
    "a patient arriving at a clinic",
  ],
  [
    "evs-supervisor",
    "OR cleaning supervisor",
    "OR cleaning",
    "an OR environmental services supervisor coordinating the cleaning crew",
    "an OR cleaning technician",
  ],
  [
    "evs-coworker",
    "OR cleaning coworker",
    "OR cleaning",
    "an OR cleaning technician working alongside the learner",
    "another OR cleaning technician",
  ],
  [
    "circulating-nurse",
    "Circulating nurse",
    "OR cleaning",
    "the circulating nurse coordinating room access and turnover",
    "an OR cleaning crew member",
  ],
  [
    "new-cleaner",
    "New cleaning crew member",
    "OR cleaning",
    "a new OR cleaning employee asking for instruction",
    "an experienced OR cleaning crew member",
  ],
  [
    "surgeon",
    "Surgeon",
    "OR cleaning",
    "a surgeon asking about room readiness",
    "an OR cleaning crew member",
  ],
  [
    "inspector",
    "Inspector",
    "Trades",
    "an inspector asking for an explanation of the work and its documentation",
    "the worker responsible for explaining the work",
  ],
  ["foreman", "Foreman", "Trades", "a foreman coordinating the crew", "a crew member"],
  ["apprentice", "Apprentice", "Trades", "an apprentice learning a job", "an experienced worker"],
  [
    "supplier",
    "Supplier",
    "Trades",
    "a supplier confirming an order",
    "a worker ordering supplies",
  ],
  [
    "mechanic",
    "Mechanic",
    "Trades",
    "a mechanic discussing a vehicle problem",
    "a customer explaining a vehicle problem",
  ],
  [
    "dispatcher",
    "Dispatcher",
    "Work",
    "a dispatcher coordinating a route or response",
    "a worker confirming instructions",
  ],
  [
    "lawyer",
    "Lawyer",
    "Professional services",
    "a lawyer conducting a practice intake conversation",
    "a prospective client",
  ],
  [
    "accountant",
    "Accountant",
    "Professional services",
    "an accountant asking about records and a financial question",
    "a client explaining their records",
  ],
  [
    "salesperson",
    "Salesperson",
    "Shopping & travel",
    "a salesperson helping compare products",
    "a shopper",
  ],
  [
    "car-salesperson",
    "Car salesperson",
    "Shopping & travel",
    "a car salesperson asking about vehicle needs and budget",
    "a customer shopping for a vehicle",
  ],
  [
    "server",
    "Server / barista",
    "Shopping & travel",
    "a restaurant server or barista taking an order",
    "a customer ordering food or drinks",
  ],
  [
    "hotel",
    "Hotel receptionist",
    "Shopping & travel",
    "a hotel receptionist confirming a reservation",
    "a hotel guest",
  ],
  [
    "driver",
    "Driver",
    "Shopping & travel",
    "a taxi or rideshare driver confirming the destination",
    "a passenger",
  ],
  ["guide", "Local guide", "Shopping & travel", "a local guide helping plan a visit", "a visitor"],
  [
    "pharmacist",
    "Pharmacist",
    "Healthcare",
    "a pharmacist clarifying a prescription and questions",
    "a customer at a pharmacy",
  ],
  [
    "teacher",
    "Teacher",
    "Education",
    "a teacher discussing a lesson or school situation",
    "a learner or parent, as the module specifies",
  ],
  ["student", "Student", "Education", "a student asking about the lesson", "a teacher"],
  [
    "parent",
    "Parent / guardian",
    "Education",
    "an adult parent discussing school arrangements",
    "a teacher or school staff member",
  ],
  ["coach", "Coach", "Sports", "a coach planning training and giving feedback", "a player"],
  ["teammate", "Teammate", "Sports", "a teammate coordinating practice", "another player"],
  ["referee", "Referee", "Sports", "a referee explaining a decision", "a player or coach"],
  [
    "captain",
    "Fishing captain",
    "Sports",
    "a fishing captain discussing conditions and the trip",
    "an angler",
  ],
  [
    "belayer",
    "Climbing partner / belayer",
    "Sports",
    "a climbing partner confirming commands and plans",
    "a climber",
  ],
  [
    "farm-supervisor",
    "Farm supervisor",
    "Agriculture",
    "a farm supervisor assigning the day's work",
    "a farmworker",
  ],
  [
    "farmworker",
    "Farmworker / ranch hand",
    "Agriculture",
    "a farmworker confirming tasks",
    "a farm supervisor",
  ],
  [
    "veterinarian",
    "Veterinarian",
    "Agriculture",
    "a veterinarian asking about an animal's condition",
    "an animal caretaker",
  ],
  [
    "visitor",
    "Community visitor",
    "Faith",
    "a community member curious about the learner's ministry",
    "a ministry volunteer",
  ],
  [
    "ministry-colleague",
    "Ministry colleague",
    "Faith",
    "a fellow ministry volunteer planning a visit",
    "another ministry volunteer",
  ],
] as const;
export type SpeakingPartnerId = (typeof SPEAKING_PARTNERS)[number][0];
export function speakingPartner(id: string | undefined) {
  return SPEAKING_PARTNERS.find((r) => r[0] === id) ?? SPEAKING_PARTNERS[0];
}
export function suggestedPartnerIds(moduleId: string, category: string): string[] {
  if (/or-evs|or-cleaning/.test(moduleId))
    return [
      "circulating-nurse",
      "evs-supervisor",
      "evs-coworker",
      "new-cleaner",
      "surgeon",
      "inspector",
    ];
  if (moduleId.includes("sport-fishing"))
    return ["captain", "guide", "coworker", "salesperson", "friend", "customer"];
  if (moduleId.includes("climbing"))
    return ["belayer", "coach", "guide", "friend", "salesperson", "receptionist"];
  if (/soccer|hockey|baseball|tennis|bowling|football|lacrosse|rugby/.test(moduleId))
    return ["coach", "teammate", "referee", "parent", "teacher", "friend"];
  const groups: Record<string, string[]> = {
    Medical: [
      "patient",
      "patient-family",
      "nurse",
      "physician",
      "medical-assistant",
      "receptionist",
    ],
    Trades: ["foreman", "coworker", "apprentice", "customer", "inspector", "supplier"],
    Sports: ["coach", "teammate", "referee", "captain", "belayer", "customer"],
    Agriculture: [
      "farm-supervisor",
      "farmworker",
      "veterinarian",
      "supplier",
      "coworker",
      "customer",
    ],
    Faith: ["visitor", "ministry-colleague", "friend", "family", "neighbor", "receptionist"],
    Education: ["teacher", "student", "parent", "coworker", "boss", "friend"],
    Travel: ["server", "hotel", "driver", "guide", "salesperson", "pharmacist"],
  };
  return groups[category] ?? ["friend", "boss", "employee", "coworker", "customer", "receptionist"];
}
export function speakingPartnerInstructions(
  id: string | undefined,
  module?: { name: string; userRole: string; blurb: string; vocabFocus: string[] },
) {
  const role = speakingPartner(id);
  return [
    `Partner role: ${role[3]}. Learner role: ${role[4]}. Do not swap these roles.`,
    module
      ? `Course context: ${module.name}. ${module.blurb} Vocabulary: ${module.vocabFocus.join(", ")}. ${role[0] === "open" ? `Learner's course role: ${module.userRole}.` : "Use the course setting when compatible with the selected roles; otherwise keep the selected relationship and use transferable vocabulary."}`
      : "Use an everyday setting appropriate for this relationship.",
    "Stay in this role throughout the conversation. Start with one relevant, easy-to-answer question in the target language, rather than asking what the learner wants to practice. Never supply the learner's answer for them.",
    "Honor requests to slow down, use shorter sentences, repeat, explain a word or change the subject. Let free conversation remain open-ended. Do not impose a mission completion requirement. This is a simulated language practice conversation; do not claim professional credentials or take real-world actions.",
  ].join("\n");
}
