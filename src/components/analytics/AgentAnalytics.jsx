import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { AGENT_ANALYTICS } from './analyticsData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

export default function AgentAnalytics() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">Agent Analytics</h3>
      <p className="text-[11px] text-zinc-500">Requests & success rate per agent</p>
      <div className="mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={AGENT_ANALYTICS} margin={{ left: -8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
            <XAxis dataKey="agent" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={40} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
            <Bar dataKey="requests" radius={[4, 4, 0, 0]} barSize={28}>
              {AGENT_ANALYTICS.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1">
        {AGENT_ANALYTICS.map((a, i) => (
          <div key={a.agent} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-zinc-300">{a.agent}</span>
            <span className="ml-auto text-zinc-500">{a.tasks} tasks · {a.success}% success · ${a.cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}