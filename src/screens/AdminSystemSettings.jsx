import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2, Lock, Save, ShieldAlert, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  getAdminSystemSettings,
  updatePlatformAnnouncement,
} from '@/lib/admin/system-settings.functions';
import { friendlyMessage } from '@/lib/errors';

const TONE_LABELS = { info: 'Information', warning: 'Warning', critical: 'Critical' };

export default function AdminSystemSettings() {
  const { session } = useWorkspace();
  const qc = useQueryClient();
  const getFn = useServerFn(getAdminSystemSettings);
  const updateFn = useServerFn(updatePlatformAnnouncement);
  const q = useQuery({ queryKey: ['admin-system-settings'], queryFn: () => getFn(), enabled: session === 'yes', retry: false });
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState('');
  const [tone, setTone] = useState('info');

  useEffect(() => {
    if (!q.data || q.data.forbidden) return;
    setEnabled(Boolean(q.data.announcement?.enabled));
    setText(q.data.announcement?.text ?? '');
    setTone(q.data.announcement?.tone ?? 'info');
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { enabled, text: text.trim(), tone } }),
    onSuccess: async (result) => {
      if (result?.forbidden) throw new Error('Admin access is required.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-system-settings'] }),
        qc.invalidateQueries({ queryKey: ['platform-announcement'] }),
      ]);
    },
  });

  const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

  if (session !== 'yes' || q.isLoading) {
    return <><PageHeader eyebrow="Admin" title="System Settings" description="Platform-wide configuration — restricted to administrators." action={headerAction} /><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading platform settings…</div></>;
  }

  if (q.data?.forbidden || q.error) {
    if (q.error) console.error('[AdminSystemSettings]', q.error);
    return <><PageHeader eyebrow="Admin" title="System Settings" description="Platform-wide configuration — restricted to administrators." action={headerAction} /><div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center"><ShieldOff className="h-8 w-8 text-rose-300" /><p className="text-sm font-medium text-rose-200">{q.data?.forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p><p className="text-xs text-rose-200/70">Admin access is re-verified server-side for every settings read and write.</p></div></>;
  }

  const valid = !enabled || text.trim().length > 0;

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Settings" description="Live platform-wide configuration backed by the server-only settings store." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-400/[.06] px-3 py-2 text-[11px] text-sky-100/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>This first production setting controls the announcement shown at the top of authenticated user dashboards. The settings table is server-only; clients cannot read or write arbitrary keys.</p></div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-sm font-semibold text-white">Platform announcement</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Show a short operational notice to every signed-in user on the dashboard.</p></div>
            <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-violet-500" />Enabled</label>
          </div>

          <label className="mt-5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-violet-400/40">
            {Object.entries(TONE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Message</label>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={5} placeholder="Example: Scheduled maintenance begins at 23:00 UTC." className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40" />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600"><span>{enabled && !text.trim() ? 'A message is required while enabled.' : 'Saved text is limited to 500 characters.'}</span><span>{text.length}/500</span></div>

          {save.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(save.error)}</p>}
          {save.isSuccess && !save.error && <p className="mt-3 text-xs text-emerald-300">Settings saved.</p>}

          <button disabled={save.isPending || !valid} onClick={() => save.mutate()} className="mt-5 flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{save.isPending ? 'Saving…' : 'Save announcement'}</button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <h2 className="text-sm font-semibold text-white">Dashboard preview</h2>
          <p className="mt-1 text-xs text-zinc-500">This is how the notice will appear when enabled.</p>
          {!enabled || !text.trim() ? <div className="mt-5 rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">Announcement is disabled.</div> : <Preview tone={tone} text={text.trim()} />}
          {q.data?.updatedAt && <p className="mt-4 text-[10px] text-zinc-600">Last saved {new Date(q.data.updatedAt).toLocaleString('en-GB')}</p>}
        </section>
      </div>
    </>
  );
}

function Preview({ tone, text }) {
  const config = tone === 'critical'
    ? { cls: 'border-rose-400/25 bg-rose-400/[.07] text-rose-100', Icon: ShieldAlert }
    : tone === 'warning'
      ? { cls: 'border-amber-400/20 bg-amber-400/[.06] text-amber-100', Icon: AlertTriangle }
      : { cls: 'border-sky-400/20 bg-sky-400/[.06] text-sky-100', Icon: Info };
  const Icon = config.Icon;
  return <div className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${config.cls}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><p className="leading-5">{text}</p></div>;
}
