import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ExternalLink, LayoutDashboard, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { deleteDashboardWidget, listDashboardWidgets, saveDashboardWidget } from '@/lib/dashboard/widgets.functions';

export default function DashboardWidgets({ enabled }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const listFn = useServerFn(listDashboardWidgets);
  const saveFn = useServerFn(saveDashboardWidget);
  const deleteFn = useServerFn(deleteDashboardWidget);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('link');
  const [targetUrl, setTargetUrl] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const widgets = useQuery({ queryKey: ['dashboard-widgets'], queryFn: () => listFn(), enabled, retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['dashboard-widgets'] });
  const save = useMutation({ mutationFn: () => saveFn({ data: { title, kind, targetUrl: targetUrl || null, value: value || null, description: description || null, sortOrder: (widgets.data ?? []).length } }), onSuccess: async () => { setTitle(''); setTargetUrl(''); setValue(''); setDescription(''); setShowForm(false); await refresh(); toast({ title: 'Dashboard widget added' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not add widget', description: friendlyMessage(error) }) });
  const remove = useMutation({ mutationFn: (id) => deleteFn({ data: { id } }), onSuccess: refresh, onError: (error) => toast({ variant: 'destructive', title: 'Could not remove widget', description: friendlyMessage(error) }) });

  if (!enabled) return null;
  return <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Your workspace widgets</h2></div><p className="mt-1 text-xs text-zinc-500">Dashy-inspired personal shortcuts, notes and metrics without duplicating Mission Control or system monitoring.</p></div><button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" />Add widget</button></div>
    {showForm && <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2 xl:grid-cols-5"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Widget title" className={control} /><select value={kind} onChange={(event) => setKind(event.target.value)} className={control}><option value="link">Link</option><option value="metric">Metric</option><option value="status">Status label</option><option value="note">Note</option></select><input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://… (optional)" className={control} /><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Value / status" className={control} /><button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()} className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save</button><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description or note" rows={2} className={`${control} md:col-span-2 xl:col-span-5`} /></div>}
    {widgets.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(widgets.error)}</p>}
    {widgets.isLoading ? <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading widgets…</div> : (widgets.data ?? []).length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">No custom widgets yet. Your existing live PalladiumAI dashboard remains unchanged.</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(widgets.data ?? []).map((widget) => { const config = widget.config && typeof widget.config === 'object' ? widget.config : {}; return <article key={widget.id} className="group relative rounded-xl border border-white/10 bg-black/20 p-4"><button aria-label={`Remove ${widget.title}`} onClick={() => remove.mutate(widget.id)} className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-600 opacity-0 hover:bg-rose-400/10 hover:text-rose-300 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button><p className="pr-7 text-[10px] uppercase tracking-wide text-zinc-500">{widget.kind}</p><p className="mt-1 text-sm font-semibold text-white">{widget.title}</p>{config.value && <p className="mt-2 text-lg font-semibold text-violet-200">{String(config.value)}</p>}{config.description && <p className="mt-2 text-xs leading-5 text-zinc-500">{String(config.description)}</p>}{widget.target_url && <a href={widget.target_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-violet-400">Open <ExternalLink className="h-3 w-3" /></a>}</article>; })}</div>}
  </section>;
}

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
