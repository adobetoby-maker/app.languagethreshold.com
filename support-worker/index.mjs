import legacy from "./legacy-worker.mjs";
import { inboxRequest, isLanguageThreshold, receiveSupport } from "./inbox.mjs";

export default {
  async email(message, env, ctx) {
    if (isLanguageThreshold(message.to || "")) return receiveSupport(message, env);
    return legacy.email(message, env, ctx);
  },
  fetch: inboxRequest,
};
