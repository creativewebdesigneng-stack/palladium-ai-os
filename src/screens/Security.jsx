import { useState, useMemo } from 'react';
import { ShieldCheck, Fingerprint, KeyRound, Lock } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SecurityOverviewCards from '@/components/security/SecurityOverviewCards';
import SecurityToolbar from '@/components/security/SecurityToolbar';
import SecurityScore from '@/components/security/SecurityScore';
import Authentication from '@/components/security/Authentication';
import ActiveSessions from '@/components/security/ActiveSessions';
import APISecurity from '@/components/security/APISecurity';
import SecurityAlerts from '@/components/security/SecurityAlerts';
import AuditLog from '@/components/security/AuditLog';
import PrivacyPanel from '@/components/security/PrivacyPanel';
import BackupRecovery from '@/components/security/BackupRecovery';
import SecurityRecommendations from '@/components/security/SecurityRecommendations';
import SecurityRightSidebar from '@/components/security/SecurityRightSidebar';
import { SESSIONS, ALERTS, AUDIT } from '@/components/security/securityData';

const HEADER_ACTIONS = [
  { label: 'Enable MFA', icon: Fingerprint, primary: true, tab: 'Authentication' },
  { label: 'New API Key', icon: KeyRound, tab: 'API Security' },
  { label: 'Run Security Check', icon: ShieldCheck, tab: 'Security Score' },
  { label: 'Audit Log', icon: Lock, tab: 'Audit Log' },
];

export default function Security() {
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
    if (activeTab === 'Sessions') {
      const q = query.trim().toLowerCase();
      return q ? SESSIONS.filter(s => s.device.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.browser.toLowerCase().includes(q)).length : SESSIONS.length;
    }
    if (activeTab === 'Alerts') return ALERTS.length;
    if (activeTab === 'Audit Log') return AUDIT.length;
    return null;
  }, [activeTab, query]);

  const showRight = ['Overview', 'Security Score', 'Authentication', 'Sessions', 'API Security'].includes(activeTab);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Security Centre" description="Protect your account, organisation, data and AI workforce." action={headerActions} />

      <div className="mb-5"><SecurityOverviewCards /></div>

      <div className="mb-5"><SecurityToolbar query={query} setQuery={setQuery} activeTab={activeTab} setActiveTab={setActiveTab} resultCount={resultCount} /></div>

      <div className={`grid gap-4 ${showRight ? 'xl:grid-cols-[1fr_17rem]' : 'grid-cols-1'}`}>
        <div className="min-w-0 space-y-6">
          {activeTab === 'Overview' && (
            <>
              <SecurityScore />
              <SecurityRecommendations />
              <Authentication />
              <ActiveSessions query="" />
            </>
          )}
          {activeTab === 'Security Score' && <SecurityScore />}
          {activeTab === 'Authentication' && <Authentication />}
          {activeTab === 'Sessions' && <ActiveSessions query={query} />}
          {activeTab === 'API Security' && <APISecurity />}
          {activeTab === 'Alerts' && <SecurityAlerts />}
          {activeTab === 'Audit Log' && <AuditLog />}
          {activeTab === 'Privacy' && <PrivacyPanel />}
          {activeTab === 'Backup' && <BackupRecovery />}
        </div>

        {showRight && (
          <div className="hidden xl:block">
            <div className="sticky top-6"><SecurityRightSidebar /></div>
          </div>
        )}
      </div>
    </>
  );
}