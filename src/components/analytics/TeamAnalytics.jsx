import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function TeamAnalytics({ data = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">Team Analytics</h3>
      <p className="text-[11px] text-zinc-500">Tasks & cost by team</p>
      {data.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">No team data yet. Team analytics need an organisation.</div>
      ) : (
        <>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 32, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="team" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                <Bar dataKey="requests" radius={[0, 4, 4, 0]} barSize={16}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {data.map((t, i) => (
              <div key={t.team} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-zinc-300">{t.team}</span>
                <span className="ml-auto text-zinc-500">{t.members} members · £{t.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
