import { createFileRoute } from "@tanstack/react-router";

/** The client email gate is disabled; its legacy endpoint must not collect contacts. */
export const Route = createFileRoute("/api/capture-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // No parsing, credentials, contact/signup writes or raw diagnostics.
        void request.body?.cancel().catch(() => {});
        return Response.json(
          { ok: false, error: "Email capture is currently unavailable." },
          {
            status: 410,
            headers: {
              "Cache-Control": "private, no-store",
              "CDN-Cache-Control": "no-store",
              "Vercel-CDN-Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      },
    },
  },
});
