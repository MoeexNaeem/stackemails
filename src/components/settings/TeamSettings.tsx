"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { Section } from "@/components/settings/AccountForms";
import { changeMemberRoleAction, deleteTeamAction, inviteMemberAction, removeMemberAction, renameTeamAction, revokeInviteAction, type SettingsState } from "@/app/(app)/settings-actions";
import { createTeamAction } from "@/app/(app)/team-actions";
import { timeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/Confirm";

type Member = { id: string; userId: string; email: string; name: string; role: string; mfa: boolean; joined: string };
const initial: SettingsState = { ok: false };

export function TeamSettings({ team, me, members, invites, openCreate }: { team: { name: string; plan: string; seats: number }; me: { id: string; role: string }; members: Member[]; invites: { id: string; email: string; role: string; expiresAt: string }[]; openCreate: boolean }) {
  const router = useRouter();
  const manage = me.role === "owner" || me.role === "admin";
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(openCreate);
  const [newTeam, setNewTeam] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [renameState, rename, renaming] = useActionState(renameTeamAction, initial);
  const [inviteState, invite, sendingInvite] = useActionState(inviteMemberAction, initial);
  const [deleteState, del, deleting] = useActionState(deleteTeamAction, initial);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#invite" && manage) setInviting(true);
  }, [manage]);
  useEffect(() => {
    if (inviteState.ok) {
      setInviting(false);
      router.refresh();
    }
  }, [inviteState, router]);

  return (
    <div className="space-y-5">
      <Section title="Team name" desc={`${team.plan[0].toUpperCase()}${team.plan.slice(1)} plan · ${members.length + invites.length} of ${team.seats} seats used`}>
        <form action={rename} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="team-name">Name</label>
            <input id="team-name" name="name" className="input" defaultValue={team.name} disabled={!manage} maxLength={80} />
          </div>
          {manage && <button className="btn btn-secondary" disabled={renaming}>{renaming ? "Saving…" : "Save"}</button>}
          <div className="w-full"><FormNote state={renameState} /></div>
        </form>
      </Section>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          <div>
            <h2 className="font-medium">Members</h2>
            {note && <p className="text-xs text-fg-muted">{note}</p>}
          </div>
          {manage && <button className="btn btn-primary" onClick={() => setInviting(true)} id="invite">+ Invite</button>}
        </div>
        <table className="table">
          <thead><tr><th>Member</th><th>Role</th><th>MFA</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-medium">{m.name || m.email}{m.userId === me.id && <span className="ml-2 text-xs text-fg-subtle">(you)</span>}</p>
                  <p className="text-xs text-fg-subtle">{m.email} · joined {new Date(m.joined).toLocaleDateString()}</p>
                </td>
                <td>
                  {me.role === "owner" && m.role !== "owner" ? (
                    <select className="input input-pill h-8 w-28 text-xs" value={m.role} disabled={pending} onChange={(e) => start(async () => { const r = await changeMemberRoleAction(m.id, e.target.value as "admin" | "member"); setNote(r.error ?? r.message ?? null); router.refresh(); })} aria-label={`Role for ${m.email}`}>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className="badge capitalize" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{m.role}</span>
                  )}
                </td>
                <td>{m.mfa ? <span className="badge delta-up">On</span> : <span className="text-fg-subtle text-xs">Off</span>}</td>
                <td className="text-right">
                  {m.role !== "owner" && (manage || m.userId === me.id) && (
                    <button
                      className="btn btn-ghost btn-sm text-danger"
                      disabled={pending}
                      onClick={async () => {
                        if (!(await confirmDialog(m.userId === me.id ? "Leave this team?" : `Remove ${m.email} from the team?`))) return;
                        start(async () => {
                          const r = await removeMemberAction(m.id);
                          setNote(r?.error ?? r?.message ?? null);
                          router.refresh();
                        });
                      }}
                    >
                      {m.userId === me.id ? "Leave" : "Remove"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invites.map((i) => (
              <tr key={i.id}>
                <td><p className="font-medium text-fg-muted">{i.email}</p><p className="text-xs text-fg-subtle">Invitation pending · expires {timeAgo(i.expiresAt)}</p></td>
                <td><span className="badge capitalize" style={{ background: "var(--bg-hover)", color: "var(--fg-subtle)" }}>{i.role}</span></td>
                <td />
                <td className="text-right">{manage && <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await revokeInviteAction(i.id); router.refresh(); })}>Revoke</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Section title="Exports" desc="Download CSV exports of your team's data.">
        <Link href="/settings/exports" className="btn btn-secondary">Go to exports</Link>
      </Section>

      <Section title="Teams" desc="Create a separate team for another product or client.">
        <button className="btn btn-secondary" onClick={() => setCreating(true)}>+ Create team</button>
      </Section>

      {me.role === "owner" && (
        <Section title="Delete team" desc="Permanently delete the team and all of its contents." danger>
          <form action={del} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="label" htmlFor="del-team">Type <span className="mono">{team.name}</span> to confirm</label>
              <input id="del-team" name="confirm" className="input" autoComplete="off" required />
            </div>
            <button className="btn btn-danger" disabled={deleting}>{deleting ? "Deleting…" : "Delete team"}</button>
            <div className="w-full"><FormNote state={deleteState} /></div>
          </form>
        </Section>
      )}

      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite a teammate" description="They'll get an email with a link to join this team.">
        <form action={invite} className="space-y-4">
          <div>
            <label className="label" htmlFor="inv-email">Email</label>
            <input id="inv-email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="inv-role">Role</label>
            <select id="inv-role" name="role" className="input" defaultValue="member">
              <option value="member">Member: can send and view everything</option>
              <option value="admin">Admin: can also manage team, billing and settings</option>
            </select>
          </div>
          <FormNote state={inviteState} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setInviting(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={sendingInvite}>{sendingInvite ? "Sending…" : "Send invite"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create team">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setCreateErr(null);
            start(async () => {
              const r = await createTeamAction(newTeam);
              if (!r.ok) return setCreateErr(r.error ?? "Couldn't create team.");
              router.push("/onboarding");
              router.refresh();
            });
          }}
        >
          <div>
            <label className="label" htmlFor="new-team">Team name</label>
            <input id="new-team" className="input" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} maxLength={80} required />
          </div>
          {createErr && <p className="text-sm text-danger">{createErr}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create team"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
