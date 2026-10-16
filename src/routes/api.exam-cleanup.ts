import { createFileRoute } from "@tanstack/react-router";
import { handleCleanup } from "@/lib/assessments/cleanup-schedule-server";
export const Route = createFileRoute("/api/exam-cleanup")({
  server: { handlers: { GET: ({ request }) => handleCleanup(request) } },
});
