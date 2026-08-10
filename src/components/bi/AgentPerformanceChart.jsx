import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { AGENT_PERFORMANCE } from './biData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

export default function AgentPerformanceChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">Agent Performance</h3>
      <p className="text-[11px] text-zinc-500">Tasks completed per agent</p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={AGENT_PERFORMANCE} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="agent" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={96} />
            <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
            <Bar dataKey="tasks" radius={[0, 4, 4, 0]}>
              {AGENT_PERFORMANCE.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}