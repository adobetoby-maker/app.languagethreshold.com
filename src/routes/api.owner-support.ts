import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson, MAX_TEAM_WORKFLOW_BYTES } from "@/lib/team-request";
import { supportAction, supportId } from "@/lib/owner-support";
import {
  supportDetail,
  supportPage,
  supportReady,
  supportRequest,
  sendSupportReply,
} from "@/lib/owner-support-server";
import {
  authenticatedTeamUser,
  requirePlatformOwner,
  requireCurrentTeamRequest,
  teamAdminClient,
  json,
  scopedTeamError,
  audit,
} from "@/lib/team-server";

export const Route = createFileRoute("/api/owner-support")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          requireCurrentTeamRequest(db);
          if (!supportReady()) return json({ configured: false, tickets: [], nextCursor: null });
          const params = new URL(request.url).searchParams;
          const id = params.get("id");
          const cursor = params.get("cursor");
          if (cursor && cursor.length > 1500) return json({ error: "Invalid support page." }, 400);
          const result = id
            ? { ticket: await supportDetail(supportId.parse(id), request.signal) }
            : await supportPage(cursor, request.signal);
          requireCurrentTeamRequest(db);
          await audit(db, actor.id, "support.inbox_view");
          return json({ configured: true, ...result });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, supportAction, MAX_TEAM_WORKFLOW_BYTES);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          requireCurrentTeamRequest(db);
          const body = prepared.data;
          const ticket = await supportDetail(body.id, request.signal);
          requireCurrentTeamRequest(db);
          if (body.action === "status") {
            await audit(db, actor.id, "support.status_requested", undefined, {
              ticketId: body.id,
              status: body.status,
            });
            return json(
              await supportRequest(`/tickets/${body.id}`, request.signal, { status: body.status }),
            );
          }
          await audit(db, actor.id, "support.reply_requested", undefined, {
            ticketId: body.id,
            requestId: body.requestId,
          });
          requireCurrentTeamRequest(db);
          return json(await sendSupportReply(ticket, body.text, body.requestId, request.signal));
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
