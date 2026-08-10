import { useState, useMemo } from 'react';
import { UserPlus, Network, Building2, Settings2, Users } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
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
import { MEMBERS, INVITATIONS, AGENT_ASSIGNMENTS } from '@/components/team/teamData';

const HEADER_ACTIONS = [
  { label: 'Invite Member', icon: UserPlus, primary: true, tab: 'Invitations' },
  { label: 'Create Team', icon: Network, tab: 'Team Structure' },
  { label: 'Create Department', icon: Building2, tab: 'Team Structure' },
  { label: 'Organisation Settings', icon: Settings2, tab: 'Organisation' },
];

export default function Team() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

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

  const resultCount = useMemo(() => {
    if (activeTab === 'Members') {
      const q = query.trim().toLowerCase();
      return q ? MEMBERS.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.dept.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)).length : MEMBERS.length;
    }
    if (activeTab === 'Invitations') return INVITATIONS.length;
    if (activeTab === 'AI Agents') return AGENT_ASSIGNMENTS.length;
    return null;
  }, [activeTab, query]);

  const showRight = ['Overview', 'Members', 'Team Structure', 'Roles & Permissions', 'Collaboration'].includes(activeTab);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Team & Organisation" description="Manage your people, teams, departments and permissions." action={headerActions} />

      <div className="mb-5"><TeamOverviewCards /></div>

      <div className="mb-5"><TeamToolbar query={query} setQuery={setQuery} activeTab={activeTab} setActiveTab={setActiveTab} resultCount={resultCount} /></div>

      <div className={`grid gap-4 ${showRight ? 'xl:grid-cols-[1fr_17rem]' : 'grid-cols-1'}`}>
        <div className="min-w-0 space-y-6">
          {activeTab === 'Overview' && (
            <>
              <OrgStructure />
              <AgentAssignments />
              <CollaborationPanel />
            </>
          )}
          {activeTab === 'Members' && <MembersTable query={query} />}
          {activeTab === 'Team Structure' && <OrgStructure />}
          {activeTab === 'Roles & Permissions' && <RolesPermissions />}
          {activeTab === 'Invitations' && <InvitationsTable />}
          {activeTab === 'AI Agents' && <AgentAssignments />}
          {activeTab === 'Collaboration' && <CollaborationPanel />}
          {activeTab === 'Organisation' && <OrgSettings />}
          {activeTab === 'Audit' && <AuditActivity />}
        </div>

        {showRight && (
          <div className="hidden xl:block">
            <div className="sticky top-6"><TeamRightSidebar /></div>
          </div>
        )}
      </div>
    </>
  );
}