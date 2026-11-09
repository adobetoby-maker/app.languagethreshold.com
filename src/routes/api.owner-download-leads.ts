import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  teamAdminClient,
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  json,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";
export async function ownerDownloadLeads(request: Request) {
  try {
    const db = teamAdminClient(ownerServiceFetch(request.signal), request);
    const actor = await authenticatedTeamUser(request, db);
    await requirePlatformOwner(db, actor);
    const params = new URL(request.url).searchParams;
    const days = [7, 30, 90].includes(Number(params.get("days"))) ? Number(params.get("days")) : 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await db.rpc("owner_download_lead_report", {
      p_since: since,
      p_include_tests: params.get("tests") === "1",
    });
    if (error)
      throw new TeamOperationError(
        "Download lead reporting is unavailable. Please refresh shortly.",
        503,
      );
    requireCurrentTeamRequest(db);
    return json(data);
  } catch (error) {
    return scopedTeamError(error);
  }
}
export const Route = createFileRoute("/api/owner-download-leads")({
  server: { handlers: { GET: ({ request }) => ownerDownloadLeads(request) } },
});
