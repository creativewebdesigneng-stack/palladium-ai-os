import { useState, useMemo } from 'react';
import { CheckCheck, BellRing } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import NotificationsOverviewCards from '@/components/notifications/NotificationsOverviewCards';
import NotificationsCategoryNav from '@/components/notifications/NotificationsCategoryNav';
import NotificationsFilters from '@/components/notifications/NotificationsFilters';
import NotificationsList from '@/components/notifications/NotificationsList';
import NotificationSettings, { initialSettings } from '@/components/notifications/NotificationSettings';
import { NOTIFICATIONS, CATEGORIES, FILTERS } from '@/components/notifications/notificationsData';
import { toast } from '@/components/ui/use-toast';

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS);
  const [active, setActive] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState(initialSettings);

  const toggleFilter = (id) => setActiveFilters((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const toggleRead = (id) => setItems((list) => list.map((n) => n.id === id ? { ...n, read: !n.read } : n));
  const deleteItem = (id) => setItems((list) => list.filter((n) => n.id !== id));
  const markAllRead = () => setItems((list) => list.map((n) => ({ ...n, read: true })));
  const updateSetting = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const counts = useMemo(() => {
    const map = { all: items.filter((n) => !n.read).length };
    CATEGORIES.slice(1).forEach((c) => { map[c.id] = items.filter((n) => n.category === c.id && !n.read).length; });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let list = active === 'all' ? items : items.filter((n) => n.category === active);
    if (activeFilters.length) {
      list = list.filter((n) => {
        if (activeFilters.includes('unread') && !n.read) return true;
        if (activeFilters.includes('important') && n.tags.includes('important')) return true;
        if (activeFilters.includes('mentions') && n.tags.includes('mentions')) return true;
        if (activeFilters.includes('failures') && n.tags.includes('failures')) return true;
        if (activeFilters.includes('success') && n.tags.includes('success')) return true;
        return false;
      });
      list = list.filter((n) => activeFilters.some((f) => {
        if (f === 'unread') return !n.read;
        if (f === 'important') return n.tags.includes('important');
        if (f === 'mentions') return n.tags.includes('mentions');
        if (f === 'failures') return n.tags.includes('failures');
        if (f === 'success') return n.tags.includes('success');
        return false;
      }));
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
    return list.sort((a, b) => a.timestamp - b.timestamp);
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

      <div className="mb-5"><NotificationsOverviewCards /></div>

      <div className="mb-5"><NotificationsCategoryNav active={active} setActive={setActive} counts={counts} /></div>

      <div className="mb-4"><NotificationsFilters activeFilters={activeFilters} toggleFilter={toggleFilter} query={query} setQuery={setQuery} onClearAll={markAllRead} /></div>

      <div className="grid gap-5 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0"><NotificationsList items={filtered} onToggleRead={toggleRead} onDelete={deleteItem} /></div>
        <div className="hidden xl:block">
          <div className="sticky top-6"><NotificationSettings settings={settings} update={updateSetting} /></div>
        </div>
      </div>
    </>
  );
}