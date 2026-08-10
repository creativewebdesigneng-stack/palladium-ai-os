import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { PROJECT_COMPLETION } from './biData';

const tipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11, color: '#e4e4e7' };

export default function ProjectCompletionChart() {
  const total = PROJECT_COMPLETION.reduce((a, c) => a + c.value, 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h3 className="text-sm font-semibold text-white">Project Completion</h3>
      <p className="text-[11px] text-zinc-500">{total} projects · 67% completed</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={PROJECT_COMPLETION} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
              {PROJECT_COMPLETION.map((c, i) => <Cell key={i} fill={c.color} stroke="#0c0d13" strokeWidth={2} />)}
            </Pie>
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}