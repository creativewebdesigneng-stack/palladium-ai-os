import { Lock, Info, Settings } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AdminSystemSettings() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="System Settings" description="Platform-wide configuration — restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. Platform-wide settings have no backing table yet.</p></div>

      <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Settings className="h-6 w-6" /></span>
        <p className="mt-3 text-sm font-medium text-white">Not configured yet</p>
        <p className="mt-1 max-w-md text-xs text-zinc-500">There is no platform system-settings table to read or write yet. This screen will come online once that configuration store exists.</p>
      </div>
    </>
  );
}
