import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AI_COSTS_SERIES } from './biData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };

export default function AICostsChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">AI Costs</h3>
      <p className="text-[11px] text-zinc-500">Inference vs API spend</p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={AI_COSTS_SERIES} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => `$${v.toLocaleString()}`} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="inference" stackId="c" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="api" stackId="c" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}