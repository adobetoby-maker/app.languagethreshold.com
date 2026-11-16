import type { AppModule } from "./modules";
const courses = [
  {
    id: "accounting",
    name: "Accounting & Financial Services",
    emoji: "📊",
    category: "Finance",
    blurb:
      "Explain invoices, accounts, reports, loans and tax-planning questions with clients and coworkers.",
    role: "an accountant, banker or tax professional speaking with a client or coworker",
    prompts: [
      "Request missing client records and confirm the next step.",
      "Explain a bank reconciliation difference to a coworker.",
      "Discuss a fictional planning estimate and its assumptions.",
    ],
    spanishWords: [
      "factura",
      "ingresos",
      "gasto",
      "saldo",
      "extracto",
      "conciliación",
      "crédito fiscal",
      "préstamo",
    ],
    words: [
      "invoice",
      "revenue",
      "expense",
      "balance",
      "statement",
      "reconciliation",
      "tax credit",
      "loan",
    ],
  },
  {
    id: "personal-money",
    name: "Personal Money & Banking",
    emoji: "🏦",
    category: "Finance",
    blurb:
      "Bank staff, banking apps, balances, transfers, budgeting, saving, borrowing and investment questions.",
    role: "an individual managing everyday money and asking financial questions",
    prompts: [
      "Ask a teller about your available balance.",
      "Explain a duplicate settled transaction to customer support.",
      "Ask about an investment fund’s fees, risk and access to money.",
    ],
    spanishWords: [
      "cuenta",
      "depósito",
      "retiro",
      "comisión",
      "presupuesto",
      "ahorro",
      "interés",
      "inversión",
    ],
    words: [
      "account",
      "deposit",
      "withdrawal",
      "fee",
      "budget",
      "savings",
      "interest",
      "investment",
    ],
  },
  {
    id: "travel-money",
    name: "Travel Money & Payments",
    emoji: "💱",
    category: "Travel",
    blurb:
      "Prices, exchange rates, cash, change, bargaining, hotel payments, taxi fares, rental deposits and refunds.",
    role: "a traveler confirming prices and exchanging money for goods and services",
    prompts: [
      "Ask how much you receive after an exchange fee.",
      "Ask for a better price and confirm the agreed total.",
      "Clarify a hotel card hold and ask about its release.",
    ],
    spanishWords: [
      "precio",
      "moneda",
      "tipo de cambio",
      "cambio",
      "recibo",
      "depósito",
      "reembolso",
      "total",
    ],
    words: [
      "price",
      "currency",
      "exchange rate",
      "change",
      "receipt",
      "deposit",
      "refund",
      "total",
    ],
  },
] as const;
export const FINANCE_MODULES: AppModule[] = courses.flatMap((c) =>
  (["Spanish", "English"] as const).map((target) => ({
    id: target === "Spanish" ? c.id : `${c.id}-english`,
    name: `${c.name} · ${target}`,
    emoji: c.emoji,
    category: c.category,
    blurb: c.blurb,
    priceCents: 999,
    languages: [target],
    nativeLanguages: [target === "Spanish" ? "English" : "Spanish"],
    authoredPair: { target, native: target === "Spanish" ? "English" : "Spanish" },
    ...(target === "English" ? { learnDirection: "en-target" as const } : {}),
    userRole: c.role,
    aiPersona: `You teach ${target} for ${c.name.toLowerCase()}. Practice the learner's specific situation with a clear amount, purpose and closure. Use fictional financial figures and documents. Label country-specific terminology and use plain explanations. Teach language and concepts; do not invent live exchange rates, tax rules or guaranteed investment outcomes. Never request real account numbers, access codes or private financial records.`,
    challengePrompts: [...c.prompts],
    vocabFocus: [...(target === "Spanish" ? c.spanishWords : c.words)],
  })),
);
export function financeTrack(moduleId: string) {
  return (
    FINANCE_MODULES.find((m) => m.id === moduleId.replace(/^(foundation|master)-/, "")) ?? null
  );
}
