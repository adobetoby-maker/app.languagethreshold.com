export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
export const CONVERSATION_HISTORY_MESSAGES = 20;
export const CONVERSATION_HISTORY_BYTES = 40 * 1024;

/** Preserve local history; send a recent, whole-message context and the full latest turn. */
export function recentConversationMessages(
  messages: readonly ConversationMessage[],
): ConversationMessage[] {
  const encoder = new TextEncoder();
  const result: ConversationMessage[] = [];
  let bytes = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message.content.trim()) continue;
    const size = encoder.encode(message.content).byteLength;
    if (!result.length && size > CONVERSATION_HISTORY_BYTES)
      throw Error("Your message is too long. Shorten it before sending.");
    if (
      bytes + size > CONVERSATION_HISTORY_BYTES ||
      result.length === CONVERSATION_HISTORY_MESSAGES
    )
      break;
    bytes += size;
    result.push({ role: message.role, content: message.content });
  }
  result.reverse();
  // A context window can begin mid-exchange. Start with the next real user turn.
  while (result[0]?.role === "assistant" && result.some((message) => message.role === "user"))
    result.shift();
  return result;
}
