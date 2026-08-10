import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Panel from '@/components/palladium/Panel';
import { motion } from 'framer-motion';
import { PERF_ANALYTICS, PERF_SERIES } from './workforceData';

const tt = { background: '#0c0d13', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12, color: '#e4e4e7' };

export default function PerformanceAnalytics() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PERF_ANALYTICS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-lg`}><Icon className="h-4 w-4" /></span>
              <p className="mt-3 text-xl font-semibold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="mt-1 text-[11px] text-zinc-600">{s.sub}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Productivity & success rate" subtitle="Last 7 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERF_SERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pa1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pa2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.5} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="d" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tt} />
                <Area type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={2} fill="url(#pa1)" name="Productivity" />
                <Area type="monotone" dataKey="success" stroke="#34d399" strokeWidth={2} fill="url(#pa2)" name="Success %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="AI usage" subtitle="Tokens consumed per day">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PERF_SERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="d" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tt} cursor={{ fill: 'rgba(139,92,246,.08)' }} />
                <Bar dataKey="success" fill="#22d3ee" radius={[6, 6, 0, 0]} name="AI usage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}