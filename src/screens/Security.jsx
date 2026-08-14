import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Fingerprint, KeyRound, Lock, Loader2, AlertTriangle } from 'lucide-react';
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
import { getSecurityCentre } from '@/lib/security/security.functions';
import { friendlyMessage } from '@/lib/errors';

const HEADER_ACTIONS = [
  { label: 'Authentication', icon: Fingerprint, primary: true, tab: 'Authentication' },
  { label: 'API Security', icon: KeyRound, tab: 'API Security' },
  { label: 'Security Score', icon: ShieldCheck, tab: 'Security Score' },
  { label: 'Audit Log', icon: Lock, tab: 'Audit Log' },
];

// Security Centre. Every figure shown here is read from the backend for the
// signed-in account under row-level security — there is no local sample data.
export default function Security() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError('');
      const result = await getSecurityCentre({ data: {} });
      setData(result);
    } catch (e) {
      setError(friendlyMessage(e, 'Unable to load your security posture.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEADER_ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => setActiveTab(a.tab)}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${
            a.primary
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30'
              : 'border border-white/10 text-zinc-300 hover:bg-white/5'
          }`}
        >
          <a.icon className="h-4 w-4" />
          {a.label}
        </button>
      ))}
    </div>
  );

  const resultCount = useMemo(() => {
    if (!data) return null;
    if (activeTab === 'Alerts') return data.alerts.length;
    if (activeTab === 'Audit Log') return data.auditLogs.length;
    if (activeTab === 'API Security') return data.keys.length + data.webhooks.length + data.integrations.length;
    return null;
  }, [activeTab, data]);

  const showRight = ['Overview', 'Security Score', 'Authentication', 'Sessions', 'API Security'].includes(activeTab);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Security Centre"
        description="Protect your account, credentials, integrations and AI workforce."
        action={headerActions}
      />

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-white">{error}</p>
            <button onClick={() => load(true)} className="mt-2 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="mb-5">
        <SecurityOverviewCards metrics={data?.metrics ?? []} loading={loading} />
      </div>

      <div className="mb-5">
        <SecurityToolbar
          query={query}
          setQuery={setQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          resultCount={resultCount}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-10 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading your security posture…
        </div>
      ) : (
        data && (
          <div className={`grid gap-4 ${showRight ? 'xl:grid-cols-[1fr_17rem]' : 'grid-cols-1'}`}>
            <div className="min-w-0 space-y-6">
              {activeTab === 'Overview' && (
                <>
                  <SecurityScore score={data.score} generatedAt={data.generatedAt} onRefresh={() => load(true)} refreshing={refreshing} />
                  <SecurityRecommendations items={data.recommendations} onNavigate={(r) => setActiveTab(r.tab)} />
                  <Authentication account={data.account} />
                  <ActiveSessions account={data.account} events={data.auditLogs} />
                </>
              )}
              {activeTab === 'Security Score' && (
                <SecurityScore score={data.score} generatedAt={data.generatedAt} onRefresh={() => load(true)} refreshing={refreshing} />
              )}
              {activeTab === 'Authentication' && <Authentication account={data.account} />}
              {activeTab === 'Sessions' && <ActiveSessions account={data.account} events={data.auditLogs} query={query} />}
              {activeTab === 'API Security' && (
                <APISecurity keys={data.keys} webhooks={data.webhooks} integrations={data.integrations} query={query} />
              )}
              {activeTab === 'Alerts' && <SecurityAlerts alerts={data.alerts} query={query} />}
              {activeTab === 'Audit Log' && <AuditLog logs={data.auditLogs} total={data.auditTotal} query={query} />}
              {activeTab === 'Privacy' && <PrivacyPanel />}
              {activeTab === 'Backup' && <BackupRecovery />}
            </div>

            {showRight && (
              <div className="hidden xl:block">
                <div className="sticky top-6">
                  <SecurityRightSidebar
                    alerts={data.alerts}
                    score={data.score}
                    auditLogs={data.auditLogs}
                    onNavigate={setActiveTab}
                  />
                </div>
              </div>
            )}
          </div>
        )
      )}
    </>
  );
}
