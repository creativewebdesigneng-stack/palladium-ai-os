import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Panel from '@/components/palladium/Panel';
import { WORKLOAD_SERIES, DEPT_UTILISATION, WORKLOAD_STATS } from './workforceData';

const tt = { background: '#0c0d13', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12, color: '#e4e4e7' };

export default function WorkloadCharts() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WORKLOAD_STATS.map(s => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-zinc-600">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Workload over time" subtitle="Current · Completed · Upcoming">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WORKLOAD_SERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="wl2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="d" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tt} />
                <Area type="monotone" dataKey="current" stroke="#8b5cf6" strokeWidth={2} fill="url(#wl1)" name="Current" />
                <Area type="monotone" dataKey="completed" stroke="#22d3ee" strokeWidth={2} fill="url(#wl2)" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Department utilisation" subtitle="% capacity in use">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPT_UTILISATION} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={tt} cursor={{ fill: 'rgba(139,92,246,.08)' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}