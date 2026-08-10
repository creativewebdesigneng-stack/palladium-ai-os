import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Building2, Users, ShieldCheck, Plus, Trash2, Crown, Gauge, Loader2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  createOrganisation, updateOrganisation, listOrganisationMembers,
  addOrganisationMember, updateMemberRole, removeMember,
  listTeams, saveTeam, deleteTeam,
} from '@/lib/platform/platform.functions';

const ROLE_STYLE = {
  owner: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  admin: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  member: 'border-white/10 bg-white/5 text-zinc-300',
};

const money = (pence) => (pence === 0 ? 'Free' : `£${(pence / 100).toLocaleString('en-GB')}`);

export default function Organisation() {
  const qc = useQueryClient();
  const { session, organisations, activeOrgId, selectOrg, entitlements, isLoading } = useWorkspace();
  const [orgId, setOrgId] = useState(activeOrgId);
  const [newOrg, setNewOrg] = useState('');
  const [invite, setInvite] = useState({ email: '', role: 'member' });
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!orgId && organisations.length) {
      setOrgId(organisations[0].id);
      selectOrg(organisations[0].id);
    }
  }, [organisations, orgId, selectOrg]);

  const membersFn = useServerFn(listOrganisationMembers);
  const teamsFn = useServerFn(listTeams);
  const createOrgFn = useServerFn(createOrganisation);
  const updateOrgFn = useServerFn(updateOrganisation);
  const addMemberFn = useServerFn(addOrganisationMember);
  const roleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const saveTeamFn = useServerFn(saveTeam);
  const deleteTeamFn = useServerFn(deleteTeam);

  const members = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => membersFn({ data: { orgId } }),
    enabled: Boolean(orgId) && session === 'yes',
    retry: false,
  });

  const teams = useQuery({
    queryKey: ['org-teams', orgId],
    queryFn: () => teamsFn({ data: { orgId } }),
    enabled: Boolean(orgId) && session === 'yes',
    retry: false,
  });

  const current = useMemo(() => organisations.find((o) => o.id === orgId) ?? null, [organisations, orgId]);
  const canManage = current?.role === 'owner' || current?.role === 'admin';

  const fail = (e) => toast({ title: 'Action blocked', description: e?.message ?? 'Please try again.', variant: 'destructive' });
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['workspace'] });
    qc.invalidateQueries({ queryKey: ['org-members', orgId] });
    qc.invalidateQueries({ queryKey: ['org-teams', orgId] });
  };

  const create = useMutation({
    mutationFn: (name) => createOrgFn({ data: { name } }),
    onSuccess: (org) => { setNewOrg(''); setOrgId(org.id); selectOrg(org.id); toast({ title: `${org.name} created` }); refreshAll(); },
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: (name) => updateOrgFn({ data: { orgId, name } }),
    onSuccess: () => { toast({ title: 'Organisation updated' }); refreshAll(); },
    onError: fail,
  });

  const addMember = useMutation({
    mutationFn: () => addMemberFn({ data: { orgId, email: invite.email, role: invite.role } }),
    onSuccess: () => { setInvite({ email: '', role: 'member' }); toast({ title: 'Member added' }); refreshAll(); },
    onError: fail,
  });

  const changeRole = useMutation({
    mutationFn: (vars) => roleFn({ data: { orgId, memberId: vars.id, role: vars.role } }),
    onSuccess: () => { toast({ title: 'Role updated' }); refreshAll(); },
    onError: fail,
  });

  const kick = useMutation({
    mutationFn: (id) => removeFn({ data: { orgId, memberId: id } }),
    onSuccess: () => { toast({ title: 'Member removed' }); refreshAll(); },
    onError: fail,
  });

  const addTeam = useMutation({
    mutationFn: () => saveTeamFn({ data: { orgId, name: teamName } }),
    onSuccess: () => { setTeamName(''); toast({ title: 'Team created' }); refreshAll(); },
    onError: fail,
  });

  const removeTeam = useMutation({
    mutationFn: (id) => deleteTeamFn({ data: { orgId, id } }),
    onSuccess: refreshAll,
    onError: fail,
  });

  if (session === 'no') {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Organisations" description="Shared workspaces, roles and teams." />
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.06] p-4 text-xs text-amber-200/80">
          Sign in to manage your organisations — membership and roles are enforced by the backend.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Organisations"
        description="Create shared workspaces, invite people, assign roles and group them into teams. Every permission is enforced server-side."
        action={
          entitlements && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400">
              <Gauge className="h-3.5 w-3.5 text-violet-400" />
              {entitlements.planName} · {money(entitlements.limits?.seats === -1 ? 0 : 0)}
              {entitlements.limits?.seats === -1
                ? 'Unlimited seats'
                : `${entitlements.usage?.seats ?? 0}/${entitlements.limits?.seats ?? 1} seats`}
            </span>
          )
        }
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* organisations list */}
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Building2 className="h-4 w-4 text-violet-400" />Your organisations</h2>
          {isLoading && <p className="mt-3 text-xs text-zinc-500">Loading…</p>}
          <div className="mt-3 space-y-2">
            {organisations.map((o) => (
              <button
                key={o.id}
                onClick={() => { setOrgId(o.id); selectOrg(o.id); }}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  o.id === orgId ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-white">{o.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${ROLE_STYLE[o.role] ?? ROLE_STYLE.member}`}>{o.role}</span>
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-zinc-500">/{o.slug}</span>
              </button>
            ))}
            {!isLoading && organisations.length === 0 && (
              <p className="text-xs text-zinc-500">You are working solo. Create an organisation to collaborate.</p>
            )}
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">New organisation</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                placeholder="Acme Ltd"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
              />
              <button
                disabled={newOrg.trim().length < 2 || create.isPending}
                onClick={() => create.mutate(newOrg.trim())}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100 ring-1 ring-violet-400/30 disabled:opacity-40"
              >
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create
              </button>
            </div>
          </div>
        </div>

        {/* members */}
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-cyan-400" />Members</h2>
          {!orgId && <p className="mt-3 text-xs text-zinc-500">Select or create an organisation first.</p>}

          {orgId && (
            <>
              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={invite.email}
                    onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                    placeholder="person@company.com"
                    className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
                  />
                  <select
                    value={invite.role}
                    onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    disabled={!invite.email.includes('@') || addMember.isPending}
                    onClick={() => addMember.mutate()}
                    className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 disabled:opacity-40"
                  >
                    {addMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Add
                  </button>
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[11px]">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-600">
                    <tr><th className="pb-2 pr-3 font-medium">Person</th><th className="pb-2 pr-3 font-medium">Role</th><th className="pb-2 font-medium" /></tr>
                  </thead>
                  <tbody>
                    {(members.data ?? []).map((m) => (
                      <tr key={m.id} className="border-t border-white/5">
                        <td className="py-2 pr-3">
                          <span className="block text-zinc-200">{m.fullName ?? m.email ?? 'Member'}</span>
                          <span className="block text-[10px] text-zinc-600">{m.email}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {canManage && m.role !== 'owner' ? (
                            <select
                              value={m.role}
                              onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value })}
                              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white outline-none"
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                              {current?.role === 'owner' && <option value="owner">owner</option>}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${ROLE_STYLE[m.role] ?? ROLE_STYLE.member}`}>
                              {m.role === 'owner' && <Crown className="h-3 w-3" />}{m.role}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {canManage && m.role !== 'owner' && (
                            <button onClick={() => kick.mutate(m.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove member">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {members.isLoading && <p className="mt-2 text-xs text-zinc-500">Loading members…</p>}
                {members.error && <p className="mt-2 text-xs text-red-300">{members.error.message}</p>}
              </div>

              {/* teams */}
              <div className="mt-6 border-t border-white/5 pt-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Teams</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(teams.data ?? []).map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] text-zinc-300">
                      {t.name}
                      <span className="text-[10px] text-zinc-600">{t.team_members?.length ?? 0}</span>
                      {canManage && (
                        <button onClick={() => removeTeam.mutate(t.id)} className="text-zinc-500 hover:text-red-300" aria-label={`Delete ${t.name}`}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {(teams.data ?? []).length === 0 && !teams.isLoading && <p className="text-[11px] text-zinc-600">No teams yet.</p>}
                </div>
                {canManage && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Growth team"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
                    />
                    <button
                      disabled={teamName.trim().length < 2 || addTeam.isPending}
                      onClick={() => addTeam.mutate()}
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 disabled:opacity-40"
                    >
                      Add team
                    </button>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="mt-6 border-t border-white/5 pt-4">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500">Rename organisation</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      defaultValue={current?.name ?? ''}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 2 && v !== current?.name) rename.mutate(v); }}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
