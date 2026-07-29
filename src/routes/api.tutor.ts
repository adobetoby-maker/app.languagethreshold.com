import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { initSentry, Sentry } from "../lib/sentry";
initSentry();

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const ModuleSchema = z
  .object({
    id: z.string().max(60),
    name: z.string().max(120),
    userRole: z.string().max(120).optional(),
    aiPersona: z.string().max(800).optional(),
    learnDirection: z.enum(["en-target"]).optional(),
    missionArea: z
      .object({
        name: z.string().max(120),
        region: z.string().max(80).optional(),
        languages: z.array(z.string().max(40)).max(12).optional(),
        cultureNote: z.string().max(400).optional(),
      })
      .optional(),
    orthoArea: z
      .object({
        name: z.string().max(120),
        counterpart: z.string().max(200).optional(),
        learnerRole: z.string().max(120).optional(),
        toneNote: z.string().max(400).optional(),
        vocab: z.array(z.string().max(60)).max(20).optional(),
      })
      .optional(),
    moduleArea: z
      .object({
        name: z.string().max(120),
        counterpart: z.string().max(200).optional(),
        learnerRole: z.string().max(120).optional(),
        toneNote: z.string().max(400).optional(),
        vocab: z.array(z.string().max(60)).max(20).optional(),
        phrases: z.array(z.string().max(200)).max(10).optional(),
        sampleExchange: z.string().max(1200).optional(),
      })
      .optional(),
  })
  .optional();

// Exported so the approved Reader→Tutor contract can be certified offline by
// unit test, without calling a live model. See tests/tutor-reader-context.test.mjs.
export const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: z.object({
    language: z.string().min(1).max(40),
    level: z.string().min(1).max(40),
    nativeLanguage: z.string().max(40).optional(),
    textTitle: z.string().max(200).optional(),
    passage: z.string().max(2000).optional(),
    lastWord: z.string().max(80).optional(),
    selectedWord: z.string().max(80).optional(),
    selectedSentence: z.string().max(1200).optional(),
    wordExplanation: z.string().max(1600).optional(),
    readerContext: z
      .object({
        bookId: z.string().max(120).optional(),
        editionId: z.string().max(160).optional(),
        pageId: z.string().max(160).optional(),
        sentenceId: z.string().max(180).optional(),
        occurrenceIndex: z.number().int().nonnegative().max(100).optional(),
        selectedWord: z.string().min(1).max(120),
        sentence: z.string().min(1).max(2000),
        passageExcerpt: z.string().max(2000).optional(),
        textTitle: z.string().max(200).optional(),
        language: z.string().min(1).max(40),
        learnerLevel: z.string().max(40).optional(),
        explanation: z.string().max(1600).optional(),
      })
      .optional(),
    module: ModuleSchema,
    userVocabWords: z.array(z.string().max(80)).max(15).optional(),
    activePatterns: z
      .array(z.object({ name: z.string().max(80), pattern: z.string().max(200) }))
      .max(8)
      .optional(),
  }),
});

