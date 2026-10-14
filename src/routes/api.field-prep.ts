import Anthropic from "@anthropic-ai/sdk";
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
  investigatorName: z.string().max(80),
  investigatorBackground: z.string().max(1200),
  openingSetup: z.string().max(600),
  language: z.string().min(1).max(40),
  level: z.string().min(1).max(40),
  missionArea: z
    .object({
      name: z.string().max(120),
      region: z.string().max(80).optional(),
      languages: z.array(z.string().max(40)).max(12).optional(),
      cultureNote: z.string().max(400).optional(),
    })
    .optional(),
  messages: z.array(MessageSchema).max(80),
  requestFeedback: z.boolean().default(false),
});

function buildDialectNote(language: string, missionAreaName?: string): string | null {
  if (language === "Spanish") {
    const area = missionAreaName?.toLowerCase() ?? "";
    if (area.includes("mexico")) {
      return `Use Mexican Spanish. Natural fillers: "órale", "¿cómo no?", "ahorita", "ándale", "a poco". Address the missionaries as "jóvenes" or "hermanos". Warm, friendly register — Mexicans are known for hospitality even when declining.`;
    }
    if (area.includes("spain") || area.includes("iberia")) {
      return `Use Castilian Spanish. Use "vosotros" when addressing them as a pair. Natural expressions: "oye", "tío/tía" in casual moments, "hombre" as a filler. Slightly more reserved than Latin American Spanish.`;
    }
    if (area.includes("central america")) {
      return `Use Central American Spanish. Natural and warm. "Usted" form common even with younger people. Natural filler: "mire", "fíjese". Hospitality is genuine — door approaches are usually welcomed politely.`;
    }
    if (area.includes("south america northwest")) {
      return `Use Andean Spanish (Peru/Ecuador/Colombia register). Clear pronunciation, slower pace than coastal Spanish. "Pues" as a common filler. Respectful "usted" with strangers is the norm.`;
    }
    return `Use natural Latin American Spanish. Warm and clear register. Address missionaries as "hermanos" or "jóvenes". "Mire", "oiga", "pues" as natural fillers.`;
  }
  if (language === "Portuguese") {
    const area = missionAreaName?.toLowerCase() ?? "";
    if (area.includes("brazil")) {
      return `Use Brazilian Portuguese. Warm and informal. Natural fillers: "então", "né", "gente", "poxa". Contracted forms in speech: "tá", "pra", "pro". Brazilians are generally warm and talkative even with strangers. Address missionaries as "rapazes" or "irmãos".`;
    }
    return `Use European Portuguese. More formal register. Standard clitic placement. Slightly reserved with strangers at first — warm up over the conversation.`;
  }
  if (language === "French") {
    return `Use conversational French. In informal speech, drop "ne" in negation ("je sais pas", "c'est pas vrai"). Use "on" instead of "nous" in conversation. Natural fillers: "bon", "enfin", "bref", "quoi". The French are often reserved at the door but will engage if you are genuine.`;
  }
  if (language === "Italian") {
    return `Use Italian with natural expressiveness. Natural exclamations: "ma dai!", "senti", "guarda", "mamma mia". Start with formal "Lei" with strangers. May shift to "tu" if the conversation becomes genuinely warm. Italians respect directness paired with warmth.`;
  }
  if (language === "German") {
    return `Use German. Start formal (Sie throughout). Only shift to du if the conversation becomes exceptionally warm — which is unusual at the door. Germans appreciate directness. Typical door-knocking response is brief and polite but not overly effusive.`;
  }
  if (language === "Japanese") {
    return `Use Japanese. Polite register (丁寧語/です・ます) throughout. Soft refusal patterns: "ちょっと…", "そうですね…", "考えておきます". Japanese door responses are brief and polite-but-deflecting. The challenge is breaking through the polite deflection with genuine warmth.`;
  }
  if (language === "Korean") {
    return `Use Korean. Formal polite speech level (해요체). Natural fillers: "그런데", "그래도", "사실은". Koreans may be initially reserved at the door but warm up quickly if approached with sincerity and respect.`;
  }
  return null;
}

