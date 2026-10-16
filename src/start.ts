import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { getResponseHeader } from "@tanstack/react-start/server";
import { isPrivateAssessmentUrl } from "@/lib/assessment-privacy";

// The installed server-function serializer preserves status but not ALS headers.
// Apply RPC cache/retry policy to the final serialized response instead.
const serverFunctionHeaders = createMiddleware().server(async ({ handlerType, request, next }) => {
  const result = await next();
  const privatePage = handlerType === "router" && isPrivateAssessmentUrl(request.url);
  if (handlerType !== "serverFn" && !privatePage) return result;
  const headers = new Headers(result.response.headers);
  headers.set("Cache-Control", "no-store");
  if (privatePage) {
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  const retryAfter = handlerType === "serverFn" ? getResponseHeader("Retry-After") : undefined;
  if (retryAfter && [429, 503].includes(result.response.status)) {
    headers.set("Retry-After", String(retryAfter));
  }
  return {
    ...result,
    response: new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }),
  };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    serverFunctionHeaders,
    // Preserve the exact framework default when supplying our own Start entry.
    createCsrfMiddleware({ filter: ({ handlerType }) => handlerType === "serverFn" }),
  ],
}));
