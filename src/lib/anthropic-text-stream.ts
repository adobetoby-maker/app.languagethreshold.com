import type Anthropic from "@anthropic-ai/sdk";
import { usageReceipt } from "./usage-cost.ts";
/** Preserve text deltas; append content-free usage before DONE on complete streams. */
export function anthropicTextStream(
  stream: AsyncIterable<Anthropic.MessageStreamEvent> & { controller?: AbortController },
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let cancelled = false;
  return new ReadableStream({
    async start(controller) {
      let message: Pick<Anthropic.Message, "model" | "usage"> | null = null;
      let complete = false;
      try {
        for await (const event of stream) {
          if (cancelled) return;
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
        if (cancelled) return;
        if (!complete) throw new Error("Incomplete provider stream");
        if (message)
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({ choices: [], metering: usageReceipt(message) })}\n\n`,
            ),
          );
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        // SDK exceptions may contain provider payloads; expose only a fixed error.
        if (!cancelled) controller.error(new Error("AI response interrupted. Please try again."));
      }
    },
    cancel() {
      cancelled = true;
      stream.controller?.abort();
    },
  });
}