function buildSystemPrompt(payload: z.infer<typeof BodySchema>): string {
  const {
    investigatorName,
    investigatorBackground,
    openingSetup,
    language,
    level,
    missionArea,
    requestFeedback,
  } = payload;

  if (requestFeedback) {
    return [
      `You are a language coach helping an LDS missionary practice ${language} conversation.`,
      ``,
      `You have been roleplaying as "${investigatorName}" — ${investigatorBackground}`,
      ``,
      `FEEDBACK MODE: Break character completely. Switch to English.`,
      `Review the missionary's most recent ${language} message and give specific, constructive coaching:`,
      ``,
      `1. ONE thing they said well (vocabulary, phrasing, naturalness, cultural appropriateness)`,
      `2. ONE or TWO grammar or vocabulary corrections — show the corrected version in ${language} with English gloss`,
      `3. ONE natural phrase a native ${language} speaker would more likely say, with explanation`,
      `4. Brief encouragement — this practice is genuinely valuable`,
      ``,
      `Keep feedback to 5-7 sentences total. Be specific, not generic. Reference their actual words.`,
      `End with: "Ready to continue? Just keep going as the missionary."`,
    ].join("\n");
  }

  const dialectNote = buildDialectNote(language, missionArea?.name);

  const lines: (string | null)[] = [
    `You are roleplaying as ${investigatorName}, ${payload.investigatorBackground.split(".")[0].toLowerCase()}.`,
    ``,
    `CHARACTER:`,
    investigatorBackground,
    ``,
    `OPENING (first message of this conversation):`,
    openingSetup,
    ``,
    `LANGUAGE RULES:`,
    `- Respond ONLY in ${language}. Never use English.`,
    dialectNote ? `- ${dialectNote}` : null,
    `- The missionary speaking to you is at ${level} level. Speak naturally — do not oversimplify, but don't use such obscure vocabulary that they're completely lost.`,
    `- Keep your responses 2-4 sentences. This is a real conversation, not a lecture.`,
    `- React authentically: if they make a cultural misstep, respond how a real person from your background would. If they say something genuinely moving or true, let yourself be genuinely touched.`,
    `- If the missionary makes a significant grammar error, you can naturally ask a clarifying question ("¿Cómo dijiste?") — this is what a real person would do.`,
    ``,
    missionArea ? `CULTURAL CONTEXT:` : null,
    missionArea?.cultureNote
      ? `You live in the ${missionArea.name} area (${missionArea.region ?? ""}). ${missionArea.cultureNote}`
      : null,
    ``,
    `IMPORTANT CONSTRAINTS:`,
    `- Stay fully in character at all times.`,
    `- Raise your character's natural objections and concerns when the topic calls for them.`,
    `- Do NOT make it artificially easy — authentic resistance is what makes practice valuable.`,
    `- Do NOT break character or explain how missionary discussions work. You are the investigator.`,
    `- Do NOT use any English words, asterisks, or stage directions like "*pauses*".`,
  ];

  return lines.filter(Boolean).join("\n");
}

function anthropicStreamToSSE(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = `data: ${JSON.stringify({
              choices: [{ delta: { content: event.delta.text } }],
            })}\n\n`;
            controller.enqueue(enc.encode(chunk));
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });
}

export const Route = createFileRoute("/api/field-prep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof BodySchema>;
        try {
          payload = BodySchema.parse(await request.json());
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Invalid input" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const KEY = process.env.ANTHROPIC_API_KEY;
        if (!KEY) {
          return new Response(JSON.stringify({ error: "AI is not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const client = new Anthropic({ apiKey: KEY });
        const systemPrompt = buildSystemPrompt(payload);

        // If no messages yet, seed with the scenario start signal so the AI opens first
        const messages: { role: "user" | "assistant"; content: string }[] =
          payload.messages.length === 0
            ? [
                {
                  role: "user",
                  content:
                    "[SCENARIO START: The missionary has just arrived. Begin the conversation as described in your opening setup. Speak your opening line now as your character.]",
                },
              ]
            : payload.messages.map((m) => ({ role: m.role, content: m.content }));

        try {
          const stream = await client.messages.create({
            model: "claude-sonnet-5-5",
            max_tokens: 700,
            system: systemPrompt,
            messages,
            stream: true,
          });

          return new Response(anthropicStreamToSSE(stream), {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        } catch (e) {
          Sentry.captureException(e);
          return new Response(JSON.stringify({ error: "AI request failed." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
