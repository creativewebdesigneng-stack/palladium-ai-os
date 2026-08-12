import { Lock, Info, Plug } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AdminIntegrations() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Integration Management" description="Manage platform-supported integrations across all organisations." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. Platform-wide integration management is not yet wired to a backend.</p></div>

      <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Plug className="h-6 w-6" /></span>
        <p className="mt-3 text-sm font-medium text-white">Not configured yet</p>
        <p className="mt-1 max-w-md text-xs text-zinc-500">Platform-wide integration management has no backing table yet. Per-user integrations are available under Tools &amp; Integrations.</p>
      </div>
    </>
  );
}
