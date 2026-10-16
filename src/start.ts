import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { getResponseHeader } from "@tanstack/react-start/server";

// The installed server-function serializer preserves status but not ALS headers.
// Apply RPC cache/retry policy to the final serialized response instead.
const serverFunctionHeaders = createMiddleware().server(async ({ handlerType, next }) => {
  const result = await next();
  if (handlerType !== "serverFn") return result;
  const headers = new Headers(result.response.headers);
  headers.set("Cache-Control", "no-store");
  const retryAfter = getResponseHeader("Retry-After");
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
