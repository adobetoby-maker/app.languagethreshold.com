import { TeamOperationError, type TeamDb } from "./team-server";

export type DocumentAccess = {
  canManageDocuments: boolean;
  teamManaged: boolean;
  assignedDocumentIds: Set<string>;
};

export async function documentAccessForUser(db: TeamDb, userId: string): Promise<DocumentAccess> {
  const memberships = await db
    .from("team_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "active");
  if (memberships.error)
    throw new TeamOperationError("Document access is temporarily unavailable.", 503);

  const active = memberships.data ?? [];
  const learnerOrganizations = active
    .filter((membership) => membership.role === "learner")
    .map((membership) => membership.organization_id);
  const isTeamAdmin = active.some(
    (membership) => membership.role === "owner" || membership.role === "admin",
  );

  if (!learnerOrganizations.length) {
    return {
      canManageDocuments: true,
      teamManaged: active.length > 0,
      assignedDocumentIds: new Set(),
    };
  }

  const [grants, assignments] = await Promise.all([
    db
      .from("team_document_access_grants")
      .select("organization_id")
      .eq("user_id", userId)
      .in("organization_id", learnerOrganizations),
    db
      .from("team_document_assignments")
      .select("document_id")
      .eq("user_id", userId)
      .in("organization_id", learnerOrganizations),
  ]);
  if (grants.error || assignments.error)
    throw new TeamOperationError("Document access is temporarily unavailable.", 503);

  return {
    canManageDocuments: isTeamAdmin || (grants.data?.length ?? 0) > 0,
    teamManaged: true,
    assignedDocumentIds: new Set((assignments.data ?? []).map((row) => row.document_id)),
  };
}

export async function requireDocumentReadAccess(
  db: TeamDb,
  userId: string,
  documentId: string,
  access: DocumentAccess,
) {
  if (access.assignedDocumentIds.has(documentId)) return;
  if (!access.canManageDocuments)
    throw new TeamOperationError("This document has not been assigned to you.", 403);
  const owned = await db
    .from("study_documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .eq("state", "ready")
    .maybeSingle();
  if (owned.error) throw new TeamOperationError("Document access is temporarily unavailable.", 503);
  if (!owned.data) throw new TeamOperationError("Document not found.", 404);
}

export function requireDocumentManagement(access: DocumentAccess) {
  if (!access.canManageDocuments)
    throw new TeamOperationError(
      "Your team lead has not enabled the full Documents workspace for your account.",
      403,
    );
}
