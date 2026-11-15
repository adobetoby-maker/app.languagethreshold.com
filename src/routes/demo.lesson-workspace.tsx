import { createFileRoute } from "@tanstack/react-router";
import { LessonWorkspaceDemo } from "@/components/core30/LessonWorkspaceDemo";

export const Route = createFileRoute("/demo/lesson-workspace")({
  component: LessonWorkspaceDemo,
  head: () => ({
    meta: [
      { title: "Lesson workspace preview · Language Threshold" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Try the focused lesson layout with published sample material. Demo practice stays temporary.",
      },
    ],
  }),
});
