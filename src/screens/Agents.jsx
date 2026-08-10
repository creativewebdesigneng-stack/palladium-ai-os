import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Plus, Sparkles, ArrowRight, Bot, Activity, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AgentCard from '@/components/agents/AgentCard';
import { CATEGORIES, STATUS_STYLE, AVATAR_COLORS } from '@/components/agents/agentsData';
import AnimatedBrain from '@/components/visual/AnimatedBrain';
import { useUpgrade } from '@/lib/upgradeContext';
import { base44 } from '@/api/base44Client';

const STATUS_MAP = { active: 'Running', paused: 'Paused', draft: 'Idle', archived: 'Stopped' };
const TOOL_NAMES = {
  web_search: 'Web Search', files: 'File Analysis', email: 'Email', calendar: 'Calendar',
  terminal: 'Terminal', vision: 'Vision', image: 'Image Generation', browser: 'Browser',
  api: 'API Calls', workflow: 'Workflow Builder',
};

function hashGrad(str) {
  const i = (str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function relTime(iso) {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return 'now';
  if (s < 60) return s <= 5 ? 'now' : `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function mapAgent(r) {
  const cfg = r.config || {};
  const tools = Array.isArray(r.tools) ? r.tools : [];
  return {
    id: r.id,
    name: r.name || 'Untitled Agent',
    letter: (r.name || 'A').trim().charAt(0).toUpperCase(),
    grad: cfg.grad || hashGrad(r.id || r.name || ''),
    desc: r.description || 'No description set.',
    status: STATUS_MAP[r.status] || 'Idle',
    model: r.model || 'GPT-5',
    modelGrad: 'from-emerald-400 to-teal-500',
    caps: tools.map((t) => TOOL_NAMES[t] || t),
    memory: cfg.memory !== false,
    lastRun: relTime(r.updated_date || r.created_date),
    category: cfg.category || r.role || 'Operations',
    featured: !!cfg.featured,
    recent: !!cfg.recent,
    score: typeof cfg.score === 'number' ? cfg.score : 0,
    dept: r.role || 'Operations',
    task: cfg.task || '',
    _raw: r,
  };
}

function SectionHead({ title, icon: Icon, count, link }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-violet-400" />
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{count}</span>
      {link && <Link to={link} className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-white">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
    </div>
  );
}

export default function Agents() {
  const navigate = useNavigate();
  const { gate } = useUpgrade();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const recs = await base44.entities.Agent.list('-created_date', 50);
        setAgents((recs || []).map(mapAgent));
      } catch (e) {
        // keep empty list on error
      }
      setLoading(false);
    })();
  }, []);

  const featured = agents.filter((a) => a.featured);
  const running = agents.filter((a) => a.status === 'Running');
  const stopped = agents.filter((a) => a.status === 'Stopped');
  const recent = agents.filter((a) => a.recent);
  const mine = agents.filter((a) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q.toLowerCase()));
  const avgScore = agents.length ? Math.round(agents.reduce((s, a) => s + (a.score || 0), 0) / agents.length) : 0;

  const remove = async (a) => {
    try { await base44.entities.Agent.delete(a.id); } catch (e) {}
    setAgents((list) => list.filter((x) => x.id !== a.id));
  };
  const run = async (a) => {
    try { await base44.entities.Agent.update(a.id, { status: 'active' }); } catch (e) {}
    setAgents((list) => list.map((x) => (x.id === a.id ? { ...x, status: 'Running', lastRun: 'now' } : x)));
  };
  const duplicate = async (a) => {
    try {
      const me = await base44.auth.me();
      const org = (me && (me.data?.organisation_id || me.organisation_id)) || '';
      const copy = await base44.entities.Agent.create({
        organisation_id: org,
        name: `${a.name} Copy`,
        description: a.desc,
        role: a.dept,
        model: a.model,
        status: 'draft',
        tools: a._raw?.tools || [],
        config: a._raw?.config || {},
      });
      setAgents((list) => [mapAgent(copy), ...list]);
    } catch (e) {}
  };
  const edit = (a) => navigate('/agents/new');

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-40"><AnimatedBrain agentStates={agents.map((a) => a.status)} /></div>
      <PageHeader eyebrow="AI" title="Agent Workspace" description="Create, manage, and monitor your autonomous AI workforce." action={<button onClick={() => { if (gate('createAgents')) navigate('/agents/new'); }} className="pbtn pbtn-primary flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-4 w-4" />New agent</button>} />

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#0c0d13] to-cyan-500/10 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.25),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_30px_rgba(139,92,246,.4)]"><Sparkles className="h-7 w-7 text-white" /></div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Your AI workforce, on demand</h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">Spin up specialized agents that research, write, code, and operate — then let them work autonomously across your tools.</p>
          </div>
          <div className="flex gap-3">
            {[[agents.length, 'Total'], [running.length, 'Running'], [`${avgScore}%`, 'Avg score']].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center"><p className="text-lg font-semibold text-white">{v}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">{l}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mb-8">
          <SectionHead title="Featured agents" icon={Sparkles} count={featured.length} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{featured.map((a) => <AgentCard key={a.id} agent={a} onEdit={edit} onDuplicate={duplicate} onDelete={remove} onRun={run} />)}</div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2"><Search className="h-4 w-4 text-zinc-600" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents" className="w-44 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" /></div>
        <div className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${cat === c ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{c}</button>)}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.04] p-1">
          <button onClick={() => setView('grid')} className={`rounded-lg p-1.5 ${view === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView('list')} className={`rounded-lg p-1.5 ${view === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* My agents */}
      <div className="mb-8">
        <SectionHead title="My agents" icon={Bot} count={mine.length} />
        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-8 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading your agents…</div>
        ) : mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-300"><Sparkles className="h-7 w-7" /></div>
            <h3 className="text-base font-semibold text-white">No agents yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">Create your first AI agent to start building your workforce. It’ll appear here once deployed.</p>
            <button onClick={() => { if (gate('createAgents')) navigate('/agents/new'); }} className="pbtn pbtn-primary mx-auto mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-4 w-4" />Create your first agent</button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{mine.map((a) => <AgentCard key={a.id} agent={a} onEdit={edit} onDuplicate={duplicate} onDelete={remove} onRun={run} />)}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs text-zinc-500">
                <tr>{['Agent', 'Status', 'Model', 'Capabilities', 'Memory', 'Last run', 'Score', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {mine.map((a) => {
                  const st = STATUS_STYLE[a.status] || STATUS_STYLE.Idle;
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-xs font-semibold`}>{a.letter}</span>{a.name}</div></td>
                      <td className={`px-4 py-3 ${st.text}`}>● {a.status}</td>
                      <td className="px-4 py-3 text-zinc-400">{a.model}</td>
                      <td className="px-4 py-3 text-zinc-500">{a.caps.length} tools</td>
                      <td className="px-4 py-3 text-zinc-400">{a.memory ? 'On' : 'Off'}</td>
                      <td className="px-4 py-3 text-zinc-500">{a.lastRun}</td>
                      <td className="px-4 py-3 text-zinc-300">{a.score}%</td>
                      <td className="px-4 py-3 text-right"><Link to={`/agents/${a.id}`} className="inline-flex text-violet-400"><ArrowRight className="h-4 w-4" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Running */}
      {running.length > 0 && (
        <div className="mb-8">
          <SectionHead title="Running agents" icon={Activity} count={running.length} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{running.map((a) => <AgentCard key={a.id} agent={a} onEdit={edit} onDuplicate={duplicate} onDelete={remove} onRun={run} />)}</div>
        </div>
      )}

      {/* Stopped */}
      {stopped.length > 0 && (
        <div className="mb-8">
          <SectionHead title="Stopped agents" icon={Zap} count={stopped.length} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stopped.map((a) => <AgentCard key={a.id} agent={a} onEdit={edit} onDuplicate={duplicate} onDelete={remove} onRun={run} />)}</div>
        </div>
      )}

      {/* Recently used */}
      {recent.length > 0 && (
        <div>
          <SectionHead title="Recently used" icon={CheckCircle2} count={recent.length} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{recent.map((a) => <AgentCard key={a.id} agent={a} onEdit={edit} onDuplicate={duplicate} onDelete={remove} onRun={run} />)}</div>
        </div>
      )}
    </>
  );
}