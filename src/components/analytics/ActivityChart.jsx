import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };

const RANGES = [{ id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }];

export default function ActivityChart({ range, setRange, data = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Activity</h3>
          <p className="text-[11px] text-zinc-500">Agents & requests by {range} interval</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={`rounded-lg px-3 py-1 text-[11px] font-medium ${range === r.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-zinc-500">No activity in this window.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -8, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="k" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="requests" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={14} />
              <Line dataKey="users" name="active agents" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
