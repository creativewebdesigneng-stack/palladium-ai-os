import { useState } from 'react';
import { Code2, Terminal, Webhook, Plus, Copy, Trash2, Check } from 'lucide-react';
import { Panel, ToggleRow } from './shared';

const WEBHOOKS = [
  { id: 'wh_1', url: 'https://hooks.example.com/palladiumai/events', events: 'workflow.completed, agent.failed' },
  { id: 'wh_2', url: 'https://api.internal.dev/billing', events: 'billing.invoice.paid' },
];

export default function DeveloperSection({ data, update }) {
  const [hooks, setHooks] = useState(WEBHOOKS);
  const [copied, setCopied] = useState(null);
  const [newUrl, setNewUrl] = useState('');

  const addHook = () => {
    if (!newUrl.trim()) return;
    setHooks((h) => [...h, { id: 'wh_' + Date.now(), url: newUrl, events: 'workflow.completed' }]);
    setNewUrl('');
  };
  const removeHook = (id) => setHooks((h) => h.filter((x) => x.id !== id));

  return (
    <Panel icon={Code2} title="Developer Settings" grad="from-zinc-500 to-zinc-700" desc="Advanced controls for builders and integrators.">
      <div className="space-y-4">
        <ToggleRow label="Developer Mode" desc="Unlock advanced tooling and raw API access." checked={data.devMode} onChange={(v) => update('devMode', v)} />
        <ToggleRow label="Debug Logs" desc="Emit verbose logs to the console." checked={data.debugLogs} onChange={(v) => update('debugLogs', v)} />
        <ToggleRow label="API Access" desc="Enable programmatic access to your workspace." checked={data.apiAccess} onChange={(v) => update('apiAccess', v)} />

        <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-xs font-medium text-white">Workspace API endpoint</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-400">https://api.palladiumai.com/v1/workspaces/ws_8f3a</code>
            <button onClick={() => { setCopied('endpoint'); setTimeout(() => setCopied(null), 1500); }} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-white/5">
              {copied === 'endpoint' ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Webhook className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-xs font-medium text-white">Webhook Settings</p>
          </div>
          <div className="space-y-2">
            {hooks.map((h) => (
              <div key={h.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <code className="truncate font-mono text-[11px] text-zinc-300">{h.url}</code>
                  <button onClick={() => removeHook(h.id)} className="ml-2 rounded-lg border border-red-400/20 p-1.5 text-red-300 hover:bg-red-500/10"><Trash2 className="h-3 w-3" /></button>
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">events: {h.events}</p>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://your.endpoint/webhook"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
              <button onClick={addHook} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export const initialDeveloper = { devMode: false, debugLogs: false, apiAccess: true };