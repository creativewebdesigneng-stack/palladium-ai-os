import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { REVENUE_SERIES, EXPENSE_BREAKDOWN } from './financeData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };
const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981'];

export default function FinanceCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold text-white">Revenue & Profit</h3>
        <p className="text-[11px] text-zinc-500">Last 6 months · illustrative</p>
        <div className="mt-2 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_SERIES} margin={{ left: -8, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="k" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#rev)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" stroke="#06b6d4" fill="url(#prof)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="text-sm font-semibold text-white">Expense Breakdown</h3>
        <p className="text-[11px] text-zinc-500">YTD · illustrative</p>
        <div className="mt-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={EXPENSE_BREAKDOWN} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {EXPENSE_BREAKDOWN.map((_, i) => <Cell key={i} stroke="none" fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} formatter={(v) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 space-y-1">
          {EXPENSE_BREAKDOWN.map((e, i) => (
            <div key={e.name} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-zinc-300">{e.name}</span>
              <span className="ml-auto text-zinc-500">${(e.value / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}