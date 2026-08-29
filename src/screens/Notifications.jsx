import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { CheckCheck, BellRing, ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import NotificationsOverviewCards from '@/components/notifications/NotificationsOverviewCards';
import NotificationsCategoryNav from '@/components/notifications/NotificationsCategoryNav';
import NotificationsFilters from '@/components/notifications/NotificationsFilters';
import NotificationsList from '@/components/notifications/NotificationsList';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';
import NtfyPushPanel from '@/components/notifications/NtfyPushPanel';
import { CATEGORIES, metaForKind, tagsForKind, priorityForKind } from '@/components/notifications/notificationsData';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { listNotifications, setNotificationUnread, deleteNotification } from '@/lib/dashboard/dashboard.functions';
import { markNotifications } from '@/lib/mission/mission.functions';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toItem(n) {
  const meta = metaForKind(n.kind);
  return {
    id: n.id,
    category: meta.category,
    icon: meta.icon,
    grad: meta.grad,
    title: n.title,
    desc: n.body || '',
    time: timeAgo(n.created_at),
    createdAt: n.created_at,
    priority: priorityForKind(n.kind, n.severity),
    read: !!n.read_at,
    related: n.link ? { type: meta.category, label: n.link, path: n.link } : null,
    tags: tagsForKind(n.kind, n.severity),
  };
}

export default function Notifications() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const setUnreadFn = useServerFn(setNotificationUnread);
  const deleteFn = useServerFn(deleteNotification);
  const markReadFn = useServerFn(markNotifications);

  const [active, setActive] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [query, setQuery] = useState('');

  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const items = useMemo(() => (data ?? []).map(toItem), [data]);

  const fail = (e) => {
    console.error('[notifications]', e);
    toast({ title: 'Something went wrong', description: friendlyMessage(e), variant: 'destructive' });
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const toggleReadMutation = useMutation({
    mutationFn: (n) => (n.read ? setUnreadFn({ data: { id: n.id } }) : markReadFn({ data: { id: n.id } })),
    onSuccess: refresh,
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => { toast({ title: 'Notification deleted' }); refresh(); },
    onError: fail,
  });
  const markAllMutation = useMutation({
    mutationFn: () => markReadFn({ data: { all: true } }),
    onSuccess: refresh,
    onError: fail,
  });

  const toggleFilter = (id) => setActiveFilters((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const toggleRead = (id) => { const n = items.find((x) => x.id === id); if (n) toggleReadMutation.mutate(n); };
  const deleteItem = (id) => deleteMutation.mutate(id);
  const markAllRead = () => markAllMutation.mutate();

  const counts = useMemo(() => {
    const map = { all: items.filter((n) => !n.read).length };
    CATEGORIES.slice(1).forEach((c) => { map[c.id] = items.filter((n) => n.category === c.id && !n.read).length; });
    return map;
  }, [items]);

  const overview = useMemo(() => ([
    { label: 'Unread', value: items.filter((n) => !n.read).length, detail: 'across all categories', grad: 'from-violet-500 to-indigo-500', icon: 'Bell' },
    { label: 'Important', value: items.filter((n) => n.tags.includes('important')).length, detail: 'needs attention', grad: 'from-rose-500 to-red-500', icon: 'Star' },
    { label: 'Approvals', value: items.filter((n) => n.category === 'security').length, detail: 'awaiting you', grad: 'from-emerald-500 to-teal-500', icon: 'AtSign' },
    { label: 'Failures', value: items.filter((n) => n.tags.includes('failures')).length, detail: 'workflows + agents', grad: 'from-amber-500 to-orange-500', icon: 'XCircle' },
  ]), [items]);

  const filtered = useMemo(() => {
    let list = active === 'all' ? items : items.filter((n) => n.category === active);
    if (activeFilters.length) {
      list = list.filter((n) => activeFilters.some((f) => {
        if (f === 'unread') return !n.read;
        return n.tags.includes(f);
      }));
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, active, activeFilters, query]);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Notifications Centre" description="All platform activity, alerts and mentions in one place." action={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => toast({ title: 'Notification settings', description: 'Use the settings panel on the right to adjust your preferences.' })} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <BellRing className="h-4 w-4" /> Settings
          </button>
          <button onClick={markAllRead} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
      } />

      {session === 'no' && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.06] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" />Sign in to see your notifications</p>
        </div>
      )}

      {session === 'yes' && error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Notifications could not load</p>
            <p className="mt-1 text-[11px] text-rose-200/80">{friendlyMessage(error)}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10">Try again</button>
        </div>
      )}

      {session === 'yes' && <NtfyPushPanel />}

      {session === 'yes' && isLoading ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)}
        </div>
      ) : (
        <div className="mb-5"><NotificationsOverviewCards overview={overview} /></div>
      )}

      <div className="mb-5"><NotificationsCategoryNav active={active} setActive={setActive} counts={counts} /></div>

      <div className="mb-4"><NotificationsFilters activeFilters={activeFilters} toggleFilter={toggleFilter} query={query} setQuery={setQuery} onClearAll={markAllRead} /></div>

      <div className="grid gap-5 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {session === 'yes' && isLoading ? (
            <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)}</div>
          ) : (
            <NotificationsList items={filtered} onToggleRead={toggleRead} onDelete={deleteItem} />
          )}
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1"><NotificationPreferencesPanel compact /></div>
        </div>
      </div>
    </>
  );
}
