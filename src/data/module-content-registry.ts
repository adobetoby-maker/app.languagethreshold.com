// Unified content registry for all 34 language-learning modules.
//
// Routes a (moduleId, areaId) pair to the correct content file and
// normalizes the result to a single ModuleAreaContext shape.
//
// Two source formats exist:
//   1. ModuleArea[] — trades, sports, service/edu, agri/travel/faith, EM, nursing, ortho
//   2. ClinicalContext — family-medicine, cardiology, ob-gyn, general-surgery
//
// The LDS Missionary and Orthopedics modules continue to use their own
// dedicated paths in api.tutor.ts for backwards compatibility.

import { getOrEvsArea } from "./or-evs-content";
import { getFmgArea } from "./fmg-content";
import { getTradesArea } from "./trades-content";
import { getTransportTradesArea } from "./transport-trades-content";
import { getAgriTravelFaithArea } from "./agri-travel-faith-content";
import { getServiceEduArea } from "./service-edu-content";
import { getBallSportsArea } from "./ball-sports-content";
import { getTeamSportsArea } from "./team-sports-content";
import { getFamilyMedContext } from "./family-medicine-content";
import { getCardiologyContext } from "./cardiology-content";
import { getObGynContext } from "./ob-gyn-content";
import { getSurgeryContext } from "./general-surgery-content";
import { getEmArea } from "./emergency-medicine-content";
import { getNursingArea } from "./nursing-content";
import { PAIN_AREAS } from "./pain-management-content";
import { PAIN_CONTEXTS } from "./pain-management-content";

export interface ModuleAreaContext {
  name: string;
  counterpart?: string;
  learnerRole?: string;
  toneNote?: string;
  vocab?: string[];
  phrases?: string[];
  sampleExchange?: string;
}

type ModuleAreaLike = {
  name: string;
  counterpart?: string;
  learnerRole?: string;
  toneNote?: string;
  vocab?: string[];
  phrases?: Array<{ en: string; intent: string }>;
  sampleConversation?: Array<{ speaker: string; en: string }>;
};

type ClinicalContextLike = {
  name: string;
  setting?: string;
  patientProfile?: string;
  languageNote?: string;
};

function fromModuleArea(area: ModuleAreaLike): ModuleAreaContext {
  const topPhrases = (area.phrases ?? []).slice(0, 8).map((p) => p.en);
  const exchange = (area.sampleConversation ?? [])
    .slice(0, 4)
    .map((t) => `${t.speaker === "learner" ? "Learner" : "AI"}: ${t.en}`)
    .join("\n");
  return {
    name: area.name,
    counterpart: area.counterpart,
    learnerRole: area.learnerRole,
    toneNote: area.toneNote,
    vocab: (area.vocab ?? []).slice(0, 20),
    phrases: topPhrases,
    sampleExchange: exchange || undefined,
  };
}

function fromClinicalContext(ctx: ClinicalContextLike): ModuleAreaContext {
  return {
    name: ctx.name,
    counterpart: ctx.patientProfile,
    toneNote: ctx.languageNote,
  };
}

const MODULE_TO_AREA_MODULES = new Set([
  "framer",
  "roofing",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "auto-mechanic",
  "truck-driver",
  "construction-foreman",
  "dairy-farmer",
  "ranch-cowboy",
  "meatpacking-butcher",
  "international-travel",
  "catholic-ministry",
  "restaurant-hospitality",
  "legal-immigration",
  "k12-teacher",
  "soccer",
  "hockey",
  "baseball",
  "tennis",
  "bowling",
  "american-football",
  "lacrosse",
  "rugby",
  "sports-hobbies",
  "or-evs",
  "fmg",
]);

export function getModuleAreaContext(
  moduleId: string,
  areaId: string | null | undefined,
): ModuleAreaContext | null {
  if (!areaId) return null;

  // ── Trades ────────────────────────────────────────────────────────────────
  if (["framer", "roofing", "plumber", "drywall", "electrician", "landscaper"].includes(moduleId)) {
    const area = getTradesArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Transport trades ──────────────────────────────────────────────────────
  if (["auto-mechanic", "truck-driver", "construction-foreman"].includes(moduleId)) {
    const area = getTransportTradesArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Agriculture / travel / faith ──────────────────────────────────────────
  if (
    [
      "dairy-farmer",
      "ranch-cowboy",
      "meatpacking-butcher",
      "international-travel",
      "catholic-ministry",
    ].includes(moduleId)
  ) {
    const area = getAgriTravelFaithArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Service / education ───────────────────────────────────────────────────
  if (["restaurant-hospitality", "legal-immigration", "k12-teacher"].includes(moduleId)) {
    const area = getServiceEduArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Ball sports ───────────────────────────────────────────────────────────
  if (["soccer", "hockey", "baseball", "tennis", "bowling"].includes(moduleId)) {
    const area = getBallSportsArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Team sports ───────────────────────────────────────────────────────────
  if (["american-football", "lacrosse", "rugby", "sports-hobbies"].includes(moduleId)) {
    const area = getTeamSportsArea(moduleId, areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Emergency medicine ────────────────────────────────────────────────────
  if (moduleId === "emergency-medicine") {
    const area = getEmArea(areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Nursing ───────────────────────────────────────────────────────────────
  if (moduleId === "nursing") {
    const area = getNursingArea(areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Pain management ───────────────────────────────────────────────────────
  if (moduleId === "pain-management") {
    const area = PAIN_AREAS.find((a) => a.id === areaId);
    if (area) return fromModuleArea(area as ModuleAreaLike);
    const ctx = PAIN_CONTEXTS.find((c) => c.id === areaId);
    return ctx ? fromClinicalContext(ctx as ClinicalContextLike) : null;
  }

  // ── Medical specialties (ClinicalContext format) ──────────────────────────
  if (moduleId === "family-medicine") {
    const ctx = getFamilyMedContext(areaId);
    return ctx ? fromClinicalContext(ctx as ClinicalContextLike) : null;
  }
  if (moduleId === "cardiology") {
    const ctx = getCardiologyContext(areaId);
    return ctx ? fromClinicalContext(ctx as ClinicalContextLike) : null;
  }
  if (moduleId === "ob-gyn") {
    const ctx = getObGynContext(areaId);
    return ctx ? fromClinicalContext(ctx as ClinicalContextLike) : null;
  }
  if (moduleId === "general-surgery") {
    const ctx = getSurgeryContext(areaId);
    return ctx ? fromClinicalContext(ctx as ClinicalContextLike) : null;
  }

  // ── OR Environmental Services ─────────────────────────────────────────────
  if (moduleId === "or-evs") {
    const area = getOrEvsArea(areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // ── Foreign Medical Graduates ─────────────────────────────────────────────
  if (moduleId === "fmg") {
    const area = getFmgArea(areaId);
    return area ? fromModuleArea(area as ModuleAreaLike) : null;
  }

  // lds-missionary and orthopedics are handled directly in api.tutor.ts
  return null;
}

export { MODULE_TO_AREA_MODULES };
