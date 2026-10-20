import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { getResponseHeader } from "@tanstack/react-start/server";
import { examsHostEntry, EXAMS_HOST } from "@/lib/exams-host";
import { isPrivateAssessmentUrl } from "@/lib/assessment-privacy";

// Core 60 stage curricula (src/data/core60-stages.ts) are lazily loaded chunks. No middleware
// loads them: this file never reads a request body, and an unrelated request never waits on a
// stage. Every server code path that reads a curriculum calls ensureStageForModule(moduleId)
// itself first (docs/core60-architecture.md, "Loading").

// The installed server-function serializer preserves status but not ALS headers.
// Apply RPC cache/retry policy to the final serialized response instead.
const serverFunctionHeaders = createMiddleware().server(async ({ handlerType, request, next }) => {
  const companionEntry = examsHostEntry(request.url, request.method);
  if (companionEntry)
    return new Response(null, {
      status: 307,
      headers: {
        Location: companionEntry,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  const result = await next();
  const privatePage = handlerType === "router" && isPrivateAssessmentUrl(request.url);
  const companion = new URL(request.url).hostname === EXAMS_HOST;
  if (handlerType !== "serverFn" && !privatePage && !companion) return result;
  const headers = new Headers(result.response.headers);
  headers.set("Cache-Control", "no-store");
  if (privatePage || companion) {
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
