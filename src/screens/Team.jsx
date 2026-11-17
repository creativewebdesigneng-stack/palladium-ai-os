import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { UserPlus, Network, Settings2, Users, ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import {
  listOrganisationMembers, listTeams, addOrganisationMember,
  updateMemberRole, removeMember, saveTeam, deleteTeam, updateOrganisation,
} from '@/lib/platform/platform.functions';
import TeamOverviewCards from '@/components/team/TeamOverviewCards';
import TeamToolbar from '@/components/team/TeamToolbar';
import OrgStructure from '@/components/team/OrgStructure';
import MembersTable from '@/components/team/MembersTable';
import RolesPermissions from '@/components/team/RolesPermissions';
import InvitationsTable from '@/components/team/InvitationsTable';
import AgentAssignments from '@/components/team/AgentAssignments';
import CollaborationPanel from '@/components/team/CollaborationPanel';
import OrgSettings from '@/components/team/OrgSettings';
import AuditActivity from '@/components/team/AuditActivity';
import TeamRightSidebar from '@/components/team/TeamRightSidebar';
import { EmptyState } from '@/components/team/shared';

const HEADER_ACTIONS = [
  { label: 'Add Member', icon: UserPlus, primary: true, tab: 'Member Access' },
  { label: 'Create Team', icon: Network, tab: 'Team Structure' },
  { label: 'Organisation Settings', icon: Settings2, tab: 'Organisation' },
];

const TABS = ['Overview', 'Members', 'Team Structure', 'Roles & Permissions', 'Member Access', 'AI Agents', 'Collaboration', 'Organisation', 'Audit'];

function withTeamTimeout(promise, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} did not respond within 15 seconds.`)), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export default function Team() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const workspace = useWorkspace();
  const session = workspace.session;
  const membersFn = useServerFn(listOrganisationMembers);
  const teamsFn = useServerFn(listTeams);
  const addMemberFn = useServerFn(addOrganisationMember);
  const updateRoleFn = useServerFn(updateMemberRole);
  const removeMemberFn = useServerFn(removeMember);
  const saveTeamFn = useServerFn(saveTeam);
  const deleteTeamFn = useServerFn(deleteTeam);
  const updateOrgFn = useServerFn(updateOrganisation);

  const orgId = workspace.activeOrgId ?? workspace.organisations[0]?.id ?? null;
  const currentOrganisation = workspace.organisations.find((organisation) => organisation.id === orgId) ?? null;
  const myRole = currentOrganisation?.role ?? null;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const members = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: () => withTeamTimeout(membersFn({ data: { orgId } }), 'Team members'),
    enabled: session === 'yes' && !!orgId,
    retry: false,
  });

  const teams = useQuery({
    queryKey: ['team-teams', orgId],
    queryFn: () => withTeamTimeout(teamsFn({ data: { orgId } }), 'Team list'),
    enabled: session === 'yes' && !!orgId,
    retry: false,
  });

  const invalidateMembers = () => qc.invalidateQueries({ queryKey: ['team-members', orgId] });
  const invalidateTeams = () => qc.invalidateQueries({ queryKey: ['team-teams', orgId] });

  const onError = (err, fallback) => {
    console.error('[team]', err);
    toast({ title: fallback, description: friendlyMessage(err), variant: 'destructive' });
  };

  const addMemberMutation = useMutation({
    mutationFn: (vars) => addMemberFn({ data: { orgId, ...vars } }),
    onSuccess: () => { toast({ title: 'Member added' }); invalidateMembers(); },
    onError: (err) => onError(err, 'Could not add member'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (vars) => updateRoleFn({ data: { orgId, ...vars } }),
    onSuccess: () => { toast({ title: 'Role updated' }); invalidateMembers(); },
    onError: (err) => onError(err, 'Could not update role'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => removeMemberFn({ data: { orgId, memberId } }),
    onSuccess: () => { toast({ title: 'Member removed' }); invalidateMembers(); },
    onError: (err) => onError(err, 'Could not remove member'),
  });

  const saveTeamMutation = useMutation({
    mutationFn: (vars) => saveTeamFn({ data: { orgId, ...vars } }),
    onSuccess: () => { toast({ title: 'Team saved' }); invalidateTeams(); },
    onError: (err) => onError(err, 'Could not save team'),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => deleteTeamFn({ data: { orgId, id } }),
    onSuccess: () => { toast({ title: 'Team deleted' }); invalidateTeams(); },
    onError: (err) => onError(err, 'Could not delete team'),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (vars) => updateOrgFn({ data: { orgId, ...vars } }),
    onSuccess: () => { toast({ title: 'Organisation updated' }); qc.invalidateQueries({ queryKey: ['team-workspace'] }); },
    onError: (err) => onError(err, 'Could not update organisation'),
  });

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEADER_ACTIONS.map(a => (
        <button key={a.label} onClick={() => setActiveTab(a.tab)}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  const memberList = members.data ?? [];
  const teamList = teams.data ?? [];

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memberList;
    return memberList.filter((m) =>
      (m.fullName || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q));
  }, [memberList, query]);

  const resultCount = activeTab === 'Members' ? filteredMembers.length : activeTab === 'Team Structure' ? teamList.length : null;
  const showRight = ['Overview', 'Members', 'Team Structure', 'Roles & Permissions', 'Collaboration'].includes(activeTab);

  if (session === 'unknown' || workspace.isLoading) {
    return <><PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage your people, teams and permissions." /><div role="status" className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400">Loading organisation workspace…</div></>;
  }

  if (workspace.error) {
    return <><PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage your people, teams and permissions." /><div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-500/[.05] p-4 text-sm text-rose-200">{workspace.error.message}<button onClick={() => workspace.refetch()} className="ml-3 underline">Retry</button></div></>;
  }

  if (session === 'no') {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage your people, teams and permissions." />
        <EmptyState icon={ShieldAlert} title="Sign in required" desc="Sign in to view your organisation's team." />
      </>
    );
  }

  if (session === 'yes' && !workspace.isLoading && !orgId) {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage your people, teams and permissions." />
        <EmptyState icon={Users} title="No organisation yet" desc="Create or join an organisation to manage team members, roles and teams." />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage existing account members, teams, departments and permissions." action={headerActions} />

      <div className="mb-5"><TeamOverviewCards members={memberList} teams={teamList} loading={workspace.isLoading || members.isLoading || teams.isLoading} /></div>

      <div className="mb-5"><TeamToolbar query={query} setQuery={setQuery} activeTab={activeTab} setActiveTab={setActiveTab} resultCount={resultCount} tabs={TABS} /></div>

      <div className={`grid gap-4 ${showRight ? 'xl:grid-cols-[1fr_17rem]' : 'grid-cols-1'}`}>
        <div className="min-w-0 space-y-6">
          {activeTab === 'Overview' && (
            <>
              <OrgStructure teams={teamList} isLoading={teams.isLoading} error={teams.error} canManage={canManage} onCreateTeam={(name) => saveTeamMutation.mutate({ name })} />
              <AgentAssignments />
              <CollaborationPanel members={memberList} />
            </>
          )}
          {activeTab === 'Members' && (
            <MembersTable
              members={filteredMembers}
              isLoading={members.isLoading}
              error={members.error}
              canManage={canManage}
              myRole={myRole}
              onChangeRole={(memberId, role) => updateRoleMutation.mutate({ memberId, role })}
              onRemove={(memberId) => removeMemberMutation.mutate(memberId)}
              busy={updateRoleMutation.isPending || removeMemberMutation.isPending}
            />
          )}
          {activeTab === 'Team Structure' && (
            <OrgStructure teams={teamList} isLoading={teams.isLoading} error={teams.error} canManage={canManage}
              onCreateTeam={(name) => saveTeamMutation.mutate({ name })}
              onDeleteTeam={(id) => deleteTeamMutation.mutate(id)} full />
          )}
          {activeTab === 'Roles & Permissions' && <RolesPermissions members={memberList} />}
          {activeTab === 'Member Access' && (
            <InvitationsTable canManage={canManage} onAdd={(vars) => addMemberMutation.mutate(vars)} busy={addMemberMutation.isPending} />
          )}
          {activeTab === 'AI Agents' && <AgentAssignments />}
          {activeTab === 'Collaboration' && <CollaborationPanel members={memberList} />}
          {activeTab === 'Organisation' && (
            <OrgSettings
              org={currentOrganisation}
              canManage={canManage}
              onSave={(vars) => updateOrgMutation.mutate(vars)}
              busy={updateOrgMutation.isPending}
            />
          )}
          {activeTab === 'Audit' && <AuditActivity />}
        </div>

        {showRight && (
          <div className="hidden xl:block">
            <div className="sticky top-6"><TeamRightSidebar members={memberList} /></div>
          </div>
        )}
      </div>
    </>
  );
}
