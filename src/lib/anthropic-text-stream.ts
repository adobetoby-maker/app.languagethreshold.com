import type Anthropic from "@anthropic-ai/sdk";
import { usageReceipt } from "./usage-cost.ts";
/** Preserve text deltas; append content-free usage before DONE on complete streams. */
export function anthropicTextStream(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let message: Pick<Anthropic.Message, "model" | "usage"> | null = null;
      let complete = false;
      try {
        for await (const event of stream) {
          if (event.type === "message_start")
            message = { model: event.message.model, usage: event.message.usage };
          if (event.type === "message_delta" && message)
            message.usage = {
              ...message.usage,
              ...(Object.fromEntries(
                Object.entries(event.usage).filter(([, value]) => value != null),
              ) as Partial<Anthropic.Message["usage"]>),
            };
          if (event.type === "message_stop") complete = true;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`,
              ),
            );
          }
        }
        if (complete && message)
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({ choices: [], metering: usageReceipt(message) })}\n\n`,
            ),
          );
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });
}
