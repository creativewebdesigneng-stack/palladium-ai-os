import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CUSTOMER_GROWTH_SERIES } from './biData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };

export default function CustomerGrowthChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Customer Growth</h3>
          <p className="text-[11px] text-zinc-500">Net new customers per month</p>
        </div>
        <span className="text-emerald-400 text-[11px] font-medium">+8.6%</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CUSTOMER_GROWTH_SERIES} margin={{ left: -16, right: 8, top: 4 }}>
            <defs>
              <linearGradient id="cust" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tipStyle} />
            <Area dataKey="customers" stroke="#06b6d4" strokeWidth={2} fill="url(#cust)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}