function buildModuleAddendum(mod: NonNullable<z.infer<typeof BodySchema>["context"]["module"]>) {
  const lines: (string | null)[] = [
    ``,
    `ACTIVE MODULE: ${mod.name}`,
    mod.userRole ? `- Learner role: ${mod.userRole}` : null,
    mod.aiPersona ? `- Persona guidance: ${mod.aiPersona}` : null,
  ];

  if (mod.id === "lds-missionary") {
    lines.push(
      `- You are also a knowledgeable consultant on The Church of Jesus Christ of Latter-day Saints. Speak with respectful familiarity about Preach My Gospel (2023), the General Handbook, the Book of Mormon, the Doctrine and Covenants, the Pearl of Great Price, and General Conference talks — all freely available at churchofjesuschrist.org and in the Gospel Library app.`,
      `- When teaching missionary phrases, prefer the wording a returned missionary would actually use in the field, including reverent terminology (e.g. "Heavenly Father", "Atonement", "the Restoration"). Always show the target-language translation first, then a short English gloss.`,
      `- For commitment invitations ("Will you…?"), preserve the invitation grammar (modal + sincere tone) of the target language.`,
      `- Never invent doctrine. If a question is unclear, point the learner to the relevant chapter of Preach My Gospel or the General Handbook.`,
      `- Be respectful of investigators of every background; teach by the Spirit, with love.`,
    );
    if (mod.missionArea) {
      lines.push(
        `- Mission assignment: ${mod.missionArea.name}${
          mod.missionArea.region ? ` (${mod.missionArea.region})` : ""
        }.`,
        mod.missionArea.languages?.length
          ? `- Primary teaching languages in that area: ${mod.missionArea.languages.join(", ")}.`
          : null,
        mod.missionArea.cultureNote
          ? `- Cultural note for this area: ${mod.missionArea.cultureNote}`
          : null,
        `- Tailor pronunciation, register, and example scenarios to this mission area.`,
      );
    }
  }

  if (mod.id === "orthopedics") {
    lines.push(
      `- You are an experienced clinical-language coach for orthopedic surgeons. Use accurate medical terminology in the target language and natural register for the setting.`,
      `- Always show the target-language phrase first, then a short English gloss in parentheses.`,
      `- When the learner asks to roleplay, stay in character as the counterpart described below until the learner ends the scene.`,
      `- Keep ER/OR/Trauma exchanges short and clinical; keep clinic and oncology exchanges warmer and slower.`,
      `- Never give real medical advice — this is language practice only.`,
    );
    if (mod.orthoArea) {
      lines.push(
        `- Current scenario area: ${mod.orthoArea.name}.`,
        mod.orthoArea.learnerRole ? `- Learner is playing: ${mod.orthoArea.learnerRole}.` : null,
        mod.orthoArea.counterpart ? `- You are playing: ${mod.orthoArea.counterpart}.` : null,
        mod.orthoArea.toneNote ? `- Tone for this area: ${mod.orthoArea.toneNote}` : null,
        mod.orthoArea.vocab?.length
          ? `- Lean on this vocabulary when natural: ${mod.orthoArea.vocab.join(", ")}.`
          : null,
      );
    }
  }

  if (mod.moduleArea) {
    lines.push(
      ``,
      `SCENARIO AREA: ${mod.moduleArea.name}`,
      mod.moduleArea.learnerRole ? `- Learner is playing: ${mod.moduleArea.learnerRole}.` : null,
      mod.moduleArea.counterpart ? `- You are playing: ${mod.moduleArea.counterpart}.` : null,
      mod.moduleArea.toneNote ? `- Register and tone: ${mod.moduleArea.toneNote}` : null,
      mod.moduleArea.vocab?.length
        ? `- Key vocabulary for this scenario (use naturally): ${mod.moduleArea.vocab.join(", ")}.`
        : null,
      mod.moduleArea.phrases?.length
        ? `- Example phrases the learner wants to practice:\n  • ${mod.moduleArea.phrases.join("\n  • ")}`
        : null,
      mod.moduleArea.sampleExchange
        ? `- Sample exchange in this scenario:\n${mod.moduleArea.sampleExchange}`
        : null,
    );
  }

  return lines.filter(Boolean).join("\n");
}

