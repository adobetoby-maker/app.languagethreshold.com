import { isStrictSameOrigin } from "./speaking-security.ts";
import { checkLearningGenerationBudget } from "./learning-generation-security.ts";

export const MAX_CONVERSATION_BODY_BYTES = 96 * 1024;
import { readPrivateJson, PrivateJsonRequestError } from "./private-json-request.ts";
import { withSpeechPreflight, SpeechPreflightError } from "./speech-preflight.ts";
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
        "Cache-Control": "private, no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}
/** Origin and byte bounds precede parsing; malformed requests never spend a model budget. */
export async function prepareConversationRequest<T>(
  request: Request,
  schema: { parse(value: unknown): T | Promise<T> },
): Promise<{ data: T; response?: never } | { response: Response; data?: never }> {
  if (!isStrictSameOrigin(request))
    return { response: errorResponse("Open the app to use AI conversation.", 403) };
  let data: T;
  try {
    data = await schema.parse(await readPrivateJson(request, MAX_CONVERSATION_BODY_BYTES));
  } catch (cause) {
    return {
      response:
        cause instanceof ConversationRequestError
          ? errorResponse(cause.message, cause.status)
          : cause instanceof PrivateJsonRequestError
            ? errorResponse(
                cause.status === 413
                  ? "This conversation request is too large. Shorten your message or start a new thread."
                  : cause.status === 408
                    ? "The conversation upload took too long. Please try again."
                    : cause.status === 499
                      ? "Conversation request cancelled."
                      : "Check your message and try again.",
                cause.status,
              )
            : errorResponse("Check your message and try again.", 400),
    };
  }
  let denied: Awaited<ReturnType<typeof checkLearningGenerationBudget>>;
  try {
    denied = await withSpeechPreflight(request, (signal) =>
      checkLearningGenerationBudget(request, "conversation", signal),
    );
    if (request.signal.aborted)
      return { response: errorResponse("Conversation request cancelled.", 499) };
  } catch (error) {
    const status = error instanceof SpeechPreflightError ? error.status : 503;
    return {
      response: errorResponse(
        status === 499
          ? "Conversation request cancelled."
          : "AI conversation is temporarily unavailable. Your messages are kept; try again shortly.",
        status,
        status === 503 ? 60 : undefined,
      ),
    };
  }
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
