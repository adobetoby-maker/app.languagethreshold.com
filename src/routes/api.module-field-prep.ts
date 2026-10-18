import { anthropicTextStream } from "@/lib/anthropic-text-stream";
import {
  withConversationProvider,
  ConversationProviderError,
  conversationResponseHeaders,
} from "@/lib/conversation-provider";
import { prepareConversationRequest } from "@/lib/conversation-request";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { initSentry, Sentry } from "../lib/sentry";
initSentry();

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const BodySchema = z.object({
  scenarioId: z.string().max(60),
  partnerName: z.string().max(80),
  partnerRole: z.string().max(400),
  learnerRole: z.string().max(400),
  openingSetup: z.string().max(800),
  moduleGroup: z.enum(["medical", "trades", "sports"]),
  language: z.string().min(1).max(40),
  level: z.string().min(1).max(40),
  messages: z.array(MessageSchema).max(80),
  requestFeedback: z.boolean().default(false),
});

// Natural clarification phrases by language — what a real speaker says when confused
const CLARIFICATION_PHRASE: Record<string, string> = {
  Spanish: "¿Cómo dijiste? / ¿Perdón?",
  French: "Comment ? / Pardon ?",
  German: "Wie bitte? / Entschuldigung?",
  Italian: "Come ha detto? / Prego?",
  Portuguese: "Como disse? / Pode repetir?",
  Japanese: "もう一度おっしゃっていただけますか？",
  Korean: "다시 말씀해 주시겠어요?",
  English: "Sorry, could you say that again?",
};

// Dialect / register notes by language
function buildDialectNote(language: string): string | null {
  switch (language) {
    case "French":
      return `Use conversational French. Drop "ne" in negation informally ("je sais pas", "c'est pas grave"). Use "on" instead of "nous". Natural fillers: "bon", "enfin", "bref", "quoi". Register adapts to context — clinical or professional settings stay formal (vous), job sites and sports can loosen to tu after a moment.`;
    case "Spanish":
      return `Use natural Latin American Spanish. Warm register. "Usted" with patients and new contacts; "tú" on job sites once rapport is established. Natural fillers: "mire", "pues", "oiga".`;
    case "German":
      return `Use German. Professional contexts: Sie throughout. Job sites may shift to du once familiarity is established. Germans are direct — avoid over-explaining. Natural filler: "also", "naja", "genau".`;
    case "Italian":
      return `Use Italian. Start formal (Lei) with patients or clients; tu is fine between colleagues or on a sports field. Natural exclamations: "senti", "guarda", "dai". Expressive but professional.`;
    case "Portuguese":
      return `Use Brazilian Portuguese. Warm and direct. Contracted speech: "tá", "pra", "num". Natural fillers: "então", "né", "cara" (informal). Clinical settings stay formal; sports coaching is energetic and informal.`;
    case "Japanese":
      return `Use Japanese. Polite register (です・ます) in medical and professional settings. Sports coaching can use plain form with players. Soft clarification patterns: "すみません、もう一度…". Never use English.`;
    case "Korean":
      return `Use Korean. Formal polite speech (해요체) in medical and client contexts; coaching can use informal with players. Natural filler: "그런데", "사실". Stay culturally grounded in your character.`;
    default:
      return null;
  }
}

