import type { ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sp, sb } from "./curriculum-helpers.ts";

// Language practice for nonclinical mission coordination; local teams own operational decisions.
const topics = [
  [
    "Introduce your logistics role",
    "Introduce yourself to the host coordinator, explain your nonclinical role, and confirm who makes transport and supply decisions.",
  ],
  [
    "Names, numbers, and contact details",
    "Spell names, exchange coordinator contact details, repeat telephone numbers, and agree on the preferred communication channel.",
  ],
  [
    "Confirm the trip schedule",
    "Read back dates, arrival times, local time, hospital reporting times, and the daily transport schedule.",
  ],
  [
    "Coordinate airport pickup",
    "Confirm the flight, terminal, meeting point, driver identity, delayed arrivals, and the number of travelers and bags.",
  ],
  [
    "Reserve the team bus",
    "Request a bus quote, confirm passenger and luggage capacity, seat belts, route, pickup time, and written booking details.",
  ],
  [
    "Accessible transport",
    "Ask about accessible vehicles, boarding arrangements, wheelchair storage, and assistance agreed with the local care team.",
  ],
  [
    "Brief the driver and count the team",
    "Confirm the passenger list and meeting point, count the team, and report a missing traveler without leaving anyone behind.",
  ],
  [
    "Change a route or pickup time",
    "Explain a delay or road closure, agree on a revised pickup, and communicate the change clearly to the whole team.",
  ],
  [
    "Hotel and hospital arrivals",
    "Confirm room arrangements, check-in, hospital entrances, visitor instructions, and the local orientation meeting.",
  ],
  [
    "Food, water, and daily needs",
    "Arrange meals and drinking water, clarify dietary needs, and report a service issue to the coordinator.",
  ],
  [
    "Build an equipment inventory",
    "Identify equipment by name, quantity, serial number, owner, and destination using the host-approved inventory.",
  ],
  [
    "Count and label supply boxes",
    "Count boxes and pallets, check labels against the packing list, and identify where each shipment belongs.",
  ],
  [
    "Packing and handling instructions",
    "Ask for approved packaging and handling instructions, protect fragile items, and clarify which boxes must remain sealed.",
  ],
  [
    "Weights, dimensions, and freight quotes",
    "Give shipment weights and dimensions, request a freight quote, and confirm what the written quote includes.",
  ],
  [
    "Shipping documents and local contacts",
    "Ask the authorized shipping partner which documents and local consignee details are required; request corrections without inventing customs rules.",
  ],
  [
    "Coordinate customs questions",
    "Describe a held shipment, contact the authorized customs broker, ask what is missing, and communicate the revised delivery estimate.",
  ],
  [
    "Track a delayed shipment",
    "Ask the carrier for shipment status, tracking details, expected arrival, and the next update time.",
  ],
  [
    "Arrange unloading and receiving",
    "Confirm the receiving contact, delivery appointment, loading access, unloading equipment, and the designated storage location.",
  ],
  [
    "Report missing or damaged cargo",
    "Compare delivered cargo with the packing list, record visible damage and missing items, and ask the responsible partner for next steps.",
  ],
  [
    "Storage and access",
    "Confirm secure storage, authorized access, locations, and handling conditions specified by the responsible staff and product instructions.",
  ],
  [
    "Hand equipment to the local team",
    "Identify equipment and accessories, record the receiver, and refer setup, inspection, and clinical use to qualified local staff.",
  ],
  [
    "Check supply levels",
    "Ask authorized staff to confirm available stock, shortages, expiration dates, and the approved replenishment request.",
  ],
  [
    "Arrange a local purchase",
    "Clarify the approved item, supplier, budget, quote, delivery, receipt, and who must approve any substitution.",
  ],
  [
    "Route a request to the right person",
    "Clarify a request from nursing, PT, or physicians and relay it to the authorized coordinator without giving clinical advice.",
  ],
  [
    "Coordinate interpreters and wayfinding",
    "Request qualified language support and give clear directions, keeping clinical interpreting and patient details with authorized staff.",
  ],
  [
    "Transport disruptions and urgent help",
    "Report a vehicle breakdown, stop an unsafe transport arrangement, contact local help through the team plan, and arrange an approved alternative.",
  ],
  [
    "Run the daily logistics briefing",
    "Summarize transport, cargo, supply priorities, open issues, responsible people, and the next update time.",
  ],
  [
    "Return, donate, or retain equipment",
    "Ask authorized staff which items stay, return, or require an approved donation process, and update the inventory and shipment records.",
  ],
  [
    "Receipts, costs, and closeout",
    "Reconcile receipts and approved expenses, clarify missing records, and summarize unresolved deliveries and responsibilities.",
  ],
  [
    "Mission logistics capstone",
    "Give a complete arrival-to-departure logistics handoff covering buses, equipment, supplies, problems, records, and local ownership.",
  ],
] as const;

export const MEDICAL_MISSION_LOGISTICS_CURRICULUM: ModuleCurriculum = {
  moduleId: "medical-mission-logistics",
  headline: "The Medical Mission Logistics Core 30",
  threshold:
    "By Lesson 30, you can coordinate team transport, discuss equipment and supply shipments, clarify receiving and storage, and give the local team a complete logistics handoff in Spanish, following the organizing team's approved arrangements.",
  lessons: topics.map(([title, objective], i) => ({
    n: i + 1,
    title,
    objective,
    steps: [
      r("Read the logistics conversation. Identify the request, confirmation, and next action.", 7),
      wm("Practice this lesson's logistics terms and phrases.", 5),
      sb("Build clear requests and read-back confirmations using the lesson phrases.", 5),
      sp(`Role-play with the host coordinator: ${objective}`, 7),
    ],
  })),
};
