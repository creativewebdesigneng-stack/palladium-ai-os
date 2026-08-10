import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, Key, Loader2, CheckCircle2, Code2, Webhook, Save, Zap } from 'lucide-react';
import { AUTH_TYPES } from './integrationsData';
import { SectionHead } from './shared';

export default function CustomAPISection() {
  const [form, setForm] = useState({ name: '', desc: '', baseUrl: '', authType: 'API Key', headers: '', docsUrl: '' });
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const test = () => { setTesting(true); setTested(false); setTimeout(() => { setTesting(false); setTested(true); }, 1400); };

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4">
      <SectionHead icon={Plug} title="Create Custom Integration" grad="from-violet-500 to-fuchsia-500" />

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        {/* Form */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">Integration Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Custom API" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">Base URL</label>
              <input value={form.baseUrl} onChange={e => set('baseUrl', e.target.value)} placeholder="https://api.example.com/v1" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500">Description</label>
            <input value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="What does this integration do?" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">Authentication Type</label>
              <select value={form.authType} onChange={e => set('authType', e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-400/40 focus:outline-none">
                {AUTH_TYPES.map(a => <option key={a} value={a} className="bg-zinc-900">{a}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">Documentation URL</label>
              <input value={form.docsUrl} onChange={e => set('docsUrl', e.target.value)} placeholder="https://docs.example.com" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
          </div>
          {/* Credential field */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500">Credential / Secret</label>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <input type="password" placeholder="••••••••••••••••••••" className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
              <span className="text-[10px] text-zinc-600">Encrypted</span>
            </div>
          </div>
          {/* Headers */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500">Custom Headers (JSON)</label>
            <textarea value={form.headers} onChange={e => set('headers', e.target.value)} rows={3} placeholder={'{"X-API-Version": "2025-01"}'} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={test} disabled={testing} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tested ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Zap className="h-3.5 w-3.5" />}
              {testing ? 'Testing...' : tested ? 'Connection OK' : 'Test Connection'}
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-medium text-white"><Save className="h-3.5 w-3.5" />Save Integration</button>
          </div>
        </div>

        {/* Supported protocols sidebar */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white">Supported Protocols</h4>
          {[
            { name: 'OAuth 2.0', icon: Key, grad: 'from-violet-500 to-indigo-500', desc: 'Authorization code flow' },
            { name: 'API Keys', icon: Key, grad: 'from-amber-500 to-orange-500', desc: 'Header or query param' },
            { name: 'Webhooks', icon: Webhook, grad: 'from-emerald-500 to-teal-500', desc: 'Inbound event triggers' },
            { name: 'REST APIs', icon: Code2, grad: 'from-sky-500 to-blue-500', desc: 'GET / POST / PUT / DELETE' },
            { name: 'GraphQL', icon: Code2, grad: 'from-fuchsia-500 to-pink-500', desc: 'Typed schema queries' },
            { name: 'MCP', icon: Plug, grad: 'from-violet-600 to-fuchsia-600', desc: 'Model Context Protocol' },
            { name: 'WebSockets', icon: Zap, grad: 'from-cyan-500 to-sky-500', desc: 'Real-time bidirectional' },
            { name: 'Service Accounts', icon: Key, grad: 'from-zinc-500 to-slate-600', desc: 'Server-to-server auth' },
          ].map(p => (
            <motion.div key={p.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${p.grad}`}><p.icon className="h-3.5 w-3.5 text-white" /></span>
              <div><p className="text-xs font-medium text-white">{p.name}</p><p className="text-[10px] text-zinc-500">{p.desc}</p></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}