function buildSystemPrompt(payload: z.infer<typeof BodySchema>): string {
  const {
    partnerName,
    partnerRole,
    learnerRole,
    openingSetup,
    language,
    level,
    moduleGroup,
    requestFeedback,
  } = payload;

  if (requestFeedback) {
    return [
      `You are a language coach helping a ${language} learner practice professional conversation in the ${moduleGroup} field.`,
      ``,
      `You have been roleplaying as "${partnerName}" — ${partnerRole}.`,
      `The learner was playing: ${learnerRole}.`,
      ``,
      `FEEDBACK MODE: Break character completely. Switch to English.`,
      `Review the learner's most recent ${language} message and give specific, constructive coaching:`,
      ``,
      `1. ONE thing they said well (vocabulary, phrasing, naturalness, professional register)`,
      `2. ONE or TWO grammar or vocabulary corrections — show the corrected version in ${language} with English gloss`,
      `3. ONE natural phrase a ${language}-speaking professional would more likely say, with explanation`,
      `4. Brief encouragement — professional language practice in a second language is genuinely hard`,
      ``,
      `Keep feedback to 5-7 sentences total. Be specific, not generic. Reference their actual words.`,
      `End with: "Ready to continue? Just keep going."`,
    ].join("\n");
  }

  const moduleStyle: Record<string, string> = {
    medical: `Professional clinical register. Use appropriate medical terminology naturally. Real patients and colleagues don't always use the correct terms — you may use lay language or professional shorthand depending on who you're playing. Never add stage directions or asterisks.`,
    trades: `Practical, direct job-site register. Short sentences. Workers on a job site don't over-explain — they say what they need and move on. Use construction and trades vocabulary naturally. Never add stage directions or asterisks.`,
    sports: `Energetic and direct sports communication. Coaching language is motivational, technical, and immediate. Use sports vocabulary, position names, and tactical terms naturally. Never add stage directions or asterisks.`,
  };

  const clarification = CLARIFICATION_PHRASE[language] ?? CLARIFICATION_PHRASE["Spanish"];
  const dialectNote = buildDialectNote(language);

  const lines: (string | null)[] = [
    `You are roleplaying as ${partnerName} — ${partnerRole}.`,
    `The person you are talking to is: ${learnerRole}.`,
    ``,
    `SCENE SETUP:`,
    openingSetup,
    ``,
    `LANGUAGE RULES:`,
    `- Respond ONLY in ${language}. Never use English.`,
    dialectNote ? `- ${dialectNote}` : null,
    `- The person you're speaking with is at ${level} level. Speak naturally — do not oversimplify, but do not use vocabulary so obscure they're completely lost.`,
    `- Keep your responses 2-4 sentences. This is a real conversation, not a monologue.`,
    `- ${moduleStyle[moduleGroup] ?? moduleStyle.medical}`,
    `- React authentically: if they make a language error that causes genuine confusion, respond naturally ("${clarification}") — this is what a real person would do.`,
    `- Stay fully in character at all times. Do NOT explain the exercise or break the fourth wall.`,
    `- Raise your character's natural concerns, objections, or questions when the scene calls for them.`,
    `- Do NOT make it artificially easy — authentic interaction is what makes practice valuable.`,
  ];

  return lines.filter(Boolean).join("\n");
}

export const Route = createFileRoute("/api/module-field-prep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareConversationRequest(request, BodySchema);
        if (prepared.response) return prepared.response;
        const payload = prepared.data;

        const KEY = process.env.ANTHROPIC_API_KEY;
        if (!KEY) {
          return new Response(JSON.stringify({ error: "AI is not configured" }), {
            status: 500,
            headers: conversationResponseHeaders("application/json"),
          });
        }

        const systemPrompt = buildSystemPrompt(payload);

        const messages: { role: "user" | "assistant"; content: string }[] =
          payload.messages.length === 0
            ? [
                {
                  role: "user",
                  content:
                    "[SCENARIO START: The learner has arrived. Begin the conversation as described in your scene setup. Speak your opening line now as your character.]",
                },
              ]
            : payload.messages.map((m) => ({ role: m.role, content: m.content }));

        try {
          return await withConversationProvider(request, KEY, async (client, options) => {
            const stream = await client.messages.create(
              {
                model: "claude-sonnet-5-5",
                max_tokens: 700,
                system: systemPrompt,
                messages,
                stream: true,
              },
              options,
            );

            return new Response(anthropicTextStream(stream), {
              status: 200,
              headers: conversationResponseHeaders("text/event-stream"),
            });
          });
        } catch (error) {
          Sentry.captureException(new Error("module-field-prep provider request failed"));
          return new Response(JSON.stringify({ error: "AI request failed." }), {
            status: error instanceof ConversationProviderError ? error.status : 500,
            headers: conversationResponseHeaders("application/json"),
          });
        }
      },
    },
  },
});
