import { Lock, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SecurityScore from '@/components/admin-security/SecurityScore';
import SecurityMetricCards from '@/components/admin-security/SecurityMetricCards';
import SecurityEvents from '@/components/admin-security/SecurityEvents';
import IPActivity from '@/components/admin-security/IPActivity';
import AuthActivity from '@/components/admin-security/AuthActivity';
import SecurityAlerts from '@/components/admin-security/SecurityAlerts';
import { SECURITY_SCORE, METRICS, SECURITY_EVENTS, IP_ACTIVITY, AUTH_ACTIVITY, ALERTS } from '@/components/admin-security/securityData';

export default function AdminSecurity() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Security Dashboard" description="Platform-wide security posture, threats, and audit activity — restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All security actions are logged and audited. Data shown is illustrative mock data — backend-ready for live security APIs.</p></div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1"><SecurityScore data={SECURITY_SCORE} /></div>
        <div className="xl:col-span-2"><SecurityMetricCards metrics={METRICS} /></div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SecurityEvents events={SECURITY_EVENTS} />
        <SecurityAlerts alerts={ALERTS} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <IPActivity rows={IP_ACTIVITY} />
        <AuthActivity rows={AUTH_ACTIVITY} />
      </div>
    </>
  );
}