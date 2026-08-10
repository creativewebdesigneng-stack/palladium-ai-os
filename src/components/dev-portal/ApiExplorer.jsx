import { useState } from 'react';
import { Play, ChevronDown } from 'lucide-react';
import { ENDPOINTS, METHOD_STYLE, SAMPLE_RESPONSES } from './devPortalData';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

export default function ApiExplorer() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/v1/agents');
  const [sent, setSent] = useState(false);
  const [body, setBody] = useState('{\n  "name": "New Agent",\n  "model": "claude-sonnet"\n}');
  const res = SAMPLE_RESPONSES[method];

  const send = () => { setSent(true); };
  const pick = (e) => { setMethod(e.method); setPath(e.path); setSent(false); };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">API Explorer</h2>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Endpoints</p>
          <div className="space-y-0.5">
            {ENDPOINTS.map((e, i) => (
              <button key={i} onClick={() => pick(e)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${method === e.method && path === e.path ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <span className={`w-12 shrink-0 rounded border px-1 py-px text-center font-mono text-[9px] font-bold ${METHOD_STYLE[e.method]}`}>{e.method}</span>
                <span className="truncate font-mono text-[10px] text-zinc-300">{e.path}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Request bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="appearance-none rounded-lg border border-white/10 bg-black/40 py-2 pl-3 pr-8 font-mono text-[11px] font-bold text-zinc-200 outline-none">
                {METHODS.map((m) => <option key={m} value={m} className="bg-[#10121a]">{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            </div>
            <input value={path} onChange={(e) => setPath(e.target.value)} className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-200 outline-none" />
            <button onClick={send} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Play className="h-3.5 w-3.5" />Send</button>
          </div>

          {/* Headers */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-[11px] font-semibold text-white">Headers</p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex gap-2"><span className="w-40 shrink-0 text-zinc-500">Authorization</span><span className="text-zinc-300">Bearer pk_live_8f2a••••3a7f</span></div>
              <div className="flex gap-2"><span className="w-40 shrink-0 text-zinc-500">Content-Type</span><span className="text-zinc-300">application/json</span></div>
              <div className="flex gap-2"><span className="w-40 shrink-0 text-zinc-500">X-Request-Id</span><span className="text-zinc-300">req_9c2a8f</span></div>
            </div>
          </div>

          {/* Body */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-[11px] font-semibold text-white">Body {method === 'GET' && <span className="text-zinc-500">(none)</span>}</p>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} disabled={method === 'GET'} className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-zinc-200 outline-none disabled:opacity-40" />
          </div>

          {/* Response */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold text-white">Response</p>
              {sent && <span className={`rounded px-1.5 py-px text-[10px] font-mono ${res.status >= 400 ? 'text-rose-400 bg-rose-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{res.status}</span>}
            </div>
            <pre className="min-h-[80px] overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-zinc-300">{sent ? (res.body || 'No content') : 'Press Send to execute the request…'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}