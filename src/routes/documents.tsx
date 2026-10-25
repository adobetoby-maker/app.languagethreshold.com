import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/state/auth-state";
import { AppProvider } from "@/state/app-state";
import { NotesProvider } from "@/state/notes-state";
import { DocumentWorkspace } from "@/components/documents/DocumentWorkspace";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "My Documents · Language Threshold" },
      {
        name: "description",
        content:
          "Read your work documents in two languages. Add a document, translate it side by side, and keep notes for your next shift.",
      },
    ],
  }),
  component: () => (
    <AuthProvider>
      <AppProvider>
        <NotesProvider>
          <DocumentWorkspace />
        </NotesProvider>
      </AppProvider>
    </AuthProvider>
  ),
});
