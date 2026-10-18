import { anthropicTextStream } from "@/lib/anthropic-text-stream";
import {
  conversationCallOptions,
  conversationProviderOptions,
  conversationResponseHeaders,
} from "@/lib/conversation-provider";
import { prepareConversationRequest } from "@/lib/conversation-request";
import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { initSentry, Sentry } from "../lib/sentry";
initSentry();

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(3000),
});

const InvestigatorSchema = z.object({
  type: z.enum(["golden", "challenging", "difficult"]),
  name: z.string().min(1).max(80),
  tone: z.string().min(1).max(400),
  questionsPerTopic: z.number().min(1).max(8),
});

const LessonContextSchema = z.object({
  lessonNumber: z.number().min(1).max(5),
  lessonTitle: z.string().min(1).max(80),
  topicTitle: z.string().min(1).max(120),
  topicKeyConcepts: z.array(z.string().min(1).max(60)).max(20),
  questionsAskedOnTopic: z.number().min(0).max(20),
});

const BodySchema = z.object({
  mode: z.enum(["investigator", "companion"]),
  language: z.string().min(1).max(40),
  investigator: InvestigatorSchema,
  lesson: LessonContextSchema,
  missionArea: z
    .object({
      name: z.string().max(120),
      cultureNote: z.string().max(400).optional(),
    })
    .optional(),
  userText: z.string().max(2000).optional(),
  messages: z.array(MessageSchema).min(1).max(40),
});

function investigatorPrompt(p: z.infer<typeof BodySchema>) {
  const { investigator, lesson, language, missionArea } = p;
  const remaining = Math.max(0, investigator.questionsPerTopic - lesson.questionsAskedOnTopic);
  const moveOn = remaining <= 0;
  return [
    `You are roleplaying as ${investigator.name}, a person taking the missionary discussions from The Church of Jesus Christ of Latter-day Saints.`,
    `Personality and tone: ${investigator.tone}`,
    `Always respond in ${language}. Use natural conversational ${language} — no markdown, no lists.`,
    `Stay strictly in character. Never break the fourth wall, never act like an AI, never give a "lesson" yourself — you are the investigator, not the teacher.`,
    missionArea ? `Cultural setting: ${missionArea.name}. ${missionArea.cultureNote ?? ""}` : null,
    ``,
    `CURRENT LESSON: Lesson ${lesson.lessonNumber} — ${lesson.lessonTitle}`,
    `CURRENT TOPIC: "${lesson.topicTitle}"`,
    `Key gospel concepts the missionary is trying to teach you on this topic: ${lesson.topicKeyConcepts.join(", ")}.`,
    ``,
    `RULES OF ENGAGEMENT:`,
    `- You ask roughly ${investigator.questionsPerTopic} sincere questions on each topic before being satisfied.`,
    `- So far on this topic, you have asked ${lesson.questionsAskedOnTopic} question(s); about ${remaining} remain.`,
    moveOn
      ? `- You feel the topic has been covered. Express how you feel about it (in character) and naturally invite them to continue to the next thing.`
      : `- Ask one focused, in-character follow-up question OR react briefly to what the missionary just said. Keep it to 1–3 sentences.`,
    `- If the missionary uses a key gospel term correctly, react authentically (curious, moved, skeptical depending on character).`,
    `- If the missionary speaks vaguely, push back politely and ask for clarification.`,
    `- Never list multiple questions in one turn. One question per turn.`,
    `- Keep answers under 60 words.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function companionPrompt(p: z.infer<typeof BodySchema>) {
  const { investigator, lesson, language } = p;
  return [
    `You are the missionary's companion — a brief, supportive coach.`,
    `After hearing the missionary's last sentence in ${language}, give ONE short tip in English (under 25 words).`,
    `Focus tip on: (a) which key gospel concept they should mention next, (b) a phrasing improvement in ${language}, OR (c) a way to invite the investigator to commit.`,
    `The current investigator is "${investigator.name}" (${investigator.type}). Current topic: "${lesson.topicTitle}".`,
    `Key concepts still useful here: ${lesson.topicKeyConcepts.join(", ")}.`,
    `Output ONLY the tip text — no preamble, no quotes, no markdown.`,
  ].join("\n");
}

// Wraps an Anthropic stream in a ReadableStream emitting OpenAI-compatible SSE
// so existing client parsers (choices[0].delta.content) work without changes.

export const Route = createFileRoute("/api/discussion")({
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

        const client = new Anthropic(conversationProviderOptions(KEY));
        const system =
          payload.mode === "investigator" ? investigatorPrompt(payload) : companionPrompt(payload);

        // Companion mode: single short tip (non-streaming)
        if (payload.mode === "companion") {
          try {
            const response = await client.messages.create(
              {
                model: "claude-haiku-5-5",
                max_tokens: 200,
                thinking: { type: "disabled" },
                system,
                messages: [
                  {
                    role: "user",
                    content: `Missionary just said (in ${payload.language}): "${payload.userText ?? ""}"`,
                  },
                ],
              },
              conversationCallOptions(request),
            );
            const tip =
              response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
            return new Response(JSON.stringify({ tip }), {
              status: 200,
              headers: conversationResponseHeaders("application/json"),
            });
          } catch {
            return new Response(JSON.stringify({ tip: null }), {
              status: 200,
              headers: conversationResponseHeaders("application/json"),
            });
          }
        }

        // Investigator mode: streaming
        try {
          const stream = await client.messages.create(
            {
              model: "claude-haiku-5-5",
              max_tokens: 384,
              thinking: { type: "disabled" },
              system,
              messages: payload.messages,
              stream: true,
            },
            conversationCallOptions(request),
          );

          return new Response(anthropicTextStream(stream), {
            status: 200,
            headers: conversationResponseHeaders("text/event-stream"),
          });
        } catch {
          Sentry.captureException(new Error("discussion provider request failed"));
          return new Response(JSON.stringify({ error: "AI request failed." }), {
            status: 500,
            headers: conversationResponseHeaders("application/json"),
          });
        }
      },
    },
  },
});
