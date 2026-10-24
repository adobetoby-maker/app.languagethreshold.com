import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import {
  ConfirmAction,
  OwnerMessage,
  ownerButton,
  ownerField,
  ownerPanel,
  ownerPrimary,
} from "./owner-ui";
import { ownerDate } from "@/lib/owner-format";
import type { OwnerTeamDetail, OwnerTeamMember, OwnerTeamResult } from "@/lib/owner-teams";

const ROLES = ["owner", "admin", "learner"] as const;

/** Platform-owner view of one company's team with member, invitation and assignment actions. */
export function OwnerTeamManager({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const team = useOwnerResource<OwnerTeamDetail>(
    `/api/owner-teams?org=${encodeURIComponent(orgId)}`,
  );
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [inviteUrl, setInviteUrl] = useState("");
  if (!team.allowed) return null;
  async function act(body: Record<string, unknown>) {
    setNotice("");
    setError("");
    setInviteUrl("");
    try {
      const result = await team.run<OwnerTeamResult>({ orgId, ...body });
      if (result) {
        setNotice([result.notice, result.warning].filter(Boolean).join(" "));
        setInviteUrl(result.inviteUrl ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm this change. Refresh first.");
    }
  }
  const data = team.data;
  const readOnly = !!data?.complimentary;
  return (
    <section
      className={ownerPanel + " border-gold/50"}
      aria-labelledby="owner-team-title"
      data-testid="owner-team-manager"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="owner-team-title" className="break-words text-xl font-semibold">
            {data?.organization.name ?? "Company team"}
          </h2>
          {data && (
            <p className="break-all text-sm text-muted-foreground">
              Billing {data.organization.billing_email} · created{" "}
              {ownerDate(data.organization.created_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className={ownerButton} onClick={team.refresh} disabled={team.busy}>
            Reload team
          </button>
          <button type="button" className={ownerButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <OwnerMessage error={error || team.error} notice={notice} />
      {inviteUrl && (
        <label className="my-2 block rounded-lg border border-amber-500/50 p-3 text-sm">
          Invitation link (share only with the invited person)
          <input
            readOnly
            className={ownerField + " mt-1"}
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
      {team.loading && <p role="status">Loading team…</p>}
      {data && (
        <div className="mt-3 space-y-5">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-border px-3 py-1">
              Plan: {data.entitlement?.status ?? "none"}
              {data.entitlement?.term ? ` · ${data.entitlement.term}` : ""}
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              Seats: {data.entitlement?.seat_limit ?? 0} · learners{" "}
              {data.members.filter((m) => m.role === "learner" && m.status === "active").length}
            </span>
            {data.entitlement?.period_end && (
              <span className="rounded-full border border-border px-3 py-1">
                Through {new Date(data.entitlement.period_end).toLocaleDateString()}
              </span>
            )}
            {data.entitlement?.stripeManaged ? (
              <span className="rounded-full border border-gold/60 px-3 py-1 text-gold-ink dark:text-gold">
                Seats managed in Stripe
              </span>
            ) : (
              <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
                Seats: use Manual grant in the table above
              </span>
            )}
          </div>
          {readOnly && (
            <p className="rounded-lg border border-amber-500/50 p-3 text-sm">
              This is a complimentary-access workspace for one person. Manage it from the Users tab
              (Free access); team changes are disabled here.
            </p>
          )}
          <div>
            <h3 className="font-semibold">Members</h3>
            <ul className="mt-2 grid gap-3 lg:grid-cols-2">
              {data.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  data={data}
                  busy={team.busy || readOnly}
                  act={act}
                />
              ))}
            </ul>
            {data.members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members.</p>
            )}
          </div>
          <AssignForm data={data} busy={team.busy || readOnly} act={act} />
          <div>
            <h3 className="font-semibold">Invitations</h3>
            <ul className="mt-2 space-y-2">
              {data.invitations.map((invitation) => (
                <li key={invitation.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 break-all">
                      <strong>{invitation.display_name}</strong> · {invitation.email}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {invitation.role} · {invitation.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires {ownerDate(invitation.expires_at)} · last sent{" "}
                    {ownerDate(invitation.sent_at)}
                    {invitation.last_email_error ? ` · ${invitation.last_email_error}` : ""}
                  </p>
                  {invitation.status === "pending" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={ownerButton}
                        disabled={team.busy || readOnly}
                        onClick={() =>
                          void act({
                            action: "resend_invite",
                            invitationId: invitation.id,
                            delivery: "manual",
                          })
                        }
                      >
                        New invitation link
                      </button>
                      {data.emailEnabled && (
                        <button
                          type="button"
                          className={ownerButton}
                          disabled={team.busy || readOnly}
                          onClick={() =>
                            void act({
                              action: "resend_invite",
                              invitationId: invitation.id,
                              delivery: "email",
                            })
                          }
                        >
                          Resend email
                        </button>
                      )}
                      <ConfirmAction
                        label="Revoke invitation"
                        destructive
                        disabled={team.busy || readOnly}
                        description={`The link sent to ${invitation.email} stops working.`}
                        onConfirm={() =>
                          act({ action: "revoke_invite", invitationId: invitation.id })
                        }
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {data.invitations.length === 0 && (
              <p className="text-sm text-muted-foreground">No invitations.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MemberCard({
  member,
  data,
  busy,
  act,
}: {
  member: OwnerTeamMember;
  data: OwnerTeamDetail;
  busy: boolean;
  act: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [role, setRole] = useState(member.role);
  const isAccountOwner = member.user_id === data.organization.owner_user_id;
  const modules = data.assignments
    .filter((a) => a.user_id === member.user_id)
    .map((a) => data.modules.find((m) => m.id === a.module_id)?.name ?? a.module_id);
  const active = member.status === "active";
  return (
    <li className="min-w-0 rounded-xl border border-border p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="break-words">{member.display_name}</strong>
        <span className="text-xs capitalize text-muted-foreground">
          {member.role}
          {isAccountOwner ? " · account owner" : ""} · {member.status}
        </span>
      </div>
      <p className="break-all text-xs text-muted-foreground">
        {member.email ?? "Email not loaded"}
      </p>
      {modules.length > 0 && <p className="mt-1 text-xs">Assigned: {modules.join(", ")}</p>}
      {active && (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <label className="text-xs">
            Role
            <select
              className={ownerField + " mt-0.5 py-1.5"}
              value={role}
              disabled={busy || isAccountOwner}
              onChange={(e) => setRole(e.target.value as OwnerTeamMember["role"])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {role !== member.role && (
            <ConfirmAction
              label="Change role"
              disabled={busy}
              description={`${member.display_name} becomes ${role}. A learner uses a paid seat; owners and admins manage the company.`}
              onConfirm={() => act({ action: "change_role", memberId: member.id, role })}
            />
          )}
          {!isAccountOwner && (
            <>
              <ConfirmAction
                label="Remove from company"
                destructive
                disabled={busy}
                phrase={member.display_name}
                phraseLabel="Type the member's name"
                description="Ends their company seat and company visibility. Their personal account stays."
                onConfirm={(typed) =>
                  act({ action: "remove_member", memberId: member.id, confirmName: typed })
                }
              />
              <ConfirmAction
                label="Make account owner"
                destructive
                disabled={busy}
                phrase={data.organization.name}
                phraseLabel="Type the company name"
                description={`${member.display_name} becomes the company's account owner. The current account owner becomes an admin. Stripe billing is unchanged.`}
                onConfirm={(typed) =>
                  act({ action: "transfer_ownership", memberId: member.id, confirmName: typed })
                }
              />
            </>
          )}
        </div>
      )}
    </li>
  );
}

function AssignForm({
  data,
  busy,
  act,
}: {
  data: OwnerTeamDetail;
  busy: boolean;
  act: (body: Record<string, unknown>) => Promise<void>;
}) {
  const active = data.members.filter((m) => m.status === "active");
  const [memberId, setMemberId] = useState(active[0]?.id ?? "");
  const [moduleId, setModuleId] = useState("roofing");
  const [certificate, setCertificate] = useState(false);
  const [due, setDue] = useState("");
  if (!active.length) return null;
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        void act({
          action: "assign",
          memberId,
          moduleId,
          requireCertificate: certificate && moduleId === "roofing",
          dueAt: due ? new Date(`${due}T23:59:59`).toISOString() : null,
        });
      }}
    >
      <h3 className="font-semibold sm:col-span-2 lg:col-span-4">Assign a module</h3>
      <label className="text-sm">
        Member
        <select
          className={ownerField}
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          {active.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Module
        <select
          className={ownerField}
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value);
            if (e.target.value !== "roofing") setCertificate(false);
          }}
        >
          {data.modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Due (optional)
        <input
          type="date"
          className={ownerField}
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          checked={certificate}
          disabled={moduleId !== "roofing"}
          onChange={(e) => setCertificate(e.target.checked)}
        />
        Certificate goal {moduleId !== "roofing" && "(Roofing only)"}
      </label>
      <button
        className={ownerPrimary + " sm:col-span-2 lg:col-span-1"}
        disabled={busy || !memberId}
      >
        Assign module
      </button>
    </form>
  );
}
