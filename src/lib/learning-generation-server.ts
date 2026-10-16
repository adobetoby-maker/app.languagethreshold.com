import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { checkLearningGenerationBudget } from "./learning-generation-security";

/** Used inside the actual paid handlers, before constructing any model request. */
export async function learningGenerationError(): Promise<string | null> {
  setResponseHeader("Cache-Control", "no-store");
  const denial = await checkLearningGenerationBudget(getRequest());
  if (!denial) return null;
  setResponseStatus(denial.status);
  if (denial.retryAfter) setResponseHeader("Retry-After", String(denial.retryAfter));
  return denial.error;
}
