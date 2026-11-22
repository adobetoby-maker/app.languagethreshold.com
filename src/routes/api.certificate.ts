import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, teamAdminClient, scopedTeamError } from "@/lib/team-server";

export const Route = createFileRoute("/api/certificate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const parsed = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
          if (!parsed.success)
            return json({ error: "Check the certificate link and try again." }, 400);
          const id = parsed.data;
          const db = teamAdminClient();
          const { data, error } = await db
            .from("team_certificates")
            // "*": target_language / instruction_language exist once the owner applies
            // 20261121120000_team_certificate_language.sql; before that they are simply absent.
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (error) throw error;
          if (!data) return json({ error: "Certificate not found." }, 404);
          const row = data as Record<string, unknown>;
          const certificate = Object.fromEntries(
            [
              "id",
              "learner_name",
              "module_id",
              "version",
              "score",
              "lesson_count",
              "status",
              "issued_at",
              "revoked_at",
              "target_language",
              "instruction_language",
            ]
              .filter((key) => Object.hasOwn(row, key))
              .map((key) => [key, row[key]]),
          );
          return json({ certificate });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