export function buildSystemPrompt(ctx: z.infer<typeof BodySchema>["context"]) {
  const isEnTarget = ctx.module?.learnDirection === "en-target";
  const native = ctx.nativeLanguage ?? "Spanish";

  const base = isEnTarget
    ? [
        `You are a warm, patient English-language coach helping a ${native}-speaking professional succeed in a US workplace.`,
        `Your learner's native language is ${native}. English is the language they are working to master for their job.`,
        `Your role: help them produce clear, professional American English for their specific work context.`,
        `When correcting errors, be specific and encouraging — show the correct English form, then briefly explain why it sounds more natural.`,
        `You may use ${native} briefly when a concept is genuinely hard to explain in English alone, but default to English for all coaching.`,
        `Use Markdown for emphasis. Keep responses focused — usually 2–4 short paragraphs.`,
        ``,
        `LEARNER CONTEXT:`,
        `- Native language: ${native}`,
        `- Target language: English`,
        `- Proficiency level: ${ctx.level}`,
      ]
    : [
        `You are a warm, expert linguist and cultural ambassador for ${ctx.language}.`,
        `You have deep knowledge of grammar, literature, and the cultures of countries where ${ctx.language} is spoken.`,
        `Answer questions clearly and encouragingly. When relevant, explain grammar in the context of the text the learner is reading.`,
        `Use Markdown for emphasis. Keep responses focused — usually 2–4 short paragraphs.`,
        ctx.language === "Japanese"
          ? `CRITICAL: When writing ANY Japanese text, wrap every kanji (and kanji compounds) in HTML ruby tags so the learner can read it. Format: <ruby>食べる<rt>たべる</rt></ruby>. Apply this to EVERY kanji-containing word in your response without exception. Pure kana words do not need ruby tags.`
          : null,
        ``,
        `LEARNER CONTEXT:`,
        `- Target language: ${ctx.language}`,
        `- CEFR level: ${ctx.level}`,
        ctx.textTitle ? `- Currently reading: "${ctx.textTitle}"` : null,
        ctx.selectedWord
          ? `- Selected word from the Reader: "${ctx.selectedWord}"`
          : ctx.lastWord
            ? `- Last word the learner looked up: "${ctx.lastWord}"`
            : null,
        ctx.selectedSentence
          ? `- Full sentence containing the selected word:\n"""\n${ctx.selectedSentence}\n"""`
          : null,
        ctx.wordExplanation
          ? `- Word Card explanation already shown to the learner:\n${ctx.wordExplanation}`
          : null,
        ctx.readerContext
          ? [
              ctx.readerContext.bookId ? `- Book ID: "${ctx.readerContext.bookId}"` : null,
              ctx.readerContext.editionId ? `- Edition ID: "${ctx.readerContext.editionId}"` : null,
              ctx.readerContext.pageId ? `- Page ID: "${ctx.readerContext.pageId}"` : null,
              ctx.readerContext.sentenceId
                ? `- Sentence ID: "${ctx.readerContext.sentenceId}"`
                : null,
              ctx.readerContext.occurrenceIndex !== undefined
                ? `- Word occurrence index: ${ctx.readerContext.occurrenceIndex}`
                : null,
              `- Reader-selected word: "${ctx.readerContext.selectedWord}"`,
              `- Exact sentence: "${ctx.readerContext.sentence}"`,
              ctx.readerContext.textTitle
                ? `- Selection source: "${ctx.readerContext.textTitle}"`
                : null,
              ctx.readerContext.explanation
                ? `- Existing Word Card explanation: ${ctx.readerContext.explanation}`
                : null,
              ctx.readerContext.passageExcerpt
                ? `- Surrounding passage excerpt:\n"""\n${ctx.readerContext.passageExcerpt.slice(0, 1200)}\n"""`
                : null,
              ctx.readerContext.learnerLevel
                ? `- Learner level when selected: ${ctx.readerContext.learnerLevel}`
                : null,
              `- Treat the selected sentence as the primary context for the learner's question.`,
            ]
              .filter(Boolean)
              .join("\n")
          : null,
        ctx.passage
          ? `- Snippet of current passage:\n"""\n${ctx.passage.slice(0, 1200)}\n"""`
          : null,
        ctx.userVocabWords?.length
          ? `- Learner's personal vocabulary (weave these naturally into examples when relevant): ${ctx.userVocabWords.join(", ")}`
          : null,
        ctx.activePatterns?.length
          ? `- Grammar patterns they're actively drilling — reinforce these:\n${ctx.activePatterns.map((p) => `  • ${p.name}: ${p.pattern}`).join("\n")}`
          : null,
      ];

  const baseStr = base.filter(Boolean).join("\n");
  return ctx.module ? `${baseStr}\n${buildModuleAddendum(ctx.module)}` : baseStr;
}

// Wraps an Anthropic stream in a ReadableStream emitting OpenAI-compatible SSE
// so existing client parsers (choices[0].delta.content) work without changes.
function anthropicStreamToSSE(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`;
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

export const Route = createFileRoute("/api/tutor")({
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
        const system = buildSystemPrompt(payload.context);

        try {
          const stream = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
            system,
            messages: payload.messages,
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
          console.error("Tutor stream error:", e);
          return new Response(JSON.stringify({ error: "AI request failed." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
