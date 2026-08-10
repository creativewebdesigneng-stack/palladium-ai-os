import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line, Cell } from 'recharts';

const tooltipStyle = { background: '#10121a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11, color: '#e4e4e7' };

export function UserGrowthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
        <XAxis dataKey="m" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="users" stroke="#a78bfa" strokeWidth={2} fill="url(#ug)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
        <XAxis dataKey="m" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `$${v.toLocaleString()}`} />
        <Area type="monotone" dataKey="mrr" stroke="#38bdf8" strokeWidth={2} fill="url(#rv)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AIUsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
        <XAxis dataKey="d" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `${v.toLocaleString()} req`} />
        <Bar dataKey="requests" radius={[4,4,0,0]} fill="#c084fc" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgentUsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `${v.toLocaleString()} runs`} />
        <Bar dataKey="runs" radius={[0,4,4,0]} fill="#818cf8" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ErrorsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
        <XAxis dataKey="d" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="errors" stroke="#fb7185" strokeWidth={2} dot={{ r: 3, fill: '#fb7185' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}