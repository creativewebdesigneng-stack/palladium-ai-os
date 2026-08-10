import { useState, useMemo } from 'react';
import { Info, Server, Plus } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ServerCard from '@/components/mcp-hub/ServerCard';
import ServerDetailDrawer from '@/components/mcp-hub/ServerDetailDrawer';
import CustomServerForm from '@/components/mcp-hub/CustomServerForm';
import { TABS, CATEGORIES, SERVERS, SECURITY } from '@/components/mcp-hub/mcpData';

export default function McpHub() {
  const [tab, setTab] = useState('featured');
  const [cat, setCat] = useState('all');
  const [servers, setServers] = useState(SERVERS);
  const [detail, setDetail] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = useMemo(() => {
    let list = servers;
    if (tab === 'featured') list = list.filter(s => s.featured);
    else if (tab === 'installed') list = list.filter(s => s.installed);
    else if (tab === 'available') list = list.filter(s => !s.installed);
    else if (tab === 'custom') list = list.filter(s => s.custom);
    if (cat !== 'all') list = list.filter(s => s.category === cat);
    return list;
  }, [tab, cat, servers]);

  const install = (id) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, installed: true } : s));
    const s = servers.find(x => x.id === id);
    flash(`Installed ${s?.name}`);
  };

  const saveCustom = (data) => {
    const id = 'c' + Date.now();
    setServers(prev => [...prev, { ...data, id, category: 'Developer', creator: 'You', version: '1.0.0', security: 'review', installed: true, featured: false, custom: true, grad: 'from-violet-500 to-indigo-500', resources: ['Custom'], permissions: ['custom'], agents: [], activity: [] }]);
    setShowCustom(false);
    setTab('custom');
    flash('Custom server saved');
  };

  const counts = { featured: servers.filter(s=>s.featured).length, installed: servers.filter(s=>s.installed).length, available: servers.filter(s=>!s.installed).length, custom: servers.filter(s=>s.custom).length };

  return (
    <>
      <PageHeader eyebrow="MCP" title="MCP Hub" description="Marketplace and management for Model Context Protocol servers — connect any MCP-compatible server to your agents." action={
        <button onClick={() => setShowCustom(true)} className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"><Plus className="h-4 w-4" />Custom server</button>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Servers are illustrative mock data. The interface is backend-ready for a future MCP integration.</p></div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ${tab === t.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{t.label}<span className="rounded bg-black/30 px-1 text-[10px] text-zinc-500">{counts[t.id]}</span></button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All categories</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{TABS.find(t => t.id === tab).label}</h3>
        <p className="text-[11px] text-zinc-500">{filtered.length} servers</p>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No servers in this view. <button onClick={() => setShowCustom(true)} className="text-violet-400 hover:underline">Add a custom server</button></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(s => <ServerCard key={s.id} server={s} onInstall={() => install(s.id)} onOpen={() => setDetail(s)} />)}
        </div>
      )}

      <ServerDetailDrawer server={detail} onClose={() => setDetail(null)} onInstall={() => { install(detail.id); }} />
      {showCustom && <CustomServerForm onSave={saveCustom} onClose={() => setShowCustom(false)} />}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}