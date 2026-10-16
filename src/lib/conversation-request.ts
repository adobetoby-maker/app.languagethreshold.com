import { isStrictSameOrigin } from "./speaking-security.ts";
import { checkLearningGenerationBudget } from "./learning-generation-security.ts";

export const MAX_CONVERSATION_BODY_BYTES = 96 * 1024;
class BodyLimitError extends Error {}
export class ConversationRequestError extends Error {
  readonly status: 400 | 409;
  constructor(message: string, status: 400 | 409 = 400) {
    super(message);
    this.status = status;
  }
}
function errorResponse(error: string, status: number, retryAfter?: number) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}
async function boundedJson(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_CONVERSATION_BODY_BYTES)
    throw new BodyLimitError();
  if (!request.body) throw Error("Empty body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CONVERSATION_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new BodyLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}
/** Origin and byte bounds precede parsing; malformed requests never spend a model budget. */
export async function prepareConversationRequest<T>(
  request: Request,
  schema: { parse(value: unknown): T },
): Promise<{ data: T; response?: never } | { response: Response; data?: never }> {
  if (!isStrictSameOrigin(request))
    return { response: errorResponse("Open the app to use AI conversation.", 403) };
  let data: T;
  try {
    data = schema.parse(await boundedJson(request));
  } catch (cause) {
    return {
      response:
        cause instanceof ConversationRequestError
          ? errorResponse(cause.message, cause.status)
          : cause instanceof BodyLimitError
            ? errorResponse(
                "This conversation request is too large. Shorten your message or start a new thread.",
                413,
              )
            : errorResponse("Check your message and try again.", 400),
    };
  }
  const denied = await checkLearningGenerationBudget(request, "conversation");
  if (denied)
    return {
      response: errorResponse(
        denied.status === 429
          ? denied.retryAfter === 60
            ? "Too many AI messages. Wait a minute before trying again."
            : "AI conversation has reached its hourly limit. Your messages are kept; try again next hour."
          : "AI conversation is temporarily unavailable. Your messages are kept; try again shortly.",
        denied.status,
        denied.retryAfter,
      ),
    };
  return { data };
}
