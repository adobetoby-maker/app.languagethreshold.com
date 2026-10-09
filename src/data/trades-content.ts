import { ROOFING_CONTENT } from "./roofing-content.ts";

export interface ModulePhrase {
  en: string; // The English phrase a tradesperson would say
  intent: string; // One short label for what this phrase accomplishes
}

export interface SampleTurn {
  speaker: "learner" | "ai";
  en: string;
}

export interface ModuleArea {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  counterpart: string; // who the AI plays in this scenario
  learnerRole: string; // who the learner plays
  toneNote: string; // register/style guidance for the AI tutor
  phrases: ModulePhrase[]; // 6-8 phrases
  vocab: string[]; // 6-10 key terms
  challenges: string[]; // 3 roleplay prompts
  sampleConversation: SampleTurn[]; // 4-6 turn back-and-forth showing authentic exchange
}

export interface ModuleVocabSet {
  category: string;
  emoji: string;
  words: string[]; // 8-10 words
}

export interface TradesModuleContent {
  moduleId: string;
  areas: ModuleArea[]; // 6-8 scenario areas per module
  vocabSets: ModuleVocabSet[]; // 4-5 themed vocab sets per module
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAMER MODULE
// ─────────────────────────────────────────────────────────────────────────────

const framerModule: TradesModuleContent = {
  moduleId: "framer",
  areas: [
    {
      id: "morning-crew-brief",
      name: "Morning Crew Brief",
      emoji: "🌅",
      blurb:
        "Start the day right — lay out the plan, assign tasks, and make sure everyone knows the sequence before the first nail goes in.",
      counterpart: "Lead Carpenter",
      learnerRole: "Framing Foreman",
      toneNote:
        "Direct, efficient, no fluff. Foreman talk is short sentences and clear assignments. Mild Spanish loan words are normal here.",
      phrases: [
        { en: "Alright, listen up — here's the plan for today.", intent: "open briefing" },
        {
          en: "We're framing the north wall first, then we'll work our way around.",
          intent: "set sequence",
        },
        { en: "Carlos, you're on plates. Miguel, start pulling layout.", intent: "assign tasks" },
        { en: "We need to be at lock-up by Thursday — no exceptions.", intent: "set deadline" },
        {
          en: "If you run into anything that doesn't match the plans, stop and call me.",
          intent: "set protocol",
        },
        {
          en: "Keep your cords out of the walkway — I don't want anyone going down.",
          intent: "safety reminder",
        },
        {
          en: "We're short on LVL — don't start the header until I get back with the order.",
          intent: "hold work",
        },
        { en: "Good work yesterday. Let's keep that pace.", intent: "motivate crew" },
      ],
      vocab: [
        "plates",
        "layout",
        "LVL (laminated veneer lumber)",
        "header",
        "lock-up",
        "plumb",
        "level",
        "king stud",
        "cripple",
        "chalk line",
      ],
      challenges: [
        "You arrive to find two workers about to frame a window opening 6 inches too wide. Redirect them without embarrassing anyone.",
        "A new laborer doesn't understand the sequence. Walk him through plates-to-studs-to-header without jargon.",
        "The lumber drop is late. Reorganize the crew's morning tasks on the fly.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Alright everybody, gather up. Here's the deal — we're doing the east wall this morning, north wall after lunch.",
        },
        {
          speaker: "ai",
          en: "Hey, boss — what do we do about that window opening on the east wall? The plans show a 4-foot header but we only got 3-ply on the truck.",
        },
        {
          speaker: "learner",
          en: "Use what we've got for now. Stack it and nail it tight. I'll call the yard and get the right LVL out here by noon.",
        },
        {
          speaker: "ai",
          en: "Copy that. You want us to snap lines first or start cutting plates?",
        },
        {
          speaker: "learner",
          en: "Snap your lines first — always. Plates go nowhere until the layout's right. Last thing I need is a wall that's 2 inches off.",
        },
        { speaker: "ai", en: "Understood. I'll grab the chalk line. You want 16 on-center or 24?" },
      ],
    },
    {
      id: "wall-layout",
      name: "Wall Layout",
      emoji: "📐",
      blurb:
        "Pulling layout is where framing gets accurate or gets ugly. Learn how to read the plans, snap lines, and mark plates so the crew can follow.",
      counterpart: "Apprentice Framer",
      learnerRole: "Lead Framer",
      toneNote:
        "Patient but precise — teaching while doing. Use numbers and directions freely. Metric slip-ins (metros, centímetros) are fine if the learner uses them.",
      phrases: [
        { en: "Measure from this corner — that's your baseline.", intent: "establish reference" },
        {
          en: "Hook the end of the tape right here, don't let it slip.",
          intent: "measurement instruction",
        },
        {
          en: "Mark your OC layout every 16 inches, start from the left edge.",
          intent: "on-center spacing",
        },
        { en: "Snap the chalk line from here to here — keep it tight.", intent: "snap line" },
        {
          en: "These two plates need to be identical — lay them side by side when you mark.",
          intent: "plate matching",
        },
        {
          en: "That wall is 2 inches out of square — we need to fix it before we lift.",
          intent: "identify problem",
        },
        {
          en: "Make sure your crown is up on every stud before you nail.",
          intent: "quality check",
        },
      ],
      vocab: [
        "OC (on-center)",
        "baseline",
        "chalk line",
        "crown",
        "plumb bob",
        "story pole",
        "bearing wall",
        "rough opening (RO)",
        "double top plate",
        "layout marks",
      ],
      challenges: [
        "Your apprentice has snapped the chalk line in the wrong place. Correct the layout without tearing out completed work.",
        "The plans show a non-standard window RO. Walk through how to calculate and mark it.",
        "You need to lay out a wall that starts from an existing framed corner — explain how to pick up the layout.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay, grab both plates and lay them right here on the deck, crown side up.",
        },
        { speaker: "ai", en: "How do I know which way the crown is?" },
        {
          speaker: "learner",
          en: "Sight down the length of the board — see that slight bow? That's the crown. Always points up, never down.",
        },
        { speaker: "ai", en: "Got it. So they're both crown up. Now what?" },
        {
          speaker: "learner",
          en: "Line them up end to end, same edge facing you. We're marking both at once so they match perfect. Hook your tape at this end — X marks a stud, O marks a space.",
        },
        { speaker: "ai", en: "What happens at the window opening?" },
      ],
    },
    {
      id: "material-order",
      name: "Material Order",
      emoji: "🪵",
      blurb:
        "Running out of lumber mid-job kills momentum. Learn how to count a take-off, call the yard, and make sure the right material shows up on time.",
      counterpart: "Lumberyard Rep",
      learnerRole: "Framing Contractor",
      toneNote:
        "Business casual — professional but not stiff. Know your species, grades, and dimensions. The yard rep expects precision.",
      phrases: [
        {
          en: "I need a quote on framing lumber for a 2,200 square foot single-story.",
          intent: "open request",
        },
        { en: "Give me 200 studs, 2x4x92-5/8, KD Doug fir.", intent: "specify material" },
        { en: "I also need 40 sticks of 2x10x16 for floor joists.", intent: "add to order" },
        { en: "What's your lead time on LVL right now?", intent: "check availability" },
        {
          en: "Can you deliver Thursday morning? We go up that afternoon.",
          intent: "schedule delivery",
        },
        {
          en: "Make sure the load is straight and no splits — I had bowed boards last time.",
          intent: "quality request",
        },
        {
          en: "I'll need 50 sheets of OSB, 7/16, and 20 of 3/4 T&G for the subfloor.",
          intent: "add sheathing",
        },
        {
          en: "Shoot me the invoice by email — same billing as last time.",
          intent: "billing instruction",
        },
      ],
      vocab: [
        "KD (kiln-dried)",
        "Doug fir",
        "stud",
        "LVL",
        "OSB (oriented strand board)",
        "T&G (tongue and groove)",
        "take-off",
        "board feet",
        "sticker stock",
        "lead time",
      ],
      challenges: [
        "The yard is out of KD 2x6. Negotiate an acceptable substitute for an exterior wall order.",
        "Your delivery arrives and the LVL beams are the wrong length. Handle the dispute on the phone.",
        "You forgot to order hurricane ties. Place an add-on order without losing your delivery slot.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Hey, this is Marcos over at Summit Framing. I need to place an order for a delivery Thursday AM.",
        },
        { speaker: "ai", en: "Morning, Marcos. What do you need?" },
        {
          speaker: "learner",
          en: "Start with 250 pre-cuts, 2x4x92-5/8, Doug fir KD. Then 60 sticks of 2x6x16 for the headers.",
        },
        {
          speaker: "ai",
          en: "I can do the pre-cuts no problem. On the 2x6 — you want select structural or number 2?",
        },
        {
          speaker: "learner",
          en: "Number 2 is fine for headers as long as there are no big knots near the ends. Header stock, you know how it is.",
        },
        {
          speaker: "ai",
          en: "Understood. I'll pull the better boards from the pile. What else you got?",
        },
      ],
    },
    {
      id: "blueprint-reading",
      name: "Blueprint Reading",
      emoji: "📋",
      blurb:
        "Plans on the table, crew looking over your shoulder — learn to read and explain what the drawings say before anyone picks up a tool.",
      counterpart: "Field Supervisor",
      learnerRole: "Lead Framer",
      toneNote:
        "Confident and clear. Tradespersons reference plans with direction, dimension, and sheet number. Uncertainty is okay but must be resolved before work starts.",
      phrases: [
        {
          en: "Pull out sheet A2.1 — that's the floor plan we're working from today.",
          intent: "reference document",
        },
        {
          en: "This symbol here means a bearing wall — we can't modify that without engineering.",
          intent: "explain symbol",
        },
        {
          en: "The dimension string runs from face of stud to face of stud — not finished surface.",
          intent: "clarify dimension type",
        },
        {
          en: "See this note? It says 'verify in field' — that means we measure before we frame.",
          intent: "flag field condition",
        },
        {
          en: "The header schedule is on A5 — look up every opening before you start.",
          intent: "direct to schedule",
        },
        {
          en: "North is up on this plan. The street side is the bottom of the page.",
          intent: "orient to plan",
        },
        {
          en: "There's a conflict between the structural and architectural sheets — hold work until we get an RFI answer.",
          intent: "flag discrepancy",
        },
      ],
      vocab: [
        "bearing wall",
        "RFI (request for information)",
        "dimension string",
        "header schedule",
        "section cut",
        "elevation",
        "scale",
        "callout",
        "detail bubble",
        "as-built",
      ],
      challenges: [
        "The architectural and structural plans show different window sizes. Explain why you're stopping work and what you need from the GC.",
        "A new framer can't read a dimension string. Teach them the difference between face-of-stud and finish dimensions.",
        "The inspector asks you where the header schedule is. Walk him through the plan set to find it.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Come take a look at this. We've got an issue on the east elevation.",
        },
        { speaker: "ai", en: "What's going on?" },
        {
          speaker: "learner",
          en: "The architectural sheet shows a 6-foot window here, but the structural sheet calls out a 4-foot rough opening. Those two don't match.",
        },
        { speaker: "ai", en: "So which one do we go by?" },
        {
          speaker: "learner",
          en: "Neither — not until we get clarification. I'm writing an RFI right now. You don't frame a bearing wall based on a guess.",
        },
        { speaker: "ai", en: "How long does an RFI usually take?" },
      ],
    },
    {
      id: "inspection-walk",
      name: "Inspection Walk",
      emoji: "🔍",
      blurb:
        "The framing inspector is on site. Know what they're looking at, answer their questions confidently, and catch your own issues before they do.",
      counterpart: "Building Inspector",
      learnerRole: "Framing Contractor",
      toneNote:
        "Respectful and straightforward. Inspectors are not adversaries — treat them as professionals. Don't over-explain; answer what's asked.",
      phrases: [
        {
          en: "Good morning — framing's ready for inspection on building one.",
          intent: "initiate inspection",
        },
        {
          en: "The header schedule is right here on the plans — everything matches.",
          intent: "show documentation",
        },
        {
          en: "These are double top plates with a half-inch minimum lap at the splice — per code.",
          intent: "explain compliance",
        },
        {
          en: "Yes, sir — all hangers are nailed out with the manufacturer-specified fasteners.",
          intent: "confirm compliance",
        },
        {
          en: "That notch is within the allowable depth for a non-bearing stud.",
          intent: "defend work",
        },
        {
          en: "I'll get that strapping installed before you come back — what time works for a re-check?",
          intent: "address correction",
        },
        {
          en: "Can I get that in writing so I know exactly what needs to change?",
          intent: "request written correction",
        },
      ],
      vocab: [
        "framing inspection",
        "red tag",
        "correction notice",
        "double top plate",
        "hanger",
        "shear wall",
        "hold-down",
        "blocking",
        "notch limit",
        "re-inspection",
      ],
      challenges: [
        "The inspector finds that your shear wall nailing pattern is wrong. Accept the correction professionally and explain your correction plan.",
        "The inspector asks about a missing hold-down anchor you actually installed — it's behind a recently hung wall. Navigate this diplomatically.",
        "You receive a red tag. Explain to your GC what happened and what the fix is.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Morning. We're ready for framing inspection on the east wing." },
        { speaker: "ai", en: "Morning. You got your plans and the approved permit on site?" },
        {
          speaker: "learner",
          en: "Right here. Plans are stamped, permit's posted at the front entrance.",
        },
        {
          speaker: "ai",
          en: "Okay. I'm going to walk the shear walls first. What's your nailing schedule on the OSB?",
        },
        {
          speaker: "learner",
          en: "6 inches on the edges, 12 in the field — per the structural sheets right here on page S3.",
        },
        {
          speaker: "ai",
          en: "Let me check a few spots. I see some gaps in this corner panel — looks like you missed a few nails along the bottom plate.",
        },
      ],
    },
    {
      id: "subcontractor-coordination",
      name: "Subcontractor Coordination",
      emoji: "🤝",
      blurb:
        "Framers don't work alone — plumbers, electricians, and HVAC all need their holes and openings. Learn to coordinate without conflict.",
      counterpart: "Plumbing Foreman",
      learnerRole: "Framing Foreman",
      toneNote:
        "Collegial but firm about structural limits. Trades respect each other but protect their own work. Keep it direct and solution-focused.",
      phrases: [
        {
          en: "Hey, before you cut anything, run it by me — I need to know it's not a bearing member.",
          intent: "establish protocol",
        },
        {
          en: "You can't notch that beam — that's structural. We need to find another way.",
          intent: "protect structure",
        },
        {
          en: "I can drill you a 3-inch hole right here, but I need it by tomorrow or the wall goes up.",
          intent: "offer and deadline",
        },
        {
          en: "What size sleeve do you need for the vent penetration through the top plate?",
          intent: "gather info",
        },
        {
          en: "Let's walk the walls together before you start drilling so we're on the same page.",
          intent: "coordinate walk",
        },
        {
          en: "I'll hold the soffit framing until you confirm your duct size.",
          intent: "sequence hold",
        },
        {
          en: "Any changes from the rough-in drawings, you tell me first — I don't want surprises.",
          intent: "set communication rule",
        },
      ],
      vocab: [
        "penetration",
        "sleeve",
        "bearing member",
        "soffit framing",
        "rough-in",
        "notch limit",
        "boring",
        "top plate",
        "fire blocking",
        "coordination drawing",
      ],
      challenges: [
        "A plumber wants to notch a king stud to run a supply line. Explain why you can't allow it and offer an alternative path.",
        "An HVAC sub installed ductwork in a chase you haven't framed yet. Sort out the sequence issue without blaming either crew.",
        "The electrician needs three 4-inch holes through a doubled LVL. Walk through the structural concern and find a solution.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Hey Ruben — before your guys start drilling on the second floor, let's walk it together.",
        },
        {
          speaker: "ai",
          en: "Yeah, good idea. I've got three supply runs going up through the floor system. My guy says the joists are in the way.",
        },
        { speaker: "learner", en: "Which joists are we talking about? Show me on the plan." },
        {
          speaker: "ai",
          en: "Right here — joist bay 4 and 5. He wants to drill through the web of both.",
        },
        {
          speaker: "learner",
          en: "Joist 5 is a doubled LVL. You can bore through it, but there are limits on location and diameter. I need to check the span tables before anyone touches it.",
        },
        { speaker: "ai", en: "How long will that take? My crew is here now." },
      ],
    },
    {
      id: "safety-talk",
      name: "Safety Talk",
      emoji: "⛑️",
      blurb:
        "Framing sites have real hazards — falls, nail guns, heavy loads. Learn to lead a toolbox talk that actually sticks.",
      counterpart: "Crew Member",
      learnerRole: "Safety Lead / Foreman",
      toneNote:
        "Serious but not preachy. Safety talks should feel practical and real, not like a corporate compliance video. Short and specific beats long and vague.",
      phrases: [
        {
          en: "Before we touch the nail guns today, I want to run through a few things.",
          intent: "open safety talk",
        },
        {
          en: "Nobody's going above 6 feet without a harness — that's non-negotiable.",
          intent: "set fall protection rule",
        },
        {
          en: "Keep your finger off the trigger until you're ready to nail.",
          intent: "nail gun safety",
        },
        {
          en: "If a wall starts to rack when we raise it, let it go — no one gets hurt for a wall.",
          intent: "emergency protocol",
        },
        { en: "Hard hats are on when the crane is running. No exceptions.", intent: "PPE rule" },
        {
          en: "If you get hurt, tell me immediately — don't walk it off.",
          intent: "incident reporting",
        },
        {
          en: "Watch out for protruding nails on the deck — we had two punctures last month.",
          intent: "site hazard callout",
        },
        {
          en: "Everyone clear on that? Any questions before we start?",
          intent: "confirm understanding",
        },
      ],
      vocab: [
        "harness",
        "lanyard",
        "PPE (personal protective equipment)",
        "toolbox talk",
        "nail gun",
        "kickback",
        "fall hazard",
        "guardrail",
        "incident report",
        "near miss",
      ],
      challenges: [
        "A worker removed their harness on a second-story deck because it was 'getting in the way.' Address it in front of the crew without humiliating them.",
        "Give a 3-minute toolbox talk on nail gun safety to a crew that includes two new hires.",
        "A near-miss just happened — a wall racked and almost fell on a worker. Lead an impromptu debrief.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay, before we lift these walls — gather around, I've got three things.",
        },
        { speaker: "ai", en: "What's up, boss?" },
        {
          speaker: "learner",
          en: "We're going up 14 feet today on the gable end. I need harnesses on before anyone steps within 6 feet of the edge. No debate.",
        },
        { speaker: "ai", en: "Mine's in the truck — is it okay if I run and grab it real quick?" },
        {
          speaker: "learner",
          en: "That's exactly what you should do. Go. Second thing — when we raise the wall, four of us on the pike poles. If she starts to go, we let go and get clear. We raise another day.",
        },
        { speaker: "ai", en: "What do we do if it tips toward the deck?" },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Lumber Dimensions & Types",
      emoji: "🪵",
      words: [
        "2x4",
        "2x6",
        "2x10",
        "2x12",
        "LVL (laminated veneer lumber)",
        "PSL (parallel strand lumber)",
        "OSB",
        "CDX plywood",
        "pre-cut stud",
        "Doug fir",
      ],
    },
    {
      category: "Wall Framing Terms",
      emoji: "🔨",
      words: [
        "king stud",
        "jack stud",
        "cripple",
        "trimmer",
        "sill plate",
        "double top plate",
        "rough opening",
        "header",
        "bearing wall",
        "shear wall",
      ],
    },
    {
      category: "Tools of the Trade",
      emoji: "🛠️",
      words: [
        "framing nailer",
        "chalk line",
        "speed square",
        "plumb bob",
        "laser level",
        "sawzall",
        "circular saw",
        "cat's paw",
        "sledge",
        "tape measure",
      ],
    },
    {
      category: "Inspection & Code",
      emoji: "📋",
      words: [
        "red tag",
        "correction notice",
        "hold-down anchor",
        "shear nailing",
        "blocking",
        "hurricane tie",
        "hanger",
        "re-inspection",
        "permit",
        "as-built",
      ],
    },
    {
      category: "Jobsite Commands (Bilingual Crew)",
      emoji: "🗣️",
      words: [
        "pásame el tape",
        "snap the line",
        "más plumb",
        "hold it level",
        "cuidado con los clavos",
        "move the stack",
        "amarra eso",
        "check your layout",
        "doble arriba",
        "clear the deck",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PLUMBER MODULE
// ─────────────────────────────────────────────────────────────────────────────

const plumberModule: TradesModuleContent = {
  moduleId: "plumber",
  areas: [
    {
      id: "service-call-intake",
      name: "Service Call Intake",
      emoji: "📞",
      blurb:
        "First contact sets the tone. Diagnose over the phone, set expectations, and book the call — all without being there yet.",
      counterpart: "Homeowner",
      learnerRole: "Plumber / Service Tech",
      toneNote:
        "Calm, professional, reassuring. Homeowners are often stressed about plumbing problems. Ask good questions, don't promise what you can't confirm.",
      phrases: [
        {
          en: "Tell me what's happening — when did you first notice it?",
          intent: "open diagnosis",
        },
        {
          en: "Is the water shut off right now, or is it still running?",
          intent: "assess urgency",
        },
        { en: "Do you know where your main shutoff is?", intent: "emergency prep" },
        {
          en: "That sounds like it could be a P-trap issue — pretty common and usually a quick fix.",
          intent: "preliminary diagnosis",
        },
        {
          en: "I can have someone out between 10 and noon — does that work?",
          intent: "schedule service",
        },
        {
          en: "There's a $95 dispatch fee that gets applied to the repair if we do the work.",
          intent: "quote dispatch fee",
        },
        {
          en: "Don't pour any more water down that drain until we look at it.",
          intent: "prevent further damage",
        },
        {
          en: "I'll send you a confirmation text with the tech's name and estimated arrival.",
          intent: "confirm booking",
        },
      ],
      vocab: [
        "main shutoff",
        "P-trap",
        "dispatch fee",
        "service call",
        "drain snake",
        "backflow",
        "sewer smell",
        "water pressure",
        "shutoff valve",
        "slow drain",
      ],
      challenges: [
        "A homeowner describes water coming up from their toilet when the washer drains. Diagnose the likely cause and explain it simply.",
        "A caller is panicking about a burst pipe. Walk them through shutting off the water while you route an emergency tech.",
        "Quote a service call to someone who insists there should be no dispatch fee. Handle the objection professionally.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Thanks for calling Rivera Plumbing, this is José. What can I help you with?",
        },
        {
          speaker: "ai",
          en: "Hi — I've got water coming up in my bathtub every time I flush the toilet. It started this morning.",
        },
        {
          speaker: "learner",
          en: "Okay — that's usually a sign of a blockage downstream in your main line. Is the water clear or dark?",
        },
        { speaker: "ai", en: "It's kind of brownish. Should I be worried?" },
        {
          speaker: "learner",
          en: "Brownish means it's probably sewer water — you'll want to keep everyone away from that tub. Don't use any drains in the house until we get there.",
        },
        { speaker: "ai", en: "Oh wow. Can you come today?" },
      ],
    },
    {
      id: "rough-in",
      name: "Rough-In",
      emoji: "🔧",
      blurb:
        "Getting the DWV and supply rough-in right saves headaches for every trade that follows. Learn the language of grade, slope, and chase.",
      counterpart: "Apprentice Plumber",
      learnerRole: "Journeyman Plumber",
      toneNote:
        "Teaching mode — methodical and precise. Code numbers, slope fractions, and pipe sizes are common. Don't skip the why.",
      phrases: [
        {
          en: "Your drain needs to slope 1/4 inch per foot — no more, no less.",
          intent: "specify slope",
        },
        {
          en: "We're running a 3-inch DWV stack from the basement to the roof penetration.",
          intent: "describe scope",
        },
        {
          en: "Make sure you support the pipe every 4 feet — don't let it sag.",
          intent: "support instruction",
        },
        {
          en: "The vent needs to be within 6 feet of the trap — or we need a re-vent.",
          intent: "vent code",
        },
        {
          en: "Glue it, don't just push it — primer first, then cement, full rotation.",
          intent: "joining instruction",
        },
        {
          en: "Stub out the supply lines 6 inches past the finished wall plane.",
          intent: "supply stubout",
        },
        {
          en: "Leave a cleanout at every change of direction over 45 degrees.",
          intent: "cleanout placement",
        },
        {
          en: "Get a pressure test scheduled before drywall goes up.",
          intent: "inspection timing",
        },
      ],
      vocab: [
        "DWV (drain-waste-vent)",
        "stack",
        "slope",
        "cleanout",
        "vent",
        "stub-out",
        "P-trap",
        "ABS",
        "PVC",
        "wet wall",
      ],
      challenges: [
        "Your apprentice installed a drain with too much slope — now it's a siphoning risk. Explain the problem and walk through the fix.",
        "The GC wants to close up a wall before the rough-in inspection. Explain why you can't allow that.",
        "You're relocating a toilet 3 feet from the existing stack. Walk through how you'll handle the new rough-in.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay, before you glue anything — let's walk the drain run first.",
        },
        { speaker: "ai", en: "I've got it all dry-fit. Looks good to me." },
        {
          speaker: "learner",
          en: "Humor me. Lay your level on that horizontal run. What's the slope reading?",
        },
        { speaker: "ai", en: "It's showing about 3/8 inch per foot." },
        {
          speaker: "learner",
          en: "That's too steep. You want 1/4 per foot — any more and the water outruns the solids and you get blockages. Pull the section back and re-support it.",
        },
        { speaker: "ai", en: "I thought steeper meant faster drainage." },
      ],
    },
    {
      id: "fixture-installation",
      name: "Fixture Installation",
      emoji: "🚿",
      blurb:
        "Finish work is where the homeowner sees results. Install it clean, test it right, and leave the customer confident.",
      counterpart: "Homeowner",
      learnerRole: "Plumber",
      toneNote:
        "Professional and personable. Homeowners notice how you treat their space. Explain what you're doing, answer questions without condescension.",
      phrases: [
        {
          en: "I'm going to shut off the supply valves under the sink before I start.",
          intent: "prep for install",
        },
        {
          en: "This faucet uses a cartridge — if it ever drips, that's the first thing to replace.",
          intent: "educate customer",
        },
        {
          en: "Make sure you caulk around the base of the toilet — it keeps sewer gas from getting in.",
          intent: "advise on finish",
        },
        {
          en: "I'm going to run the water for two minutes and check under the cabinet — just want to be sure.",
          intent: "test and verify",
        },
        {
          en: "That's your shutoff right there — if something ever leaks, that's the first thing to hit.",
          intent: "point out shutoff",
        },
        {
          en: "The toilet should be rock solid — if you feel any movement, call us.",
          intent: "set performance expectation",
        },
        {
          en: "Don't use silicone on the threads — use Teflon tape, two to three wraps.",
          intent: "installation tip",
        },
      ],
      vocab: [
        "cartridge",
        "wax ring",
        "supply line",
        "shutoff angle stop",
        "caulk",
        "Teflon tape",
        "flange",
        "p-trap",
        "escutcheon",
        "aerator",
      ],
      challenges: [
        "After installing a faucet, you find a slow drip from the connection. Diagnose it in front of the homeowner without making them panic.",
        "The toilet rocks slightly after installation. Explain the fix and make sure the homeowner understands the wax ring issue.",
        "A homeowner asks why you're using Teflon tape instead of pipe dope. Give a clear, confident answer.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay, I've got the new faucet in. Let me turn the supply back on and check everything.",
        },
        { speaker: "ai", en: "Looks great — it matches the rest of the hardware we picked out." },
        {
          speaker: "learner",
          en: "Good. I'm running the hot and cold — you'll hear it fill the lines. Check under the cabinet with me.",
        },
        {
          speaker: "ai",
          en: "I see a little bit of moisture right there at the supply connection.",
        },
        {
          speaker: "learner",
          en: "Good catch. That's just the braided line wasn't seated all the way. Hand me my channel locks — I'll snug it up and we'll recheck.",
        },
        { speaker: "ai", en: "Is that a common problem?" },
      ],
    },
    {
      id: "leak-diagnosis",
      name: "Leak Diagnosis",
      emoji: "💧",
      blurb:
        "Water goes where it wants. Learn how to trace a leak back to its source — which is rarely where the damage appears.",
      counterpart: "Homeowner",
      learnerRole: "Plumber",
      toneNote:
        "Investigative and methodical. Homeowners often misidentify the source. Lead them through the logic without dismissing their observations.",
      phrases: [
        {
          en: "The stain is on the ceiling, but the leak is almost never directly above the stain.",
          intent: "set expectations",
        },
        {
          en: "Let me do a dye test in the toilet — we'll know in 15 minutes if it's the flapper.",
          intent: "propose test",
        },
        {
          en: "When does it drip — while water's running, or after everything's off?",
          intent: "narrow diagnosis",
        },
        {
          en: "I'm going to cut a small inspection hole to trace the pipe path.",
          intent: "invasive diagnosis",
        },
        {
          en: "That's condensation, not a leak — cold pipes sweat in humid weather.",
          intent: "correct misdiagnosis",
        },
        {
          en: "The pressure coming in is over 80 PSI — that's too high and it stresses all your joints.",
          intent: "identify systemic cause",
        },
        {
          en: "We'll need to check behind the shower valve — that's a common failure point for this brand.",
          intent: "identify suspect",
        },
      ],
      vocab: [
        "dye test",
        "pressure gauge",
        "PRV (pressure reducing valve)",
        "flapper",
        "sweating pipe",
        "pinhole leak",
        "shutoff test",
        "water meter",
        "inspection hole",
        "moisture meter",
      ],
      challenges: [
        "A homeowner insists the upstairs toilet is leaking into the kitchen ceiling. Your inspection suggests it's actually the shower supply. Navigate the conversation.",
        "You find a pinhole leak in a copper line inside the wall. Explain your repair options — patch vs. repipe — to the homeowner.",
        "A homeowner had another plumber look at this leak and was told it was 'nothing.' Now it's gotten worse. Handle the delicate situation professionally.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "So you said the stain showed up about a week ago. Is it getting bigger or staying the same size?",
        },
        {
          speaker: "ai",
          en: "It looks a little bigger to me, honestly. We've been scared to use the upstairs bathroom.",
        },
        {
          speaker: "learner",
          en: "That's actually the right call. Let me run a quick test — I'm going to flush the toilet once and have you watch the stain while I watch up here.",
        },
        { speaker: "ai", en: "Okay — I just flushed it. Did you see anything?" },
        {
          speaker: "learner",
          en: "Yeah — it's dripping right after the flush. That points to the wax ring or the flange seal, not the supply. Good news: that's a contained fix.",
        },
        { speaker: "ai", en: "Does that mean you have to tear out the ceiling?" },
      ],
    },
    {
      id: "permit-inspection",
      name: "Permit & Inspection",
      emoji: "📝",
      blurb:
        "Pulling a permit and passing inspection is part of the job. Learn how to talk to the inspector and keep the project moving.",
      counterpart: "Plumbing Inspector",
      learnerRole: "Licensed Plumber",
      toneNote:
        "Respectful and factual. Inspectors have authority but also want the job to pass. Be organized, have your documentation, and don't guess on code questions.",
      phrases: [
        {
          en: "I've got my permit pulled and rough-in is ready for inspection.",
          intent: "request inspection",
        },
        { en: "All DWV lines are at 10 PSI air test and holding.", intent: "report test results" },
        {
          en: "The trap arm length is within code — I measured it at 4 feet to the vent.",
          intent: "confirm compliance",
        },
        {
          en: "I can reference the UPC if you want — section 904 covers vent sizing.",
          intent: "cite code",
        },
        {
          en: "I'll fix the cleanout location and call for re-inspection by tomorrow.",
          intent: "accept correction",
        },
        {
          en: "The supply lines passed pressure test at 100 PSI for 15 minutes.",
          intent: "confirm pressure test",
        },
        {
          en: "Can I get your name and the correction items in writing, please?",
          intent: "document correction",
        },
      ],
      vocab: [
        "UPC (Uniform Plumbing Code)",
        "air test",
        "pressure test",
        "trap arm",
        "vent stack",
        "cleanout",
        "re-inspection",
        "permit",
        "licensed plumber",
        "as-built",
      ],
      challenges: [
        "An inspector flags your vent stack for insufficient diameter. Pull the code reference and defend your installation.",
        "The inspector finds a missing cleanout that you know is behind drywall that another sub already closed up. Handle it professionally.",
        "A GC pressures you to have the inspector sign off before you've finished the pressure test. Hold your ground.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Good morning — I'm ready for the plumbing rough-in inspection on unit 4.",
        },
        { speaker: "ai", en: "Morning. Is your air test holding?" },
        {
          speaker: "learner",
          en: "Yes sir — DWV is at 10 PSI, been holding for an hour. Supply is tested to 100 PSI — 15-minute hold, no drop.",
        },
        {
          speaker: "ai",
          en: "Good. Let me walk the stack. I'm looking at this vent on the master bath — what's the diameter here?",
        },
        {
          speaker: "learner",
          en: "That's a 2-inch individual vent serving the lav and the tub. The stack is 3-inch.",
        },
        {
          speaker: "ai",
          en: "The tub drain is a 1-1/2. Your vent needs to be at least 1-1/4 to match, but I'd rather see it as big as the drain. Who sized this?",
        },
      ],
    },
    {
      id: "parts-order",
      name: "Parts Order",
      emoji: "🏪",
      blurb:
        "Knowing part numbers, specs, and where to get things fast is half the job in service plumbing. Don't lose a day waiting for the wrong part.",
      counterpart: "Supply House Counter Rep",
      learnerRole: "Plumber",
      toneNote:
        "Quick and precise. Supply house conversations are fast-paced. Know your specs and don't waste the counter rep's time.",
      phrases: [
        {
          en: "I need a Kohler Coralais cartridge — the one with the two tabs on top.",
          intent: "specify part",
        },
        {
          en: "What's the OD on that fitting? I need to match my existing line.",
          intent: "verify dimension",
        },
        {
          en: "Do you have a 3/4-inch ball valve, full port, sweat ends, in stock?",
          intent: "check stock",
        },
        {
          en: "I'll take two of those. Can you put them on my account?",
          intent: "charge to account",
        },
        {
          en: "I need a wax ring with a horn for a 3-inch closet flange.",
          intent: "specify consumable",
        },
        {
          en: "Can you pull a Moen 1225 — homeowner has a Posi-Temp single-handle.",
          intent: "identify cartridge",
        },
        {
          en: "If you don't have it, can you have it transferred from the other branch by noon?",
          intent: "request transfer",
        },
      ],
      vocab: [
        "OD (outside diameter)",
        "ball valve",
        "full port",
        "sweat ends",
        "wax ring",
        "cartridge",
        "Posi-Temp",
        "closet flange",
        "supply house",
        "will-call",
      ],
      challenges: [
        "You're at the counter and realize you grabbed the wrong faucet model number. Get help identifying the right cartridge using only a description of the faucet.",
        "The part you need is out of stock. Negotiate a same-day transfer or find an acceptable substitute.",
        "A new apprentice needs to learn how to order from the supply house. Walk them through the process.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Hey — I need a Moen 1225B cartridge. You got it?" },
        {
          speaker: "ai",
          en: "Let me check. Yeah, I've got two in stock. Standard or the B-series?",
        },
        { speaker: "learner", en: "B-series — it's a Posi-Temp valve, single-handle shower." },
        { speaker: "ai", en: "Gotcha. That'll be $22.50. You want the retainer clip with it?" },
        {
          speaker: "learner",
          en: "Yeah, throw it in. And I need a 3/4-inch SharkBite ball valve while I'm here — full port.",
        },
        {
          speaker: "ai",
          en: "I've got the 1/2-inch in SharkBite but the 3/4 full port I only have in press-fit right now. Will that work?",
        },
      ],
    },
    {
      id: "customer-estimate",
      name: "Customer Estimate",
      emoji: "💰",
      blurb:
        "Presenting a price is a skill. Be clear about scope, set expectations on timing, and give the customer confidence they're making a good decision.",
      counterpart: "Homeowner",
      learnerRole: "Plumber / Estimator",
      toneNote:
        "Professional and transparent. Don't bury the price. Explain what drives the cost. Let the customer say yes or no without pressure.",
      phrases: [
        {
          en: "Based on what I've seen, this is going to be a one-day job.",
          intent: "set time expectation",
        },
        {
          en: "The estimate for parts and labor is $485 — that includes everything to fix this leak.",
          intent: "present price",
        },
        {
          en: "If we find something unexpected inside the wall, I'll call you before we go any further.",
          intent: "set change order protocol",
        },
        {
          en: "This price is good for 30 days. If you want to move forward, just give us a call.",
          intent: "quote validity",
        },
        {
          en: "The biggest cost here is labor — it's a tight space and it'll take us about 3 hours.",
          intent: "explain cost driver",
        },
        {
          en: "I can't do it cheaper without knowing what's in the wall — I don't want to low-ball you and then surprise you.",
          intent: "defend price",
        },
        {
          en: "We do offer a senior discount — 10% off parts if that helps.",
          intent: "offer discount",
        },
        {
          en: "We're licensed, bonded, and insured — that's part of what you're paying for.",
          intent: "justify value",
        },
      ],
      vocab: [
        "estimate",
        "change order",
        "time and material",
        "flat rate",
        "scope of work",
        "parts and labor",
        "contingency",
        "warranty",
        "bonded",
        "licensed",
      ],
      challenges: [
        "A homeowner says they got a quote $200 cheaper from another plumber. Respond without badmouthing the competition.",
        "Mid-job, you discover the pipe damage is worse than the estimate covered. Call the homeowner and present the change order.",
        "A homeowner asks for an estimate over the phone without a site visit. Explain why you need to see it first.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay, I've had a chance to look at everything. Here's what I'm seeing.",
        },
        { speaker: "ai", en: "Is it bad?" },
        {
          speaker: "learner",
          en: "It's manageable. The main line has a root intrusion about 40 feet out. We need to hydro-jet it and put in a clean-out access point. I'm looking at $650 for the job.",
        },
        { speaker: "ai", en: "That's more than I was expecting. Is there a cheaper option?" },
        {
          speaker: "learner",
          en: "We could just snake it today for $250 — but I've done that on roots and they come back within 6 months. The hydro-jet clears it for 2-3 years and you get a camera video showing the result.",
        },
        { speaker: "ai", en: "Okay, that makes sense. Can you do it today?" },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Pipe Types & Fittings",
      emoji: "🔩",
      words: [
        "PVC",
        "ABS",
        "copper",
        "PEX",
        "CPVC",
        "elbow",
        "coupling",
        "tee",
        "reducer",
        "union",
      ],
    },
    {
      category: "DWV System",
      emoji: "🚰",
      words: [
        "P-trap",
        "vent stack",
        "cleanout",
        "wye",
        "slope",
        "air admittance valve",
        "wet vent",
        "dry vent",
        "stack",
        "drain line",
      ],
    },
    {
      category: "Supply & Pressure",
      emoji: "💧",
      words: [
        "PRV (pressure reducing valve)",
        "shutoff valve",
        "angle stop",
        "ball valve",
        "gate valve",
        "water pressure",
        "expansion tank",
        "supply line",
        "stub-out",
        "manifold",
      ],
    },
    {
      category: "Service & Diagnosis",
      emoji: "🔍",
      words: [
        "dye test",
        "smoke test",
        "camera inspection",
        "hydro-jetting",
        "auger",
        "drain snake",
        "moisture meter",
        "leak detector",
        "backflow preventer",
        "water hammer",
      ],
    },
    {
      category: "Jobsite Terms (Bilingual)",
      emoji: "🗣️",
      words: [
        "la llave maestra",
        "shut off the water",
        "el desagüe",
        "check for leaks",
        "la trampa / the trap",
        "pon cinta teflon",
        "más presión",
        "la cañería",
        "tighten the connection",
        "aguas / watch out",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// DRYWALL MODULE
// ─────────────────────────────────────────────────────────────────────────────

const drywallModule: TradesModuleContent = {
  moduleId: "drywall",
  areas: [
    {
      id: "hang-day-brief",
      name: "Hang Day Brief",
      emoji: "📋",
      blurb:
        "A good hang day starts with a plan. Assign lift heights, sequence rooms, and make sure everyone knows the sheet size and ceiling height before the truck gets unloaded.",
      counterpart: "Drywall Hanger",
      learnerRole: "Drywall Foreman",
      toneNote:
        "Fast and direct. Drywall crews move quick. The brief should be short — job assignments, not long explanations. Use room names and directions.",
      phrases: [
        { en: "Ceilings first in every room — no exceptions.", intent: "set sequence rule" },
        {
          en: "We're using 5/8 throughout — this is a Type X fire-rated assembly.",
          intent: "specify board",
        },
        {
          en: "Bedrooms get 12-foot boards — keep your seams off the window center.",
          intent: "layout instruction",
        },
        {
          en: "Don't let the edges land on the same stud on back-to-back rooms.",
          intent: "stagger seams",
        },
        {
          en: "Use the lift on the great room ceiling — no one's holding sheet rock over their heads all day.",
          intent: "equipment instruction",
        },
        { en: "Screw pattern is 12 inches on walls, 8 on ceilings.", intent: "fastener spacing" },
        {
          en: "Stack the boards inside the rooms before we start — don't stage them in the hall.",
          intent: "material staging",
        },
        {
          en: "We're done when the last sheet is up and tagged, not when you're tired.",
          intent: "set completion standard",
        },
      ],
      vocab: [
        "Type X",
        "fire-rated",
        "lift (drywall panel lift)",
        "screw pattern",
        "butt joint",
        "taper joint",
        "stagger",
        "field cut",
        "header",
        "load bearing",
      ],
      challenges: [
        "Two hangers are about to run 4x8 sheets in a room where 4x12s fit — stopping them wastes sheets but saves taping joints. Make the call and explain it.",
        "The drywall lift is broken. Reorganize how the crew handles the great room ceiling safely.",
        "A hanger put a butt joint at the center of a wide wall — explain why that's a problem and how to fix it.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Alright — listen up. We've got 22 squares today across four rooms. Here's the order.",
        },
        { speaker: "ai", en: "Are we doing ceilings first or walls?" },
        {
          speaker: "learner",
          en: "Ceilings first, always. You run walls without a ceiling board, you've got no backing at the top of the wall when you tape. Master bedroom starts, then we work north to south.",
        },
        { speaker: "ai", en: "What board in the master — 12-foot?" },
        {
          speaker: "learner",
          en: "Yeah. And keep your butt joints off the center of the ceiling. Any butt joint goes within 16 inches of the wall. Center seams are where cracks show up later.",
        },
        { speaker: "ai", en: "Got it. What's the screw pattern?" },
      ],
    },
    {
      id: "taping-bedding",
      name: "Taping & Bedding",
      emoji: "🖌️",
      blurb:
        "Mud work is a craft. Learn the language of coats, tools, and timing — and why rushing the tape coat creates problems that show up through the paint.",
      counterpart: "Taper Apprentice",
      learnerRole: "Lead Taper",
      toneNote:
        "Methodical and exacting. Taping is technique-heavy. Be precise about coat thickness, drying time, and tool choice. Don't skip the why.",
      phrases: [
        {
          en: "First coat is all tape — get it embedded, scrape it flat, and walk away.",
          intent: "tape coat instruction",
        },
        {
          en: "The tape bubbles because you didn't put enough mud under it. Skim more on the next pass.",
          intent: "diagnose bubble",
        },
        {
          en: "Let this coat dry bone dry before you touch it — 24 hours minimum in cold weather.",
          intent: "drying time",
        },
        {
          en: "Your second coat, widen out about 4 inches on each side of the tape.",
          intent: "feather second coat",
        },
        {
          en: "Use the 10-inch knife on the flat joints, the 6-inch in the corners.",
          intent: "tool selection",
        },
        {
          en: "Don't try to sand out mud that isn't dry — you'll dig yourself a hole.",
          intent: "prevent mistake",
        },
        {
          en: "Hot mud sets in 45 minutes — once you mix it, move.",
          intent: "setting compound timing",
        },
        {
          en: "Corners need two passes — one side, dry, then the other. Never both wet.",
          intent: "corner technique",
        },
      ],
      vocab: [
        "all-purpose mud",
        "setting compound (hot mud)",
        "joint tape",
        "paper tape",
        "mesh tape",
        "feathering",
        "crown",
        "taping knife",
        "corner bead",
        "coat (first/second/finish)",
      ],
      challenges: [
        "An apprentice used mesh tape on a butt joint and it's cracking. Explain the correct tape choice and what to do with the bad joint.",
        "The mud is too thick and tearing the tape. Walk the apprentice through the right consistency for a tape coat.",
        "It's cold and the mud isn't drying. Diagnose the problem and give options for keeping the project moving.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Okay — look at this joint. What do you see wrong?" },
        { speaker: "ai", en: "It looks a little rough. There's kind of a ridge on one side." },
        {
          speaker: "learner",
          en: "Right — you crowned it. That means the center is higher than the edges. When you paint, light catches it and you can see the whole joint from across the room.",
        },
        { speaker: "ai", en: "How do I fix it?" },
        {
          speaker: "learner",
          en: "Sand it flat when it's completely dry — not damp. Then skim another thin coat and feather it out wider on both sides. The trick is in the width, not the depth.",
        },
        { speaker: "ai", en: "Should I use the 6-inch or the 10-inch for that?" },
      ],
    },
    {
      id: "finish-coat",
      name: "Finish Coat",
      emoji: "✨",
      blurb:
        "The finish coat is what customers see. Learn to skim flat, eliminate ridges, and leave a surface ready for paint — without leaving tool marks.",
      counterpart: "GC / Project Manager",
      learnerRole: "Lead Finisher",
      toneNote:
        "Confident and professional. GCs and homeowners inspect finish work under raking light. Set clear expectations about what Level 5 means vs. Level 4.",
      phrases: [
        {
          en: "This is a Level 4 finish — all joints and fasteners, no skim coat on the face.",
          intent: "set finish level",
        },
        {
          en: "If you want Level 5, we need to skim the entire board surface — that's a separate price.",
          intent: "upsell finish level",
        },
        {
          en: "Shine a work light at a low angle before you call it done — it shows everything.",
          intent: "inspection technique",
        },
        {
          en: "That's called a picture frame — where the mud stops at the board edge. We need to feather it out.",
          intent: "identify defect",
        },
        {
          en: "The finish coat goes on thin — you're filling, not building.",
          intent: "coat technique",
        },
        {
          en: "This wall needs a skim — the board surface is too rough for semi-gloss.",
          intent: "recommend skim",
        },
        {
          en: "Don't sand the paper face — once you cut through it, you've got a repair job.",
          intent: "sanding warning",
        },
      ],
      vocab: [
        "Level 4 finish",
        "Level 5 finish",
        "skim coat",
        "raking light",
        "feather",
        "picture frame (defect)",
        "lap mark",
        "hot spot",
        "sandpaper grit",
        "primer",
      ],
      challenges: [
        "A GC is pushing for Level 5 finish but hasn't budgeted for it. Have the conversation about scope and price.",
        "Raking light reveals tool marks across an entire wall. Diagnose what caused them and walk through the repair.",
        "Paint was applied before the finish coat dried completely. Explain what happened and what needs to be redone.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "We're ready for your walk-through on the living room. I'll be honest — shine a light on that north wall at a low angle first.",
        },
        { speaker: "ai", en: "Okay — I see some ridges right there near the top corner." },
        {
          speaker: "learner",
          en: "Yeah — that's a lap mark from the second coat. We didn't feather far enough. We'll knock that back and hit it again today — dry by tomorrow.",
        },
        {
          speaker: "ai",
          en: "The painter is scheduled for Wednesday. Is that still going to work?",
        },
        {
          speaker: "learner",
          en: "If it's warm enough in here, yes. You need at least 65 degrees and 24 hours of dry time. Can you confirm the heat is on?",
        },
        { speaker: "ai", en: "I'll have the HVAC guys keep it at 68. Will that be enough?" },
      ],
    },
    {
      id: "texture",
      name: "Texture",
      emoji: "🎨",
      blurb:
        "Orange peel, knockdown, skip trowel — matching existing texture is one of the hardest finish skills. Learn to talk through patterns and test panels.",
      counterpart: "Homeowner",
      learnerRole: "Drywall Finisher",
      toneNote:
        "Patient and visual. Texture is hard to describe — use comparisons, references, and always recommend a test panel before committing.",
      phrases: [
        {
          en: "Before I spray the whole room, let me do a test panel so you can approve the pattern.",
          intent: "propose test panel",
        },
        {
          en: "What you've got is orange peel — medium splatter. I can match that.",
          intent: "identify existing texture",
        },
        {
          en: "Knockdown takes more skill to match — the trowel pattern is different every time.",
          intent: "set complexity expectation",
        },
        {
          en: "Is there another room in the house I can look at that hasn't been painted over?",
          intent: "find texture reference",
        },
        {
          en: "The texture needs to dry before we paint — at least an hour for orange peel, longer for knockdown.",
          intent: "dry time",
        },
        {
          en: "I'm going to adjust the air pressure — it was coming out too heavy.",
          intent: "adjust spray equipment",
        },
        {
          en: "If you want smooth walls throughout, we'd have to skim the existing texture off first. That's a bigger job.",
          intent: "scope change",
        },
      ],
      vocab: [
        "orange peel",
        "knockdown",
        "skip trowel",
        "splatter",
        "hopper gun",
        "air pressure",
        "consistency (mud)",
        "test panel",
        "lace texture",
        "Santa Fe finish",
      ],
      challenges: [
        "A homeowner wants you to match a texture that was applied 15 years ago and painted 3 times. Set realistic expectations.",
        "The hopper gun keeps splattering too heavy. Walk through the troubleshooting steps out loud.",
        "A homeowner doesn't know what texture they have and wants you to guess from a photo. Walk them through how you'd assess it in person.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Before we talk about the repair, can you show me a wall in another room that still has the original texture?",
        },
        {
          speaker: "ai",
          en: "Sure — this hallway here hasn't been repainted since the house was built.",
        },
        {
          speaker: "learner",
          en: "Okay, that's a medium orange peel. I can match that. I'll do a test patch on a scrap board first so you can hold it up to the wall and approve it before I spray.",
        },
        { speaker: "ai", en: "That sounds good. What if it doesn't match?" },
        {
          speaker: "learner",
          en: "Then I adjust the gun — air pressure and distance from the wall change the pattern. Give me 10 minutes to dial it in. You won't see a test panel before I commit to the room.",
        },
        { speaker: "ai", en: "What about the popcorn in the bedroom? Can you match that too?" },
      ],
    },
    {
      id: "inspection-prep",
      name: "Inspection Prep",
      emoji: "🔦",
      blurb:
        "Whether it's a GC walk or a city inspection, getting to a clean sign-off means catching your own issues first.",
      counterpart: "Project Manager",
      learnerRole: "Drywall Foreman",
      toneNote:
        "Self-critical and proactive. The best walk-through is one where you already flagged everything. Never let the PM find something you missed.",
      phrases: [
        {
          en: "I walked it under raking light this morning — I've already got a punch list.",
          intent: "proactive inspection",
        },
        {
          en: "We've got four fastener pops and two corner cracks to address.",
          intent: "report defects",
        },
        {
          en: "That crack at the window corner is stress-related — we'll V-cut it, tape it, and it should hold.",
          intent: "diagnose and plan repair",
        },
        {
          en: "Everything is Level 4 as specified — if the spec changes, I need it in writing.",
          intent: "protect scope",
        },
        {
          en: "The bathroom ceiling will need another pass — there's a shadow seam I don't like.",
          intent: "self-flag defect",
        },
        {
          en: "We're ready for prime — all fasteners set and filled, no tape showing.",
          intent: "confirm readiness",
        },
        {
          en: "I'll have the punch list items done by end of day Thursday.",
          intent: "commit to timeline",
        },
      ],
      vocab: [
        "punch list",
        "fastener pop",
        "shadow seam",
        "V-cut",
        "stress crack",
        "corner bead crack",
        "raking light",
        "Level 4",
        "prime-ready",
        "touch-up",
      ],
      challenges: [
        "The PM finds a shadow seam in the living room that you thought you had addressed. Own the issue and commit to a timeline.",
        "An inspector flags drywall in a fire-rated assembly that used the wrong board type. Explain your plan to remediate.",
        "You find stress cracks at a window corner the day before prime. Decide whether to repair now or flag it as a post-paint issue and explain why.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Hey — before you walk it, I want to give you my list so we're not surprised.",
        },
        { speaker: "ai", en: "Go ahead." },
        {
          speaker: "learner",
          en: "Master bath ceiling has a shadow seam — I'll hit it today. Kitchen has two fastener pops I missed last pass. Hallway corner bead is clean, but there's a hairline at the west window.",
        },
        { speaker: "ai", en: "How bad is the window crack?" },
        {
          speaker: "learner",
          en: "Typical stress crack — just needs a V-cut and re-tape. It'll be invisible under paint. I'm not worried about it.",
        },
        {
          speaker: "ai",
          en: "Can you have everything prime-ready by Friday morning? Painter is on site at 7 AM.",
        },
      ],
    },
    {
      id: "touch-up-walk",
      name: "Touch-Up Walk",
      emoji: "🏠",
      blurb:
        "The final walk with the homeowner or GC is your last chance to get it right. Know how to handle feedback, document what's needed, and close the job professionally.",
      counterpart: "Homeowner",
      learnerRole: "Drywall Finisher",
      toneNote:
        "Professional and receptive. Take notes, be honest about what you can and cannot fix, and don't get defensive. The customer sees the job finished, not in process.",
      phrases: [
        {
          en: "Walk me through anything that doesn't look right — I'd rather hear it now.",
          intent: "open feedback",
        },
        {
          en: "That's a painting issue, not a drywall issue — see how the line is sharp? That's a paint edge.",
          intent: "distinguish responsibility",
        },
        {
          en: "You're right, that seam shows — I'll skim it and we'll put primer on before we leave.",
          intent: "accept correction",
        },
        {
          en: "I'm going to tag every spot so my guy doesn't miss anything.",
          intent: "document issues",
        },
        {
          en: "The marks on this wall are from the painter's tape — that's not our scope.",
          intent: "protect scope",
        },
        {
          en: "Everything on this list will be done by end of day — I'll send you a photo when we're out.",
          intent: "commit and confirm",
        },
        {
          en: "Is there anything upstairs we should walk before I send the crew home?",
          intent: "check for more",
        },
      ],
      vocab: [
        "touch-up",
        "punch list",
        "tape pop",
        "paint line",
        "skim coat",
        "scope of work",
        "tag (defect marker)",
        "primer",
        "GC signoff",
        "warranty",
      ],
      challenges: [
        "A homeowner is pointing out marks on the wall that are clearly from the mover's furniture — not drywall defects. Handle it diplomatically.",
        "You completed touch-up work and the homeowner found two more items they hadn't mentioned before. Navigate the scope conversation.",
        "The homeowner asks if the drywall comes with a warranty. Explain what is and isn't covered.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Thanks for taking the time for this walk. Please point out anything that doesn't look right to you.",
        },
        {
          speaker: "ai",
          en: "Okay — right here in the dining room, I can see the outline of a seam when the light hits it.",
        },
        {
          speaker: "learner",
          en: "Yeah — I see it too. That one's on me. The board crown moved when it dried. I'll skim that today and spot prime it. It'll be invisible.",
        },
        { speaker: "ai", en: "What about this spot in the hallway? It looks like a small dent." },
        {
          speaker: "learner",
          en: "That's a paint ding — you can see the paper isn't broken, the paint just has a divot. That one goes to your painter to fill before the final coat.",
        },
        { speaker: "ai", en: "How do I know which is which?" },
      ],
    },
    {
      id: "materials-order",
      name: "Materials Order",
      emoji: "📦",
      blurb:
        "Ordering for a drywall job means knowing your square footage, board sizes, mud quantities, and what the job spec calls for — before you call the supplier.",
      counterpart: "Drywall Supply Rep",
      learnerRole: "Drywall Contractor",
      toneNote:
        "Businesslike and specific. Have your take-off ready before you call. Supply reps move fast — know your numbers and your delivery window.",
      phrases: [
        {
          en: "I need a delivery quote for a 2,800-square-foot single story.",
          intent: "open request",
        },
        {
          en: "Give me 180 sheets of 4x12, half-inch, regular — and 20 sheets of 5/8 Type X for the garage.",
          intent: "specify board order",
        },
        {
          en: "I need 8 buckets of all-purpose and 2 boxes of hot mud, 45-minute.",
          intent: "order mud",
        },
        {
          en: "Throw in 4 rolls of paper tape and 2 boxes of corner bead.",
          intent: "add consumables",
        },
        {
          en: "Can you deliver Thursday morning — I need it before 7 AM.",
          intent: "schedule delivery",
        },
        {
          en: "No bent boards — last time three sheets came off the truck bowed. I sent them back.",
          intent: "quality note",
        },
        {
          en: "Bill it to the Riverside job account — same as last week.",
          intent: "billing instruction",
        },
      ],
      vocab: [
        "4x12 drywall",
        "5/8 Type X",
        "all-purpose mud",
        "45-minute hot mud",
        "paper tape",
        "corner bead",
        "take-off",
        "square footage",
        "board count",
        "delivery window",
      ],
      challenges: [
        "You under-estimated the mud needed and need an emergency add-on delivery without paying a second delivery fee. Negotiate it.",
        "The delivery arrives and a dozen sheets are bowed. Handle the dispute with the driver and the supplier on the phone.",
        "A spec change requires Type X board in rooms you already ordered regular drywall for. Place the change order and figure out what to do with the wrong material.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Hey, this is Diego at Pinnacle Drywall. I need to place a delivery for Thursday morning, needs to be there by 6:30.",
        },
        {
          speaker: "ai",
          en: "Good timing — I've still got a Thursday slot open. What are you looking at?",
        },
        {
          speaker: "learner",
          en: "200 sheets of 4x12 half-inch regular, 30 sheets of 5/8 Type X. I also need 10 buckets all-purpose, 4 buckets topping, and 2 boxes 45-minute.",
        },
        { speaker: "ai", en: "I can do all of that. You want pre-mixed or powder on the topping?" },
        {
          speaker: "learner",
          en: "Pre-mixed. And I need real paper tape — not the mesh. I'm doing all the butt joints with paper.",
        },
        {
          speaker: "ai",
          en: "Two rolls paper tape, noted. Corner bead — do you need vinyl or metal?",
        },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Board Types",
      emoji: "🧱",
      words: [
        "regular (white board)",
        "Type X (fire-rated)",
        "moisture-resistant (green board)",
        "mold-resistant (purple board)",
        "foil-back",
        "abuse-resistant",
        "5/8 inch",
        "1/2 inch",
        "4x8",
        "4x12",
      ],
    },
    {
      category: "Mud & Taping",
      emoji: "🪣",
      words: [
        "all-purpose compound",
        "topping compound",
        "setting compound (hot mud)",
        "paper tape",
        "mesh tape",
        "joint knife",
        "hawk",
        "corner bead",
        "feather edge",
        "crown",
      ],
    },
    {
      category: "Finish Levels & Defects",
      emoji: "🔦",
      words: [
        "Level 4",
        "Level 5",
        "skim coat",
        "fastener pop",
        "tape crack",
        "shadow seam",
        "picture frame",
        "lap mark",
        "bubble",
        "raking light",
      ],
    },
    {
      category: "Tools",
      emoji: "🛠️",
      words: [
        "drywall lift",
        "screw gun",
        "taping knife (6-inch)",
        "taping knife (10-inch)",
        "corner finisher",
        "hopper gun",
        "sander",
        "pole sander",
        "stilts",
        "T-square",
      ],
    },
    {
      category: "Jobsite Terms (Bilingual)",
      emoji: "🗣️",
      words: [
        "el tablarroca / drywall",
        "la masa / mud",
        "la cinta / tape",
        "clavos / screws",
        "el techo / ceiling",
        "la esquina / corner",
        "pon más masa",
        "está chueco",
        "lija eso / sand that",
        "ya secó / it's dry",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICIAN MODULE
// ─────────────────────────────────────────────────────────────────────────────

const electricianModule: TradesModuleContent = {
  moduleId: "electrician",
  areas: [
    {
      id: "panel-work",
      name: "Panel Work",
      emoji: "⚡",
      blurb:
        "The panel is the heart of any electrical system. Learn how to talk about load calculations, breakers, and panel upgrades safely and accurately.",
      counterpart: "Homeowner",
      learnerRole: "Electrician",
      toneNote:
        "Authoritative but accessible. Panels intimidate homeowners. Explain things clearly without being condescending. Safety language is non-negotiable.",
      phrases: [
        {
          en: "I'm going to kill the main before I open the panel — stand back, please.",
          intent: "safety before work",
        },
        {
          en: "You've got a 200-amp service — that's standard for this size house.",
          intent: "describe existing service",
        },
        {
          en: "This double-tap is a code violation — two circuits can't share one breaker.",
          intent: "flag violation",
        },
        {
          en: "You're going to need a sub-panel in the garage for all those circuits.",
          intent: "recommend sub-panel",
        },
        {
          en: "I'm not touching those federal Pacific breakers — they need to go before we do anything else.",
          intent: "flag unsafe equipment",
        },
        {
          en: "Your neutral bar is full — we need to address that before we add anything.",
          intent: "identify capacity issue",
        },
        {
          en: "I can have a load calculation done — that'll tell us if the service needs to be upgraded.",
          intent: "offer analysis",
        },
        {
          en: "Label every breaker before I leave — I won't close this panel without a complete directory.",
          intent: "set standard",
        },
      ],
      vocab: [
        "main breaker",
        "double-tap",
        "neutral bar",
        "sub-panel",
        "load calculation",
        "service upgrade",
        "AFCI breaker",
        "GFCI breaker",
        "Federal Pacific (Stab-Lok)",
        "panel directory",
      ],
      challenges: [
        "A homeowner wants to add a hot tub and you're looking at a 100-amp service. Walk through why they need an upgrade.",
        "You find a panel with Federal Pacific breakers. Explain the hazard to the homeowner without causing panic.",
        "A DIY homeowner added three circuits with a double-tap on a 15-amp breaker. Document the violation and explain the fix.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay — I've killed the main. I'm going to open the panel now. Come have a look with me.",
        },
        { speaker: "ai", en: "Is everything okay in there?" },
        {
          speaker: "learner",
          en: "See this breaker right here — two wires on one terminal? That's called a double-tap. It's a code violation and a fire hazard. One of those circuits has no protection.",
        },
        {
          speaker: "ai",
          en: "My brother-in-law added that circuit last year. He said it was fine.",
        },
        {
          speaker: "learner",
          en: "I understand — but it's not fine. It means if that circuit draws too much, the other circuit won't trip. That's when wires get hot inside a wall.",
        },
        { speaker: "ai", en: "What does it take to fix it?" },
      ],
    },
    {
      id: "rough-in",
      name: "Rough-In",
      emoji: "🔌",
      blurb:
        "Rough-in is where the work gets locked in the walls. Get the box locations, wire sizing, and staple spacing right before anyone picks up sheetrock.",
      counterpart: "Apprentice Electrician",
      learnerRole: "Journeyman Electrician",
      toneNote:
        "Methodical and code-precise. Rough-in has to survive inspection. Every dimension, wire size, and box height matters.",
      phrases: [
        {
          en: "Switch boxes are 48 inches to center — measure from the subfloor.",
          intent: "set box height",
        },
        {
          en: "Outlet boxes are 12 inches to center on the wall — mark them with a nail before drywall.",
          intent: "set outlet height",
        },
        {
          en: "All kitchen countertop circuits get 12-gauge — no 14 on those runs.",
          intent: "wire sizing rule",
        },
        {
          en: "Staple every 4 feet and within 12 inches of every box — that's code.",
          intent: "staple spacing",
        },
        {
          en: "Don't let wire run loose across a joist bay — it needs to be protected or supported.",
          intent: "wire support",
        },
        { en: "Label both ends of every wire before you close anything up.", intent: "label wire" },
        {
          en: "Leave 8 inches of wire sticking out of every box — minimum.",
          intent: "wire stub length",
        },
        {
          en: "Bathroom circuit needs to be GFCI — everything within 6 feet of water.",
          intent: "GFCI requirement",
        },
      ],
      vocab: [
        "rough-in",
        "box height",
        "12-gauge wire",
        "14-gauge wire",
        "staple spacing",
        "joist bay",
        "wire stub",
        "GFCI",
        "AFCI",
        "home run",
      ],
      challenges: [
        "An apprentice ran 14-gauge wire on a kitchen countertop circuit. Explain why it has to come out and be replaced.",
        "You arrive to find drywall closed up before rough-in inspection. Sort out the problem with the GC.",
        "Walk an apprentice through the code requirements for bathroom circuits — GFCI location, distance from water, dedicated circuit rules.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Before you staple that run — show me what wire you used." },
        { speaker: "ai", en: "It's 14-2. Same as everything else." },
        {
          speaker: "learner",
          en: "Not on countertop circuits. This is the kitchen counter — needs to be 12-gauge on a 20-amp breaker. 14-2 is only rated for 15 amps.",
        },
        { speaker: "ai", en: "But the box said it's a 15-amp outlet." },
        {
          speaker: "learner",
          en: "Doesn't matter what the outlet is rated for — the code says kitchen countertop small appliance circuits need to be 20-amp capable. That means 12-gauge all the way from the panel.",
        },
        { speaker: "ai", en: "So I need to pull this whole run back?" },
      ],
    },
    {
      id: "service-call",
      name: "Service Call",
      emoji: "🔦",
      blurb:
        "Diagnosing electrical issues in the field requires systematic thinking and good communication. Learn how to walk through a problem with a homeowner.",
      counterpart: "Homeowner",
      learnerRole: "Electrician",
      toneNote:
        "Calm and investigative. Electrical problems can be scary for homeowners. Speak clearly, test before you assume, and explain as you go.",
      phrases: [
        {
          en: "Before I start, tell me exactly what happened — what were you doing when the power went out?",
          intent: "gather history",
        },
        {
          en: "Let me check the panel first — this sounds like a tripped breaker, not a wiring issue.",
          intent: "start diagnosis",
        },
        {
          en: "I'm going to test each outlet with my meter — give me about 10 minutes.",
          intent: "explain process",
        },
        {
          en: "This outlet is downstream of a GFCI you don't know about — check the bathrooms.",
          intent: "GFCI chain diagnosis",
        },
        {
          en: "That outlet's wired with aluminum — that's common from the 70s and it needs attention.",
          intent: "flag aluminum wiring",
        },
        {
          en: "The breaker trips because the circuit is overloaded — not because anything's broken.",
          intent: "diagnose overload",
        },
        {
          en: "I found the problem — a wire came loose at the junction box in the attic.",
          intent: "report finding",
        },
        {
          en: "This is a 3-hour job minimum — I'll get you an exact number once I open the wall.",
          intent: "set time estimate",
        },
      ],
      vocab: [
        "multimeter",
        "GFCI chain",
        "tripped breaker",
        "loose connection",
        "aluminum wiring",
        "junction box",
        "overloaded circuit",
        "open neutral",
        "downstream",
        "voltage drop",
      ],
      challenges: [
        "Half a homeowner's house has no power but the main breaker hasn't tripped. Walk through how you'd diagnose a split-phase issue.",
        "A homeowner has been resetting the same GFCI outlet weekly for a year. Explain what's probably wrong and what the fix is.",
        "You find aluminum wiring at an outlet in a 1972 house. Explain the options — pigtailing vs. full rewire — to the homeowner.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "So which outlets are out? Let's start by walking me to the first one.",
        },
        {
          speaker: "ai",
          en: "It's everything in this corner of the living room and the whole guest bedroom.",
        },
        {
          speaker: "learner",
          en: "Okay — that pattern tells me it's probably one circuit. Let me check the panel. You haven't reset anything yet?",
        },
        { speaker: "ai", en: "No — should I have?" },
        {
          speaker: "learner",
          en: "It's fine that you didn't. Actually better — I want to see the panel in its natural state. Nothing tripped in here. That means it's not the breaker. Let me grab my meter.",
        },
        { speaker: "ai", en: "Could it be the GFCI in the bathroom?" },
      ],
    },
    {
      id: "permit-inspection-elec",
      name: "Permit & Inspection",
      emoji: "📝",
      blurb:
        "Electrical inspections are strict for good reason. Know what the inspector is looking for, have your documentation ready, and don't guess on code questions.",
      counterpart: "Electrical Inspector",
      learnerRole: "Electrician",
      toneNote:
        "Respectful and code-knowledgeable. Inspectors are there to protect public safety. Have your permit, know your NEC section, and don't argue — listen first.",
      phrases: [
        {
          en: "Rough-in's ready on unit 3 — wire's in, no drywall yet.",
          intent: "request inspection",
        },
        {
          en: "All circuits are labeled at the panel and at each box.",
          intent: "confirm labeling",
        },
        {
          en: "AFCI protection is on all bedroom circuits — per the 2020 NEC.",
          intent: "confirm code compliance",
        },
        {
          en: "The junction box in the attic has a cover plate — it's accessible through the hatch.",
          intent: "confirm accessibility",
        },
        {
          en: "I can reference NEC 314.16 on that — the box fill calculation is within limits.",
          intent: "cite code",
        },
        {
          en: "I'll fix the wire support on that run and call for re-inspection tomorrow.",
          intent: "accept correction",
        },
        {
          en: "Is there a specific NEC section you'd like me to reference for the variance?",
          intent: "request code clarification",
        },
      ],
      vocab: [
        "NEC (National Electrical Code)",
        "AFCI",
        "GFCI",
        "box fill",
        "wire support",
        "accessible junction box",
        "service entrance",
        "permit",
        "re-inspection",
        "variance",
      ],
      challenges: [
        "An inspector says your bedroom circuits don't have AFCI protection. You installed AFCI breakers. Walk through how you'd show him they're there.",
        "An inspector flags a junction box in the attic as inaccessible. It has a cover plate but the access hatch is behind insulation. Work out a solution.",
        "Your permit was pulled for a panel upgrade but you also ran three new circuits. Explain the scope change to the inspector before he finds it himself.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Morning. Electrical rough-in is ready on the second-floor addition — four bedrooms and the hallway.",
        },
        { speaker: "ai", en: "Permit on site?" },
        {
          speaker: "learner",
          en: "Posted at the main entrance. I've also got the load calc and the panel schedule right here.",
        },
        { speaker: "ai", en: "Okay. Show me the bedroom circuits. I'm checking for AFCI." },
        {
          speaker: "learner",
          en: "Every bedroom is on a dual-function AFCI/GFCI breaker in the panel — breakers 14 through 20. They're all labeled.",
        },
        {
          speaker: "ai",
          en: "What about this wire run in the hallway — I only see one staple in about an 8-foot span.",
        },
      ],
    },
    {
      id: "crew-safety-brief",
      name: "Crew Safety Brief",
      emoji: "⛑️",
      blurb:
        "Electricity kills quietly. Lead a safety brief that your crew actually listens to — specific, short, and tied to what's happening today.",
      counterpart: "Crew Member",
      learnerRole: "Foreman / Safety Lead",
      toneNote:
        "Serious and grounded. Electrical safety talks must be specific and actionable. No vague corporate language — use real scenarios from the job.",
      phrases: [
        {
          en: "Before we start on the panel, I need to see everyone's PPE — rubber gloves and safety glasses.",
          intent: "confirm PPE",
        },
        {
          en: "The main is live on the south service entrance — nobody goes near that unless I'm with you.",
          intent: "identify live hazard",
        },
        { en: "Assume every wire is hot until you test it yourself.", intent: "core safety rule" },
        {
          en: "If your GFCI cord keeps tripping, stop and swap it — don't reset and keep going.",
          intent: "GFCI extension cord rule",
        },
        {
          en: "We're working near water today — double rubber, and no standing in it.",
          intent: "wet location rule",
        },
        {
          en: "If someone gets shocked, don't touch them — kill the power first, then call 911.",
          intent: "shock response protocol",
        },
        {
          en: "Lockout/tagout on every panel you open — no exceptions on this site.",
          intent: "LOTO rule",
        },
        {
          en: "Has anyone had any electrical safety concerns this week? Now's the time.",
          intent: "open discussion",
        },
      ],
      vocab: [
        "PPE (rubber gloves, safety glasses)",
        "LOTO (lockout/tagout)",
        "live wire",
        "GFCI extension cord",
        "wet location",
        "arc flash",
        "shock response",
        "de-energize",
        "isolate",
        "assume energized",
      ],
      challenges: [
        "A crew member was resetting a GFCI extension cord that kept tripping. Lead a debrief that explains why that's dangerous.",
        "Conduct a 5-minute lockout/tagout training for a new apprentice before they work near a panel.",
        "A crew member says the voltage in the conduit 'probably isn't live anymore.' Address the assumption safely and firmly.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Before we go up into that ceiling space — I need everyone's attention for two minutes.",
        },
        { speaker: "ai", en: "What's up?" },
        {
          speaker: "learner",
          en: "There are live conductors in that ceiling from the old branch circuit. They're not on our panel. They're live and they're not labeled.",
        },
        { speaker: "ai", en: "Can't we just tape them off?" },
        {
          speaker: "learner",
          en: "No. We need to find the source and kill it before anyone goes in there. That's not optional — that's how guys get hurt. I'm calling the GC right now to find out which panel feeds that circuit.",
        },
        { speaker: "ai", en: "What do we do in the meantime?" },
      ],
    },
    {
      id: "customer-walk-through",
      name: "Customer Walk-Through",
      emoji: "🏠",
      blurb:
        "Finishing a job means explaining it to the customer — where the circuits are, what everything does, and how to use it safely.",
      counterpart: "Homeowner",
      learnerRole: "Electrician",
      toneNote:
        "Clear and educational. Homeowners don't know electrical systems — that's fine. Use plain language, point at things, and make sure they feel confident.",
      phrases: [
        {
          en: "Let me walk you through the panel real quick — it'll take five minutes.",
          intent: "initiate walk-through",
        },
        {
          en: "Every breaker is labeled — if something trips, look here first.",
          intent: "explain panel directory",
        },
        {
          en: "These GFCI outlets protect the whole bathroom circuit — the reset button is on the outlet by the sink.",
          intent: "explain GFCI",
        },
        {
          en: "Your EV charger is on a dedicated 50-amp circuit — nothing else runs on that breaker.",
          intent: "explain dedicated circuit",
        },
        {
          en: "If you ever add high-draw appliances, call us before you plug in — I want to make sure the circuits can handle it.",
          intent: "advise future use",
        },
        {
          en: "Don't put anything in front of the panel — we need 36 inches of clearance by code.",
          intent: "clearance reminder",
        },
        {
          en: "I recommend a whole-home surge protector — it installs in the panel and protects everything.",
          intent: "upsell surge protection",
        },
      ],
      vocab: [
        "panel directory",
        "dedicated circuit",
        "GFCI",
        "AFCI",
        "EV charger circuit",
        "surge protector",
        "circuit load",
        "clearance",
        "whole-home surge",
        "breaker reset",
      ],
      challenges: [
        "A homeowner trips a breaker their first night and can't figure out the panel directory. Walk them through it on the phone.",
        "A homeowner is asking if they can run a sauna, hot tub, and EV charger all at once. Explain the load implications clearly.",
        "Explain GFCI vs. AFCI to a homeowner who wants to know why there are different types of breakers.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Okay — before I pack up, let me show you a few things so you're not calling me at midnight.",
        },
        { speaker: "ai", en: "Sure — I appreciate that." },
        {
          speaker: "learner",
          en: "This is your panel. Every breaker is labeled right here on the directory. If a circuit goes out, come here first. If the breaker is in the middle position — that's tripped — push it all the way off and then back on.",
        },
        { speaker: "ai", en: "What if that doesn't work?" },
        {
          speaker: "learner",
          en: "Then it means the circuit is still overloaded, or something else is wrong. Unplug whatever you were running and try again. Still nothing, give me a call.",
        },
        {
          speaker: "ai",
          en: "What about the outlets in the bathroom — those have buttons on them?",
        },
      ],
    },
    {
      id: "parts-order-elec",
      name: "Parts Order",
      emoji: "🏪",
      blurb:
        "Electrical supply houses move fast. Know your catalog numbers, specify the right amperage and voltage, and confirm stock before you're standing in front of a missing part.",
      counterpart: "Electrical Supply Counter Rep",
      learnerRole: "Electrician",
      toneNote:
        "Quick and precise. Counter reps deal in catalog numbers and specs. Don't say 'that breaker thing' — know exactly what you need.",
      phrases: [
        {
          en: "I need a 20-amp AFCI/GFCI dual-function breaker — Square D QO.",
          intent: "specify breaker",
        },
        { en: "Do you have 200-foot rolls of 12-2 NM-B in stock?", intent: "check wire stock" },
        {
          en: "I need a 50-amp double-pole for an EV charger — what do you have in Square D?",
          intent: "specify large breaker",
        },
        {
          en: "Throw in a box of 20-amp duplex outlets — commercial grade, not residential.",
          intent: "specify outlet grade",
        },
        {
          en: "What's the difference between your conduit fittings — liquid-tight or standard EMT?",
          intent: "differentiate fittings",
        },
        {
          en: "I'll need 100 feet of 10-3 NM-B for a dryer circuit.",
          intent: "specify wire for large appliance",
        },
        {
          en: "Put it on the Lopez Electric account — I'll pick it up in an hour.",
          intent: "charge and pickup",
        },
      ],
      vocab: [
        "AFCI/GFCI dual-function breaker",
        "NM-B (Romex)",
        "EMT conduit",
        "liquid-tight conduit",
        "double-pole breaker",
        "commercial grade outlet",
        "tandem breaker",
        "wire gauge",
        "ampacity",
        "catalog number",
      ],
      challenges: [
        "You need a replacement breaker for a brand the supply house doesn't carry. Get help identifying a cross-compatible substitute.",
        "You're mid-job and realize you need 3/4-inch EMT conduit and fittings that aren't on your truck. Place a fast order for will-call pickup.",
        "A homeowner bought the wrong outlet at a big-box store — residential grade in a commercial application. Explain the difference and get the right part.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Hey, I need to grab a few things. You got QO220 in stock — the 20-amp double-pole?",
        },
        { speaker: "ai", en: "Yeah, I've got those. How many?" },
        {
          speaker: "learner",
          en: "Four of those. And I need six QO120DFIC — that's the dual-function AFCI/GFCI in 20-amp.",
        },
        {
          speaker: "ai",
          en: "Let me check. I've got four on the shelf, I'd have to pull two from the back. Give me a second.",
        },
        {
          speaker: "learner",
          en: "That's fine. While you're doing that, do you have 12-2 NM-B — I need at least a 250-foot roll.",
        },
        { speaker: "ai", en: "I've got 250 and 500. The 250 is about $89. You want one?" },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Panel & Service",
      emoji: "⚡",
      words: [
        "main breaker",
        "sub-panel",
        "service entrance",
        "double-pole breaker",
        "single-pole breaker",
        "neutral bar",
        "ground bar",
        "load calculation",
        "200-amp service",
        "panel directory",
      ],
    },
    {
      category: "Wire & Conduit",
      emoji: "🔌",
      words: [
        "NM-B (Romex)",
        "EMT conduit",
        "liquid-tight flex",
        "THHN wire",
        "12-gauge",
        "10-gauge",
        "6-gauge",
        "wire nut",
        "pull string",
        "home run",
      ],
    },
    {
      category: "Protection Devices",
      emoji: "🛡️",
      words: [
        "GFCI breaker",
        "AFCI breaker",
        "dual-function breaker",
        "GFCI outlet",
        "surge protector",
        "tamper-resistant outlet",
        "GFCI reset",
        "ground fault",
        "arc fault",
        "LOTO (lockout/tagout)",
      ],
    },
    {
      category: "Inspection & Code",
      emoji: "📋",
      words: [
        "NEC (National Electrical Code)",
        "box fill",
        "wire support",
        "accessible junction box",
        "LOTO",
        "permit",
        "rough-in inspection",
        "final inspection",
        "re-inspection",
        "variance",
      ],
    },
    {
      category: "Jobsite Terms (Bilingual)",
      emoji: "🗣️",
      words: [
        "el breaker / breaker",
        "la caja / box",
        "el cable / wire",
        "cuidado — hay corriente",
        "apaga eso / kill that circuit",
        "está caliente / it's live",
        "el panel / panel",
        "la tierra / ground",
        "pónganse los guantes / put on your gloves",
        "no toques eso",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// LANDSCAPER MODULE
// ─────────────────────────────────────────────────────────────────────────────

const landscaperModule: TradesModuleContent = {
  moduleId: "landscaper",
  areas: [
    {
      id: "client-consultation",
      name: "Client Consultation",
      emoji: "🌿",
      blurb:
        "Before a single plant goes in the ground, you need to understand what the client wants — and guide them away from ideas that won't work in their climate or budget.",
      counterpart: "Homeowner",
      learnerRole: "Landscape Contractor",
      toneNote:
        "Professional and consultative. Clients often come in with inspiration photos that don't match their yard, budget, or climate. Lead gently with expertise.",
      phrases: [
        {
          en: "Walk me through what you're envisioning — what would this space feel like when we're done?",
          intent: "open vision conversation",
        },
        {
          en: "What's your irrigation situation? If you don't have drip, that changes the plant palette significantly.",
          intent: "assess water infrastructure",
        },
        {
          en: "That plant is beautiful but it won't survive a hard frost — let me show you something that gives the same look in our climate.",
          intent: "redirect plant choice",
        },
        {
          en: "For a space this size, I'd budget around $8,000 to $12,000 depending on materials.",
          intent: "set budget range",
        },
        {
          en: "Is low maintenance a priority, or are you okay with seasonal upkeep?",
          intent: "assess maintenance preference",
        },
        {
          en: "Let me take photos and measurements today and get you a proposal by end of the week.",
          intent: "set next step",
        },
        {
          en: "I'd recommend a 2-inch layer of mulch throughout — keeps moisture in and weeds down.",
          intent: "recommend standard practice",
        },
        {
          en: "The slope here is going to create drainage issues — we need to address that before planting.",
          intent: "flag site challenge",
        },
      ],
      vocab: [
        "drip irrigation",
        "plant palette",
        "hardiness zone",
        "frost line",
        "mulch",
        "grade",
        "drainage",
        "site analysis",
        "design proposal",
        "client brief",
      ],
      challenges: [
        "A client wants a lawn of tropical plants in a Zone 5 climate. Walk them toward a practical alternative without dismissing their vision.",
        "A client has a $3,000 budget for a job that realistically costs $9,000. Have the scope vs. budget conversation.",
        "A client shows you an Instagram photo of a garden in a completely different climate. Explain why it won't translate directly and offer alternatives.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "So you said you want a more finished look back here. What are you hoping to use the space for?",
        },
        {
          speaker: "ai",
          en: "We'd love to entertain back here — a patio area, some plants for privacy, maybe a fire pit.",
        },
        {
          speaker: "learner",
          en: "Okay — that's very doable. Do you have irrigation out here now, or is this all hose-watered?",
        },
        { speaker: "ai", en: "Just a hose. Is that going to be a problem?" },
        {
          speaker: "learner",
          en: "It's not a problem, but it affects what plants will work long-term. Drip irrigation is actually something we'd recommend adding — it pays for itself in plant survival. Let me include a drip zone in the proposal.",
        },
        { speaker: "ai", en: "How much does that usually add to the cost?" },
      ],
    },
    {
      id: "crew-morning-brief",
      name: "Crew Morning Brief",
      emoji: "🌅",
      blurb:
        "Get the crew moving in the right direction before anyone digs, plants, or builds. Cover the site, the sequence, and any hazards before the tools come off the truck.",
      counterpart: "Crew Member",
      learnerRole: "Landscape Foreman",
      toneNote:
        "Direct and practical. Morning briefings should be short. Give locations, sequences, and any site-specific information. Skip the lecture.",
      phrases: [
        {
          en: "We're starting with the boulder placement on the north side — crane arrives at 8.",
          intent: "set first task",
        },
        {
          en: "Don't dig within 18 inches of the marked utility flags without calling me.",
          intent: "safety protocol",
        },
        {
          en: "Mow crew, you're on the rear lawn first — client's home, be quiet with the blowers until 8 AM.",
          intent: "crew-specific task",
        },
        {
          en: "Plant material is staged in the driveway — don't plant anything until I walk it with you.",
          intent: "sequence instruction",
        },
        {
          en: "It's going to hit 95 today — water at every break, no exceptions.",
          intent: "heat safety",
        },
        {
          en: "Keep the truck off the lawn — I don't want ruts in this turf.",
          intent: "site protection",
        },
        {
          en: "If you find anything underground — pipe, wire, old foundation — stop and flag it.",
          intent: "underground hazard protocol",
        },
        {
          en: "Cleanup crew starts at 4 PM — I want everything blown out and loaded before we leave.",
          intent: "end-of-day standard",
        },
      ],
      vocab: [
        "utility flag",
        "call 811",
        "staging area",
        "plant material",
        "ruts",
        "blower",
        "heat stroke",
        "boulder placement",
        "equipment operator",
        "mulch ring",
      ],
      challenges: [
        "A crew member starts digging in an unflagged area near the house. Stop the work, have the area marked, and explain 811.",
        "It's 97 degrees and one of your crew members looks overheated. Handle the heat safety situation.",
        "The plant delivery arrived with wrong species. Reorganize the crew's morning tasks while you sort out the delivery issue.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Alright — let's go over the day. Jorge, you and your partner are starting on the bed prep in the back. Everything east of the boulder wall gets cleared first.",
        },
        { speaker: "ai", en: "Are the utilities flagged back there?" },
        {
          speaker: "learner",
          en: "Yes — 811 was out yesterday. You'll see the flags. Orange is gas, blue is water, yellow is electric. Don't get within 18 inches of any flag without telling me first.",
        },
        { speaker: "ai", en: "Got it. How deep are we going on the bed prep?" },
        {
          speaker: "learner",
          en: "Six inches down, remove all the grass and weeds, and loosen the soil. We're putting in a drip system before we plant, so don't compact it once you've tilled.",
        },
        { speaker: "ai", en: "Where are we putting all the material we remove?" },
      ],
    },
    {
      id: "irrigation",
      name: "Irrigation",
      emoji: "💦",
      blurb:
        "A good irrigation system is invisible when it works and obvious when it doesn't. Learn the language of heads, zones, and controllers so nothing gets missed.",
      counterpart: "Homeowner",
      learnerRole: "Irrigation Technician",
      toneNote:
        "Technical but approachable. Irrigation systems confuse most homeowners. Translate zones, heads, and schedules into plain language.",
      phrases: [
        {
          en: "You've got 6 zones — I'm going to run through each one while you watch for full coverage.",
          intent: "zone verification",
        },
        {
          en: "Zone 3 has a broken head — it's shooting straight up instead of rotating.",
          intent: "identify head failure",
        },
        {
          en: "Your run times are too long — you're getting runoff instead of absorption.",
          intent: "diagnose overwatering",
        },
        {
          en: "I'd recommend switching this zone to drip — spray heads on a slope waste a lot of water.",
          intent: "recommend drip conversion",
        },
        {
          en: "The controller battery died and wiped your schedule — let me reprogram it.",
          intent: "controller issue",
        },
        {
          en: "Winterize means we blow out all the lines before the first hard freeze.",
          intent: "explain winterization",
        },
        {
          en: "This head needs to be adjusted — the arc is watering the driveway, not the lawn.",
          intent: "adjust arc",
        },
        {
          en: "Your pressure is too high — we need a pressure regulator or the heads will mist off instead of throwing.",
          intent: "identify pressure problem",
        },
      ],
      vocab: [
        "zone",
        "head (rotary/spray)",
        "controller",
        "run time",
        "arc adjustment",
        "drip emitter",
        "pressure regulator",
        "winterize",
        "blow-out",
        "soaker zone",
      ],
      challenges: [
        "A homeowner's lawn has dry patches on zone 2. Walk through a systematic diagnosis from the controller to the head.",
        "A homeowner wants to add a zone for a new planting bed. Walk through what that involves — valves, wire, heads.",
        "Explain how to program a smart irrigation controller to a homeowner who is not tech-savvy.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "I'm going to run each zone from the controller while you walk the yard. Tell me if anything looks off.",
        },
        {
          speaker: "ai",
          en: "Zone 1 looks fine. Zone 2 just came on — wait, there's water shooting straight up by the rose bed.",
        },
        {
          speaker: "learner",
          en: "That's a broken pop-up head — the wiper seal is gone. It's stuck in the open position. That's why zone 2 runs out of water pressure before it reaches the back corner.",
        },
        { speaker: "ai", en: "Is that expensive to fix?" },
        {
          speaker: "learner",
          en: "It's a $12 head and about 20 minutes of work. I'll swap it today. That corner that's been dying — it should green back up in 2-3 weeks once the zone has full pressure.",
        },
        { speaker: "ai", en: "How often should I actually be running these zones?" },
      ],
    },
    {
      id: "hardscape",
      name: "Hardscape",
      emoji: "🧱",
      blurb:
        "Patios, walkways, and retaining walls are permanent. Get the base, grade, and drainage right before the first paver goes down.",
      counterpart: "Homeowner",
      learnerRole: "Hardscape Contractor",
      toneNote:
        "Confident and construction-minded. Hardscape requires precision and structural thinking. Homeowners don't always see the base work — explain why it matters.",
      phrases: [
        {
          en: "We're excavating 8 inches for the base — you won't see it, but that's what keeps it from heaving.",
          intent: "explain base depth",
        },
        {
          en: "All the water needs to shed away from the house — we're grading at 2% minimum.",
          intent: "explain drainage grade",
        },
        {
          en: "The compacted gravel base is what makes a paver patio last 20 years. Skip that and it shifts.",
          intent: "explain structural importance",
        },
        {
          en: "We'll cut the edges in with a wet saw — no snapping, no uneven gaps.",
          intent: "describe edge cuts",
        },
        {
          en: "The retaining wall needs a deadman every 6 feet to tie it back — otherwise it leans.",
          intent: "explain retaining wall structure",
        },
        {
          en: "Polymeric sand goes in the joints — it hardens and locks the pavers, keeps weeds out.",
          intent: "specify joint material",
        },
        {
          en: "This patio is going to be 12x16 — we'll need about 280 square feet of pavers including cuts and waste.",
          intent: "quantify material",
        },
        {
          en: "I need to know where your downspouts go before I finalize the grade.",
          intent: "request drainage info",
        },
      ],
      vocab: [
        "base course",
        "compacted gravel",
        "paver",
        "polymeric sand",
        "deadman",
        "retaining wall",
        "grade",
        "2% slope",
        "wet saw",
        "edging restraint",
      ],
      challenges: [
        "A homeowner wants to save money by skipping the gravel base. Explain in concrete terms what will happen to their patio in 3 years.",
        "Halfway through a patio pour you find soft, organic soil under the base. Explain the problem and what it means for the project timeline and cost.",
        "A client wants a retaining wall on a steep slope with no footer. Walk through why that's a structural problem.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Before we start laying pavers, I want to show you what we've got so far.",
        },
        { speaker: "ai", en: "It looks like a big hole. I didn't realize you'd dig that deep." },
        {
          speaker: "learner",
          en: "That's 8 inches down — that's your base. Four inches of crushed gravel, compacted, then 1 inch of bedding sand on top. That base is what keeps your patio level in 10 years.",
        },
        { speaker: "ai", en: "And without it?" },
        {
          speaker: "learner",
          en: "It shifts. Pavers settle unevenly, roots get under them, they rock and crack. I've done repairs on patios that were done without base — it's not pretty.",
        },
        { speaker: "ai", en: "Okay — I get it now. What's next?" },
      ],
    },
    {
      id: "plant-installation",
      name: "Plant Installation",
      emoji: "🌳",
      blurb:
        "Right plant, right place, right depth — get these three things right and plants thrive. Learn the language of installation specs, soil amendments, and spacing.",
      counterpart: "Crew Member",
      learnerRole: "Lead Landscaper",
      toneNote:
        "Instructional and horticultural. Plant installation is where craft meets science. Depth, spacing, and soil conditions matter.",
      phrases: [
        {
          en: "Plant it at the same level it was in the container — never deeper.",
          intent: "depth instruction",
        },
        {
          en: "Rough up the rootball before you set it — circling roots need to be broken up.",
          intent: "root prep",
        },
        {
          en: "Spacing on these shrubs is 4 feet on center — they'll fill in over the next 2 seasons.",
          intent: "set spacing",
        },
        {
          en: "Amend the backfill with compost at a 50/50 ratio — this soil has too much clay.",
          intent: "soil amendment",
        },
        {
          en: "Stake that tree for the first season — the root ball isn't established enough to hold in wind.",
          intent: "stake instruction",
        },
        {
          en: "Water in slow — you want the water in the hole, not running off the root ball.",
          intent: "watering instruction",
        },
        {
          en: "Keep the mulch 2 inches back from the trunk — volcano mulching kills trees.",
          intent: "mulch placement",
        },
        {
          en: "All balled and burlapped trees — cut the wire cage and peel back the burlap before you backfill.",
          intent: "B&B installation",
        },
      ],
      vocab: [
        "rootball",
        "B&B (balled and burlap)",
        "container plant",
        "backfill",
        "soil amendment",
        "mulch ring",
        "staking",
        "circling roots",
        "compost",
        "plant spacing",
      ],
      challenges: [
        "A crew member planted a tree 4 inches too deep. Explain why this is a serious problem and walk through the correction.",
        "You arrive on site and the plant material has been sitting on the truck in 95-degree heat for 4 hours. Assess what's salvageable and what to do.",
        "Explain to a crew member why 'volcano mulching' is harmful, using simple language.",
      ],
      sampleConversation: [
        { speaker: "learner", en: "Before you start digging — come look at this rootball." },
        { speaker: "ai", en: "It looks fine to me." },
        {
          speaker: "learner",
          en: "Feel the outside here — see how those roots are circling? If we plant it like that, those roots will keep circling and eventually girdle the trunk. We need to score the outside with a knife before it goes in.",
        },
        { speaker: "ai", en: "Won't that hurt the roots?" },
        {
          speaker: "learner",
          en: "It stresses the plant for a week, but it forces the roots to grow outward. A girdled tree dies in 10 years. This is the fix.",
        },
        { speaker: "ai", en: "Okay — how deep does the hole go?" },
      ],
    },
    {
      id: "complaint-handling",
      name: "Complaint Handling",
      emoji: "📞",
      blurb:
        "A plant died, a patio is cracking, or the lawn looks worse after service — handling a complaint professionally is how you keep a client and your reputation.",
      counterpart: "Frustrated Homeowner",
      learnerRole: "Landscape Contractor",
      toneNote:
        "Calm, empathetic, and solution-focused. Don't get defensive. Listen first. The goal is a resolved problem and a retained client, not a win.",
      phrases: [
        {
          en: "I hear you — that's not the result we were going for either. Let me come take a look.",
          intent: "acknowledge and commit to inspect",
        },
        {
          en: "Before I can tell you what happened, I need to see it in person.",
          intent: "defer diagnosis",
        },
        {
          en: "If that plant died due to our installation, we will replace it — that's our guarantee.",
          intent: "invoke guarantee",
        },
        {
          en: "I want to be honest with you — that shrub went in healthy, but irrigation coverage in that corner was low. I should have caught that sooner.",
          intent: "own partial responsibility",
        },
        {
          en: "Let me make this right. I'll have a crew out Thursday to assess and we'll go from there.",
          intent: "commit to resolution",
        },
        {
          en: "Can you send me a photo so I have a sense of what I'm looking at before I come out?",
          intent: "gather info remotely",
        },
        {
          en: "I understand this is frustrating, especially after what you invested. Let's fix it.",
          intent: "validate frustration",
        },
      ],
      vocab: [
        "plant warranty",
        "installation guarantee",
        "replacement",
        "root cause",
        "irrigation gap",
        "soil failure",
        "documentation",
        "punch list",
        "credit",
        "re-inspection",
      ],
      challenges: [
        "Three trees died six months after installation and the homeowner is threatening to go online. Navigate the complaint toward a resolution.",
        "A patio is showing cracks along one edge after the first winter. Determine whether it's a workmanship issue or a customer-caused damage issue.",
        "A client complains that the crew damaged their sprinkler system during a mulch job. Handle it fairly even though you're not sure it was your crew.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "Thanks for calling — I'm sorry to hear the Japanese maple isn't looking good. Tell me what you're seeing.",
        },
        {
          speaker: "ai",
          en: "All the leaves are yellow and dropping. It looked fine two weeks ago. I'm really upset — that was an expensive tree.",
        },
        {
          speaker: "learner",
          en: "I completely understand. Yellowing and drop on a Japanese maple after transplant could be a few things. Can you send me a photo of the base of the trunk — right where it meets the soil?",
        },
        { speaker: "ai", en: "Why the base?" },
        {
          speaker: "learner",
          en: "I want to see if it was planted too deep or if the mulch is too close to the trunk. Both can cause exactly what you're describing. I'm not making excuses — if we made an error, we'll fix it.",
        },
        { speaker: "ai", en: "And if it dies? Will you replace it?" },
      ],
    },
    {
      id: "seasonal-prep",
      name: "Seasonal Prep",
      emoji: "🍂",
      blurb:
        "Spring startup and fall cleanup are recurring revenue — and a chance to catch problems before they become disasters. Know the checklist and how to sell it.",
      counterpart: "Homeowner",
      learnerRole: "Landscape Contractor",
      toneNote:
        "Helpful and proactive. Seasonal services are expected by experienced clients and need to be explained to new ones. Frame them as protecting the investment.",
      phrases: [
        {
          en: "It's time to schedule your spring startup — irrigation activation, fertilization, and a full site walk.",
          intent: "initiate spring service",
        },
        {
          en: "We'll blow out the irrigation lines before November 1 — last year we had a hard freeze early.",
          intent: "schedule winterization",
        },
        {
          en: "Fall cleanup includes leaf removal, bed edging, and cutting back the ornamental grasses.",
          intent: "define fall scope",
        },
        {
          en: "I recommend a pre-emergent application in early spring — get ahead of the crabgrass before it sets.",
          intent: "recommend pre-emergent",
        },
        {
          en: "The mulch from last year has broken down — I'd budget a refresh, about 3 yards for this property.",
          intent: "recommend mulch refresh",
        },
        {
          en: "Your irrigation timer needs to come out of winter mode — let me program it for the new season.",
          intent: "controller programming",
        },
        {
          en: "I'll flag anything I see during the walk that needs attention — sometimes winter reveals things.",
          intent: "set walk expectations",
        },
      ],
      vocab: [
        "spring startup",
        "winterization (blow-out)",
        "fall cleanup",
        "pre-emergent",
        "fertilization",
        "mulch refresh",
        "bed edging",
        "ornamental grass cutback",
        "dormant pruning",
        "aeration",
      ],
      challenges: [
        "A client calls in September and says they don't want to pay for winterization this year. Explain the risk to their irrigation system.",
        "During a spring walk you find significant frost heave damage to a paver patio. Document it and explain the repair options.",
        "Sell a spring fertilization program to a client who says their lawn 'looks fine' and doesn't see the point.",
      ],
      sampleConversation: [
        {
          speaker: "learner",
          en: "I'm reaching out because we're booking fall cleanups and winterizations for October. You'll want to get on the schedule.",
        },
        {
          speaker: "ai",
          en: "What's involved in the winterization? I've never actually had it done.",
        },
        {
          speaker: "learner",
          en: "We connect a compressor to your irrigation system and blow all the water out of the lines before it freezes. If there's water sitting in the lines when it freezes, the pipes crack and heads blow out. Repairs in spring can run $400 to $800.",
        },
        { speaker: "ai", en: "And the winterization is cheaper than that?" },
        {
          speaker: "learner",
          en: "For a property your size, it's $150. Straightforward insurance. We also check every zone and head while we're there — so you know the system is in good shape before spring.",
        },
        { speaker: "ai", en: "Okay — when can you fit me in?" },
      ],
    },
  ],
  vocabSets: [
    {
      category: "Plant Material",
      emoji: "🌱",
      words: [
        "perennial",
        "annual",
        "shrub",
        "ornamental grass",
        "groundcover",
        "balled and burlap (B&B)",
        "container plant",
        "native plant",
        "specimen tree",
        "pollinator plant",
      ],
    },
    {
      category: "Irrigation",
      emoji: "💧",
      words: [
        "rotary head",
        "spray head",
        "drip emitter",
        "zone",
        "controller",
        "pressure regulator",
        "backflow preventer",
        "winterize",
        "run time",
        "soaker hose",
      ],
    },
    {
      category: "Hardscape Materials",
      emoji: "🧱",
      words: [
        "paver",
        "flagstone",
        "crushed gravel",
        "polymeric sand",
        "edging restraint",
        "retaining wall block",
        "boulder",
        "base course",
        "compactor",
        "wet saw",
      ],
    },
    {
      category: "Lawn & Soil",
      emoji: "🌾",
      words: [
        "aeration",
        "overseeding",
        "pre-emergent",
        "post-emergent",
        "fertilizer (NPK)",
        "compost",
        "top dressing",
        "thatch",
        "soil amendment",
        "pH level",
      ],
    },
    {
      category: "Jobsite Terms (Bilingual)",
      emoji: "🗣️",
      words: [
        "las plantas / plants",
        "el riego / irrigation",
        "la tierra / soil",
        "cava más hondo / dig deeper",
        "la manguera / hose",
        "el soplador / blower",
        "el pasto / lawn",
        "más abono / more fertilizer",
        "aguas con las rocas / careful with the rocks",
        "ya terminamos / we're done",
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLED EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const TRADES_CONTENT: TradesModuleContent[] = [
  framerModule,
  ROOFING_CONTENT,
  plumberModule,
  drywallModule,
  electricianModule,
  landscaperModule,
];

export function getTradesContent(moduleId: string): TradesModuleContent | null {
  return TRADES_CONTENT.find((m) => m.moduleId === moduleId) ?? null;
}

export function getTradesArea(moduleId: string, areaId: string): ModuleArea | null {
  return getTradesContent(moduleId)?.areas.find((a) => a.id === areaId) ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
// ENRICHED TRADES CONTENT — v2
//
// This section adds the deeper content layer that mirrors the LDS Missionary
// benchmark: verbatim trade scripts, jobContext arrays (like MISSION_AREAS),
// phase-organized vocab with Spanish jobsite terms, real code citations, and
// supplier/parts counter language.
//
// These exports coexist with the ModuleArea system above. The UI can use either
// or both — v1 for quick scenario roleplay, v2 for deeper language immersion.
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES — v2
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeScript {
  id: string;
  scenario: string; // What situation this script is used in
  speaker: string; // Who is speaking (master plumber, foreman, etc.)
  audience: string; // Who they are talking to
  script: string; // The exact words — verbatim trade language
  notes: string; // Why this phrasing, register note, or teaching point
  codeRef?: string; // Code citation if applicable
}

export interface JobContext {
  id: string;
  name: string;
  description: string;
  typicalAudience: string; // Who the learner talks to in this context
  languageNote: string; // Register, bilingual context, or culture note
  paceNote: string; // Urgency / pace of communication
}

export interface VocabPhase {
  phase: string; // rough-in, finish, inspection, supplier, emergency
  emoji: string;
  terms: Array<{
    en: string;
    es?: string; // Spanish where it differs or is commonly used on site
    note?: string; // Brand name, slang, or usage note
  }>;
}

export interface TradeCodeRef {
  citation: string; // e.g. "NEC 210.52"
  plain: string; // Plain-English explanation
}

export interface SupplierTerm {
  term: string; // How you say it at the counter
  meaning: string; // What it means
  example: string; // Example sentence
}

export interface FreeTradeResource {
  label: string;
  url: string;
  note: string;
}

export interface TradeModuleV2 {
  id: string;
  name: string;
  emoji: string;
  tradeScripts: TradeScript[];
  jobContexts: JobContext[];
  vocabPhases: VocabPhase[];
  codeReferences: TradeCodeRef[];
  supplierLanguage: SupplierTerm[];
  freeResources: FreeTradeResource[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUMBER — v2
// ─────────────────────────────────────────────────────────────────────────────

export const PLUMBER_V2: TradeModuleV2 = {
  id: "plumber",
  name: "Plumber",
  emoji: "🔧",

  jobContexts: [
    {
      id: "residential-service",
      name: "Residential Service Call",
      description:
        "Homeowner calls with a problem — leak, no hot water, clogged drain. You're dispatched solo. Truck-stock parts only; no permit typically needed for repairs.",
      typicalAudience: "Homeowner (often stressed, not technical)",
      languageNote:
        "Speak plainly. Avoid Latin pipe nomenclature with homeowners. Use dollar ranges, not just labor hours — they don't think in hours. 'About $280 to $340 all in' lands better than '2.5 hours labor plus parts.'",
      paceNote: "Moderate — build trust, diagnose, quote, close before you leave.",
    },
    {
      id: "commercial-construction",
      name: "Commercial Construction / Tenant Improvement",
      description:
        "Larger project: office build-out, restaurant, retail. Coordination with GC, other subs, inspector. Permits and inspections required. Blueprints on site.",
      typicalAudience: "General contractor, project manager, building inspector",
      languageNote:
        "Technical register. Use pipe sizes, fixture unit counts, isometric references. Inspectors want to hear code citations. GC wants schedules and milestone dates.",
      paceNote: "Steady but deadline-driven. Morning coordination calls set the day.",
    },
    {
      id: "new-build-rough-in",
      name: "New Build Rough-In",
      description:
        "Production homebuilding or custom build. Set stub-outs, underground, top-out before drywall. Crew work — journeymen and apprentices. Bilingual environment common.",
      typicalAudience: "Foreman, apprentice crew, framing GC, building inspector",
      languageNote:
        "Bilingual reality: Spanish-dominant crews are common in production housing. 'La tubería va aquí' (the pipe goes here), 'el drenaje' (the drain), 'el venteo' (the vent). Code-switching mid-sentence is normal. Inspectors speak English; document in English.",
      paceNote: "Fast. Production timelines are tight. Short, direct instructions.",
    },
    {
      id: "emergency-repair",
      name: "Emergency / After-Hours Call",
      description:
        "Burst pipe, sewer backup, no heat (boiler), flooding. Premium labor rates. Customer is panicked. Diagnose fast, stop the damage, quote the repair.",
      typicalAudience: "Panicked homeowner or building manager",
      languageNote:
        "Calm authority. Lead with action, not pricing. 'First thing I'm going to do is shut the water off at the main — that'll stop the damage.' Pricing comes after you've established control.",
      paceNote: "Urgent. Get to the shutoff first. Explain while you work.",
    },
  ],

  tradeScripts: [
    {
      id: "wax-ring-quote",
      scenario: "Diagnosing a leaking toilet on a residential service call",
      speaker: "Master plumber",
      audience: "Homeowner",
      script:
        "Sir, what you've got here is a failed wax ring on the toilet — that's the seal between the toilet and the drain flange in the floor. Water's been seeping under it every time you flush, which is why you're seeing that soft spot in the subfloor. That's going to be about two hours labor plus parts — roughly $280 to $340 all in. I'd also want to look at that flange once we pull the toilet; if it's cracked or sitting too low we may need to repair that too, and I'll tell you before I do anything extra.",
      notes:
        "Name the part, say what it does, explain what went wrong, give a dollar range (not just hours), flag the unknown upfront so there are no surprise charges. This script builds trust and closes the job.",
    },
    {
      id: "low-water-pressure-diagnosis",
      scenario: "Explaining low water pressure to a homeowner",
      speaker: "Plumber",
      audience: "Homeowner",
      script:
        "Your pressure's reading 42 PSI at the hose bib — normal is 60 to 80. I see you've got a pressure reducing valve right here where the main comes in; this one's pretty old and they do fail. I can swap it out today, takes about an hour, and you'll be back up to pressure. Before I do that I want to make sure the main shutoff is working so we can isolate this section — mind if I go check that?",
      notes:
        "Give the actual number, state the normal range, name the component (PRV), explain the fix, ask permission before proceeding. The measurement grounds the diagnosis.",
      codeRef: "IPC Section 604.8 — water service pressure maximum 80 PSI.",
    },
    {
      id: "slab-leak-explanation",
      scenario: "Explaining a slab leak to a property manager",
      speaker: "Plumber",
      audience: "Building manager",
      script:
        "What you've got is a pinhole leak in the copper supply line running under the slab — we confirmed it with the pressure test and the listening device. We've got two options: we can jackhammer down and do a spot repair, which is faster but there's a good chance more of that line fails within a year or two since the pipe is the same age throughout. Or we can reroute — run new PEX overhead through the attic and abandon the copper under the slab entirely. Reroute is more labor today but it's a permanent fix and it doesn't touch your flooring. I'd recommend the reroute. Want me to get you numbers on both so you can make the call?",
      notes:
        "Property managers need options with trade-offs, not just a single answer. Present both, give your recommendation, let them decide. Use 'PEX' — the material name — not just 'plastic pipe.'",
    },
    {
      id: "apprentice-sweating-copper",
      scenario: "Teaching an apprentice to sweat a copper joint",
      speaker: "Journeyman plumber",
      audience: "Apprentice",
      script:
        "Watch. Clean the pipe end and the inside of the fitting with emery cloth — you need bright copper, no oxidation or the solder won't flow. Flux goes on both — the pipe end and the cup of the fitting. Get your torch on the fitting body, not the pipe, and move it in circles. Touch the solder to the joint on the opposite side from the flame — when it's hot enough the solder will flow by capillary action, you'll see it get sucked in. When you get a full ring of solder showing around the fitting, you're done. Wipe it with a rag while it's still hot. Never let the flame sit in one spot or you'll burn through the flux and get a cold joint.",
      notes:
        "Apprentices need to hear 'why' at each step. 'Capillary action' is worth naming — it explains why the solder flows toward heat, not away. 'Cold joint' is the failure mode to avoid.",
    },
    {
      id: "rough-in-crew-direction",
      scenario: "Directing crew on rough-in locations — bilingual jobsite",
      speaker: "Lead plumber / foreman",
      audience: "Apprentice crew (Spanish-dominant)",
      script:
        "Okay escúchenme — listen up. El baño principal va aquí. The toilet rough-in is 12 inches off the finished wall — doce pulgadas de la pared terminada. The lav drain goes here, 17 inches from center of toilet. Mark it with the keel. El venteo — the vent stack — goes up through the wall right here and ties into the three-inch line above the plate. No mistakes on the rough-in; the inspector comes Friday.",
      notes:
        "Authentic bilingual foreman speech. Key measurements in English for the plans; everyday terms in both. 'Keel' is the lumber crayon used to mark. 'Off the finished wall' not 'off the framing' — important distinction.",
      codeRef: "IPC Section 405 — water closet rough-in, standard 12-inch from finished wall.",
    },
    {
      id: "water-heater-estimate",
      scenario: "Quoting a water heater replacement",
      speaker: "Plumber",
      audience: "Homeowner",
      script:
        "Your water heater is 14 years old — manufacturer warranty was 12 years, so it's already borrowed time. We can do a straight replacement with a 50-gallon Bradford White — that's what I keep on the truck, made in the USA, good unit. Installed it'll run $1,100 to $1,200 depending on what I find when I pull the old one — sometimes the flex connectors are corroded and need replacing, sometimes the flue pipe needs an adjustment. If you want to go to a hybrid heat pump water heater they're about $400 more installed but they'll cut your water heating bill by 60 percent. What direction do you want to go?",
      notes:
        "Name the brand (Bradford White is what experienced plumbers actually stock). Give a range with honest uncertainty. Offer the upgrade with ROI framing. Close with a question.",
    },
    {
      id: "permit-inspector-walkthrough",
      scenario: "Walking an inspector through a rough-in",
      speaker: "Plumber",
      audience: "Building inspector",
      script:
        "Morning. We've got the underground done — four-inch ABS to the city main, 1/4-inch per foot fall all the way to the cleanout at the property line. Stub-ups are capped for the pressure test. Top-out is complete, vent stack ties into the three-inch main vent at the roof. All fixture vents are tied in above the flood level rim. Pressure test is holding at 10 PSI — I can show you on the gauge. What would you like to look at first?",
      notes:
        "Inspectors want to hear the code-relevant terms: 1/4 per foot fall, pressure test PSI, flood level rim for vent connections. Lead with test results — that's what they care about most.",
      codeRef:
        "IPC Section 708 — cleanout locations. IPC Section 712 — drainage pipe slope 1/4 per foot minimum.",
    },
    {
      id: "burst-pipe-emergency",
      scenario: "Arriving on a burst pipe emergency call",
      speaker: "Plumber",
      audience: "Panicked homeowner",
      script:
        "I'm here — where's your main shutoff? ... Okay, I've got it off, the flow is stopped. Take a breath. The pipe is split — cold snap last night, it was outside this wall and wasn't insulated. We're going to cut out the damaged section, right here to here, and put in a repair coupling. That's probably an hour, hour and a half. The damage to the drywall is not my work — you'll want a restoration company for that part. Let me get started.",
      notes:
        "Act first, explain second. 'Take a breath' resets the customer's emotional state. Clearly delineate what you fix (the pipe) and what you don't (the water damage) — this protects you legally and practically.",
    },
  ],

  vocabPhases: [
    {
      phase: "Underground / Rough-In",
      emoji: "⛏️",
      terms: [
        {
          en: "cleanout",
          es: "limpieza / acceso de limpieza",
          note: "Access point for rodding the drain",
        },
        {
          en: "stub-out",
          es: "espigón / salida de tubería",
          note: "Capped pipe end waiting for fixture",
        },
        {
          en: "rough-in measurement",
          es: "medida de instalación",
          note: "Distance from wall to drain center",
        },
        {
          en: "soil stack",
          es: "bajante de aguas negras",
          note: "Main vertical drain for toilets",
        },
        { en: "slope / fall", es: "pendiente", note: '1/4" per foot minimum per IPC' },
        { en: "bedding", es: "cama de grava", note: "Gravel under underground pipe" },
        { en: "hub", es: "campana", note: "Bell end of cast iron or ABS fitting" },
        { en: "spigot end", es: "extremo liso", note: "Plain end that inserts into hub" },
      ],
    },
    {
      phase: "Top-Out / Venting",
      emoji: "🏠",
      terms: [
        {
          en: "vent stack",
          es: "chimenea de ventilación / el venteo",
          note: "Main vertical vent pipe through roof",
        },
        { en: "wet vent", es: "ventilación húmeda", note: "Drain pipe that also serves as vent" },
        {
          en: "air admittance valve (AAV)",
          es: "válvula de admisión de aire",
          note: "Code-permitted vent alternative in many states",
        },
        {
          en: "flood level rim",
          es: "nivel de rebose",
          note: "Top edge of fixture; vents tie in above this",
        },
        { en: "trap arm", es: "brazo del sifón", note: "Horizontal section between trap and vent" },
        { en: "P-trap", es: "sifón en P", note: "U-shaped trap under every fixture" },
        {
          en: "sanitary tee",
          es: "té sanitaria",
          note: "DWV fitting — directional, not reversible",
        },
        {
          en: "wye + 1/8 bend",
          es: "ye con codo",
          note: "Preferred fitting for branch drain connections",
        },
      ],
    },
    {
      phase: "Finish / Trim-Out",
      emoji: "🪛",
      terms: [
        {
          en: "supply stop",
          es: "válvula de paso / ángulo de paso",
          note: "Angle stop or straight stop under fixture",
        },
        {
          en: "wax ring",
          es: "anillo de cera",
          note: "Seal between toilet and flange; also wax-free options",
        },
        {
          en: "flange",
          es: "flange / collarín",
          note: "Closet flange — toilet mounting ring at floor",
        },
        {
          en: "escutcheon",
          es: "roseón / embellecedor",
          note: "Decorative cover plate at wall penetration",
        },
        { en: "aerator", es: "aireador", note: "Screen at faucet spout end; often first to clog" },
        {
          en: "flex connector",
          es: "flexible / conexión flexible",
          note: "Braided supply line from stop to faucet",
        },
        {
          en: "pressure balancing valve",
          es: "válvula de equilibrio de presión",
          note: "Shower valve that prevents scalding; required by code",
        },
        { en: "drain assembly", es: "desagüe", note: "Stopper, strainer, and tailpiece as a unit" },
      ],
    },
    {
      phase: "Inspection & Testing",
      emoji: "📋",
      terms: [
        {
          en: "pressure test",
          es: "prueba de presión",
          note: "Air or water test; DWV holds 10 PSI for 15 min",
        },
        {
          en: "air test",
          es: "prueba de aire",
          note: "Preferred over water test on some inspections",
        },
        {
          en: "final inspection",
          es: "inspección final",
          note: "Fixtures installed, all trim in place",
        },
        {
          en: "rough inspection",
          es: "inspección de rústico / inspección gruesa",
          note: "Before walls are closed — all pipe exposed",
        },
        {
          en: "as-built",
          es: "como construido",
          note: "Drawing that shows what was actually installed",
        },
        { en: "redline", es: "marcas en rojo", note: "Inspector corrections noted on plans" },
      ],
    },
    {
      phase: "Supplier / Parts Counter",
      emoji: "🏪",
      terms: [
        { en: "half-inch copper type L", note: "Medium-wall; residential water supply standard" },
        {
          en: "3/4 PEX-A",
          note: "Most flexible type; requires expansion fittings (Uponor/Wirsbo)",
        },
        { en: "1-1/2 schedule 40 ABS", note: "Black plastic drain; common in Western U.S." },
        { en: '3" cast iron no-hub', note: "Cast iron with rubber coupling; used in multifamily" },
        { en: "Fernco coupling", note: "Brand name (like Kleenex) for no-hub rubber coupling" },
        {
          en: "Moen 1225 cartridge",
          note: "Common single-handle cartridge — always specify model",
        },
        {
          en: "shark bite",
          note: "Push-fit fitting brand — fast repairs, not preferred for permanent",
        },
        {
          en: "Oatey wax ring with horn",
          note: "Standard brand; 'with horn' for flanges set below floor",
        },
        {
          en: "ball valve vs gate valve",
          note: "Ball valves for shutoffs; gate valves are legacy, avoid on new work",
        },
      ],
    },
  ],

  codeReferences: [
    {
      citation: "IPC Section 604.8",
      plain: "Maximum water service pressure is 80 PSI. Above that you need a PRV.",
    },
    {
      citation: "IPC Section 712.2",
      plain: "Horizontal drain pipes must slope 1/4 inch per foot toward the outlet.",
    },
    {
      citation: "IPC Section 404",
      plain:
        "Water closet rough-in: 15 inches minimum from center to side wall, 30 inches center-to-center between toilets.",
    },
    {
      citation: "IPC Section 904",
      plain:
        "Vent stack termination must be 6 inches above the roof, 10 feet from any operable door or window.",
    },
    {
      citation: "IPC Section 607.1",
      plain:
        "Hot water supply temperature must not exceed 120°F at fixtures accessible to children, elderly, or disabled.",
    },
    {
      citation: "IPC Section 305.4",
      plain:
        "Underground plastic pipe requires 12 inches cover; copper requires 12 inches under slabs.",
    },
    {
      citation: "UPC Section 603",
      plain:
        "Uniform Plumbing Code (Western states): water supply pressure 15–80 PSI; PRV required above 80.",
    },
  ],

  supplierLanguage: [
    {
      term: "Pull a Moen 1225",
      meaning: "Request a Moen single-handle cartridge, part 1225",
      example: '"I need a Moen 1225 — the standard Posi-Temp cartridge."',
    },
    {
      term: "Half-inch type L sweat",
      meaning: "Copper pipe, medium wall, to be soldered",
      example: '"Give me 20 feet of half-inch type L and a bag of half-inch elbows and couplings."',
    },
    {
      term: "Fernco 3x3",
      meaning: "Fernco rubber coupling, 3-inch to 3-inch",
      example: '"Two Ferncos — 3x3 and one 3x4 for the transition."',
    },
    {
      term: "Ball valve, full port, 3/4 lead-free",
      meaning: "Full-bore ball valve, 3/4-inch, low-lead brass (required in CA and other states)",
      example: '"Four 3/4 full-port ball valves — make sure they\'re lead-free certified."',
    },
    {
      term: "Uponor/Wirsbo",
      meaning: "Brand name for PEX-A pipe and expansion fittings; often used generically",
      example:
        '"We\'re running Wirsbo throughout — I need the expansion tool and a box of half-inch fittings."',
    },
    {
      term: "Wax ring with horn",
      meaning:
        "Toilet wax ring with plastic extension collar (for flanges set below finished floor)",
      example: '"Give me a wax ring with horn — the flange is an inch low."',
    },
  ],

  freeResources: [
    {
      label: "International Plumbing Code (IPC) — ICC",
      url: "https://codes.iccsafe.org/content/IPC2021P3",
      note: "Adopted in most U.S. states; free read-only access online.",
    },
    {
      label: "Uniform Plumbing Code (UPC) — IAPMO",
      url: "https://www.iapmo.org/uniform-codes/upc/",
      note: "Used in California, Arizona, Oregon, and Western states.",
    },
    {
      label: "EPA WaterSense Program",
      url: "https://www.epa.gov/watersense",
      note: "Fixture efficiency ratings — useful for customer education on upgrades.",
    },
    {
      label: "PHCC — Plumbing-Heating-Cooling Contractors Association",
      url: "https://www.phccweb.org",
      note: "Industry training resources, apprenticeship materials.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICIAN — v2
// ─────────────────────────────────────────────────────────────────────────────

export const ELECTRICIAN_V2: TradeModuleV2 = {
  id: "electrician",
  name: "Electrician",
  emoji: "⚡",

  jobContexts: [
    {
      id: "residential-panel",
      name: "Residential Panel / Service Work",
      description:
        "Panel upgrades, service changes, whole-house rewires. Customer is a homeowner. Permit required. Inspector will do rough and final.",
      typicalAudience: "Homeowner, building inspector",
      languageNote:
        "Homeowners don't know amps, loads, or breaker sizes. Translate: 'You've got a 100-amp panel — most modern homes run 200. The panel is also Federal Pacific Stab-Lok, which is a known fire hazard and most insurers won't cover it anymore.' Dollar numbers and safety language close the job.",
      paceNote: "Diagnostic and consultative on the front end; methodical during execution.",
    },
    {
      id: "commercial-ti",
      name: "Commercial Tenant Improvement",
      description:
        "Office, retail, restaurant fit-out. GC-coordinated. EMT conduit, panel schedule, load calculations. Inspections required.",
      typicalAudience: "General contractor, project manager, building inspector",
      languageNote:
        "Technical register. Panel schedules, circuit loads, conduit fill. Inspectors want to hear NEC article references. GCs want schedule milestones.",
      paceNote: "Deadline-driven. Coordinate rough-in around other trades.",
    },
    {
      id: "industrial",
      name: "Industrial / Manufacturing",
      description:
        "3-phase power, motor control, VFDs, PLC work. High voltage. Safety-critical — NFPA 70E compliance, arc flash PPE required.",
      typicalAudience: "Plant manager, maintenance tech, safety officer",
      languageNote:
        "High technical register. LOTO (lock-out/tag-out) language is mandatory before any work. 'Has the equipment been properly locked out and tagged?' is never optional.",
      paceNote: "Deliberate. Double-check everything. Slow is smooth, smooth is fast.",
    },
    {
      id: "service-call",
      name: "Residential Service Call",
      description:
        "Breaker won't reset, outlets dead, light flickering. Diagnostic work — troubleshoot first, then repair or quote.",
      typicalAudience: "Homeowner (often frustrated)",
      languageNote:
        "Lead with diagnosis, not price. 'Let me find out what's going on before I give you a number.' Homeowners respect the methodical approach. Use plain language: 'tripped breaker' not 'overcurrent protective device.'",
      paceNote: "Quick diagnosis, clear explanation, clean quote.",
    },
  ],

  tradeScripts: [
    {
      id: "breaker-tripping-diagnosis",
      scenario: "Explaining a repeatedly tripping breaker to a homeowner",
      speaker: "Electrician",
      audience: "Homeowner",
      script:
        "Your 20-amp circuit in the kitchen is tripping because it's overloaded. A 20-amp circuit can carry about 16 amps continuously — code calls that 80 percent of the breaker rating. What you've got on this circuit right now is the microwave, the toaster oven, and a couple of outlets where the coffee maker and the blender plug in. Microwaves alone pull 10 to 13 amps. So as soon as two appliances run at the same time, you're over the limit and the breaker does exactly what it's supposed to do — it trips to protect the wiring. The fix is a dedicated circuit for the microwave. That'll run you about $350 to $450 including the permit.",
      notes:
        "Explain the 80% rule in plain language. Name the appliances, give real amperage numbers. Validate that the breaker working correctly is a good thing — homeowners often think a tripping breaker is broken.",
      codeRef: "NEC 210.19(A)(1) — continuous loads must not exceed 80% of circuit ampacity.",
    },
    {
      id: "panel-upgrade-consultation",
      scenario: "Recommending a panel upgrade to a homeowner",
      speaker: "Electrician",
      audience: "Homeowner",
      script:
        "What you've got here is a Federal Pacific Stab-Lok panel — 100-amp service, original to the house, probably 1970s. There are two problems. First, 100 amps is the minimum for a modern home and you're pretty much maxed out — you couldn't add an EV charger or a hot tub without a service upgrade. Second, Federal Pacific Stab-Loks have a documented history of breakers that don't trip when they should, which is a fire hazard. Most insurance companies won't renew a policy with one of these anymore. Replacing this with a 200-amp Square D Homeline panel is about $2,200 to $2,600 installed with permit. That gives you room to grow and gets the insurance issue off the table. When were you thinking about selling the house?",
      notes:
        "Name the brand (Federal Pacific / Stab-Lok). Give the dollar range. Close with a question that uncovers the customer's timeline — that drives urgency.",
    },
    {
      id: "apprentice-three-way-switch",
      scenario: "Walking an apprentice through wiring a 3-way switch",
      speaker: "Journeyman electrician",
      audience: "Apprentice",
      script:
        "A 3-way means you can control one light from two switches — top of the stairs and bottom. Each switch has three terminals: the common, and two travelers. The common on the first switch gets the hot from the panel. The common on the second switch gets the wire going to the light. The travelers connect the two switches to each other, and it doesn't matter which traveler goes to which, as long as they're consistent. So: hot in, travelers between the switches, common out to the fixture. The power goes through the switch box, not the light. Now look at the Romex — you've got a 3-wire: black, red, and white. White gets taped black at both ends because it's carrying hot — that's the NEC requirement.",
      notes:
        "Teaching electrical requires explaining the logic, not just the steps. 'Taped black' is a real code requirement. Naming the conductors and their functions prevents dangerous mistakes.",
      codeRef:
        "NEC 200.7(C)(2) — white conductor used as ungrounded conductor must be re-identified with tape at each visible location.",
    },
    {
      id: "inspector-walkthrough",
      scenario: "Rough-in inspection walkthrough with building inspector",
      speaker: "Electrician",
      audience: "Building inspector",
      script:
        "Good morning. We've got a 200-amp service, 240/120 single-phase. Panel is Square D QO, main breaker is the disconnect. All branch circuits are 12-gauge minimum — no 14 on 20-amp circuits. Kitchen has two small appliance circuits as required, and a dedicated 20-amp for the dishwasher and the refrigerator. Bathroom has a dedicated 20-amp GFCI circuit. Garage circuits are GFCI protected. All wire is Romex in protected locations, metal conduit where exposed below 8 feet in the garage. Boxes are all accessible, nothing buried. Ready for your inspection.",
      notes:
        "Inspectors want the code-relevant facts up front: conductor size, circuit dedications, GFCI locations. Demonstrating you know the code puts the inspector at ease and speeds the inspection.",
      codeRef:
        "NEC 210.52(B) — two small appliance branch circuits required in kitchen. NEC 210.11(C)(3) — dedicated bathroom circuit.",
    },
    {
      id: "load-calculation-summary",
      scenario: "Explaining a load calculation to a property manager",
      speaker: "Electrician",
      audience: "Property manager / building owner",
      script:
        "I ran a load calculation on the building per NEC Article 220. Your demand load comes out to 147 amps on a 200-amp service — you're at 73 percent. That sounds fine, but you told me you want to add three EV chargers. Level 2 chargers pull 40 amps each — that's 120 amps of continuous load added to what you've got. You'd be at 223 percent of your service. So before we add anything, you need a 400-amp service upgrade. I can give you a number on that before you commit to the EV project.",
      notes:
        "Property managers think in percentages and dollars, not amperes. Translate the load calculation into a capacity story. Connect the upgrade to the project they care about.",
      codeRef:
        "NEC Article 220 — branch circuit, feeder, and service load calculations. NEC 625.42 — EV charging equipment circuit sizing.",
    },
    {
      id: "gfci-explanation",
      scenario: "Explaining why a GFCI outlet keeps tripping",
      speaker: "Electrician",
      audience: "Homeowner",
      script:
        "This GFCI outlet is tripping because it's detecting a ground fault — a tiny amount of current leaking somewhere it shouldn't go. GFCIs are designed to trip at 5 milliamps, which is fast enough to prevent electrocution. There are two possibilities: either there's an actual fault — a wire touching something it shouldn't, or a failed appliance — or the GFCI itself is worn out and tripping nuisance. Let me test what's plugged into this circuit and if nothing shows a fault, I'll swap the device. They're about $20 in parts. But I want to rule out a real fault first, because if there's actual leakage and I just replace the GFCI, you've still got a problem.",
      notes:
        "Homeowners often blame the GFCI for 'breaking.' Explain the safety logic so they understand tripping is a feature. Always rule out the real fault before replacing the device.",
      codeRef: "NEC 210.8 — GFCI protection required locations.",
    },
    {
      id: "loto-safety-industrial",
      scenario: "Verifying LOTO procedure before work on industrial equipment",
      speaker: "Electrician",
      audience: "Plant maintenance supervisor",
      script:
        "Before I touch anything I need to confirm lockout/tagout is complete. Who applied the lock? I need to see the energy source isolated and a zero-energy state verified — that means I test with my meter at the load side of the disconnect before I open the panel. I'm also seeing an arc flash label on this cabinet rated at 40 cal/cm² — I need to verify my PPE is rated for that before we go any further. Can I see the energy control program for this equipment?",
      notes:
        "An electrician who insists on LOTO compliance is not slowing down the job — they are doing it correctly. Never skip the meter test even if someone says 'it's already off.'",
      codeRef:
        "NFPA 70E Article 120 — establishing an electrically safe work condition. OSHA 29 CFR 1910.147 — control of hazardous energy.",
    },
  ],

  vocabPhases: [
    {
      phase: "Rough-In",
      emoji: "🔌",
      terms: [
        {
          en: "home run",
          note: "Circuit wire running directly back to the panel without splicing",
        },
        {
          en: "pull wire / fish wire",
          es: "jalar el cable",
          note: "Threading wire through conduit or walls",
        },
        {
          en: "Romex / NM cable",
          es: "cable Romex",
          note: "Non-metallic sheathed cable; brand name used generically",
        },
        {
          en: "EMT conduit",
          es: "conduit metálico",
          note: "Electrical metallic tubing — commercial and exposed residential",
        },
        { en: "box fill", note: "Code calculation for wires allowed in a box; NEC 314.16" },
        {
          en: "rough-in location",
          es: "ubicación de caja",
          note: "Where outlet, switch, or fixture boxes are placed before drywall",
        },
      ],
    },
    {
      phase: "Panel / Service",
      emoji: "⚡",
      terms: [
        {
          en: "main breaker",
          es: "breaker principal",
          note: "Disconnects the entire panel from the service entrance",
        },
        {
          en: "service entrance",
          es: "acometida",
          note: "Utility conductors from the meter to the panel",
        },
        {
          en: "sub-panel",
          es: "sub-tablero / tablero auxiliar",
          note: "Secondary panel fed from the main",
        },
        { en: "bus bar", es: "barra de bus", note: "Metal bar in panel that breakers snap onto" },
        {
          en: "neutral bar",
          es: "barra neutral",
          note: "Where white wires and grounding conductors land",
        },
        {
          en: "double-tap",
          note: "Two wires on one breaker terminal — code violation in most cases",
        },
        {
          en: "tandem breaker",
          note: "Two breakers in one slot space; also called cheater, slimline, half-size",
        },
        { en: "ampacity", note: "The current-carrying capacity of a conductor" },
      ],
    },
    {
      phase: "Finish / Devices",
      emoji: "🪛",
      terms: [
        {
          en: "GFCI receptacle",
          es: "tomacorriente GFCI / toma con protección",
          note: "Ground fault circuit interrupter outlet",
        },
        {
          en: "AFCI breaker",
          note: "Arc fault circuit interrupter — required in bedrooms and living areas per NEC 2014+",
        },
        {
          en: "wire nut",
          es: "conector / tuerca de alambre",
          note: "Twist-on connector; brand name used generically",
        },
        {
          en: "pigtail",
          es: "colita",
          note: "Short jumper wire used to connect multiple wires to a device",
        },
        {
          en: "recessed can / pot light",
          es: "ojo de buey",
          note: "'Ojo de buey' (bull's eye) common on bilingual sites",
        },
        {
          en: "panel schedule",
          note: "Labels for every breaker — required before final inspection",
        },
      ],
    },
    {
      phase: "Inspection & Code",
      emoji: "📋",
      terms: [
        {
          en: "rough inspection",
          es: "inspección de rústico",
          note: "Before drywall — all wiring exposed",
        },
        {
          en: "final inspection",
          es: "inspección final",
          note: "All devices and fixtures installed, panel labeled",
        },
        { en: "arc flash label", note: "Required on electrical equipment per NFPA 70E" },
        { en: "LOTO", note: "Lock-out/tag-out — mandatory energy isolation procedure" },
        {
          en: "code violation",
          es: "violación de código",
          note: "Inspector correction that must be fixed before approval",
        },
      ],
    },
    {
      phase: "Supplier / Parts Counter",
      emoji: "🏪",
      terms: [
        {
          en: "12-2 Romex w/ground, 250-foot roll",
          note: "12 AWG, 2 conductor plus ground; standard 20-amp circuit cable",
        },
        { en: "14-2 Romex", note: "14 AWG; 15-amp circuits only; never on a 20-amp breaker" },
        {
          en: "Leviton Decora GFCI",
          note: "Flat-face style GFCI outlet; specify amperage (15A or 20A) and color",
        },
        {
          en: "Square D QO vs Homeline",
          note: "QO = higher quality; Homeline = economy; breakers are not interchangeable",
        },
        {
          en: "Eaton BR",
          note: "Competing panel brand; Eaton breakers do not fit Square D panels",
        },
        {
          en: "3/4 EMT with set-screw connectors",
          note: "Specify connector type — set-screw vs compression",
        },
        {
          en: "Ideal 344 wire nuts",
          note: "Yellow Ideal 344 for 2 to 4 #12 wires; color codes the quantity",
        },
      ],
    },
  ],

  codeReferences: [
    {
      citation: "NEC 210.52",
      plain:
        "Receptacle outlets required every 12 feet along any wall — no point on a wall more than 6 feet from an outlet.",
    },
    {
      citation: "NEC 210.8",
      plain:
        "GFCI protection required in: bathrooms, kitchens within 6 feet of a sink, garages, unfinished basements, outdoors.",
    },
    {
      citation: "NEC 210.52(B)",
      plain:
        "Kitchen requires at least two 20-amp small appliance circuits for countertop receptacles.",
    },
    {
      citation: "NEC 314.16",
      plain:
        "Box fill calculation — each 12 AWG conductor counts as 2.25 cubic inches. Don't overfill boxes.",
    },
    {
      citation: "NEC 230.79",
      plain:
        "Minimum 100-amp service for a single-family dwelling; 200-amp strongly recommended for new construction.",
    },
    {
      citation: "NFPA 70E Article 120",
      plain:
        "Electrically safe work condition: de-energize, lock out, test with meter before touching any conductor.",
    },
  ],

  supplierLanguage: [
    {
      term: "12-2 with ground, 250-foot roll",
      meaning: "NM cable, 12 AWG, 2 conductors + ground, 250-foot spool",
      example: '"Give me four rolls of 12-2 with ground and two rolls of 10-2."',
    },
    {
      term: "QO220 — 20-amp double pole",
      meaning: "Square D QO series, 20-amp, 2-pole breaker (use for 240V circuits)",
      example: '"I need a QO220 for the dryer circuit."',
    },
    {
      term: "Half-inch liquidtite",
      meaning: "Flexible liquid-tight conduit; used at motor connections and outdoor equipment",
      example: '"Ten feet of half-inch liquidtite and two 90-degree connectors."',
    },
    {
      term: "Decora GFCI, 20-amp, white",
      meaning: "Leviton Decora-style GFCI outlet, 20A, white",
      example: '"Six Decora GFCIs, 20-amp white — need them for the kitchen."',
    },
    {
      term: "1-gang old-work box",
      meaning: "Plastic electrical box for adding an outlet to existing finished wall",
      example: '"Dozen 1-gang old-work boxes — I\'m adding outlets to an existing house."',
    },
  ],

  freeResources: [
    {
      label: "National Electrical Code (NEC) — NFPA 70",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-70-standard-for-electrical-installations",
      note: "Current adopted code; free read-only access available through NFPA.",
    },
    {
      label: "NFPA 70E — Electrical Safety in the Workplace",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-70e-standard-for-electrical-safety-in-the-workplace",
      note: "Arc flash and LOTO requirements; required for industrial work.",
    },
    {
      label: "IBEW — International Brotherhood of Electrical Workers",
      url: "https://www.ibew.org",
      note: "Apprenticeship programs, continuing education, trade resources.",
    },
    {
      label: "Mike Holt Enterprises",
      url: "https://www.mikeholt.com",
      note: "Free NEC training videos and articles; widely used for licensing exam prep.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FRAMER — v2
// ─────────────────────────────────────────────────────────────────────────────

export const FRAMER_V2: TradeModuleV2 = {
  id: "framer",
  name: "Framer",
  emoji: "🔨",

  jobContexts: [
    {
      id: "production-housing",
      name: "Production Housing",
      description:
        "High-volume residential tract: 10 to 100+ identical or similar houses, framed in sequence. Crew work — typically 4 to 10 framers per house. Speed is the metric. Plans are standard and repeated.",
      typicalAudience: "Framing foreman, framing sub owner, production superintendent",
      languageNote:
        "Bilingual Spanish-English is the daily reality. Most production framing crews in the Sun Belt and West are Spanish-dominant. The foreman often bridges: English with the super, Spanish with the crew. Code-switching mid-sentence is standard: 'Put the jack stud here — pon el jack aquí.' Measurement terms often stay in English even in Spanish speech.",
      paceNote: "Fast. Houses frame in days. Short, direct commands. Efficiency language.",
    },
    {
      id: "custom-home",
      name: "Custom Home",
      description:
        "Single architect-designed home with complex rooflines, vaulted ceilings, engineered lumber. Plans are detailed. Mistakes are expensive. More communication with the architect and GC.",
      typicalAudience: "Custom home GC, architect, structural engineer, building inspector",
      languageNote:
        "More technical vocabulary. Engineered lumber (LVL, I-joist, parallam) is standard. Conversations with architects require reading elevation drawings and understanding design intent, not just dimensions.",
      paceNote: "Measured. Plan-reading and RFI communication are important.",
    },
    {
      id: "commercial-wood-frame",
      name: "Commercial Wood Frame",
      description:
        "Multi-family residential (apartments, townhomes), wood-framed commercial buildings up to 5 stories. Fire-blocking and fire wall requirements are prominent. Metal plate connectors on every structural connection.",
      typicalAudience: "GC superintendent, structural engineer, inspector",
      languageNote:
        "Code language around fire blocking and shear walls is prominent. 'Simpson' hardware is used generically for all metal connectors. Inspectors check every connection before sheathing.",
      paceNote: "Coordinated and inspection-paced — can't sheath until inspector approves.",
    },
    {
      id: "retrofit-addition",
      name: "Retrofit / Addition",
      description:
        "Adding onto an existing house. Tie-ins to existing structure, opening load-bearing walls, working in tight spaces with existing utilities. Plans may be simple or absent.",
      typicalAudience: "Homeowner, remodeling GC, structural engineer",
      languageNote:
        "Existing conditions drive everything. 'What's existing' and 'what's new' must be clearly communicated. Load path from new to old must be verified. Homeowners are present and curious.",
      paceNote: "Careful and investigative. Verify before you cut.",
    },
  ],

  tradeScripts: [
    {
      id: "load-bearing-wall-explanation",
      scenario: "Explaining load-bearing wall location to crew",
      speaker: "Framing foreman",
      audience: "Framing crew (bilingual)",
      script:
        "Listen up. This wall here — la pared del centro — is load-bearing. It carries the weight of the floor above directly down to the foundation. Do not cut studs in this wall without a temporary wall up first. We're putting a 4x10 LVL beam up here as a header when we open this up. I need all the cripple studs tight and the king studs full length. No shortcuts on this one — this is structural. ¿Entendido?",
      notes:
        "Bilingual direct instruction for a critical structural element. Name the material (LVL beam). Emphasize 'structural' — it signals the stakes. King studs, cripple studs, and header are all real technical terms.",
    },
    {
      id: "header-callout",
      scenario: "Calling out a header measurement during framing",
      speaker: "Framer",
      audience: "Crew",
      script:
        "Six-foot opening — I need a 4x10 header, trim it to five feet eleven and a quarter. Set it on two jack studs each side — make sure the jacks are plumb before you set the header, I don't want it racked. Nail it off with 16d sinkers, two per jack, both sides. Then your cripples above and sill plate below. What's your rough opening again? Check the plans — window schedule, sheet A-3.",
      notes:
        "Measurement precision is critical. 'Plumb the jacks before you set the header' prevents a crooked window rough-opening. '16d sinkers' is the nail spec — sinkers are easier to drive than bright nails.",
    },
    {
      id: "supplier-material-order",
      scenario: "Ordering lumber and sheathing from the supplier",
      speaker: "Framing foreman",
      audience: "Lumber yard",
      script:
        "I need a delivery for tomorrow morning, 7 AM. I've got a 2,400-square-foot two-story. Give me 200 pieces of 2x6 16-foot, 150 pieces of 2x6 10-foot, 100 pieces of 2x4 8-foot. Plates — 200 pieces 2x6 16-foot. For sheathing, 120 sheets of 7/16 OSB. Headers — 40 linear feet of 4x10 LVL. One bundle of joist hangers, Simpson LUS26, and 5 pounds of 10d joist hanger nails. What's your lead time on the LVL?",
      notes:
        "Supplier orders require exact quantities, dimensions, and grades. 'Simpson LUS26' is a specific catalog number — using the part number prevents substitutions. LVL lead time is often longer than dimensional lumber.",
    },
    {
      id: "plumb-and-line-sequence",
      scenario: "Directing the crew on plumbing and lining walls",
      speaker: "Lead framer",
      audience: "Crew",
      script:
        "Walls are up, now we square and brace. Start at the corners — check for plumb both ways with the level, then brace them. Once corners are plumb, snap a line down the top plate and bring everything in line. Use the string line — don't eyeball it. When it's plumb and in line, nail your diagonal bracing at 45 degrees, it stays until sheathing goes on. Don't pull the braces until the OSB is nailed off. I want this deck level and the walls plumb before the crew leaves today — inspector is coming Thursday.",
      notes:
        "'Plumb and line' is the final step before sheathing — if it's wrong here, every subsequent trade is fighting it. 'Don't pull the braces until sheathed' is a cardinal rule.",
    },
    {
      id: "fire-blocking-instruction",
      scenario: "Explaining fire-blocking requirements to the crew",
      speaker: "Framing foreman",
      audience: "Crew",
      script:
        "Inspectors are going to check fire blocking. Every wall cavity over ten feet gets a block at mid-height — a horizontal 2x4 between the studs, tight, no gaps. Soffits over cabinets, chase walls around the fireplace, any concealed space over 10 feet — all need blocking. At the bottom of stairs where the wall meets the subfloor, blocking. I'll go through the punch list after rough framing and flag anything that needs it. The city gets strict about this — they'll fail the inspection for a missing block.",
      notes:
        "Frame it as 'inspectors check this' — it motivates the crew better than pure code citation. Walk the fire-blocking punch list before calling for inspection.",
      codeRef:
        "IRC R302.11 — fire blocking required in concealed spaces over 10 feet vertical height.",
    },
    {
      id: "shear-wall-nailing",
      scenario: "Directing the crew on shear wall sheathing and nailing",
      speaker: "Lead framer",
      audience: "Crew",
      script:
        "This is a shear wall — the structural engineer called it out on sheet S-1. The nailing pattern is not standard. Look at the stamp on the panel — 10d nails, 3-inch spacing at all edges, 12-inch in the field. Not the standard 6 and 12. The inspector checks this with a ruler, so don't shortchange it. Nails have to be a half-inch from the edge minimum — closer than that is an edge split. Mark your stud layout before you start so you hit every framing member.",
      notes:
        "Shear walls are one of the most commonly failed inspections when crews apply standard nailing to a shear panel. The pattern is on the plans — make the crew read it. Inspector will measure the spacing.",
      codeRef: "IBC Section 2305 / AWC SDPWS — shear wall nailing per engineered design.",
    },
    {
      id: "safety-tailgate-bilingual",
      scenario: "Morning safety tailgate with the framing crew",
      speaker: "Foreman",
      audience: "Full crew (bilingual)",
      script:
        "Good morning. Escuchen — safety first today. We're working on the second floor — anything above six feet needs a fall restraint or we work behind guardrails. No walking on top plates to get across — use the walking boards. If you're on a ladder, three points of contact: two feet and one hand, or two hands and one foot. No carrying material up a ladder without a second person. Hard hats and safety glasses all day. If anyone sees a hazard — a loose board, a missing guardrail, anything — you stop and you call it out. Your life is worth more than one stud. ¿Alguna pregunta?",
      notes:
        "OSHA 29 CFR 1926 Subpart R. 'Six feet' is the OSHA trigger for fall protection. Bilingual delivery: open in English, key reminders in both, close with Spanish question for the crew.",
      codeRef: "OSHA 29 CFR 1926.502 — fall protection on residential construction above 6 feet.",
    },
  ],

  vocabPhases: [
    {
      phase: "Layout & Foundation",
      emoji: "📐",
      terms: [
        {
          en: "snap line / chalk line",
          es: "tirar línea / línea de tiza",
          note: "Mark layout on slab or subfloor before walls go up",
        },
        {
          en: "sill plate / mud sill",
          es: "solera / placa de piso",
          note: "Bottom plate bolted to foundation; PT lumber required",
        },
        {
          en: "anchor bolt",
          es: "perno de anclaje",
          note: "Embeds in foundation; holds sill plate",
        },
        {
          en: "PT (pressure-treated)",
          es: "madera tratada",
          note: "Required wherever wood contacts concrete",
        },
        {
          en: "floor joist",
          es: "vigueta de piso",
          note: "Horizontal framing supporting floor deck",
        },
        {
          en: "rim joist / band board",
          es: "viga de remate / cabezal",
          note: "Perimeter joist that caps the floor frame",
        },
        { en: "subfloor", es: "subpiso", note: "OSB or plywood layer over joists" },
      ],
    },
    {
      phase: "Wall Framing",
      emoji: "🔨",
      terms: [
        { en: "king stud", es: "montante rey", note: "Full-height stud running beside an opening" },
        {
          en: "jack stud / trimmer",
          es: "montante corto / recortado",
          note: "Shorter stud supporting the header",
        },
        {
          en: "cripple stud",
          es: "montante enano / estaca enana",
          note: "Short stud above header or below sill",
        },
        {
          en: "header",
          es: "viga de cabecera / el cabezal",
          note: "Horizontal member spanning a door or window opening",
        },
        {
          en: "top plate / double top plate",
          es: "placa superior / doble placa",
          note: "Horizontal plate at top of wall; doubled to tie corners",
        },
        {
          en: "bottom plate / sole plate",
          es: "placa inferior / solera",
          note: "Bottom of wall frame",
        },
        {
          en: "stud",
          es: "montante / estaca",
          note: 'Vertical framing member; typically 16" o.c.',
        },
        {
          en: "on center (o.c.)",
          es: "entre ejes / de centro a centro",
          note: "Spacing measured center-to-center",
        },
        { en: "plumb", es: "a plomo", note: "Perfectly vertical" },
        { en: "level", es: "a nivel", note: "Perfectly horizontal" },
        { en: "square", es: "escuadrado / cuadrado", note: "90-degree corners" },
      ],
    },
    {
      phase: "Roof Framing",
      emoji: "🏠",
      terms: [
        {
          en: "ridge board / ridge beam",
          es: "cumbrera",
          note: "Horizontal member at peak of roof",
        },
        {
          en: "rafter",
          es: "cabio / rafta",
          note: "Sloped framing from ridge to top plate; 'rafta' common on bilingual sites",
        },
        {
          en: "birdsmouth cut",
          es: "corte de pájaro",
          note: "Notch in rafter where it sits on the top plate",
        },
        { en: "hip rafter", es: "lima tesa", note: "Corner rafter at a hip roof" },
        { en: "valley", es: "lima hoya", note: "Inside corner where two roof planes meet" },
        { en: "I-joist / TJI", note: "Engineered wood I-beam; TJI is the Weyerhaeuser brand" },
        {
          en: "LVL beam",
          es: "viga LVL",
          note: "Laminated veneer lumber; specify size: 3.5x9.5, 3.5x11.75, etc.",
        },
      ],
    },
    {
      phase: "Sheathing & Inspection",
      emoji: "📋",
      terms: [
        {
          en: "OSB (oriented strand board)",
          es: "OSB / tablero de virutas",
          note: "Standard sheathing for walls and roof",
        },
        { en: "H-clips", note: "Metal clips between OSB roof panels — required without blocking" },
        {
          en: "shear wall",
          es: "muro de corte / muro resistente",
          note: "Structural wall resisting lateral (wind/seismic) loads",
        },
        {
          en: "nailing pattern",
          es: "patrón de clavado",
          note: "Edge spacing and field spacing for shear panels",
        },
        {
          en: "Simpson hardware",
          es: "harwear Simpson / el Simpson",
          note: "Simpson Strong-Tie brand; used generically for all metal connectors",
        },
        { en: "hold-down", note: "Mechanical anchor at base of shear wall; resists overturning" },
      ],
    },
    {
      phase: "Supplier / Material Order",
      emoji: "🏪",
      terms: [
        {
          en: "2x6 studs, 16-foot",
          note: "Standard exterior wall stud for 9-foot finished ceilings",
        },
        {
          en: "16d sinker nails",
          note: "16-penny coated nails for framing — most common framing nail",
        },
        { en: "8d common nails", note: "8-penny for sheathing nailing" },
        {
          en: "joist hangers — LUS26 / LUS28",
          note: "Simpson catalog numbers for 2x6 and 2x8 joist hangers",
        },
        {
          en: "hurricane ties / H2.5A",
          note: "Simpson H2.5A: rafter-to-top-plate connector required in wind zones",
        },
        { en: "7/16 OSB, 4x8 sheets", note: "Standard wall and roof sheathing thickness" },
      ],
    },
  ],

  codeReferences: [
    {
      citation: "IRC R602",
      plain:
        "Prescriptive wall framing requirements: stud size, spacing, and height limits for bearing walls.",
    },
    {
      citation: "IRC R802",
      plain:
        "Roof framing requirements: rafter spans, ridge board sizing, collar ties, and ceiling joist spans.",
    },
    {
      citation: "IRC R302.11",
      plain:
        "Fire blocking required in concealed wall and floor cavities exceeding 10 feet vertical or horizontal.",
    },
    {
      citation: "IBC Section 2305 / AWC SDPWS",
      plain:
        "Shear wall nailing schedules and sheathing requirements per engineered design documents.",
    },
    {
      citation: "OSHA 29 CFR 1926.502",
      plain:
        "Fall protection required for residential construction work at heights of 6 feet or more.",
    },
    {
      citation: "IRC R317",
      plain:
        "Pressure-treated or naturally durable wood required wherever wood contacts concrete, masonry, or soil.",
    },
  ],

  supplierLanguage: [
    {
      term: "200 sticks of 2x6x16",
      meaning: "200 pieces of 2-inch x 6-inch x 16-foot dimensional lumber",
      example: '"Two hundred sticks of 2x6x16 and a hundred 2x6x10 for plates."',
    },
    {
      term: "3.5x11.75 LVL, 18-foot length",
      meaning: "Laminated veneer lumber, 3.5-inch x 11.75-inch, 18-foot length",
      example: '"I need four pieces of 3.5x11.75 LVL at 18 feet for the main beam."',
    },
    {
      term: "H2.5A hurricane ties",
      meaning: "Simpson H2.5A rafter-to-top-plate connectors",
      example: '"Give me 200 H2.5A ties and 5 pounds of 10d joist hanger nails."',
    },
    {
      term: "7/16 OSB, Exposure 1",
      meaning: "OSB sheathing rated for exposure to weather before cladding; specify for roof",
      example: '"120 sheets of 7/16 OSB — make sure it\'s rated Exposure 1 for the roof."',
    },
    {
      term: "16d galvanized sinkers",
      meaning: "Coated 16-penny framing nails; galvanized for treated lumber contact",
      example: '"Thirty pounds of 16d galvanized sinkers — we\'re framing against PT sill plates."',
    },
  ],

  freeResources: [
    {
      label: "International Residential Code (IRC) — ICC",
      url: "https://codes.iccsafe.org/content/IRC2021P1",
      note: "Primary residential building code; free read-only access. Chapters R6 (walls) and R8 (roof) for framing.",
    },
    {
      label: "AWC Wood Frame Construction Manual (WFCM)",
      url: "https://www.awc.org/publications/wfcm/",
      note: "American Wood Council prescriptive framing guide; free download.",
    },
    {
      label: "Simpson Strong-Tie Product Catalog",
      url: "https://www.strongtie.com/resources/literature/catalogs",
      note: "Free catalog of all metal connectors with installation specs and code compliance.",
    },
    {
      label: "OSHA Construction Safety — Residential",
      url: "https://www.osha.gov/residential-construction",
      note: "Fall protection, scaffold, and general safety requirements for residential framing.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// LANDSCAPER — v2
// ─────────────────────────────────────────────────────────────────────────────

export const LANDSCAPER_V2: TradeModuleV2 = {
  id: "landscaper",
  name: "Landscaper",
  emoji: "🌿",

  jobContexts: [
    {
      id: "residential-maintenance",
      name: "Residential Maintenance",
      description:
        "Regular lawn service: mow, edge, blow, trim. Weekly or biweekly. Crew visits without the owner present most of the time. Account management and upsell conversations via phone or in person.",
      typicalAudience: "Homeowner (often via phone or text, occasionally present)",
      languageNote:
        "Plain, friendly, non-technical. Homeowners say 'the shrubs' not 'the Ligustrum.' Upsell language should feel advisory: 'I noticed your mulch is getting thin — we could refresh it while we're here for about $80.'",
      paceNote: "Efficient on the property; communicative via phone/text between visits.",
    },
    {
      id: "commercial-grounds",
      name: "Commercial Grounds Maintenance",
      description:
        "Office parks, shopping centers, apartment complexes. Higher volume, consistent spec. Contract-driven. Property manager is the client.",
      typicalAudience: "Property manager, HOA board, facilities director",
      languageNote:
        "Professional, specification-oriented. Clients say 'the service spec' and 'contract scope.' Document everything. 'That's outside our scope of the current contract — I can add it for X' is essential commercial language.",
      paceNote: "Scheduled and documented. Show up on time, complete the scope, report any issues.",
    },
    {
      id: "installation",
      name: "Landscape Installation",
      description:
        "New plantings, irrigation install, sod, hardscape (patios, retaining walls, pathways). Larger project, crew work, sometimes subcontracting.",
      typicalAudience: "Homeowner, designer, general contractor",
      languageNote:
        "Bilingual crew environment is common. 'Ponla aquí' (put it here) for plant placement. 'El nivel' (the level) for hardscape. Technical plant names — clients expect common names, nurseries use Latin names.",
      paceNote: "Project-paced. Daily goals, milestone conversations at completion.",
    },
    {
      id: "hoa-contract",
      name: "HOA / Community Association Contract",
      description:
        "Subdivision-wide or community contract. Multiple properties, high visibility, one client (the HOA board). Contract renewal is the business goal.",
      typicalAudience: "HOA property manager, board president",
      languageNote:
        "Formal. Written communication matters. 'Per the contract,' 'scope of work,' 'renewal proposal' are the register. Never argue — document and address.",
      paceNote: "Relationship-managed. The contract renewal conversation happens all year.",
    },
  ],

  tradeScripts: [
    {
      id: "new-client-walkthrough",
      scenario: "Walking a new residential client through a full-service plan",
      speaker: "Landscape contractor",
      audience: "Homeowner",
      script:
        "For full-service maintenance we'd come every week April through October, every other week November through March. Each visit: mow at 3.5 inches — I don't go shorter, it stresses the grass and you'll get more weeds — edge along the driveway, sidewalk, and beds, blow off the hard surfaces. We also trim shrubs as needed to keep them from overgrowing. I'll let you know if I see anything — irrigation heads that aren't working, trees that need attention, anything that needs a separate quote. You'll get a text confirmation after every visit. Service is $85 a week in season, $65 off-season.",
      notes:
        "Name the mow height — it shows professionalism and explains why you won't cut shorter just because a homeowner asks. The price per visit is always clearer than an annual contract total.",
    },
    {
      id: "irrigation-zone-explanation",
      scenario: "Explaining why irrigation zones need adjustment",
      speaker: "Landscape contractor",
      audience: "Homeowner",
      script:
        "Your lawn in the back corner is dry because that zone only runs 8 minutes and the heads there are rotors — rotors put out less water per minute than spray heads, they're designed for large areas and longer run times. I'd run that zone 20 to 25 minutes. Also, zone 3 has a head that's stuck — it's not rotating, just shooting in one direction. I can rebuild that head for about $35 parts and labor. I'd also adjust your controller to water before sunrise — right now it's set for noon, and you're losing a third of your water to evaporation. Smart controller upgrade is about $250 installed, and it pays back in water savings.",
      notes:
        "Name the specific issue ('rotor vs. spray head run times'). Tie the upgrade to ROI on the water bill. Quote the small repair while you're at it — it adds up.",
    },
    {
      id: "retaining-wall-estimate",
      scenario: "Walking a homeowner through a retaining wall estimate",
      speaker: "Landscape contractor",
      audience: "Homeowner",
      script:
        "The wall is about 40 linear feet, 3 feet tall at the high point. We'd use Versa-Lok block — that's a concrete segmental unit that pins together and has good drainage built into the system. Behind the wall goes compacted gravel and a perforated drain pipe so water pressure doesn't build up and push the wall over. At 3 feet we don't need a permit in most jurisdictions but I'll verify that before we start. Labor and materials, you're looking at $7,500 to $8,500. Timing: probably a 3-day job, early next month is the first opening I have.",
      notes:
        "Name the product (Versa-Lok) — it tells the client you know what you're doing. Explain the drainage system because otherwise clients ask 'why do we need gravel?' Verify the permit threshold — it varies by municipality.",
    },
    {
      id: "crew-daily-briefing-bilingual",
      scenario: "Morning crew briefing on residential maintenance schedule (bilingual)",
      speaker: "Crew lead / foreman",
      audience: "Maintenance crew (Spanish-dominant)",
      script:
        "Escuchen — ocho casas hoy. Listen up — eight houses today. Empezamos en la calle Maple, tres casas seguidas — start on Maple Street, three in a row. Mow at 3.5 inches, todos. Edge the street and the driveway, blow everything clean. En la segunda casa, the second house, there's a note in the app — client wants us to skip the backyard today, trabajadores adentro. On Wilson Street we've got the HOA entrance — trim the boxwood hedges tight, flat on top. Take your time on that one. Agua — traigan suficiente agua, va a hacer calor. Back at the shop by 3:30.",
      notes:
        "Authentic bilingual crew briefing — English for the record, Spanish for communication. The water reminder ('traigan suficiente agua, va a hacer calor') is routine safety in hot-weather landscaping. OSHA heat illness prevention.",
    },
    {
      id: "hoa-complaint-response",
      scenario: "Handling a complaint from an HOA property manager about lawn damage",
      speaker: "Landscape contractor",
      audience: "HOA property manager",
      script:
        "I heard about the damage on the east side of Building C. I was out there this morning — two of our crew equipment tires tracked across the wet turf near the entry, you can see the ruts. I take responsibility for that. Here's what I'm going to do: I'll core aerate and overseed those areas next week at no charge, and they'll heal up in about three weeks. Going forward, after rain I'll have the crew stage equipment on the pavement, not the grass. I'll have a written report to you by end of day Friday. Is there anything else from that visit you want me to look at?",
      notes:
        "Take responsibility immediately, describe the specific fix with a timeline, explain the process change, offer written documentation. HOA managers respond well to accountability — never be defensive.",
    },
    {
      id: "plant-installation-direction-bilingual",
      scenario: "Directing crew on planting installation (bilingual)",
      speaker: "Lead landscaper",
      audience: "Installation crew (bilingual)",
      script:
        "El diseño dice — the plan shows — three Knock Out roses along the fence, spaced four feet apart. Dig the holes twice as wide as the container and the same depth — dos veces más ancho, misma profundidad. No deeper — if you plant too deep, the crown rots. Add a handful of slow-release fertilizer in the hole before you set the plant. Backfill with the native soil, not straight compost. Water in when you're done — rieguen bien. Mark the spacing with flags before you dig — don't guess.",
      notes:
        "Planting depth and hole width are the two things crews most often get wrong. Bilingual instruction: English for the concept, Spanish for confirmation. 'Knock Out roses' — use the common trade name.",
    },
    {
      id: "commercial-out-of-scope",
      scenario: "Explaining an out-of-scope request to a commercial property manager",
      speaker: "Landscape contractor",
      audience: "Commercial property manager",
      script:
        "I got your message about the storm damage on the south side — three Bradford Pears came down. I looked at it this morning. That's outside our current maintenance contract scope, which covers regular mowing and grounds maintenance. I can get you a separate proposal for the removal and stump grinding, and if you want to replant we can include that too. I can have the proposal to you by Thursday. If you need it addressed sooner as an emergency, I can mobilize a crew by end of this week, but there'd be an emergency mobilization charge. What's your timeline?",
      notes:
        "Always clarify scope before doing work. Never do out-of-scope work without authorization. Offer the solution (proposal) immediately. Give two options: standard vs. emergency with pricing difference.",
    },
  ],

  vocabPhases: [
    {
      phase: "Maintenance Operations",
      emoji: "🌱",
      terms: [
        {
          en: "mow height",
          es: "altura de corte",
          note: 'Expressed in inches; 3 to 3.5" for most lawn types',
        },
        {
          en: "edge",
          es: "orillado / bordar",
          note: "Cuts a clean line between turf and hard surface or beds",
        },
        {
          en: "blow out",
          es: "soplar / limpiar con el soplador",
          note: "Clear clippings from hard surfaces with blower",
        },
        {
          en: "string trimmer / weed eater",
          es: "desmalezadora / el desbrozador / el hilo",
          note: "'El hilo' (the string) is common on bilingual sites",
        },
        { en: "blower", es: "el soplador", note: "Backpack or handheld leaf blower" },
        {
          en: "shear / hedge trimmer",
          es: "las tijeras / el tijeral",
          note: "Power hedge trimmer",
        },
        {
          en: "turf",
          es: "pasto / zacate",
          note: "'Zacate' common in Southwest and Mexican Spanish",
        },
        { en: "bed edge", es: "borde del jardín", note: "Clean cut between lawn and planting bed" },
      ],
    },
    {
      phase: "Irrigation",
      emoji: "💧",
      terms: [
        {
          en: "spray head",
          es: "aspersor / cabeza de riego",
          note: "Fixed-spray head; waters in a set arc pattern",
        },
        {
          en: "rotor head",
          es: "rotor",
          note: "Rotating head; lower precipitation rate, longer run time needed",
        },
        {
          en: "valve / zone valve",
          es: "válvula de zona",
          note: "Solenoid valve controlling each irrigation zone",
        },
        {
          en: "controller / timer",
          es: "controlador / el timer",
          note: "Programs run times and schedules",
        },
        {
          en: "backflow preventer",
          es: "válvula antirretorno",
          note: "Code-required device preventing irrigation water from entering potable supply",
        },
        {
          en: "drip line",
          es: "riego por goteo",
          note: "Low-volume tubing for bed and tree irrigation",
        },
        {
          en: "precipitation rate",
          note: 'Inches per hour output; rotors ~0.5"/hr, sprays ~1.5"/hr',
        },
        { en: "run time", es: "tiempo de riego", note: "Minutes each zone runs per cycle" },
      ],
    },
    {
      phase: "Installation / Hardscape",
      emoji: "🪨",
      terms: [
        {
          en: "grading",
          es: "nivelación / la grade",
          note: "Shaping soil slope for drainage — water flows away from structures",
        },
        {
          en: "compaction",
          es: "compactación",
          note: "Mechanical tamping of base material before hardscape",
        },
        {
          en: "base material / road base",
          es: "base / material de base",
          note: "Crushed aggregate base under pavers or wall blocks",
        },
        {
          en: "segmental retaining wall block",
          es: "bloque de muro / el bloque",
          note: "Versa-Lok, Allan Block, etc.",
        },
        { en: "geogrid", note: "Structural mesh embedded in wall backfill on taller walls" },
        {
          en: "screeded sand",
          es: "arena nivelada",
          note: "Level sand bed for paver installation",
        },
        {
          en: "drainage fabric / filter fabric",
          es: "geotextil / tela de drenaje",
          note: "Separates aggregate from soil in drainage systems",
        },
      ],
    },
    {
      phase: "Plants & Soil",
      emoji: "🌳",
      terms: [
        {
          en: "annual / perennial",
          es: "anual / perenne",
          note: "Annual = replant every year; perennial = comes back",
        },
        {
          en: "container size / gallon",
          es: "tamaño de contenedor / el galón",
          note: "1-gal, 3-gal, 5-gal, 15-gal; larger = faster establishment",
        },
        {
          en: "balled-and-burlapped (B&B)",
          es: "con tierra y arpillera",
          note: "Trees dug with soil ball; better survival for large specimens",
        },
        {
          en: "mulch — double-ground hardwood",
          es: "abono / mantillo",
          note: "Specify type: hardwood, cedar, pine, dyed black/red",
        },
        {
          en: "slow-release fertilizer",
          es: "fertilizante de liberación lenta",
          note: "Pellet form; releases over 3–6 months",
        },
        {
          en: "crown of plant",
          es: "corona de la planta",
          note: "Where stem meets roots; never bury the crown",
        },
        {
          en: "sod",
          es: "tepe / pasto en rollo",
          note: "Pre-grown turf installed in strips; 'rollo' common",
        },
      ],
    },
    {
      phase: "Supplier / Parts Counter",
      emoji: "🏪",
      terms: [
        {
          en: "3 yards double-ground hardwood mulch",
          note: 'Order by cubic yard; 1 yard covers ~100 sq ft at 3" depth',
        },
        {
          en: "Hunter PGP rotor head",
          note: "Industry-standard rotor; Hunter brand used generically in some markets",
        },
        { en: "Rainbird 1800 spray body", note: "Most common spray head in Western U.S." },
        {
          en: "1-inch Orbit valve, 24V",
          note: "Common irrigation zone valve; specify 24V for standard controllers",
        },
        {
          en: "Versa-Lok standard block, quarry color",
          note: "Segmental wall block; ~30 lb each; specify color at order",
        },
        {
          en: "road base / Class II base",
          note: '3/4" minus crushed aggregate; specify 4" compacted depth minimum',
        },
        {
          en: "pre-emergent herbicide / Preen",
          note: "Applied to beds to prevent weed seed germination; 'Preen' used generically",
        },
      ],
    },
  ],

  codeReferences: [
    {
      citation: "IRC R405 / local drainage codes",
      plain:
        "Positive drainage required away from all foundations — minimum 6-inch drop in first 10 feet.",
    },
    {
      citation: "Local irrigation backflow requirements",
      plain:
        "Most municipalities require a backflow preventer on all irrigation systems connected to potable water — inspected annually in many jurisdictions.",
    },
    {
      citation: "OSHA 29 CFR 1928 — heat illness prevention",
      plain:
        "Provide water (1 quart per hour per worker), shade, and rest breaks during high-temperature outdoor work.",
    },
    {
      citation: "Pesticide applicator licensing",
      plain:
        "Applying any EPA-registered pesticide commercially requires a state-issued pesticide applicator's license. Herbicides, insecticides, and fungicides all count.",
    },
    {
      citation: "ADA 403 — accessible routes",
      plain:
        "Commercial hardscape paths must be 36 inches wide minimum, slope less than 5% (1:20), cross slope less than 2%.",
    },
  ],

  supplierLanguage: [
    {
      term: "3 yards double-ground hardwood, bulk",
      meaning: "3 cubic yards of double-processed hardwood mulch, bulk delivery (not bags)",
      example: '"I need 3 yards of double-ground delivered to the job site by 7 AM Tuesday."',
    },
    {
      term: "Rainbird 1800 bodies with 15-foot nozzles",
      meaning: "Rainbird 1800-series spray bodies with 15-foot arc nozzles installed",
      example: '"Give me 20 1800 bodies with 15H nozzles and 10 with 15Q for the corners."',
    },
    {
      term: "Pallet of Versa-Lok standard, charcoal",
      meaning: "Approximately 80 blocks per pallet; specify color at order",
      example: '"Two pallets of Versa-Lok standard in charcoal — and I need the capstones too."',
    },
    {
      term: "Knock Out rose, 3-gallon",
      meaning: "Proven Winners Knock Out rose shrub, 3-gallon container",
      example: '"Twenty Knock Out roses, 3-gallon, whatever color you have in stock."',
    },
    {
      term: "Bermuda sod, full pallet",
      meaning: "Bermuda grass sod, approximately 450 sq ft per pallet",
      example: '"Four pallets of Bermuda — can you deliver Thursday and hold it in the shade?"',
    },
    {
      term: "Hunter Pro-C controller, 6-station",
      meaning: "Hunter Pro-C irrigation controller, 6-zone capacity; expandable",
      example: '"One Hunter Pro-C 6-station and the outdoor cabinet kit."',
    },
  ],

  freeResources: [
    {
      label: "Irrigation Association — Best Practices",
      url: "https://www.irrigation.org/IA/Resources/Best_Practices/IA/Resources/Best_Practices.aspx",
      note: "System design, installation, and water management best practices.",
    },
    {
      label: "NALP — National Association of Landscape Professionals",
      url: "https://www.landscapeprofessionals.org",
      note: "Industry training, certification programs, and business resources.",
    },
    {
      label: "EPA WaterSense Irrigation",
      url: "https://www.epa.gov/watersense/outdoor-water-use-us",
      note: "Outdoor water use statistics and smart irrigation program — useful for client education.",
    },
    {
      label: "OSHA Heat Safety Tool (app)",
      url: "https://www.osha.gov/heat/heat-app",
      note: "Free mobile app — input location and date, get heat index and protective measures for outdoor crews.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// v2 ASSEMBLED EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const TRADES_MODULES_V2: TradeModuleV2[] = [
  PLUMBER_V2,
  ELECTRICIAN_V2,
  FRAMER_V2,
  LANDSCAPER_V2,
];

export function getTradeModuleV2(id: string | null | undefined): TradeModuleV2 | null {
  if (!id) return null;
  return TRADES_MODULES_V2.find((m) => m.id === id) ?? null;
}

export function getJobContexts(tradeId: string): JobContext[] {
  return getTradeModuleV2(tradeId)?.jobContexts ?? [];
}

export function getJobContext(tradeId: string, contextId: string): JobContext | null {
  return getJobContexts(tradeId).find((c) => c.id === contextId) ?? null;
}
