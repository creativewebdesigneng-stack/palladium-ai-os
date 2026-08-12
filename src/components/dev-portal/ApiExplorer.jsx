import { useState } from 'react';
import { Play, ChevronDown, Loader2, ShieldAlert } from 'lucide-react';
import { ENDPOINTS, METHOD_STYLE } from './devPortalData';

const BODY_TEMPLATES = {
  '/api/public/v1/agents': '{\n  "name": "Support Triage",\n  "purpose": "Triage inbound tickets",\n  "requires_approval": true\n}',
  '/api/public/v1/tasks': '{\n  "request": "Summarise yesterday\'s support tickets"\n}',
  '/api/public/v1/agents/{id}/run': '{\n  "input": "Summarise yesterday\'s support tickets"\n}',
  '/api/public/v1/workflows/{id}/run': '{\n  "input": "Prepare the weekly revenue brief"\n}',
};

export default function ApiExplorer() {
  const [endpoint, setEndpoint] = useState(ENDPOINTS[0]);
  const [path, setPath] = useState(ENDPOINTS[0].path);
  const [apiKey, setApiKey] = useState('');
  const [body, setBody] = useState('');
  const [res, setRes] = useState(null);
  const [sending, setSending] = useState(false);

  const pick = (e) => {
    setEndpoint(e);
    setPath(e.path);
    setBody(e.method === 'POST' ? (BODY_TEMPLATES[e.path] ?? '{}') : '');
    setRes(null);
  };

  const send = async () => {
    if (!apiKey.trim()) { setRes({ status: 0, body: 'Paste an API key first. Requests are sent with your key from this browser.' }); return; }
    if (path.includes('{id}')) { setRes({ status: 0, body: 'Replace {id} in the path with a real id before sending.' }); return; }
    setSending(true);
    const started = Date.now();
    try {
      const init = {
        method: endpoint.method,
        headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      };
      if (endpoint.method === 'POST') init.body = body || '{}';
      const r = await fetch(path, init);
      const text = await r.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* raw text */ }
      setRes({ status: r.status, ms: Date.now() - started, body: pretty });
    } catch (e) {
      setRes({ status: 0, ms: Date.now() - started, body: e.message || 'Request failed' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">API Explorer</h2>
      <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-[11px] text-amber-200">
        <ShieldAlert className="mt-px h-4 w-4 shrink-0" />
        <p>Requests below are real and count against your rate limits and usage. Your key is used in this browser only and never stored — in production, call the API from your own server.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Endpoints</p>
          <div className="space-y-0.5">
            {ENDPOINTS.map((e, i) => (
              <button key={i} onClick={() => pick(e)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${endpoint.method === e.method && endpoint.path === e.path ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <span className={`w-12 shrink-0 rounded border px-1 py-px text-center font-mono text-[9px] font-bold ${METHOD_STYLE[e.method]}`}>{e.method}</span>
                <span className="truncate font-mono text-[10px] text-zinc-300">{e.path.replace('/api/public/v1', '')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-2 font-mono text-[11px] font-bold ${METHOD_STYLE[endpoint.method]}`}>{endpoint.method}</span>
            <input value={path} onChange={(e) => setPath(e.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-200 outline-none" />
            <button onClick={send} disabled={sending} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Send
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-[11px] font-semibold text-white">Authorization</p>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="pk_live_… (paste a key from the API Keys panel)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-200 outline-none" />
            <p className="mt-2 text-[10px] text-zinc-500">Required scope: <span className="font-mono text-zinc-400">{endpoint.scope}</span>{endpoint.execution ? ' · execution API (Builder and above)' : ''}</p>
          </div>

          {endpoint.method === 'POST' && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center gap-2"><p className="text-[11px] font-semibold text-white">Body</p><ChevronDown className="h-3 w-3 text-zinc-500" /></div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full resize-y rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-[11px] text-zinc-200 outline-none" />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold text-white">Response</p>
              {res && (
                <>
                  <span className={`rounded-full px-2 py-px font-mono text-[10px] ${res.status >= 200 && res.status < 300 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-300'}`}>{res.status || 'error'}</span>
                  {res.ms != null && <span className="font-mono text-[10px] text-zinc-500">{res.ms}ms</span>}
                </>
              )}
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300">{res ? res.body : 'Send a request to see the live response.'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
