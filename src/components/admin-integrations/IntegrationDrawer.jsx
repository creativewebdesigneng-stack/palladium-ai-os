import { useState } from 'react';
import { X, Power, PowerOff, Settings2, DownloadCloud, Save } from 'lucide-react';
import { CATEGORY_META, STATUS_META } from './adminIntegrationsData';

export default function IntegrationDrawer({ integration, action, onClose, onConfirm }) {
  const [cfg, setCfg] = useState({
    api_key: '',
    webhook_url: '',
    rate_limit: 100,
    auto_retries: true,
  });

  if (!integration) return null;
  const cat = CATEGORY_META[integration.category] || '';
  const st = STATUS_META[integration.status] || '';

  const TITLES = {
    enable: { title: 'Enable Integration', icon: 'text-emerald-300', Icon: Power },
    disable: { title: 'Disable Integration', icon: 'text-rose-300', Icon: PowerOff },
    configure: { title: 'Configure Integration', icon: 'text-violet-300', Icon: Settings2 },
    update: { title: 'Update Integration', icon: 'text-amber-300', Icon: DownloadCloud },
  };
  const meta = TITLES[action] || TITLES.configure;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-[#0c0d13]/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <meta.Icon className={`h-4 w-4 ${meta.icon}`} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400">{meta.title}</p>
            <p className="text-sm font-semibold text-white">{integration.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-2xl">{integration.logo}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${cat.tone}`}>{integration.category}</span>
              <span className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${st.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{integration.status}</span>
            </div>
            <p className="mt-1 text-[12px] text-zinc-400">{integration.desc}</p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">v{integration.version}</p>
          </div>
        </div>

        {action === 'configure' ? (
          <div className="mt-4 space-y-3">
            <Field label="API Key"><input type="password" value={cfg.api_key} onChange={e => setCfg({ ...cfg, api_key: e.target.value })} placeholder="sk-…" className="input" /></Field>
            <Field label="Webhook URL"><input value={cfg.webhook_url} onChange={e => setCfg({ ...cfg, webhook_url: e.target.value })} placeholder="https://…" className="input" /></Field>
            <Field label="Rate limit (req/min)"><input type="number" value={cfg.rate_limit} onChange={e => setCfg({ ...cfg, rate_limit: e.target.value })} className="input" /></Field>
            <Field label="Auto-retries">
              <button onClick={() => setCfg({ ...cfg, auto_retries: !cfg.auto_retries })} className={`relative h-6 w-11 rounded-full ${cfg.auto_retries ? 'bg-violet-500' : 'bg-white/10'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${cfg.auto_retries ? 'left-[22px]' : 'left-0.5'}`} /></button>
            </Field>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <Stat label="Users" value={integration.users.toLocaleString()} />
            <Stat label="Requests" value={integration.requests.toLocaleString()} />
            <Stat label="Errors" value={String(integration.errors)} />
            <Stat label="Version" value={`v${integration.version}`} />
          </div>
        )}

        <div className={`mt-4 rounded-xl border px-3 py-2 text-[11px] ${action === 'disable' ? 'border-rose-400/20 bg-rose-400/[.08] text-rose-200' : 'border-white/10 bg-white/[.03] text-zinc-400'}`}>
          {action === 'enable' && 'Enabling makes this integration available to all organisations.'}
          {action === 'disable' && 'Disabling disconnects all organisations. Existing data is retained but live calls will fail.'}
          {action === 'configure' && 'Configuration is applied platform-wide. Test the integration before saving.'}
          {action === 'update' && 'Updating installs the latest stable version. A brief outage may occur.'}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-4">
          <button onClick={() => onConfirm(integration, action, cfg)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-white ${action === 'disable' ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-violet-500/80 hover:bg-violet-500'}`}>
            {action === 'configure' ? <><Save className="h-3.5 w-3.5" />Save configuration</> : <><meta.Icon className="h-3.5 w-3.5" />Confirm {action}</>}
          </button>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-[12px] text-zinc-300 hover:bg-white/5">Cancel</button>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>;
}
function Stat({ label, value }) {
  return <div className="flex items-center justify-between border-b border-white/5 py-1.5"><span className="text-[11px] text-zinc-500">{label}</span><span className="text-[13px] font-medium text-zinc-200">{value}</span></div>;
}