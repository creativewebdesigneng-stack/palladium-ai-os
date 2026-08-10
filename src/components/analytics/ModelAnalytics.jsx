import { Cpu } from 'lucide-react';
import { MODEL_ANALYTICS } from './analyticsData';

export default function ModelAnalytics() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">AI Model Analytics</h3></div>
      <p className="text-[11px] text-zinc-500">Usage, cost & latency per model</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-2 py-1.5 font-medium">MODEL</th>
              <th className="px-2 py-1.5 font-medium">REQUESTS</th>
              <th className="px-2 py-1.5 font-medium">TOKENS</th>
              <th className="px-2 py-1.5 font-medium">COST</th>
              <th className="px-2 py-1.5 font-medium">LATENCY</th>
            </tr>
          </thead>
          <tbody>
            {MODEL_ANALYTICS.map((m) => (
              <tr key={m.model} className="border-t border-white/5">
                <td className="px-2 py-2 font-medium text-zinc-200">{m.model}</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{m.requests.toLocaleString()}</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{m.tokens}</td>
                <td className="px-2 py-2 font-mono text-zinc-300">{m.cost}</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{m.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}