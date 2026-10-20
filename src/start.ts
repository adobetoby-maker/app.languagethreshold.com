import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { getResponseHeader } from "@tanstack/react-start/server";
import { examsHostEntry, EXAMS_HOST } from "@/lib/exams-host";
import { isPrivateAssessmentUrl } from "@/lib/assessment-privacy";

// Core 60 stage curricula are lazily loaded chunks (src/data/core60-stages.ts). Server code (lesson
// words, exams, team stats, Say it mission lookup) calls getCurriculum() synchronously, so a
// request that reads a stage waits for exactly that stage before its handler runs:
//   - server functions: the stages named in the payload (a lesson's words, a deck, a review);
//   - the exam, team and push routes, which read module ids from the database: every stage;
//   - everything else (pages, assets, auth, tutor, /api/speak, which loads its own scenario's
//     stage itself): nothing, so an unrelated request never waits on stage loading.
// A failed stage load is retried by a later request (after a short backoff), never remembered.
// Imported dynamically so the client entry chunk does not carry the registry.
const MAX_PAYLOAD_SCAN_BYTES = 1_000_000;

async function payloadTextOf(request: Request): Promise<string> {
  let text = request.url;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length <= MAX_PAYLOAD_SCAN_BYTES) {
      try {
        text += await request.clone().text();
      } catch {
        /* an unreadable body names no stage */
      }
    }
  }
  return text;
}

const core60StageCurricula = createMiddleware().server(async ({ handlerType, request, next }) => {
  const { stageLoadPlan, applyStageLoadPlan } = await import("@/data/core60-stages");
  const pathname = new URL(request.url).pathname;
  const payload = handlerType === "serverFn" ? await payloadTextOf(request) : undefined;
  await applyStageLoadPlan(stageLoadPlan(pathname, handlerType, payload));
  return next();
});

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
    core60StageCurricula,
  ],
}));
